# Phase 1 Brief — Briefing pour l'agent autonome

> Ce document est ton brief complet. Lis-le en entier avant d'agir.

## Contexte obligatoire à lire EN PREMIER

1. `docs/PROJECT_CONTEXT.md` (vue d'ensemble, profil utilisateur, brand visual, règles du pod)
2. `docs/ARCHITECTURE.md` (architecture technique complète, scoring synergique, schémas DB)
3. `HANDOFF.md` à la racine (état actuel)
4. `lib/types.ts`, `lib/scryfall/client.ts`, `lib/supabase/{client,server}.ts`, `lib/llm/scorer.ts` (infra existante)
5. `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (brand visual appliqué)
6. `supabase/migrations/001_initial_schema.sql` (schéma DB déjà appliqué sur Supabase)

## État actuel

- Phase 0 = COMPLÈTE. Site live https://gouletmtg.vercel.app/
- Schéma DB appliqué (8 tables, RLS configurée)
- Brand visual en place (Cormorant Infant + Khula, palette crème/terracotta/ink)
- Vercel auto-deploy depuis `main`

## Ton objectif (Phase 1)

Écrire le **CODE** de la Phase 1. Tu n'as **PAS** accès aux secrets (Supabase service role key, Gemini key) — Francis testera l'exécution réelle quand il reviendra.

### Tâches dans l'ordre

#### 1. Script de sync Scryfall (`scripts/sync-scryfall.ts`)

- Télécharge le bulk `oracle-cards` depuis https://api.scryfall.com/bulk-data
- Parse le JSON (~30k cartes)
- Upsert dans la table `cards` de Supabase via le client server-side avec `SUPABASE_SERVICE_ROLE_KEY`
- Map les champs Scryfall → schéma DB (voir `lib/types.ts` et `001_initial_schema.sql`)
- Filtre : ne garder que les cartes legal/restricted en commander (`legalities.commander === 'legal'`)
- Batch les inserts (par 500 lignes) pour éviter timeouts
- Logue progression (`X/30000 cartes synchronisées`)
- Doit pouvoir tourner via `npx tsx scripts/sync-scryfall.ts` (ajoute `tsx` aux devDependencies si nécessaire)
- Charge les variables d'environnement depuis `.env.local` (utilise `dotenv` ou flag node)

#### 2. Auth Supabase (magic link)

- Page `/login` : formulaire email + bouton « Envoyer le lien magique » (brandé)
- Route `/auth/callback` qui handle le callback magic link Supabase
- `middleware.ts` à la racine pour rafraîchir la session côté serveur
- Bouton de logout accessible (dans le header de pages authentifiées)
- À la première connexion : auto-création du profil dans `profiles` avec valeurs par défaut du pod (no tutors, max 50$, no infinite combos)
- Redirige vers `/decks` après login

#### 3. Page recherche de cartes (`/cards`)

- Layout 2 colonnes : filtres à gauche (sidebar), grid de résultats à droite
- Filtres :
  - Recherche texte par nom (autocomplete)
  - Couleurs (W/U/B/R/G via toggles)
  - CMC (range slider 0-15)
  - Type (creature/instant/sorcery/artifact/enchantment/land/planeswalker)
  - Oracle text contient
- **Source des données** : la table `cards` de Supabase (pas Scryfall en direct — la sync remplit la DB)
- Affichage carte : tile avec image (`image_uris.normal`), nom, mana cost, type line
- Hover : preview agrandie
- Pagination ou infinite scroll (60 par page)
- Respect strict du brand : crème/ink/terracotta, Cormorant Infant pour titres, Khula pour body

#### 4. Pages decks (`/decks` + `/decks/new`)

- `/decks` : liste des decks de l'utilisateur (vide pour le moment, message « aucun deck — crée ton premier »)
- `/decks/new` : 3 cartes côte à côte représentant les 3 modes (A: commander, B: thème/archétype, C: import Archidekt). Pour cette session, les pages cibles peuvent être des stubs « En construction ».

#### 5. Page profil (`/profile`)

- Affiche les pod rules avec UI éditable (no tutors checkbox, max card price input, no infinite combos checkbox)
- Pet cards et banned cards en placeholder (« À venir : ajouter des cartes »)
- Sauvegarde les modifs dans la table `profiles`

## Contraintes strictes

- ❌ **NE PAS exécuter** `scripts/sync-scryfall.ts` (pas de service role key disponible)
- ❌ **NE PAS exécuter** quoi que ce soit qui nécessite les vraies clés Supabase/Gemini
- ✅ TOUJOURS faire `npm run build` à la fin pour vérifier que tout compile
- ✅ Respecter le brand visual à 100% (palette + fonts définis dans globals.css/layout.tsx)
- ✅ Interface en français, noms de cartes en anglais uniquement
- ✅ Pas de catégorie « Tutors » nulle part
- ✅ Code TypeScript strict, pas de `any` sauf justifié
- ✅ Respecter la philosophie : épuré, sophistiqué, espace négatif

## Livrable

1. Tous les fichiers de code écrits et `npm run build` passe
2. Commits propres et atomiques (un commit par grosse zone : `feat: scryfall sync script`, `feat: supabase auth flow`, `feat: card search page`, etc.)
3. Push sur `main` (Vercel redéploie automatiquement)
4. Crée `HANDOFF_PHASE1.md` à la racine avec :
   - Ce que tu as fait (liste précise des fichiers créés/modifiés)
   - Ce que Francis doit faire pour activer (ex: `npx tsx scripts/sync-scryfall.ts` pour remplir la DB)
   - Bugs ou incertitudes que tu as laissés
   - Recommandations pour la prochaine session

Si tu rencontres une décision technique ambiguë, choisis l'option la plus simple et conservatrice, et documente-la dans le HANDOFF.

Bon courage.
