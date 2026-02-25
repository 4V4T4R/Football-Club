// app/team/page.tsx
import { Cormorant_Garamond } from "next/font/google";

const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function Page() {
  return (
    <>
      {/* HERO — identico alle altre pagine */}
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

            <div className="mb-5 h-[1px] w-66 bg-white/100" />

            <h1
              className={`${titleFont.className} text-4xl uppercase tracking-[0.28em] pl-[0.28em] md:text-5xl md:tracking-[0.35em] md:pl-[0.35em]`}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,.45)" }}
            >
              TEAM
            </h1>

            <div className="mt-5 h-[1px] w-82 bg-white/100" />

            <p className="mt-6 text-xs tracking-[0.25em] uppercase text-white/80">
              Persone, competenze e identità del club
            </p>
          </div>
        </section>
      </div>

      {/* CONTENUTO */}
      <div className="mx-auto max-w-6xl px-6 lg:px-8 pt-0 pb-20">

        {/* BLOCCO PRINCIPALE */}
        <section className="mt-10 grid gap-12 md:grid-cols-[1.1fr_.9fr] md:items-start">
          {/* COLONNA TESTO */}
          <div className="space-y-6 text-center md:text-left">
            <h3
              className={`${titleFont.className} text-[28px] md:text-[32px] text-base-theme`}
            >
              PRIMA SQUADRA
            </h3>

            <div className="space-y-2 text-[17px] leading-8 text-muted-theme">
              <p><span className="font-semibold text-base-theme">Presidente:</span> TORTI ANDREA</p>
              <p><span className="font-semibold text-base-theme">Direttore Generale:</span> ADAMOLI GESSI</p>
              <p><span className="font-semibold text-base-theme">Segretario:</span> MONTALDO MAURO</p>
              <p><span className="font-semibold text-base-theme">Addetto stampa:</span> ADAMOLI GESSI</p>
              <p><span className="font-semibold text-base-theme">Dirigente ufficiale:</span> BADANO SILVIO</p>
              <p><span className="font-semibold text-base-theme">Preparatore portieri:</span> FRIXIONE ANDREA</p>
              <p><span className="font-semibold text-base-theme">Medico sociale:</span> TISALBO PIETRO</p>
            </div>

            <div className="pt-6 border-t border-slate-300/60" />

            <h4
              className={`${titleFont.className} text-[24px] md:text-[28px] text-base-theme`}
            >
              Dalla JUNIORES ai PICCOLI AMICI
            </h4>

            <div className="space-y-2 text-[17px] leading-8 text-muted-theme">
              <p>Presidente Juniores: SCARSO GIOVANNI</p>
              <p>Direttore Sportivo: BAZZURRO ANDREA</p>
              <p>Direttore Tecnico: RICCIARDI LUCA</p>
              <p>Segretario: BAZZURRO ANDREA</p>
              <p>Preparatore portieri: ARMONINO ALESSANDRO</p>
            </div>
          </div>

          {/* COLONNA IMMAGINE + TESTO */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-theme">
              <img
                src="/assets/presidente.jpg"
                alt="Presidente"
                className="h-[460px] w-full object-cover"
              />
            </div>

            <div className="text-center md:text-left">
              <p className="text-sm italic text-muted-theme">
                Presidente: Andrea Torti
              </p>

              <div className="mt-6 h-px w-full bg-slate-300/60" />

              <p className="mt-6 text-[17px] leading-8 text-muted-theme">
                Il Little Club James è una società sportiva di calcio con sede
                a Genova, specializzata nella formazione di giovani talenti nel
                mondo del calcio.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}