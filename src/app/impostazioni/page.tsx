"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { setThemePref } from "@/components/ThemeClient";
import { resolveActiveClub } from "@/lib/activeClub";
import { getClubBackgroundUrl, getClubDisplayName, getClubLogoUrl } from "@/lib/clubBranding";

type Club = {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  logo_url: string | null;
  background_url: string | null;
  website_url: string | null;
};

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
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  document_expiry: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
};

type MemberRow = {
  club_id: string;
  role: string;
  created_at: string;
  birth_date: string | null;
  avatar_url: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  document_expiry: string | null;
};

type ThemePref = "system" | "light" | "dark";

type NotificationPrefs = {
  enabled: boolean;
  event_created: boolean;
  convocation: boolean;
  event_changed: boolean;
  document_expiry: boolean;
};

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

function documentLabel(type: string | null | undefined) {
  if (!type) return "—";
  if (type === "carta_identita") return "Carta d'identità";
  if (type === "patente") return "Patente";
  if (type === "passaporto") return "Passaporto";
  return type;
}

function documentStatus(expiry: string | null | undefined) {
  if (!expiry) return null;
  const today = new Date();
  const exp = new Date(expiry);
  const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "scaduto";
  if (diff < 30) return "in scadenza";
  return "valido";
}

export default function Page() {
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
  const [editPhone, setEditPhone] = useState("");
  const [editDocumentType, setEditDocumentType] = useState("");
  const [editDocumentNumber, setEditDocumentNumber] = useState("");
  const [editDocumentExpiry, setEditDocumentExpiry] = useState("");
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
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    enabled: true,
    event_created: true,
    convocation: true,
    event_changed: true,
    document_expiry: true,
  });
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);
  const [notifPrefsError, setNotifPrefsError] = useState<string | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themePref, setThemePrefState] = useState<ThemePref>("system");
  const [brandDisplayName, setBrandDisplayName] = useState("");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandBackgroundFile, setBrandBackgroundFile] = useState<File | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const brandLogoInputRef = useRef<HTMLInputElement | null>(null);
  const brandBackgroundInputRef = useRef<HTMLInputElement | null>(null);

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
      (editBirth ?? "") !== (member?.birth_date ?? "") ||
      (editPhone ?? "") !== (player?.phone ?? member?.phone ?? "") ||
      (editDocumentType ?? "") !== (player?.document_type ?? member?.document_type ?? "") ||
      (editDocumentNumber ?? "") !== (player?.document_number ?? member?.document_number ?? "") ||
      (editDocumentExpiry ?? "") !== (player?.document_expiry ?? member?.document_expiry ?? "");

    return changed;
  }, [
    isStaffOrAdmin,
    profileEditing,
    editFirst,
    editLast,
    editBirth,
    editPhone,
    editDocumentType,
    editDocumentNumber,
    editDocumentExpiry,
    userRow,
    member,
    player,
  ]);

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

    const active = await resolveActiveClub(supabase, userId);

    let { data: m, error: mErr } = await supabase
      .from("club_members")
      .select("club_id, role, created_at, birth_date, avatar_url, phone, document_type, document_number, document_expiry")
      .eq("user_id", userId)
      .eq("club_id", active.clubId)
      .maybeSingle();

    const memberErrMessage = mErr?.message ?? "";

    if (
      mErr &&
      ["avatar_url", "phone", "document_type", "document_number", "document_expiry"].some((col) =>
        memberErrMessage.includes(col)
      )
    ) {
      const fallback = await supabase
        .from("club_members")
        .select("club_id, role, created_at, birth_date")
        .eq("user_id", userId)
        .eq("club_id", active.clubId)
        .maybeSingle();

      m = fallback.data
        ? {
            ...fallback.data,
            avatar_url: null,
            phone: null,
            document_type: null,
            document_number: null,
            document_expiry: null,
          }
        : null;
      mErr = fallback.error;
    }

    if (mErr) {
      setError("Errore club_members: " + mErr.message);
      setLoading(false);
      return;
    }

    setMember((m as MemberRow | null) ?? null);
    setEditBirth(m?.birth_date ?? "");

    const { data: p, error: pErr } = await supabase
      .from("players")
      .select("id, club_id, first_name, last_name, birth_date, shirt_number, user_id, phone, document_type, document_number, document_expiry, avatar_url, active, created_at")
      .eq("user_id", userId)
      .eq("club_id", active.clubId)
      .maybeSingle();

    if (pErr) {
      setError("Errore players: " + pErr.message);
      setLoading(false);
      return;
    }

    setPlayer((p as PlayerRow | null) ?? null);
    setEditPhone(p?.phone ?? m?.phone ?? "");
    setEditDocumentType(p?.document_type ?? m?.document_type ?? "");
    setEditDocumentNumber(p?.document_number ?? m?.document_number ?? "");
    setEditDocumentExpiry(p?.document_expiry ?? m?.document_expiry ?? "");

    const clubId = active.clubId ?? (m?.club_id as string | undefined) ?? (p?.club_id as string | undefined) ?? null;

    if (clubId) {
      const { data: c, error: cErr } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .maybeSingle();

      if (cErr) {
        setError("Errore clubs: " + cErr.message);
        setLoading(false);
        return;
      }

      const clubRow = (c as Club | null) ?? null;
      setClub(clubRow);
      setBrandDisplayName(clubRow?.display_name ?? clubRow?.name ?? "");
      setBrandWebsiteUrl(clubRow?.website_url ?? "");
    } else {
      setClub(null);
      setBrandDisplayName("");
      setBrandWebsiteUrl("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    loadThemePref();
  }, []);

  useEffect(() => {
    if (notifOpen) {
      loadNotificationPrefs();
    }
  }, [notifOpen, club?.id]);

  useEffect(() => {
    function openPanel(panel: string | null) {
    if (panel === "password") {
      setPwdError(null);
      setPwdOk(null);
      setPwdOpen(true);
      setNotifOpen(false);
      setThemeOpen(false);
    }

    if (panel === "notifiche") {
      setNotifOpen(true);
      setPwdOpen(false);
      setThemeOpen(false);
    }

    if (panel === "tema") {
      loadThemePref();
      setThemeOpen(true);
      setPwdOpen(false);
      setNotifOpen(false);
    }
    }

    openPanel(new URLSearchParams(window.location.search).get("panel"));

    function onSettingsPanel(event: Event) {
      const panel = (event as CustomEvent<string>).detail;
      openPanel(panel);
    }

    window.addEventListener("footballclub:settings-panel", onSettingsPanel);
    return () => window.removeEventListener("footballclub:settings-panel", onSettingsPanel);
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
    setEditPhone(player?.phone ?? member?.phone ?? "");
    setEditDocumentType(player?.document_type ?? member?.document_type ?? "");
    setEditDocumentNumber(player?.document_number ?? member?.document_number ?? "");
    setEditDocumentExpiry(player?.document_expiry ?? member?.document_expiry ?? "");
  }

  function clearSettingsPanel() {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("panel")) return;
    window.history.replaceState(null, "", window.location.pathname);
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
    const phone = editPhone.trim() ? editPhone.trim() : null;
    const documentType = editDocumentType.trim() ? editDocumentType.trim() : null;
    const documentNumber = editDocumentNumber.trim() ? editDocumentNumber.trim() : null;
    const documentExpiry = editDocumentExpiry.trim() ? editDocumentExpiry.trim() : null;

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
      const memberUpdate: Record<string, string | null> = { birth_date: birth };

      if (!player?.id) {
        memberUpdate.phone = phone;
        memberUpdate.document_type = documentType;
        memberUpdate.document_number = documentNumber;
        memberUpdate.document_expiry = documentExpiry;
      }

      const { error: updMemberErr } = await supabase
        .from("club_members")
        .update(memberUpdate)
        .eq("user_id", userId)
        .eq("club_id", member?.club_id);

      if (updMemberErr) {
        setError(
          updMemberErr.message.includes("document_") || updMemberErr.message.includes("phone")
            ? "Per salvare telefono/documenti staff esegui prima la migration club_members profilo."
            : updMemberErr.message
        );
        setSavingProfile(false);
        return;
      }

      // 3) se è anche player: aggiorna dati profilo giocatore
      if (player?.id) {
        const { error: updPlayerErr } = await supabase
          .from("players")
          .update({
            birth_date: birth ?? player.birth_date,
            phone,
            document_type: documentType,
            document_number: documentNumber,
            document_expiry: documentExpiry,
          })
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

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !isAdmin) return;

    setSavingBranding(true);
    setError(null);
    setOk(null);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    if (!token) {
      setError("Sessione non valida.");
      setSavingBranding(false);
      return;
    }

    const form = new FormData();
    form.set("club_id", club.id);
    form.set("display_name", brandDisplayName.trim());
    form.set("website_url", brandWebsiteUrl.trim());
    if (brandLogoFile) form.set("logo", brandLogoFile);
    if (brandBackgroundFile) form.set("background", brandBackgroundFile);

    const res = await fetch("/api/clubs/branding", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json?.error ?? "Errore aggiornamento branding squadra.");
      setSavingBranding(false);
      return;
    }

    setBrandLogoFile(null);
    setBrandBackgroundFile(null);
    if (brandLogoInputRef.current) brandLogoInputRef.current.value = "";
    if (brandBackgroundInputRef.current) brandBackgroundInputRef.current.value = "";
    setOk("Branding squadra aggiornato.");
    setSavingBranding(false);
    await loadAll();
  }

  async function uploadOwnProfilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !member || !isStaffOrAdmin) return;

    setError(null);
    setOk(null);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    if (!token) {
      setError("Sessione non valida.");
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);

    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const MAX = 512;
      let width = img.width;
      let height = img.height;

      if (width > height && width > MAX) {
        height *= MAX / width;
        width = MAX;
      } else if (height > MAX) {
        width *= MAX / height;
        height = MAX;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `staff/${member.club_id}-${Date.now()}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
          });

        if (uploadErr) {
          setError(uploadErr.message);
          return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

        const res = await fetch("/api/staff/avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            club_id: member.club_id,
            avatar_url: data.publicUrl,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          await supabase.storage.from("avatars").remove([fileName]);
          setError(json?.error ?? "Errore aggiornamento foto profilo.");
          return;
        }

        if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
        setOk("Foto profilo aggiornata.");
        await loadAll();
      }, "image/jpeg", 0.8);
    };
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

  function applyThemeChoice(v: ThemePref) {
    setThemePrefState(v);
    setThemePref(v);
  }

  async function loadNotificationPrefs() {
    if (!club?.id) return;

    setNotifPrefsLoading(true);
    setNotifPrefsError(null);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    if (!token) {
      setNotifPrefsError("Sessione non valida.");
      setNotifPrefsLoading(false);
      return;
    }

    const res = await fetch(`/api/notifications/preferences?club_id=${encodeURIComponent(club.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setNotifPrefsError(
        json?.error?.includes("notification_preferences")
          ? "Per usare le notifiche esegui prima la migration notifiche su Supabase."
          : json?.error ?? "Errore caricamento preferenze notifiche."
      );
      setNotifPrefsLoading(false);
      return;
    }

    setNotifPrefs(json.preferences as NotificationPrefs);
    setNotifPrefsLoading(false);
  }

  function updateNotifPref<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function saveNotificationPrefs(e: React.FormEvent) {
    e.preventDefault();
    if (!club?.id) return;

    setNotifPrefsSaving(true);
    setNotifPrefsError(null);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    if (!token) {
      setNotifPrefsError("Sessione non valida.");
      setNotifPrefsSaving(false);
      return;
    }

    const res = await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        club_id: club.id,
        ...notifPrefs,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setNotifPrefsError(json?.error ?? "Errore salvataggio preferenze.");
      setNotifPrefsSaving(false);
      return;
    }

    setNotifPrefs(json.preferences as NotificationPrefs);
    setNotifPrefsSaving(false);
    setOk("Preferenze notifiche aggiornate.");
    setNotifOpen(false);
    clearSettingsPanel();
  }

  if (loading) return <div className="card p-8">Caricamento…</div>;

  const profileAvatarUrl = member?.avatar_url ?? player?.avatar_url ?? null;
  const profilePhone = player?.phone ?? member?.phone ?? null;
  const profileDocumentType = player?.document_type ?? member?.document_type ?? null;
  const profileDocumentNumber = player?.document_number ?? member?.document_number ?? null;
  const profileDocumentExpiry = player?.document_expiry ?? member?.document_expiry ?? null;
  const hasPhone = Boolean(profilePhone?.trim());
  const hasDocument = Boolean(profileDocumentType || profileDocumentNumber);
  const hasDocumentExpiry = Boolean(profileDocumentExpiry);

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Impostazioni</h1>
        <p className="mt-3 text-muted-theme">Account e preferenze.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald-600">{ok}</p>}
      </div>

      <div className="card p-4 md:hidden">
        <h2 className="text-base font-semibold text-base-theme">Preferenze</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/staff"
            className="rounded-md border border-theme bg-panel-theme px-3 py-3 text-center text-sm"
          >
            Staff
          </Link>
          <button
            type="button"
            className="rounded-md border border-theme bg-panel-theme px-3 py-3 text-sm"
            onClick={() => {
              setPwdError(null);
              setPwdOk(null);
              setPwdOpen(true);
            }}
          >
            Password
          </button>
          <button
            type="button"
            className="rounded-md border border-theme bg-panel-theme px-3 py-3 text-sm"
            onClick={() => setNotifOpen(true)}
          >
            Notifiche
          </button>
          <button
            type="button"
            className="rounded-md border border-theme bg-panel-theme px-3 py-3 text-sm"
            onClick={() => {
              loadThemePref();
              setThemeOpen(true);
            }}
          >
            Tema
          </button>
        </div>
      </div>

      {/* RIGA 1: PROFILO | SQUADRA */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PROFILO */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                className={[
                  "h-24 w-20 shrink-0 overflow-hidden rounded-md border border-theme bg-panel-theme",
                  isStaffOrAdmin ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
                onClick={() => {
                  if (isStaffOrAdmin) profilePhotoInputRef.current?.click();
                }}
                title={isStaffOrAdmin ? "Modifica foto profilo" : undefined}
              >
                {profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt={`${editFirst} ${editLast}`.trim() || "Profilo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    👤
                  </div>
                )}
              </button>

              {isStaffOrAdmin ? (
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadOwnProfilePhoto}
                />
              ) : null}

              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-base-theme">Profilo</h2>
                <div className="mt-1 truncate text-sm text-muted-theme">
                  {roleLabel(member?.role ?? null, !!player)}
                  {player?.shirt_number ? ` • #${player.shirt_number}` : ""}
                </div>
              </div>
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

            {profileEditing && isStaffOrAdmin ? (
              <div>
                <label className="mb-1 block text-xs text-muted-theme">Telefono</label>
                <input
                  className={inputClass}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
            ) : hasPhone ? (
              <div>
                <div className="text-xs text-muted-theme">Telefono</div>
                <div className="mt-1 text-base-theme font-medium">{profilePhone}</div>
              </div>
            ) : null}

            {profileEditing && isStaffOrAdmin ? (
              <div>
                <label className="mb-1 block text-xs text-muted-theme">Documento</label>
                <select
                  className={inputClass}
                  value={editDocumentType}
                  onChange={(e) => setEditDocumentType(e.target.value)}
                >
                  <option value="">Nessun documento</option>
                  <option value="carta_identita">Carta d'identità</option>
                  <option value="patente">Patente</option>
                  <option value="passaporto">Passaporto</option>
                </select>
              </div>
            ) : hasDocument ? (
              <div>
                <div className="text-xs text-muted-theme">Documento</div>
                <div className="mt-1 text-base-theme font-medium">
                  {documentLabel(profileDocumentType)}
                </div>
                {profileDocumentNumber ? (
                  <div className="mt-1 text-xs text-muted-theme">
                    {profileDocumentNumber}
                  </div>
                ) : null}
              </div>
            ) : null}

            {profileEditing && isStaffOrAdmin ? (
              <div>
                <label className="mb-1 block text-xs text-muted-theme">Numero documento</label>
                <input
                  className={inputClass}
                  value={editDocumentNumber}
                  onChange={(e) => setEditDocumentNumber(e.target.value)}
                  disabled={!editDocumentType}
                />
              </div>
            ) : null}

            {profileEditing && isStaffOrAdmin ? (
              <div>
                <label className="mb-1 block text-xs text-muted-theme">Scadenza documento</label>
                <input
                  type="date"
                  className={inputClass}
                  value={editDocumentExpiry}
                  onChange={(e) => setEditDocumentExpiry(e.target.value)}
                  disabled={!editDocumentType}
                />
              </div>
            ) : hasDocumentExpiry ? (
              <div>
                <div className="text-xs text-muted-theme">Scadenza documento</div>
                <div className="mt-1 text-base-theme font-medium">
                  {fmtDateIT(profileDocumentExpiry)}
                </div>
                {documentStatus(profileDocumentExpiry) ? (
                  <div
                    className={[
                      "mt-1 text-xs",
                      documentStatus(profileDocumentExpiry) === "scaduto"
                        ? "text-red-500"
                        : documentStatus(profileDocumentExpiry) === "in scadenza"
                          ? "text-yellow-500"
                          : "text-emerald-500",
                    ].join(" ")}
                  >
                    {documentStatus(profileDocumentExpiry)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {player ? (
              <div>
                <div className="text-xs text-muted-theme">Stato</div>
                <div className="mt-1 text-base-theme font-medium">
                  {player.active ? "Attivo" : "Non attivo"}
                </div>
              </div>
            ) : null}
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

          {isAdmin && club ? (
            <form className="mt-6 border-t border-theme pt-4" onSubmit={saveBranding}>
              <h3 className="font-semibold text-base-theme">Branding squadra</h3>

              <div className="mt-4 grid gap-4">
                <input
                  ref={brandLogoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setBrandLogoFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={brandBackgroundInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setBrandBackgroundFile(e.target.files?.[0] ?? null)}
                />

                <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
                  <div>
                    <div className="text-xs text-muted-theme">Logo attuale</div>
                    <button
                      type="button"
                      className="mt-2 h-24 w-24 overflow-hidden rounded-md border border-theme bg-panel-theme p-2"
                      onClick={() => brandLogoInputRef.current?.click()}
                      title="Modifica logo squadra"
                    >
                      <img
                        src={getClubLogoUrl(club)}
                        alt={getClubDisplayName(club)}
                        className="h-full w-full object-contain"
                      />
                    </button>
                    {brandLogoFile ? (
                      <div className="mt-2 text-xs text-muted-theme">Nuovo logo selezionato</div>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-theme">Nome visualizzato</label>
                      <input
                        className={inputClass}
                        value={brandDisplayName}
                        onChange={(e) => setBrandDisplayName(e.target.value)}
                        placeholder={club.name}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted-theme">Sito web</label>
                      <input
                        className={inputClass}
                        value={brandWebsiteUrl}
                        onChange={(e) => setBrandWebsiteUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-muted-theme">Sfondo app</div>
                  <button
                    type="button"
                    className="h-28 w-full overflow-hidden rounded-md border border-theme bg-panel-theme"
                    onClick={() => brandBackgroundInputRef.current?.click()}
                    title="Modifica sfondo app"
                  >
                    <img
                      src={getClubBackgroundUrl(club)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {brandBackgroundFile ? (
                    <div className="mt-2 text-xs text-muted-theme">Nuovo sfondo selezionato</div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                  disabled={savingBranding}
                  style={{ opacity: savingBranding ? 0.6 : 1 }}
                >
                  {savingBranding ? "Salvataggio..." : "Salva branding"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      {/* ===== MODAL PASSWORD ===== */}
      {pwdOpen && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Chiudi"
            onClick={() => {
              setPwdOpen(false);
              clearSettingsPanel();
            }}
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
                  onClick={() => {
                    setPwdOpen(false);
                    clearSettingsPanel();
                  }}
                  title="Chiudi"
                  aria-label="Chiudi password"
                >
                  ✕
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
                      aria-label={showOld ? "Nascondi password attuale" : "Mostra password attuale"}
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
                      aria-label={showNew ? "Nascondi nuova password" : "Mostra nuova password"}
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
                      aria-label={showConfirm ? "Nascondi conferma password" : "Mostra conferma password"}
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
            onClick={() => {
              setNotifOpen(false);
              clearSettingsPanel();
            }}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-base-theme">Notifiche</h2>
                  <p className="mt-1 text-sm text-muted-theme">Scegli cosa vuoi ricevere.</p>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                  onClick={() => {
                    setNotifOpen(false);
                    clearSettingsPanel();
                  }}
                  title="Chiudi"
                  aria-label="Chiudi notifiche"
                >
                  ✕
                </button>
              </div>

              {notifPrefsError ? (
                <p className="mt-4 text-sm text-red-600">{notifPrefsError}</p>
              ) : null}

              {notifPrefsLoading ? (
                <p className="mt-4 text-sm text-muted-theme">Caricamento...</p>
              ) : (
                <form className="mt-4 space-y-3" onSubmit={saveNotificationPrefs}>
                  <label className="flex items-center justify-between gap-4 rounded-md border border-theme bg-panel-theme p-3">
                    <span>
                      <span className="block font-medium text-base-theme">Notifiche attive</span>
                      <span className="mt-1 block text-xs text-muted-theme">Abilita o disabilita tutte le notifiche.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.enabled}
                      onChange={(e) => updateNotifPref("enabled", e.target.checked)}
                    />
                  </label>

                  <div className={notifPrefs.enabled ? "space-y-3" : "space-y-3 opacity-50"}>
                    <label className="flex items-center justify-between gap-4 rounded-md border border-theme bg-panel-theme p-3">
                      <span>
                        <span className="block font-medium text-base-theme">Nuovi eventi</span>
                        <span className="mt-1 block text-xs text-muted-theme">Quando lo staff crea un allenamento, partita o riunione.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={notifPrefs.event_created}
                        disabled={!notifPrefs.enabled}
                        onChange={(e) => updateNotifPref("event_created", e.target.checked)}
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-md border border-theme bg-panel-theme p-3">
                      <span>
                        <span className="block font-medium text-base-theme">Convocazioni</span>
                        <span className="mt-1 block text-xs text-muted-theme">Solo quando sei tra i giocatori convocati.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={notifPrefs.convocation}
                        disabled={!notifPrefs.enabled}
                        onChange={(e) => updateNotifPref("convocation", e.target.checked)}
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-md border border-theme bg-panel-theme p-3">
                      <span>
                        <span className="block font-medium text-base-theme">Eventi modificati o cancellati</span>
                        <span className="mt-1 block text-xs text-muted-theme">Solo se facevi parte di quell'evento.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={notifPrefs.event_changed}
                        disabled={!notifPrefs.enabled}
                        onChange={(e) => updateNotifPref("event_changed", e.target.checked)}
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-md border border-theme bg-panel-theme p-3">
                      <span>
                        <span className="block font-medium text-base-theme">Documenti in scadenza</span>
                        <span className="mt-1 block text-xs text-muted-theme">Promemoria quando un documento sta per scadere.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={notifPrefs.document_expiry}
                        disabled={!notifPrefs.enabled}
                        onChange={(e) => updateNotifPref("document_expiry", e.target.checked)}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
                    disabled={notifPrefsSaving}
                    style={{ opacity: notifPrefsSaving ? 0.6 : 1 }}
                  >
                    {notifPrefsSaving ? "Salvataggio..." : "Salva preferenze"}
                  </button>
                </form>
              )}
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
            onClick={() => {
              setThemeOpen(false);
              clearSettingsPanel();
            }}
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
                  onClick={() => {
                    setThemeOpen(false);
                    clearSettingsPanel();
                  }}
                  title="Chiudi"
                  aria-label="Chiudi tema"
                >
                  ✕
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
