import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

type Audience = "club" | "staff" | "players" | "player";
type NotificationPrefs = {
  enabled: boolean;
  event_created: boolean;
  convocation: boolean;
  event_changed: boolean;
  document_expiry: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  event_created: true,
  convocation: true,
  event_changed: true,
  document_expiry: true,
};

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "staff";
}

async function getContext(req: Request, clubId: string) {
  const token = getBearer(req);
  if (!token) return { error: "Missing token", status: 401 as const };

  const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !auth?.user) return { error: "Invalid session", status: 401 as const };

  const userId = auth.user.id;

  const { data: member, error: memberErr } = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberErr) return { error: memberErr.message, status: 500 as const };

  const { data: player, error: playerErr } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (playerErr) return { error: playerErr.message, status: 500 as const };
  if (!member && !player) return { error: "Non autorizzato.", status: 403 as const };

  return {
    userId,
    role: (member?.role ?? null) as string | null,
    playerId: (player?.id ?? null) as string | null,
  };
}

function canSeeNotification(
  n: { audience: Audience; player_id: string | null },
  ctx: { role: string | null; playerId: string | null }
) {
  if (n.audience === "club") return true;
  if (n.audience === "staff") return isStaffRole(ctx.role);
  if (n.audience === "players") return Boolean(ctx.playerId);
  if (n.audience === "player") return Boolean(ctx.playerId && n.player_id === ctx.playerId);
  return false;
}

function notificationAllowedByPrefs(type: string, prefs: NotificationPrefs) {
  if (!prefs.enabled) return false;
  if (type === "event_created") return prefs.event_created;
  if (type === "convocation" || type === "convocation_response") return prefs.convocation;
  if (type === "event_updated" || type === "event_deleted") return prefs.event_changed;
  if (type === "document_expiry") return prefs.document_expiry;
  return true;
}

async function canPlayerNotifyStaffAboutResponse(
  ctx: { playerId: string | null },
  payload: { club_id: string; type: string; audience: string; entity_type?: string; entity_id?: string }
) {
  if (!ctx.playerId) return false;
  if (payload.type !== "convocation_response") return false;
  if (payload.audience !== "staff") return false;
  if (payload.entity_type !== "event") return false;
  if (!payload.entity_id) return false;

  const { data: target, error } = await supabaseAdmin
    .from("event_targets")
    .select("event_id, player_id, events!inner(club_id)")
    .eq("event_id", payload.entity_id)
    .eq("player_id", ctx.playerId)
    .eq("target_type", "player")
    .maybeSingle();

  if (error || !target) return false;

  const eventClubId = (target as any).events?.club_id ?? null;
  return eventClubId === payload.club_id;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const clubId = url.searchParams.get("club_id");
    if (!clubId) return NextResponse.json({ error: "club_id mancante." }, { status: 400 });

    const ctx = await getContext(req, clubId);
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, club_id, title, body, type, audience, player_id, entity_type, entity_id, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: prefsData, error: prefsErr } = await supabaseAdmin
      .from("notification_preferences")
      .select("enabled, event_created, convocation, event_changed, document_expiry")
      .eq("user_id", ctx.userId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (prefsErr) return NextResponse.json({ error: prefsErr.message }, { status: 500 });

    const prefs = (prefsData ?? DEFAULT_PREFS) as NotificationPrefs;
    const visible = ((data ?? []) as any[]).filter(
      (n) => canSeeNotification(n, ctx) && notificationAllowedByPrefs(n.type, prefs)
    );
    const ids = visible.map((n) => n.id);

    const readSet = new Set<string>();
    if (ids.length > 0) {
      const { data: reads, error: readErr } = await supabaseAdmin
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", ctx.userId)
        .in("notification_id", ids);

      if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
      for (const row of (reads ?? []) as any[]) readSet.add(row.notification_id);
    }

    const notifications = visible.map((n) => ({
      ...n,
      read: readSet.has(n.id),
    }));

    return NextResponse.json({
      notifications,
      unread_count: notifications.filter((n) => !n.read).length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const {
      club_id,
      title,
      body,
      type = "info",
      audience = "club",
      player_id,
      player_ids,
      entity_type,
      entity_id,
    } = await req.json();

    if (!club_id || !title?.trim()) {
      return NextResponse.json({ error: "club_id e titolo sono obbligatori." }, { status: 400 });
    }

    if (!["club", "staff", "players", "player"].includes(audience)) {
      return NextResponse.json({ error: "Destinatari non validi." }, { status: 400 });
    }

    const ctx = await getContext(req, club_id);
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    const playerCanNotifyStaff = await canPlayerNotifyStaffAboutResponse(ctx, {
      club_id,
      type,
      audience,
      entity_type,
      entity_id,
    });

    if (!isStaffRole(ctx.role) && !playerCanNotifyStaff) {
      return NextResponse.json({ error: "Solo staff/admin può creare notifiche." }, { status: 403 });
    }

    let rows: any[] = [];
    if (audience === "player") {
      const ids = Array.isArray(player_ids) && player_ids.length > 0 ? player_ids : [player_id].filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: "Seleziona almeno un giocatore." }, { status: 400 });
      }

      const { data: players, error: playersErr } = await supabaseAdmin
        .from("players")
        .select("id")
        .eq("club_id", club_id)
        .in("id", ids);

      if (playersErr) return NextResponse.json({ error: playersErr.message }, { status: 500 });
      const validIds = new Set(((players ?? []) as any[]).map((p) => p.id));

      rows = ids
        .filter((id: string) => validIds.has(id))
        .map((id: string) => ({
          club_id,
          title: title.trim(),
          body: body?.trim() ? body.trim() : null,
          type,
          audience,
          player_id: id,
          entity_type: entity_type ?? null,
          entity_id: entity_id ?? null,
          created_by: ctx.userId,
        }));

      if (rows.length === 0) {
        return NextResponse.json({ error: "Giocatori non validi per questa squadra." }, { status: 400 });
      }
    } else {
      rows = [
        {
          club_id,
          title: title.trim(),
          body: body?.trim() ? body.trim() : null,
          type,
          audience,
          player_id: null,
          entity_type: entity_type ?? null,
          entity_id: entity_id ?? null,
          created_by: ctx.userId,
        },
      ];
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(rows)
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, notifications: data ?? [] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}
