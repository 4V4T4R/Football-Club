"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MenuPos = { top: number; left: number };

type EventActionsMenuProps = {
  eventId: string;
  eventTitle: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export default function EventActionsMenu({
  eventId,
  eventTitle,
  onEdit,
  onDelete,
  disabled = false,
}: EventActionsMenuProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 767px)")?.matches ?? window.innerWidth < 768;
  }, []);

  function closeMenu() {
    setDesktopOpen(false);
    setSheetOpen(false);
    setMenuPos(null);
  }

  function recalcMenuPos() {
    const btn = buttonRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const dropdownWidth = 224;
    const dropdownHeight = 204;
    const gap = 8;

    const vv = window.visualViewport;
    const vvLeft = vv?.offsetLeft ?? 0;
    const vvTop = vv?.offsetTop ?? 0;
    const vw = vv?.width ?? document.documentElement.clientWidth ?? window.innerWidth;
    const vh = vv?.height ?? document.documentElement.clientHeight ?? window.innerHeight;

    let left = vvLeft + r.right - dropdownWidth;
    let top = vvTop + r.bottom + gap;

    left = Math.max(vvLeft + 8, Math.min(left, vvLeft + vw - dropdownWidth - 8));

    if (top + dropdownHeight > vvTop + vh - 8) {
      top = vvTop + r.top - gap - dropdownHeight;
    }

    setMenuPos({ top: Math.max(vvTop + 8, top), left });
  }

  function openMenu() {
    if (isMobile) {
      setSheetOpen((current) => !current);
      setDesktopOpen(false);
      setMenuPos(null);
      return;
    }

    if (desktopOpen) {
      closeMenu();
      return;
    }

    setDesktopOpen(true);
    setSheetOpen(false);
    requestAnimationFrame(() => {
      recalcMenuPos();
      setTimeout(recalcMenuPos, 0);
    });
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-event-actions-button]")) return;
      if (target.closest("[data-event-actions-menu]")) return;
      closeMenu();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  useEffect(() => {
    if (!desktopOpen) return;

    function onMove() {
      recalcMenuPos();
    }

    onMove();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    window.visualViewport?.addEventListener("scroll", onMove);
    window.visualViewport?.addEventListener("resize", onMove);

    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      window.visualViewport?.removeEventListener("scroll", onMove);
      window.visualViewport?.removeEventListener("resize", onMove);
    };
  }, [desktopOpen]);

  const menuItems = (
    <>
      <Link
        className="block w-full px-4 py-3 text-left text-sm text-base-theme hover:bg-white/10"
        href={"/eventi/" + eventId}
        onClick={closeMenu}
      >
        Convoca
      </Link>
      <Link
        className="block w-full px-4 py-3 text-left text-sm text-base-theme hover:bg-white/10"
        href={"/eventi/" + eventId + "/risposte"}
        onClick={closeMenu}
      >
        Risposte
      </Link>
      <button
        type="button"
        className="block w-full px-4 py-3 text-left text-sm text-base-theme hover:bg-white/10"
        onClick={() => {
          closeMenu();
          onEdit();
        }}
      >
        Modifica
      </button>
      <div className="h-px bg-white/10" />
      <button
        type="button"
        className="block w-full px-4 py-3 text-left text-sm text-rose-500 hover:bg-white/10"
        onClick={() => {
          closeMenu();
          onDelete();
        }}
        disabled={disabled}
        style={{ opacity: disabled ? 0.6 : 1 }}
      >
        Elimina
      </button>
    </>
  );

  return (
    <>
      <button
        type="button"
        data-event-actions-button
        className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
        title="Azioni"
        aria-label={`Azioni per ${eventTitle}`}
        ref={buttonRef}
        onClick={openMenu}
      >
        🖋️
      </button>

      {desktopOpen &&
        menuPos &&
        typeof document !== "undefined" &&
        !isMobile &&
        createPortal(
          <div
            data-event-actions-menu
            className="fixed z-[9999] w-56 overflow-hidden rounded-xl border border-theme bg-panel-theme shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {menuItems}
          </div>,
          document.body
        )}

      {sheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] md:hidden"
            data-event-actions-menu
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Chiudi"
              onClick={closeMenu}
            />

            <div className="absolute left-1/2 top-1/2 w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2">
              <div
                className="card p-4"
                data-event-actions-menu
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-left">
                    <div className="text-sm text-muted-theme">Azioni evento</div>
                    <div className="mt-1 truncate font-semibold text-base-theme">{eventTitle}</div>
                  </div>

                  <button
                    type="button"
                    className="h-9 w-9 shrink-0 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                    onClick={closeMenu}
                    title="Chiudi"
                    aria-label="Chiudi azioni evento"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <Link
                    className="block w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-base-theme"
                    href={"/eventi/" + eventId}
                    onClick={closeMenu}
                  >
                    Convoca
                  </Link>
                  <Link
                    className="block w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-base-theme"
                    href={"/eventi/" + eventId + "/risposte"}
                    onClick={closeMenu}
                  >
                    Risposte
                  </Link>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-base-theme"
                    onClick={() => {
                      closeMenu();
                      onEdit();
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-rose-500"
                    onClick={() => {
                      closeMenu();
                      onDelete();
                    }}
                    disabled={disabled}
                    style={{ opacity: disabled ? 0.6 : 1 }}
                  >
                    Elimina
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-muted-theme"
                    onClick={closeMenu}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
