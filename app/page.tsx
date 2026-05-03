import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-8 md:px-16 lg:px-24 py-8 flex items-center justify-between">
        <div className="font-display text-2xl tracking-tight text-ink">
          gouletmtg
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link href="/decks" className="hover:text-terracotta transition-colors">
            Decks
          </Link>
          <Link href="/cards" className="hover:text-terracotta transition-colors">
            Cartes
          </Link>
          <Link href="/oracle" className="hover:text-terracotta transition-colors">
            Oracle
          </Link>
          <Link href="/profile" className="hover:text-terracotta transition-colors">
            Profil
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex items-center px-8 md:px-16 lg:px-24 py-16">
        <div className="max-w-4xl">
          <p className="font-body text-sm uppercase tracking-[0.2em] text-terracotta mb-8">
            Commander · Deck builder
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[1.05] text-ink mb-10">
            Le deck builder
            <br />
            qui pense comme
            <br />
            <span className="text-terracotta italic">un joueur pro.</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-ink/75 max-w-2xl leading-relaxed mb-12">
            Synergie chiffrée entre chaque carte. Analyse profonde de tes
            stratégies. Suggestions intelligentes. Mémoire qui évolue avec toi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/decks/new"
              className="inline-flex items-center justify-center px-8 py-4 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider"
            >
              Nouveau deck
            </Link>
            <Link
              href="/decks"
              className="inline-flex items-center justify-center px-8 py-4 border border-ink/20 text-ink rounded-sm hover:border-terracotta hover:text-terracotta transition-colors text-sm uppercase tracking-wider"
            >
              Mes decks
            </Link>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-16 lg:px-24 py-16 border-t border-ink/10">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <div className="text-terracotta font-display text-4xl mb-4">01</div>
            <h3 className="font-display text-2xl mb-3">Synergie d&apos;abord</h3>
            <p className="font-body text-ink/70 leading-relaxed">
              Score précis entre chaque paire de cartes. Identification des
              maillons faibles. Détection des noyaux synergiques.
            </p>
          </div>
          <div>
            <div className="text-terracotta font-display text-4xl mb-4">02</div>
            <h3 className="font-display text-2xl mb-3">Pas de raccourcis</h3>
            <p className="font-body text-ink/70 leading-relaxed">
              Pas de tutors. Pas de combos faciles. La force d&apos;un deck vient
              de sa cohésion, pas de ses staples.
            </p>
          </div>
          <div>
            <div className="text-terracotta font-display text-4xl mb-4">03</div>
            <h3 className="font-display text-2xl mb-3">Mémoire vivante</h3>
            <p className="font-body text-ink/70 leading-relaxed">
              Tes préférences, tes règles de pod, tes pet cards. L&apos;outil
              apprend ton style et propose en conséquence.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-8 md:px-16 lg:px-24 py-8 border-t border-ink/10 flex items-center justify-between text-xs text-ink/50">
        <div>gouletmtg · Commander deck builder</div>
        <div>v0.1 · Phase 0</div>
      </footer>
    </main>
  );
}
