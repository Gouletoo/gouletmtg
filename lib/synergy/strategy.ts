/**
 * Extracteur de tags depuis un texte de stratégie écrit par l'utilisateur.
 *
 * Permet d'enrichir le profil du commander avec des concepts que ses tags
 * Oracle ne capturent pas tout seuls (ex: "5-color allies tribal" pour Aragorn).
 *
 * Le LLM doit retourner UNIQUEMENT des tags dans notre taxonomie existante
 * (lib/synergy/tags.ts) pour que le pattern matcher continue à fonctionner.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Tag, TagCategory } from "./tags";

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");
    client = new GoogleGenerativeAI(key);
  }
  return client;
}

const TAXONOMY_PROMPT = `Tu es un expert MTG. Tu vas analyser une stratégie de deck Commander et en extraire des tags dans une taxonomie précise. Le but : enrichir le profil du commander pour qu'un scorer de synergie identifie les bonnes cartes.

TAXONOMIE (catégorie:valeur). Tu DOIS choisir uniquement parmi ces valeurs :

produces:treasure, produces:food, produces:clue, produces:blood, produces:creature-token, produces:+1+1-counter, produces:-1-1-counter, produces:loyalty-counter, produces:mana, produces:land-ramp, produces:land-drop

triggers-on:etb, triggers-on:etb-other, triggers-on:death, triggers-on:attack, triggers-on:combat-damage, triggers-on:damage, triggers-on:cast, triggers-on:draw, triggers-on:lifegain, triggers-on:lifelost, triggers-on:phase, triggers-on:sacrifice, triggers-on:block, triggers-on:token-etb

cares-about:artifacts, cares-about:creatures, cares-about:treasure, cares-about:graveyard, cares-about:+1+1-counter, cares-about:opponents, cares-about:lands, cares-about:permanents

payoff:card-draw, payoff:card-draw-scale, payoff:lifegain, payoff:damage, payoff:copy, payoff:extra-turn, payoff:extra-combat

enabler:sac-outlet, enabler:discard-outlet, enabler:blink, enabler:reanimate, enabler:counterspell, enabler:removal, enabler:board-wipe, enabler:edict, enabler:pump, enabler:tutor

mechanic:cascade, mechanic:storm, mechanic:proliferate, mechanic:scry, mechanic:surveil, mechanic:explore, mechanic:convoke, mechanic:delve, mechanic:cycling, mechanic:dash, mechanic:flashback

keyword:flying, keyword:trample, keyword:haste, keyword:vigilance, keyword:deathtouch, keyword:lifelink, keyword:hexproof, keyword:indestructible, keyword:ward, keyword:double-strike, keyword:first-strike, keyword:menace, keyword:flash, keyword:unblockable, keyword:reach

tribal:<sous-type> (ex: tribal:elf, tribal:soldier, tribal:dragon, tribal:zombie, tribal:goblin, tribal:wizard, tribal:angel, tribal:knight, tribal:human, tribal:cat, tribal:bird, tribal:vampire, tribal:demon, tribal:spirit, tribal:warrior, tribal:elemental, tribal:beast, tribal:ally, etc.)

RÈGLES :
- Choisis 5 à 12 tags les plus pertinents pour la stratégie.
- N'invente PAS de catégories ou valeurs hors de cette liste.
- Pour les tribus, garde le sous-type en minuscules (ex: tribal:elf).
- Réponds en JSON strict, sans markdown :
  {"tags": ["categorie:valeur", "categorie:valeur", ...]}
`;

export async function extractStrategyTags(
  commanderName: string,
  commanderOracleText: string | null,
  strategyText: string
): Promise<Tag[]> {
  if (!strategyText.trim()) return [];

  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      maxOutputTokens: 500,
    },
  });

  const prompt = `${TAXONOMY_PROMPT}

Commander : ${commanderName}
${commanderOracleText ?? ""}

Stratégie du joueur :
${strategyText}

Tags extraits :`;

  const r = await model.generateContent(prompt);
  const text = r.response.text();

  let parsed: { tags?: string[] } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // fallback : extraction par regex
    const match = text.match(/"tags"\s*:\s*\[([^\]]*)\]/);
    if (match) {
      const items = match[1]
        .split(",")
        .map((s) => s.replace(/["']/g, "").trim())
        .filter(Boolean);
      parsed.tags = items;
    }
  }

  const tags: Tag[] = [];
  const seen = new Set<string>();
  for (const raw of parsed.tags ?? []) {
    const colonIdx = raw.indexOf(":");
    if (colonIdx <= 0) continue;
    const category = raw.slice(0, colonIdx) as TagCategory;
    const value = raw.slice(colonIdx + 1).trim();
    if (!value) continue;
    const key = `${category}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push({ category, value });
  }

  return tags;
}
