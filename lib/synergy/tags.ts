/**
 * Extracteur de tags depuis le texte oracle d'une carte.
 *
 * Premier pas du moteur de synergie : transformer du texte brut en
 * concepts actionnables (e.g., "produces:treasure", "triggers-on:etb",
 * "cares-about:artifacts").
 *
 * Approche : regex/heuristiques, déterministe, rapide, gratuit, exécutable
 * côté serveur (sans appel LLM).
 *
 * Les tags sont consommés ensuite par :
 *  - lib/synergy/patterns.ts : matching de paires producer↔payoff, etc.
 *  - lib/synergy/scorer.ts : score 0-100 entre 2 cartes
 */

export type TagCategory =
  | "produces"
  | "triggers-on"
  | "cares-about"
  | "payoff"
  | "enabler"
  | "mechanic"
  | "type"
  | "keyword"
  | "tribal";

export interface Tag {
  category: TagCategory;
  value: string;
}

interface TagRule {
  pattern: RegExp;
  /** Soit des tags fixes, soit une fonction qui dérive les tags du match. */
  derive: Tag[] | ((m: RegExpExecArray) => Tag[]);
  /** Optionnel : ne s'applique que si typeLine matche. */
  requireType?: RegExp;
}

const RULES: TagRule[] = [
  // === PRODUCES — ressources fongibles ===
  {
    pattern: /\bcreate.{0,30}\btreasure tokens?\b/i,
    derive: [{ category: "produces", value: "treasure" }],
  },
  {
    pattern: /\bcreate.{0,30}\b(food|clue|blood|map|powerstone|gold|incubator|shard|junk|cluestone) tokens?\b/i,
    derive: (m) => [{ category: "produces", value: m[1].toLowerCase() }],
  },
  {
    pattern: /\bcreate.{0,40}\bcreature tokens?\b/i,
    derive: [{ category: "produces", value: "creature-token" }],
  },
  {
    pattern: /\bcreate (a|an|\d+|x|that many) (?:(?:tapped|legendary) )?(\w+(?: \w+)?) creature tokens?\b/i,
    derive: (m) => {
      const subtype = m[2]?.toLowerCase();
      const tags: Tag[] = [{ category: "produces", value: "creature-token" }];
      // Si subtype reconnu comme tribu fréquente, on ajoute aussi un tag tribal
      if (subtype && /\b(soldier|elf|goblin|zombie|spirit|dragon|insect|cat|knight|bird|merfolk|wolf|warrior)\b/.test(subtype)) {
        tags.push({ category: "produces", value: `${subtype}-token` });
        tags.push({ category: "tribal", value: subtype });
      }
      return tags;
    },
  },
  {
    pattern: /\bput (a|an|\d+|x|that many) ?\+1\/\+1 counters?\b/i,
    derive: [{ category: "produces", value: "+1+1-counter" }],
  },
  {
    pattern: /\bput (a|an|\d+|x|that many) ?-1\/-1 counters?\b/i,
    derive: [{ category: "produces", value: "-1-1-counter" }],
  },
  {
    pattern: /\bput (a|an|\d+) loyalty counter/i,
    derive: [{ category: "produces", value: "loyalty-counter" }],
  },
  {
    pattern: /\badd \{[wubrgcxs0-9]\}/i,
    derive: [{ category: "produces", value: "mana" }],
  },
  {
    pattern: /\bsearch your library for a basic land card.{0,40}\b(?:onto |to )?the battlefield/i,
    derive: [
      { category: "produces", value: "land-ramp" },
      { category: "produces", value: "land-drop" },
    ],
  },
  {
    pattern: /\bput (a|an|target|that) land(?: card)? .{0,30}onto the battlefield/i,
    derive: [{ category: "produces", value: "land-drop" }],
  },

  // === TRIGGERS ON — moments d'activation ===
  { pattern: /\benters the battlefield\b/i, derive: [{ category: "triggers-on", value: "etb" }] },
  { pattern: /\b(when(ever)?|at the beginning) .{0,80}\bdies\b/i, derive: [{ category: "triggers-on", value: "death" }] },
  { pattern: /\bwhenever .{0,80}\battacks\b/i, derive: [{ category: "triggers-on", value: "attack" }] },
  { pattern: /\bdeals combat damage to a player\b/i, derive: [{ category: "triggers-on", value: "combat-damage" }] },
  { pattern: /\bwhenever .{0,40}deals damage\b/i, derive: [{ category: "triggers-on", value: "damage" }] },
  { pattern: /\bwhenever you cast\b/i, derive: [{ category: "triggers-on", value: "cast" }] },
  { pattern: /\bwhenever you draw\b/i, derive: [{ category: "triggers-on", value: "draw" }] },
  { pattern: /\bwhenever you gain life\b/i, derive: [{ category: "triggers-on", value: "lifegain" }] },
  { pattern: /\bwhenever you lose life\b/i, derive: [{ category: "triggers-on", value: "lifelost" }] },
  { pattern: /\bat the beginning of (your |each )?(upkeep|combat|end step|end of turn|end of combat)/i, derive: [{ category: "triggers-on", value: "phase" }] },
  { pattern: /\bwhenever .{0,60}\bsacrific/i, derive: [{ category: "triggers-on", value: "sacrifice" }] },
  { pattern: /\bwhenever a creature enters the battlefield/i, derive: [{ category: "triggers-on", value: "etb-other" }] },
  { pattern: /\bwhenever .{0,30}\bblocks\b/i, derive: [{ category: "triggers-on", value: "block" }] },
  { pattern: /\bwhenever a token .{0,30}\benters\b/i, derive: [{ category: "triggers-on", value: "token-etb" }] },

  // === CARES ABOUT — payoffs scalés ===
  { pattern: /\bnumber of artifacts\b|for each artifact\b/i, derive: [{ category: "cares-about", value: "artifacts" }] },
  { pattern: /\bnumber of (creatures|tokens)\b|for each (creature|token)\b/i, derive: [{ category: "cares-about", value: "creatures" }] },
  { pattern: /\beach treasure\b|treasures? you control\b/i, derive: [{ category: "cares-about", value: "treasure" }] },
  { pattern: /\bin (your |a )?graveyard\b|cards? in (a|your|each) graveyards?\b/i, derive: [{ category: "cares-about", value: "graveyard" }] },
  { pattern: /\b\+1\/\+1 counters? on\b|number of \+1\/\+1 counters\b/i, derive: [{ category: "cares-about", value: "+1+1-counter" }] },
  { pattern: /\beach (?:opponent|other player)\b/i, derive: [{ category: "cares-about", value: "opponents" }] },
  { pattern: /\bfor each land you control\b/i, derive: [{ category: "cares-about", value: "lands" }] },
  { pattern: /\bnumber of \w+ you control\b/i, derive: [{ category: "cares-about", value: "permanents" }] },

  // === PAYOFFS — récompenses fortes ===
  { pattern: /\bdraw (a|two|three|x|that many) cards?\b/i, derive: [{ category: "payoff", value: "card-draw" }] },
  { pattern: /\bdraw a card for each\b/i, derive: [{ category: "payoff", value: "card-draw-scale" }] },
  { pattern: /\bgain (\d+|x|that much) life\b/i, derive: [{ category: "payoff", value: "lifegain" }] },
  { pattern: /\bdeals? (\d+|x|that much) damage\b/i, derive: [{ category: "payoff", value: "damage" }] },
  { pattern: /\bcreate(?:s)? (a|an|\d+) copy\b/i, derive: [{ category: "payoff", value: "copy" }] },
  { pattern: /\bextra turn\b/i, derive: [{ category: "payoff", value: "extra-turn" }] },
  { pattern: /\badditional combat phase\b/i, derive: [{ category: "payoff", value: "extra-combat" }] },

  // === ENABLERS — outils utilisables avec d'autres cartes ===
  { pattern: /\bsacrifice (a|another|two|x) [a-z ]+:/i, derive: [{ category: "enabler", value: "sac-outlet" }] },
  { pattern: /\bdiscard (a|two|x) cards?:/i, derive: [{ category: "enabler", value: "discard-outlet" }] },
  { pattern: /\bexile .{0,40}return (it|that card|those cards) to the battlefield/i, derive: [{ category: "enabler", value: "blink" }] },
  { pattern: /\breturn target creature card from a graveyard to (the |your )?battlefield\b/i, derive: [{ category: "enabler", value: "reanimate" }] },
  { pattern: /\bcounter target spell\b/i, derive: [{ category: "enabler", value: "counterspell" }] },
  { pattern: /\bdestroy target (creature|permanent|artifact|enchantment|planeswalker|nonland)\b/i, derive: [{ category: "enabler", value: "removal" }] },
  { pattern: /\bexile target (creature|permanent|nonland|artifact|enchantment)\b/i, derive: [{ category: "enabler", value: "removal" }] },
  { pattern: /\bdestroy all (creatures|permanents|nonland)\b/i, derive: [{ category: "enabler", value: "board-wipe" }] },
  { pattern: /\bexile all (creatures|nonland)\b/i, derive: [{ category: "enabler", value: "board-wipe" }] },
  { pattern: /\beach (creature|player) sacrifices/i, derive: [{ category: "enabler", value: "edict" }] },
  { pattern: /\b(?:until end of turn .{0,40}|target creature gets )\+\d+\/\+\d+\b/i, derive: [{ category: "enabler", value: "pump" }] },
  { pattern: /\bsearch your library for a card\b/i, derive: [{ category: "enabler", value: "tutor" }] },
  { pattern: /\bsearch your library for an? (creature|enchantment|artifact|instant|sorcery|planeswalker) card\b/i, derive: [{ category: "enabler", value: "tutor" }] },

  // === KEYWORDS ===
  { pattern: /\bflying\b/i, derive: [{ category: "keyword", value: "flying" }] },
  { pattern: /\btrample\b/i, derive: [{ category: "keyword", value: "trample" }] },
  { pattern: /\bhaste\b/i, derive: [{ category: "keyword", value: "haste" }] },
  { pattern: /\bvigilance\b/i, derive: [{ category: "keyword", value: "vigilance" }] },
  { pattern: /\bdeathtouch\b/i, derive: [{ category: "keyword", value: "deathtouch" }] },
  { pattern: /\blifelink\b/i, derive: [{ category: "keyword", value: "lifelink" }] },
  { pattern: /\bhexproof\b/i, derive: [{ category: "keyword", value: "hexproof" }] },
  { pattern: /\bindestructible\b/i, derive: [{ category: "keyword", value: "indestructible" }] },
  { pattern: /\bward\b/i, derive: [{ category: "keyword", value: "ward" }] },
  { pattern: /\bdouble strike\b/i, derive: [{ category: "keyword", value: "double-strike" }] },
  { pattern: /\bfirst strike\b/i, derive: [{ category: "keyword", value: "first-strike" }] },
  { pattern: /\bmenace\b/i, derive: [{ category: "keyword", value: "menace" }] },
  { pattern: /\bflash\b/i, derive: [{ category: "keyword", value: "flash" }] },
  { pattern: /\bunblockable\b|\bcan't be blocked\b/i, derive: [{ category: "keyword", value: "unblockable" }] },
  { pattern: /\breach\b/i, derive: [{ category: "keyword", value: "reach" }] },

  // === MECHANICS ===
  { pattern: /\bcascade\b/i, derive: [{ category: "mechanic", value: "cascade" }] },
  { pattern: /\bstorm\b/i, derive: [{ category: "mechanic", value: "storm" }] },
  { pattern: /\bproliferate\b/i, derive: [{ category: "mechanic", value: "proliferate" }] },
  { pattern: /\bscry \d+\b/i, derive: [{ category: "mechanic", value: "scry" }] },
  { pattern: /\bsurveil \d+\b/i, derive: [{ category: "mechanic", value: "surveil" }] },
  { pattern: /\bexplore\b/i, derive: [{ category: "mechanic", value: "explore" }] },
  { pattern: /\bconvoke\b/i, derive: [{ category: "mechanic", value: "convoke" }] },
  { pattern: /\bdelve\b/i, derive: [{ category: "mechanic", value: "delve" }] },
  { pattern: /\bcycling\b/i, derive: [{ category: "mechanic", value: "cycling" }] },
  { pattern: /\bdash\b/i, derive: [{ category: "mechanic", value: "dash" }] },
  { pattern: /\bflashback\b/i, derive: [{ category: "mechanic", value: "flashback" }] },
];

/** Extrait les tags d'une carte à partir de son oracle_text et type_line. */
export function extractTags(oracleText: string | null, typeLine: string | null = null): Tag[] {
  if (!oracleText) return [];
  const tags: Tag[] = [];
  const seen = new Set<string>();

  const pushTag = (t: Tag) => {
    const key = `${t.category}:${t.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(t);
    }
  };

  for (const rule of RULES) {
    if (rule.requireType && typeLine && !rule.requireType.test(typeLine)) continue;
    const m = rule.pattern.exec(oracleText);
    if (!m) continue;
    const newTags = typeof rule.derive === "function" ? rule.derive(m) : rule.derive;
    for (const t of newTags) pushTag(t);
  }

  // Type line tags (creature subtypes pour tribal, types globaux)
  if (typeLine) {
    if (/\bartifact\b/i.test(typeLine)) pushTag({ category: "type", value: "artifact" });
    if (/\benchantment\b/i.test(typeLine)) pushTag({ category: "type", value: "enchantment" });
    if (/\bcreature\b/i.test(typeLine)) pushTag({ category: "type", value: "creature" });
    if (/\bplaneswalker\b/i.test(typeLine)) pushTag({ category: "type", value: "planeswalker" });
    if (/\bland\b/i.test(typeLine)) pushTag({ category: "type", value: "land" });
    if (/\binstant\b/i.test(typeLine)) pushTag({ category: "type", value: "instant" });
    if (/\bsorcery\b/i.test(typeLine)) pushTag({ category: "type", value: "sorcery" });
    if (/\blegendary\b/i.test(typeLine)) pushTag({ category: "type", value: "legendary" });
    // Sous-types après le tiret
    const subtypeMatch = typeLine.match(/—\s*(.+)$/);
    if (subtypeMatch) {
      const subtypes = subtypeMatch[1].split(/\s+/).filter(Boolean);
      for (const st of subtypes) {
        pushTag({ category: "tribal", value: st.toLowerCase() });
      }
    }
  }

  return tags;
}

/** Version sérialisée pour stockage / hash : "produces:treasure,triggers-on:etb,..." */
export function serializeTags(tags: Tag[]): string[] {
  return tags.map((t) => `${t.category}:${t.value}`).sort();
}

const CATEGORY_LABEL_FR: Record<TagCategory, string> = {
  produces: "Produit",
  "triggers-on": "Trigger",
  "cares-about": "Synergise avec",
  payoff: "Payoff",
  enabler: "Enabler",
  mechanic: "Mécanique",
  type: "Type",
  keyword: "Mot-clé",
  tribal: "Tribu",
};

const VALUE_LABEL_FR: Record<string, string> = {
  treasure: "trésors",
  food: "food",
  clue: "indices",
  blood: "blood",
  "creature-token": "tokens créature",
  "+1+1-counter": "+1/+1 counters",
  "-1-1-counter": "-1/-1 counters",
  "loyalty-counter": "loyalty counters",
  mana: "mana",
  "land-ramp": "ramp terrain (basic)",
  "land-drop": "land drop bonus",
  etb: "ETB",
  "etb-other": "ETB d'une autre créature",
  death: "morts",
  attack: "attaques",
  "combat-damage": "dégâts de combat",
  damage: "dégâts (général)",
  cast: "lancement de sort",
  draw: "pioche",
  lifegain: "lifegain",
  lifelost: "perte de vie",
  phase: "phase de jeu",
  sacrifice: "sacrifice",
  block: "blocage",
  "token-etb": "arrivée d'un token",
  artifacts: "artefacts",
  creatures: "créatures",
  graveyard: "cimetière",
  opponents: "adversaires",
  lands: "terrains",
  permanents: "permanents",
  "card-draw": "card draw",
  "card-draw-scale": "card draw scalé",
  copy: "copie",
  "extra-turn": "tour supplémentaire",
  "extra-combat": "combat supplémentaire",
  "sac-outlet": "sac outlet",
  "discard-outlet": "discard outlet",
  blink: "blink",
  reanimate: "reanimate",
  counterspell: "counterspell",
  removal: "removal",
  "board-wipe": "board wipe",
  edict: "edict",
  pump: "pump",
  tutor: "tutor",
};

export function formatTag(tag: Tag): string {
  const cat = CATEGORY_LABEL_FR[tag.category];
  const val = VALUE_LABEL_FR[tag.value] ?? tag.value;
  return `${cat} : ${val}`;
}
