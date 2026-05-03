/**
 * Traducteur langage naturel → syntaxe Scryfall via Gemini.
 *
 * On donne au modèle un cheatsheet concis de la syntaxe et on lui demande
 * UNIQUEMENT la requête. Pas d'explication, pas de markdown.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const SYNTAX_CHEATSHEET = `
SYNTAXE SCRYFALL (cheatsheet) :

COULEURS / IDENTITÉ :
- c:rg = couleurs rouge ET vert (exactement)
- c<=rg = couleurs incluses dans rouge/vert
- id:wubrg = identité couleur (utile pour Commander)
- c:colorless ou c=c

TYPE :
- t:creature, t:instant, t:sorcery, t:artifact, t:enchantment, t:land, t:planeswalker
- t:legendary t:creature (commander potentiel)
- combinables : t:legendary t:creature

TEXTE ORACLE :
- o:"draw a card" (le ~ remplace le nom de la carte)
- o:"enters the battlefield"
- o:flying o:trample (cumulatif = ET)

MANA / CMC / POW / TGH :
- mv=3 (mana value), mv<=2, mv>=4
- pow>=4, tou<=2
- m:{2}{U}{U} (coût de mana exact)

LÉGALITÉ :
- legal:commander (nécessaire pour Commander)
- banned:commander
- is:commander (peut être commander)

OPÉRATEURS LOGIQUES :
- ET : juxtaposition (espaces)
- OU : "or" entre les termes
- NON : - devant le terme (ex: -t:land)
- Parenthèses : (a or b)

RACE / TRIBAL :
- t:elf, t:goblin, t:dragon

KEYWORDS :
- o:hexproof, o:indestructible, o:flash, o:ward, o:trample
- has:fdfn (a un mode face avant DFC)

EXEMPLES :
- "créatures vertes avec piétinement à 4 manas ou moins" → c:g t:creature o:trample mv<=4
- "ramp d'artefact qui ajoute 2 manas" → t:artifact o:"add two" o:mana
- "tueurs de créatures à 2 manas en instant noir" → c:b t:instant mv=2 o:"destroy target creature"
- "commanders Esper avec triggers de mort" → id:wub is:commander o:"dies"

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec la query Scryfall, rien d'autre.
- Pas de markdown, pas de code blocks, pas de guillemets.
- Pas de phrases d'intro ni d'explication.
- Si la requête est ambiguë, fais l'interprétation la plus utile pour Commander.
- Ajoute toujours \`legal:commander\` sauf si l'utilisateur cherche explicitement des cartes bannies.
`;

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");
    client = new GoogleGenerativeAI(key);
  }
  return client;
}

export async function translateToScryfall(naturalQuery: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 200,
    },
  });

  const prompt = `${SYNTAX_CHEATSHEET}

Requête utilisateur (français ou anglais) :
${naturalQuery}

Query Scryfall :`;

  const r = await model.generateContent(prompt);
  let text = r.response.text().trim();

  // Nettoyage : retirer guillemets/markdown éventuels
  text = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  text = text.replace(/^["'`]|["'`]$/g, "").trim();

  return text;
}
