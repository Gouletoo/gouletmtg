import { CardSearch } from "@/components/cards/CardSearch";
import Link from "next/link";

export const metadata = { title: "Cartes — gouletmtg" };

export default function CardsPage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-8 md:px-16 lg:px-24 py-8 flex items-center justify-between border-b border-ink/10">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          gouletmtg
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
          <Link href="/decks" className="hover:text-terracotta transition-colors">
            Decks
          </Link>
          <Link href="/cards" className="text-terracotta">
            Cartes
          </Link>
          <Link href="/profile" className="hover:text-terracotta transition-colors">
            Profil
          </Link>
        </nav>
      </header>

      <section className="px-8 md:px-16 lg:px-24 py-10">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
          Recherche
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-2">
          Toutes les cartes Commander
        </h1>
        <p className="font-body text-ink/60 max-w-2xl">
          Filtres par couleur, coût de mana, type, texte. Source : Scryfall, mis à jour quotidiennement.
        </p>
      </section>

      <CardSearch />
    </main>
  );
}
