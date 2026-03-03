"use client";

import { useEffect } from "react";

type ThemePref = "system" | "light" | "dark";

function applyTheme(pref: ThemePref) {
  const el = document.documentElement;

  if (pref === "system") {
    delete (el as any).dataset.theme;
    return;
  }

  el.dataset.theme = pref;
}

export default function ThemeClient() {
  useEffect(() => {
    const pref = (localStorage.getItem("theme_pref") as ThemePref) || "system";
    applyTheme(pref);

    function onStorage(e: StorageEvent) {
      if (e.key === "theme_pref") {
        applyTheme(((e.newValue as ThemePref) || "system") as ThemePref);
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}

export function setThemePref(pref: ThemePref) {
  localStorage.setItem("theme_pref", pref);
  applyTheme(pref);
}