"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

type Club = { id: string; name: string; slug: string };

type StaffRow = {
  id: string;               // club_members.id
  user_id: string;
  club_id: string;
  role: string;             // staff
  birth_date: string | null;
  title: string | null;     // qualifica
  first_name: string | null;
  last_name: string | null;
};

type MenuPos = { top: number; left: number };

function formatDateIT(date: string | null) {
  if (!date) return "—";
  const iso = date.includes("T") ? date.split("T")[0] : date;
  const parts = iso.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.padStart(4, "0")}`;
}

const QUALIFICHE = ["Allenatore", "Amministratore", "Direttore"] as const;

export default function StaffPage() {
  const [role, setRole] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [items, setItems] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // add modal (solo admin)
  const [addOpen, setAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [title, setTitle] = useState<string>("");

  // edit (solo admin)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editTitle, setEditTitle] = useState("");

  // actions dropdown/sheet
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [sheetOpenId, setSheetOpenId] = useState<string | null>(null);

  const actionBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isAdmin = useMemo(() => role === "admin", [role]);
  const isStaff = useMemo(() => role === "admin" || role === "staff", [role]);

  const inputClass =
    "w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm";

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 767px)")?.matches ?? window.innerWidth < 768;
  }, []);

  const canSubmit = useMemo(() => {
    return firstName.trim() && lastName.trim() && email.trim();
  }, [firstName, lastName, email]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    // ruolo
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const roleValue = membership?.role ?? null;
    setRole(roleValue);

    // club
    const { data: member, error: memberErr } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      setError("Errore club_members: " + memberErr.message);
      setLoading(false);
      return;
    }

    let clubId: string | null = member?.club_id ?? null;

    if (!clubId) {
      // fallback player
      const { data: p } = await supabase
        .from("players")
        .select("club_id")
        .eq("user_id", userId)
        .maybeSingle();

      clubId = p?.club_id ?? null;
    }

    if (!clubId) {
      setError("Impossibile determinare la squadra.");
      setLoading(false);
      return;
    }

    const { data: clubData, error: clubErr } = await supabase
      .from("clubs")
      .select("id, name, slug")
      .eq("id", clubId)
      .single();

    if (clubErr || !clubData) {
      setError("Impossibile caricare la squadra.");
      setLoading(false);
      return;
    }

    setClub(clubData);

    // staff list: SOLO role='staff' (admin nascosto)
    const { data: cms, error: cmErr } = await supabase
      .from("club_members")
      .select("id, user_id, club_id, role, birth_date, title")
      .eq("club_id", clubId)
      .eq("role", "staff")
      .order("created_at", { ascending: true });

    if (cmErr) {
      setError(cmErr.message);
      setLoading(false);
      return;
    }

    const userIds = (cms ?? []).map((x: any) => x.user_id).filter(Boolean);
    let userMap: Record<string, { first_name: string | null; last_name: string | null }> = {};

    if (userIds.length > 0) {
      const { data: us, error: uErr } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (uErr) {
        setError(uErr.message);
        setLoading(false);
        return;
      }

      for (const u of us ?? []) {
        userMap[(u as any).id] = { first_name: (u as any).first_name ?? null, last_name: (u as any).last_name ?? null };
      }
    }

    const merged: StaffRow[] = (cms ?? []).map((cm: any) => ({
      ...cm,
      first_name: userMap[cm.user_id]?.first_name ?? null,
      last_name: userMap[cm.user_id]?.last_name ?? null,
    }));

    setItems(merged);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function closeAllActions() {
    setActionsOpenId(null);
    setMenuPos(null);
    setSheetOpenId(null);
  }

  function recalcMenuPos(id: string) {
    const btn = actionBtnRefs.current[id];
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const dropdownWidth = 224;
    const dropdownHeight = 104;
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

    top = Math.max(vvTop + 8, top);

    setMenuPos({ top, left });
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-actions-button]")) return;
      if (t.closest("[data-actions-menu]")) return;

      setActionsOpenId(null);
      setMenuPos(null);
      setSheetOpenId(null);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  useEffect(() => {
    function onMove() {
      if (!actionsOpenId) return;
      recalcMenuPos(actionsOpenId);
    }
    if (!actionsOpenId) return;
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
  }, [actionsOpenId]);

  function openActions(id: string) {
    if (isMobile) {
      setSheetOpenId((curr) => (curr === id ? null : id));
      setActionsOpenId(null);
      setMenuPos(null);
      return;
    }

    if (actionsOpenId === id) {
      setActionsOpenId(null);
      setMenuPos(null);
      return;
    }

    setActionsOpenId(id);
    setSheetOpenId(null);
    setMenuPos(null);

    requestAnimationFrame(() => {
      recalcMenuPos(id);
      setTimeout(() => recalcMenuPos(id), 0);
    });
  }

  function startEdit(s: StaffRow) {
    setEditingId(s.id);
    setEditFirstName(s.first_name ?? "");
    setEditLastName(s.last_name ?? "");
    setEditBirthDate(s.birth_date ?? "");
    setEditTitle(s.title ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFirstName("");
    setEditLastName("");
    setEditBirthDate("");
    setEditTitle("");
  }

  async function saveEdit(memberId: string) {
    setError(null);

    const res = await fetch("/api/staff/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        birth_date: editBirthDate || null,
        title: editTitle || null,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? "Errore aggiornamento staff");
      return;
    }

    cancelEdit();
    await loadAll();
  }

  async function deleteStaff(s: StaffRow) {
    setError(null);

    const ok = window.confirm(
      `Sei sicuro di voler ELIMINARE ${s.last_name ?? ""} ${s.first_name ?? ""} dallo staff?\n\nQuesta operazione rimuove il membro dal club.`
    );
    if (!ok) return;

    const res = await fetch("/api/staff/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: s.id }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? "Errore eliminazione staff");
      return;
    }

    if (editingId === s.id) cancelEdit();
    await loadAll();
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !canSubmit) return;

    setError(null);

    const res = await fetch("/api/staff/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        club_id: club.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        birth_date: birthDate || null,
        title: title || null,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? "Errore creazione staff");
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    setBirthDate("");
    setTitle("");
    setAddOpen(false);

    await loadAll();
  }

  if (loading) return <div className="card p-8">Caricamento...</div>;

  const currentActions =
    sheetOpenId
      ? items.find((x) => x.id === sheetOpenId)
      : actionsOpenId
        ? items.find((x) => x.id === actionsOpenId)
        : null;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Staff</h1>
        <p className="mt-2 text-muted-theme">
          Lista staff di {club?.name ? <b>{club.name}</b> : null}.
        </p>
        {!isStaff && (
          <p className="mt-2 text-xs text-muted-theme">
            Nota: per gestione completa serve Staff/Admin.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <div className="card p-6 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-base-theme">Membri</h2>
              {!isAdmin && (
                <p className="mt-1 text-sm text-muted-theme">
                  Visualizzi lo staff in sola lettura.
                </p>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                className="h-10 w-10 rounded-md border border-theme bg-panel-theme flex items-center justify-center text-lg"
                title="Aggiungi staff"
                onClick={() => setAddOpen(true)}
              >
                +
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="mt-4 text-muted-theme">Nessun membro staff inserito.</p>
          ) : (
            <>
              {/* MOBILE LIST */}
              <div className="mt-4 md:hidden space-y-2">
                {items.map((s) => {
                  const editing = editingId === s.id;
                  const fullName = `${s.last_name ?? ""} ${s.first_name ?? ""}`.trim();
                  const qualifica = (s.title ?? "").trim() || "Staff";

                  return (
                    <div key={s.id} className="rounded-xl border border-theme bg-panel-theme p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-base-theme truncate">{fullName || "—"}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-theme">
                            <span className="inline-flex items-center gap-1">🎂 {formatDateIT(s.birth_date)}</span>
                            <span className="inline-flex items-center gap-1">🏷️ {qualifica}</span>
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            data-actions-button
                            className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                            title="Azioni"
                            ref={(el) => {
                              actionBtnRefs.current[s.id] = el;
                            }}
                            onClick={() => openActions(s.id)}
                          >
                            🖋️
                          </button>
                        )}
                      </div>

                      {isAdmin && editing && (
                        <div className="mt-3 rounded-xl border border-theme bg-panel-theme p-3 space-y-3">
                          <div className="grid gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Cognome</label>
                              <input className={inputClass} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Nome</label>
                              <input className={inputClass} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Data di nascita (opzionale)</label>
                              <input type="date" className={inputClass} value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Qualifica</label>
                              <select className={inputClass} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}>
                                <option value="">Staff</option>
                                {QUALIFICHE.map((q) => (
                                  <option key={q} value={q}>{q}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                              onClick={() => saveEdit(s.id)}
                            >
                              Salva
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                              onClick={cancelEdit}
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="mt-4 hidden md:block rounded-xl border border-theme overflow-hidden max-w-full">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="min-w-[720px] w-full table-fixed text-sm">
                    <thead>
                      <tr className="bg-panel-theme">
                        <th className="px-3 py-2 text-left w-[320px]">Nome</th>
                        <th className="px-3 py-2 text-left w-[140px]">Nascita</th>
                        <th className="px-3 py-2 text-left w-[200px]">Qualifica</th>
                        {isAdmin && <th className="px-3 py-2 text-center w-[120px]">Azioni</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((s) => {
                        const editing = editingId === s.id;
                        const fullName = `${s.last_name ?? ""} ${s.first_name ?? ""}`.trim();
                        const qualifica = (s.title ?? "").trim() || "Staff";

                        return (
                          <Fragment key={s.id}>
                            <tr className="border-t border-theme align-middle">
                              <td className="px-3 py-2 whitespace-nowrap">{fullName || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{formatDateIT(s.birth_date)}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{qualifica}</td>

                              {isAdmin && (
                                <td className="px-3 py-2">
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      data-actions-button
                                      className="h-8 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                      title="Azioni"
                                      ref={(el) => {
                                        actionBtnRefs.current[s.id] = el;
                                      }}
                                      onClick={() => openActions(s.id)}
                                    >
                                      🖋️
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>

                            {isAdmin && editing && (
                              <tr className="border-t border-theme">
                                <td colSpan={4} className="px-3 py-3">
                                  <div className="rounded-xl border border-theme bg-panel-theme p-4 space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">Cognome</label>
                                        <input className={inputClass} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">Nome</label>
                                        <input className={inputClass} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">Data di nascita (opzionale)</label>
                                        <input type="date" className={inputClass} value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">Qualifica</label>
                                        <select className={inputClass} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}>
                                          <option value="">Staff</option>
                                          {QUALIFICHE.map((q) => (
                                            <option key={q} value={q}>{q}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                      <button type="button" className="rounded-md border border-theme bg-panel-theme px-4 py-2" onClick={() => saveEdit(s.id)}>
                                        Salva
                                      </button>
                                      <button type="button" className="rounded-md border border-theme bg-panel-theme px-4 py-2" onClick={cancelEdit}>
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DESKTOP DROPDOWN */}
      {isAdmin &&
        actionsOpenId &&
        menuPos &&
        typeof document !== "undefined" &&
        !isMobile &&
        (() => {
          const s = items.find((x) => x.id === actionsOpenId);
          if (!s) return null;

          return createPortal(
            <div
              data-actions-menu
              className="fixed z-[9999] w-56 overflow-hidden rounded-xl border border-theme bg-panel-theme shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-base-theme hover:bg-white/10"
                onClick={() => {
                  closeAllActions();
                  startEdit(s);
                }}
              >
                Modifica
              </button>

              <div className="h-px bg-white/10" />

              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-rose-500 hover:bg-white/10"
                onClick={async () => {
                  closeAllActions();
                  await deleteStaff(s);
                }}
              >
                Elimina
              </button>
            </div>,
            document.body
          );
        })()}

      {/* MOBILE ACTIONS SHEET */}
      {isAdmin &&
        sheetOpenId &&
        currentActions &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden" data-actions-menu onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="absolute inset-0 bg-black/50" aria-label="Chiudi" onClick={closeAllActions} />

            <div className="absolute left-1/2 top-1/2 w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2">
              <div className="card p-4" data-actions-menu onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left w-full">
                    <div className="text-sm text-muted-theme">Azioni staff</div>
                    <div className="mt-1 font-semibold text-base-theme truncate">
                      {(currentActions.last_name ?? "") + " " + (currentActions.first_name ?? "")}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="h-9 w-9 shrink-0 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                    onClick={closeAllActions}
                    title="Chiudi"
                  >
                    ✖️
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-base-theme"
                    onClick={() => {
                      closeAllActions();
                      startEdit(currentActions);
                    }}
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-rose-500"
                    onClick={async () => {
                      closeAllActions();
                      await deleteStaff(currentActions);
                    }}
                  >
                    Elimina
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-muted-theme"
                    onClick={closeAllActions}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL AGGIUNGI STAFF */}
      {isAdmin && addOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi"
            onClick={() => setAddOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-base-theme">Aggiungi staff</h2>
                  <p className="mt-1 text-xs text-muted-theme">Inserisci i dati e invia l’invito.</p>
                </div>

                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                  onClick={() => setAddOpen(false)}
                  title="Chiudi"
                >
                  ✖️
                </button>
              </div>

              <form className="mt-4 space-y-3" onSubmit={addStaff}>
                <input className={inputClass} placeholder="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <input className={inputClass} placeholder="Cognome" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                <input className={inputClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Data di nascita (opzionale)</label>
                  <input type="date" className={inputClass} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Qualifica (opzionale)</label>
                  <select className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)}>
                    <option value="">Staff</option>
                    {QUALIFICHE.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                  disabled={!canSubmit}
                  style={{ opacity: canSubmit ? 1 : 0.6 }}
                >
                  Aggiungi
                </button>
              </form>

              <p className="mt-3 text-xs text-muted-theme">
                Solo l’Admin può creare o eliminare lo staff.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}