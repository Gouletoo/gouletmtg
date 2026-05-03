import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchArchidektDeck } from "@/lib/archidekt/import";

/** Échappe les caractères spéciaux ilike (%, _, virgule, parenthèses) pour `or()` PostgREST. */
function escapeIlike(s: string): string {
  return s.replace(/[%_,()]/g, (m) => `\\${m}`);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as { source: string };
  if (!body.source) {
    return NextResponse.json({ error: "URL ou ID requis" }, { status: 400 });
  }

  let archidekt;
  try {
    archidekt = await fetchArchidektDeck(body.source);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }

  // Stratégie : on tente le match dans cet ordre :
  //   1. scryfall_id si fourni ET présent dans notre DB
  //   2. nom exact (Archidekt) → cards.name
  //   3. front-face only pour DFCs/split (ex: "Search for Azcanta" → "Search for Azcanta // ...")
  // On indexe TOUS les noms d'un coup pour éviter N requêtes.

  const allNames = Array.from(new Set(archidekt.cards.map((c) => c.name)));

  // Match exact par nom
  const { data: exactMatches } = await supabase
    .from("cards")
    .select("scryfall_id,name")
    .in("name", allNames);
  const exactByName = new Map((exactMatches ?? []).map((m) => [m.name as string, m.scryfall_id as string]));

  // Pour les noms non matchés en exact, tente le préfixe (DFC/split)
  const stillMissing = allNames.filter((n) => !exactByName.has(n));
  const prefixByName = new Map<string, string>();
  if (stillMissing.length > 0) {
    // Postgres `ilike any (...)` n'est pas supporté en supabase.in — on bouclera par lot.
    // Pour limiter les coûts, on cherche par chunks de 50 via `or()` avec ilike.
    const CHUNK = 50;
    for (let i = 0; i < stillMissing.length; i += CHUNK) {
      const chunk = stillMissing.slice(i, i + CHUNK);
      // Construit "name.ilike.Search for Azcanta //%,name.ilike.Other //%"
      const filter = chunk
        .map((n) => `name.ilike.${escapeIlike(n)} //%`)
        .join(",");
      const { data: matches } = await supabase
        .from("cards")
        .select("scryfall_id,name")
        .or(filter);
      for (const m of matches ?? []) {
        const front = (m.name as string).split(" // ")[0];
        if (chunk.includes(front)) prefixByName.set(front, m.scryfall_id as string);
      }
    }
  }

  // Vérifier les scryfall_id fournis existent dans notre table
  const givenIds = archidekt.cards
    .map((c) => c.scryfall_id)
    .filter((x): x is string => Boolean(x));
  let validIds = new Set<string>();
  if (givenIds.length > 0) {
    const { data: existingIds } = await supabase
      .from("cards")
      .select("scryfall_id")
      .in("scryfall_id", givenIds);
    validIds = new Set((existingIds ?? []).map((r) => r.scryfall_id as string));
  }

  type Resolved = {
    cardId: string;
    qty: number;
    categories: string[];
    isCommander: boolean;
    name: string;
  };
  const resolved: Resolved[] = [];
  const unresolved: string[] = [];

  for (const c of archidekt.cards) {
    let id: string | null = null;

    // 1. scryfall_id direct
    if (c.scryfall_id && validIds.has(c.scryfall_id)) {
      id = c.scryfall_id;
    }
    // 2. nom exact
    if (!id) id = exactByName.get(c.name) ?? null;
    // 3. front-face DFC/split
    if (!id) id = prefixByName.get(c.name) ?? null;

    if (id) {
      resolved.push({
        cardId: id,
        qty: c.qty,
        categories: c.categories,
        isCommander: c.is_commander,
        name: c.name,
      });
    } else {
      unresolved.push(c.name);
    }
  }

  // Identifier le(s) commander(s)
  const commanders = resolved.filter((r) => r.isCommander);
  if (commanders.length === 0) {
    return NextResponse.json(
      { error: "Aucun commander identifié dans le deck Archidekt" },
      { status: 400 }
    );
  }

  // Créer le deck
  const { data: deckRow, error: deckErr } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      name: archidekt.name,
      commander_id: commanders[0].cardId,
      partner_commander_id: commanders[1]?.cardId ?? null,
      strategy_summary: archidekt.description?.slice(0, 500) ?? null,
      archidekt_id: archidekt.archidekt_id,
    })
    .select("id")
    .single();

  if (deckErr || !deckRow) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Création deck a échoué" },
      { status: 500 }
    );
  }

  // Dédupe par card_id (additionne qty, fusionne catégories) avant insert.
  // Le PK de deck_cards est (deck_id, card_id) → deux lignes pour la même carte cassent l'insert.
  const nonCommanderCards = resolved.filter((r) => !r.isCommander);
  const dedupMap = new Map<string, { qty: number; categories: Set<string> }>();
  for (const c of nonCommanderCards) {
    const existing = dedupMap.get(c.cardId);
    if (existing) {
      existing.qty += c.qty;
      for (const cat of c.categories) existing.categories.add(cat);
    } else {
      dedupMap.set(c.cardId, { qty: c.qty, categories: new Set(c.categories) });
    }
  }

  const rows = Array.from(dedupMap.entries()).map(([card_id, v]) => ({
    deck_id: deckRow.id,
    card_id,
    qty: v.qty,
    categories: Array.from(v.categories),
  }));

  if (rows.length > 0) {
    const { error: cardsErr } = await supabase.from("deck_cards").insert(rows);
    if (cardsErr) {
      return NextResponse.json(
        { error: `Deck créé mais cartes non insérées : ${cardsErr.message}`, deckId: deckRow.id },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    deckId: deckRow.id,
    cardsImported: resolved.length,
    cardsUnresolved: unresolved.length,
    unresolvedNames: unresolved.slice(0, 20),
  });
}
