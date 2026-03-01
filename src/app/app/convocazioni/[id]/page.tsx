"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import MapModal from "@/components/MapModal";

type EventRow = {
  id: string;
  title: string;
  start_at: string;

  location: string | null;

  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
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

  const [event, setEvent] = useState<EventRow | null>(null);

  // player
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerClubId, setPlayerClubId] = useState<string | null>(null);

  // risposta (draft)
  const [status, setStatus] = useState<"yes" | "no" | null>(null);
  const [reason, setReason] = useState("");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // lock/edit
  const [isEditing, setIsEditing] = useState(true);

  // file + signed url
  const [file, setFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // toast
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // mappa
  const [mapOpen, setMapOpen] = useState(false);

  const addr = useMemo(() => (event?.location_address ?? event?.location ?? "").trim(), [event]);
  const hasCoords = useMemo(
    () => event?.location_lat != null && event?.location_lng != null,
    [event]
  );

  function showToast(type: "ok" | "err", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 1800);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function load() {
    setLoading(true);
    setError(null);
    setSignedUrl(null);
    setFile(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    // player
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

    setPlayerId(player.id);
    setPlayerClubId(player.club_id ?? null);

    // verifica convocazione
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

    // evento (con coordinate se ci sono)
    const { data: evData, error: evErr } = await supabase
      .from("events")
      .select("id, title, start_at, location, location_address, location_lat, location_lng")
      .eq("id", eventId)
      .single();

    if (evErr) {
      setError(evErr.message);
      setLoading(false);
      return;
    }

    setEvent(evData as EventRow);

    // risposta esistente
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

    if (resp?.status) {
      setStatus((resp.status as any) ?? null);
      setReason(resp.reason ?? "");
      setAttachmentPath(resp.attachment_url ?? null);
      setIsEditing(false); // già salvata -> blocca
    } else {
      setStatus(null);
      setReason("");
      setAttachmentPath(null);
      setIsEditing(true);
    }

    setLoading(false);
  }

  const canSave = useMemo(() => {
    if (!isEditing) return false;
    if (!status) return false;
    return true;
  }, [isEditing, status]);

  async function saveResponse() {
    if (!playerId) return;

    if (!status) {
      showToast("err", "Seleziona Presente/Assente");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: upErr } = await supabase.from("event_responses").upsert(
      {
        event_id: eventId,
        player_id: playerId,
        status,
        reason: status === "no" ? (reason.trim() || null) : null,
        attachment_url: status === "no" ? (attachmentPath ?? null) : null,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "event_id,player_id" }
    );

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      showToast("err", "Errore salvataggio");
      return;
    }

    setSaving(false);
    setIsEditing(false);
    showToast("ok", "Risposta salvata ✅");
  }

  function enableEdit() {
    setIsEditing(true);
    showToast("ok", "Modifica attiva");
  }

  async function uploadAttachment() {
    if (!file) return;

    if (!playerId || !playerClubId) {
      setError("Giocatore non trovato.");
      return;
    }

    if (status !== "no") {
      showToast("err", "L'allegato è disponibile solo se sei Assente");
      return;
    }

    setUploading(true);
    setError(null);
    setSignedUrl(null);

    const cleanName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${playerClubId}/${eventId}/${playerId}/${Date.now()}_${cleanName}`;

    const { error: upErr } = await supabase.storage
      .from("event-attachments")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      showToast("err", "Errore caricamento");
      return;
    }

    setAttachmentPath(path);
    setFile(null);
    setUploading(false);
    showToast("ok", "Allegato caricato ✅");
  }

  async function openAttachment() {
    if (!attachmentPath) return;

    setError(null);

    const { data, error } = await supabase.storage
      .from("event-attachments")
      .createSignedUrl(attachmentPath, 60);

    if (error || !data?.signedUrl) {
      setError(error?.message ?? "Impossibile aprire l'allegato.");
      showToast("err", "Impossibile aprire");
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
          {fmtDateTimeIT(event.start_at)}
          {addr ? " • " : ""}
          {addr ? (
            hasCoords ? (
              <button
                type="button"
                className="underline underline-offset-4 hover:opacity-90"
                onClick={() => setMapOpen(true)}
                title="Apri mappa"
              >
                {addr}
              </button>
            ) : (
              <span>{addr}</span>
            )
          ) : null}
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-base-theme">La tua risposta</h2>
            <p className="mt-1 text-xs text-muted-theme">
              {isEditing
                ? "Compila e salva."
                : "Risposta salvata. Premi “Modifica Risposta” per cambiare."}
            </p>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={saveResponse}
              disabled={!canSave || saving || uploading}
              className="rounded-md border border-theme bg-panel-theme px-4 py-2"
              style={{ opacity: !canSave || saving || uploading ? 0.6 : 1 }}
            >
              {saving ? "Salvataggio..." : "Salva Risposta"}
            </button>
          ) : (
            <button
              type="button"
              onClick={enableEdit}
              disabled={saving || uploading}
              className="rounded-md border border-theme bg-panel-theme px-4 py-2"
            >
              Modifica Risposta
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => isEditing && setStatus("yes")}
            disabled={!isEditing || saving || uploading}
            className="rounded-md border border-theme bg-panel-theme px-4 py-2"
            style={{
              opacity: !isEditing || saving || uploading ? 0.6 : 1,
              outline: status === "yes" ? "2px solid #22c55e" : "none",
              outlineOffset: "2px",
            }}
          >
            ✅ Presente
          </button>

          <button
            type="button"
            onClick={() => isEditing && setStatus("no")}
            disabled={!isEditing || saving || uploading}
            className="rounded-md border border-theme bg-panel-theme px-4 py-2"
            style={{
              opacity: !isEditing || saving || uploading ? 0.6 : 1,
              outline: status === "no" ? "2px solid #ef4444" : "none",
              outlineOffset: "2px",
            }}
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
                disabled={!isEditing || saving || uploading}
                style={{ opacity: !isEditing || saving || uploading ? 0.6 : 1 }}
              />
            </div>

            <div>
              <label className="block text-sm text-muted-theme mb-1">Allegato (opzionale)</label>

              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
                disabled={!isEditing || saving || uploading}
                style={{ opacity: !isEditing || saving || uploading ? 0.6 : 1 }}
              />

              <p className="mt-1 text-xs text-muted-theme">Formati: PDF o immagini.</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                  disabled={!isEditing || !file || uploading || saving}
                  onClick={uploadAttachment}
                  style={{ opacity: !isEditing || !file || uploading || saving ? 0.6 : 1 }}
                >
                  {uploading ? "Caricamento..." : "Carica allegato"}
                </button>

                {attachmentPath &&
                  (signedUrl ? (
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
                      type="button"
                      className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                      onClick={openAttachment}
                      disabled={uploading || saving}
                      title="Genera link temporaneo"
                    >
                      📎 Apri allegato
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <MapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title={event.title}
        address={event.location_address ?? event.location ?? null}
        lat={event.location_lat ?? null}
        lng={event.location_lng ?? null}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[300] -translate-x-1/2">
          <div
            className="rounded-xl border border-theme bg-panel-theme px-4 py-3 text-sm shadow-lg"
            style={{
              outline:
                toast.type === "ok"
                  ? "2px solid rgba(34,197,94,.45)"
                  : "2px solid rgba(239,68,68,.45)",
              outlineOffset: "2px",
            }}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}