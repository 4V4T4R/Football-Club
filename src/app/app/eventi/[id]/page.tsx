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

type Target = {
  player_id: string;
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

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();

  const [ev, setEv] = useState<EventRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(() => invited.size, [invited]);

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
      .order("active", { ascending: false })
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (plErr) {
      setError(plErr.message);
      setLoading(false);
      return;
    }

    setPlayers(plData ?? []);

    const { data: targets, error: tgErr } = await supabase
      .from("event_targets")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("target_type", "player");

    if (tgErr) {
      setError(tgErr.message);
      setLoading(false);
      return;
    }

    const set = new Set<string>(((targets as Target[] | null) ?? []).map((x) => x.player_id));
    setInvited(set);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function togglePlayer(pid: string) {
    setInvited((prev) => {
      const n = new Set(prev);
      if (n.has(pid)) n.delete(pid);
      else n.add(pid);
      return n;
    });
  }

  async function saveTargets() {
    if (!ev) return;

    setSaving(true);
    setError(null);

    // MVP: cancella e reinserisce
    const { error: delErr } = await supabase
      .from("event_targets")
      .delete()
      .eq("event_id", eventId)
      .eq("target_type", "player");

    if (delErr) {
      setError(delErr.message);
      setSaving(false);
      return;
    }

    if (invited.size > 0) {
      const rows = Array.from(invited).map((pid) => ({
        event_id: eventId,
        target_type: "player",
        player_id: pid,
      }));

      const { error: insErr } = await supabase.from("event_targets").insert(rows);
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/app/eventi");
  }

  if (loading) return <div className="card p-8">Caricamento…</div>;
  if (!ev) return <div className="card p-8">Evento non disponibile.</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-base-theme">{ev.title}</h1>
            <p className="mt-2 text-muted-theme">
              {fmtDateTimeIT(ev.start_at)} {ev.location ? "• " + ev.location : ""}
            </p>
          </div>

          <button
            className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
            onClick={() => router.push("/app/eventi")}
          >
            ← Indietro
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_320px]">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">Seleziona convocati</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-theme">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-panel-theme">
                  <th className="px-3 py-2 text-left">Giocatore</th>
                  <th className="px-3 py-2 text-center w-24">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const checked = invited.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={"border-t border-theme " + (p.active ? "" : "opacity-60")}
                    >
                      <td className="px-3 py-2">
                        {p.last_name} {p.first_name} {!p.active ? "(non attivo)" : ""}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePlayer(p.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">Riepilogo</h2>

          <p className="mt-2 text-muted-theme">
            Convocati selezionati: <b>{selectedCount}</b>
          </p>

          <button
            className="mt-4 w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
            onClick={saveTargets}
            disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Salvataggio..." : "Salva convocazioni"}
          </button>

          <p className="mt-3 text-xs text-muted-theme">
            Prossimo step: risposta Presente/Assente + motivo + allegato.
          </p>
        </div>
      </div>
    </div>
  );
}