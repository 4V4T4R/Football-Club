"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Staff = {
  id: string;
  role: string | null;
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

  useEffect(() => {
    async function load() {

      const { data: staffData } = await supabase
        .from("club_members")
        .select("id, role, user_id")
        .eq("id", staffId)
        .single();

      if (!staffData) return;

      setStaff(staffData);

      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", staffData.user_id)
        .single();

      setUser(userData);
    }

    load();
  }, [staffId]);

  if (!staff || !user) {
    return <div className="card p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="card p-8">
        <div className="flex items-center gap-6">

          <div className="h-24 w-24 rounded-xl bg-panel-theme flex items-center justify-center text-3xl">
            👤
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-base-theme">
              {user.first_name} {user.last_name}
            </h1>

            <p className="text-muted-theme">
              {staff.role ?? "Staff"}
            </p>
          </div>

        </div>
      </div>

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