// app/chi-siamo/page.tsx
import { Cormorant_Garamond } from "next/font/google";

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

            {/* LINEA SOPRA: ora è “auto” sul titolo, con max, quindi mai troppo lunga */}
            <div className="mb-5 h-[1px] w-106 bg-white/100" />

            <h1
              className={`${titleFont.className} text-4xl uppercase text-center
                          tracking-[0.28em] pl-[0.28em]
                          md:text-5xl md:tracking-[0.35em] md:pl-[0.35em]`}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,.45)" }}
            >
              CHI SIAMO
            </h1>

            {/* LINEA SOTTO: stessa logica */}
            <div className="mt-5 h-[1px] w-122 bg-white/100" />

            <p className="mt-6 text-xs tracking-[0.25em] uppercase text-white/80">
              Storia, valori e obiettivi di una società che cresce con metodo, identità e passione.
            </p>
          </div>
        </section>
      </div>

      {/* RESTO (centrato dal layout) */}
      <div className="space-y-0 pt-10">
        {/* 1) FOTO SINISTRA / TESTO DESTRA */}
        <section className="grid gap-10 md:grid-cols-[1.1fr_.9fr] md:items-start">
          {/* COLONNA SINISTRA: foto + “Metodo…” (così riempie il vuoto) */}
          <div className="space-y-10">
            <div className="overflow-hidden rounded-2xl border border-theme">
              <img
                src="/assets/squadra.jpg"
                alt="Squadra Little Club James"
                className="h-72 w-full object-cover md:h-[360px]"
              />
            </div>

            <div className="space-y-5 text-muted-theme leading-relaxed mt-2 md:mt-4">
              <h3 className="text-xl md:text-2xl font-semibold text-base-theme">
                Metodo, continuità, rispetto
              </h3>

              <p>
                Little Club James è una società calcistica che milita nel campionato di Promozione
                ligure, rappresentando con orgoglio il territorio genovese.
              </p>

              <p>
                Siamo una realtà solida, strutturata e in continua crescita, basata su competenza
                tecnica, organizzazione e valori che superano il semplice risultato sportivo.
              </p>

              <p>
                Il nostro obiettivo è formare atleti completi, preparati sia sul piano fisico e
                tattico, sia su quello umano.
              </p>

              <p>
                La nostra identità si fonda sulla tradizione, sull’impegno quotidiano e sul desiderio
                di costruire un calcio serio, rispettoso e ambizioso.
              </p>
              <div className="max-w-4xl">
                <div className="h-px w-full bg-slate-500/25" />
              </div>
            </div>
          </div>

          {/* COLONNA DESTRA: titolo + testo + stemma */}
          <div className="self-start">
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-base-theme leading-snug">
                Una società, un’identità
              </h2>

              <p className="text-sm text-muted-theme leading-relaxed">
                Il Little Club James si dedica allo sviluppo del calcio giovanile nella città di
                Genova. Con un approccio incentrato sull’amore per lo sport e sulla formazione dei
                giovani calciatori, la nostra squadra mira a creare non solo giocatori di talento,
                ma anche persone di valore.
              </p>

              <div className="pt-2">
                <img
                  src="/assets/logo-club.jpg"
                  alt="Stemma Little Club James"
                  className="w-full max-w-[520px] object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3) FOTO CENTRALE + TITOLO */}
        <section className="-mt-4 md:-mt-12">
          <h2 className={`${titleFont.className} text-center text-2xl md:text-3xl text-base-theme`}>
            Eleganza. Energia. Evoluzione.
          </h2>

          <div className="mt-8 overflow-hidden rounded-2xl border border-theme">
            <img
              src="/assets/squadra-2.jpg"
              alt="Little Club James"
              className="h-72 w-full object-cover md:h-[420px]"
            />
          </div>

          <p className="mx-auto mt-8 max-w-4xl text-muted-theme leading-relaxed">
            <b>Qui nasce la differenza:</b> un ambiente serio, organizzato e umano, dove il percorso di
            crescita conta quanto il risultato. Lavoriamo per dare ai ragazzi un riferimento
            chiaro, regole semplici e un metodo costante.
          </p>
        </section>

        {/* 4) FOTO SINISTRA / TESTO DESTRA */}
        <section className="mt-8 grid gap-10 md:grid-cols-[.9fr_1.1fr] md:items-center">
          <div className="overflow-hidden rounded-2xl border border-theme">
            <img
              src="/assets/giovani.jpg"
              alt="Settore giovanile"
              className="h-64 w-full object-cover md:h-[340px]"
            />
          </div>

          <div className="space-y-4 text-muted-theme leading-relaxed">
            <h3 className="text-xl font-semibold text-base-theme">Squadra giovane e ambiziosa</h3>
            <p>
              Se cerchi una società con un settore giovanile ben strutturato, un progetto serio e
              un percorso chiaro, il Little Club James è la scelta giusta.
            </p>

            <div className="pt-2">
              <a
                href="/servizi"
                className="inline-flex items-center rounded-xl border border-theme bg-panel-theme px-5 py-2.5 text-sm text-base-theme hover:opacity-90"
              >
                Servizi →
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}