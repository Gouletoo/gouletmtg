import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy vers Scryfall search.
 * On utilise l'API Scryfall directement (pas notre DB locale)
 * parce qu'on veut le full power de leur syntaxe de recherche.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const page = sp.get("page") ?? "1";
  const order = sp.get("order") ?? "edhrec";

  if (!q) {
    return NextResponse.json({ error: "q requis" }, { status: 400 });
  }

  const url = new URL("https://api.scryfall.com/cards/search");
  url.searchParams.set("q", q);
  url.searchParams.set("order", order);
  url.searchParams.set("unique", "cards");
  url.searchParams.set("page", page);

  const r = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 600 }, // cache 10 min
  });

  if (!r.ok) {
    if (r.status === 404) {
      return NextResponse.json({
        cards: [],
        total: 0,
        hasMore: false,
        query: q,
      });
    }
    const errorBody = await r.json().catch(() => null);
    return NextResponse.json(
      {
        error: errorBody?.details ?? `Scryfall a refusé la requête (${r.status})`,
        query: q,
      },
      { status: r.status }
    );
  }

  const data = await r.json();
  return NextResponse.json({
    cards: data.data ?? [],
    total: data.total_cards ?? 0,
    hasMore: data.has_more ?? false,
    query: q,
  });
}
