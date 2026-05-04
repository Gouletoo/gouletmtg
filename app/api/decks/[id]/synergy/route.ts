import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTags, type Tag } from "@/lib/synergy/tags";
import { scoreFromTags, scoreColor } from "@/lib/synergy/scorer";
import { WEAK_LINK_THRESHOLD } from "@/lib/types";

/**
 * GET /api/decks/[id]/synergy
 *
 * Calcule la synergie commander ↔ chaque carte du deck.
 * Retourne :
 *  - commanderScores : score de chaque carte vs commander
 *  - weakLinks : cartes sous le seuil (40)
 *  - averageScore : moyenne globale
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deckId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Fetch deck (must own it via RLS)
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("id,commander_id,partner_commander_id,strategy_tags")
    .eq("id", deckId)
    .single();

  if (deckErr || !deck || !deck.commander_id) {
    return NextResponse.json({ error: "Deck introuvable ou sans commander" }, { status: 404 });
  }

  // Fetch commander cards
  const commanderIds = [deck.commander_id, deck.partner_commander_id].filter(
    (x): x is string => Boolean(x)
  );
  const { data: commanderRows } = await supabase
    .from("cards")
    .select("scryfall_id,name,oracle_text,type_line")
    .in("scryfall_id", commanderIds);

  if (!commanderRows || commanderRows.length === 0) {
    return NextResponse.json({ error: "Commander introuvable" }, { status: 404 });
  }

  // Fetch all deck cards with their card data
  const { data: deckCardRows } = await supabase
    .from("deck_cards")
    .select("card_id,qty,categories,cards(scryfall_id,name,oracle_text,type_line)")
    .eq("deck_id", deckId);

  if (!deckCardRows) {
    return NextResponse.json({ commanderScores: [], weakLinks: [], averageScore: 0 });
  }

  // Combine commander tags (si plusieurs commanders, union)
  const anchorTags: Tag[] = [];
  const seenTags = new Set<string>();
  const pushTag = (t: Tag) => {
    const key = `${t.category}:${t.value}`;
    if (!seenTags.has(key)) {
      seenTags.add(key);
      anchorTags.push(t);
    }
  };

  for (const c of commanderRows) {
    const tags = extractTags(c.oracle_text, c.type_line);
    for (const t of tags) pushTag(t);
  }

  // Augmente avec les strategy_tags (extraits par Gemini depuis le strategy_summary)
  const strategyTags = (deck.strategy_tags as string[] | null) ?? [];
  for (const raw of strategyTags) {
    const idx = raw.indexOf(":");
    if (idx <= 0) continue;
    pushTag({
      category: raw.slice(0, idx) as Tag["category"],
      value: raw.slice(idx + 1),
    });
  }

  // Score chaque carte du deck vs commander
  type RowCard = { scryfall_id: string; name: string; oracle_text: string | null; type_line: string | null };
  type Score = {
    cardId: string;
    name: string;
    score: number;
    color: "low" | "medium" | "high";
    tagOverlap: number;
    patternMatch: number;
    patterns: Array<{ id: string; name: string; explanation: string; score: number }>;
    sharedTags: string[];
  };

  const commanderScores: Score[] = [];

  for (const row of deckCardRows) {
    const card = (Array.isArray(row.cards) ? row.cards[0] : row.cards) as RowCard | null;
    if (!card) continue;
    const cardTags = extractTags(card.oracle_text, card.type_line);
    const result = scoreFromTags(anchorTags, cardTags);
    commanderScores.push({
      cardId: card.scryfall_id,
      name: card.name,
      score: result.score,
      color: scoreColor(result.score),
      tagOverlap: result.factors.tagOverlap,
      patternMatch: result.factors.patternMatch,
      patterns: result.patterns.map((p) => ({
        id: p.id,
        name: p.name,
        explanation: p.explanation,
        score: p.score,
      })),
      sharedTags: result.sharedTags.map((t) => `${t.category}:${t.value}`),
    });
  }

  // Tri par score décroissant
  commanderScores.sort((a, b) => b.score - a.score);

  const averageScore =
    commanderScores.length > 0
      ? Math.round(commanderScores.reduce((s, c) => s + c.score, 0) / commanderScores.length)
      : 0;

  const weakLinks = commanderScores.filter((c) => c.score < WEAK_LINK_THRESHOLD);

  return NextResponse.json({
    commanderId: deck.commander_id,
    commanderScores,
    weakLinks,
    averageScore,
    threshold: WEAK_LINK_THRESHOLD,
    anchorTags: anchorTags.map((t) => `${t.category}:${t.value}`),
    strategyTagCount: strategyTags.length,
  });
}
