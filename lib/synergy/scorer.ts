/**
 * Pair scorer — combine tags + patterns pour un score de synergie 0-100.
 *
 * Phase 3.0 (cette version) : scoring déterministe (tags + patterns).
 * Phase 3.5 (à venir) : ajouter EDHrec co-occurrence + LLM nuance.
 *
 * Pondérations actuelles (sans LLM/EDHrec) :
 *   - Tag overlap : 30%
 *   - Pattern matching : 70%
 */

import { extractTags, type Tag } from "./tags";
import { matchingPatterns, type Pattern } from "./patterns";

export interface PairScore {
  /** Score 0-100 */
  score: number;
  /** Détail par source */
  factors: {
    tagOverlap: number; // 0-100
    patternMatch: number; // 0-100
  };
  /** Patterns matchés — pour explication UI */
  patterns: Pattern[];
  /** Tags partagés — pour debug */
  sharedTags: Tag[];
}

interface CardLike {
  oracleText: string | null;
  typeLine: string | null;
}

/** Calcule le score de synergie entre 2 cartes. */
export function scorePair(cardA: CardLike, cardB: CardLike): PairScore {
  const tagsA = extractTags(cardA.oracleText, cardA.typeLine);
  const tagsB = extractTags(cardB.oracleText, cardB.typeLine);
  return scoreFromTags(tagsA, tagsB);
}

/** Variante quand les tags sont déjà extraits (cache). */
export function scoreFromTags(tagsA: Tag[], tagsB: Tag[]): PairScore {
  // 1. Tag overlap (Jaccard pondéré)
  const setA = new Set(tagsA.map((t) => `${t.category}:${t.value}`));
  const setB = new Set(tagsB.map((t) => `${t.category}:${t.value}`));
  const intersection = new Set<string>();
  const union = new Set<string>();
  for (const k of setA) {
    union.add(k);
    if (setB.has(k)) intersection.add(k);
  }
  for (const k of setB) union.add(k);

  // Skip les tags trop génériques (type:creature partout, etc.)
  const genericTags = new Set(["type:creature", "type:legendary"]);
  const meaningfulIntersection = Array.from(intersection).filter(
    (t) => !genericTags.has(t)
  );
  const meaningfulUnion = Array.from(union).filter((t) => !genericTags.has(t));

  const tagOverlap =
    meaningfulUnion.length > 0
      ? Math.round((meaningfulIntersection.length / meaningfulUnion.length) * 100)
      : 0;

  // 2. Pattern matching — max score parmi tous les patterns matchés
  const patterns = matchingPatterns(tagsA, tagsB);
  const patternMatch = patterns.length > 0 ? Math.max(...patterns.map((p) => p.score)) : 0;

  // 3. Combinaison pondérée
  // Si pattern fort (>70), on lui donne plus de poids parce que le pattern est intentionnel
  const w_tag = 0.3;
  const w_pattern = 0.7;
  let score = Math.round(tagOverlap * w_tag + patternMatch * w_pattern);

  // Bonus si plusieurs patterns matchent (synergie multi-axes)
  if (patterns.length >= 2) {
    score = Math.min(100, score + 5);
  }

  const sharedTags: Tag[] = Array.from(intersection)
    .filter((k) => !genericTags.has(k))
    .map((k) => {
      const [category, value] = k.split(":");
      return { category: category as Tag["category"], value };
    });

  return {
    score,
    factors: {
      tagOverlap,
      patternMatch,
    },
    patterns,
    sharedTags,
  };
}

/**
 * Score commander ↔ chaque carte du deck.
 * Utilisé pour identifier les maillons faibles (cartes peu liées au commander).
 */
export function scoreDeckVsCommander(
  commander: CardLike,
  deck: Array<{ id: string; card: CardLike }>
): Array<{ id: string; score: PairScore }> {
  const commanderTags = extractTags(commander.oracleText, commander.typeLine);
  return deck.map((entry) => ({
    id: entry.id,
    score: scoreFromTags(commanderTags, extractTags(entry.card.oracleText, entry.card.typeLine)),
  }));
}

/** Couleur de badge selon le score. */
export function scoreColor(score: number): "low" | "medium" | "high" {
  if (score < 30) return "low";
  if (score < 60) return "medium";
  return "high";
}
