import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { first_name, last_name, email, club_id, birth_date, title } = body;

    if (!club_id || !first_name || !last_name || !email) {
      return NextResponse.json(
        { error: "Dati mancanti (club_id, nome, cognome, email)." },
        { status: 400 }
      );
    }

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

    const userId = invited?.user?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: "Impossibile ottenere userId dopo invito." },
        { status: 500 }
      );
    }

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

    const { error: cmErr } = await supabaseAdmin.from("club_members").insert({
      user_id: userId,
      club_id,
      role: "staff",
      birth_date: birth_date ?? null,
      title: title ?? null,
    });

    if (cmErr) {
      return NextResponse.json({ error: cmErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}