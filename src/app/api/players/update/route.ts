import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const {
      player_id,
      first_name,
      last_name,
      birth_date,
      shirt_number,
      role,
      phone,
      matricola
    } = await req.json();

    const { data: player } = await supabaseAdmin
      .from("players")
      .select("user_id")
      .eq("id", player_id)
      .single();

    const userId = player?.user_id;

    // update players
    await supabaseAdmin
      .from("players")
      .update({
        first_name,
        last_name,
        birth_date,
        shirt_number,
        role,
        phone,
        matricola
      })
      .eq("id", player_id);

    // update users profile
    if (userId) {
      await supabaseAdmin
        .from("users")
        .update({
          first_name,
          last_name
        })
        .eq("id", userId);

      // update auth metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          first_name,
          last_name
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}