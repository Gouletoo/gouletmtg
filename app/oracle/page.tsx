import { SiteHeader } from "@/components/brand/SiteHeader";
import { OracleSearch } from "@/components/oracle/OracleSearch";

export const metadata = {
  title: "Oracle — gouletmtg",
  description:
    "Recherche de cartes MTG en langage naturel. Décris ce que tu cherches, on traduit en syntaxe Scryfall.",
};

export default function OraclePage() {
  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="oracle" />
      <section className="px-8 md:px-16 lg:px-24 pt-12 pb-6">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
          Oracle
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-3">
          Décris la carte que tu cherches
        </h1>
        <p className="font-body text-ink/60 max-w-2xl leading-relaxed">
          En français, en anglais, ou en mots-clés. Tu peux aussi cocher des
          concepts pour préciser. La requête Scryfall générée est toujours
          visible — tu peux l&apos;éditer si tu veux ajuster.
        </p>
      </section>

      <OracleSearch />
    </main>
  );
}
