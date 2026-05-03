import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const colors = sp.get("colors")?.split(",").filter(Boolean) ?? [];
  const cmcMin = sp.get("cmcMin") ? Number(sp.get("cmcMin")) : null;
  const cmcMax = sp.get("cmcMax") ? Number(sp.get("cmcMax")) : null;
  const types = sp.get("types")?.split(",").filter(Boolean) ?? [];
  const text = sp.get("text")?.trim() ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 60;

  const supabase = await createClient();
  let query = supabase
    .from("cards")
    .select(
      "scryfall_id,name,oracle_text,type_line,cmc,colors,color_identity,image_uris,prices",
      { count: "exact" }
    )
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);
  if (text) query = query.ilike("oracle_text", `%${text}%`);
  if (cmcMin !== null) query = query.gte("cmc", cmcMin);
  if (cmcMax !== null) query = query.lte("cmc", cmcMax);

  if (colors.length > 0) {
    query = query.contains("color_identity", colors);
  }

  if (types.length > 0) {
    const ors = types.map((t) => `type_line.ilike.%${t}%`).join(",");
    query = query.or(ors);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    cards: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    pages: count ? Math.ceil(count / pageSize) : 0,
  });
}
