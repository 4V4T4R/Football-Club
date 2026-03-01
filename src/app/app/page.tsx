"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type EventType = "training" | "match" | "meeting";

type WeekEvent = {
  id: string;
  title: string;
  type: EventType;
  start_at: string;
  location: string | null;
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

function typeLabel(t: EventType) {
  return t === "training"
    ? "Allenamento"
    : t === "match"
    ? "Partita"
    : "Riunione";
}

export default function AppPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const [playersCount, setPlayersCount] = useState<number | null>(null);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number | null>(null);
  const [convocationsCount, setConvocationsCount] = useState<number | null>(null);

  const [weekEvents, setWeekEvents] = useState<WeekEvent[]>([]);

  async function resolveMe() {
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    const userId = user?.id ?? null;

    if (!userId) {
      return { userId: null, clubId: null, staff: false, name: "" };
    }

    // 0) Nome: prima prova dalla tabella public.users (vale sia per staff che per player)
    let name = "";
    const { data: uRow } = await supabase
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (uRow?.first_name || uRow?.last_name) {
      name = `${uRow.first_name ?? ""} ${uRow.last_name ?? ""}`.trim();
    }

    // fallback 1: metadata
    if (!name) {
      const meta: any = user?.user_metadata ?? {};
      name = (meta.full_name || meta.name || meta.nome || "").trim();
    }

    // fallback 2: email username
    if (!name) {
      const email = user?.email ?? uRow?.email ?? "";
      name = email.includes("@") ? email.split("@")[0] : "";
    }

    // 1) prova staff
    const { data: member, error: memberErr } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) throw new Error(memberErr.message);

    const staff = ["admin", "staff"].includes(member?.role ?? "");

    if (member?.club_id) {
      return { userId, clubId: member.club_id, staff, name };
    }

    // 2) prova player (e se ha nome/cognome in players, quello vince)
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("id, club_id, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (playerErr) throw new Error(playerErr.message);

    if (player?.first_name || player?.last_name) {
      const full = `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim();
      if (full) name = full;
    }

    return {
      userId,
      clubId: player?.club_id ?? null,
      staff: false,
      name,
    };
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const me = await resolveMe();

      if (!me.userId) {
        setError("Utente non autenticato.");
        setLoading(false);
        return;
      }

      setDisplayName(me.name || "");
      setIsStaff(me.staff);

      if (!me.clubId) {
        setError("Impossibile determinare la squadra.");
        setLoading(false);
        return;
      }

      // 👥 giocatori attivi
      const { count: pCount, error: pErr } = await supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("club_id", me.clubId)
        .eq("active", true);

      if (pErr) throw new Error(pErr.message);
      setPlayersCount(pCount ?? 0);

      // 📅 eventi futuri (conteggio)
      const nowIso = new Date().toISOString();

      const { data: upcomingEvents, error: eErr } = await supabase
        .from("events")
        .select("id, start_at")
        .eq("club_id", me.clubId)
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true });

      if (eErr) throw new Error(eErr.message);

      const eventIds = (upcomingEvents ?? []).map((e: any) => e.id);
      setUpcomingEventsCount(eventIds.length);

      // 📢 convocazioni future
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

      // =====================
      // EVENTI DELLA SETTIMANA
      // =====================
      const weekEnd = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      if (me.staff) {
        const { data, error: wErr } = await supabase
          .from("events")
          .select("id, title, type, start_at, location")
          .eq("club_id", me.clubId)
          .gte("start_at", nowIso)
          .lte("start_at", weekEnd)
          .order("start_at", { ascending: true });

        if (wErr) throw new Error(wErr.message);
        setWeekEvents((data ?? []) as WeekEvent[]);
      } else {
        const { data: pl } = await supabase
          .from("players")
          .select("id")
          .eq("user_id", me.userId)
          .maybeSingle();

        const playerId = pl?.id;

        if (!playerId) {
          setWeekEvents([]);
        } else {
          const { data: tg } = await supabase
            .from("event_targets")
            .select("event_id")
            .eq("target_type", "player")
            .eq("player_id", playerId);

          const ids = Array.from(
            new Set(((tg ?? []) as any[]).map((x) => x.event_id))
          );

          if (ids.length === 0) {
            setWeekEvents([]);
          } else {
            const { data: evs } = await supabase
              .from("events")
              .select("id, title, type, start_at, location")
              .in("id", ids)
              .gte("start_at", nowIso)
              .lte("start_at", weekEnd)
              .order("start_at", { ascending: true });

            setWeekEvents((evs ?? []) as WeekEvent[]);
          }
        }
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

  const weekTitle = useMemo(() => {
    if (loading) return "Eventi della settimana";
    return isStaff
      ? "Eventi della settimana (club)"
      : "I tuoi eventi della settimana";
  }, [loading, isStaff]);

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-3xl font-semibold text-base-theme">
          Benvenuto{displayName ? " " + displayName : ""} 👋
        </h1>

        <p className="mt-3 text-muted-theme">
          Qui vedrai il riepilogo dei tuoi eventi e quelli in arrivo.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {/* STATS - MOBILE (orizzontale) */}
      <div className="md:hidden">
        <div className="flex gap-3">
          <div className="card p-4 flex-1 min-w-0">
            <div className="text-center text-xs text-muted-theme">Giocatori</div>
            <div className="mt-2 text-center text-2xl font-semibold text-base-theme leading-none">
              {renderValue(playersCount)}
            </div>
          </div>

          <div className="card p-4 flex-1 min-w-0">
            <div className="text-center text-xs text-muted-theme">Eventi</div>
            <div className="mt-2 text-center text-2xl font-semibold text-base-theme leading-none">
              {renderValue(upcomingEventsCount)}
            </div>
          </div>

          <div className="card p-4 flex-1 min-w-0">
            <div className="text-center text-xs text-muted-theme">Convocazioni</div>
            <div className="mt-2 text-center text-2xl font-semibold text-base-theme leading-none">
              {renderValue(convocationsCount)}
            </div>
          </div>
        </div>
      </div>

      {/* STATS - DESKTOP (griglia normale) */}
      <div className="hidden md:grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <div className="text-sm text-muted-theme">Giocatori attivi</div>
          <div className="mt-2 text-2xl font-semibold text-base-theme">
            {renderValue(playersCount)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted-theme">Eventi futuri</div>
          <div className="mt-2 text-2xl font-semibold text-base-theme">
            {renderValue(upcomingEventsCount)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted-theme">Convocazioni (eventi futuri)</div>
          <div className="mt-2 text-2xl font-semibold text-base-theme">
            {renderValue(convocationsCount)}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-base-theme">{weekTitle}</h2>

        {loading ? (
          <p className="mt-3 text-sm text-muted-theme">Caricamento…</p>
        ) : weekEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-theme">
            Nessun evento nei prossimi 7 giorni.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {weekEvents.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-theme bg-panel-theme p-3"
              >
                <div className="font-medium text-base-theme">{e.title}</div>
                <div className="text-xs text-muted-theme mt-1">
                  {typeLabel(e.type)} • {fmtDateTimeIT(e.start_at)}
                  {e.location ? " • " + e.location : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}