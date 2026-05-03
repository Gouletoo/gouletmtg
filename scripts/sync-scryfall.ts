/**
 * Sync Scryfall bulk → Supabase `cards` table.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/sync-scryfall.ts
 *
 * Stratégie :
 * 1. Récupère l'URL du bulk `oracle-cards` (1 carte par nom unique)
 * 2. Télécharge le JSON (~250 MB)
 * 3. Filtre les cartes legal en commander
 * 4. Upsert par batches de 500 dans Supabase via service_role
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with: npx tsx --env-file=.env.local scripts/sync-scryfall.ts"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface ScryfallCard {
  id: string;
  name: string;
  oracle_text?: string;
  type_line?: string;
  cmc?: number;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  keywords?: string[];
  legalities: Record<string, string>;
  prices?: Record<string, string | null>;
  image_uris?: Record<string, string>;
  card_faces?: Array<{ image_uris?: Record<string, string>; oracle_text?: string }>;
  set: string;
  released_at: string;
}

interface BulkInfo {
  data: Array<{ type: string; download_uri: string; updated_at: string; size: number }>;
}

async function getBulkUri(): Promise<string> {
  const r = await fetch("https://api.scryfall.com/bulk-data");
  if (!r.ok) throw new Error(`Scryfall bulk-data list failed: ${r.status}`);
  const json = (await r.json()) as BulkInfo;
  const oracle = json.data.find((d) => d.type === "oracle_cards");
  if (!oracle) throw new Error("oracle_cards bulk not found");
  console.log(
    `[bulk] oracle_cards → ${(oracle.size / 1024 / 1024).toFixed(1)} MB, updated ${oracle.updated_at}`
  );
  return oracle.download_uri;
}

async function downloadBulk(uri: string): Promise<ScryfallCard[]> {
  console.log("[bulk] downloading…");
  const r = await fetch(uri);
  if (!r.ok) throw new Error(`Bulk download failed: ${r.status}`);
  const data = (await r.json()) as ScryfallCard[];
  console.log(`[bulk] ${data.length} cartes téléchargées`);
  return data;
}

function mapCard(c: ScryfallCard) {
  // Pour double-faced cards, fallback sur la première face pour l'image
  const imageUris =
    c.image_uris ?? (c.card_faces?.[0]?.image_uris ?? null);
  const oracleText =
    c.oracle_text ??
    (c.card_faces ? c.card_faces.map((f) => f.oracle_text ?? "").join(" // ") : null);

  return {
    scryfall_id: c.id,
    name: c.name,
    oracle_text: oracleText,
    type_line: c.type_line ?? null,
    cmc: c.cmc ?? null,
    colors: c.colors ?? null,
    color_identity: c.color_identity ?? [],
    power: c.power ?? null,
    toughness: c.toughness ?? null,
    keywords: c.keywords ?? [],
    legalities: c.legalities,
    prices: c.prices ?? {},
    image_uris: imageUris,
    set_code: c.set,
    released_at: c.released_at,
    tags: [],
    updated_at: new Date().toISOString(),
  };
}

async function upsertBatch(rows: ReturnType<typeof mapCard>[]) {
  const { error } = await supabase
    .from("cards")
    .upsert(rows, { onConflict: "scryfall_id" });
  if (error) throw error;
}

async function main() {
  const t0 = Date.now();
  const uri = await getBulkUri();
  const all = await downloadBulk(uri);

  // Filtre : legal en commander
  const eligible = all.filter((c) => c.legalities?.commander === "legal");
  console.log(`[filter] ${eligible.length} cartes legal en commander (sur ${all.length})`);

  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < eligible.length; i += BATCH) {
    const slice = eligible.slice(i, i + BATCH).map(mapCard);
    await upsertBatch(slice);
    done += slice.length;
    if (done % 2000 === 0 || done === eligible.length) {
      console.log(`[upsert] ${done}/${eligible.length}`);
    }
  }

  console.log(`[done] ${eligible.length} cartes synchronisées en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("[error]", e);
  process.exit(1);
});
