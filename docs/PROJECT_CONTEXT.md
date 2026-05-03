# Project Context — gouletmtg

## Vue d'ensemble

Site web de deck building MTG Commander pour Francis Goulet (handle GitHub: `Gouletoo`).

- **Site live** : https://gouletmtg.vercel.app/
- **Repo** : https://github.com/Gouletoo/gouletmtg
- **Auto-deploy** : push sur `main` → Vercel redéploie automatiquement

## Profil utilisateur

- **Francis Goulet**, joueur MTG depuis 2 ans, niveau solide
- Possède 9 decks Commander, fait ses propres proxies de qualité
- Préfère les commanders à beaucoup de triggers (Aragorn the Uniter, Rendmaw Creaking Nest, Ms. Bumbleflower, Coram the Undertaker)
- Pod fixe à 4 joueurs, power level variable bracket 2 à 8-9

## Règles du pod (à respecter dans tout le code)

- ❌ **PAS de tutors** — pas de catégorie tutors, flag d'alerte si carte tutorisable détectée
- ❌ **PAS de combos infinis 2-cartes** — combos 3-4 cartes acceptables uniquement comme plan B
- 💵 **Plafond 50$ USD par carte** — alerte/filtre si une carte dépasse (Francis ne proxy pas au-dessus par respect du groupe)
- 🎯 **Philosophie centrale** : *"Les game changers ne font pas la force d'un deck"* — la synergie prime sur les staples puissants

## Stack technique

- Next.js 16 + TypeScript + Tailwind v4 (App Router)
- Supabase (Postgres + Auth) — projet `gouletmtg`, region East US
- Scryfall API (catalogue cartes)
- Archidekt API (import decks)
- EDHrec (synergies, scraping ciblé + cache 30j)
- Gemini 2.0 Flash (LLM scoring synergie, free tier)
- Vercel (hosting, free tier)

**LLM-agnostic** : le wrapper `lib/llm/scorer.ts` peut être remplacé pour migrer Gemini → Claude → autre sans toucher au reste.

## Brand visual (RESPECTER STRICTEMENT)

**Palette** :
- Crème `#F5EDDF` (fond principal)
- Brun foncé chaud `#2A2218` (texte / fonds sombres) — appelé `ink`
- Terracotta `#C4704A` (accent principal)
- Sable doré `#E2B56B` (accent secondaire)
- Bleu ciel `#7BAFC4` (accent rare, parcimonie)

**Fonts** (déjà chargées via next/font dans `app/layout.tsx`) :
- **Cormorant Infant** = display, titres, citations (`font-display` ou `<h1>` etc.)
- **Khula** = body, UI, lisibilité (`font-body` par défaut)

**Esprit** : warm and earthy, minimaliste, épuré, espace négatif intentionnel, sophistiqué sans être prétentieux. Marges 60-80px, alignement gauche par défaut.

⚠️ Aucun élément visuel "gaming sombre", aucun néon, aucun fluo. PAS de mandalas / éléments yoga (le brand vient à l'origine d'un projet yoga, mais on ne reprend QUE le visual, pas le contexte).

## Catégories de cartes

Par défaut (overlaps permis — une carte peut compter dans plusieurs) :
Ramp, Card Draw, Removal, Board Wipes, Protection, Win Conditions, Threats, Utility Lands, Mana Fixing, Recursion, Interaction.

⚠️ **PAS de catégorie "Tutors"** (interdit par règle du pod).

Catégories custom par deck = à supporter dans l'UI (ajout/modif/suppr).

## Scoring synergique

Voir `docs/ARCHITECTURE.md` §5 pour les détails complets.

Score = `0.25 × tag_overlap + 0.30 × pattern_match + 0.15 × edhrec_cooccurrence + 0.30 × llm_evaluation`

Seuil "maillon faible" : 40/100 (curseur ajustable dans UI).

## Workflow de création de deck (3 modes)

- **Mode A** : Francis donne le commander → propose stratégie → raffinement
- **Mode B** : Francis donne thème/archétype → propose des commanders
- **Mode C** : Import deck Archidekt existant → analyse + upgrades

Les 3 modes accessibles depuis l'écran de création (`/decks/new`).

## Decks de test (pour calibration moteur synergie en phase 3)

1. Ms. Bumbleflower
2. Aragorn, the Uniter
3. Coram, the Undertaker
4. The Locust God
5. Felothar the Steadfast

## Langue

- **Interface en français**
- **Noms des cartes en ANGLAIS uniquement** (toujours)
