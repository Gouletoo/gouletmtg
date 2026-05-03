"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type CardDetail = {
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

export type DeckCardSlice = {
  qty: number;
  categories: string[];
  notes: string | null;
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

export function CardDetailDrawer({
  deckId,
  card,
  slice,
  knownCategories,
  onClose,
  isCommander,
}: {
  deckId: string;
  card: CardDetail;
  slice: DeckCardSlice | null; // null si commander (pas dans deck_cards)
  knownCategories: string[];
  onClose: () => void;
  isCommander: boolean;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(slice?.qty ?? 1);
  const [categories, setCategories] = useState<string[]>(slice?.categories ?? []);
  const [notes, setNotes] = useState(slice?.notes ?? "");
  const [customCat, setCustomCat] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allCategories = Array.from(
    new Set([...SUGGESTED_CATEGORIES, ...knownCategories, ...categories])
  );

  const toggleCat = (c: string) =>
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const addCustomCat = () => {
    const v = customCat.trim();
    if (v && !categories.includes(v)) {
      setCategories([...categories, v]);
      setCustomCat("");
    }
  };

  const save = async () => {
    if (isCommander) return;
    setSaving(true);
    const r = await fetch(`/api/decks/${deckId}/cards/${card.scryfall_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty, categories, notes: notes || null }),
    });
    setSaving(false);
    if (r.ok) {
      setSavedAt(Date.now());
      router.refresh();
      setTimeout(() => setSavedAt(null), 1500);
    }
  };

  const remove = async () => {
    if (isCommander) {
      alert("Les commanders ne peuvent pas être retirés depuis ce panneau.");
      return;
    }
    if (!confirm(`Retirer ${card.name} du deck ?`)) return;
    const r = await fetch(`/api/decks/${deckId}/cards/${card.scryfall_id}`, {
      method: "DELETE",
    });
    if (r.ok) {
      router.refresh();
      onClose();
    }
  };

  const priceUsd = parseFloat(card.prices?.usd ?? "") || 0;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[480px] bg-cream shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur px-6 py-4 border-b border-ink/10 flex items-center justify-between">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta">
            {isCommander ? "Commander" : "Carte"}
          </p>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-terracotta text-xl"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {card.image_uris?.large || card.image_uris?.normal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image_uris.large ?? card.image_uris.normal}
              alt={card.name}
              className="w-full rounded-xl shadow-lg"
            />
          ) : null}

          <div>
            <h2 className="font-display text-3xl text-ink mb-1">{card.name}</h2>
            <p className="font-body text-sm text-ink/60">{card.type_line}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs font-body text-ink/50">
              {card.cmc !== null && <span>CMC {card.cmc}</span>}
              {card.color_identity && card.color_identity.length > 0 && (
                <span>ID : {card.color_identity.join("")}</span>
              )}
              {priceUsd > 0 && (
                <span className={priceUsd > 50 ? "text-terracotta font-medium" : ""}>
                  {priceUsd.toFixed(2)} USD
                  {priceUsd > 50 && " ⚠"}
                </span>
              )}
            </div>
          </div>

          {card.oracle_text && (
            <div className="bg-ink/5 rounded-md p-4">
              <p className="font-body text-sm text-ink whitespace-pre-line leading-relaxed">
                {card.oracle_text}
              </p>
            </div>
          )}

          {!isCommander && slice && (
            <>
              <div className="border-t border-ink/10 pt-6 space-y-6">
                <div>
                  <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
                    Quantité
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-10 h-10 rounded-sm border border-ink/15 hover:border-terracotta hover:text-terracotta font-body"
                    >
                      −
                    </button>
                    <span className="font-display text-2xl w-12 text-center">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="w-10 h-10 rounded-sm border border-ink/15 hover:border-terracotta hover:text-terracotta font-body"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
                    Catégories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map((c) => {
                      const active = categories.includes(c);
                      return (
                        <button
                          type="button"
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
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={customCat}
                      onChange={(e) => setCustomCat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomCat();
                        }
                      }}
                      placeholder="Nouvelle catégorie…"
                      className="flex-1 px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomCat}
                      className="px-4 py-2 border border-ink/15 hover:border-terracotta hover:text-terracotta rounded-sm text-xs uppercase tracking-wider font-body"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
                    Note
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Pourquoi cette carte est dans le deck, comment elle interagit, etc."
                    className="w-full px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-ink/10 pt-6 flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? "Sauvegarde…" : savedAt ? "Sauvegardé ✓" : "Sauvegarder"}
                </button>
                <button
                  onClick={remove}
                  className="px-5 py-3 border border-terracotta text-terracotta hover:bg-terracotta hover:text-cream rounded-sm text-xs uppercase tracking-wider transition-colors"
                >
                  Retirer
                </button>
              </div>
            </>
          )}

          {isCommander && (
            <p className="font-body text-sm text-ink/50 border-t border-ink/10 pt-6 italic">
              Pour changer de commander, crée un nouveau deck ou édite-le directement.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
