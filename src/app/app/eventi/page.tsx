// ✅ INCOLLA QUESTO FILE COMPLETO
// src/app/app/eventi/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import MonthCalendar, { CalendarEvent } from "@/components/MonthCalendar";
import PlaceAutocomplete, { PlaceValue } from "@/components/PlaceAutocomplete";
import MapModal from "@/components/MapModal";

type Club = { id: string; name: string; slug: string };
type EventType = "training" | "match" | "meeting";

type EventRow = {
  id: string;
  title: string;
  type: EventType;
  start_at: string;

  // ✅ testo libero SEMPRE
  location: string | null;

  // ✅ dati google solo se selezioni suggerimento
  location_place_id: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;

  created_at: string;
};

function toIso(dtLocal: string) {
  return new Date(dtLocal).toISOString();
}

function fmtDateTimeIT(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function EventsPage() {
  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("training");
  const [startAt, setStartAt] = useState("");

  // ✅ luogo: testo + (opzionale) place selezionato
  const [locationText, setLocationText] = useState("");
  const [place, setPlace] = useState<PlaceValue | null>(null);

  // popup mappa
  const [mapOpen, setMapOpen] = useState(false);
  const [mapEv, setMapEv] = useState<EventRow | null>(null);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    for (const ev of events) {
      const iso = ev.start_at.includes("T") ? ev.start_at : new Date(ev.start_at).toISOString();
      const key = iso.slice(0, 10);
      (map[key] ??= []).push(ev as any);
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.start_at.localeCompare(b.start_at));
    }

    return map;
  }, [events]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDay[selectedDay] ?? [];
  }, [selectedDay, eventsByDay]);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && !!startAt;
  }, [title, startAt]);

  function prefillStartAtFromDayKey(dayKey: string) {
    if (!startAt) {
      setStartAt(`${dayKey}T18:00`);
      return;
    }
    const timePart = startAt.includes("T") ? startAt.split("T")[1] : "18:00";
    setStartAt(`${dayKey}T${timePart}`);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    let clubId: string | null = null;

    const { data: member, error: memberErr } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      setError("Errore club_members: " + memberErr.message);
      setLoading(false);
      return;
    }

    setIsStaff(["admin", "staff"].includes(member?.role ?? ""));

    if (member?.club_id) {
      clubId = member.club_id;
    } else {
      const { data: player, error: playerErr } = await supabase
        .from("players")
        .select("club_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (playerErr) {
        setError("Errore players: " + playerErr.message);
        setLoading(false);
        return;
      }

      if (player?.club_id) clubId = player.club_id;
    }

    if (!clubId) {
      setError("Impossibile determinare la squadra.");
      setLoading(false);
      return;
    }

    const { data: clubData, error: clubErr } = await supabase
      .from("clubs")
      .select("id, name, slug")
      .eq("id", clubId)
      .single();

    if (clubErr || !clubData) {
      setError("Impossibile caricare la squadra.");
      setLoading(false);
      return;
    }

    setClub(clubData);

    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select(
        "id, title, type, start_at, location, location_place_id, location_address, location_lat, location_lng, created_at"
      )
      .eq("club_id", clubId)
      .order("start_at", { ascending: true });

    if (evErr) {
      setError(evErr.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((evData ?? []) as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !canSubmit) return;

    setError(null);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id ?? null;

    const payload: any = {
      club_id: club.id,
      title: title.trim(),
      type,
      start_at: toIso(startAt),
      created_by: userId,
    };

    // ✅ 1) SE hai selezionato un luogo da Google: salva testo + coordinate + id
    if (place) {
      payload.location = place.address; // testo mostrato ovunque
      payload.location_address = place.address;
      payload.location_place_id = place.placeId;
      payload.location_lat = place.lat;
      payload.location_lng = place.lng;
    } else {
      // ✅ 2) SE NON hai selezionato: salva SOLO testo libero, NIENTE coordinate (quindi niente popup)
      payload.location = locationText.trim() ? locationText.trim() : null;
      payload.location_address = null;
      payload.location_place_id = null;
      payload.location_lat = null;
      payload.location_lng = null;
    }

    const { error: insErr } = await supabase.from("events").insert(payload);

    if (insErr) {
      setError(insErr.message);
      return;
    }

    setTitle("");
    setType("training");
    setStartAt("");
    setPlace(null);
    setLocationText("");

    await loadAll();
  }

  function openMapForEvent(ev: EventRow) {
    setMapEv(ev);
    setMapOpen(true);
  }

  if (loading) return <div className="card p-8">Caricamento…</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Calendario</h1>
        <p className="mt-2 text-muted-theme">
          Allenamenti, partite e riunioni di {club?.name ? <b>{club.name}</b> : null}.
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_320px]">
        <div className="card p-6 min-w-0">
          <h2 className="text-lg font-semibold text-base-theme">Calendario 🗓️</h2>

          <div className="mt-4 space-y-4">
            <MonthCalendar
              month={month}
              selectedDay={selectedDay}
              eventsByDay={eventsByDay}
              onMonthChange={(m) => {
                setMonth(m);
                setSelectedDay(null);
              }}
              onSelectDay={(k) => {
                setSelectedDay(k);
                prefillStartAtFromDayKey(k);
              }}
            />

            {selectedDay ? (
              <div className="rounded-xl border border-theme bg-panel-theme p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-base-theme">
                    Eventi del{" "}
                    {new Intl.DateTimeFormat("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(selectedDay))}
                  </div>

                  <button
                    type="button"
                    className="rounded-md border border-theme bg-panel-theme px-3 py-1.5 text-sm"
                    onClick={() => setSelectedDay(null)}
                  >
                    Chiudi
                  </button>
                </div>

                {selectedEvents.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-theme">Nessun evento in questo giorno.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedEvents.map((ev: any) => {
                      const addr: string =
                        ev.location_address || ev.location || "";

                      const hasCoords = !!ev.location_lat && !!ev.location_lng;

                      return (
                        <div key={ev.id} className="rounded-lg border border-theme bg-black/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-base-theme truncate">{ev.title}</div>

                              <div className="mt-1 text-xs text-muted-theme">
                                {ev.type === "training"
                                  ? "Allenamento"
                                  : ev.type === "match"
                                  ? "Partita"
                                  : "Riunione"}
                                {" • "}
                                {fmtDateTimeIT(ev.start_at)}
                                {addr ? " • " : ""}

                                {/* ✅ SE coordinate => click popup, ALTRIMENTI solo testo */}
                                {addr ? (
                                  hasCoords ? (
                                    <button
                                      type="button"
                                      className="underline underline-offset-4 hover:opacity-90"
                                      onClick={() => openMapForEvent(ev)}
                                      title="Apri mappa"
                                    >
                                      {addr}
                                    </button>
                                  ) : (
                                    <span>{addr}</span>
                                  )
                                ) : null}
                              </div>
                            </div>

                            {isStaff && (
                              <div className="shrink-0 flex flex-col gap-2">
                                <Link
                                  className="rounded-md border border-theme bg-panel-theme px-3 py-1 text-sm"
                                  href={"/app/eventi/" + ev.id}
                                >
                                  Convoca →
                                </Link>

                                <Link
                                  className="rounded-md border border-theme bg-panel-theme px-3 py-1 text-sm"
                                  href={"/app/eventi/" + ev.id + "/risposte"}
                                >
                                  Risposte →
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-theme bg-panel-theme p-4">
                <p className="text-sm text-muted-theme">Seleziona un giorno dal calendario.</p>
              </div>
            )}
          </div>
        </div>

        {isStaff && (
          <div className="card p-6 min-w-0">
            <h2 className="text-lg font-semibold text-base-theme">Crea evento</h2>

            <form className="mt-4 space-y-3" onSubmit={createEvent}>
              <input
                className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                placeholder="Titolo (es. Allenamento, Partita vs ...)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <select
                className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                <option value="training">Allenamento</option>
                <option value="match">Partita</option>
                <option value="meeting">Riunione</option>
              </select>

              <div>
                <label className="mb-1 block text-xs text-muted-theme">Data e ora</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>

              {/* ✅ LUOGO: testo libero + autocomplete */}
              <div>
                <label className="mb-1 block text-xs text-muted-theme">
                  Luogo (seleziona da suggerimenti oppure scrivi libero)
                </label>

                <PlaceAutocomplete
                  value={place}
                  onChange={(v) => {
                    setPlace(v);
                    // se scegli un suggerimento, allineo il testo
                    setLocationText(v?.address ?? "");
                  }}
                  placeholder="Via… / Stadio… / Campo…"
                  inputClassName="w-full h-10 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
                  // ✅ se scrivi e NON scegli un suggerimento, deve restare testo libero:
                  onInputChange={(txt: string) => {
                    setLocationText(txt);
                    setPlace(null); // ← importante: così verrà salvato come “solo testo”
                  }}
                />

                <div className="mt-2 text-xs text-muted-theme">
                  Se selezioni un suggerimento → salviamo coordinate (popup mappa). Se scrivi libero → solo testo.
                </div>
              </div>

              <button
                className="w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                disabled={!canSubmit}
                style={{ opacity: canSubmit ? 1 : 0.6 }}
              >
                Crea
              </button>
            </form>

            <p className="mt-3 text-xs text-muted-theme">
              Dopo la creazione, clicca “Convoca →” per selezionare i giocatori.
            </p>
          </div>
        )}
      </div>

      <MapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title={mapEv?.title ?? "Posizione"}
        address={mapEv?.location_address ?? mapEv?.location ?? null}
        lat={mapEv?.location_lat ?? null}
        lng={mapEv?.location_lng ?? null}
      />
    </div>
  );
}