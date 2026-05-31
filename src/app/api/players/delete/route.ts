import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storagePathFromPublicUrl } from "@/lib/storagePath";
import { NextResponse } from "next/server";

const AVATAR_BUCKET = "avatars";

async function removeAvatar(url: string | null | undefined) {
  const path = storagePathFromPublicUrl(url, AVATAR_BUCKET);
  if (!path) return;

  await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([path]);
}

export async function POST(req: Request) {
  try {
    const { player_id } = await req.json();

    if (!player_id) {
      return NextResponse.json({ error: "player_id mancante" }, { status: 400 });
    }

    // 1) recupera user_id e avatar
    const { data: player } = await supabaseAdmin
      .from("players")
      .select("user_id, avatar_url")
      .eq("id", player_id)
      .single();

    const userId = player?.user_id ?? null;
    const avatarUrl = player?.avatar_url ?? null;

    // 2) elimina player
    await supabaseAdmin
      .from("players")
      .delete()
      .eq("id", player_id);

    // 3) elimina avatar storage
    await removeAvatar(avatarUrl);

    // 4) elimina user profile
    if (userId) {
      await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId);

      // 5) elimina auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
