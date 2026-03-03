// =========================================
// 2) API STAFF - LIST
// File: src/app/api/staff/list/route.ts
// =========================================

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function GET(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(token);
    if (uErr || !u?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const uid = u.user.id;

    // club_id: prima club_members, poi players
    const { data: meMember } = await supabaseAdmin
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", uid)
      .maybeSingle();

    let clubId: string | null = meMember?.club_id ?? null;

    if (!clubId) {
      const { data: mePlayer } = await supabaseAdmin
        .from("players")
        .select("club_id")
        .eq("user_id", uid)
        .maybeSingle();
      clubId = mePlayer?.club_id ?? null;
    }

    if (!clubId) return NextResponse.json({ error: "Club non trovato" }, { status: 400 });

    // mostra SOLO role='staff' (admin escluso)
    const { data: staffRows, error: sErr } = await supabaseAdmin
      .from("club_members")
      .select("user_id, birth_date, title, created_at")
      .eq("club_id", clubId)
      .eq("role", "staff")
      .order("created_at", { ascending: true });

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const ids = (staffRows ?? []).map((r: any) => r.user_id).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ club_id: clubId, staff: [], me_role: meMember?.role ?? null }, { status: 200 });
    }

    const { data: users, error: usErr } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name")
      .in("id", ids);

    if (usErr) return NextResponse.json({ error: usErr.message }, { status: 500 });

    const map = new Map((users ?? []).map((x: any) => [x.id, x]));

    const out = (staffRows ?? []).map((r: any) => {
      const urow = map.get(r.user_id) ?? {};
      return {
        user_id: r.user_id,
        first_name: urow.first_name ?? "",
        last_name: urow.last_name ?? "",
        birth_date: r.birth_date ?? null,
        title: r.title ?? null,
      };
    });

    return NextResponse.json(
      { club_id: clubId, staff: out, me_role: meMember?.role ?? null },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}