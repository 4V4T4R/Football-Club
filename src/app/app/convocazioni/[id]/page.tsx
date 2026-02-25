"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  location: string | null;
};

function fmtDateTimeIT(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function ConvocazioneDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [status, setStatus] = useState<"yes" | "no" | null>(null);
  const [reason, setReason] = useState("");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function load() {
    setLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    // trova player
    const { data: player, error: plErr } = await supabase
      .from("players")
      .select("id, club_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (plErr) {
      setError(plErr.message);
      setLoading(false);
      return;
    }
    if (!player?.id) {
      setError("Giocatore non trovato.");
      setLoading(false);
      return;
    }

    // verifica convocazione (deve esistere in event_targets)
    const { data: target, error: tgErr } = await supabase
      .from("event_targets")
      .select("id")
      .eq("event_id", eventId)
      .eq("player_id", player.id)
      .eq("target_type", "player")
      .maybeSingle();

    if (tgErr) {
      setError(tgErr.message);
      setLoading(false);
      return;
    }

    if (!target) {
      setError("Non sei convocato per questo evento.");
      setLoading(false);
      return;
    }

    // carica evento
    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select("id, title, start_at, location")
      .eq("id", eventId)
      .single();

    if (evErr) {
      setError(evErr.message);
      setLoading(false);
      return;
    }

    setEvent(evData);

    // carica eventuale risposta (status/reason/allegato)
    const { data: resp, error: rsErr } = await supabase
      .from("event_responses")
      .select("status, reason, attachment_url")
      .eq("event_id", eventId)
      .eq("player_id", player.id)
      .maybeSingle();

    if (rsErr) {
      setError(rsErr.message);
      setLoading(false);
      return;
    }

    if (resp) {
      setStatus((resp.status as any) ?? null);
      setReason(resp.reason ?? "");
      setAttachmentPath(resp.attachment_url ?? null);
    } else {
      setStatus(null);
      setReason("");
      setAttachmentPath(null);
    }

    setLoading(false);
  }

  async function saveResponse(newStatus: "yes" | "no") {
    setSaving(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setSaving(false);
      return;
    }

    const { data: player, error: plErr } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (plErr) {
      setError(plErr.message);
      setSaving(false);
      return;
    }
    if (!player?.id) {
      setError("Giocatore non trovato.");
      setSaving(false);
      return;
    }

    const { error: upErr } = await supabase.from("event_responses").upsert(
      {
        event_id: eventId,
        player_id: player.id,
        status: newStatus,
        reason: newStatus === "no" ? (reason.trim() || null) : null,
        attachment_url: newStatus === "no" ? (attachmentPath ?? null) : null,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "event_id,player_id" }
    );

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    setStatus(newStatus);
    setSaving(false);
  }

  async function uploadAttachment() {
    if (!file) return;

    setUploading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setUploading(false);
      return;
    }

    // player + club
    const { data: player, error: plErr } = await supabase
      .from("players")
      .select("id, club_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (plErr) {
      setError(plErr.message);
      setUploading(false);
      return;
    }
    if (!player?.id || !player?.club_id) {
      setError("Giocatore non trovato.");
      setUploading(false);
      return;
    }

    // path: club_id/event_id/player_id/<timestamp>_<filename>
    const cleanName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${player.club_id}/${eventId}/${player.id}/${Date.now()}_${cleanName}`;

    const { error: upErr } = await supabase.storage
      .from("event-attachments")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    // salva path in event_responses (status no se stai allegando)
    const { error: dbErr } = await supabase.from("event_responses").upsert(
      {
        event_id: eventId,
        player_id: player.id,
        status: status ?? "no",
        reason: (status ?? "no") === "no" ? (reason.trim() || null) : null,
        attachment_url: path,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "event_id,player_id" }
    );

    if (dbErr) {
      setError(dbErr.message);
      setUploading(false);
      return;
    }

    setAttachmentPath(path);
    setFile(null);
    setUploading(false);
  }

  async function openAttachment() {
    if (!attachmentPath) return;

    setError(null);

    const { data, error } = await supabase.storage
      .from("event-attachments")
      .createSignedUrl(attachmentPath, 60);

    if (error || !data?.signedUrl) {
      setError(error?.message ?? "Impossibile aprire l'allegato.");
      return;
    }

    setSignedUrl(data.signedUrl);
  }

  if (loading) return <div className="card p-8">Caricamento…</div>;
  if (!event) return <div className="card p-8">{error ?? "Evento non trovato."}</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">{event.title}</h1>
        <p className="mt-2 text-muted-theme">
          {fmtDateTimeIT(event.start_at)} {event.location ? "• " + event.location : ""}
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-base-theme">La tua risposta</h2>

        <div className="flex gap-4">
          <button
            onClick={() => saveResponse("yes")}
            disabled={saving || uploading}
            className="rounded-md border border-theme bg-panel-theme px-4 py-2"
            style={{ outline: status === "yes" ? "2px solid #22c55e" : "none" }}
          >
            ✅ Presente
          </button>

          <button
            onClick={() => saveResponse("no")}
            disabled={saving || uploading}
            className="rounded-md border border-theme bg-panel-theme px-4 py-2"
            style={{ outline: status === "no" ? "2px solid #ef4444" : "none" }}
          >
            ❌ Assente
          </button>
        </div>

        {status === "no" && (
          <>
            <div>
              <label className="block text-sm text-muted-theme mb-1">Motivo (opzionale)</label>
              <textarea
                className="w-full rounded-md border border-theme bg-panel-theme px-3 py-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => saveResponse("no")}
              />
              <p className="mt-1 text-xs text-muted-theme">(salva quando esci dal campo)</p>
            </div>

            <div>
              <label className="block text-sm text-muted-theme mb-1">Allegato (opzionale)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              <p className="mt-1 text-xs text-muted-theme">Formati: PDF o immagini.</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                  disabled={!file || uploading || saving}
                  onClick={uploadAttachment}
                >
                  {uploading ? "Caricamento..." : "Carica allegato"}
                </button>

                {attachmentPath && (
                  signedUrl ? (
                    <a
                      className="rounded-md border border-theme bg-panel-theme px-4 py-2 inline-flex items-center gap-2"
                      href={signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Link temporaneo"
                    >
                      📎 Apri allegato
                    </a>
                  ) : (
                    <button
                      className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                      onClick={openAttachment}
                      disabled={uploading || saving}
                      title="Genera link temporaneo"
                    >
                      📎 Apri allegato
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}