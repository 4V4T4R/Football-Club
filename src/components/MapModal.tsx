"use client";

import React from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function MapModal({ open, onClose, title, address, lat, lng }: Props) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  const q = lat != null && lng != null ? `${lat},${lng}` : address ? address : "";
  const iframeSrc = "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&z=16&output=embed";

  const openMapsHref = isIOS()
    ? "https://maps.apple.com/?q=" + encodeURIComponent(q)
    : "https://www.google.com/maps?q=" + encodeURIComponent(q);

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Chiudi"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-theme bg-panel-theme shadow-xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-theme">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-base-theme truncate">
                {title ?? "Posizione"}
              </div>
              {address && <div className="mt-1 text-xs text-muted-theme truncate">{address}</div>}
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
              onClick={onClose}
              title="Chiudi"
            >
              ✖️
            </button>
          </div>

          <div className="aspect-[16/11] w-full">
            <iframe
              title="Mappa"
              className="h-full w-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={iframeSrc}
            />
          </div>

          <div className="p-4">
            <a
              className="block w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-center text-sm text-base-theme hover:bg-white/10"
              href={openMapsHref}
              target="_blank"
              rel="noreferrer"
            >
              Apri in mappe →
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}