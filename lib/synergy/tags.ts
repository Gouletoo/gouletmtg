/**
 * Extracteur de tags depuis le texte oracle d'une carte.
 *
 * Premier pas du moteur de synergie : transformer du texte brut en
 * concepts actionnables (e.g., "produces:treasure", "triggers-on:etb").
 *
 * Approche : regex/heuristiques, déterministe, rapide, gratuit.
 * Utilisé ensuite par le pattern matcher pour calculer la synergie entre paires.
 */

export type TagCategory =
  | "produces"
  | "triggers-on"
  | "cares-about"
  | "payoff"
  | "enabler"
  | "mechanic"
  | "type"
  | "keyword";

export interface Tag {
  category: TagCategory;
  value: string;
  /** Score de pertinence 0-1 — pour pondérer les matches plus forts */
  weight?: number;
}

interface TagRule {
  pattern: RegExp;
  tags: Tag[];
  /** Optionnel : ne s'applique que si typeLine matche */
  requireType?: RegExp;
}

const RULES: TagRule[] = [
  // === PRODUCES ===
  { pattern: /\bcreate (a |an |\d+ |[a-z]+ )?treasure tokens?\b/i, tags: [{ category: "produces", value: "treasure" }] },
  { pattern: /\bcreate (a |an |\d+ )?(food|clue|blood|map|powerstone|gold) tokens?\b/i, tags: [{ category: "produces", value: "$2-token" }] },
  { pattern: /\bcreate (a |an |\d+ |x )?(\d+\/\d+)? ?(?:[a-z]+ )*creature tokens?\b/i, tags: [{ category: "produces", value: "creature-token" }] },
  { pattern: /\bput (a |an |\d+ |x ) ?\+1\/\+1 counters?\b/i, tags: [{ category: "produces", value: "+1+1-counter" }] },
  { pattern: /\bput (a |an |\d+ |x ) ?(?:[a-z]+ )*counters?\b/i, tags: [{ category: "produces", value: "counter" }] },
  { pattern: /\badd \{[wubrgc0-9]\}/i, tags: [{ category: "produces", value: "mana" }] },
  { pattern: /\bsearch your library for a basic land card.+battlefield/i, tags: [{ category: "produces", value: "land-ramp" }] },

  // === TRIGGERS ON ===
  { pattern: /\benters the battlefield\b/i, tags: [{ category: "triggers-on", value: "etb" }] },
  { pattern: /\b(when(ever)?|at the beginning) .{0,50}\bdies\b/i, tags: [{ category: "triggers-on", value: "death" }] },
  { pattern: /\bwhenever .{0,80} attacks?\b/i, tags: [{ category: "triggers-on", value: "attack" }] },
  { pattern: /\bdeals combat damage to a player\b/i, tags: [{ category: "triggers-on", value: "combat-damage" }] },
  { pattern: /\bwhenever you cast\b/i, tags: [{ category: "triggers-on", value: "cast" }] },
  { pattern: /\bwhenever you draw\b/i, tags: [{ category: "triggers-on", value: "draw" }] },
  { pattern: /\bwhenever you gain life\b/i, tags: [{ category: "triggers-on", value: "lifegain" }] },
  { pattern: /\bat the beginning of (your|each) (upkeep|combat|end step)/i, tags: [{ category: "triggers-on", value: "phase" }] },
  { pattern: /\bwhenever .{0,40} sacrific/i, tags: [{ category: "triggers-on", value: "sacrifice" }] },

  // === CARES ABOUT ===
  { pattern: /\bnumber of artifacts\b|for each artifact\b/i, tags: [{ category: "cares-about", value: "artifacts" }] },
  { pattern: /\bnumber of (creatures|tokens)\b|for each (creature|token)\b/i, tags: [{ category: "cares-about", value: "creatures" }] },
  { pattern: /\beach treasure\b|treasures? you control\b/i, tags: [{ category: "cares-about", value: "treasure" }] },
  { pattern: /\bin (your |a )?graveyard\b/i, tags: [{ category: "cares-about", value: "graveyard" }] },
  { pattern: /\b\+1\/\+1 counters? on\b/i, tags: [{ category: "cares-about", value: "+1+1-counter" }] },
  { pattern: /\beach (?:opponent|player)\b/i, tags: [{ category: "cares-about", value: "opponents" }] },

  // === PAYOFFS ===
  { pattern: /\bdraw (a|two|three|that many) cards?\b/i, tags: [{ category: "payoff", value: "card-draw" }] },
  { pattern: /\bgain (\d+|x|that much) life\b/i, tags: [{ category: "payoff", value: "lifegain" }] },
  { pattern: /\bdeals? (\d+|x|that much) damage\b/i, tags: [{ category: "payoff", value: "damage" }] },

  // === ENABLERS ===
  { pattern: /\bsacrifice (a|another|two|x) [a-z]+:/i, tags: [{ category: "enabler", value: "sac-outlet" }] },
  { pattern: /\bdiscard (a|two|x) cards?:/i, tags: [{ category: "enabler", value: "discard-outlet" }] },
  { pattern: /\bexile .{0,30}return .{0,30} to the battlefield/i, tags: [{ category: "enabler", value: "blink" }] },
  { pattern: /\breturn target creature card from a graveyard to (the |your )?battlefield/i, tags: [{ category: "enabler", value: "reanimate" }] },
  { pattern: /\bcounter target spell\b/i, tags: [{ category: "enabler", value: "counterspell" }] },
  { pattern: /\bdestroy target (creature|permanent|artifact|enchantment|planeswalker)/i, tags: [{ category: "enabler", value: "removal" }] },
  { pattern: /\bdestroy all (creatures|permanents)/i, tags: [{ category: "enabler", value: "board-wipe" }] },

  // === MECHANICS / KEYWORDS ===
  { pattern: /\bflying\b/i, tags: [{ category: "keyword", value: "flying" }] },
  { pattern: /\btrample\b/i, tags: [{ category: "keyword", value: "trample" }] },
  { pattern: /\bhaste\b/i, tags: [{ category: "keyword", value: "haste" }] },
  { pattern: /\bvigilance\b/i, tags: [{ category: "keyword", value: "vigilance" }] },
  { pattern: /\bdeathtouch\b/i, tags: [{ category: "keyword", value: "deathtouch" }] },
  { pattern: /\blifelink\b/i, tags: [{ category: "keyword", value: "lifelink" }] },
  { pattern: /\bhexproof\b/i, tags: [{ category: "keyword", value: "hexproof" }] },
  { pattern: /\bindestructible\b/i, tags: [{ category: "keyword", value: "indestructible" }] },
  { pattern: /\bward\b/i, tags: [{ category: "keyword", value: "ward" }] },
  { pattern: /\bdouble strike\b/i, tags: [{ category: "keyword", value: "double-strike" }] },
  { pattern: /\bmenace\b/i, tags: [{ category: "keyword", value: "menace" }] },
  { pattern: /\bflash\b/i, tags: [{ category: "keyword", value: "flash" }] },

  { pattern: /\bcascade\b/i, tags: [{ category: "mechanic", value: "cascade" }] },
  { pattern: /\bstorm\b/i, tags: [{ category: "mechanic", value: "storm" }] },
  { pattern: /\bproliferate\b/i, tags: [{ category: "mechanic", value: "proliferate" }] },
  { pattern: /\bscry \d+\b/i, tags: [{ category: "mechanic", value: "scry" }] },
  { pattern: /\bsurveil \d+\b/i, tags: [{ category: "mechanic", value: "surveil" }] },
  { pattern: /\bexplore\b/i, tags: [{ category: "mechanic", value: "explore" }] },
  { pattern: /\bconvoke\b/i, tags: [{ category: "mechanic", value: "convoke" }] },
];

