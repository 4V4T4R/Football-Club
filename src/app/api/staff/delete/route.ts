import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { member_id } = body;

    if (!member_id) {
      return NextResponse.json({ error: "member_id mancante." }, { status: 400 });
    }

    const { data: cm, error: cmGetErr } = await supabaseAdmin
      .from("club_members")
      .select("id, role")
      .eq("id", member_id)
      .maybeSingle();

    if (cmGetErr) return NextResponse.json({ error: cmGetErr.message }, { status: 500 });
    if (!cm) return NextResponse.json({ error: "Membro non trovato." }, { status: 404 });

    if (cm.role !== "staff") {
      return NextResponse.json({ error: "Puoi eliminare solo membri staff." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("club_members")
      .delete()
      .eq("id", member_id);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}