import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestCommanders } from "@/lib/oracle/commander-suggester";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { theme: string };
  const theme = body.theme?.trim();
  if (!theme) {
    return NextResponse.json({ error: "theme requis" }, { status: 400 });
  }

  let geminiResult;
  try {
    geminiResult = await suggestCommanders(theme);
    console.log(`[suggest] Gemini returned ${geminiResult.suggestions.length} raw suggestions for theme: ${theme}`);
  } catch (e) {
    console.error("[suggest] Gemini error:", e);
    return NextResponse.json(
      { error: (e as Error).message ?? "Échec de la suggestion" },
      { status: 500 }
    );
  }

  const raw = geminiResult.suggestions;

  if (raw.length === 0) {
    return NextResponse.json({
      suggestions: [],
      droppedNames: [],
      debug: geminiResult.debug,
    });
  }

  // Valider chaque nom contre notre table cards
  const supabase = await createClient();
  const names = raw.map((s) => s.name);
  const { data: matches } = await supabase
    .from("cards")
    .select("scryfall_id,name,type_line,image_uris,color_identity,oracle_text,prices,legalities")
    .in("name", names);

  // Map nom → carte (filtre : legendary creature ET legal commander)
  type CardRow = NonNullable<typeof matches>[number];
  const validByName = new Map<string, CardRow>();
  for (const c of matches ?? []) {
    const isLegendaryCreature =
      typeof c.type_line === "string" &&
      /legendary/i.test(c.type_line) &&
      /creature|planeswalker/i.test(c.type_line);
    const legalities = c.legalities as Record<string, string> | null;
    const legalCommander = legalities?.commander === "legal";
    if (isLegendaryCreature && legalCommander) {
      validByName.set(c.name as string, c);
    }
  }

  const suggestions = raw
    .map((s) => {
      const card = validByName.get(s.name);
      if (!card) return null;
      return {
        scryfall_id: card.scryfall_id,
        name: card.name,
        type_line: card.type_line,
        image_uris: card.image_uris,
        color_identity: card.color_identity,
        oracle_text: card.oracle_text,
        prices: card.prices,
        reason: s.reason,
      };
    })
    .filter(Boolean);

  const droppedNames = raw.filter((s) => !validByName.has(s.name)).map((s) => s.name);
  console.log(
    `[suggest] ${suggestions.length} validated / ${raw.length} raw. Dropped: ${droppedNames.join(", ")}`
  );

  return NextResponse.json({
    theme,
    suggestions,
    droppedNames,
  });
}
