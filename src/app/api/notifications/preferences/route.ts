import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

const DEFAULT_PREFS = {
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

async function getUserId(req: Request) {
  const token = getBearer(req);
  if (!token) return { error: "Missing token", status: 401 as const };

  const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !auth?.user) return { error: "Invalid session", status: 401 as const };

  return { userId: auth.user.id };
}

async function assertClubAccess(userId: string, clubId: string) {
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("club_members")
    .select("club_id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberErr) return { error: memberErr.message, status: 500 as const };
  if (member) return {};

  const { data: player, error: playerErr } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (playerErr) return { error: playerErr.message, status: 500 as const };
  if (!player) return { error: "Non autorizzato.", status: 403 as const };

  return {};
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const clubId = url.searchParams.get("club_id");
    if (!clubId) return NextResponse.json({ error: "club_id mancante." }, { status: 400 });

    const auth = await getUserId(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const access = await assertClubAccess(auth.userId, clubId);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .select("enabled, event_created, convocation, event_changed, document_expiry")
      .eq("user_id", auth.userId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ preferences: data ?? DEFAULT_PREFS });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clubId = body.club_id;
    if (!clubId) return NextResponse.json({ error: "club_id mancante." }, { status: 400 });

    const auth = await getUserId(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const access = await assertClubAccess(auth.userId, clubId);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const preferences = {
      enabled: Boolean(body.enabled),
      event_created: Boolean(body.event_created),
      convocation: Boolean(body.convocation),
      event_changed: Boolean(body.event_changed),
      document_expiry: Boolean(body.document_expiry),
    };

    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert(
        {
          user_id: auth.userId,
          club_id: clubId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,club_id" }
      )
      .select("enabled, event_created, convocation, event_changed, document_expiry")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, preferences: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}
