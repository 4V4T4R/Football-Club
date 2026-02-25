// app/contatti/page.tsx
import { Cormorant_Garamond } from "next/font/google";
import ContactForm from "./ContactForm";

const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function Page() {
  return (
    <>
      {/* HERO FULL WIDTH */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-24 w-screen">
        <section className="relative h-[50vh] min-h-[380px] w-full overflow-hidden">
          <img
            src="/assets/hero-bg.jpg"
            alt="Little Club James"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative z-10 flex h-110 flex-col items-center justify-center px-4 text-center text-white">
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="mb-6 h-26 w-26 md:h-28 md:w-28 object-contain"
            />

            <div className="mb-5 h-[1px] w-96 bg-white/100" />

            <h1
              className={`${titleFont.className} text-4xl uppercase text-center tracking-[0.28em] pl-[0.28em]
              md:text-5xl md:tracking-[0.35em] md:pl-[0.35em]`}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,.45)" }}
            >
              CONTATTI
            </h1>

            <div className="mt-5 h-[1px] w-112 bg-white/100" />

            <p className="mt-6 text-xs tracking-[0.25em] uppercase text-white/80">
              Scrivici, chiamaci o vieni a trovarci.
            </p>
          </div>
        </section>
      </div>

      {/* CONTENUTO (senza sfondo a quadri) */}
      <div className="mx-auto max-w-6xl px-6 lg:px-8 pt-0 pb-20">

        {/* 3 colonne info */}
        <section className="mt-12 grid gap-10 md:grid-cols-3">
          {/* E-mail */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#5d6bd6]">
              <span className="text-2xl">✉️</span>
              <h3 className={`${titleFont.className} text-[28px] text-base-theme md:text-[32px]`}>
                E-mail
              </h3>
            </div>

            <p className="text-[18px] leading-8 text-muted-theme">
              Little_Club_James@outlook.it
            </p>
          </div>

          {/* Telefono */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#5d6bd6]">
              <span className="text-2xl">📱</span>
              <h3 className={`${titleFont.className} text-[28px] text-base-theme md:text-[32px]`}>
                Telefono
              </h3>
            </div>

            <p className="text-[18px] leading-8 text-muted-theme">
              Direttore sportivo LC James
            </p>

            <p className="text-[18px] leading-8 text-muted-theme">
              <span className="font-semibold text-base-theme">Andrea Bazzurro</span>{" "}
              +39 3334782605
            </p>
          </div>

          {/* Indirizzo */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#5d6bd6]">
              <span className="text-2xl">📍</span>
              <h3 className={`${titleFont.className} text-[28px] text-base-theme md:text-[32px]`}>
                Indirizzo
              </h3>
            </div>

            <p className="text-[18px] leading-8 text-muted-theme">Visitaci</p>

            <p className="text-[18px] leading-8 text-muted-theme">
              <span className="font-semibold italic text-base-theme">
                Via Pomata (Genova - San Desiderio, sopra piazza Grossi, a 400 metri dal capolinea dell’86)
              </span>
            </p>
          </div>
        </section>

        {/* separatore */}
        <div className="mt-12 border-t border-slate-300/60" />

        {/* Mappa + form */}
        <section className="mt-12 grid gap-12 md:grid-cols-2 md:items-start">
          {/* MAPPA (interattiva: zoom/pan) */}
          <div className="overflow-hidden rounded-3xl border border-theme bg-panel-theme">
            <div className="aspect-[16/10] w-full">
              <iframe
                title="Mappa Little Club James"
                className="h-full w-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                // ✅ usa un embed “normale”: è interattivo (pan/zoom) dentro iframe
                src="https://www.google.com/maps?q=Via%20Pomata%20Genova&z=16&output=embed"
              />
            </div>
          </div>

          {/* FORM */}
          <div className="pt-1 md:pt-2">
            <h3 className={`${titleFont.className} text-[44px] leading-[1.1] text-base-theme md:text-[52px]`}>
              Hai bisogno di contattarci?
            </h3>

            <p className="mt-6 text-[18px] leading-8 text-muted-theme">
              Benvenuti nel sito web di Little Club James, la società sportiva di calcio con un forte focus sul settore giovanile.
            </p>

            {/* ✅ form spostato in Client Component */}
            <div className="mt-10">
              <ContactForm />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}