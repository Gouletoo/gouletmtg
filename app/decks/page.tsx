import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Decks — gouletmtg" };

const COLOR_STYLE: Record<string, string> = {
  W: "bg-cream border-ink/20",
  U: "bg-sky/30",
  B: "bg-ink",
  R: "bg-terracotta/70",
  G: "bg-[#6B8E5A]/60",
};

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: decks } = await supabase
    .from("decks")
    .select(
      "id,name,commander_id,strategy_summary,bracket_target,updated_at,commander:cards!decks_commander_id_fkey(scryfall_id,name,image_uris,color_identity)"
    )
    .order("updated_at", { ascending: false });

  // Card counts pour chaque deck
  const deckIds = (decks ?? []).map((d) => d.id);
  let cardCounts = new Map<string, number>();
  if (deckIds.length > 0) {
    const { data: counts } = await supabase
      .from("deck_cards")
      .select("deck_id,qty")
      .in("deck_id", deckIds);
    for (const row of counts ?? []) {
      const prev = cardCounts.get(row.deck_id as string) ?? 0;
      cardCounts.set(row.deck_id as string, prev + (row.qty as number));
    }
  }

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
            {decks.map((d) => {
              const commander = Array.isArray(d.commander) ? d.commander[0] : d.commander;
              const img = commander?.image_uris?.art_crop ?? commander?.image_uris?.normal ?? null;
              const ci: string[] = commander?.color_identity ?? [];
              const totalCards = (cardCounts.get(d.id) ?? 0) + 1; // +1 pour commander
              return (
                <Link
                  key={d.id}
                  href={`/decks/${d.id}/builder`}
                  className="block border border-ink/10 hover:border-terracotta rounded-sm overflow-hidden transition-colors group"
                >
                  {img ? (
                    <div className="aspect-[16/9] overflow-hidden bg-ink/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={commander?.name ?? d.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-ink/5 flex items-center justify-center">
                      <span className="font-display text-ink/30">Sans image</span>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <h3 className="font-display text-xl text-ink truncate">
                        {d.name}
                      </h3>
                      {ci.length > 0 && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {ci.map((c) => (
                            <span
                              key={c}
                              className={`w-2.5 h-2.5 rounded-full border border-ink/15 ${COLOR_STYLE[c] ?? "bg-sand"}`}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {commander && (
                      <p className="font-body text-xs text-ink/50 mb-3">
                        {commander.name}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs font-body text-ink/40">
                      <span>{totalCards} cartes</span>
                      {d.bracket_target && <span>Bracket {d.bracket_target}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
