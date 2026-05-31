"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resolveActiveClub } from "@/lib/activeClub";

type Staff = {
  id: string;
  user_id: string;
  club_id: string;
  role: string | null;
  birth_date: string | null;
  title: string | null;
  avatar_url: string | null;
};

type User = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export default function StaffProfile() {
  const params = useParams();
  const staffId = params.id as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [canEditAvatar, setCanEditAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id ?? null;
      if (!userId) return;

      const active = await resolveActiveClub(supabase, userId);

      let { data: staffData, error: staffErr } = await supabase
        .from("club_members")
        .select("id, role, user_id, club_id, birth_date, title, avatar_url")
        .eq("id", staffId)
        .single();

      if (staffErr && staffErr.message.includes("avatar_url")) {
        const fallback = await supabase
          .from("club_members")
          .select("id, role, user_id, club_id, birth_date, title")
          .eq("id", staffId)
          .single();

        staffData = fallback.data ? { ...fallback.data, avatar_url: null } : null;
        staffErr = fallback.error;
      }

      if (!staffData) return;

      if (active.clubId && staffData.club_id !== active.clubId) {
        window.location.href = "/";
        return;
      }

      setStaff(staffData);
      setCanEditAvatar(
        staffData.user_id === userId ||
        (active.role === "admin" && staffData.role === "staff")
      );

      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", staffData.user_id)
        .single();

      setUser(userData);
    }

    load();
  }, [staffId]);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !staff || !canEditAvatar) return;

    setError(null);

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

        const fileName = `staff/${staff.id}-${Date.now()}.jpg`;

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
            member_id: staff.id,
            avatar_url: data.publicUrl,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          await supabase.storage.from("avatars").remove([fileName]);
          setError(json?.error ?? "Errore aggiornamento foto profilo.");
          return;
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
        setStaff({ ...staff, avatar_url: data.publicUrl });
      }, "image/jpeg", 0.8);
    };
  }

  if (!staff || !user) {
    return <div className="card p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="card p-8">
        <div className="flex items-center gap-6">

          <button
            type="button"
            className={[
              "h-24 w-24 overflow-hidden rounded-xl bg-panel-theme flex items-center justify-center text-3xl border border-theme",
              canEditAvatar ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
            onClick={() => {
              if (canEditAvatar) fileInputRef.current?.click();
            }}
            title={canEditAvatar ? "Modifica foto profilo" : undefined}
          >
            {staff.avatar_url ? (
              <img
                src={staff.avatar_url}
                alt={`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Staff"}
                className="h-full w-full object-cover"
              />
            ) : (
              "👤"
            )}
          </button>

          {canEditAvatar ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadAvatar}
            />
          ) : null}

          <div>
            <h1 className="text-2xl font-semibold text-base-theme">
              {user.first_name} {user.last_name}
            </h1>

            <p className="text-muted-theme">
              {(staff.title ?? "").trim() || staff.role || "Staff"}
            </p>
          </div>

        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-2">

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Dati personali</h2>

          <div className="space-y-2 text-sm">
            <div>Email: {user.email ?? "—"}</div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Ruolo società</h2>

          <div className="space-y-2 text-sm">
            <div>Ruolo: {staff.role ?? "—"}</div>
          </div>
        </div>

      </div>

    </div>
  );
}
