import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NominatimPlace = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
};

function mapNominatimPlace(place: NominatimPlace) {
  const description = place.display_name ?? place.name ?? "";
  const [mainText, ...rest] = description.split(",").map((part) => part.trim()).filter(Boolean);

  return {
    place_id: `osm:${place.osm_type ?? "place"}:${place.osm_id ?? place.place_id ?? ""}`,
    description,
    structured_formatting: {
      main_text: mainText || description,
      secondary_text: rest.join(", "),
    },
    formatted_address: description,
    lat: place.lat ? Number(place.lat) : null,
    lng: place.lon ? Number(place.lon) : null,
    source: "osm",
  };
}

async function fallbackAutocomplete(q: string) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?q=${encodeURIComponent(q)}` +
    `&format=jsonv2` +
    `&addressdetails=1` +
    `&limit=6` +
    `&countrycodes=it`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      "Accept-Language": "it",
      "User-Agent": "football-club-local/1.0",
    },
  });

  if (!r.ok) return [];

  const data = (await r.json().catch(() => [])) as NominatimPlace[];
  return data
    .map(mapNominatimPlace)
    .filter((place) => place.description && Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ predictions: [] }, { status: 200 });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      const predictions = await fallbackAutocomplete(q);
      return NextResponse.json({ predictions, provider: "osm" }, { status: 200 });
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
      const predictions = await fallbackAutocomplete(q);
      if (predictions.length > 0) {
        return NextResponse.json({ predictions, provider: "osm" }, { status: 200 });
      }

      return NextResponse.json({ predictions: [] }, { status: 200 });
    }

    return NextResponse.json({ predictions: data.predictions ?? [], provider: "google" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore autocomplete" },
      { status: 500 }
    );
  }
}
