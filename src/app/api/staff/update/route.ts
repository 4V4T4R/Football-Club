import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { member_id, first_name, last_name, birth_date, title } = body;

    if (!member_id || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Dati mancanti (member_id, nome, cognome)." },
        { status: 400 }
      );
    }

    const { data: cm, error: cmGetErr } = await supabaseAdmin
      .from("club_members")
      .select("id, user_id, club_id, role")
      .eq("id", member_id)
      .maybeSingle();

    if (cmGetErr) return NextResponse.json({ error: cmGetErr.message }, { status: 500 });
    if (!cm) return NextResponse.json({ error: "Membro non trovato." }, { status: 404 });

    if (cm.role !== "staff") {
      return NextResponse.json({ error: "Puoi modificare solo membri staff." }, { status: 400 });
    }

    const { error: uErr } = await supabaseAdmin
      .from("users")
      .update({ first_name, last_name })
      .eq("id", cm.user_id);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    const { error: updErr } = await supabaseAdmin
      .from("club_members")
      .update({
        birth_date: birth_date ?? null,
        title: title ?? null,
      })
      .eq("id", member_id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}