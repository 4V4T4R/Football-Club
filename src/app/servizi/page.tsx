// app/servizi/page.tsx
import { Cormorant_Garamond } from "next/font/google";

const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default function Page() {
  return (
    <>
      {/* HERO FULL WIDTH (come le tue altre pagine) */}
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

            <div className="mb-5 h-[1px] w-76 bg-white/100" />

            <h1
              className={`${titleFont.className} text-4xl uppercase text-center tracking-[0.28em] pl-[0.28em] md:text-5xl md:tracking-[0.35em] md:pl-[0.35em]`}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,.45)" }}
            >
              SERVIZI
            </h1>

            <div className="mt-5 h-[1px] w-92 bg-white/100" />

            <p className="mt-6 text-xs tracking-[0.25em] uppercase text-white/80">
              Percorsi e attività per crescere con metodo, identità e passione.
            </p>
          </div>
        </section>
      </div>

      {/* PAGINA “CONTINUA” (stesso contenuto, solo stile/font/dimensioni + bordi foto) */}
      <div className="mx-auto max-w-[1600px] px-0 lg:px-0 pt-10 pb-20">

        {/* BLOCCO 1: foto sinistra + testo destra */}
        <section className="mt-0 grid gap-10 md:grid-cols-[1.05fr_.95fr] md:items-start">
          <div className="overflow-hidden rounded-3xl border border-theme">
            <img
              src="/assets/servizi.jpg"
              alt="Unisciti a noi"
              className="h-[820px] w-full object-cover"
            />
          </div>

          <div className="pt-0 md:pt-0">
            <h3 className={`${titleFont.className} text-[54px] leading-[1.05] text-base-theme md:text-[64px]`}>
              Unisciti a noi
            </h3>
            <div className="mt-4 h-[3px] w-16 bg-[#5d6bd6]" />

            <div className="mt-8 space-y-5 text-[18px] leading-8 text-muted-theme">
              <p>
                La <span className="font-semibold text-base-theme">Little Club James</span> è più di una società sportiva:
                è una <span className="font-semibold text-base-theme">famiglia calcistica</span> in cui ogni giocatore,
                ragazzo o adulto, trova un ambiente serio, motivante e ricco di valori.
              </p>

              <p>
                Siamo presenti nel panorama ligure da anni, con radici che affondano nella storia del calcio genovese e
                uno sguardo sempre rivolto al futuro.
              </p>

              <p>
                La nostra missione è chiara:{" "}
                <span className="font-semibold text-base-theme">
                  formare persone prima ancora che calciatori
                </span>
                , creando un percorso sportivo che unisce competenza, passione e crescita continua.
              </p>
            </div>

            <h4 className={`${titleFont.className} mt-10 text-[34px] leading-tight text-base-theme md:text-[40px]`}>
              ⭐ Perché unirsi alla Little Club James
            </h4>
            <div className="mt-4 h-[3px] w-14 bg-[#5d6bd6]" />

            <div className="mt-6 space-y-4 text-[18px] leading-8 text-muted-theme">
              <p className="font-semibold text-base-theme">🎯 Un progetto sportivo solido e ambizioso</p>
              <p>
                La nostra Prima Squadra milita in <span className="font-semibold text-base-theme">Promozione</span>, una
                categoria impegnativa, dove servono mentalità, disciplina e qualità.
              </p>
              <p>
                Chi entra nella James trova un ambiente guidato da staff competenti, dirigenti presenti e
                un’organizzazione che garantisce serietà in ogni aspetto: dagli allenamenti alla gestione delle partite,
                dalle comunicazioni alle attività extra-campo.
              </p>
            </div>

            <div className="mt-10 border-t border-slate-300/60 pt-10" />
          </div>
        </section>

        {/* BLOCCO 2: due colonne testo/lista */}
        <section className="mt-0 grid gap-14 md:grid-cols-2">
          <div>
            <h5 className={`${titleFont.className} text-[28px] text-base-theme md:text-[32px]`}>
              ⚽️ Un settore giovanile in crescita
            </h5>

            <p className="mt-4 text-[18px] leading-8 text-muted-theme">
              Accogliamo bambini e ragazzi che vogliono:
            </p>

            <ul className="mt-6 space-y-3 text-[18px] leading-8 text-muted-theme">
              {[
                "iniziare a giocare divertendosi",
                "crescere tecnicamente con allenatori preparati",
                "sviluppare coordinazione, disciplina e gioco di squadra",
                "fare un percorso che può portarli nel tempo verso categorie agonistiche",
                "vivere un ambiente rispettoso e motivante",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-[6px] text-[#5d6bd6]">›</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[18px] leading-8 text-muted-theme">
              Ogni giovane atleta viene seguito con attenzione, con l’obiettivo di valorizzare talenti, attitudini e personalità.
            </p>
          </div>

          <div>
            <h5 className={`${titleFont.className} text-[28px] text-base-theme md:text-[32px]`}>
              🧑‍🏫 Allenamenti professionali ma adatti a ogni livello
            </h5>

            <p className="mt-4 text-[18px] leading-8 text-muted-theme">
              Le nostre sedute tecniche e atletiche sono costruite per:
            </p>

            <ul className="mt-6 space-y-3 text-[18px] leading-8 text-muted-theme">
              {[
                "migliorare tecnica individuale",
                "sviluppare tattica collettiva",
                "aumentare resistenza, velocità e forza",
                "crescere in mentalità, fiducia e concentrazione",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-[6px] text-[#5d6bd6]">›</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[18px] leading-8 text-muted-theme">
              Chi si unisce a noi entra in un percorso completo, studiato per far emergere la migliore versione di sé.
            </p>
          </div>

          <div className="md:col-span-2 border-t border-slate-300/60 pt-6" />
        </section>

        {/* BLOCCO 3: testo sinistra + immagine destra */}
        <section className="mt-10 grid gap-12 md:grid-cols-[.95fr_1.05fr] md:items-start">
          <div>
            <h4 className={`${titleFont.className} text-[44px] leading-[1.1] text-base-theme md:text-[52px]`}>
              🏟️ Un ambiente sano, accogliente e rispettoso
            </h4>

            <p className="mt-6 text-[18px] leading-8 text-muted-theme">
              La filosofia della James si basa su valori semplici ma fondamentali:
            </p>

            <ul className="mt-6 space-y-3 text-[18px] leading-8 text-muted-theme">
              {[
                "rispetto per compagni, avversari e arbitri",
                "spirito di squadra",
                "educazione fuori e dentro dal campo",
                "correttezza verso allenatori e dirigenti",
                "impegno e costanza",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-[6px] text-[#5d6bd6]">›</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[18px] leading-8 text-muted-theme">
              Siamo una società dove si cresce insieme, dove ogni atleta viene guidato e sostenuto nel suo percorso.
            </p>

          </div>

          <div className="overflow-hidden rounded-3xl border border-theme">
            <img
              src="/assets/servizi-3.jpg"
              alt="Allenamento"
              className="h-[520px] w-full object-cover"
            />
          </div>
        </section>

        <div className="mt-14 border-t border-slate-300/60" />

        {/* BLOCCO 4 */}
        <section className="mt-14 grid gap-12 md:grid-cols-[1.05fr_.95fr] md:items-start">
          <div className="overflow-hidden rounded-3xl border border-theme">
            <img
              src="/assets/servizi-4.jpg"
              alt="Per le famiglie"
              className="h-[520px] w-full object-cover"
            />
          </div>

          <div className="pt-1 md:pt-3">
            <h4 className={`${titleFont.className} text-[44px] leading-[1.1] text-base-theme md:text-[52px]`}>
              🔵 Per le famiglie: un luogo sicuro per i tuoi figli
            </h4>

            <p className="mt-6 text-[18px] leading-8 text-muted-theme">Offriamo un ambiente:</p>

            <ul className="mt-6 space-y-3 text-[18px] leading-8 text-muted-theme">
              {[
                "sereno",
                "organizzato",
                "con comunicazioni chiare",
                "calendari trasparenti",
                "attenzione alla crescita personale",
                "dirigenti e allenatori disponibili al dialogo",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-[6px] text-[#5d6bd6]">›</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[18px] leading-8 text-muted-theme">
              La James è una comunità dove i ragazzi possono vivere lo sport con entusiasmo e impegno, senza pressioni inutili.
            </p>

            <div className="mt-10 border-t border-slate-300/60 pt-10" />

            <h4 className={`${titleFont.className} text-[36px] leading-tight text-base-theme md:text-[42px]`}>
              📝 Come entrare nella Little Club James
            </h4>

            <p className="mt-4 text-[18px] leading-8 text-muted-theme">Entrare nella nostra società è semplice:</p>

            <ol className="mt-6 space-y-3 list-decimal pl-6 text-[18px] leading-8 text-muted-theme">
              <li>
                <span className="font-semibold text-base-theme">Contattaci</span> tramite la sezione dedicata
              </li>
              <li>
                <span className="font-semibold text-base-theme">Vieni a fare una prova gratuita</span>
              </li>
              <li>
                <span className="font-semibold text-base-theme">Conosci mister, staff e compagni</span>
              </li>
              <li>
                <span className="font-semibold text-base-theme">Ricevi</span> tutte le informazioni su iscrizioni, visite mediche, attrezzatura e allenamenti
              </li>
            </ol>

            <p className="mt-6 text-[18px] leading-8 text-muted-theme">
              Siamo sempre disponibili a incontrare nuovi giocatori, giovani e famiglie che vogliono far parte del nostro mondo.
            </p>
          </div>
        </section>

        <div className="mt-14 border-t border-slate-300/60" />

        {/* BLOCCO FINALE */}
        <section className="mt-14 grid gap-12 md:grid-cols-[1.05fr_.95fr] md:items-start">
          <div className="overflow-hidden rounded-3xl border border-theme">
            <img
              src="/assets/servizi-5.jpg"
              alt="Little Club James"
              className="h-[520px] w-full object-cover"
            />
          </div>

          <div className="pt-2 md:pt-6">
            <h3 className={`${titleFont.className} text-[52px] leading-[1.05] text-base-theme md:text-[62px]`}>
              ❤️ Little Club James — Qui il calcio diventa famiglia, passione e crescita.
            </h3>

            <div className="mt-5 h-[3px] w-16 bg-[#5d6bd6]" />

            <p className="mt-8 text-[18px] leading-8 text-muted-theme">
              Se vuoi vivere uno sport vero, dove contano i valori tanto quanto le vittorie…
              <br />
              <span className="font-semibold text-base-theme">Unisciti a noi.</span> La porta è aperta.
            </p>

            <div className="mt-10">
              <a
                href="/contatti"
                className="inline-flex items-center justify-center rounded-full bg-[#5d6bd6] px-10 py-3.5 text-white shadow-md hover:opacity-95"
              >
                Contattaci
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}