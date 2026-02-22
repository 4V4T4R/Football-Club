"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InviteRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash || "";

    // Supabase invite arriva così:
    // /#access_token=...&refresh_token=...&type=invite
    if (hash.includes("type=invite") && hash.includes("access_token=")) {
      router.replace("/imposta-password" + hash);
    }
  }, [router]);

  return null;
}