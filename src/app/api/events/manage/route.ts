import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function typeLabel(type: string) {
  if (type === "training") return "Allenamento";
  if (type === "match") return "Partita";
  if (type === "meeting") return "Riunione";
  return "Evento";
}

async function getRequester(req: Request) {
  const token = getBearer(req);
  if (!token) return { error: "Missing token", status: 401 as const };

  const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !auth?.user) return { error: "Invalid session", status: 401 as const };

  return { userId: auth.user.id };
}

async function assertStaff(userId: string, clubId: string) {
  const { data: member, error } = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) return { error: error.message, status: 500 as const };
  if (!member || !["admin", "staff"].includes(member.role)) {
    return { error: "Non autorizzato.", status: 403 as const };
  }

  return {};
}

async function getInvitedPlayerIds(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("event_targets")
    .select("player_id")
    .eq("event_id", eventId)
    .eq("target_type", "player");

  if (error) throw new Error(error.message);
  return Array.from(new Set(((data ?? []) as any[]).map((row) => row.player_id).filter(Boolean)));
}

async function notifyPlayers(params: {
  clubId: string;
  playerIds: string[];
  title: string;
  body: string;
  type: "event_updated" | "event_deleted";
  eventId: string;
  createdBy: string;
}) {
  if (params.playerIds.length === 0) return;

  const rows = params.playerIds.map((playerId) => ({
    club_id: params.clubId,
    title: params.title,
    body: params.body,
    type: params.type,
    audience: "player",
    player_id: playerId,
    entity_type: "event",
    entity_id: params.eventId,
    created_by: params.createdBy,
  }));

  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (error) throw new Error(error.message);
}

export async function POST(req: Request) {
  try {
    const auth = await getRequester(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const action = body.action as "update" | "delete";
    const eventId = body.event_id as string | undefined;

    if (!eventId || !["update", "delete"].includes(action)) {
      return NextResponse.json({ error: "Azione o evento non valido." }, { status: 400 });
    }

    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .select("id, club_id, title, type, start_at")
      .eq("id", eventId)
      .maybeSingle();

    if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 });
    if (!event) return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });

    const staff = await assertStaff(auth.userId, event.club_id);
    if ("error" in staff) return NextResponse.json({ error: staff.error }, { status: staff.status });

    const invitedPlayerIds = await getInvitedPlayerIds(eventId);

    if (action === "delete") {
      await notifyPlayers({
        clubId: event.club_id,
        playerIds: invitedPlayerIds,
        title: "Evento cancellato",
        body: `${typeLabel(event.type)} cancellato: ${event.title}`,
        type: "event_deleted",
        eventId,
        createdBy: auth.userId,
      });

      const { error: responsesErr } = await supabaseAdmin
        .from("event_responses")
        .delete()
        .eq("event_id", eventId);

      if (responsesErr) return NextResponse.json({ error: responsesErr.message }, { status: 500 });

      const { error: targetsErr } = await supabaseAdmin
        .from("event_targets")
        .delete()
        .eq("event_id", eventId);

      if (targetsErr) return NextResponse.json({ error: targetsErr.message }, { status: 500 });

      const { error: deleteErr } = await supabaseAdmin
        .from("events")
        .delete()
        .eq("id", eventId);

      if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

      return NextResponse.json({ success: true, notified: invitedPlayerIds.length });
    }

    const title = String(body.title ?? "").trim();
    const type = String(body.type ?? "");
    const startAt = String(body.start_at ?? "");

    if (!title || !["training", "match", "meeting"].includes(type) || !startAt) {
      return NextResponse.json({ error: "Titolo, tipo e data sono obbligatori." }, { status: 400 });
    }

    const update = {
      title,
      type,
      start_at: new Date(startAt).toISOString(),
      location: body.location ? String(body.location) : null,
      location_address: body.location_address ? String(body.location_address) : null,
      location_place_id: body.location_place_id ? String(body.location_place_id) : null,
      location_lat: typeof body.location_lat === "number" ? body.location_lat : null,
      location_lng: typeof body.location_lng === "number" ? body.location_lng : null,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("events")
      .update(update)
      .eq("id", eventId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await notifyPlayers({
      clubId: event.club_id,
      playerIds: invitedPlayerIds,
      title: "Evento modificato",
      body: `${typeLabel(type)} aggiornato: ${title}`,
      type: "event_updated",
      eventId,
      createdBy: auth.userId,
    });

    return NextResponse.json({ success: true, notified: invitedPlayerIds.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}
