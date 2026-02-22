"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AppPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playersCount, setPlayersCount] = useState<number | null>(null);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number | null>(null);
  const [convocationsCount, setConvocationsCount] = useState<number | null>(null);

  async function resolveClubIdForMe(): Promise<string | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return null;

    // 1️⃣ Se è staff
    const { data: member, error: memberErr } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) throw new Error(memberErr.message);
    if (member?.club_id) return member.club_id;

    // 2️⃣ Se è player
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("club_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (playerErr) throw new Error(playerErr.message);
    return player?.club_id ?? null;
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const clubId = await resolveClubIdForMe();
      if (!clubId) {
        setError("Impossibile determinare la squadra.");
        setLoading(false);
        return;
      }

      // 👥 Conteggio giocatori attivi
      const { count: pCount, error: pErr } = await supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("active", true);

      if (pErr) throw new Error(pErr.message);
      setPlayersCount(pCount ?? 0);

      // 📅 Eventi futuri
      const nowIso = new Date().toISOString();

      const { data: upcomingEvents, error: eErr } = await supabase
        .from("events")
        .select("id")
        .eq("club_id", clubId)
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true });

      if (eErr) throw new Error(eErr.message);

      const eventIds = (upcomingEvents ?? []).map((e) => e.id);
      setUpcomingEventsCount(eventIds.length);

      // 📢 Convocazioni legate agli eventi futuri
      if (eventIds.length === 0) {
        setConvocationsCount(0);
      } else {
        const { count: cCount, error: cErr } = await supabase
          .from("event_targets")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds)
          .eq("target_type", "player");

        if (cErr) throw new Error(cErr.message);
        setConvocationsCount(cCount ?? 0);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message ?? "Errore caricamento dashboard");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const renderValue = (value: number | null) => {
    if (loading) return "…";
    if (error) return "—";
    if (value === null) return "—";
    return value;
  };

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-3xl font-semibold text-base-theme">Dashboard</h1>
        <p className="mt-3 text-muted-theme">
          Qui vedrai riepilogo eventi, presenze e comunicazioni.
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <div className="text-sm text-muted-theme">Giocatori attivi</div>
          <div className="mt-2 text-2xl font-semibold text-base-theme">
            {renderValue(playersCount)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted-theme">Eventi prossimi</div>
          <div className="mt-2 text-2xl font-semibold text-base-theme">
            {renderValue(upcomingEventsCount)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted-theme">
            Convocazioni (eventi futuri)
          </div>
          <div className="mt-2 text-2xl font-semibold text-base-theme">
            {renderValue(convocationsCount)}
          </div>
        </div>
      </div>
    </div>
  );
}