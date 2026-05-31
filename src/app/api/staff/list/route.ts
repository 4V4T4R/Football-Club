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
    const requestedClubId = new URL(req.url).searchParams.get("club_id");

    const { data: membershipRows, error: memberErr } = await supabaseAdmin
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });

    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

    const { data: playerRows, error: playerErr } = await supabaseAdmin
      .from("players")
      .select("club_id")
      .eq("user_id", uid);

    if (playerErr) return NextResponse.json({ error: playerErr.message }, { status: 500 });

    const memberships = (membershipRows ?? []) as Array<{ club_id: string; role: string }>;
    const playerClubs = (playerRows ?? []) as Array<{ club_id: string }>;
    const allowedClubIds = new Set([
      ...memberships.map((m) => m.club_id),
      ...playerClubs.map((p) => p.club_id),
    ]);

    if (requestedClubId && !allowedClubIds.has(requestedClubId)) {
      return NextResponse.json({ error: "Accesso non autorizzato al club." }, { status: 403 });
    }

    const clubId: string | null =
      requestedClubId ?? memberships[0]?.club_id ?? playerClubs[0]?.club_id ?? null;

    if (!clubId) return NextResponse.json({ error: "Club non trovato" }, { status: 400 });

    const meMember = memberships.find((m) => m.club_id === clubId) ?? null;

    // Staff visibile: staff sempre, admin solo se hanno una qualifica operativa.
    const { data: staffRows, error: sErr } = await supabaseAdmin
      .from("club_members")
      .select("id, user_id, club_id, role, birth_date, title, created_at")
      .eq("club_id", clubId)
      .in("role", ["staff", "admin"])
      .order("created_at", { ascending: true });

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const visibleRows = ((staffRows ?? []) as any[]).filter((row) => {
      const hasTitle = Boolean((row.title ?? "").trim());
      return row.role === "staff" || (row.role === "admin" && hasTitle);
    });

    const ids = visibleRows.map((r: any) => r.user_id).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ club_id: clubId, staff: [], me_role: meMember?.role ?? null }, { status: 200 });
    }

    const { data: users, error: usErr } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name")
      .in("id", ids);

    if (usErr) return NextResponse.json({ error: usErr.message }, { status: 500 });

    const map = new Map((users ?? []).map((x: any) => [x.id, x]));

    const out = visibleRows.map((r: any) => {
      const urow = map.get(r.user_id) ?? {};
      return {
        id: r.id,
        user_id: r.user_id,
        club_id: r.club_id,
        role: r.role,
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
