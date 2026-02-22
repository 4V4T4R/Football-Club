import { Cormorant_Garamond } from "next/font/google";

const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function HomePage() {
  return (
    <>
      {/* HERO FULL WIDTH */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-24 w-screen">
        <section className="relative h-[50vh] min-h-[380px] w-full overflow-hidden">
          {/* immagine */}
          <img
            src="/assets/hero-bg.jpg"
            alt="Little Club James"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* overlay */}
          <div className="absolute inset-0 bg-black/10" />

          {/* contenuto */}
          <div className="relative z-10 flex h-110 flex-col items-center justify-center px-4 text-center text-white">
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="mb-6 h-26 w-26 md:h-28 md:w-28 object-contain"
            />

            <div className="mb-5 h-[1px] w-186 bg-white/100" />

            <h1
              className={`${titleFont.className} text-4xl uppercase text-center
                          tracking-[0.28em] pl-[0.28em]
                          md:text-5xl md:tracking-[0.35em] md:pl-[0.35em]`}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,.45)" }}
            >
              LITTLE CLUB JAMES
            </h1>

            <div className="mt-5 h-[1px] w-202 bg-white/100" />

            <p className="mt-6 text-xs tracking-[0.25em] uppercase text-white/80">
              Associazione Sportiva Dilettantistica
            </p>
          </div>
        </section>
      </div>

      {/* RESTO DELLA PAGINA (centrato dal layout) */}
      <div className="space-y-16 pt-12">
        {/* INTRO EMOZIONALE + FOTO */}
        <section className="grid items-start gap-10 md:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="text-sm text-muted-theme tracking-[0.2em] uppercase">
              ⚽️ Cuore • Metodo • Appartenenza
            </p>

            <h2 className="mt-3 text-4xl md:text-5xl font-semibold text-base-theme leading-[1.05]">
              Una casa.
              <span className="block text-muted-theme">Un percorso. Un’identità.</span>
            </h2>

            <p className="mt-6 text-base md:text-lg text-muted-theme leading-relaxed max-w-2xl">
              Little Club James è più di una squadra: è un luogo dove si impara a stare insieme,
              a rispettare il lavoro e a crescere — dentro e fuori dal campo.
            </p>

            <p className="mt-4 text-base md:text-lg text-muted-theme leading-relaxed max-w-2xl">
              Crediamo nella disciplina gentile, nella cura dei dettagli e in un calcio che educa:
              un ambiente serio, umano e ambizioso.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-theme bg-panel-theme px-4 py-2 text-sm text-base-theme">
                🌱 Crescita sportiva
              </span>
              <span className="rounded-full border border-theme bg-panel-theme px-4 py-2 text-sm text-base-theme">
                🛡️ Valori e rispetto
              </span>
              <span className="rounded-full border border-theme bg-panel-theme px-4 py-2 text-sm text-base-theme">
                🤝 Comunità
              </span>
            </div>
          </div>

          {/* MOSAICO FOTO + QUOTE (con sfondo più emozionale) */}
          <div className="grid gap-4 md:gap-5">
            <div className="overflow-hidden rounded-2xl border border-theme">
              <img
                src="/assets/home-1.jpg"
                alt="Allenamento Little Club James"
                className="h-52 w-full object-cover md:h-56"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-5">
              <div className="overflow-hidden rounded-2xl border border-theme">
                <img
                  src="/assets/home-2.jpg"
                  alt="Squadra Little Club James"
                  className="h-40 w-full object-cover md:h-44"
                />
              </div>
              <div className="overflow-hidden rounded-2xl border border-theme">
                <img
                  src="/assets/home-3.jpg"
                  alt="Partita Little Club James"
                  className="h-40 w-full object-cover md:h-44"
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-theme p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
              <div className="relative">
                <p className="text-sm text-muted-theme">💬 Il nostro modo di vivere il calcio</p>
                <p className="mt-2 text-base md:text-lg text-base-theme leading-snug">
                  “Passione, impegno, disciplina: ogni allenamento è un passo avanti.”
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VALORI (con accento visivo + emoji) */}
        <section className="relative overflow-hidden rounded-2xl border border-theme bg-panel-theme p-10 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
          <div className="relative grid gap-10 md:grid-cols-[.95fr_1.05fr]">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold text-base-theme leading-snug">
                I valori della Little Club James
              </h3>
              <p className="mt-4 text-muted-theme leading-relaxed">
                Ogni scelta — dal campo all’organizzazione — nasce da una idea semplice:
                crescere bene, insieme, con obiettivi chiari e persone affidabili.
              </p>

              <div className="mt-6 grid gap-3">
                <div className="rounded-xl border border-theme bg-panel-theme px-4 py-3 text-sm text-muted-theme">
                  🏟️ Rispetto del campo e delle persone
                </div>
                <div className="rounded-xl border border-theme bg-panel-theme px-4 py-3 text-sm text-muted-theme">
                  📚 Metodo e continuità
                </div>
                <div className="rounded-xl border border-theme bg-panel-theme px-4 py-3 text-sm text-muted-theme">
                  🧩 Dettagli che fanno la differenza
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-2xl border border-theme bg-panel-theme p-6">
                <p className="text-base font-semibold text-base-theme">🎓 Professionalità</p>
                <p className="mt-1 text-sm text-muted-theme leading-relaxed">
                  Cura dei dettagli, puntualità e un percorso costruito con metodo.
                </p>
              </div>

              <div className="rounded-2xl border border-theme bg-panel-theme p-6">
                <p className="text-base font-semibold text-base-theme">🧠 Mentalità</p>
                <p className="mt-1 text-sm text-muted-theme leading-relaxed">
                  Ogni allenamento è una sfida. Ogni partita un'occasione per dimostrare crescita, maturità e carattere.
                </p>
              </div>

              <div className="rounded-2xl border border-theme bg-panel-theme p-6">
                  <p className="text-base font-semibold text-base-theme">Identità</p>
                  <p className="mt-1 text-sm text-muted-theme leading-relaxed">
                    Rispetto per la maglia, la città e il percorso che ha portato la società ad essere protagonista in Promozione.
                  </p>
                </div>

              <div className="rounded-2xl border border-theme bg-panel-theme p-6">
                <p className="text-base font-semibold text-base-theme">🤍 Squadra</p>
                <p className="mt-1 text-sm text-muted-theme leading-relaxed">
                    Un gruppo unito, determinato, che combatte su ogni pallone.
                    Il collettivo viene sempre prima del singolo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* COME FUNZIONA + CTA (più “calda”, con sfondo) */}
        <section className="grid gap-10 md:grid-cols-[1fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-theme bg-panel-theme p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
            <div className="relative">
              <h3 className="text-2xl font-semibold text-base-theme">Come funziona (davvero)</h3>
              <p className="mt-3 text-muted-theme leading-relaxed">
                Tutto semplice, ordinato e privato: lo staff organizza, il giocatore risponde,
                la società ha sempre il quadro chiaro.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 rounded-full border border-theme bg-panel-theme flex items-center justify-center text-base-theme">
                    🗓️
                  </div>
                  <div>
                    <p className="font-semibold text-base-theme">Evento + convocati</p>
                    <p className="mt-1 text-sm text-muted-theme">
                      Allenamento o partita con orario, luogo e lista convocati.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 rounded-full border border-theme bg-panel-theme flex items-center justify-center text-base-theme">
                    ✅
                  </div>
                  <div>
                    <p className="font-semibold text-base-theme">Risposta immediata</p>
                    <p className="mt-1 text-sm text-muted-theme">
                      Presente/Assente in pochi secondi, anche da telefono.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 rounded-full border border-theme bg-panel-theme flex items-center justify-center text-base-theme">
                    📎
                  </div>
                  <div>
                    <p className="font-semibold text-base-theme">Motivo + allegato</p>
                    <p className="mt-1 text-sm text-muted-theme">
                      Giustificazione e documento opzionale: tutto tracciato e riservato.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-theme bg-panel-theme p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
            <div className="relative">
              <h3 className="text-2xl font-semibold text-base-theme">Hai bisogno di contattarci?</h3>
              <p className="mt-4 text-muted-theme leading-relaxed">
                Per iscrizioni, informazioni o richieste: siamo disponibili e ti rispondiamo rapidamente.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/contatti"
                  className="rounded-xl border border-theme bg-panel-theme px-5 py-2.5 text-sm text-base-theme hover:opacity-90"
                >
                  📩 Contatti →
                </a>
                <a
                  href="/chi-siamo"
                  className="rounded-xl border border-theme bg-panel-theme px-5 py-2.5 text-sm text-base-theme hover:opacity-90"
                >
                  ✨ Scopri la società →
                </a>
                <a
                  href="/servizi"
                  className="rounded-xl border border-theme bg-panel-theme px-5 py-2.5 text-sm text-base-theme hover:opacity-90"
                >
                  🧩 Servizi →
                </a>
              </div>

              <div className="mt-8 border-t border-theme pt-6">
                <p className="text-sm text-muted-theme">
                  ⭐️ prossimamente forse sezione Notizie con foto + estratti.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}