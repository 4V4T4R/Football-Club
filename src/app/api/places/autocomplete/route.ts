import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_API_KEY mancante in .env.local" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ predictions: [] }, { status: 200 });
    }

    // Facoltativo: limita ai risultati in Italia (puoi rimuoverlo)
    const url =
      "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
      `?input=${encodeURIComponent(q)}` +
      `&language=it` +
      `&components=country:it` +
      `&types=geocode|establishment` +
      `&key=${encodeURIComponent(key)}`;

    const r = await fetch(url, { method: "GET" });
    const data = await r.json().catch(() => null);

    if (!data) {
      return NextResponse.json({ error: "Risposta Google non valida" }, { status: 500 });
    }

    // Google può rispondere con status diversi da OK (es: ZERO_RESULTS, OVER_QUERY_LIMIT, REQUEST_DENIED)
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: data.error_message ?? `Google status: ${data.status}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ predictions: data.predictions ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore autocomplete" },
      { status: 500 }
    );
  }
}