import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { first_name, last_name, email, club_id, birth_date, title } = body;
    const cleanEmail = String(email).trim().toLowerCase();

    if (!club_id || !first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "Dati mancanti (club_id, nome, cognome, email)." },
        { status: 400 }
      );
    }

    const { data: existingUser, error: existingErr } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    let userId = existingUser?.id ?? null;

    if (!userId) {
      const redirectTo = new URL(
        "/auth/callback?next=/imposta-password",
        process.env.NEXT_PUBLIC_SITE_URL!
      ).toString();

      const { data: invited, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo,
          data: { first_name, last_name, club_id },
        });

      if (inviteErr) {
        return NextResponse.json({ error: inviteErr.message }, { status: 500 });
      }

      userId = invited?.user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Impossibile ottenere userId dopo invito." },
        { status: 500 }
      );
    }

    const { error: userUpErr } = await supabaseAdmin.from("users").upsert(
      {
        id: userId,
        first_name: existingUser?.first_name ?? first_name,
        last_name: existingUser?.last_name ?? last_name,
        email: cleanEmail,
      },
      { onConflict: "id" }
    );

    if (userUpErr) {
      return NextResponse.json({ error: userUpErr.message }, { status: 500 });
    }

    const { error: cmErr } = await supabaseAdmin.from("club_members").insert({
      user_id: userId,
      club_id,
      role: "staff",
      birth_date: birth_date ?? null,
      title: title ?? null,
    });

    if (cmErr) {
      if (cmErr.code === "23505") {
        return NextResponse.json(
          { error: "Questo utente è già presente nello staff di questa squadra." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: cmErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reused_user: Boolean(existingUser) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}
