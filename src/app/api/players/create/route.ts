import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      first_name,
      last_name,
      email,
      club_id,
      birth_date,
      shirt_number,
    } = body;

    if (!club_id || !first_name || !last_name || !birth_date) {
      return NextResponse.json(
        { error: "Dati mancanti (club_id, nome, cognome, data di nascita)." },
        { status: 400 }
      );
    }

    // 1) Crea utente Auth + invia email (invite)
    // Se SMTP è configurato, Supabase invia una mail per impostare la password.
    let userId: string | null = null;

    if (email && String(email).trim()) {
      const redirectTo = new URL(
        "/auth/callback?next=/imposta-password",
        process.env.NEXT_PUBLIC_SITE_URL!
      ).toString();

      const { data: invited, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(String(email).trim(), {
          redirectTo,
          data: { first_name, last_name, club_id },
        });

      if (inviteErr) {
        return NextResponse.json({ error: inviteErr.message }, { status: 500 });
      }

      userId = invited?.user?.id ?? null;

      if (!userId) {
        return NextResponse.json(
          { error: "Impossibile ottenere userId dopo invito." },
          { status: 500 }
        );
      }

      // 2) public.users (UPSERT, così non esplode su users_pkey)
      const { error: userUpErr } = await supabaseAdmin.from("users").upsert(
        {
          id: userId,
          first_name,
          last_name,
          email: String(email).trim(),
        },
        { onConflict: "id" }
      );

      if (userUpErr) {
        return NextResponse.json({ error: userUpErr.message }, { status: 500 });
      }
      console.log("NEXT_PUBLIC_SITE_URL =", process.env.NEXT_PUBLIC_SITE_URL);
      console.log("redirectTo =", redirectTo);
    }

    // 3) players (se userId è null => player “senza login”)
    // Se preferisci OBBLIGARE sempre l’email, dimmelo e lo rendiamo required.
    const { error: playerErr } = await supabaseAdmin.from("players").insert({
      user_id: userId, // può essere null
      club_id,
      first_name,
      last_name,
      birth_date, // IMPORTANT
      shirt_number: shirt_number ?? null,
      active: true,
    });

    if (playerErr) {
      return NextResponse.json({ error: playerErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}