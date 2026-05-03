/**
 * Wrapper minimal autour de l'API Scryfall.
 * Phase 0 : autocomplete + recherche basique.
 * Phase 1 : ajout du bulk sync (voir /scripts/sync-scryfall.ts).
 *
 * Rate limit Scryfall : 10 req/sec recommandé. On reste large.
 * Doc : https://scryfall.com/docs/api
 */

const SCRYFALL_BASE = "https://api.scryfall.com";

export interface ScryfallSearchOptions {
  query: string;
  unique?: "cards" | "art" | "prints";
  order?: "name" | "edhrec" | "cmc" | "color";
  page?: number;
}

export async function scryfallAutocomplete(
  q: string
): Promise<{ data: string[] }> {
  const url = `${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`Scryfall autocomplete failed: ${r.status}`);
  return r.json();
}

export async function scryfallSearch(opts: ScryfallSearchOptions) {
  const params = new URLSearchParams({ q: opts.query });
  if (opts.unique) params.set("unique", opts.unique);
  if (opts.order) params.set("order", opts.order);
  if (opts.page) params.set("page", String(opts.page));

  const url = `${SCRYFALL_BASE}/cards/search?${params.toString()}`;
  const r = await fetch(url, { next: { revalidate: 600 } });
  if (!r.ok) throw new Error(`Scryfall search failed: ${r.status}`);
  return r.json();
}

export async function scryfallNamed(name: string) {
  const url = `${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`;
  const r = await fetch(url, { next: { revalidate: 86400 } });
  if (!r.ok) throw new Error(`Scryfall named failed: ${r.status}`);
  return r.json();
}

export async function scryfallById(id: string) {
  const url = `${SCRYFALL_BASE}/cards/${id}`;
  const r = await fetch(url, { next: { revalidate: 86400 } });
  if (!r.ok) throw new Error(`Scryfall byId failed: ${r.status}`);
  return r.json();
}
