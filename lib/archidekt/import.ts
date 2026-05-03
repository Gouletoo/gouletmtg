/**
 * Import d'un deck Archidekt.
 * API publique : https://archidekt.com/api/decks/{deck_id}/
 *
 * Le format de réponse Archidekt évolue. On code défensivement :
 * - On accepte plusieurs formats d'URL
 * - On essaie de matcher les cartes par scryfall_id, puis par nom
 * - On extrait le commander via catégories
 */

export interface ArchidektCardRef {
  scryfall_id: string | null;
  name: string;
  qty: number;
  categories: string[];
  is_commander: boolean;
}

export interface ArchidektDeck {
  archidekt_id: string;
  name: string;
  description?: string;
  cards: ArchidektCardRef[];
}

/** Extrait l'ID du deck depuis une URL ou un ID brut. */
export function extractDeckId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/archidekt\.com\/(?:api\/)?decks\/(\d+)/);
  return m ? m[1] : null;
}

interface ArchidektCardWire {
  card?: {
    uid?: string;
    oracleCard?: { uid?: string; name?: string };
    edition?: { editioncode?: string };
    name?: string;
  };
  quantity?: number;
  categories?: string[];
  category?: string;
  modifier?: string;
}

interface ArchidektDeckWire {
  id?: number;
  name?: string;
  description?: string;
  cards?: ArchidektCardWire[];
  categories?: Array<{ name: string; isPremier?: boolean; includedInDeck?: boolean }>;
}

export async function fetchArchidektDeck(idOrUrl: string): Promise<ArchidektDeck> {
  const id = extractDeckId(idOrUrl);
  if (!id) {
    throw new Error("URL ou ID Archidekt invalide");
  }

  const url = `https://archidekt.com/api/decks/${id}/`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!r.ok) {
    throw new Error(`Archidekt fetch a échoué (${r.status}). Le deck est-il public ?`);
  }
  const data = (await r.json()) as ArchidektDeckWire;

  // Identifier les catégories considérées comme "commander"
  const commanderCategories = new Set(
    (data.categories ?? [])
      .filter((c) => /commander/i.test(c.name))
      .map((c) => c.name)
  );
  // Fallback : catégorie nommée "Commander" (par défaut chez Archidekt)
  if (commanderCategories.size === 0) commanderCategories.add("Commander");

  const cards: ArchidektCardRef[] = (data.cards ?? []).map((c) => {
    const cats = c.categories ?? (c.category ? [c.category] : []);
    const isCommander =
      cats.some((cat) => commanderCategories.has(cat)) ||
      /commander/i.test(c.modifier ?? "");
    const scryfall_id =
      c.card?.uid ?? c.card?.oracleCard?.uid ?? null;
    const name = c.card?.oracleCard?.name ?? c.card?.name ?? "Unknown";

    return {
      scryfall_id,
      name,
      qty: c.quantity ?? 1,
      categories: cats.filter((cat) => !commanderCategories.has(cat)),
      is_commander: isCommander,
    };
  });

  return {
    archidekt_id: id,
    name: data.name ?? `Deck Archidekt #${id}`,
    description: data.description,
    cards,
  };
}
