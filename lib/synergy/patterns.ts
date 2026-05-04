/**
 * Bibliothèque de patterns canoniques MTG.
 *
 * Un pattern décrit une interaction entre 2 cartes via leurs tags.
 * Si les tags des deux cartes matchent un pattern, on attribue le score.
 *
 * On combine plusieurs patterns dans le scorer pour calculer le score final
 * d'une paire (max ou somme normalisée selon le cas).
 */

import type { Tag } from "./tags";

export interface Pattern {
  id: string;
  name: string;
  /** Tag spec qu'une des deux cartes doit avoir. */
  needsA: TagSpec;
  /** Tag spec que l'AUTRE carte doit avoir. */
  needsB: TagSpec;
  /** Score attribué si la paire matche, 0-100. */
  score: number;
  /** Explication en français — affichée dans la UI quand l'utilisateur clique. */
  explanation: string;
  /** Si vrai, on test aussi A↔B inversé (utile quand un pattern est asymétrique). */
  bidirectional?: boolean;
}

export interface TagSpec {
  category: Tag["category"];
  value: string;
}

function hasTag(tags: Tag[], spec: TagSpec): boolean {
  return tags.some((t) => t.category === spec.category && t.value === spec.value);
}

export const PATTERNS: Pattern[] = [
  // ===================== PRODUCER × PAYOFF =====================
  {
    id: "treasure-engine",
    name: "Treasure producer × payoff",
    needsA: { category: "produces", value: "treasure" },
    needsB: { category: "cares-about", value: "treasure" },
    score: 88,
    explanation: "L'une produit des treasures, l'autre les transforme en value",
  },
  {
    id: "token-payoff",
    name: "Token producer × creature count payoff",
    needsA: { category: "produces", value: "creature-token" },
    needsB: { category: "cares-about", value: "creatures" },
    score: 80,
    explanation: "L'une crée des créatures, l'autre scale sur le nombre de créatures",
  },
  {
    id: "plus-counter-engine",
    name: "+1/+1 producer × payoff",
    needsA: { category: "produces", value: "+1+1-counter" },
    needsB: { category: "cares-about", value: "+1+1-counter" },
    score: 85,
    explanation: "L'une distribue des +1/+1, l'autre s'en nourrit",
  },
  {
    id: "ramp-lands-matter",
    name: "Land ramp × lands matter",
    needsA: { category: "produces", value: "land-ramp" },
    needsB: { category: "cares-about", value: "lands" },
    score: 70,
    explanation: "L'une accélère les lands, l'autre les compte comme ressource",
  },

  // ===================== ENABLER × TRIGGER =====================
  {
    id: "sac-outlet-death",
    name: "Sac outlet × death trigger",
    needsA: { category: "enabler", value: "sac-outlet" },
    needsB: { category: "triggers-on", value: "death" },
    score: 92,
    explanation: "L'une peut sacrifier des créatures à volonté, l'autre déclenche sur les morts",
  },
  {
    id: "blink-etb",
    name: "Blink × ETB trigger",
    needsA: { category: "enabler", value: "blink" },
    needsB: { category: "triggers-on", value: "etb" },
    score: 88,
    explanation: "L'une fait clignoter, l'autre re-déclenche son ETB à chaque retour",
  },
  {
    id: "blink-etb-other",
    name: "Blink × token-etb trigger",
    needsA: { category: "enabler", value: "blink" },
    needsB: { category: "triggers-on", value: "etb-other" },
    score: 80,
    explanation: "Les flickers déclenchent l'effet ETB-other à chaque retour",
  },
  {
    id: "reanimate-graveyard",
    name: "Reanimate × graveyard fillers",
    needsA: { category: "enabler", value: "reanimate" },
    needsB: { category: "cares-about", value: "graveyard" },
    score: 75,
    explanation: "L'une ressuscite, l'autre exploite ou alimente le cimetière",
  },
  {
    id: "discard-outlet-graveyard",
    name: "Discard outlet × graveyard payoff",
    needsA: { category: "enabler", value: "discard-outlet" },
    needsB: { category: "cares-about", value: "graveyard" },
    score: 75,
    explanation: "L'une se défausse à volonté, l'autre tire profit du cimetière",
  },
  {
    id: "discard-outlet-reanimate",
    name: "Discard outlet × reanimate",
    needsA: { category: "enabler", value: "discard-outlet" },
    needsB: { category: "enabler", value: "reanimate" },
    score: 82,
    explanation: "Combo classique : se défausser un gros threat puis le ramener",
  },

  // ===================== TRIGGERS COMBINÉS =====================
  {
    id: "etb-etb-other",
    name: "ETB-self × ETB-other",
    needsA: { category: "triggers-on", value: "etb" },
    needsB: { category: "triggers-on", value: "etb-other" },
    score: 70,
    explanation: "L'arrivée de l'une déclenche le compteur de l'autre",
  },
  {
    id: "death-sacrifice-chain",
    name: "Sacrifice trigger × death trigger",
    needsA: { category: "triggers-on", value: "sacrifice" },
    needsB: { category: "triggers-on", value: "death" },
    score: 78,
    explanation: "Sacrifier un permanent déclenche les deux à la fois",
  },
  {
    id: "attack-combat-damage",
    name: "Attack trigger × combat damage trigger",
    needsA: { category: "triggers-on", value: "attack" },
    needsB: { category: "triggers-on", value: "combat-damage" },
    score: 65,
    explanation: "Les deux activent dans la même phase d'attaque",
  },

  // ===================== COUNTERS / PROLIFERATE =====================
  {
    id: "proliferate-plus-counter",
    name: "Proliferate × +1/+1 counters",
    needsA: { category: "mechanic", value: "proliferate" },
    needsB: { category: "produces", value: "+1+1-counter" },
    score: 85,
    explanation: "Proliférer multiplie les +1/+1 distribués",
  },
  {
    id: "proliferate-loyalty",
    name: "Proliferate × planeswalker",
    needsA: { category: "mechanic", value: "proliferate" },
    needsB: { category: "type", value: "planeswalker" },
    score: 78,
    explanation: "Proliférer recharge les loyalty counters",
  },
  {
    id: "proliferate-payoff-counters",
    name: "Proliferate × counter payoff",
    needsA: { category: "mechanic", value: "proliferate" },
    needsB: { category: "cares-about", value: "+1+1-counter" },
    score: 82,
    explanation: "Proliférer alimente une stratégie counters",
  },

  // ===================== STORM / CAST TRIGGERS =====================
  {
    id: "storm-cast-cheap",
    name: "Cast trigger × low-mana spells",
    needsA: { category: "triggers-on", value: "cast" },
    needsB: { category: "mechanic", value: "storm" },
    score: 80,
    explanation: "Storm et cast trigger se déclenchent en chaîne",
  },

  // ===================== KEYWORDS COMBOS =====================
  {
    id: "double-strike-deathtouch",
    name: "Double strike × deathtouch",
    needsA: { category: "keyword", value: "double-strike" },
    needsB: { category: "keyword", value: "deathtouch" },
    score: 85,
    explanation: "Combo classique : kill par premier strike, lethal par deathtouch",
  },
  {
    id: "double-strike-lifelink",
    name: "Double strike × lifelink",
    needsA: { category: "keyword", value: "double-strike" },
    needsB: { category: "keyword", value: "lifelink" },
    score: 78,
    explanation: "Double strike + lifelink = double lifegain à chaque tap",
  },
  {
    id: "trample-pump",
    name: "Trample × pump",
    needsA: { category: "keyword", value: "trample" },
    needsB: { category: "enabler", value: "pump" },
    score: 70,
    explanation: "Pump + trample passe les dégâts excédentaires sur le joueur",
  },
  {
    id: "haste-extra-combat",
    name: "Haste × extra combat",
    needsA: { category: "keyword", value: "haste" },
    needsB: { category: "payoff", value: "extra-combat" },
    score: 72,
    explanation: "Haste permet d'utiliser les combats supplémentaires immédiatement",
  },
  {
    id: "vigilance-attack-trigger",
    name: "Vigilance × attack trigger",
    needsA: { category: "keyword", value: "vigilance" },
    needsB: { category: "triggers-on", value: "attack" },
    score: 65,
    explanation: "Vigilance permet d'attaquer sans laisser le board exposé",
  },

  // ===================== EXTRA COMBAT / TURN =====================
  {
    id: "extra-combat-attack-trigger",
    name: "Extra combat × attack trigger",
    needsA: { category: "payoff", value: "extra-combat" },
    needsB: { category: "triggers-on", value: "attack" },
    score: 80,
    explanation: "Plus de phases d'attaque = plus d'attack triggers",
  },
  {
    id: "extra-turn-engine",
    name: "Extra turn × ETB trigger",
    needsA: { category: "payoff", value: "extra-turn" },
    needsB: { category: "triggers-on", value: "etb" },
    score: 70,
    explanation: "Tours supplémentaires multiplient les arrivées de cartes",
  },

  // ===================== LIFEGAIN ENGINE =====================
  {
    id: "lifelink-lifegain-payoff",
    name: "Lifelink × lifegain payoff",
    needsA: { category: "keyword", value: "lifelink" },
    needsB: { category: "triggers-on", value: "lifegain" },
    score: 80,
    explanation: "Lifelink déclenche les payoffs à chaque coup",
  },
  {
    id: "lifegain-payoff",
    name: "Lifegain producer × payoff",
    needsA: { category: "payoff", value: "lifegain" },
    needsB: { category: "triggers-on", value: "lifegain" },
    score: 75,
    explanation: "L'une fait gagner de la vie, l'autre déclenche dessus",
  },

  // ===================== ARTIFACT / ENCHANT GLUE =====================
  {
    id: "artifact-cares",
    name: "Artifact × artifact-matters",
    needsA: { category: "type", value: "artifact" },
    needsB: { category: "cares-about", value: "artifacts" },
    score: 65,
    explanation: "Une carte artefact alimente le compteur d'artifacts",
  },
  {
    id: "treasure-artifact-cares",
    name: "Treasure × artifact-matters",
    needsA: { category: "produces", value: "treasure" },
    needsB: { category: "cares-about", value: "artifacts" },
    score: 75,
    explanation: "Treasures sont des artefacts — double payoff",
  },

  // ===================== CARD ADVANTAGE / DRAW =====================
  {
    id: "draw-trigger-engine",
    name: "Draw trigger × card draw",
    needsA: { category: "triggers-on", value: "draw" },
    needsB: { category: "payoff", value: "card-draw" },
    score: 78,
    explanation: "Chaque pioche déclenche l'effet — engine puissant",
  },

  // ===================== TRIBAL =====================
  // Approximation : si une carte est tribal:elf et une autre cares-about:creatures, faible
  // Vrai tribal : matched par tribal:X dans les deux cartes — score moyen-fort

  // ===================== REMOVAL CONSISTENCE (REDUNDANCY) =====================
  // (Bonus de redondance traité par le scorer global, pas par patterns)

  // ===================== TYPE COVERAGE =====================
  {
    id: "instant-flash-protection",
    name: "Flash × instant-speed disruption",
    needsA: { category: "keyword", value: "flash" },
    needsB: { category: "enabler", value: "counterspell" },
    score: 60,
    explanation: "Flash et instants permettent d'agir en réaction",
  },

  // ===================== NEGATIVE-SPACE / ANTI-PATTERNS =====================
  // (à venir Phase 3.5 : exiler le graveyard d'un reanimator-self, etc.)
];

/**
 * Test si une paire de cartes matche un pattern (dans un sens ou l'autre).
 */
export function matchesPattern(tagsA: Tag[], tagsB: Tag[], pattern: Pattern): boolean {
  // Sens 1
  if (hasTag(tagsA, pattern.needsA) && hasTag(tagsB, pattern.needsB)) return true;
  // Sens 2 (toujours bidirectionnel sauf indication contraire)
  if (pattern.bidirectional !== false) {
    if (hasTag(tagsA, pattern.needsB) && hasTag(tagsB, pattern.needsA)) return true;
  }
  return false;
}

/** Tous les patterns qui matchent une paire de cartes. */
export function matchingPatterns(tagsA: Tag[], tagsB: Tag[]): Pattern[] {
  return PATTERNS.filter((p) => matchesPattern(tagsA, tagsB, p));
}
