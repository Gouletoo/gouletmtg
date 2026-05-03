/**
 * Suggérer des commanders à partir d'un thème/archétype.
 * Biaisé vers les commanders à BEAUCOUP DE TRIGGERS (préférence Francis).
 *
 * Workflow :
 * 1. Gemini génère une liste de noms de commanders pertinents avec une raison
 * 2. On valide les noms contre notre table cards (legendary creature, legal en commander)
 * 3. On retourne uniquement ceux qui existent en DB
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CommanderSuggestion {
  name: string;
  reason: string;
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

const PROMPT_PREAMBLE = `Tu es un expert MTG Commander. Tu suggères des commanders pour un joueur dont le profil est :
- Joue à 4 joueurs en multijoueur
- Préfère LARGEMENT les commanders à beaucoup de triggers (Aragorn the Uniter, Rendmaw Creaking Nest, Ms. Bumbleflower, Coram the Undertaker)
- Pas de tutors dans le pod
- Évite les combos infinis 2-cartes
- Plafond 50$ par carte (ses commanders favoris coûtent moins de 50$)
- La synergie prime sur la puissance brute — il préfère un commander unique et synergique à un staple générique

Pour le thème suivant, suggère 8 commanders pertinents. Privilégie les commanders avec :
1. Plusieurs triggers/abilities qui transforment chaque action en value
2. Des angles de stratégie sous-explorés mais solides
3. Une diversité de couleurs si possible

Réponds en JSON strict, sans markdown :
{
  "suggestions": [
    {"name": "Nom Exact de la Carte", "reason": "Pourquoi ce commander fit ce thème (max 30 mots, en français)"}
  ]
}

Le "name" doit être le nom EXACT en anglais tel qu'il apparaît sur Scryfall (ex: "Aragorn, the Uniter" pas "Aragorn"). N'invente pas de cartes.`;

export async function suggestCommanders(theme: string): Promise<CommanderSuggestion[]> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      maxOutputTokens: 1500,
    },
  });

  const prompt = `${PROMPT_PREAMBLE}\n\nThème / archétype / mécanique recherché :\n${theme}`;

  const r = await model.generateContent(prompt);
  const text = r.response.text();
  const parsed = JSON.parse(text) as { suggestions?: CommanderSuggestion[] };
  return parsed.suggestions ?? [];
}
