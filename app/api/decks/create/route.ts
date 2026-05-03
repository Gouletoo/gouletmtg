import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    name: string;
    commanderId: string;
    partnerCommanderId?: string;
    strategySummary?: string;
    bracketTarget?: number;
  };

  if (!body.name || !body.commanderId) {
    return NextResponse.json({ error: "name + commanderId requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      name: body.name,
      commander_id: body.commanderId,
      partner_commander_id: body.partnerCommanderId ?? null,
      strategy_summary: body.strategySummary ?? null,
      bracket_target: body.bracketTarget ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Création échouée" }, { status: 500 });
  }

  return NextResponse.json({ deckId: data.id });
}
