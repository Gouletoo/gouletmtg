"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddCardModal } from "./AddCardModal";
import { CardDetailDrawer, type CardDetail, type DeckCardSlice } from "./CardDetailDrawer";

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

/** Catégories qui ne comptent pas dans le main deck (100 cartes). */
const OUTSIDE_DECK_PATTERNS = /side\s*board|sideboard|maybe\s*board|maybeboard|considering|wishlist/i;

function isOutsideDeck(categories: string[]): boolean {
  return categories.some((c) => OUTSIDE_DECK_PATTERNS.test(c));
}

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
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{
    card: CardDetail;
    slice: DeckCardSlice | null;
    isCommander: boolean;
  } | null>(null);

  const allCategoriesInDeck = useMemo(() => {
    const set = new Set<string>();
    for (const r of deckCards) {
      for (const c of r.categories ?? []) set.add(c);
    }
    return Array.from(set);
  }, [deckCards]);

  const cardSliceById = useMemo(() => {
    const map = new Map<string, DeckCardSlice>();
    for (const r of deckCards) {
      map.set(r.card_id, {
        qty: r.qty,
        categories: r.categories ?? [],
        notes: r.notes,
      });
    }
    return map;
  }, [deckCards]);

  const openCard = (card: CardDetail, isCommander: boolean) => {
    setSelectedCard({
      card,
      slice: isCommander ? null : cardSliceById.get(card.scryfall_id) ?? null,
      isCommander,
    });
  };

  const removeCard = async (cardId: string) => {
    if (!confirm("Retirer cette carte du deck ?")) return;
    const r = await fetch(`/api/decks/${deck.id}/cards/${cardId}`, {
      method: "DELETE",
    });
    if (r.ok) router.refresh();
  };

  const allRows = useMemo(
    () =>
      deckCards
        .map((r) => ({ row: r, card: unwrap(r.cards) }))
        .filter((x): x is { row: DeckCardRow; card: CardSummary } => x.card !== null),
    [deckCards]
  );

  // Sépare les cartes du main deck vs les sections en dehors (sideboard, maybeboard…)
  const mainCards = useMemo(
    () => allRows.filter((x) => !isOutsideDeck(x.row.categories ?? [])),
    [allRows]
  );
  const outsideCards = useMemo(
    () => allRows.filter((x) => isOutsideDeck(x.row.categories ?? [])),
    [allRows]
  );

  const totalCount =
    commanders.length + mainCards.reduce((sum, x) => sum + x.row.qty, 0);

  const totalPrice =
    commanders.reduce((s, c) => s + priceUsd(c), 0) +
    mainCards.reduce((s, x) => s + priceUsd(x.card) * x.row.qty, 0);

  const overPriced = mainCards.filter((x) => priceUsd(x.card) > 50);

  // Mana curve (CMC 0..7+) — main deck only
  const curve = new Array(8).fill(0);
  for (const x of mainCards) {
    const cmc = x.card.cmc ?? 0;
    const idx = Math.min(7, Math.floor(cmc));
    curve[idx] += x.row.qty;
  }
  const maxCurve = Math.max(1, ...curve);

  // Color identity — main deck only
  const colorCount: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  for (const x of mainCards) {
    const ci = x.card.color_identity ?? [];
    if (ci.length === 0) colorCount.C += x.row.qty;
    else for (const c of ci) if (c in colorCount) colorCount[c] += x.row.qty;
  }

  // Group main cards by category (filtre les catégories "outside" éventuelles)
  const byCategory = useMemo(() => {
    const map = new Map<string, Array<{ card: CardSummary; qty: number }>>();
    for (const x of mainCards) {
      const cats = (x.row.categories ?? []).filter((c) => !OUTSIDE_DECK_PATTERNS.test(c));
      const display = cats.length > 0 ? cats : ["Other"];
      for (const cat of display) {
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push({ card: x.card, qty: x.row.qty });
      }
    }
    return map;
  }, [mainCards]);

  const orderedCats = [
    ...DEFAULT_GROUPS.filter((g) => byCategory.has(g)),
    ...Array.from(byCategory.keys()).filter((g) => !DEFAULT_GROUPS.includes(g)),
  ];

  // Group outside cards by category (Sideboard, Maybeboard, etc.)
  const outsideByCategory = useMemo(() => {
    const map = new Map<string, Array<{ card: CardSummary; qty: number }>>();
    for (const x of outsideCards) {
      const cats = (x.row.categories ?? []).filter((c) => OUTSIDE_DECK_PATTERNS.test(c));
      const display = cats.length > 0 ? cats : ["Other"];
      for (const cat of display) {
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push({ card: x.card, qty: x.row.qty });
      }
    }
    return map;
  }, [outsideCards]);

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
          <div className="flex items-center gap-6">
            <div className="text-right text-sm font-body text-ink/60">
              <p>{totalCount} / 100 cartes</p>
              <p>{totalPrice.toFixed(2)} USD</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-xs uppercase tracking-wider"
            >
              + Ajouter une carte
            </button>
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
            <CategorySection title="Commander" count={commanders.length} defaultOpen>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {commanders.map((c) => (
                  <CardTile
                    key={c.scryfall_id}
                    card={c}
                    qty={1}
                    onClick={() => openCard(c, true)}
                  />
                ))}
              </div>
            </CategorySection>
          )}

          {orderedCats.map((cat) => {
            const items = byCategory.get(cat)!;
            const count = items.reduce((s, i) => s + i.qty, 0);
            return (
              <CategorySection key={cat} title={cat} count={count} defaultOpen>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((i) => (
                    <CardTile
                      key={i.card.scryfall_id}
                      card={i.card}
                      qty={i.qty}
                      onClick={() => openCard(i.card, false)}
                      onRemove={() => removeCard(i.card.scryfall_id)}
                    />
                  ))}
                </div>
              </CategorySection>
            );
          })}

          {mainCards.length === 0 && commanders.length > 0 && (
            <p className="font-display text-2xl text-ink/40 py-12">
              Ce deck n&apos;a pas encore de cartes (à part le commander).
            </p>
          )}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start space-y-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto pr-1">
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

          {outsideByCategory.size > 0 && (
            <div className="pt-6 border-t border-ink/10 space-y-4">
              <p className="font-body text-xs uppercase tracking-wider text-ink/60">
                Hors deck principal
              </p>
              {Array.from(outsideByCategory.entries()).map(([cat, items]) => {
                const count = items.reduce((s, i) => s + i.qty, 0);
                return (
                  <CompactCategory key={cat} title={cat} count={count}>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map((i) => (
                        <CardTile
                          key={i.card.scryfall_id}
                          card={i.card}
                          qty={i.qty}
                          compact
                          onClick={() => openCard(i.card, false)}
                          onRemove={() => removeCard(i.card.scryfall_id)}
                        />
                      ))}
                    </div>
                  </CompactCategory>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      {showAddModal && (
        <AddCardModal
          deckId={deck.id}
          existingCategories={allCategoriesInDeck}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {selectedCard && (
        <CardDetailDrawer
          deckId={deck.id}
          card={selectedCard.card}
          slice={selectedCard.slice}
          knownCategories={allCategoriesInDeck}
          isCommander={selectedCard.isCommander}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  );
}

function CategorySection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-baseline gap-3 mb-4 group w-full text-left"
      >
        <span
          className={`text-ink/40 text-sm font-body transition-transform inline-block w-3 ${
            open ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>
        <h2 className="font-display text-2xl text-ink group-hover:text-terracotta transition-colors">
          {title}
        </h2>
        <span className="font-body text-sm text-ink/40">{count}</span>
      </button>
      {open && children}
    </div>
  );
}

function CompactCategory({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-baseline gap-2 group w-full text-left mb-2"
      >
        <span
          className={`text-ink/40 text-xs font-body transition-transform inline-block w-3 ${
            open ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>
        <h4 className="font-display text-base text-ink group-hover:text-terracotta transition-colors">
          {title}
        </h4>
        <span className="font-body text-xs text-ink/40">{count}</span>
      </button>
      {open && children}
    </div>
  );
}

function CardTile({
  card,
  qty,
  compact = false,
  onClick,
  onRemove,
}: {
  card: CardSummary;
  qty: number;
  compact?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const expensive = (parseFloat(card.prices?.usd ?? "0") || 0) > 50;
  return (
    <article className="group relative">
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        aria-label={`Détails de ${card.name}`}
      >
        {card.image_uris?.normal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={compact ? card.image_uris.small ?? card.image_uris.normal : card.image_uris.normal}
            alt={card.name}
            loading="lazy"
            className="w-full rounded-lg shadow-sm group-hover:shadow-lg group-hover:ring-1 group-hover:ring-terracotta transition-all"
          />
        ) : (
          <div className="aspect-[5/7] rounded-lg bg-ink/5 flex items-center justify-center text-center p-2 group-hover:ring-1 group-hover:ring-terracotta">
            <span className={compact ? "font-display text-xs text-ink/60" : "font-display text-sm text-ink/60"}>
              {card.name}
            </span>
          </div>
        )}
      </button>
      {qty > 1 && (
        <span className={`absolute top-1 right-1 bg-ink text-cream rounded-full ${compact ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs"} flex items-center justify-center font-body pointer-events-none`}>
          ×{qty}
        </span>
      )}
      {expensive && !compact && (
        <span className="absolute top-2 left-2 bg-sand text-ink rounded-sm px-2 py-0.5 text-[10px] font-body uppercase tracking-wider pointer-events-none">
          50$+
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Retirer ${card.name}`}
          className={`absolute ${compact ? "bottom-1 right-1 w-6 h-6 text-xs" : "bottom-2 right-2 w-8 h-8 text-sm"} bg-ink/80 hover:bg-terracotta text-cream rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-body`}
        >
          ✕
        </button>
      )}
    </article>
  );
}
