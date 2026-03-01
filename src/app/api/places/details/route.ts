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
    const placeId = (searchParams.get("placeId") ?? "").trim();

    if (!placeId) {
      return NextResponse.json({ error: "placeId mancante" }, { status: 400 });
    }

    const url =
      "https://maps.googleapis.com/maps/api/place/details/json" +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=place_id,formatted_address,geometry/location,name` +
      `&language=it` +
      `&key=${encodeURIComponent(key)}`;

    const r = await fetch(url, { method: "GET" });
    const data = await r.json().catch(() => null);

    if (!data) {
      return NextResponse.json({ error: "Risposta Google non valida" }, { status: 500 });
    }

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: data.error_message ?? `Google status: ${data.status}` },
        { status: 400 }
      );
    }

    const res = data.result;
    const lat = res?.geometry?.location?.lat;
    const lng = res?.geometry?.location?.lng;

    return NextResponse.json(
      {
        placeId: res?.place_id ?? placeId,
        address: res?.formatted_address ?? res?.name ?? "",
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore details" },
      { status: 500 }
    );
  }
}