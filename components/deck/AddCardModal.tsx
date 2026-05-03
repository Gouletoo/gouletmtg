"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CardHit = {
  scryfall_id: string;
  name: string;
  type_line: string | null;
  cmc: number | null;
  image_uris: Record<string, string> | null;
};

const SUGGESTED_CATEGORIES = [
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
];

export function AddCardModal({
  deckId,
  existingCategories,
  onClose,
}: {
  deckId: string;
  existingCategories: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CardHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedCategories, setPickedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await r.json();
        setResults(data.cards?.slice(0, 24) ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  // ESC pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allCategories = Array.from(
    new Set([...SUGGESTED_CATEGORIES, ...existingCategories])
  );

  const toggleCat = (c: string) =>
    setPickedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const addCard = async (card: CardHit) => {
    setAdding(card.scryfall_id);
    setError(null);
    let cats = [...pickedCategories];
    if (customCategory.trim()) cats.push(customCategory.trim());
    cats = Array.from(new Set(cats));

    const r = await fetch(`/api/decks/${deckId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.scryfall_id, categories: cats }),
    });
    setAdding(null);
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Ajout échoué");
      return;
    }
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-ink/40">
      <div
        className="bg-cream w-full max-w-4xl max-h-[85vh] rounded-md shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta">
              Ajouter une carte
            </p>
            <p className="font-body text-sm text-ink/50 mt-1">
              Choisis les catégories d&apos;abord, puis clique sur la carte pour
              l&apos;ajouter.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-terracotta text-xl"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-4 border-b border-ink/10 space-y-4">
          <div>
            <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
              Catégories à appliquer
            </label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((c) => {
                const active = pickedCategories.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    className={`px-3 py-1 rounded-full text-xs font-body transition-colors ${
                      active
                        ? "bg-ink text-cream"
                        : "border border-ink/15 text-ink/70 hover:border-terracotta hover:text-terracotta"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="+ Nouvelle catégorie"
                className="px-3 py-1 rounded-full text-xs font-body bg-cream border border-ink/15 focus:border-terracotta focus:outline-none"
              />
            </div>
          </div>

          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tape un nom de carte… (ex: Lightning Bolt)"
            className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p className="text-sm text-terracotta font-body mb-4">⚠ {error}</p>
          )}
          {searching && q.length >= 2 && (
            <p className="font-body text-sm text-ink/40">Recherche…</p>
          )}
          {!searching && q.length < 2 && (
            <p className="font-display text-2xl text-ink/30 text-center py-12">
              Tape au moins 2 lettres pour chercher.
            </p>
          )}
          {!searching && q.length >= 2 && results.length === 0 && (
            <p className="font-display text-xl text-ink/40 text-center py-12">
              Aucune carte ne correspond.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {results.map((c) => (
              <button
                key={c.scryfall_id}
                onClick={() => addCard(c)}
                disabled={adding === c.scryfall_id}
                className="text-left group relative disabled:opacity-50"
              >
                {c.image_uris?.normal ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image_uris.normal}
                    alt={c.name}
                    loading="lazy"
                    className="w-full rounded-md group-hover:ring-2 group-hover:ring-terracotta transition-all"
                  />
                ) : (
                  <div className="aspect-[5/7] rounded-md bg-ink/5 flex items-center justify-center p-2">
                    <span className="font-display text-xs">{c.name}</span>
                  </div>
                )}
                <p className="mt-1 text-xs font-body truncate">{c.name}</p>
                {adding === c.scryfall_id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-cream/80 rounded-md">
                    <span className="font-body text-xs text-terracotta">
                      Ajout…
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
