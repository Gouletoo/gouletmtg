import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nouveau deck — gouletmtg" };

const MODES = [
  {
    href: "/decks/new/commander",
    eyebrow: "Mode A",
    title: "J'ai un commander en tête",
    desc: "Tu choisis le commander. On propose une stratégie, un shell de cartes, et on raffine ensemble.",
  },
  {
    href: "/decks/new/theme",
    eyebrow: "Mode B",
    title: "J'ai un thème ou un archétype",
    desc: "Donne une mécanique ou une stratégie. On te propose des commanders triés par richesse de triggers et de synergie.",
  },
  {
    href: "/decks/new/import",
    eyebrow: "Mode C",
    title: "J'importe un deck Archidekt",
    desc: "Colle l'URL d'un deck Archidekt. On l'analyse complètement et on propose des upgrades ciblées.",
  },
];

export default async function NewDeckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="decks" />

      <section className="px-8 md:px-16 lg:px-24 py-16">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
          Création
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-3">
          Comment veux-tu commencer ?
        </h1>
        <p className="font-body text-ink/60 max-w-2xl mb-12">
          Trois portes d&apos;entrée selon le moment. Tu peux toujours basculer
          d&apos;un mode à l&apos;autre en cours de route.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {MODES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="block border border-ink/10 hover:border-terracotta rounded-sm p-8 transition-colors group"
            >
              <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-4">
                {m.eyebrow}
              </p>
              <h2 className="font-display text-2xl text-ink mb-3 group-hover:text-terracotta transition-colors">
                {m.title}
              </h2>
              <p className="font-body text-sm text-ink/60 leading-relaxed">
                {m.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
