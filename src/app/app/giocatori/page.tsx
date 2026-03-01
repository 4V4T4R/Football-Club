// app/app/giocatori/page.tsx
"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

function formatDateIT(date: string) {
  if (!date) return "—";
  const iso = date.includes("T") ? date.split("T")[0] : date;
  const parts = iso.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.padStart(4, "0")}`;
}

type Club = { id: string; name: string; slug: string };

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  shirt_number: number | null;
  active: boolean;
};

type MenuPos = { top: number; left: number };

export default function PlayersPage() {
  const [role, setRole] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // add modal
  const [addOpen, setAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [shirtNumber, setShirtNumber] = useState<string>("");

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editShirtNumber, setEditShirtNumber] = useState<string>("");

  // actions dropdown (desktop) + actions sheet (mobile)
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [sheetOpenId, setSheetOpenId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState<string>("");

  // refs per bottone azioni
  const actionBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isStaff = useMemo(() => role === "admin" || role === "staff", [role]);

  const canSubmit = useMemo(() => {
    return firstName.trim() && lastName.trim() && birthDate && email.trim();
  }, [firstName, lastName, birthDate, email]);

  const inputClass =
    "w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm";

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 767px)")?.matches ?? window.innerWidth < 768;
  }, []);

  async function loadClubAndPlayers() {
    setLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    let roleValue: string | null = null;

    if (userId) {
      const { data: membership } = await supabase
        .from("club_members")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      roleValue = membership?.role ?? null;
      setRole(roleValue);
    }

    const isStaffLocal = roleValue === "admin" || roleValue === "staff";

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    // Nome mostrato in UI: prova players (nome/cognome), poi metadata, poi email
    // Nome mostrato in UI:
    // - se staff: prova tabella public.users
    // - se player: prova tabella players
    // - fallback: user_metadata, email
    const user = session.session?.user;
    const metaName = (user?.user_metadata?.full_name || user?.user_metadata?.name || "")
      .toString()
      .trim();
    const emailName = (user?.email || "").toString().trim();

    let staffName = "";
    if (isStaffLocal) {
      const { data: uRow } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

      staffName = uRow ? `${uRow.first_name ?? ""} ${uRow.last_name ?? ""}`.trim() : "";
    }

    let playerName = "";
    if (!isStaffLocal) {
      const { data: mePlayer } = await supabase
        .from("players")
        .select("first_name, last_name")
        .eq("user_id", userId)
        .maybeSingle();

      playerName = mePlayer ? `${mePlayer.first_name ?? ""} ${mePlayer.last_name ?? ""}`.trim() : "";
    }

    setDisplayName(staffName || playerName || metaName || emailName || "");

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

    let clubId: string | null = null;

    if (member?.club_id) {
      clubId = member.club_id;
    } else {
      const { data: player, error: playerErr } = await supabase
        .from("players")
        .select("club_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (playerErr) {
        setError("Errore players: " + playerErr.message);
        setLoading(false);
        return;
      }

      if (player?.club_id) clubId = player.club_id;
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

    let q = supabase
    .from("players")
    .select("id, first_name, last_name, birth_date, shirt_number, active")
    .eq("club_id", clubId);

  if (!isStaffLocal) {
    q = q.eq("active", true);
  }

  const { data: playersData, error: playersErr } = await q
    .order("active", { ascending: false })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

    if (playersErr) setError(playersErr.message);
    setPlayers(playersData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadClubAndPlayers();
  }, []);

  function closeAllActions() {
    setActionsOpenId(null);
    setMenuPos(null);
    setSheetOpenId(null);
  }

  function recalcMenuPos(playerId: string) {
    const btn = actionBtnRefs.current[playerId];
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    const dropdownWidth = 224; // w-56
    const dropdownHeight = 152;
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

  // chiudi menu/sheet se clicchi fuori
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;

      // ✅ se tocchi bottone azioni o dentro al menu/sheet, NON chiudere
      if (t.closest("[data-actions-button]")) return;
      if (t.closest("[data-actions-menu]")) return;

      setActionsOpenId(null);
      setMenuPos(null);
      setSheetOpenId(null);
    }

    // usare capture aiuta su iOS in alcuni casi
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  // scroll/resize/visualViewport (solo dropdown desktop)
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

  function startEdit(p: Player) {
    setEditingId(p.id);
    setEditFirstName(p.first_name);
    setEditLastName(p.last_name);
    setEditBirthDate(p.birth_date);
    setEditShirtNumber(p.shirt_number?.toString() ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFirstName("");
    setEditLastName("");
    setEditBirthDate("");
    setEditShirtNumber("");
  }

  async function saveEdit(playerId: string) {
    setError(null);

    const shirt = editShirtNumber.trim() ? Number(editShirtNumber) : null;
    if (editShirtNumber.trim() && Number.isNaN(shirt)) {
      setError("Numero maglia non valido.");
      return;
    }

    const { error: updErr } = await supabase
      .from("players")
      .update({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        birth_date: editBirthDate,
        shirt_number: shirt,
      })
      .eq("id", playerId);

    if (updErr) {
      setError(updErr.message);
      return;
    }

    cancelEdit();
    await loadClubAndPlayers();
  }

  async function toggleActive(p: Player) {
    setError(null);

    if (p.active) {
      const ok = window.confirm(
        `Sei sicuro di voler DISATTIVARE ${p.first_name} ${p.last_name}?`
      );
      if (!ok) return;
    }

    const { error: updErr } = await supabase
      .from("players")
      .update({ active: !p.active })
      .eq("id", p.id);

    if (updErr) {
      setError(updErr.message);
      return;
    }

    await loadClubAndPlayers();
  }

  async function deletePlayer(p: Player) {
    setError(null);

    const ok = window.confirm(
      `Sei sicuro di voler ELIMINARE definitivamente ${p.first_name} ${p.last_name}?\n\nQuesta operazione non è reversibile.`
    );
    if (!ok) return;

    const { error: delErr } = await supabase.from("players").delete().eq("id", p.id);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    if (editingId === p.id) cancelEdit();
    await loadClubAndPlayers();
  }

  // ✅ desktop: dropdown posizionato; ✅ mobile: bottom-sheet stile "Aggiungi giocatore"
  function openActions(playerId: string) {
    if (isMobile) {
      setSheetOpenId((curr) => (curr === playerId ? null : playerId));
      setActionsOpenId(null);
      setMenuPos(null);
      return;
    }

    if (actionsOpenId === playerId) {
      setActionsOpenId(null);
      setMenuPos(null);
      return;
    }

    setActionsOpenId(playerId);
    setSheetOpenId(null);
    setMenuPos(null);

    requestAnimationFrame(() => {
      recalcMenuPos(playerId);
      setTimeout(() => recalcMenuPos(playerId), 0);
    });
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !canSubmit) return;

    setError(null);

    const shirt = shirtNumber.trim() ? Number(shirtNumber) : null;
    if (shirtNumber.trim() && Number.isNaN(shirt)) {
      setError("Numero maglia non valido.");
      return;
    }

    const res = await fetch("/api/players/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        club_id: club.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        birth_date: birthDate || null,
        shirt_number: shirt ? shirt : null,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json?.error ?? "Errore creazione giocatore");
      return;
    }

    setFirstName("");
    setLastName("");
    setBirthDate("");
    setShirtNumber("");
    setEmail("");
    setAddOpen(false);

    await loadClubAndPlayers();
  }

  if (loading) return <div className="card p-8">Caricamento...</div>;

  const currentActionsPlayer =
    sheetOpenId
      ? players.find((x) => x.id === sheetOpenId)
      : actionsOpenId
        ? players.find((x) => x.id === actionsOpenId)
        : null;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Giocatori</h1>

        <p className="mt-2 text-muted-theme">
          {isStaff ? (
            <>
              {displayName ? ` ${displayName}` : ""}, gestisci la rosa della squadra{" "}
              {club?.name ? <b>{club.name}</b> : null}.
            </>
          ) : (
            <>
              {displayName ? ` ${displayName}` : ""}, qui vedrai la rosa della squadra{" "}
              {club?.name ? <b>{club.name}</b> : null}.
            </>
          )}
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <div className="card p-6 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-base-theme">Rosa</h2>
              {!isStaff && (
                <p className="mt-1 text-sm text-muted-theme">
                  Visualizzi le informazioni base della squadra.
                </p>
              )}
            </div>

            {isStaff && (
              <button
                type="button"
                className="h-10 w-10 rounded-md border border-theme bg-panel-theme flex items-center justify-center text-lg"
                title="Aggiungi giocatore"
                onClick={() => setAddOpen(true)}
              >
                +
              </button>
            )}
          </div>

          {players.length === 0 ? (
            <p className="mt-4 text-muted-theme">Nessun giocatore inserito.</p>
          ) : (
            <>
              {/* MOBILE LIST */}
              <div className="mt-4 md:hidden space-y-2">
                {players.map((p) => {
                  const editing = editingId === p.id;

                  return (
                    <div key={p.id} className="rounded-xl border border-theme bg-panel-theme p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-base-theme truncate">
                            {p.last_name} {p.first_name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-theme">
                            <span className="inline-flex items-center gap-1">
                              👕{" "}
                              <b className="font-medium text-base-theme">
                                {p.shirt_number ?? "—"}
                              </b>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              🎂 {formatDateIT(p.birth_date)}
                            </span>
                          </div>
                        </div>

                        {isStaff && (
                          <button
                            type="button"
                            data-actions-button
                            className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                            title="Azioni"
                            ref={(el) => {
                              actionBtnRefs.current[p.id] = el;
                            }}
                            onClick={() => openActions(p.id)}
                          >
                            🖋️
                          </button>
                        )}
                      </div>

                      {isStaff && editing && (
                        <div className="mt-3 rounded-xl border border-theme bg-panel-theme p-3 space-y-3">
                          <div className="grid gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Cognome</label>
                              <input
                                className={inputClass}
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Nome</label>
                              <input
                                className={inputClass}
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">
                                Data di nascita
                              </label>
                              <input
                                type="date"
                                className={inputClass}
                                value={editBirthDate}
                                onChange={(e) => setEditBirthDate(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">
                                Numero maglia
                              </label>
                              <input
                                className={inputClass}
                                value={editShirtNumber}
                                onChange={(e) => setEditShirtNumber(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                              onClick={() => saveEdit(p.id)}
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
                  <table className="min-w-[520px] w-full table-fixed text-sm">
                    <thead>
                      <tr className="bg-panel-theme">
                        <th className="px-3 py-2 text-left w-[280px]">Nome</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap w-[130px]">
                          Nascita
                        </th>
                        <th className="px-3 py-2 text-center w-[90px]">Maglia</th>

                        {isStaff && (
                          <>
                            <th className="px-3 py-2 text-center w-[90px]">Stato</th>
                            <th className="px-3 py-2 text-center w-[120px]">Azioni</th>
                          </>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {players.map((p) => {
                        const editing = editingId === p.id;

                        return (
                          <Fragment key={p.id}>
                            <tr className="border-t border-theme align-middle">
                              <td className="px-3 py-2 align-middle whitespace-nowrap">
                                {p.last_name} {p.first_name}
                              </td>

                              <td className="px-3 py-2 align-middle whitespace-nowrap">
                                {formatDateIT(p.birth_date)}
                              </td>

                              <td className="px-3 py-2 align-middle">
                                <div className="flex justify-center">{p.shirt_number ?? "—"}</div>
                              </td>

                              {isStaff && (
                                <>
                                  <td className="px-3 py-2 align-middle">
                                    <div className="flex justify-center">
                                      <span className="text-xs text-muted-theme">
                                        {p.active ? "Attivo" : "Non attivo"}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-3 py-2">
                                    <div className="flex justify-center">
                                      <button
                                        type="button"
                                        data-actions-button
                                        className="h-8 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                        title="Azioni"
                                        ref={(el) => {
                                          actionBtnRefs.current[p.id] = el;
                                        }}
                                        onClick={() => openActions(p.id)}
                                      >
                                        🖋️
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>

                            {isStaff && editing && (
                              <tr className="border-t border-theme">
                                <td colSpan={5} className="px-3 py-3">
                                  <div className="rounded-xl border border-theme bg-panel-theme p-4 space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Cognome
                                        </label>
                                        <input
                                          className={inputClass}
                                          value={editLastName}
                                          onChange={(e) => setEditLastName(e.target.value)}
                                          placeholder="Cognome"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Nome
                                        </label>
                                        <input
                                          className={inputClass}
                                          value={editFirstName}
                                          onChange={(e) => setEditFirstName(e.target.value)}
                                          placeholder="Nome"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Data di nascita
                                        </label>
                                        <input
                                          type="date"
                                          className={inputClass}
                                          value={editBirthDate}
                                          onChange={(e) => setEditBirthDate(e.target.value)}
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Numero maglia
                                        </label>
                                        <input
                                          className={inputClass}
                                          value={editShirtNumber}
                                          onChange={(e) => setEditShirtNumber(e.target.value)}
                                          placeholder="(opzionale)"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                      <button
                                        type="button"
                                        className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                                        onClick={() => saveEdit(p.id)}
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

      {/* DESKTOP DROPDOWN (portal su body) */}
      {isStaff &&
        actionsOpenId &&
        menuPos &&
        typeof document !== "undefined" &&
        !isMobile &&
        (() => {
          const p = players.find((x) => x.id === actionsOpenId);
          if (!p) return null;

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
                  startEdit(p);
                }}
              >
                Modifica
              </button>

              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-base-theme hover:bg-white/10"
                onClick={async () => {
                  closeAllActions();
                  await toggleActive(p);
                }}
              >
                {p.active ? "Disattiva" : "Attiva"}
              </button>

              <div className="h-px bg-white/10" />

              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-rose-500 hover:bg-white/10"
                onClick={async () => {
                  closeAllActions();
                  await deletePlayer(p);
                }}
              >
                Elimina
              </button>
            </div>,
            document.body
          );
        })()}

      {/* MOBILE ACTIONS SHEET (stile "Aggiungi giocatore") */}
      {isStaff &&
        sheetOpenId &&
        currentActionsPlayer &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] md:hidden"
            data-actions-menu
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Chiudi"
              onClick={closeAllActions}
            />

            {/* ✅ centrato perfettamente */}
            <div className="absolute left-1/2 top-1/2 w-[88vw] max-w-sm -translate-x-1/2 -translate-y-1/2">
              <div
                className="card p-4"
                data-actions-menu
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* header centrato */}
                {/* header con X */}
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left w-full">
                    <div className="text-sm text-muted-theme">
                      Azioni giocatore
                    </div>
                    <div className="mt-1 font-semibold text-base-theme truncate">
                      {currentActionsPlayer.last_name}{" "}
                      {currentActionsPlayer.first_name}
                    </div>
                  </div>

                  {/* ✅ X chiusura */}
                  <button
                    type="button"
                    className="h-9 w-9 shrink-0 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                    onClick={closeAllActions}
                    title="Chiudi"
                  >
                    ✖️
                  </button>
                </div>

                {/* bottoni */}
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-base-theme"
                    onClick={() => {
                      closeAllActions();
                      startEdit(currentActionsPlayer);
                    }}
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-base-theme"
                    onClick={async () => {
                      closeAllActions();
                      await toggleActive(currentActionsPlayer);
                    }}
                  >
                    {currentActionsPlayer.active ? "Disattiva" : "Attiva"}
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-center text-rose-500"
                    onClick={async () => {
                      closeAllActions();
                      await deletePlayer(currentActionsPlayer);
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

      {/* MODAL AGGIUNGI */}
      {isStaff && addOpen && (
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
                  <h2 className="text-lg font-semibold text-base-theme">Aggiungi giocatore</h2>
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

              <form className="mt-4 space-y-3" onSubmit={addPlayer}>
                <input
                  className={inputClass}
                  placeholder="Nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Cognome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Email giocatore"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Data di nascita</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="Numero maglia (opzionale)"
                  value={shirtNumber}
                  onChange={(e) => setShirtNumber(e.target.value)}
                />

                <button
                  className="w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                  disabled={!canSubmit}
                  style={{ opacity: canSubmit ? 1 : 0.6 }}
                >
                  Aggiungi
                </button>
              </form>

              <p className="mt-3 text-xs text-muted-theme">
                Disattiva un giocatore invece di eliminarlo: mantiene storico e presenze.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}