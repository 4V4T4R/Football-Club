// ✅ MODIFICA 1: INCOLLA/AGGIORNA QUESTO COMPONENTE COMPLETO
// src/components/PlaceAutocomplete.tsx
// (aggiunge supporto testo libero con onInputChange)

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type PlaceValue = {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
};

type Props = {
  value: PlaceValue | null;
  onChange: (v: PlaceValue | null) => void;

  // ✅ nuovo: testo libero mentre scrivi (anche se non selezioni)
  onInputChange?: (text: string) => void;

  placeholder?: string;
  inputClassName?: string;
};

declare global {
  interface Window {
    google: any;
  }
}

export default function PlaceAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder,
  inputClassName,
}: Props) {
  const [text, setText] = useState(value?.address ?? "");
  const [ready, setReady] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<any>(null);

  useEffect(() => {
    setText(value?.address ?? "");
  }, [value?.address]);

  // prova a inizializzare quando google è pronto
  useEffect(() => {
    let t: any;

    function tryInit() {
      if (!inputRef.current) return;
      if (!window.google?.maps?.places) return;

      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["place_id", "formatted_address", "geometry", "name"],
        types: [], // ✅ permette anche “stadio/campo” ecc.
      });

      ac.addListener("place_changed", () => {
        const p = ac.getPlace?.();
        const placeId = p?.place_id ?? null;
        const addr = p?.formatted_address || p?.name || null;
        const lat = p?.geometry?.location?.lat?.() ?? null;
        const lng = p?.geometry?.location?.lng?.() ?? null;

        if (!placeId || !addr || lat == null || lng == null) {
          onChange(null);
          return;
        }

        onChange({ placeId, address: addr, lat, lng });
        setText(addr);
        onInputChange?.(addr);
      });

      acRef.current = ac;
      setReady(true);
    }

    tryInit();
    t = setInterval(tryInit, 250);

    return () => {
      clearInterval(t);
      acRef.current = null;
    };
  }, [onChange, onInputChange]);

  const cls = useMemo(() => {
    return (
      inputClassName ??
      "w-full h-10 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
    );
  }, [inputClassName]);

  return (
    <input
      ref={inputRef}
      className={cls}
      placeholder={placeholder ?? "Cerca un luogo…"}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);

        // ✅ se stai scrivendo, questo è testo libero: svuota la selezione “Google”
        onChange(null);
        onInputChange?.(v);
      }}
      aria-label="Luogo"
    />
  );
}