/**
 * Scoring LLM des paires de cartes — wrapper LLM-agnostic.
 * Implémentation par défaut : Gemini 2.0 Flash (free tier).
 *
 * Pour migrer vers Claude / autre : remplacer l'implémentation de `scorePair`,
 * tout le reste du moteur de synergie reste inchangé.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Card } from "@/lib/types";

export interface PairScoreInput {
  commander: Pick<Card, "name" | "oracleText">;
  strategySummary?: string;
  cardA: Pick<Card, "name" | "oracleText">;
  cardB: Pick<Card, "name" | "oracleText">;
}

export interface PairScoreResult {
  score: number;
  reason: string;
  interactionType: string;
}

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");
    client = new GoogleGenerativeAI(key);
  }
  return client;
}

export async function scorePair(input: PairScoreInput): Promise<PairScoreResult> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = `Tu es un expert MTG Commander. Évalue la synergie entre ces 2 cartes dans le contexte du deck.

Commander : ${input.commander.name}
${input.commander.oracleText ?? ""}

Stratégie : ${input.strategySummary ?? "(non précisée)"}

Carte A : ${input.cardA.name}
${input.cardA.oracleText ?? ""}

Carte B : ${input.cardB.name}
${input.cardB.oracleText ?? ""}

Réponds en JSON strict :
{
  "score": <0-100>,
  "reason": "<courte explication française, max 25 mots>",
  "interactionType": "producer-payoff|enabler-trigger|protection|redundancy|none|other"
}`;

  const r = await model.generateContent(prompt);
  const text = r.response.text();
  const parsed = JSON.parse(text);

  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    reason: String(parsed.reason ?? ""),
    interactionType: String(parsed.interactionType ?? "other"),
  };
}
