import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchArchidektDeck } from "@/lib/archidekt/import";

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

  // Résoudre les scryfall_id manquants via la table cards
  const missingScryfall = archidekt.cards.filter((c) => !c.scryfall_id);
  const namesNeeded = Array.from(new Set(missingScryfall.map((c) => c.name)));

  let nameToId = new Map<string, string>();
  if (namesNeeded.length > 0) {
    const { data: matches } = await supabase
      .from("cards")
      .select("scryfall_id,name")
      .in("name", namesNeeded);
    nameToId = new Map((matches ?? []).map((m) => [m.name, m.scryfall_id as string]));
  }

  // Vérifier les scryfall_id fournis existent dans notre table
  const givenIds = archidekt.cards
    .map((c) => c.scryfall_id)
    .filter((x): x is string => Boolean(x));
  const { data: existingIds } = await supabase
    .from("cards")
    .select("scryfall_id")
    .in("scryfall_id", givenIds);
  const validIds = new Set((existingIds ?? []).map((r) => r.scryfall_id as string));

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
    let id: string | null = c.scryfall_id;
    if (id && !validIds.has(id)) id = null;
    if (!id) id = nameToId.get(c.name) ?? null;

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

  // Insert deck_cards (sauf commanders qui sont déjà liés via decks.commander_id)
  const nonCommanderCards = resolved.filter((r) => !r.isCommander);
  const rows = nonCommanderCards.map((c) => ({
    deck_id: deckRow.id,
    card_id: c.cardId,
    qty: c.qty,
    categories: c.categories,
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
