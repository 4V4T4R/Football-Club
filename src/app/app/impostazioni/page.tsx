"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { setThemePref } from "@/components/ThemeClient";

type Club = { id: string; name: string; slug: string };

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string | null;
};

type PlayerRow = {
  id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  shirt_number: number | null;
  user_id: string | null;
  active: boolean;
  created_at: string;
};

type MemberRow = {
  club_id: string;
  role: string;
  created_at: string;
  birth_date: string | null;
};

type ThemePref = "system" | "light" | "dark";

function fmtDateIT(isoOrYmd: string | null | undefined) {
  if (!isoOrYmd) return "—";
  const s = isoOrYmd.includes("T") ? isoOrYmd.split("T")[0] : isoOrYmd;
  const parts = s.split("-");
  if (parts.length !== 3) return "—";
  const [y, m, d] = parts;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).padStart(4, "0")}`;
}

function fmtDateTimeIT(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function roleLabel(memberRole: string | null, isPlayer: boolean) {
  if (isPlayer) return "Giocatore";
  if (!memberRole) return "—";
  if (memberRole === "admin") return "Admin";
  if (memberRole === "staff") return "Staff";
  if (memberRole === "viewer") return "Viewer";
  return memberRole;
}

export default function Page() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // messaggi globali
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // messaggi SOLO password
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState<string | null>(null);

  const [club, setClub] = useState<Club | null>(null);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  // PROFILO (sola lettura + Modifica/Salva)
  const [profileEditing, setProfileEditing] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editBirth, setEditBirth] = useState<string>(""); // YYYY-MM-DD, opzionale
  const [savingProfile, setSavingProfile] = useState(false);

  // password (nel modal)
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pwdAttempts, setPwdAttempts] = useState(0);
  const [pwdLockedUntil, setPwdLockedUntil] = useState<number | null>(null);

  // reset email
  const [sendingReset, setSendingReset] = useState(false);

  // popup notifiche / tema
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePref, setThemePrefState] = useState<ThemePref>("system");

  const isStaffOrAdmin = useMemo(() => {
    return ["admin", "staff"].includes(member?.role ?? "");
  }, [member?.role]);

  const isAdmin = useMemo(() => member?.role === "admin", [member?.role]);

  const canSaveProfile = useMemo(() => {
    if (!isStaffOrAdmin) return false;
    if (!profileEditing) return false;

    // consenti anche solo nascita
    const changed =
      (editFirst ?? "") !== (userRow?.first_name ?? "") ||
      (editLast ?? "") !== (userRow?.last_name ?? "") ||
      (editBirth ?? "") !== (member?.birth_date ?? "");

    return changed;
  }, [isStaffOrAdmin, profileEditing, editFirst, editLast, editBirth, userRow, member]);

  const score = useMemo(() => passwordScore(pwd1), [pwd1]);

  const isLocked = useMemo(() => {
    if (!pwdLockedUntil) return false;
    return Date.now() < pwdLockedUntil;
  }, [pwdLockedUntil]);

  const lockLeft = useMemo(() => {
    if (!pwdLockedUntil) return 0;
    return Math.max(0, pwdLockedUntil - Date.now());
  }, [pwdLockedUntil]);

  const canSavePwd = useMemo(() => {
    if (isLocked) return false;
    if (!oldPwd) return false;
    if (!pwd1 || !pwd2) return false;
    if (pwd1.length < 8) return false;
    if (pwd1 !== pwd2) return false;
    return true;
  }, [isLocked, oldPwd, pwd1, pwd2]);

  const inputClass =
    "w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm";

  function loadThemePref() {
    const v = (localStorage.getItem("theme_pref") as ThemePref) || "system";
    setThemePrefState(v);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    setOk(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id ?? null;
    const email = session.session?.user?.email ?? null;
    setAuthEmail(email);

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (uErr) {
      setError("Errore users: " + uErr.message);
      setLoading(false);
      return;
    }

    setUserRow((u as UserRow | null) ?? null);
    setEditFirst(u?.first_name ?? "");
    setEditLast(u?.last_name ?? "");

    const { data: m, error: mErr } = await supabase
      .from("club_members")
      .select("club_id, role, created_at, birth_date")
      .eq("user_id", userId)
      .maybeSingle();

    if (mErr) {
      setError("Errore club_members: " + mErr.message);
      setLoading(false);
      return;
    }

    setMember((m as MemberRow | null) ?? null);
    setEditBirth(m?.birth_date ?? "");

    const { data: p, error: pErr } = await supabase
      .from("players")
      .select("id, club_id, first_name, last_name, birth_date, shirt_number, user_id, active, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (pErr) {
      setError("Errore players: " + pErr.message);
      setLoading(false);
      return;
    }

    setPlayer((p as PlayerRow | null) ?? null);

    const clubId =
      (m?.club_id as string | undefined) ??
      (p?.club_id as string | undefined) ??
      null;

    if (clubId) {
      const { data: c, error: cErr } = await supabase
        .from("clubs")
        .select("id, name, slug")
        .eq("id", clubId)
        .maybeSingle();

      if (cErr) {
        setError("Errore clubs: " + cErr.message);
        setLoading(false);
        return;
      }

      setClub((c as Club | null) ?? null);
    } else {
      setClub(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    loadThemePref();
  }, []);

  function startEditProfile() {
    if (!isStaffOrAdmin) return;
    setProfileEditing(true);
    setOk(null);
    setError(null);
  }

  function cancelEditProfile() {
    setProfileEditing(false);
    setEditFirst(userRow?.first_name ?? "");
    setEditLast(userRow?.last_name ?? "");
    setEditBirth(member?.birth_date ?? "");
  }

  async function saveProfile() {
    if (!isStaffOrAdmin) return;
    if (!userRow?.id) return;

    setSavingProfile(true);
    setError(null);
    setOk(null);

    const first = editFirst.trim() ? editFirst.trim() : null;
    const last = editLast.trim() ? editLast.trim() : null;
    const birth = editBirth.trim() ? editBirth.trim() : null;

    // 1) users (nome/cognome)
    const { error: updErr } = await supabase
      .from("users")
      .update({ first_name: first, last_name: last })
      .eq("id", userRow.id);

    if (updErr) {
      setError(updErr.message);
      setSavingProfile(false);
      return;
    }

    // 2) club_members.birth_date (staff)
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id ?? null;

    if (userId) {
      const { error: updMemberErr } = await supabase
        .from("club_members")
        .update({ birth_date: birth })
        .eq("user_id", userId);

      if (updMemberErr) {
        setError(updMemberErr.message);
        setSavingProfile(false);
        return;
      }

      // 3) se è anche player: aggiorna anche players.birth_date (coerenza)
      if (player?.id && birth) {
        const { error: updPlayerErr } = await supabase
          .from("players")
          .update({ birth_date: birth })
          .eq("id", player.id);

        if (updPlayerErr) {
          setError(updPlayerErr.message);
          setSavingProfile(false);
          return;
        }
      }
    }

    setOk("Profilo aggiornato.");
    setSavingProfile(false);
    setProfileEditing(false);
    await loadAll();
  }

  async function changePassword() {
    if (!canSavePwd) return;

    setSavingPwd(true);
    setPwdError(null);
    setPwdOk(null);

    const { data: session } = await supabase.auth.getSession();
    const email = session.session?.user?.email;

    if (!email) {
      setPwdError("Sessione non valida.");
      setSavingPwd(false);
      return;
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: oldPwd,
    });

    if (signErr) {
      const next = pwdAttempts + 1;
      setPwdAttempts(next);

      if (next >= 5) {
        setPwdLockedUntil(Date.now() + 60_000);
        setPwdAttempts(0);
        setPwdError("Troppi tentativi. Riprova tra 60 secondi.");
      } else {
        setPwdError("La password attuale non è corretta.");
      }

      setSavingPwd(false);
      return;
    }

    setPwdAttempts(0);
    setPwdLockedUntil(null);

    const { error: updErr } = await supabase.auth.updateUser({ password: pwd1 });

    if (updErr) {
      setPwdError(updErr.message);
      setSavingPwd(false);
      return;
    }

    setOldPwd("");
    setPwd1("");
    setPwd2("");
    setPwdOk("Password aggiornata.");
    setSavingPwd(false);
  }

  async function sendResetEmail() {
    const email = authEmail ?? userRow?.email ?? null;
    if (!email) {
      setError("Email non disponibile per inviare il reset.");
      return;
    }

    setSendingReset(true);
    setError(null);
    setOk(null);

    const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/imposta-password" : undefined,
    });

    if (rErr) {
      setError(rErr.message);
      setSendingReset(false);
      return;
    }

    setOk("Email inviata. Controlla la posta per reimpostare la password.");
    setSendingReset(false);
  }

  function passwordScore(p: string) {
    let s = 0;
    if (p.length >= 8) s += 1;
    if (p.length >= 12) s += 1;
    if (/[a-z]/.test(p)) s += 1;
    if (/[A-Z]/.test(p)) s += 1;
    if (/\d/.test(p)) s += 1;
    if (/[^A-Za-z0-9]/.test(p)) s += 1;
    return Math.min(5, s);
  }

  function passwordLabel(score: number) {
    if (score <= 1) return "Debole";
    if (score === 2) return "Ok";
    if (score === 3) return "Buona";
    if (score === 4) return "Forte";
    return "Molto forte";
  }

  function formatSecondsLeft(ms: number) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${s}s`;
  }

  function themeLabel(v: ThemePref) {
    if (v === "system") return "Tema Sistema";
    if (v === "light") return "Chiaro";
    return "Oscuro";
  }

  function applyThemeChoice(v: ThemePref) {
    setThemePrefState(v);
    setThemePref(v);
  }

  if (loading) return <div className="card p-8">Caricamento…</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Impostazioni</h1>
        <p className="mt-3 text-muted-theme">Account e preferenze.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald-600">{ok}</p>}
      </div>

      {/* RIGA 1: PROFILO | SQUADRA */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PROFILO */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-base-theme">Profilo</h2>
            </div>

            {isStaffOrAdmin && !profileEditing ? (
              <button
                type="button"
                className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                onClick={startEditProfile}
              >
                Modifica
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-theme">Nome</label>
              <input
                className={inputClass}
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                disabled={!isStaffOrAdmin || !profileEditing}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-theme">Cognome</label>
              <input
                className={inputClass}
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                disabled={!isStaffOrAdmin || !profileEditing}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-theme">Data di nascita</label>
              <input
                type="date"
                className={inputClass}
                value={editBirth}
                onChange={(e) => setEditBirth(e.target.value)}
                disabled={!isStaffOrAdmin || !profileEditing}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-theme">Email</label>
              <input className={`${inputClass} opacity-80`} value={authEmail ?? userRow?.email ?? ""} readOnly />
            </div>
          </div>

          {isStaffOrAdmin && profileEditing ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                onClick={saveProfile}
                disabled={!canSaveProfile || savingProfile}
                style={{ opacity: !canSaveProfile || savingProfile ? 0.6 : 1 }}
              >
                {savingProfile ? "Salvataggio..." : "Salva"}
              </button>

              <button
                type="button"
                className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                onClick={cancelEditProfile}
                disabled={savingProfile}
                style={{ opacity: savingProfile ? 0.6 : 1 }}
              >
                Annulla
              </button>
            </div>
          ) : null}
        </div>

        {/* SQUADRA */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">Squadra</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-theme">Squadra</div>
              <div className="mt-1 text-base-theme font-medium">{club?.name ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-theme">Ruolo</div>
              <div className="mt-1 text-base-theme font-medium">
                {roleLabel(member?.role ?? null, !!player)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-theme">Sei anche giocatore?</div>
              <div className="mt-1 text-base-theme font-medium">{player ? "Sì" : "No"}</div>
              {player && (
                <div>
                  <div className="mt-1 text-xs text-muted-theme">Nascita:</div>
                  <div className="mt-1 text-base-theme font-medium">{fmtDateIT(player.birth_date)}</div>
                  <div className="mt-1 text-xs text-muted-theme">Maglia:</div>
                  <div className="mt-1 text-base-theme font-medium">{player.shirt_number ?? "—"}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-muted-theme">Account creato</div>
              <div className="mt-1 text-base-theme font-medium">{fmtDateTimeIT(userRow?.created_at ?? null)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGA 2: AZIONI (Staff/Password/Notifiche/Tema) | IN ARRIVO */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AZIONI */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">Info e Preferenze</h2>
          <p className="mt-1 text-sm text-muted-theme">Gestisci le funzioni del tuo account.</p>

          <div className="mt-4 space-y-3">
            {/* STAFF */}
            <button
              type="button"
              className="w-full rounded-xl border border-theme bg-panel-theme p-3 text-left"
              onClick={() => router.push("/app/staff")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-base-theme">Staff</div>
                  <div className="mt-1 text-xs text-muted-theme">Qui puoi vedere il tuo staff</div>
                </div>
                <div className="shrink-0 rounded-md border border-theme bg-panel-theme px-3 py-1 text-sm">
                  →
                </div>
              </div>
            </button>

            {/* PASSWORD */}
            <button
              type="button"
              className="w-full rounded-xl border border-theme bg-panel-theme p-3 text-left"
              onClick={() => {
                setPwdError(null);
                setPwdOk(null);
                setPwdOpen(true);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-base-theme">Password</div>
                  <div className="mt-1 text-xs text-muted-theme">Qui puoi modificare la tua password</div>
                </div>
                <div className="shrink-0 rounded-md border border-theme bg-panel-theme px-3 py-1 text-sm">
                  →
                </div>
              </div>
            </button>

            {/* NOTIFICHE */}
            <button
              type="button"
              className="w-full rounded-xl border border-theme bg-panel-theme p-3 text-left"
              onClick={() => setNotifOpen(true)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-base-theme">Notifiche</div>
                  <div className="mt-1 text-xs text-muted-theme">Qui potrai gestire le tue notifiche</div>
                </div>
                <div className="shrink-0 rounded-md border border-theme bg-panel-theme px-3 py-1 text-sm">
                  →
                </div>
              </div>
            </button>

            {/* TEMA */}
            <button
              type="button"
              className="w-full rounded-xl border border-theme bg-panel-theme p-3 text-left"
              onClick={() => {
                loadThemePref();
                setThemeOpen(true);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-base-theme">Tema</div>
                  <div className="mt-1 text-xs text-muted-theme">{themeLabel(themePref)}</div>
                </div>
                <div className="shrink-0 rounded-md border border-theme bg-panel-theme px-3 py-1 text-sm">
                  →
                </div>
              </div>
            </button>

            {isAdmin ? (
              <div className="text-[11px] text-muted-theme">
                Nota: solo l’Admin può creare/eliminare membri dello staff.
              </div>
            ) : null}
          </div>
        </div>

        {/* IN ARRIVO (come tuo) */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-base-theme">In arrivo</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-theme">
            <li>• Notifiche (solo admin per regole globali)...</li>
            <li>• Privacy (consensi, export dati, gestione allegati)...</li>
            <li>• Gestione membri (aggiungi staff, disattiva/gestisci giocatori)✅</li>
            <li>• Tema app per utente ✅</li>
          </ul>

          <p className="mt-4 text-xs text-muted-theme">
            Nota per Raffaele: dopo un mese questo è già una base semifunzionante, ci vorra del altro tempo per testarla e
            perfezionarla 🥲.
          </p>
        </div>
      </div>

      {/* ===== MODAL PASSWORD ===== */}
      {pwdOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi"
            onClick={() => setPwdOpen(false)}
          />

          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-base-theme">Password</h2>
                  <p className="mt-1 text-sm text-muted-theme">Per sicurezza richiediamo la password attuale.</p>
                </div>

                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                  onClick={() => setPwdOpen(false)}
                  title="Chiudi"
                >
                  ✖️
                </button>
              </div>

              {isLocked && (
                <div className="mt-3 rounded-md border border-theme bg-panel-theme px-3 py-2 text-xs text-muted-theme">
                  Bloccato: {formatSecondsLeft(lockLeft)}
                </div>
              )}

              {pwdError && <p className="mt-3 text-sm text-rose-500">{pwdError}</p>}
              {pwdOk && <p className="mt-3 text-sm text-emerald-500">{pwdOk}</p>}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Password attuale</label>
                  <div className="flex gap-2">
                    <input
                      type={showOld ? "text" : "password"}
                      className={inputClass}
                      value={oldPwd}
                      onChange={(e) => setOldPwd(e.target.value)}
                      placeholder="Inserisci la password attuale"
                      disabled={savingPwd || isLocked}
                    />
                    <button
                      type="button"
                      className="h-11 shrink-0 rounded-md border border-theme bg-panel-theme px-3 text-sm"
                      onClick={() => setShowOld((v) => !v)}
                      disabled={savingPwd}
                      title={showOld ? "Nascondi" : "Mostra"}
                    >
                      {showOld ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Nuova password</label>
                  <div className="flex gap-2">
                    <input
                      type={showNew ? "text" : "password"}
                      className={inputClass}
                      value={pwd1}
                      onChange={(e) => setPwd1(e.target.value)}
                      placeholder="Minimo 8 caratteri"
                      disabled={savingPwd || isLocked}
                    />
                    <button
                      type="button"
                      className="h-11 shrink-0 rounded-md border border-theme bg-panel-theme px-3 text-sm"
                      onClick={() => setShowNew((v) => !v)}
                      disabled={savingPwd}
                      title={showNew ? "Nascondi" : "Mostra"}
                    >
                      {showNew ? "🙈" : "👁️"}
                    </button>
                  </div>

                  <div className="mt-2 rounded-md border border-theme bg-panel-theme px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-muted-theme">
                      <span>
                        Sicurezza: <b className="text-base-theme">{passwordLabel(score)}</b>
                      </span>
                      <span>{score}/5</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded bg-black/20 overflow-hidden">
                      <div className="h-2 rounded bg-emerald-500" style={{ width: `${(score / 5) * 100}%` }} />
                    </div>
                    <div className="mt-2 text-[11px] text-muted-theme">
                      Suggerimento: usa maiuscole, numeri e simboli.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-theme">Conferma password</label>
                  <div className="flex gap-2">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className={inputClass}
                      value={pwd2}
                      onChange={(e) => setPwd2(e.target.value)}
                      placeholder="Ripeti password"
                      disabled={savingPwd || isLocked}
                    />
                    <button
                      type="button"
                      className="h-11 shrink-0 rounded-md border border-theme bg-panel-theme px-3 text-sm"
                      onClick={() => setShowConfirm((v) => !v)}
                      disabled={savingPwd}
                      title={showConfirm ? "Nascondi" : "Mostra"}
                    >
                      {showConfirm ? "🙈" : "👁️"}
                    </button>
                  </div>

                  {pwd2 && pwd1 !== pwd2 && (
                    <div className="mt-2 text-xs text-rose-500">Le password non coincidono.</div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                onClick={changePassword}
                disabled={!canSavePwd || savingPwd}
                style={{ opacity: canSavePwd && !savingPwd ? 1 : 0.6 }}
              >
                {savingPwd ? "Aggiornamento..." : "Aggiorna password"}
              </button>

              <div className="mt-4">
                <button
                  type="button"
                  className="w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                  onClick={sendResetEmail}
                  disabled={sendingReset}
                  style={{ opacity: sendingReset ? 0.6 : 1 }}
                >
                  {sendingReset ? "Invio..." : "Ho dimenticato la password (email reset)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL NOTIFICHE ===== */}
      {notifOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi"
            onClick={() => setNotifOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-base-theme">Notifiche</h2>
                  <p className="mt-1 text-sm text-muted-theme">Attualmente stiamo lavorando su questa nuova funzione.</p>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                  onClick={() => setNotifOpen(false)}
                  title="Chiudi"
                >
                  ✖️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL TEMA ===== */}
      {themeOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi"
            onClick={() => setThemeOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-base-theme">Tema</h2>
                  <p className="mt-1 text-sm text-muted-theme">Scegli come vuoi vedere l’app.</p>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                  onClick={() => setThemeOpen(false)}
                  title="Chiudi"
                >
                  ✖️
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {(["system", "light", "dark"] as ThemePref[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="w-full rounded-xl border border-theme bg-panel-theme px-4 py-3 text-left"
                    onClick={() => applyThemeChoice(v)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-base-theme font-medium">
                        {v === "system" ? "Sistema" : v === "light" ? "Chiaro" : "Oscuro"}
                      </div>
                      <div className="text-sm text-muted-theme">{themePref === v ? "✓" : ""}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-xs text-muted-theme">
                Questa scelta è salvata solo per te su questo dispositivo (localStorage).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}