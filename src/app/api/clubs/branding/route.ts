import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

const CLUB_ASSETS_BUCKET = "club-assets";

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function clean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function isAllowedImage(file: FormDataEntryValue | null): file is File {
  return (
    file instanceof File &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type)
  );
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets ?? []).some((bucket) => bucket.name === CLUB_ASSETS_BUCKET);
  if (exists) return;

  await supabaseAdmin.storage.createBucket(CLUB_ASSETS_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
}

async function uploadClubImage(clubId: string, kind: "logo" | "background", file: File) {
  const ext = extensionFor(file);
  const path = `${clubId}/${kind}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(CLUB_ASSETS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from(CLUB_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { data: auth, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const form = await req.formData();
    const clubId = clean(form.get("club_id"));
    const displayName = clean(form.get("display_name"));
    const websiteUrl = clean(form.get("website_url"));
    const logo = form.get("logo");
    const background = form.get("background");

    if (!clubId) {
      return NextResponse.json({ error: "club_id mancante." }, { status: 400 });
    }

    const { data: membership, error: membershipErr } = await supabaseAdmin
      .from("club_members")
      .select("role")
      .eq("user_id", auth.user.id)
      .eq("club_id", clubId)
      .eq("role", "admin")
      .maybeSingle();

    if (membershipErr) return NextResponse.json({ error: membershipErr.message }, { status: 500 });
    if (!membership) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

    if (logo && !isAllowedImage(logo)) {
      return NextResponse.json({ error: "Logo non valido. Usa JPG, PNG o WebP." }, { status: 400 });
    }

    if (background && !isAllowedImage(background)) {
      return NextResponse.json({ error: "Sfondo non valido. Usa JPG, PNG o WebP." }, { status: 400 });
    }

    await ensureBucket();

    const update: Record<string, string | null> = {
      display_name: displayName,
      website_url: websiteUrl,
    };

    if (isAllowedImage(logo)) {
      update.logo_url = await uploadClubImage(clubId, "logo", logo);
    }

    if (isAllowedImage(background)) {
      update.background_url = await uploadClubImage(clubId, "background", background);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("clubs")
      .update(update)
      .eq("id", clubId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true, branding: update }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore imprevisto" },
      { status: 500 }
    );
  }
}
