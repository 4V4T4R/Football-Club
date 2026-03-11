"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function parseHashTokens(hash: string) {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function ImpostaPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return pw1.length >= 8 && pw1 === pw2 && !saving;
  }, [pw1, pw2, saving]);

  useEffect(() => {
    (async () => {
      setChecking(true);
      setError(null);

      // 1) Caso PKCE: /auth/callback?code=...
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (exErr) {
          setError("Link non valido o già utilizzato. Richiedi un nuovo invito.");
          setChecking(false);
          return;
        }
      } else {
        // 2) Caso INVITE/IMPLICIT: token in hash (#access_token=...)
        const { access_token, refresh_token } = parseHashTokens(
          window.location.hash || ""
        );

        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          // rimuove i token dalla barra (sicurezza)
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search
          );

          if (setErr) {
            setError("Link non valido o già utilizzato. Richiedi un nuovo invito.");
            setChecking(false);
            return;
          }
        }
      }

      // 3) Verifica sessione
      const s = await supabase.auth.getSession();
      if (!s.data.session) {
        setError("Link non valido o scaduto. Richiedi un nuovo invito.");
        setChecking(false);
        return;
      }

      setChecking(false);
    })();
  }, []);

  async function save() {
    setError(null);
    setOk(null);

    if (pw1.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (pw1 !== pw2) {
      setError("Le password non coincidono.");
      return;
    }

    setSaving(true);

    const { error: upErr } = await supabase.auth.updateUser({ password: pw1 });
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    setOk("Password impostata ✅");

    // Consiglio: logout così il link non viene “riusato” da una sessione già viva
    await supabase.auth.signOut();

    setSaving(false);
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-25 w-screen min-h-[117.6svh] overflow-hidden">
      {/* Background */}
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

      {/* Content */}
      <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-54">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/15 bg-black/35 p-8 shadow-[0_20px_60px_rgba(0,0,0,.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                🔐
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Imposta password
                </h1>
                <p className="text-sm text-white/70">
                  Crea una password per il tuo accesso.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {checking ? (
                <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
                  Verifica link in corso…
                </div>
              ) : null}

              {!checking && error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {!checking && !error ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-white/70">
                      Nuova password
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
                      <input
                        type={show1 ? "text" : "password"}
                        className="w-full bg-transparent px-3 py-2 text-white placeholder-white/35 outline-none"
                        placeholder="Minimo 8 caratteri"
                        value={pw1}
                        onChange={(e) => setPw1(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 text-white/70 hover:text-white"
                        onClick={() => setShow1((s) => !s)}
                        aria-label="Mostra/Nascondi password"
                        title="Mostra/Nascondi"
                      >
                        {show1 ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-white/70">
                      Ripeti password
                    </label>
                    <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
                      <input
                        type={show2 ? "text" : "password"}
                        className="w-full bg-transparent px-3 py-2 text-white placeholder-white/35 outline-none"
                        placeholder="Ripeti la password"
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 text-white/70 hover:text-white"
                        onClick={() => setShow2((s) => !s)}
                        aria-label="Mostra/Nascondi password"
                        title="Mostra/Nascondi"
                      >
                        {show2 ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>
                      {pw1.length < 8 ? "⚠️ Minimo 8 caratteri" : "✅ Lunghezza OK"}
                    </span>
                    <span>
                      {pw1 && pw2 && pw1 !== pw2
                        ? "⚠️ Non coincidono"
                        : pw1 && pw2
                        ? "✅ Coincidono"
                        : ""}
                    </span>
                  </div>

                  <button
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
                    onClick={save}
                    disabled={!canSave}
                  >
                    {saving ? "Salvataggio…" : "Salva password"}
                  </button>

                  {ok ? (
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                      {ok}
                    </div>
                  ) : null}

                  <p className="pt-1 text-xs text-white/60">
                    Suggerimento: usa una password unica e non condividerla con nessuno.
                  </p>
                </>
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