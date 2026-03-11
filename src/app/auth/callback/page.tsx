"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Accesso in corso...");

  useEffect(() => {
    async function handleAuth() {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/";

      if (!code) {
        setMessage("Link non valido: manca il codice.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage("Errore durante il login: " + error.message);
        return;
      }

      router.replace(next);
    }

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="card p-8">
      <div className="text-base-theme font-semibold">Autenticazione</div>
      <div className="mt-2 text-muted-theme">{message}</div>
    </div>
  );
}