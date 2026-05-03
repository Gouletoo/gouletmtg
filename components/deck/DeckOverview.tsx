type CardSummary = {
  scryfall_id: string;
  name: string;
  oracle_text: string | null;
  type_line: string | null;
  cmc: number | null;
  colors: string[] | null;
  color_identity: string[] | null;
  image_uris: Record<string, string> | null;
  prices: Record<string, string | null> | null;
};

type DeckCardRow = {
  card_id: string;
  qty: number;
  categories: string[] | null;
  notes: string | null;
  cards: CardSummary | CardSummary[] | null;
};

type Deck = {
  id: string;
  name: string;
  strategy_summary: string | null;
  bracket_target: number | null;
  commander_id: string | null;
  partner_commander_id: string | null;
  archidekt_id: string | null;
};

const DEFAULT_GROUPS = [
  "Commander",
  "Ramp",
  "Card Draw",
  "Removal",
  "Board Wipes",
  "Protection",
  "Win Conditions",
  "Threats",
  "Utility Lands",
  "Mana Fixing",
  "Recursion",
  "Interaction",
  "Other",
];

function priceUsd(c: CardSummary): number {
  const v = c.prices?.usd;
  return v ? parseFloat(v) : 0;
}

function unwrap(card: CardSummary | CardSummary[] | null): CardSummary | null {
  if (!card) return null;
  return Array.isArray(card) ? card[0] ?? null : card;
}

