// app/app/impostazioni/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

function fmtDateIT(isoOrYmd: string | null | undefined) {
  if (!isoOrYmd) return "—";
  const s = isoOrYmd.includes("T") ? isoOrYmd.split("T")[0] : isoOrYmd; // YYYY-MM-DD
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

function roleLabel(r: string | null) {
  if (!r) return "—";
  if (r === "admin") return "Admin";
  if (r === "staff") return "Staff";
  if (r === "viewer") return "Viewer";
  return r;
}

export default function Page() {
  const [loading, setLoading] = useState(true);

  // messaggi globali (profilo, reset email, ecc.)
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // messaggi SOLO password (da mostrare nel box password)
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState<string | null>(null);

  const [club, setClub] = useState<Club | null>(null);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);

  const [authEmail, setAuthEmail] = useState<string | null>(null);

  // edit profilo (solo staff/admin)
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // password
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

  const isStaffOrAdmin = useMemo(() => {
    return ["admin", "staff"].includes(member?.role ?? "");
  }, [member?.role]);

  const canSaveProfile = useMemo(() => {
    if (!isStaffOrAdmin) return false;
    return editFirst.trim().length > 0 || editLast.trim().length > 0;
  }, [isStaffOrAdmin, editFirst, editLast]);

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

    const { data: p, error: pErr } = await supabase
      .from("players")
      .select(
        "id, club_id, first_name, last_name, birth_date, shirt_number, user_id, active, created_at"
      )
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
  }, []);

  async function saveProfile() {
    if (!isStaffOrAdmin) return;
    if (!userRow?.id) return;

    setSavingProfile(true);
    setError(null);
    setOk(null);

    const payload: Partial<UserRow> = {
      first_name: editFirst.trim() ? editFirst.trim() : null,
      last_name: editLast.trim() ? editLast.trim() : null,
    };

    const { error: updErr } = await supabase.from("users").update(payload).eq("id", userRow.id);

    if (updErr) {
      setError(updErr.message);
      setSavingProfile(false);
      return;
    }

    setOk("Profilo aggiornato.");
    setSavingProfile(false);
    await loadAll();
  }

  async function changePassword() {
    if (!canSavePwd) return;

    setSavingPwd(true);

    // messaggi password SOLO nel box password
    setPwdError(null);
    setPwdOk(null);

    // NON tocchiamo i messaggi globali qui
    // setError(null); setOk(null);

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

    // re-auth ok
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
      redirectTo:
        typeof window !== "undefined" ? window.location.origin + "/imposta-password" : undefined,
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

  if (loading) return <div className="card p-8">Caricamento…</div>;

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Impostazioni</h1>
        <p className="mt-3 text-muted-theme">Account e preferenze.</p>

        {/* messaggi globali (NO password) */}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald-600">{ok}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* PROFILO */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-base-theme">Profilo</h2>
            <p className="mt-1 text-sm text-muted-theme">
              {isStaffOrAdmin
                ? "Puoi modificare nome e cognome (solo staff/admin)."
                : "Nome e cognome modificabili solo dallo staff."}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-theme">Nome</label>
                <input
                  className="w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
                  value={editFirst}
                  onChange={(e) => setEditFirst(e.target.value)}
                  disabled={!isStaffOrAdmin}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-theme">Cognome</label>
                <input
                  className="w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
                  value={editLast}
                  onChange={(e) => setEditLast(e.target.value)}
                  disabled={!isStaffOrAdmin}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-theme">Email</label>
                <input
                  className="w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm opacity-80"
                  value={authEmail ?? userRow?.email ?? ""}
                  readOnly
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                onClick={saveProfile}
                disabled={!canSaveProfile || savingProfile}
                style={{ opacity: !canSaveProfile || savingProfile ? 0.6 : 1 }}
              >
                {savingProfile ? "Salvataggio..." : "Salva profilo"}
              </button>
            </div>
          </div>

          {/* SQUADRA */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-base-theme">Squadra</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-theme">Squadra</div>
                <div className="mt-1 text-base-theme font-medium">{club?.name ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-theme">{club?.slug ?? ""}</div>
              </div>

              <div>
                <div className="text-xs text-muted-theme">Ruolo</div>
                <div className="mt-1 text-base-theme font-medium">
                  {roleLabel(member?.role ?? null)}
                </div>
                <div className="mt-1 text-xs text-muted-theme">
                  Attivo dal {fmtDateTimeIT(member?.created_at ?? null)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-theme">Sei anche giocatore?</div>
                <div className="mt-1 text-base-theme font-medium">{player ? "Sì" : "No"}</div>
                {player && (
                  <div className="mt-1 text-xs text-muted-theme">
                    Nascita: {fmtDateIT(player.birth_date)} • Maglia: {player.shirt_number ?? "—"} •{" "}
                    {player.active ? "Attivo" : "Non attivo"}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-muted-theme">Account creato</div>
                <div className="mt-1 text-base-theme font-medium">
                  {fmtDateTimeIT(userRow?.created_at ?? null)}
                </div>
              </div>
            </div>
          </div>

          {/* PASSWORD */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-base-theme">Password</h2>
                <p className="mt-1 text-sm text-muted-theme">
                  Per sicurezza richiediamo la password attuale.
                </p>
              </div>

              {isLocked && (
                <div className="rounded-md border border-theme bg-panel-theme px-3 py-2 text-xs text-muted-theme">
                  Bloccato: {formatSecondsLeft(lockLeft)}
                </div>
              )}
            </div>

            {/* ✅ messaggi password QUI */}
            {pwdError && <p className="mt-3 text-sm text-rose-500">{pwdError}</p>}
            {pwdOk && <p className="mt-3 text-sm text-emerald-500">{pwdOk}</p>}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-theme">Password attuale</label>
                <div className="flex gap-2">
                  <input
                    type={showOld ? "text" : "password"}
                    className="w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
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
                    className="w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
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
                    <div
                      className="h-2 rounded bg-emerald-500"
                      style={{ width: `${(score / 5) * 100}%` }}
                    />
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
                    className="w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm"
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

        {/* SIDEBAR */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-base-theme">In arrivo</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-theme">
              <li>• Notifiche (solo admin per regole globali)</li>
              <li>• Privacy (consensi, export dati, gestione allegati)</li>
              <li>• Gestione membri (aggiungi staff, disattiva/gestisci giocatori)</li>
              <li>• Tema app (solo admin)</li>
            </ul>

            <p className="mt-4 text-xs text-muted-theme">
              Nota: per “Gestione membri” conviene usare sempre “disattiva” invece di cancellare,
              come hai fatto coi giocatori.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}