/**
 * Bibliothèque de concepts MTG → syntaxe Scryfall.
 * Chaque concept est un toggle qui ajoute un fragment à la requête.
 *
 * Permet à l'utilisateur de penser en termes de jeu plutôt qu'en
 * syntaxe Scryfall obscure.
 *
 * Doc syntaxe : https://scryfall.com/docs/syntax
 */

export interface Concept {
  /** Identifiant stable (utilisé dans les URL) */
  id: string;
  /** Nom affiché */
  label: string;
  /** Catégorie pour le regroupement UI */
  group: ConceptGroup;
  /** Fragment Scryfall ajouté à la query (déjà parenthésé si besoin) */
  query: string;
  /** Description courte affichée en hover */
  hint?: string;
}

export type ConceptGroup =
  | "Engine"
  | "Removal"
  | "Mana"
  | "Triggers"
  | "Combat"
  | "Graveyard"
  | "Tokens"
  | "Counters"
  | "Protection"
  | "Other";

export const CONCEPTS: Concept[] = [
  // Engine
  {
    id: "card_draw",
    label: "Card draw",
    group: "Engine",
    query: '(o:"draw a card" or o:"draw two" or o:"draw three" or o:"draw cards")',
    hint: "Cartes qui font piocher",
  },
  {
    id: "card_advantage",
    label: "Card advantage",
    group: "Engine",
    query: '(o:"draw" or o:"investigate" or o:"create a clue" or o:"impulse")',
  },
  {
    id: "tutor",
    label: "Tutor",
    group: "Engine",
    query: '(o:"search your library for a")',
    hint: "⚠ Ton pod ne joue pas avec des tutors",
  },
  {
    id: "recursion",
    label: "Recursion",
    group: "Graveyard",
    query: '(o:"return target" o:graveyard)',
    hint: "Ramener depuis le cimetière",
  },
  {
    id: "reanimator",
    label: "Reanimate creature",
    group: "Graveyard",
    query: '(o:"return target creature card from a graveyard to the battlefield")',
  },
  {
    id: "mill",
    label: "Mill",
    group: "Graveyard",
    query: '(o:mill or o:"into your graveyard")',
  },

  // Mana
  {
    id: "land_ramp",
    label: "Land ramp",
    group: "Mana",
    query: '(o:"search your library for a" o:land o:"battlefield")',
  },
  {
    id: "mana_rock",
    label: "Mana rock",
    group: "Mana",
    query: '(t:artifact o:"add" o:mana)',
  },
  {
    id: "ramp_land",
    label: "Ramp land",
    group: "Mana",
    query: '(t:land (o:"add two" or o:"add three" or o:"adds three"))',
  },
  {
    id: "treasure",
    label: "Treasure",
    group: "Mana",
    query: '(o:"create a treasure" or o:"create treasure" or o:"create treasures")',
  },

  // Removal
  {
    id: "creature_removal",
    label: "Creature removal",
    group: "Removal",
    query: '(o:"destroy target creature" or o:"exile target creature")',
  },
  {
    id: "noncreature_removal",
    label: "Non-creature removal",
    group: "Removal",
    query: '(o:"destroy target permanent" or o:"exile target permanent" or o:"destroy target enchantment" or o:"destroy target artifact")',
  },
  {
    id: "board_wipe",
    label: "Board wipe",
    group: "Removal",
    query: '(o:"destroy all" or o:"exile all" or o:"each creature")',
  },
  {
    id: "counterspell",
    label: "Counterspell",
    group: "Removal",
    query: '(t:instant o:"counter target")',
  },

  // Triggers
  {
    id: "etb",
    label: "ETB effect",
    group: "Triggers",
    query: '(o:"enters the battlefield" or o:"when ~ enters")',
    hint: "Effets quand la carte entre en jeu",
  },
  {
    id: "death_trigger",
    label: "Death trigger",
    group: "Triggers",
    query: '(o:"dies" or o:"died this turn")',
  },
  {
    id: "cast_trigger",
    label: "Cast trigger",
    group: "Triggers",
    query: '(o:"whenever you cast")',
  },
  {
    id: "attack_trigger",
    label: "Attack trigger",
    group: "Combat",
    query: '(o:"whenever ~ attacks" or o:"whenever a creature attacks")',
  },
  {
    id: "combat_damage_trigger",
    label: "Combat damage trigger",
    group: "Combat",
    query: '(o:"deals combat damage to a player")',
  },

  // Tokens
  {
    id: "token_producer",
    label: "Token producer",
    group: "Tokens",
    query: '(o:"create" o:token)',
  },
  {
    id: "token_doubler",
    label: "Token doubler",
    group: "Tokens",
    query: '(o:"create twice that many" or o:"creates twice that many")',
  },

  // Counters
  {
    id: "plus_counters",
    label: "+1/+1 counters",
    group: "Counters",
    query: '(o:"+1/+1 counter")',
  },
  {
    id: "counter_doubler",
    label: "Counter doubler",
    group: "Counters",
    query: '(o:"twice that many" o:counters)',
  },

  // Protection
  {
    id: "hexproof",
    label: "Hexproof",
    group: "Protection",
    query: "(o:hexproof)",
  },
  {
    id: "indestructible",
    label: "Indestructible",
    group: "Protection",
    query: "(o:indestructible)",
  },
  {
    id: "ward",
    label: "Ward",
    group: "Protection",
    query: "(o:ward)",
  },

  // Combat / Other
  {
    id: "lifegain",
    label: "Lifegain",
    group: "Other",
    query: '(o:"gain" o:life)',
  },
  {
    id: "lifegain_payoff",
    label: "Lifegain payoff",
    group: "Other",
    query: '(o:"whenever you gain life")',
  },
  {
    id: "flicker",
    label: "Flicker / blink",
    group: "Triggers",
    query: '(o:"exile" o:"return it to the battlefield")',
  },
  {
    id: "sac_outlet",
    label: "Sac outlet",
    group: "Triggers",
    query: '(o:"sacrifice a creature:" or o:"sacrifice another creature:")',
  },
  {
    id: "extra_combat",
    label: "Extra combat",
    group: "Combat",
    query: '(o:"additional combat phase")',
  },
];

export const CONCEPT_GROUPS: ConceptGroup[] = [
  "Engine",
  "Mana",
  "Removal",
  "Triggers",
  "Combat",
  "Graveyard",
  "Tokens",
  "Counters",
  "Protection",
  "Other",
];

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}

/** Compose une query Scryfall à partir d'un texte libre, des concepts, et des couleurs. */
export function composeQuery(parts: {
  freeText?: string;
  conceptIds?: string[];
  colors?: string[];
  cmcMin?: number;
  cmcMax?: number;
  type?: string;
  legalInCommander?: boolean;
}): string {
  const fragments: string[] = [];

  if (parts.freeText) fragments.push(parts.freeText.trim());

  if (parts.conceptIds && parts.conceptIds.length > 0) {
    for (const id of parts.conceptIds) {
      const c = getConcept(id);
      if (c) fragments.push(c.query);
    }
  }

  if (parts.colors && parts.colors.length > 0) {
    fragments.push(`id:${parts.colors.join("").toLowerCase()}`);
  }

  if (parts.cmcMin !== undefined) fragments.push(`mv>=${parts.cmcMin}`);
  if (parts.cmcMax !== undefined) fragments.push(`mv<=${parts.cmcMax}`);

  if (parts.type) fragments.push(`t:${parts.type.toLowerCase()}`);

  if (parts.legalInCommander) fragments.push("legal:commander");

  return fragments.join(" ").trim();
}
