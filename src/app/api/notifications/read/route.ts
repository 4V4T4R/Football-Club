import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { notification_id, notification_ids } = await req.json();
    const ids = Array.isArray(notification_ids)
      ? notification_ids
      : notification_id
        ? [notification_id]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "Nessuna notifica selezionata." }, { status: 400 });
    }

    const rows = ids.map((id: string) => ({
      notification_id: id,
      user_id: auth.user.id,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Errore imprevisto" }, { status: 500 });
  }
}
