import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST : ajoute une carte au deck (ou incrémente qty si déjà présente). */
export async function POST(
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
    cardId: string;
    categories?: string[];
    qty?: number;
  };

  if (!body.cardId) {
    return NextResponse.json({ error: "cardId requis" }, { status: 400 });
  }

  // Vérifie que la carte existe
  const { data: card } = await supabase
    .from("cards")
    .select("scryfall_id")
    .eq("scryfall_id", body.cardId)
    .single();
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  // Upsert : si la carte est déjà dans le deck, on incrémente la qty
  const { data: existing } = await supabase
    .from("deck_cards")
    .select("qty,categories")
    .eq("deck_id", deckId)
    .eq("card_id", body.cardId)
    .maybeSingle();

  if (existing) {
    const newQty = existing.qty + (body.qty ?? 1);
    const mergedCats = Array.from(
      new Set([...(existing.categories ?? []), ...(body.categories ?? [])])
    );
    const { error } = await supabase
      .from("deck_cards")
      .update({ qty: newQty, categories: mergedCats })
      .eq("deck_id", deckId)
      .eq("card_id", body.cardId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("deck_cards").insert({
      deck_id: deckId,
      card_id: body.cardId,
      qty: body.qty ?? 1,
      categories: body.categories ?? [],
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
