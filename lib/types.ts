/**
 * Types globaux du projet gouletmtg.
 * Mappent au schéma Postgres défini dans /supabase/migrations.
 */

export type ScryfallId = string;
export type UserId = string;
export type DeckId = string;

export type Color = "W" | "U" | "B" | "R" | "G";

export interface Card {
  scryfallId: ScryfallId;
  name: string;
  oracleText: string | null;
  typeLine: string;
  cmc: number;
  colors: Color[];
  colorIdentity: Color[];
  power: string | null;
  toughness: string | null;
  keywords: string[];
  legalities: Record<string, "legal" | "not_legal" | "banned" | "restricted">;
  prices: { usd?: string; usd_foil?: string; eur?: string };
  imageUris: { small?: string; normal?: string; large?: string; art_crop?: string };
  setCode: string;
  releasedAt: string;
  tags: string[];
  edhrecData?: unknown;
}

export interface PodRules {
  noTutors: boolean;
  noInfiniteCombos: boolean;
  maxCardPriceUsd: number;
  notes?: string;
}

export interface Profile {
  userId: UserId;
  displayName: string;
  petCards: ScryfallId[];
  bannedCards: ScryfallId[];
  podRules: PodRules;
  preferences: {
    favoriteArchetypes?: string[];
    bracketDefault?: number;
  };
}

export interface DeckCategory {
  name: string;
  color?: string;
}

export interface DeckCard {
  cardId: ScryfallId;
  qty: number;
  categories: string[];
  notes?: string;
}

export interface Deck {
  id: DeckId;
  userId: UserId;
  name: string;
  commanderId: ScryfallId;
  partnerCommanderId?: ScryfallId;
  strategySummary?: string;
  bracketTarget?: number;
  customCategories: DeckCategory[];
  archidektId?: string;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
}

export interface SynergyScore {
  cardAId: ScryfallId;
  cardBId: ScryfallId;
  score: number;
  factors: {
    tagOverlap?: number;
    patternMatch?: number;
    edhrecCooccurrence?: number;
    llmEvaluation?: number;
  };
  explanation?: string;
}

export const DEFAULT_POD_RULES: PodRules = {
  noTutors: true,
  noInfiniteCombos: true,
  maxCardPriceUsd: 50,
};

export const DEFAULT_CATEGORIES = [
  "Ramp",
  "Card Draw",
  "Removal",
  "Board Wipes",
  "Protection",
  "Win Conditions",
  "Threats",
  "Utility Lands",
  "Mana Fixing",
  "Recursion",
  "Interaction",
] as const;

export const SYNERGY_WEIGHTS = {
  tagOverlap: 0.25,
  patternMatch: 0.30,
  edhrecCooccurrence: 0.15,
  llmEvaluation: 0.30,
} as const;

export const WEAK_LINK_THRESHOLD = 40;
