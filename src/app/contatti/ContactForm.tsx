// app/contatti/ContactForm.tsx
"use client";

import { useState } from "react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setOk(null);
    setErr(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/contatti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Errore nell’invio. Riprova.");

      form.reset();
      setOk("Messaggio inviato!");
    } catch (e: any) {
      setErr(e?.message || "Errore nell’invio. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="mt-10 space-y-5"
      action={(fd) => {
        const name = String(fd.get("name") ?? "").trim();
        const email = String(fd.get("email") ?? "").trim();
        const message = String(fd.get("message") ?? "").trim();

        const to = "Little_Club_James@outlook.it";
        const subject = encodeURIComponent(`Richiesta contatto — ${name || "Senza nome"}`);
        const body = encodeURIComponent(
          `Nome e cognome: ${name}\n` +
            `Email: ${email}\n\n` +
            `Messaggio:\n${message}\n`
        );

        if (typeof window !== "undefined") {
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        }
      }}
    >
      <div>
        <label className="block text-sm font-semibold text-base-theme">Nome e cognome</label>
        <input
          name="name"
          type="text"
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white/70 px-4 py-3 text-base-theme outline-none focus:border-[#5d6bd6]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-base-theme">E-mail</label>
        <input
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white/70 px-4 py-3 text-base-theme outline-none focus:border-[#5d6bd6]"
          placeholder="@"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-base-theme">Messaggio</label>
        <textarea
          name="message"
          rows={6}
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white/70 px-4 py-3 text-base-theme outline-none focus:border-[#5d6bd6]"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-[#2f3340] px-10 py-3.5 text-white shadow-md hover:opacity-95"
        >
          Invia
        </button>
      </div>

      <p className="text-sm text-muted-theme">
        Si aprirà l’app di posta con il messaggio già compilato.
      </p>
    </form>
  );
}