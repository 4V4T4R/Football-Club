import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { player_id } = await req.json();

    if (!player_id) {
      return NextResponse.json({ error: "player_id mancante" }, { status: 400 });
    }

    // 1️⃣ recupera user_id
    const { data: player } = await supabaseAdmin
      .from("players")
      .select("user_id")
      .eq("id", player_id)
      .single();

    const userId = player?.user_id ?? null;

    // 2️⃣ elimina player
    await supabaseAdmin
      .from("players")
      .delete()
      .eq("id", player_id);

    // 3️⃣ elimina user profile
    if (userId) {
      await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId);

      // 4️⃣ elimina auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}