/** Extrait les tags d'une carte à partir de son oracle_text et type_line. */
export function extractTags(oracleText: string | null, typeLine: string | null = null): Tag[] {
  if (!oracleText) return [];
  const tags: Tag[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    if (rule.requireType && typeLine && !rule.requireType.test(typeLine)) continue;
    if (rule.pattern.test(oracleText)) {
      for (const t of rule.tags) {
        const key = `${t.category}:${t.value}`;
        if (!seen.has(key)) {
          seen.add(key);
          tags.push(t);
        }
      }
    }
  }
  return tags;
}

/** Format lisible : "produces:treasure" → "Produit treasure" */
const CATEGORY_LABEL_FR: Record<TagCategory, string> = {
  produces: "Produit",
  "triggers-on": "Trigger",
  "cares-about": "Synergise avec",
  payoff: "Payoff",
  enabler: "Enabler",
  mechanic: "Mécanique",
  type: "Type",
  keyword: "Mot-clé",
};

const VALUE_LABEL_FR: Record<string, string> = {
  treasure: "trésors",
  "creature-token": "tokens créature",
  "+1+1-counter": "+1/+1 counters",
  counter: "counters",
  mana: "mana",
  "land-ramp": "ramp terrain",
  etb: "ETB",
  death: "morts",
  attack: "attaques",
  "combat-damage": "dégâts de combat",
  cast: "lancement de sort",
  draw: "pioche",
  lifegain: "lifegain",
  phase: "phase",
  sacrifice: "sacrifice",
  artifacts: "artefacts",
  creatures: "créatures",
  graveyard: "cimetière",
  opponents: "adversaires",
  "card-draw": "card draw",
  damage: "dégâts directs",
  "sac-outlet": "sac outlet",
  "discard-outlet": "discard outlet",
  blink: "blink",
  reanimate: "reanimate",
  counterspell: "counterspell",
  removal: "removal",
  "board-wipe": "board wipe",
};

export function formatTag(tag: Tag): string {
  const cat = CATEGORY_LABEL_FR[tag.category];
  const val = VALUE_LABEL_FR[tag.value] ?? tag.value;
  return `${cat} : ${val}`;
}
