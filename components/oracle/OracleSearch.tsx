"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CONCEPTS,
  CONCEPT_GROUPS,
  composeQuery,
  type ConceptGroup,
} from "@/lib/oracle/concepts";

type ScryfallCard = {
  id: string;
  name: string;
  type_line?: string;
  mana_cost?: string;
  oracle_text?: string;
  cmc?: number;
  color_identity?: string[];
  image_uris?: { normal?: string; small?: string; large?: string };
  card_faces?: Array<{ image_uris?: { normal?: string } }>;
  prices?: { usd?: string | null };
  scryfall_uri?: string;
};

type SearchResponse = {
  cards: ScryfallCard[];
  total: number;
  hasMore: boolean;
  query: string;
  error?: string;
};

const COLORS = [
  { code: "W", swatch: "#F5EDDF", label: "Blanc" },
  { code: "U", swatch: "#7BAFC4", label: "Bleu" },
  { code: "B", swatch: "#2A2218", label: "Noir" },
  { code: "R", swatch: "#C4704A", label: "Rouge" },
  { code: "G", swatch: "#6B8E5A", label: "Vert" },
];

export function OracleSearch() {
  const [naturalQuery, setNaturalQuery] = useState("");
  const [translating, setTranslating] = useState(false);
  const [conceptIds, setConceptIds] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Construit la query manuelle (concepts + couleurs + commander legal par défaut)
  const composedQuery = useMemo(() => {
    return composeQuery({
      conceptIds,
      colors,
      legalInCommander: true,
    });
  }, [conceptIds, colors]);

  // Synchronise composedQuery dans le champ query si l'utilisateur n'a pas encore tapé en NL
  useEffect(() => {
    if (!naturalQuery.trim()) {
      setQuery(composedQuery);
    }
  }, [composedQuery, naturalQuery]);

  const toggleConcept = (id: string) =>
    setConceptIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleColor = (c: string) =>
    setColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const translateNL = async () => {
    if (!naturalQuery.trim()) return;
    setTranslating(true);
    setError(null);
    try {
      const r = await fetch("/api/oracle/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalQuery }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Traduction échouée");
      } else {
        // Combine la traduction NL avec les concepts/couleurs déjà cochés
        const merged = [data.query, composedQuery].filter(Boolean).join(" ");
        setQuery(merged);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTranslating(false);
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, page: "1", order: "edhrec" });
      const r = await fetch(`/api/oracle/search?${params}`);
      const data = (await r.json()) as SearchResponse;
      if (!r.ok) {
        setError(data.error ?? "Recherche échouée");
        setResults(null);
      } else {
        setResults(data);
      }
    } finally {
      setSearching(false);
    }
  };

  const onNLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await translateNL();
  };

  // Auto-search quand query change (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      search();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const grouped: Record<ConceptGroup, typeof CONCEPTS> = useMemo(() => {
    const out = {} as Record<ConceptGroup, typeof CONCEPTS>;
    for (const g of CONCEPT_GROUPS) out[g] = [];
    for (const c of CONCEPTS) out[c.group].push(c);
    return out;
  }, []);

  return (
    <section className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10 px-8 md:px-16 lg:px-24 pb-16">
      {/* Colonne gauche : NL input + concepts + couleurs */}
      <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto pr-2">
        <form onSubmit={onNLSubmit}>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
            En langage naturel
          </label>
          <textarea
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            placeholder="Ex: créatures vertes avec piétinement à 4 manas ou moins, ou 'ramp d'artefact qui ajoute 2 manas'"
            rows={3}
            className="w-full px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm resize-none"
          />
          <button
            type="submit"
            disabled={translating || !naturalQuery.trim()}
            className="mt-2 w-full px-4 py-2 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {translating ? "Traduction…" : "Traduire en Scryfall"}
          </button>
        </form>

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
                  type="button"
                  onClick={() => toggleColor(c.code)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    active
                      ? "border-terracotta scale-110"
                      : "border-ink/15 hover:border-ink/40"
                  }`}
                  style={{ backgroundColor: c.swatch }}
                  title={c.label}
                  aria-pressed={active}
                />
              );
            })}
          </div>
        </div>

        {CONCEPT_GROUPS.map((group) => {
          const concepts = grouped[group];
          if (concepts.length === 0) return null;
          return (
            <div key={group}>
              <p className="font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
                {group}
              </p>
              <div className="flex flex-wrap gap-2">
                {concepts.map((c) => {
                  const active = conceptIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleConcept(c.id)}
                      title={c.hint}
                      className={`px-3 py-1.5 rounded-full text-xs font-body transition-colors ${
                        active
                          ? "bg-ink text-cream"
                          : "border border-ink/15 text-ink/70 hover:border-terracotta hover:text-terracotta"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </aside>

      {/* Colonne droite : Query inspector + résultats */}
      <div className="space-y-6">
        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
            Requête Scryfall générée
            <span className="ml-2 text-ink/30 normal-case tracking-normal">
              (modifiable)
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="legal:commander t:creature c:g o:trample mv<=4"
              className="flex-1 px-4 py-3 bg-ink/5 border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-mono text-sm"
            />
            <button
              type="button"
              onClick={search}
              disabled={!query.trim() || searching}
              className="px-5 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {searching ? "…" : "Rechercher"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-terracotta font-body">⚠ {error}</p>
          )}
        </div>

        {results && (
          <div>
            <p className="font-body text-sm text-ink/60 mb-4">
              {results.total.toLocaleString("fr-CA")} cartes trouvées
              {results.hasMore && " (page 1 affichée)"}
            </p>

            {results.cards.length === 0 ? (
              <p className="font-display text-2xl text-ink/40 py-12 text-center">
                Aucun résultat. Essaie d&apos;ajuster la requête.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {results.cards.map((c) => {
                  const img =
                    c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal;
                  const price = parseFloat(c.prices?.usd ?? "") || 0;
                  return (
                    <a
                      key={c.id}
                      href={c.scryfall_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={c.name}
                          loading="lazy"
                          className="w-full rounded-lg shadow-sm group-hover:shadow-lg transition-shadow"
                        />
                      ) : (
                        <div className="aspect-[5/7] rounded-lg bg-ink/5 flex items-center justify-center text-center p-2">
                          <span className="font-display text-sm">{c.name}</span>
                        </div>
                      )}
                      <div className="mt-2 px-1">
                        <p className="font-body text-sm text-ink truncate">
                          {c.name}
                        </p>
                        <p className="font-body text-xs text-ink/50 truncate">
                          {c.type_line ?? ""}
                        </p>
                      </div>
                      {price > 50 && (
                        <span className="absolute top-2 left-2 bg-sand text-ink rounded-sm px-2 py-0.5 text-[10px] font-body uppercase tracking-wider">
                          50$+
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!results && !searching && !error && (
          <div className="border border-dashed border-ink/15 rounded-sm py-16 px-8 text-center">
            <p className="font-display text-2xl text-ink/40 mb-2">
              Pose ta question.
            </p>
            <p className="font-body text-sm text-ink/40 max-w-md mx-auto">
              Tu peux écrire en langage naturel à gauche et cliquer
              &laquo;&nbsp;Traduire&nbsp;&raquo;, ou cocher des concepts, ou
              écrire directement la syntaxe Scryfall ci-dessus.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
