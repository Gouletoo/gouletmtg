import { NextRequest, NextResponse } from "next/server";
import { translateToScryfall } from "@/lib/oracle/translator";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { naturalQuery: string };
  if (!body.naturalQuery?.trim()) {
    return NextResponse.json({ error: "naturalQuery requis" }, { status: 400 });
  }

  try {
    const query = await translateToScryfall(body.naturalQuery);
    return NextResponse.json({ query });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Traduction échouée" },
      { status: 500 }
    );
  }
}
