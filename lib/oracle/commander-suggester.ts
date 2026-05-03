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

Respond in STRICT JSON only:
{
  "suggestions": [
    {"name": "Exact Card Name", "reason": "Short English explanation (max 25 words) of why this commander fits the theme"}
  ]
}

CRITICAL RULES:
- Output ONLY valid JSON, no markdown code fences, no preamble.
- "name" must be the EXACT English Scryfall name (e.g., "Aragorn, the Uniter" not "Aragorn"). Do not invent cards.
- "reason" in English to avoid quote escaping issues. Plain ASCII when possible.
- 8 suggestions maximum.`;

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
  console.log("[gemini-suggest] raw response (first 500 chars):", text.slice(0, 500));
  const parsed = parseSuggestionsJSON(text);
  console.log("[gemini-suggest] parsed", parsed.suggestions?.length ?? 0, "suggestions");
  return parsed.suggestions ?? [];
}

/** Parse robuste — tolère les sorties Gemini légèrement malformées (apostrophes non échappées, etc.). */
function parseSuggestionsJSON(raw: string): { suggestions?: CommanderSuggestion[] } {
  // 1. Essai direct
  try {
    return JSON.parse(raw);
  } catch {
    /* on continue */
  }

  // 2. Strip markdown code fences
  let cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* on continue */
  }

  // 3. Tente d'extraire le tableau "suggestions" et de parser carte par carte
  const arrayMatch = cleaned.match(/"suggestions"\s*:\s*\[([\s\S]+)\]/);
  if (arrayMatch) {
    const inner = arrayMatch[1];
    // Découpe sur les "}, {" pour avoir des objets indépendants
    const objects = inner.split(/\}\s*,\s*\{/).map((s, i, arr) => {
      const open = i === 0 ? "" : "{";
      const close = i === arr.length - 1 ? "" : "}";
      return `${open}${s}${close}`;
    });

    const suggestions: CommanderSuggestion[] = [];
    for (const obj of objects) {
      try {
        const parsed = JSON.parse(obj) as CommanderSuggestion;
        if (parsed.name && parsed.reason) suggestions.push(parsed);
      } catch {
        // Sauvetage manuel : extrait name et reason via regex
        const nameMatch = obj.match(/"name"\s*:\s*"([^"]+)"/);
        const reasonMatch = obj.match(/"reason"\s*:\s*"([^"]*(?:\\.[^"\\]*)*)"/);
        if (nameMatch) {
          suggestions.push({
            name: nameMatch[1],
            reason: reasonMatch?.[1].replace(/\\"/g, '"') ?? "",
          });
        }
      }
    }
    if (suggestions.length > 0) return { suggestions };
  }

  // 4. Dernier recours : on retourne vide mais on log
  console.error("Failed to parse Gemini suggestions:", raw.slice(0, 500));
  return { suggestions: [] };
}
