import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storagePathFromPublicUrl } from "@/lib/storagePath";
import { NextResponse } from "next/server";

const AVATAR_BUCKET = "avatars";

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

async function removeAvatar(url: string | null | undefined) {
  const path = storagePathFromPublicUrl(url, AVATAR_BUCKET);
  if (!path) return;

  await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([path]);
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { member_id, club_id, avatar_url } = await req.json();

    if (!avatar_url) {
      return NextResponse.json({ error: "avatar_url mancante." }, { status: 400 });
    }

    if (!storagePathFromPublicUrl(avatar_url, AVATAR_BUCKET)) {
      return NextResponse.json({ error: "Avatar non valido." }, { status: 400 });
    }

    let targetQuery = supabaseAdmin
      .from("club_members")
      .select("id, user_id, club_id, role, avatar_url");

    if (member_id) {
      targetQuery = targetQuery.eq("id", member_id);
    } else if (club_id) {
      targetQuery = targetQuery.eq("club_id", club_id).eq("user_id", auth.user.id);
    } else {
      return NextResponse.json({ error: "member_id o club_id mancante." }, { status: 400 });
    }

    const { data: target, error: targetErr } = await targetQuery.maybeSingle();

    if (targetErr) return NextResponse.json({ error: targetErr.message }, { status: 500 });
    if (!target) return NextResponse.json({ error: "Membro non trovato." }, { status: 404 });

    const { data: requester, error: requesterErr } = await supabaseAdmin
      .from("club_members")
      .select("role")
      .eq("user_id", auth.user.id)
      .eq("club_id", target.club_id)
      .maybeSingle();

    if (requesterErr) return NextResponse.json({ error: requesterErr.message }, { status: 500 });
    if (!requester) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

    const isSelf = target.user_id === auth.user.id;
    const isAdminEditingStaff = requester.role === "admin" && target.role === "staff";

    if (!isSelf && !isAdminEditingStaff) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    const oldAvatarUrl = target.avatar_url ?? null;

    const { error: updateErr } = await supabaseAdmin
      .from("club_members")
      .update({ avatar_url })
      .eq("id", target.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    if (oldAvatarUrl && oldAvatarUrl !== avatar_url) {
      await removeAvatar(oldAvatarUrl);
    }

    return NextResponse.json({ success: true, avatar_url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}
