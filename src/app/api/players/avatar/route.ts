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

    const { player_id, avatar_url } = await req.json();

    if (!player_id || !avatar_url) {
      return NextResponse.json(
        { error: "Dati mancanti (player_id, avatar_url)." },
        { status: 400 }
      );
    }

    if (!storagePathFromPublicUrl(avatar_url, AVATAR_BUCKET)) {
      return NextResponse.json({ error: "Avatar non valido." }, { status: 400 });
    }

    const { data: player, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("id, club_id, avatar_url")
      .eq("id", player_id)
      .maybeSingle();

    if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 });
    if (!player) return NextResponse.json({ error: "Giocatore non trovato." }, { status: 404 });

    const { data: membership, error: membershipErr } = await supabaseAdmin
      .from("club_members")
      .select("role")
      .eq("user_id", auth.user.id)
      .eq("club_id", player.club_id)
      .in("role", ["admin", "staff"])
      .maybeSingle();

    if (membershipErr) {
      return NextResponse.json({ error: membershipErr.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
    }

    const oldAvatarUrl = player.avatar_url ?? null;

    const { error: updateErr } = await supabaseAdmin
      .from("players")
      .update({ avatar_url })
      .eq("id", player.id);

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
