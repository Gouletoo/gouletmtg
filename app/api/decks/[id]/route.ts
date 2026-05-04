import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractStrategyTags } from "@/lib/synergy/strategy";

/**
 * PATCH /api/decks/[id]
 * Met à jour le deck. Si strategy_summary change, on relance l'extraction
 * de strategy_tags via Gemini en arrière-plan.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deckId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    name?: string;
    strategy_summary?: string | null;
    bracket_target?: number | null;
    refreshStrategyTags?: boolean;
  };

  // Charge le deck pour comparer (et avoir le commander)
  const { data: existing } = await supabase
    .from("decks")
    .select("id,strategy_summary,commander_id")
    .eq("id", deckId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Deck introuvable" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.bracket_target !== undefined) update.bracket_target = body.bracket_target;

  const strategyChanged =
    body.strategy_summary !== undefined &&
    body.strategy_summary !== existing.strategy_summary;
  if (body.strategy_summary !== undefined) {
    update.strategy_summary = body.strategy_summary;
  }

  // Si on doit recalculer les tags (changement de stratégie ou refresh demandé)
  const shouldExtractTags =
    (strategyChanged || body.refreshStrategyTags) &&
    body.strategy_summary !== undefined &&
    body.strategy_summary !== null &&
    body.strategy_summary.trim().length > 0;

  let extractedTagsMessage: string | null = null;
  if (shouldExtractTags && existing.commander_id) {
    try {
      const { data: commander } = await supabase
        .from("cards")
        .select("name,oracle_text")
        .eq("scryfall_id", existing.commander_id)
        .single();

      const tags = await extractStrategyTags(
        commander?.name ?? "",
        commander?.oracle_text ?? null,
        body.strategy_summary as string
      );
      update.strategy_tags = tags.map((t) => `${t.category}:${t.value}`);
      extractedTagsMessage = `${tags.length} tags stratégiques extraits`;
    } catch (e) {
      console.error("[strategy-tags] extraction failed:", e);
      // On sauvegarde quand même la stratégie text, juste pas les tags
    }
  } else if (
    body.strategy_summary !== undefined &&
    (body.strategy_summary === null || body.strategy_summary.trim().length === 0)
  ) {
    // Stratégie effacée → tags vidés
    update.strategy_tags = [];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { error } = await supabase.from("decks").update(update).eq("id", deckId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    strategyTagsRefreshed: shouldExtractTags,
    message: extractedTagsMessage,
  });
}
