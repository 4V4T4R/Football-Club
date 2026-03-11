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
  placeholder?: string;
  inputClassName?: string;

  // ✅ opzionale: ti restituisce il testo mentre scrivi (serve per "testo libero")
  onInputChange?: (txt: string) => void;
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function fetchJSON<T>(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error ?? "Errore richiesta");
  return json as T;
}

export default function PlaceAutocomplete({
  value,
  onChange,
  placeholder,
  inputClassName,
  onInputChange,
}: Props) {
  const [query, setQuery] = useState<string>(value?.address ?? "");
  const debounced = useDebounced(query, 250);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // se cambia value dall’esterno (reset form), aggiorna query
  useEffect(() => {
    setQuery(value?.address ?? "");
  }, [value?.address]);

  // chiudi click fuori
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (rootRef.current && rootRef.current.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // carica suggerimenti
  useEffect(() => {
    const q = debounced.trim();

    // se l’utente sta scrivendo qualcosa che NON è la selezione corrente, invalida la selezione
    if (q && value?.address && q !== value.address) {
      onChange(null);
    }

    if (q.length < 3) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchJSON<{ predictions: any[] }>(
          "/api/places/autocomplete?q=" + encodeURIComponent(q)
        );
        if (cancelled) return;

        const preds = (data?.predictions ?? []).slice(0, 6);

        const mapped: Suggestion[] = preds.map((p: any) => ({
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text ?? p.description ?? "",
          secondaryText: p.structured_formatting?.secondary_text ?? "",
        }));

        setItems(mapped);
        setOpen(true);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setItems([]);
        setLoading(false);
        setError(e?.message ?? "Errore suggerimenti");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hasDropdown = useMemo(
    () => open && (items.length > 0 || loading || !!error),
    [open, items, loading, error]
  );

  function handleTextChange(txt: string) {
    setQuery(txt);
    onInputChange?.(txt);
  }

  async function selectSuggestion(s: Suggestion) {
    try {
      setLoading(true);
      setError(null);

      const d = await fetchJSON<{
        placeId: string;
        address: string;
        lat: number;
        lng: number;
      }>("/api/places/details?placeId=" + encodeURIComponent(s.placeId));

      onChange({
        placeId: d.placeId,
        address: d.address,
        lat: d.lat,
        lng: d.lng,
      });

      setQuery(d.address);
      onInputChange?.(d.address);

      setItems([]);
      setOpen(false);
      setLoading(false);

      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? "Errore selezione luogo");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        className={
          inputClassName ??
          "w-full h-10 rounded-md border border-theme bg-panel-theme px-3"
        }
        placeholder={placeholder ?? "Inizia a scrivere un luogo…"}
        value={query}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onChange={(e) => handleTextChange(e.target.value)}
        onInput={(e) => handleTextChange((e.target as HTMLInputElement).value)}
        autoComplete="off"
        spellCheck={false}
      />

      {hasDropdown && (
        <div
          className="absolute left-0 right-0 mt-2 overflow-hidden rounded-xl border border-theme shadow-xl z-[80] text-base-theme"
          style={{
            backgroundColor:
              typeof document !== "undefined" &&
              document.documentElement.dataset.theme === "dark"
                ? "rgba(10,10,10,0.95)"
                : "rgba(255,255,255,0.96)",
          }}
          onPointerDown={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-theme">
              Caricamento…
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-theme">
              Nessun risultato
            </div>
          )}

          {!loading &&
            !error &&
            items.map((s) => (
              <button
                key={s.placeId}
                type="button"
                className="block w-full px-4 py-3 text-left hover:bg-white/10"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void selectSuggestion(s);
                }}
              >
                <div className="text-sm text-base-theme">{s.mainText}</div>
                {s.secondaryText ? (
                  <div className="mt-0.5 text-xs text-muted-theme">
                    {s.secondaryText}
                  </div>
                ) : null}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}