export function DeckOverview({
  deck,
  commanders,
  deckCards,
}: {
  deck: Deck;
  commanders: CardSummary[];
  deckCards: DeckCardRow[];
}) {
  const allCards = deckCards
    .map((r) => ({ row: r, card: unwrap(r.cards) }))
    .filter((x): x is { row: DeckCardRow; card: CardSummary } => x.card !== null);

  const totalCount =
    commanders.length +
    allCards.reduce((sum, x) => sum + x.row.qty, 0);

  const totalPrice =
    commanders.reduce((s, c) => s + priceUsd(c), 0) +
    allCards.reduce((s, x) => s + priceUsd(x.card) * x.row.qty, 0);

  const overPriced = allCards.filter((x) => priceUsd(x.card) > 50);

  // Mana curve (CMC 0..7+)
  const curve = new Array(8).fill(0);
  for (const x of allCards) {
    const cmc = x.card.cmc ?? 0;
    const idx = Math.min(7, Math.floor(cmc));
    curve[idx] += x.row.qty;
  }
  const maxCurve = Math.max(1, ...curve);

  // Color identity (count cards par couleur W/U/B/R/G)
  const colorCount: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const x of allCards) {
    const ci = x.card.color_identity ?? [];
    if (ci.length === 0) colorCount.C += x.row.qty;
    else for (const c of ci) if (c in colorCount) colorCount[c] += x.row.qty;
  }

  // Group by category
  const byCategory = new Map<string, Array<{ card: CardSummary; qty: number }>>();
  for (const x of allCards) {
    const cats = x.row.categories && x.row.categories.length > 0 ? x.row.categories : ["Other"];
    for (const cat of cats) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push({ card: x.card, qty: x.row.qty });
    }
  }

  const orderedCats = [
    ...DEFAULT_GROUPS.filter((g) => byCategory.has(g)),
    ...Array.from(byCategory.keys()).filter((g) => !DEFAULT_GROUPS.includes(g)),
  ];

  return (
    <>
      <section className="px-8 md:px-16 lg:px-24 py-10 border-b border-ink/10">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-2">
              Deck
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-ink">
              {deck.name}
            </h1>
          </div>
          <div className="text-right text-sm font-body text-ink/60">
            <p>{totalCount} / 100 cartes</p>
            <p>{totalPrice.toFixed(2)} USD</p>
          </div>
        </div>
        {deck.strategy_summary && (
          <p className="font-body text-ink/70 max-w-2xl leading-relaxed">
            {deck.strategy_summary}
          </p>
        )}
        {overPriced.length > 0 && (
          <div className="mt-6 inline-block px-4 py-2 bg-sand/20 border border-sand rounded-sm text-xs font-body text-ink">
            ⚠ {overPriced.length} carte(s) au-dessus de 50$ — vérifie le respect du plafond du pod
          </div>
        )}
      </section>

      <section className="px-8 md:px-16 lg:px-24 py-10 grid lg:grid-cols-[1fr_320px] gap-12">
        <div>
          {commanders.length > 0 && (
            <div className="mb-10">
              <h2 className="font-display text-2xl text-ink mb-4">Commander</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {commanders.map((c) => (
                  <CardTile key={c.scryfall_id} card={c} qty={1} />
                ))}
              </div>
            </div>
          )}

          {orderedCats.map((cat) => {
            const items = byCategory.get(cat)!;
            const count = items.reduce((s, i) => s + i.qty, 0);
            return (
              <div key={cat} className="mb-10">
                <h2 className="font-display text-2xl text-ink mb-4 flex items-baseline gap-3">
                  {cat}
                  <span className="font-body text-sm text-ink/40">{count}</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((i) => (
                    <CardTile key={i.card.scryfall_id} card={i.card} qty={i.qty} />
                  ))}
                </div>
              </div>
            );
          })}

          {allCards.length === 0 && (
            <p className="font-display text-2xl text-ink/40 py-12">
              Ce deck n&apos;a pas encore de cartes (à part le commander).
            </p>
          )}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start space-y-8">
          <div>
            <h3 className="font-display text-lg text-ink mb-4">Courbe de mana</h3>
            <div className="space-y-2">
              {curve.map((n, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-body">
                  <span className="w-6 text-ink/50">{i === 7 ? "7+" : i}</span>
                  <div className="flex-1 bg-ink/5 rounded-sm h-5 overflow-hidden">
                    <div
                      className="bg-terracotta h-full"
                      style={{ width: `${(n / maxCurve) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-ink/70">{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg text-ink mb-4">Identité couleur</h3>
            <div className="flex gap-2 items-center">
              {(["W", "U", "B", "R", "G", "C"] as const).map((c) => (
                <div key={c} className="text-center">
                  <div
                    className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center text-xs font-body"
                    style={{
                      backgroundColor:
                        c === "W"
                          ? "#F5EDDF"
                          : c === "U"
                          ? "#7BAFC4"
                          : c === "B"
                          ? "#2A2218"
                          : c === "R"
                          ? "#C4704A"
                          : c === "G"
                          ? "#6B8E5A"
                          : "#E2B56B",
                      color: c === "B" ? "#F5EDDF" : "#2A2218",
                    }}
                  >
                    {colorCount[c]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

function CardTile({ card, qty }: { card: CardSummary; qty: number }) {
  const expensive = (parseFloat(card.prices?.usd ?? "0") || 0) > 50;
  return (
    <article className="group relative">
      {card.image_uris?.normal ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.image_uris.normal}
          alt={card.name}
          loading="lazy"
          className="w-full rounded-lg shadow-sm group-hover:shadow-lg transition-shadow"
        />
      ) : (
        <div className="aspect-[5/7] rounded-lg bg-ink/5 flex items-center justify-center text-center p-2">
          <span className="font-display text-sm text-ink/60">{card.name}</span>
        </div>
      )}
      {qty > 1 && (
        <span className="absolute top-2 right-2 bg-ink text-cream rounded-full w-6 h-6 flex items-center justify-center text-xs font-body">
          ×{qty}
        </span>
      )}
      {expensive && (
        <span className="absolute top-2 left-2 bg-sand text-ink rounded-sm px-2 py-0.5 text-[10px] font-body uppercase tracking-wider">
          50$+
        </span>
      )}
    </article>
  );
}
