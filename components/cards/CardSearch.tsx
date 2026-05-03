"use client";

import { useEffect, useMemo, useState } from "react";

type Card = {
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

type SearchResult = {
  cards: Card[];
  total: number;
  page: number;
  pages: number;
};

const COLORS = [
  { code: "W", label: "Blanc", swatch: "#F5EDDF" },
  { code: "U", label: "Bleu", swatch: "#7BAFC4" },
  { code: "B", label: "Noir", swatch: "#2A2218" },
  { code: "R", label: "Rouge", swatch: "#C4704A" },
  { code: "G", label: "Vert", swatch: "#6B8E5A" },
];

const TYPES = [
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Land",
];

export function CardSearch() {
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [cmcMin, setCmcMin] = useState<number | null>(null);
  const [cmcMax, setCmcMax] = useState<number | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<Card | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (text) p.set("text", text);
    if (colors.length) p.set("colors", colors.join(","));
    if (types.length) p.set("types", types.join(","));
    if (cmcMin !== null) p.set("cmcMin", String(cmcMin));
    if (cmcMax !== null) p.set("cmcMax", String(cmcMax));
    p.set("page", String(page));
    return p.toString();
  }, [q, text, colors, cmcMin, cmcMax, types, page]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/cards/search?${params}`, {
          signal: controller.signal,
        });
        const data = await r.json();
        setResults(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [params]);

  const toggleColor = (c: string) => {
    setPage(1);
    setColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };
  const toggleType = (t: string) => {
    setPage(1);
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <section className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 px-8 md:px-16 lg:px-24 pb-16">
      {/* Filtres */}
      <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
            Nom
          </label>
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Ex: Aragorn"
            className="w-full px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
          />
        </div>

        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
            Texte oracle contient
          </label>
          <input
            value={text}
            onChange={(e) => {
              setPage(1);
              setText(e.target.value);
            }}
            placeholder="Ex: draw a card"
            className="w-full px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
          />
        </div>

        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-3">
            Identité de couleur
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => {
              const active = colors.includes(c.code);
              return (
                <button
                  key={c.code}
                  onClick={() => toggleColor(c.code)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    active ? "border-terracotta scale-110" : "border-ink/15 hover:border-ink/40"
                  }`}
                  style={{ backgroundColor: c.swatch }}
                  title={c.label}
                  aria-pressed={active}
                />
              );
            })}
          </div>
        </div>

        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
            Coût converti (CMC)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              max={20}
              placeholder="Min"
              value={cmcMin ?? ""}
              onChange={(e) => {
                setPage(1);
                setCmcMin(e.target.value === "" ? null : Number(e.target.value));
              }}
              className="w-1/2 px-2 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
            />
            <span className="text-ink/40">—</span>
            <input
              type="number"
              min={0}
              max={20}
              placeholder="Max"
              value={cmcMax ?? ""}
              onChange={(e) => {
                setPage(1);
                setCmcMax(e.target.value === "" ? null : Number(e.target.value));
              }}
              className="w-1/2 px-2 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
            Types
          </label>
          <div className="flex flex-col gap-1">
            {TYPES.map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 text-sm font-body cursor-pointer hover:text-terracotta transition-colors"
              >
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={() => toggleType(t)}
                  className="accent-terracotta"
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Résultats */}
      <div>
        <div className="flex items-baseline justify-between mb-4 font-body text-sm text-ink/60">
          <span>
            {loading
              ? "Recherche…"
              : results
              ? `${results.total.toLocaleString("fr-CA")} cartes trouvées`
              : ""}
          </span>
          {results && results.pages > 1 && (
            <span>
              Page {page} / {results.pages}
            </span>
          )}
        </div>

        {results && results.cards.length === 0 && !loading && (
          <div className="font-display text-2xl text-ink/40 py-20 text-center">
            Aucune carte ne correspond.
            {results.total === 0 && (
              <p className="font-body text-sm text-ink/40 mt-4 max-w-md mx-auto">
                Si tu vois ce message après ta première sync, vérifie que la table <code>cards</code> est bien remplie.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results?.cards.map((card) => (
            <article
              key={card.scryfall_id}
              onMouseEnter={() => setHovered(card)}
              onMouseLeave={() => setHovered((h) => (h?.scryfall_id === card.scryfall_id ? null : h))}
              className="group relative"
            >
              {card.image_uris?.normal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.image_uris.normal}
                  alt={card.name}
                  loading="lazy"
                  className="w-full rounded-lg shadow-sm group-hover:shadow-lg transition-shadow"
                />
              ) : (
                <div className="aspect-[5/7] rounded-lg bg-ink/5 flex items-center justify-center text-center p-4">
                  <span className="font-display text-ink/60">{card.name}</span>
                </div>
              )}
              <div className="mt-2 px-1">
                <p className="font-body text-sm text-ink truncate">{card.name}</p>
                <p className="font-body text-xs text-ink/50 truncate">
                  {card.type_line ?? ""}
                </p>
              </div>
            </article>
          ))}
        </div>

        {results && results.pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-ink/15 rounded-sm text-sm hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-30"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(results.pages, p + 1))}
              disabled={page === results.pages}
              className="px-4 py-2 border border-ink/15 rounded-sm text-sm hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-30"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Hover preview large */}
      {hovered?.image_uris?.large && (
        <div className="hidden xl:block fixed top-1/2 right-8 -translate-y-1/2 pointer-events-none z-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hovered.image_uris.large}
            alt=""
            className="w-80 rounded-xl shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}
