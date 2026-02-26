// ✅ INCOLLA QUESTO FILE COMPLETO (sostituisci TUTTO il tuo file convocazioni)
// Nota: ho rimosso TUTTO il vecchio blocco iframe/mapTitle/mapQuery (era quello che ti rompeva la compilazione)

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import MapModal from "@/components/MapModal";

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

    const { data: member, error: mbErr } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (mbErr) {
      setError(mbErr.message);
      setLoading(false);
      return;
    }

    const staff = ["admin", "staff"].includes(member?.role ?? "");
    setIsStaff(staff);

    let clubId: string | null = member?.club_id ?? null;
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

                        <div className="shrink-0 flex flex-col gap-2">
                          <Link
                            className="rounded-md border border-theme bg-panel-theme px-3 py-2 text-sm text-center"
                            href={"/app/eventi/" + ev.id}
                          >
                            Convoca →
                          </Link>
                          <Link
                            className="rounded-md border border-theme bg-panel-theme px-3 py-2 text-sm text-center"
                            href={"/app/eventi/" + ev.id + "/risposte"}
                          >
                            Risposte →
                          </Link>
                        </div>
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
                            <div className="flex flex-col items-end gap-2">
                              <Link
                                className="rounded-md border border-theme bg-panel-theme px-3 py-1"
                                href={"/app/eventi/" + ev.id}
                              >
                                Convoca →
                              </Link>
                              <Link
                                className="rounded-md border border-theme bg-panel-theme px-3 py-1"
                                href={"/app/eventi/" + ev.id + "/risposte"}
                              >
                                Risposte →
                              </Link>
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
                      <Link href={"/app/convocazioni/" + ev.id} className="block">
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
                              href={"/app/convocazioni/" + ev.id}
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