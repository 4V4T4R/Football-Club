import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const player_id = body.player_id;
    const email = body.email;

    if (!player_id || !email) {
      return NextResponse.json(
        { error: "player_id ed email sono obbligatori." },
        { status: 400 }
      );
    }

    // 1️⃣ recupera giocatore
    const { data: player, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("id, first_name, last_name, club_id, user_id")
      .eq("id", player_id)
      .single();

    if (playerErr || !player) {
      return NextResponse.json(
        { error: "Giocatore non trovato." },
        { status: 404 }
      );
    }

    // se il giocatore ha già un account
    if (player.user_id) {
      return NextResponse.json(
        { error: "Questo giocatore ha già un account." },
        { status: 400 }
      );
    }

    // 2️⃣ prepara redirect
    const redirectTo = new URL(
      "/auth/callback?next=/imposta-password",
      process.env.NEXT_PUBLIC_SITE_URL!
    ).toString();

    // 3️⃣ invita utente
    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim(), {
        redirectTo,
        data: {
          first_name: player.first_name,
          last_name: player.last_name,
          club_id: player.club_id,
        },
      });

    if (inviteErr) {
      return NextResponse.json(
        { error: inviteErr.message },
        { status: 500 }
      );
    }

    const userId = invited?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Impossibile ottenere userId." },
        { status: 500 }
      );
    }

    // 4️⃣ aggiorna tabella users
    const { error: userUpErr } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: userId,
          first_name: player.first_name,
          last_name: player.last_name,
          email: email.trim(),
        },
        { onConflict: "id" }
      );

    if (userUpErr) {
      return NextResponse.json(
        { error: userUpErr.message },
        { status: 500 }
      );
    }

    // 5️⃣ collega player → user
    const { error: updErr } = await supabaseAdmin
      .from("players")
      .update({
        user_id: userId,
      })
      .eq("id", player_id);

    if (updErr) {
      return NextResponse.json(
        { error: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}