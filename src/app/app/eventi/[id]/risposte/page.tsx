"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type EventRow = {
  id: string;
  title: string;
  type: "training" | "match" | "meeting";
  start_at: string;
  location: string | null;
  club_id: string;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  active: boolean;
};

type Target = { player_id: string };

type ResponseRow = {
  player_id: string;
  status: string;
  reason: string | null;
  attachment_url: string | null;
  responded_at: string | null;
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

function normalizeStatus(raw?: string | null): "yes" | "no" | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();

  if (["yes", "y", "si", "sì", "presente", "present"].includes(s)) return "yes";
  if (["no", "n", "assente", "absent"].includes(s)) return "no";

  return null;
}

export default function EventResponsesPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();

  const [ev, setEv] = useState<EventRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [responses, setResponses] = useState<Map<string, ResponseRow>>(new Map());

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const invitedPlayers = useMemo(() => {
    const set = new Set(targets);
    return players.filter((p) => set.has(p.id));
  }, [players, targets]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select("id, title, type, start_at, location, club_id")
      .eq("id", eventId)
      .single();

    if (evErr || !evData) {
      setError("Evento non trovato o permessi insufficienti.");
      setLoading(false);
      return;
    }
    setEv(evData);

    const { data: plData, error: plErr } = await supabase
      .from("players")
      .select("id, first_name, last_name, active")
      .eq("club_id", evData.club_id)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (plErr) {
      setError(plErr.message);
      setLoading(false);
      return;
    }
    setPlayers(plData ?? []);

    // convocati: event_targets
    const { data: tgData, error: tgErr } = await supabase
      .from("event_targets")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("target_type", "player");

    if (tgErr) {
      setError(tgErr.message);
      setLoading(false);
      return;
    }
    const ids = ((tgData as Target[] | null) ?? []).map((t) => t.player_id);
    setTargets(ids);

    // risposte: event_responses
    const { data: rsData, error: rsErr } = await supabase
        .from("event_responses")
        .select("player_id, status, reason, attachment_url, responded_at")
        .eq("event_id", eventId);

    if (rsErr) {
      setError(rsErr.message);
      setLoading(false);
      return;
    }

    const map = new Map<string, ResponseRow>();
    (rsData as any[] | null)?.forEach((r) => map.set(r.player_id, r as ResponseRow));
    setResponses(map);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function setResponse(playerId: string, status: "yes" | "no") {
    setSavingId(playerId);
    setError(null);

    const prev = responses.get(playerId);
    const reason = status === "no" ? (prev?.reason ?? "") : null;

    // upsert (serve unique su (event_id, player_id) nel DB)
    const { error: upErr } = await supabase.from("event_responses").upsert(
        {
            event_id: eventId,
            player_id: playerId,
            status,
            reason,
            attachment_url: prev?.attachment_url ?? null,
            responded_at: new Date().toISOString(),
        },
        { onConflict: "event_id,player_id" }
        );

    if (upErr) {
      setError(upErr.message);
      setSavingId(null);
      return;
    }

    await loadAll();
    setSavingId(null);
    setSavedId(playerId);
    setTimeout(() => setSavedId(null), 1200);
  }

  async function saveReason(playerId: string, reason: string) {
    setSavingId(playerId);
    setError(null);

    const prev = responses.get(playerId);
    const status = prev?.status ?? "no";

    const { error: upErr } = await supabase.from("event_responses").upsert(
        {
            event_id: eventId,
            player_id: playerId,
            status,
            reason: reason.trim() ? reason.trim() : null,
            attachment_url: prev?.attachment_url ?? null,
            responded_at: new Date().toISOString(),
        },
        { onConflict: "event_id,player_id" }
        );

    if (upErr) {
      setError(upErr.message);
      setSavingId(null);
      return;
    }

    await loadAll();
    setSavingId(null);
    setSavedId(playerId);
    setTimeout(() => setSavedId(null), 1200);
  }

  if (loading) return <div className="card p-8">Caricamento…</div>;
  if (!ev) return <div className="card p-8">Evento non disponibile.</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-base-theme">Risposte</h1>
            <p className="mt-2 text-muted-theme">
              <b>{ev.title}</b> • {fmtDateTimeIT(ev.start_at)} {ev.location ? "• " + ev.location : ""}
            </p>
          </div>

          <button
            className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
            onClick={() => router.push("/app/convocazioni/")}
          >
            ← Torna a Convocazioni
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card p-6">
        {invitedPlayers.length === 0 ? (
          <p className="text-muted-theme">Nessun convocato: seleziona i convocati nella pagina “Convoca”.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-theme">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-panel-theme">
                  <th className="px-3 py-2 text-left">Giocatore</th>
                  <th className="px-3 py-2 text-center w-36">Risposta</th>
                  <th className="px-3 py-2 text-left">Motivo (se assente)</th>
                </tr>
              </thead>
              <tbody>
                {invitedPlayers.map((p) => {
                  const r = responses.get(p.id);
                  const status = normalizeStatus(r?.status ?? null);
                  const rowStyle: React.CSSProperties =
                    status === "yes"
                        ? { borderLeft: "8px solid #22c55e" } // green-500
                        : status === "no"
                        ? { borderLeft: "8px solid #ef4444" } // red-500
                        : {};

                  return (
                    <tr key={p.id} className="border-t border-theme" style={rowStyle}>
                      <td className="px-3 py-2">
                        {p.last_name} {p.first_name}
                      </td>

                      <td className={"px-3 py-2 text-center " + (status === "yes" ? "text-green-600" : status === "no" ? "text-red-600" : "")}>
                        <div className="inline-flex gap-2">
                          <button
                            className="rounded-md border border-theme bg-panel-theme px-2 py-1"
                            style={{
                                opacity: status === "yes" ? 1 : 0.5,
                                outline: status === "yes" ? "2px solid #22c55e" : "none",
                                outlineOffset: "2px",
                            }}
                            title="Presente"
                            onClick={() => setResponse(p.id, "yes")}
                            disabled={savingId === p.id}
                          >
                            ✅
                          </button>
                          <button
                            className="rounded-md border border-theme bg-panel-theme px-2 py-1"
                            style={{
                                opacity: status === "no" ? 1 : 0.5,
                                outline: status === "no" ? "2px solid #ef4444" : "none",
                                outlineOffset: "2px",
                            }}
                            title="Assente"
                            onClick={() => setResponse(p.id, "no")}
                            disabled={savingId === p.id}
                          >
                            ❌
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-muted-theme">
                          {status === "yes" ? "Presente" : status === "no" ? "Assente" : "—"}
                          {savedId === p.id ? " • Salvato ✅" : ""}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <input
                          className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                          placeholder="Motivo assenza (opzionale)"
                          defaultValue={r?.reason ?? ""}
                          disabled={status !== "no"}
                          onBlur={(e) => saveReason(p.id, e.target.value)}
                        />
                        <div className="mt-1 text-xs text-muted-theme">
                          (salva quando esci dal campo)
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-6">
        <p className="text-sm text-muted-theme">
          Prossimo step: allegato (certificato/giustificazione) con invio email automatica allo staff.
        </p>
      </div>
    </div>
  );
}