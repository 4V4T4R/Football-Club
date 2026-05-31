"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { resolveActiveClub } from "@/lib/activeClub";

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

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [isStaff, setIsStaff] = useState(false);

  const [playersCount, setPlayersCount] = useState<number | null>(null);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number | null>(null);
  const [convocationsCount, setConvocationsCount] = useState<number | null>(null);

  const [weekEvents, setWeekEvents] = useState<WeekEvent[]>([]);

  const [docsExpired, setDocsExpired] = useState<number | null>(null);
  const [docsExpiring, setDocsExpiring] = useState<number | null>(null);
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [docsPlayers, setDocsPlayers] = useState<any[]>([]);

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

    const active = await resolveActiveClub(supabase, userId);

    // 2) prova player (e se ha nome/cognome in players, quello vince)
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("id, club_id, first_name, last_name")
      .eq("user_id", userId)
      .eq("club_id", active.clubId)
      .maybeSingle();

    if (playerErr) throw new Error(playerErr.message);

    if (player?.first_name || player?.last_name) {
      const full = `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim();
      if (full) name = full;
    }

    return {
      userId,
      clubId: active.clubId ?? player?.club_id ?? null,
      staff: active.isStaff,
      name,
    };
  }

  async function loadDocumentsPlayers() {

    const me = await resolveMe();
    if (!me.clubId) return;

    const today = new Date().toISOString().slice(0,10);
    const in30 = new Date(Date.now() + 30*24*60*60*1000)
      .toISOString()
      .slice(0,10);

    const { data } = await supabase
      .from("players")
      .select("id, first_name, last_name, document_type, document_expiry")
      .eq("club_id", me.clubId)
      .eq("active", true)
      .not("document_expiry","is",null)
      .lte("document_expiry", in30)
      .order("document_expiry", { ascending: true });

    setDocsPlayers(data ?? []);
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

      // =====================
      // DOCUMENTI GIOCATORI
      // =====================

      if (me.staff) {

        const today = new Date().toISOString().slice(0, 10);

        const in30 = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString().slice(0, 10);

        // documenti scaduti
        const { count: expiredCount, error: expiredErr } = await supabase
          .from("players")
          .select("id", { count: "exact", head: true })
          .eq("club_id", me.clubId)
          .eq("active", true)
          .lt("document_expiry", today);

        if (expiredErr) throw new Error(expiredErr.message);

        // documenti in scadenza
        const { count: expiringCount, error: expiringErr } = await supabase
          .from("players")
          .select("id", { count: "exact", head: true })
          .eq("club_id", me.clubId)
          .eq("active", true)
          .gte("document_expiry", today)
          .lte("document_expiry", in30);

        if (expiringErr) throw new Error(expiringErr.message);

        setDocsExpired(expiredCount ?? 0);
        setDocsExpiring(expiringCount ?? 0);
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
          <h1 className="text-2xl font-semibold text-base-theme sm:text-3xl">
            <span>Benvenuto</span>
            {displayName ? (
              <span className="block sm:inline"> {displayName}</span>
            ) : null}{" "}
            <span className="inline-block" aria-hidden="true">
              👋
            </span>
          </h1>

          <p className="mt-3 text-muted-theme">
            Qui vedrai il riepilogo dei tuoi eventi e quelli in arrivo.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        {/* STATS - MOBILE (orizzontale) */}
        <div className="md:hidden">
          <div className="flex gap-3">
            <div
              onClick={() => router.push("/giocatori")}
              className="card p-4 flex-1 min-w-0 cursor-pointer hover:opacity-90"
            >
              <div className="text-center text-xs text-muted-theme">Giocatori</div>
              <div className="mt-2 text-center text-2xl font-semibold text-base-theme leading-none">
                {renderValue(playersCount)}
              </div>
            </div>

            <div
              onClick={() => router.push("/eventi")}
              className="card p-4 flex-1 min-w-0 cursor-pointer hover:opacity-90"
            >
              <div className="text-center text-xs text-muted-theme">Eventi</div>
              <div className="mt-2 text-center text-2xl font-semibold text-base-theme leading-none">
                {renderValue(upcomingEventsCount)}
              </div>
            </div>

            <div
              onClick={() => router.push("/convocazioni")}
              className="card p-4 flex-1 min-w-0 cursor-pointer hover:opacity-90"
            >
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

        {isStaff && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-base-theme">
              Avvisi importanti
            </h2>

            <div className="mt-3 space-y-2 text-sm">

              {docsExpired !== null && docsExpired > 0 && (
                <div
                  onClick={async () => {
                    if (!docsExpanded) {
                      await loadDocumentsPlayers();
                    }
                    setDocsExpanded(!docsExpanded);
                  }}
                  className="text-red-500 cursor-pointer hover:underline"
                >
                  ⚠️ {docsExpired ?? 0} documento{(docsExpired ?? 0) > 1 ? "i" : ""} scadut{(docsExpired ?? 0) > 1 ? "i" : "o"}
                </div>
              )}

              {docsExpiring !== null && docsExpiring > 0 && (
                <div
                  onClick={async () => {
                    if (!docsExpanded) {
                      await loadDocumentsPlayers();
                    }
                    setDocsExpanded(!docsExpanded);
                  }}
                  className="text-yellow-500 cursor-pointer hover:underline"
                >
                  ⚠️ {docsExpiring ?? 0} documento{(docsExpiring ?? 0) > 1 ? "i" : ""} in scadenza
                </div>
              )}

              {(docsExpired ?? 0) === 0 && (docsExpiring ?? 0) === 0 && (
                <div className="text-muted-theme">
                  Nessun avviso importante al momento
                </div>
              )}

              {docsExpanded && (

                <div className="mt-4 space-y-2">

                  {docsPlayers.map((p) => {

                    const today = new Date();
                    const exp = new Date(p.document_expiry);

                    const diff = (exp.getTime() - today.getTime()) / (1000*60*60*24);

                    let status = "";
                    let color = "";

                    if (diff < 0) {
                      status = "scaduto";
                      color = "text-red-500";
                    } else if (diff < 30) {
                      status = "in scadenza";
                      color = "text-yellow-500";
                    }

                    return (

                      <div
                        key={p.id}
                        onClick={() => router.push("/giocatori/" + p.id)}
                        className="rounded-xl border border-theme bg-panel-theme p-3 cursor-pointer hover:opacity-90"
                      >

                        <div className="flex justify-between">

                          <div className="font-medium text-base-theme">
                            {p.last_name} {p.first_name}
                          </div>

                          <div className={`text-xs ${color}`}>
                            {status}
                          </div>

                        </div>

                        <div className="text-xs text-muted-theme mt-1">
                          {p.document_type ?? "Documento"} • {fmtDateTimeIT(p.document_expiry)}
                        </div>

                      </div>

                    );

                  })}

                </div>

              )}

            </div>
          </div>
        )}

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
