"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      if (!userId) {
        router.replace("/login");
        return;
      }

      // controlla se è player
      const { data: player } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (player?.id) {
        router.replace(`/giocatori/${player.id}`);
        return;
      }

      // controlla se è staff/admin
      const { data: member } = await supabase
        .from("club_members")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (member?.id) {
        router.replace(`/staff/${member.id}`);
        return;
      }

      router.replace("/");
    }

    load();
  }, [router]);

  return (
    <div className="card p-8">
      Caricamento profilo...
    </div>
  );
}