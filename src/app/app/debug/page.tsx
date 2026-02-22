"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugPage() {
  const [out, setOut] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;

      let clubMembers: any = null;
      let clubMembersErr: any = null;

      let myPlayer: any = null;
      let myPlayerErr: any = null;

      if (uid) {
        const m = await supabase
          .from("club_members")
          .select("club_id, user_id, role")
          .eq("user_id", uid);

        clubMembers = m.data;
        clubMembersErr = m.error;

        const p = await supabase
          .from("players")
          .select("id, club_id, user_id")
          .eq("user_id", uid);

        myPlayer = p.data;
        myPlayerErr = p.error;
      }

      setOut({ uid, clubMembers, clubMembersErr, myPlayer, myPlayerErr });
    })();
  }, []);

  return (
    <div className="card p-8">
      <h1 className="text-xl font-semibold">Debug</h1>
      <pre className="mt-4 text-xs overflow-auto">
        {JSON.stringify(out, null, 2)}
      </pre>
    </div>
  );
}