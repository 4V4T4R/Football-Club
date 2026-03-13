"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useRef } from "react";

function roleBadge(role: string | null) {
  if (!role) return "bg-gray-500/20 text-gray-400";

  switch (role) {
    case "POR":
      return "bg-yellow-500/20 text-yellow-400";
    case "DEF":
      return "bg-green-500/20 text-green-400";
    case "CC":
      return "bg-blue-500/20 text-blue-400";
    case "ATT":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

function formatDateIT(date: string | null) {
  if (!date) return "—";

  const d = new Date(date);

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function calculateAge(date: string | null) {
  if (!date) return null;

  const birth = new Date(date);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age
}

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  shirt_number: number | null;
  role: string | null;
  phone: string | null;
  matricola: string | null;
  avatar_url: string | null;
  users: {
    email: string | null;
  } | null;
};

export default function PlayerProfile() {
  const params = useParams();
  const playerId = params.id as string;

  const [isStaff, setIsStaff] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      if (!userId) return;

      // ruolo utente
      const { data: member } = await supabase
        .from("club_members")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const role = member?.role ?? null;
      const staff = role === "admin" || role === "staff";

      setIsStaff(staff);

      // dati giocatore
      const { data } = await supabase
        .from("players")
        .select(`
          *,
          users (
            email
          )
        `)
        .eq("id", playerId)
        .single()

      if (!data) return;

      // se è player controlliamo che sia il suo
      if (!staff) {
        const { data: me } = await supabase
          .from("players")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!me || me.id !== playerId) {
          window.location.href = "/";
          return;
        }
      }

      setPlayer(data);
    }

    load();
  }, [playerId]);

  async function uploadAvatar(e: any) {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    // comprime immagine
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

      if (width > height) {
        if (width > MAX) {
          height *= MAX / width;
          width = MAX;
        }
      } else {
        if (height > MAX) {
          width *= MAX / height;
          height = MAX;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `${player.id}-${Date.now()}.jpg`;

        const { error } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
          });

        if (error) {
          console.error(error);
          return;
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        const url = data.publicUrl;

        await supabase
          .from("players")
          .update({ avatar_url: url })
          .eq("id", player.id);

        setPlayer({ ...player, avatar_url: url });
      }, "image/jpeg", 0.8);
    };
  }

  if (!player) {
    return <div className="card p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="card p-8">
        <div className="flex items-center gap-6">

          <div
            className="h-54 w-44 rounded-xl bg-panel-theme flex items-center justify-center text-3xl overflow-hidden cursor-pointer"
            onClick={() => {
              if (isStaff) fileInputRef.current?.click();
            }}
          >
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                className="h-full w-full object-cover"
              />
            ) : (
              "👤"
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={uploadAvatar}
          />

          <div>
            <h1 className="text-2xl font-semibold text-base-theme">
              {player.first_name} {player.last_name}
            </h1>

            <div className="mt-2 flex items-center gap-3">

                <span
                    className={`px-3 py-1 rounded-md text-xs font-semibold ${roleBadge(
                    player.role
                    )}`}
                >
                    {player.role ?? "—"}
                </span>

                {player.shirt_number && (
                    <span className="text-sm text-muted-theme">
                    #{player.shirt_number}
                    </span>
                )}

            </div>

          </div>

        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Dati personali</h2>

          <div className="space-y-2 text-sm">
            <div>Nascita: {formatDateIT(player.birth_date)} ({calculateAge(player.birth_date)} anni)</div>
            <div>Email: {player.users?.email ?? "—"}</div>
            <div>Telefono: {player.phone ?? "—"}</div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Dati squadra</h2>

          <div className="space-y-2 text-sm">
            <div>Numero maglia: {player.shirt_number ?? "—"}</div>
            <div>Ruolo: {player.role ?? "—"}</div>
            <div>Matricola: {player.matricola ?? "—"}</div>
          </div>
        </div>

      </div>
    </div>
  );
}