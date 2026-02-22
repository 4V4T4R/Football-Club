"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim() && pw.trim() && !loading;
  }, [email, pw, loading]);

  async function login() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/app");
  }

  async function magicLink() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/app`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setError("Ti ho inviato un link via email ✅");
  }

  return (
    <div className="relative -mx-[50vw] left-1/2 right-1/2 w-screen -mt-25 min-h-[calc(101svh-0rem)] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/assets/auth-bg.jpg"
          alt=""
          className="h-full w-full object-cover opacity-40"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.14),transparent_55%)]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/15 bg-black/35 p-8 shadow-[0_20px_60px_rgba(0,0,0,.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                ⚽️
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Accedi</h1>
                <p className="text-sm text-white/70">
                  Dashboard privata per staff e giocatori.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/70">Email</label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white placeholder-white/35 outline-none"
                  placeholder="nome@dominio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/70">Password</label>
                <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
                  <input
                    type={show ? "text" : "password"}
                    className="w-full bg-transparent px-3 py-2 text-white placeholder-white/35 outline-none"
                    placeholder="La tua password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-3 text-white/70 hover:text-white"
                    onClick={() => setShow((s) => !s)}
                    aria-label="Mostra/Nascondi password"
                    title="Mostra/Nascondi"
                  >
                    {show ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
                onClick={login}
                disabled={!canSubmit}
              >
                {loading ? "Accesso…" : "Entra"}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/15" />
                <div className="text-xs text-white/50">oppure</div>
                <div className="h-px flex-1 bg-white/15" />
              </div>

              <button
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 disabled:opacity-50"
                onClick={magicLink}
                disabled={!email.trim() || loading}
                title="Invia un link di accesso via email"
              >
                ✉️ Invia link via email
              </button>

              {error ? (
                <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/60">
            Little Club James • Accesso sicuro
          </div>
        </div>
      </div>
    </div>
  );
}