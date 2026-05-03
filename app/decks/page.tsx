import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Decks — gouletmtg" };

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: decks } = await supabase
    .from("decks")
    .select("id,name,commander_id,strategy_summary,bracket_target,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="decks" />

      <section className="px-8 md:px-16 lg:px-24 py-12">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
              Bibliothèque
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-ink">
              Mes decks
            </h1>
          </div>
          <Link
            href="/decks/new"
            className="px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider"
          >
            + Nouveau
          </Link>
        </div>

        {!decks || decks.length === 0 ? (
          <div className="border border-ink/10 rounded-sm py-20 px-8 text-center">
            <p className="font-display text-3xl text-ink/40 mb-4">
              Aucun deck pour l&apos;instant.
            </p>
            <p className="font-body text-ink/50 mb-8 max-w-md mx-auto">
              Crée ton premier deck à partir d&apos;un commander, d&apos;un thème, ou en
              important un deck Archidekt existant.
            </p>
            <Link
              href="/decks/new"
              className="inline-block px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider"
            >
              Créer mon premier deck
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((d) => (
              <Link
                key={d.id}
                href={`/decks/${d.id}/builder`}
                className="block border border-ink/10 hover:border-terracotta rounded-sm p-6 transition-colors"
              >
                <h3 className="font-display text-2xl text-ink mb-2">{d.name}</h3>
                {d.strategy_summary && (
                  <p className="font-body text-sm text-ink/60 line-clamp-2">
                    {d.strategy_summary}
                  </p>
                )}
                {d.bracket_target && (
                  <p className="mt-4 text-xs uppercase tracking-wider text-terracotta">
                    Bracket {d.bracket_target}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
