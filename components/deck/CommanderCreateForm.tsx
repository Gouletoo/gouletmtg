"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CommanderCard = {
  scryfall_id: string;
  name: string;
  type_line: string | null;
  image_uris: Record<string, string> | null;
  color_identity: string[] | null;
};

export function CommanderCreateForm() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CommanderCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<CommanderCard | null>(null);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [bracket, setBracket] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recherche restreinte aux commandeurs (legendaires créatures)
  useEffect(() => {
    if (!search || search.length < 2 || picked) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: search,
          types: "Legendary Creature",
        });
        const r = await fetch(`/api/cards/search?${params}`, { signal: ctrl.signal });
        const data = await r.json();
        setResults(data.cards?.slice(0, 12) ?? []);
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
  }, [search, picked]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked) {
      setError("Choisis un commander");
      return;
    }
    setSubmitting(true);
    setError(null);
    const r = await fetch("/api/decks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || `${picked.name} — Commander`,
        commanderId: picked.scryfall_id,
        strategySummary: strategy || null,
        bracketTarget: bracket,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error ?? "Création échouée");
      setSubmitting(false);
      return;
    }
    router.push(`/decks/${data.deckId}/builder`);
  };

  const colorBadges = useMemo(() => {
    if (!picked) return null;
    const ci = picked.color_identity ?? [];
    return ci.length > 0 ? ci.join(" / ") : "Incolore";
  }, [picked]);

  return (
    <form onSubmit={submit} className="space-y-8">
      <div>
        <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
          Commander
        </label>
        {!picked ? (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tape un nom — ex: Aragorn, Coram, Bumbleflower"
              className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body"
              autoFocus
            />
            {searching && (
              <p className="mt-2 text-xs text-ink/40 font-body">Recherche…</p>
            )}
            {results.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {results.map((c) => (
                  <button
                    type="button"
                    key={c.scryfall_id}
                    onClick={() => {
                      setPicked(c);
                      setName(`${c.name} — Commander`);
                    }}
                    className="text-left group"
                  >
                    {c.image_uris?.normal ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.image_uris.normal}
                        alt={c.name}
                        className="w-full rounded-lg group-hover:ring-2 group-hover:ring-terracotta transition-all"
                      />
                    ) : (
                      <div className="aspect-[5/7] bg-ink/5 rounded-lg flex items-center justify-center p-2">
                        <span className="font-display text-sm">{c.name}</span>
                      </div>
                    )}
                    <p className="mt-1 text-xs font-body truncate">{c.name}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex gap-4 items-start border border-ink/10 rounded-sm p-4">
            {picked.image_uris?.small ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picked.image_uris.small}
                alt={picked.name}
                className="w-32 rounded-md"
              />
            ) : null}
            <div className="flex-1">
              <p className="font-display text-2xl text-ink">{picked.name}</p>
              <p className="text-sm text-ink/60 mb-1">{picked.type_line}</p>
              <p className="text-xs text-terracotta font-body uppercase tracking-wider">
                {colorBadges}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setSearch("");
                }}
                className="mt-3 text-xs text-ink/50 hover:text-terracotta underline"
              >
                Changer de commander
              </button>
            </div>
          </div>
        )}
      </div>

      {picked && (
        <>
          <div>
            <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
              Nom du deck
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body"
            />
          </div>

          <div>
            <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
              Résumé de la stratégie (optionnel)
            </label>
            <textarea
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              rows={3}
              placeholder="Ex: Allies tribal qui spamme des créatures et utilise les triggers d'Aragorn pour générer du value à chaque combat."
              className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
            />
          </div>

          <div>
            <label className="block font-body text-xs uppercase tracking-wider text-ink/60 mb-2">
              Bracket cible
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setBracket(bracket === n ? null : n)}
                  className={`w-10 h-10 rounded-sm border font-body text-sm transition-colors ${
                    bracket === n
                      ? "bg-ink text-cream border-ink"
                      : "border-ink/15 hover:border-terracotta"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? "Création…" : "Créer le deck"}
            </button>
            {error && <p className="text-sm text-terracotta font-body">{error}</p>}
          </div>
        </>
      )}
    </form>
  );
}
