"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  scryfall_id: string;
  name: string;
  type_line: string | null;
  image_uris: Record<string, string> | null;
  color_identity: string[] | null;
  oracle_text: string | null;
  prices: Record<string, string | null> | null;
  reason: string;
};

const COLORS = [
  { code: "W", swatch: "#F5EDDF", label: "Blanc" },
  { code: "U", swatch: "#7BAFC4", label: "Bleu" },
  { code: "B", swatch: "#2A2218", label: "Noir" },
  { code: "R", swatch: "#C4704A", label: "Rouge" },
  { code: "G", swatch: "#6B8E5A", label: "Vert" },
];

const EXAMPLES = [
  "Tribal allies avec triggers de combat",
  "Tokens swarm verts qui se transforment en ressources",
  "Reanimator qui recycle de gros threats",
  "Spellslinger storm sans combo infini",
  "Voltron sur une créature avec equipment",
  "Group hug mais qui gagne en value",
  "Stax léger qui ralentit le pod",
  "Sacrifice/aristocrats avec death triggers",
];

export function ThemeSuggester() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const toggleColor = (c: string) =>
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const [hasRun, setHasRun] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setDropped([]);
    setHasRun(true);

    try {
      const r = await fetch("/api/decks/suggest-commanders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, colors }),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        setError(data.error ?? `Erreur HTTP ${r.status}`);
        return;
      }
      setSuggestions(data.suggestions ?? []);
      setDropped(data.droppedNames ?? []);
      if ((data.suggestions ?? []).length === 0) {
        if ((data.droppedNames ?? []).length > 0) {
          setError(
            `Gemini a proposé ${data.droppedNames.length} commander(s) mais aucun n'a été trouvé dans ta base : ${data.droppedNames.slice(0, 5).join(", ")}…`
          );
        } else if (data.debug) {
          setError(
            `Gemini a répondu mais le parser n'a rien extrait. Réponse brute : « ${data.debug.slice(0, 200)}… »`
          );
        } else {
          setError("Gemini n'a pas retourné de suggestions. Re-essaie avec un thème différent.");
        }
      }
    } catch (err) {
      setError((err as Error).message ?? "Échec réseau");
    } finally {
      setLoading(false);
    }
  };

  const pick = async (s: Suggestion) => {
    setCreating(s.scryfall_id);
    const r = await fetch("/api/decks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${s.name} — ${theme.slice(0, 40)}`,
        commanderId: s.scryfall_id,
        strategySummary: theme,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Création échouée");
      setCreating(null);
      return;
    }
    router.push(`/decks/${data.deckId}/builder`);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-3">
            Couleurs autorisées (optionnel)
          </label>
          <div className="flex gap-2 items-center flex-wrap">
            {COLORS.map((c) => {
              const active = colors.includes(c.code);
              return (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => toggleColor(c.code)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
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
            {colors.length > 0 && (
              <button
                type="button"
                onClick={() => setColors([])}
                className="ml-2 text-xs font-body text-ink/40 hover:text-terracotta underline"
              >
                Réinitialiser
              </button>
            )}
            <span className="ml-2 text-xs font-body text-ink/40">
              {colors.length === 0
                ? "Aucune restriction"
                : colors.length === 5
                ? "Toutes les couleurs"
                : `${colors.join("")} et sous-ensembles`}
            </span>
          </div>
        </div>

        <textarea
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex: 'tribal elfes avec triggers de combat et token doublers'"
          rows={3}
          className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-base resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setTheme(ex)}
              className="px-3 py-1 rounded-full text-xs font-body text-ink/60 border border-ink/15 hover:border-terracotta hover:text-terracotta transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading || !theme.trim()}
          className="px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? "Suggestion en cours…" : "Suggérer des commanders"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-terracotta font-body">⚠ {error}</p>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-ink">
              {suggestions.length} commanders proposés
            </h2>
            {dropped.length > 0 && (
              <p className="text-xs font-body text-ink/40">
                ({dropped.length} suggestion{dropped.length > 1 ? "s" : ""} ignorée{dropped.length > 1 ? "s" : ""}, non trouvée{dropped.length > 1 ? "s" : ""})
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((s) => {
              const price = parseFloat(s.prices?.usd ?? "") || 0;
              const expensive = price > 50;
              return (
                <article
                  key={s.scryfall_id}
                  className="border border-ink/10 rounded-sm overflow-hidden hover:border-terracotta transition-colors"
                >
                  {s.image_uris?.normal ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image_uris.normal}
                      alt={s.name}
                      className="w-full"
                    />
                  ) : (
                    <div className="aspect-[5/7] bg-ink/5 flex items-center justify-center p-4">
                      <span className="font-display">{s.name}</span>
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-display text-lg text-ink">{s.name}</h3>
                      <p className="font-body text-xs text-ink/50">
                        {s.type_line}
                        {s.color_identity && s.color_identity.length > 0 && (
                          <> · {s.color_identity.join("")}</>
                        )}
                      </p>
                    </div>
                    <p className="font-body text-sm text-ink/75 leading-relaxed italic">
                      « {s.reason} »
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-ink/10">
                      <span
                        className={`text-xs font-body ${
                          expensive ? "text-terracotta font-medium" : "text-ink/40"
                        }`}
                      >
                        {price > 0 ? `${price.toFixed(2)} USD` : "—"}
                        {expensive && " ⚠"}
                      </span>
                      <button
                        onClick={() => pick(s)}
                        disabled={creating !== null}
                        className="px-3 py-1.5 bg-ink text-cream rounded-sm hover:bg-terracotta text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        {creating === s.scryfall_id ? "Création…" : "Choisir"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !hasRun && (
        <p className="font-body text-ink/40 italic">
          Tape un thème puis clique &laquo;&nbsp;Suggérer&nbsp;&raquo; pour voir
          des commanders pertinents.
        </p>
      )}
    </div>
  );
}
