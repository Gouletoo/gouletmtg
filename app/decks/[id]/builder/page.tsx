import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { DeckOverview } from "@/components/deck/DeckOverview";

export const metadata = { title: "Deck — gouletmtg" };

type Params = { id: string };

export default async function DeckBuilderPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deck } = await supabase
    .from("decks")
    .select("id,name,strategy_summary,bracket_target,commander_id,partner_commander_id,archidekt_id,custom_categories")
    .eq("id", id)
    .single();
  if (!deck) notFound();

  // Fetch commander card
  const commanderIds = [deck.commander_id, deck.partner_commander_id].filter(
    (x): x is string => Boolean(x)
  );
  const { data: commanderCards } = await supabase
    .from("cards")
    .select("scryfall_id,name,oracle_text,type_line,cmc,colors,color_identity,image_uris,prices")
    .in("scryfall_id", commanderIds);

  // Fetch deck cards with full card data
  const { data: deckCardRows } = await supabase
    .from("deck_cards")
    .select(
      "card_id,qty,categories,notes,cards(scryfall_id,name,oracle_text,type_line,cmc,colors,color_identity,image_uris,prices)"
    )
    .eq("deck_id", id);

  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="decks" />
      <DeckOverview
        deck={deck}
        commanders={commanderCards ?? []}
        deckCards={deckCardRows ?? []}
      />
      <div className="px-8 md:px-16 lg:px-24 pb-16">
        <Link href="/decks" className="text-sm text-terracotta hover:underline">
          ← Retour aux decks
        </Link>
      </div>
    </main>
  );
}
