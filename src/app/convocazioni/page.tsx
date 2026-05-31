"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MapModal from "@/components/MapModal";
import PlaceAutocomplete, { PlaceValue } from "@/components/PlaceAutocomplete";
import EventActionsMenu from "@/components/EventActionsMenu";
import { resolveActiveClub } from "@/lib/activeClub";

type EventRow = {
  id: string;
  club_id: string;
  title: string;
  type: "training" | "match" | "meeting";
  start_at: string;

  location: string | null;

  location_place_id?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

type PlayerRow = { id: string; club_id: string };

type ResponseRow = {
  event_id: string;
  player_id: string;
  status: "yes" | "no";
};

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

function toIso(dtLocal: string) {
  return new Date(dtLocal).toISOString();
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function typeLabel(t: EventRow["type"]) {
  return t === "training" ? "Allenamento" : t === "match" ? "Partita" : "Riunione";
}

export default function ConvocazioniPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clubName, setClubName] = useState<string>("");
  const [isStaff, setIsStaff] = useState(false);

  // staff data
  const [staffEvents, setStaffEvents] = useState<EventRow[]>([]);
  const [staffCounts, setStaffCounts] = useState<
    Record<string, { total: number; yes: number; pending: number }>
  >({});

  // player data
  const [playerEvents, setPlayerEvents] = useState<EventRow[]>([]);
  const [playerStatusByEvent, setPlayerStatusByEvent] = useState<
    Record<string, "yes" | "no" | null>
  >({});

  const [editOpen, setEditOpen] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<EventRow["type"]>("training");
  const [editStartAt, setEditStartAt] = useState("");
  const [editLocationText, setEditLocationText] = useState("");
  const [editPlace, setEditPlace] = useState<PlaceValue | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    kind: "update" | "delete";
    event: EventRow;
  } | null>(null);

  // ✅ popup mappa (solo se ci sono coordinate)
  const [mapOpen, setMapOpen] = useState(false);
  const [mapEv, setMapEv] = useState<EventRow | null>(null);

  function openMapForEvent(ev: EventRow) {
    if (ev.location_lat == null || ev.location_lng == null) return;
    setMapEv(ev);
    setMapOpen(true);
  }

  const hasStaffEvents = staffEvents.length > 0;
  const hasPlayerEvents = playerEvents.length > 0;
  const canEditSubmit = useMemo(() => editTitle.trim().length > 0 && !!editStartAt, [editTitle, editStartAt]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    const active = await resolveActiveClub(supabase, userId);
    const staff = active.isStaff;
    setIsStaff(staff);

    let clubId: string | null = active.clubId;
    let player: PlayerRow | null = null;

    if (!clubId) {
      const { data: pl, error: plErr } = await supabase
        .from("players")
        .select("id, club_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (plErr) {
        setError(plErr.message);
        setLoading(false);
        return;
      }

      player = (pl as PlayerRow | null) ?? null;
      clubId = player?.club_id ?? null;
    }

    if (!clubId) {
      setError("Impossibile determinare la squadra.");
      setLoading(false);
      return;
    }

    const { data: clubData } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", clubId)
      .maybeSingle();

    setClubName(clubData?.name ?? "");

    if (staff) {
      await loadStaffView(clubId);
      setLoading(false);
      return;
    }

    if (!player?.id) {
      const { data: pl2, error: pl2Err } = await supabase
        .from("players")
        .select("id, club_id")
        .eq("user_id", userId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (pl2Err) {
        setError(pl2Err.message);
        setLoading(false);
        return;
      }

      if (!pl2?.id) {
        setError("Giocatore non trovato.");
        setLoading(false);
        return;
      }

      player = pl2 as PlayerRow;
    }

    await loadPlayerView(player.id);
    setLoading(false);
  }

  async function loadStaffView(clubId: string) {
    const nowIso = new Date().toISOString();

    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select(
        "id, club_id, title, type, start_at, location, location_address, location_lat, location_lng"
      )
      .eq("club_id", clubId)
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true });

    if (evErr) {
      setError(evErr.message);
      return;
    }

    const events = (evData as EventRow[] | null) ?? [];
    setStaffEvents(events);

    if (events.length === 0) {
      setStaffCounts({});
      return;
    }

    const eventIds = events.map((e) => e.id);

    const { data: targets, error: tgErr } = await supabase
      .from("event_targets")
      .select("event_id, player_id")
      .in("event_id", eventIds)
      .eq("target_type", "player");

    if (tgErr) {
      setError(tgErr.message);
      return;
    }

    const { data: responses, error: rsErr } = await supabase
      .from("event_responses")
      .select("event_id, player_id, status")
      .in("event_id", eventIds);

    if (rsErr) {
      setError(rsErr.message);
      return;
    }

    const totalByEvent: Record<string, number> = {};
    for (const t of (targets as any[] | null) ?? []) {
      totalByEvent[t.event_id] = (totalByEvent[t.event_id] ?? 0) + 1;
    }

    const yesByEvent: Record<string, number> = {};
    const respondedByEvent: Record<string, number> = {};

    for (const r of (responses as ResponseRow[] | null) ?? []) {
      respondedByEvent[r.event_id] = (respondedByEvent[r.event_id] ?? 0) + 1;
      if (r.status === "yes") yesByEvent[r.event_id] = (yesByEvent[r.event_id] ?? 0) + 1;
    }

    const counts: Record<string, { total: number; yes: number; pending: number }> = {};
    for (const evId of eventIds) {
      const total = totalByEvent[evId] ?? 0;
      const yes = yesByEvent[evId] ?? 0;
      const responded = respondedByEvent[evId] ?? 0;
      const pending = Math.max(0, total - responded);
      counts[evId] = { total, yes, pending };
    }

    setStaffCounts(counts);
  }

  async function loadPlayerView(playerId: string) {
    const { data: targets, error: tgErr } = await supabase
      .from("event_targets")
      .select("event_id")
      .eq("target_type", "player")
      .eq("player_id", playerId);

    if (tgErr) {
      setError(tgErr.message);
      return;
    }

    const eventIds = Array.from(new Set(((targets as any[] | null) ?? []).map((t) => t.event_id)));

    if (eventIds.length === 0) {
      setPlayerEvents([]);
      setPlayerStatusByEvent({});
      return;
    }

    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select(
        "id, club_id, title, type, start_at, location, location_address, location_lat, location_lng"
      )
      .in("id", eventIds)
      .order("start_at", { ascending: true });

    if (evErr) {
      setError(evErr.message);
      return;
    }

    const events = (evData as EventRow[] | null) ?? [];
    setPlayerEvents(events);

    const { data: resp, error: rsErr } = await supabase
      .from("event_responses")
      .select("event_id, status")
      .eq("player_id", playerId)
      .in("event_id", eventIds);

    if (rsErr) {
      setError(rsErr.message);
      return;
    }

    const map: Record<string, "yes" | "no" | null> = {};
    for (const ev of events) map[ev.id] = null;
    for (const r of (resp as any[] | null) ?? []) {
      map[r.event_id] = (r.status as "yes" | "no") ?? null;
    }
    setPlayerStatusByEvent(map);
  }

  function startEditEvent(ev: EventRow) {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditType(ev.type);
    setEditStartAt(toLocalInputValue(ev.start_at));
    setEditLocationText(ev.location_address ?? ev.location ?? "");
    setEditPlace(
      ev.location_place_id && ev.location_address && ev.location_lat != null && ev.location_lng != null
        ? {
            placeId: ev.location_place_id,
            address: ev.location_address,
            lat: ev.location_lat,
            lng: ev.location_lng,
          }
        : null
    );
    setEditOpen(true);
    setError(null);
  }

  function closeEditEvent() {
    setEditOpen(false);
    setEditingEvent(null);
    setEditTitle("");
    setEditType("training");
    setEditStartAt("");
    setEditLocationText("");
    setEditPlace(null);
  }

  async function manageEvent(payload: Record<string, any>) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    if (!token) {
      throw new Error("Sessione non valida.");
    }

    const res = await fetch("/api/events/manage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Errore gestione evento.");
    return json;
  }

  function updateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setConfirmAction({ kind: "update", event: editingEvent });
  }

  function deleteEvent(ev: EventRow) {
    setConfirmAction({ kind: "delete", event: ev });
  }

  async function executeConfirmedEventAction() {
    if (!confirmAction) return;
    setSavingEvent(true);
    setError(null);

    try {
      if (confirmAction.kind === "update") {
        await manageEvent({
          action: "update",
          event_id: confirmAction.event.id,
          title: editTitle.trim(),
          type: editType,
          start_at: toIso(editStartAt),
          location: editPlace ? editPlace.address : editLocationText.trim() || null,
          location_address: editPlace ? editPlace.address : null,
          location_place_id: editPlace ? editPlace.placeId : null,
          location_lat: editPlace ? editPlace.lat : null,
          location_lng: editPlace ? editPlace.lng : null,
        });

        closeEditEvent();
      } else {
        await manageEvent({ action: "delete", event_id: confirmAction.event.id });
        if (editingEvent?.id === confirmAction.event.id) closeEditEvent();
      }

      setConfirmAction(null);
      await load();
    } catch (err: any) {
      setError(
        err?.message ??
          (confirmAction.kind === "update" ? "Errore aggiornamento evento." : "Errore eliminazione evento.")
      );
    } finally {
      setSavingEvent(false);
    }
  }

  const title = useMemo(() => (isStaff ? "Convocazioni" : "Le mie convocazioni"), [isStaff]);

  if (loading) return <div className="card p-8">Caricamento…</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">{title}</h1>
        <p className="mt-2 text-muted-theme">
          {isStaff
            ? `Riepilogo convocazioni attive${clubName ? " di " + clubName : ""}.`
            : `Qui trovi le convocazioni dove sei stato selezionato${
                clubName ? " (" + clubName + ")" : ""
              }.`}
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {isStaff ? (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">Attive</h2>

          {!hasStaffEvents ? (
            <p className="mt-3 text-muted-theme">Nessuna convocazione attiva.</p>
          ) : (
            <>
              {/* MOBILE LIST */}
              <div className="mt-4 md:hidden space-y-2">
                {staffEvents.map((ev) => {
                  const c = staffCounts[ev.id] ?? { total: 0, yes: 0, pending: 0 };
                  const addr = (ev.location_address ?? ev.location ?? "").trim();
                  const hasCoords = ev.location_lat != null && ev.location_lng != null;

                  return (
                    <div key={ev.id} className="rounded-xl border border-theme bg-panel-theme p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-base-theme truncate">{ev.title}</div>
                          <div className="text-xs text-muted-theme">{typeLabel(ev.type)}</div>

                          <div className="mt-2 text-xs text-muted-theme space-y-1">
                            <div className="flex items-start gap-2">
                              <span>📅</span>
                              <span>{fmtDateTimeIT(ev.start_at)}</span>
                            </div>

                            <div className="flex items-start gap-2">
                              <span>📍</span>
                              {addr ? (
                                hasCoords ? (
                                  <button
                                    type="button"
                                    className="text-left underline underline-offset-4"
                                    onClick={() => openMapForEvent(ev)}
                                    title="Apri mappa"
                                  >
                                    {addr}
                                  </button>
                                ) : (
                                  <span>{addr}</span>
                                )
                              ) : (
                                <span>—</span>
                              )}
                            </div>

                            <div className="flex items-start gap-2">
                              <span>✅</span>
                              <span>
                                {c.yes}/{c.total}{" "}
                                {c.pending > 0 ? (
                                  <span className="opacity-80"> (⏳ {c.pending})</span>
                                ) : null}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <EventActionsMenu
                            eventId={ev.id}
                            eventTitle={ev.title}
                            onEdit={() => startEditEvent(ev)}
                            onDelete={() => deleteEvent(ev)}
                            disabled={savingEvent}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="mt-4 hidden md:block rounded-xl border border-theme">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="bg-panel-theme">
                      <th className="px-3 py-2 text-left w-[36%]">Evento</th>
                      <th className="px-3 py-2 text-left w-[28%]">Data / Luogo</th>
                      <th className="px-3 py-2 text-left w-[18%]">Convocati</th>
                      <th className="px-3 py-2 text-right w-[18%]">Azioni</th>
                    </tr>
                  </thead>

                  <tbody>
                    {staffEvents.map((ev) => {
                      const c = staffCounts[ev.id] ?? { total: 0, yes: 0, pending: 0 };
                      const addr = (ev.location_address ?? ev.location ?? "").trim();
                      const hasCoords = ev.location_lat != null && ev.location_lng != null;

                      return (
                        <tr key={ev.id} className="border-t border-theme align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-xs text-muted-theme">{typeLabel(ev.type)}</div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-start gap-2">
                              <span>📅</span>
                              <span>{fmtDateTimeIT(ev.start_at)}</span>
                            </div>

                            <div className="mt-2 flex items-start gap-2">
                              <span>📍</span>
                              {addr ? (
                                hasCoords ? (
                                  <button
                                    type="button"
                                    className="text-left underline underline-offset-4"
                                    onClick={() => openMapForEvent(ev)}
                                    title="Apri mappa"
                                  >
                                    {addr}
                                  </button>
                                ) : (
                                  <span>{addr}</span>
                                )
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium">
                              {c.yes} / {c.total} ✅
                            </div>
                            <div className="text-xs text-muted-theme">⏳ {c.pending} in attesa</div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex justify-end">
                              <EventActionsMenu
                                eventId={ev.id}
                                eventTitle={ev.title}
                                onEdit={() => startEditEvent(ev)}
                                onDelete={() => deleteEvent(ev)}
                                disabled={savingEvent}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">Le mie convocazioni</h2>

          {!hasPlayerEvents ? (
            <p className="mt-3 text-muted-theme">Nessuna convocazione al momento.</p>
          ) : (
            <>
              {/* MOBILE LIST */}
              <div className="mt-4 md:hidden space-y-2">
                {playerEvents.map((ev) => {
                  const st = playerStatusByEvent[ev.id] ?? null;
                  const badge =
                    st === "yes" ? "✅ Presente" : st === "no" ? "❌ Assente" : "⏳ In attesa";

                  const addr = (ev.location_address ?? ev.location ?? "").trim();
                  const hasCoords = ev.location_lat != null && ev.location_lng != null;

                  return (
                    <div key={ev.id} className="rounded-xl border border-theme bg-panel-theme p-3">
                      <Link href={"/convocazioni/" + ev.id} className="block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-base-theme truncate">{ev.title}</div>
                            <div className="text-xs text-muted-theme">{typeLabel(ev.type)}</div>

                            <div className="mt-2 text-xs text-muted-theme space-y-1">
                              <div className="flex items-start gap-2">
                                <span>📅</span>
                                <span>{fmtDateTimeIT(ev.start_at)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-xs text-muted-theme text-right">
                            <div className="font-medium text-base-theme">{badge}</div>
                            <div className="mt-1 opacity-80">Apri →</div>
                          </div>
                        </div>
                      </Link>

                      <div className="mt-2 flex items-start gap-2 text-xs text-muted-theme">
                        <span>📍</span>
                        {addr ? (
                          hasCoords ? (
                            <button
                              type="button"
                              className="text-left underline underline-offset-4"
                              onClick={() => openMapForEvent(ev)}
                              title="Apri mappa"
                            >
                              {addr}
                            </button>
                          ) : (
                            <span>{addr}</span>
                          )
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="mt-4 hidden md:block overflow-hidden rounded-xl border border-theme">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="bg-panel-theme">
                      <th className="px-3 py-2 text-left w-[34%]">Evento</th>
                      <th className="px-3 py-2 text-left w-[40%]">Data / Luogo</th>
                      <th className="px-3 py-2 text-left w-[14%]">Stato</th>
                      <th className="px-3 py-2 text-right w-[12%]">Azioni</th>
                    </tr>
                  </thead>

                  <tbody>
                    {playerEvents.map((ev) => {
                      const st = playerStatusByEvent[ev.id] ?? null;
                      const badge =
                        st === "yes" ? "✅ Presente" : st === "no" ? "❌ Assente" : "⏳ In attesa";

                      const addr = (ev.location_address ?? ev.location ?? "").trim();
                      const hasCoords = ev.location_lat != null && ev.location_lng != null;

                      return (
                        <tr key={ev.id} className="border-t border-theme align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-xs text-muted-theme">{typeLabel(ev.type)}</div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-start gap-2">
                              <span>📅</span>
                              <span>{fmtDateTimeIT(ev.start_at)}</span>
                            </div>

                            <div className="mt-2 flex items-start gap-2">
                              <span>📍</span>
                              {addr ? (
                                hasCoords ? (
                                  <button
                                    type="button"
                                    className="text-left underline underline-offset-4"
                                    onClick={() => openMapForEvent(ev)}
                                    title="Apri mappa"
                                  >
                                    {addr}
                                  </button>
                                ) : (
                                  <span>{addr}</span>
                                )
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium">{badge}</div>
                          </td>

                          <td className="px-3 py-3 text-right">
                            <Link
                              className="rounded-md border border-theme bg-panel-theme px-3 py-2"
                              href={"/convocazioni/" + ev.id}
                            >
                              Apri →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {isStaff && editOpen && editingEvent && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi"
            onClick={closeEditEvent}
          />

          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-base-theme">Modifica evento</h2>
                  <p className="mt-1 text-xs text-muted-theme">
                    Prima del salvataggio ti verrà chiesta conferma.
                  </p>
                </div>

                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                  onClick={closeEditEvent}
                  title="Chiudi"
                  aria-label="Chiudi modifica evento"
                >
                  ✕
                </button>
              </div>

              <form className="mt-4 space-y-3" onSubmit={updateEvent}>
                <input
                  className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                  placeholder="Titolo"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />

                <select
                  className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as EventRow["type"])}
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
                    value={editStartAt}
                    onChange={(e) => setEditStartAt(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Luogo</label>
                  <PlaceAutocomplete
                    value={editPlace}
                    fallbackText={editLocationText}
                    onChange={(v) => {
                      setEditPlace(v);
                      setEditLocationText(v?.address ?? "");
                    }}
                    placeholder="Via… / Stadio… / Campo…"
                    inputClassName="w-full h-10 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
                    onInputChange={(txt: string) => {
                      setEditLocationText(txt);
                      setEditPlace(null);
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                    disabled={!canEditSubmit || savingEvent}
                    style={{ opacity: canEditSubmit && !savingEvent ? 1 : 0.6 }}
                  >
                    {savingEvent ? "Salvataggio..." : "Salva"}
                  </button>

                  <button
                    type="button"
                    className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm text-red-500"
                    onClick={() => deleteEvent(editingEvent)}
                    disabled={savingEvent}
                    style={{ opacity: savingEvent ? 0.6 : 1 }}
                  >
                    Elimina
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isStaff && confirmAction && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi conferma"
            onClick={() => {
              if (!savingEvent) setConfirmAction(null);
            }}
          />

          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-base-theme">
                {confirmAction.kind === "update" ? "Conferma modifiche" : "Elimina evento"}
              </h2>
              <p className="mt-2 text-sm text-muted-theme">
                {confirmAction.kind === "update"
                  ? `Vuoi salvare le modifiche a "${confirmAction.event.title}"?`
                  : `Vuoi eliminare definitivamente "${confirmAction.event.title}"?`}
              </p>
              <p className="mt-2 text-xs text-muted-theme">
                I giocatori convocati riceveranno una notifica.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                  onClick={() => setConfirmAction(null)}
                  disabled={savingEvent}
                  style={{ opacity: savingEvent ? 0.6 : 1 }}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  className={[
                    "rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm",
                    confirmAction.kind === "delete" ? "text-red-500" : "",
                  ].join(" ")}
                  onClick={executeConfirmedEventAction}
                  disabled={savingEvent}
                  style={{ opacity: savingEvent ? 0.6 : 1 }}
                >
                  {savingEvent
                    ? "Attendi..."
                    : confirmAction.kind === "update"
                      ? "Salva"
                      : "Elimina"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
