# MTG Commander Deck Builder Pro
## Document d'architecture complet

> Version 1.0 — Document de fondation. À valider avant tout développement.

---

## Sommaire

1. [Vision et principes directeurs](#1-vision-et-principes-directeurs)
2. [Architecture technique](#2-architecture-technique)
3. [Plan de phases (roadmap)](#3-plan-de-phases-roadmap)
4. [Mockups conceptuels des écrans](#4-mockups-conceptuels-des-écrans)
5. [Moteur de scoring synergique](#5-moteur-de-scoring-synergique)
6. [Intégrations externes](#6-intégrations-externes)
7. [Structure de données et mémoire](#7-structure-de-données-et-mémoire)
8. [Stratégie de déploiement et coûts](#8-stratégie-de-déploiement-et-coûts)
9. [Risques identifiés et mitigations](#9-risques-identifiés-et-mitigations)
10. [Décisions à valider avant code](#10-décisions-à-valider-avant-code)

---

## 1. Vision et principes directeurs

### Mission
Construire un outil de deck building Commander qui dépasse Moxfield, Archidekt et EDHrec en **profondeur d'analyse synergique** et en **personnalisation au profil joueur**. Pas un clone — un compagnon de deck building qui pense comme un joueur pro.

### Principes directeurs (règles dures, dérivées de tes specs)

| Principe | Implication concrète |
|---|---|
| **La synergie prime sur le power** | Score de synergie pondéré plus haut que power level dans toutes les recommandations |
| **Pas de tutors** | Catégorie "tutors" absente. Si une carte est tutorisable détectée → flag d'avertissement |
| **Combos ≤ 4 cartes, en plan B** | Détecteur de combo qui flag les combos 2-cartes et catégorise les autres |
| **Plafond 50$ par carte** | Filtre de prix systématique avec proposition d'alternatives |
| **Commanders à triggers** | Algorithme de suggestion de commanders biaisé vers les cartes à 3+ triggers |
| **Pod 4 joueurs** | Les analyses de matchup et de threat assessment sont calibrées multijoueur, pas 1v1 |
| **Brand warm/earthy** | Aucun élément visuel "gaming sombre". Crème, terracotta, sérénité graphique |

---

## 2. Architecture technique

### 2.1 Stack retenu

| Couche | Technologie | Pourquoi |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Front + backend dans un repo. Déploiement instant Vercel. SSR pour SEO si tu veux partager des decks plus tard. |
| **Langage** | TypeScript (strict) | Sécurité de refactor — un projet de cette ampleur sans types est ingérable. |
| **UI** | TailwindCSS + shadcn/ui | Tailwind = vitesse de styling. shadcn/ui = composants accessibles et 100% customisables (pas une lib bloquée). |
| **Visualisations** | D3.js + Recharts | D3 pour le graphe de synergie (force-directed). Recharts pour les courbes de mana, pie charts couleurs. |
| **Base de données** | Supabase (Postgres) | 500 MB gratuit. Auth intégrée. Row-level security. API REST + temps réel. |
| **API Cartes** | Scryfall (bulk + live) | Standard de l'industrie. Bulk JSON ~250 MB téléchargé 1x/jour côté serveur. |
| **API Decks** | Archidekt API publique | Endpoints `/api/decks/{id}/` retournent JSON. |
| **API Synergie** | EDHrec (scraping ciblé + cache agressif) | Pas d'API officielle. Scraping respectueux + cache 30j en DB. |
| **LLM (scoring)** | Google Gemini 2.0 Flash (free tier) | Pour le scoring de synergie sémantique avancé. Free tier généreux (1M tokens/jour, 1500 req/jour) — largement suffisant pour usage perso. Migrable vers Claude en 1h si besoin. |
| **Hébergement** | Vercel | Gratuit pour usage perso. Auto-deploy depuis GitHub. |
| **Auth** | Supabase Auth (email magic link) | Pas de mot de passe à gérer. |

### 2.2 Architecture en couches

```
┌─────────────────────────────────────────────────────┐
│  CLIENT (Next.js — App Router, RSC)                 │
│  - Pages : decks, cards, profile, knowledge         │
│  - Composants : DeckBuilder, SynergyGraph, Stats    │
│  - State : Zustand (deck en cours), TanStack Query  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│  API ROUTES (Next.js, /api/*)                       │
│  - /api/cards/search    → Scryfall proxy + cache    │
│  - /api/archidekt/import                            │
│  - /api/synergy/score   → Engine de scoring         │
│  - /api/suggest         → Suggestions IA            │
│  - /api/decks/*         → CRUD decks (Supabase)     │
└───────────────────┬─────────────────────────────────┘
                    │
       ┌────────────┼────────────┬───────────────────┐
       ▼            ▼            ▼                   ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────────┐
│ Supabase │ │ Scryfall │ │  Archidekt   │ │ Claude API  │
│ Postgres │ │   bulk   │ │   public API │ │ (synergie + │
│   + Auth │ │  + live  │ │              │ │ suggestions)│
└──────────┘ └──────────┘ └──────────────┘ └─────────────┘
```

### 2.3 Structure des dossiers

```
mtg-deckbuilder/
├── app/                              # Next.js App Router
│   ├── (auth)/login/                 # Magic link auth
│   ├── decks/
│   │   ├── page.tsx                  # Liste de tes decks
│   │   ├── new/page.tsx              # Sélection mode A/B/C
│   │   └── [id]/
│   │       ├── builder/page.tsx      # Builder principal
│   │       ├── analysis/page.tsx     # Vue synergie + stats
│   │       ├── suggestions/page.tsx  # Cartes à ajouter/retirer
│   │       └── history/page.tsx      # Historique des versions
│   ├── cards/
│   │   ├── page.tsx                  # Recherche avancée
│   │   └── [id]/page.tsx             # Détail d'une carte
│   ├── profile/page.tsx              # Profil joueur + règles pod
│   ├── knowledge/                    # Base de connaissance MTG
│   │   ├── page.tsx
│   │   └── [topic]/page.tsx
│   └── api/
│       ├── cards/[...path]/route.ts  # Proxy Scryfall
│       ├── archidekt/import/route.ts
│       ├── synergy/score/route.ts
│       ├── suggest/route.ts
│       └── decks/[id]/route.ts
├── components/
│   ├── ui/                           # shadcn primitives
│   ├── deck/
│   │   ├── DeckBuilder.tsx
│   │   ├── DeckList.tsx
│   │   ├── CategoryEditor.tsx        # ⚙️ Catégories custom par deck
│   │   └── ManaCurve.tsx
│   ├── cards/
│   │   ├── CardSearch.tsx
│   │   ├── CardTile.tsx              # Avec hover preview Scryfall image
│   │   └── CardDetailDrawer.tsx
│   ├── synergy/
│   │   ├── SynergyGraph.tsx          # D3 force-directed
│   │   ├── SynergyHeatmap.tsx        # Matrice paire-à-paire
│   │   └── SynergyScoreBadge.tsx
│   └── brand/
│       └── BrandShell.tsx            # Layout cream/terracotta global
├── lib/
│   ├── scryfall/
│   │   ├── client.ts                 # Wrapper Scryfall API
│   │   ├── bulk-sync.ts              # Sync bulk job
│   │   └── types.ts
│   ├── archidekt/
│   │   ├── import.ts
│   │   └── types.ts
│   ├── edhrec/
│   │   └── scraper.ts                # Avec cache 30j
│   ├── synergy/
│   │   ├── engine.ts                 # Le cœur du scoring
│   │   ├── tags.ts                   # Extraction de tags
│   │   ├── patterns.ts               # Patterns de synergie
│   │   └── llm-scorer.ts             # Scoring via Claude API
│   ├── db.ts                         # Supabase client
│   ├── memory.ts                     # Profile / deck memory ops
│   └── types.ts                      # Types globaux
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_synergy_cache.sql
│   │   └── 003_knowledge_base.sql
│   └── seed.sql                      # Profil Francis pré-rempli
├── scripts/
│   ├── sync-scryfall.ts              # Cron daily
│   └── compute-synergy-cache.ts
├── public/
│   └── fonts/                        # Cormorant Infant + Khula self-host
├── tailwind.config.ts                # Palette brand intégrée
└── package.json
```

### 2.4 Configuration Tailwind (brand intégré)

```ts
// tailwind.config.ts (extrait)
theme: {
  extend: {
    colors: {
      cream: '#F5EDDF',
      ink: '#2A2218',
      terracotta: '#C4704A',
      sand: '#E2B56B',
      sky: '#7BAFC4',
    },
    fontFamily: {
      display: ['"Cormorant Infant"', 'serif'],
      body: ['Khula', 'sans-serif'],
    },
  },
}
```

Tous les composants UI shadcn vont être thémés avec ces tokens — chaque bouton, carte, modal respire la palette warm/earthy.

---

## 3. Plan de phases (roadmap)

### Philosophie de la roadmap
**On livre du fonctionnel à chaque phase.** Pas de "grand bang" 3 mois plus tard. Tu peux utiliser l'outil dès la fin de la phase 1, et il s'enrichit progressivement.

### Phase 0 — Setup (2-3 jours)
- Création repo GitHub
- Setup Next.js + TS + Tailwind + shadcn/ui
- Setup Supabase (DB + auth)
- Setup Vercel (deploy auto)
- Application des tokens brand (couleurs, fonts self-hostées)
- **Livrable** : Site déployé en ligne avec login fonctionnel et page d'accueil brandée

### Phase 1 — MVP Recherche & Builder Manuel (1 semaine)
- Sync bulk Scryfall (cron quotidien)
- Recherche de cartes avec filtres (couleurs, type, CMC, mots-clés Oracle)
- Création d'un deck à la main (commander + 99 cartes)
- Catégorisation manuelle des cartes (catégories par défaut)
- Stats de base : courbe de mana, répartition couleurs/types, count par catégorie
- Sauvegarde en DB
- **Livrable** : Tu peux créer un deck from scratch et voir ses stats. Utilisable immédiatement.

### Phase 2 — Import Archidekt & Catégories Custom (1 semaine)
- Import deck Archidekt par URL ou ID
- Mapping automatique des catégories
- Éditeur de catégories custom par deck (ajout/modif/suppr)
- Notes par carte (pourquoi cette carte est dans le deck)
- Filtre de prix 50$ avec alerte
- **Livrable** : Tes 9 decks existants importés et analysés.

### Phase 3 — Moteur de synergie V1 (2 semaines — phase la plus dense)
- Extraction de tags depuis Oracle text (regex + heuristiques)
- Patterns de synergie pré-définis (~80 patterns canoniques MTG)
- Scoring paire-à-paire (algorithme hybride détaillé en §5)
- Score global de deck
- Score commander ↔ chaque carte
- Heatmap visuelle paire-à-paire
- Identification des maillons faibles (cartes au score bas)
- Identification des clusters synergiques (clustering hiérarchique)
- Cache du scoring en DB (synergy_cache)
- **Livrable** : Tu vois enfin la synergie chiffrée de tes decks. Tu identifies les cartes qui "ne servent à rien".

### Phase 4 — Suggestions IA & 3 Modes de Création (1 semaine)
- Mode A : tu donnes le commander → propositions de stratégie + shell de cartes
- Mode B : tu donnes un thème → propositions de commanders triés par richesse de triggers
- Mode C : import deck + analyse complète + propositions de remplacements ciblés
- Algo de suggestions : combine score synergie + EDHrec data + filtres (prix, bans pod, no-tutors)
- Détecteur de combos infinis (alerte si combo 2-cartes détecté)
- **Livrable** : L'outil propose des cartes pertinentes. C'est plus juste un éditeur, c'est un partenaire.

### Phase 5 — Mémoire complète (1 semaine)
- Profil joueur Francis (préférences, pet cards, bans perso, règles pod) — UI éditable
- Mémoire par deck (historique modifs, snapshots, notes de tests, matchups)
- Base de connaissance MTG éditable (rulings, interactions, cas tordus)
- Recherche dans la base de connaissance
- **Livrable** : L'outil se souvient de tout, entre les sessions, indéfiniment.

### Phase 6 — Visualisations avancées & Polish (1 semaine)
- Graphe de synergie D3 (force-directed, nodes = cartes, edges = liens synergiques)
- Vue "cluster" pour voir les noyaux du deck
- Export Moxfield / Archidekt / format texte standard
- Partage de deck par lien (lecture seule)
- Polish UX sur tout
- **Livrable** : Le site est beau et complet.

### Phase 7 (V2 — futur) — fonctionnalités avancées
- Threat assessment vs un meta donné
- Simulation de mulligans / opening hands
- Mode "playtest" simplifié
- Comparaison de deux versions d'un même deck
- Intégration des spoilers en avant-première
- Mode collaboratif (partage avec ton pod)

**Total roadmap MVP → V1 complet : ~7 semaines de travail effectif.**

---

## 4. Mockups conceptuels des écrans

> Note : pas de wireframes graphiques dans ce doc — descriptions détaillées des layouts. Les mockups graphiques viendront en phase 0 si tu veux les valider avant code.

### 4.1 Page d'accueil `/`

```
┌──────────────────────────────────────────────────────────┐
│  cream background (#F5EDDF)                              │
│                                                          │
│       Cormorant Infant, terracotta                       │
│       Le deck builder qui pense comme un joueur pro      │
│                                                          │
│       Khula, ink                                         │
│       Bienvenue, Francis.                                │
│                                                          │
│       ┌──────────────┐  ┌──────────────┐  ┌────────┐    │
│       │ Mes 9 decks  │  │ Nouveau deck │  │ Cartes │    │
│       │ →            │  │ +            │  │ ⌕      │    │
│       └──────────────┘  └──────────────┘  └────────┘    │
│                                                          │
│       Khula, ink                                         │
│       Activité récente                                   │
│       — Dernier deck modifié : Aragorn Allies (il y a 2j)│
│       — Dernière analyse synergie : Coram (il y a 5j)    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Création deck `/decks/new` — 3 modes

```
┌──────────────────────────────────────────────────────────┐
│  Comment veux-tu commencer ?                             │
│  (Cormorant Infant, terracotta, large)                   │
│                                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐│
│  │   J'ai un       │ │  J'ai un thème  │ │ J'ai un deck  ││
│  │   commander     │ │  ou un          │ │ Archidekt à   ││
│  │   en tête       │ │  archétype      │ │ analyser      ││
│  │                 │ │                 │ │               ││
│  │   [Choisir]     │ │   [Explorer]    │ │   [Importer]  ││
│  └─────────────────┘ └─────────────────┘ └───────────────┘│
│      Mode A              Mode B              Mode C       │
└──────────────────────────────────────────────────────────┘
```

Chaque carte = fond crème, bordure terracotta fine, hover → fond sable doré subtil.

### 4.3 Builder principal `/decks/[id]/builder`

Layout 3 colonnes :

```
┌─────────────┬──────────────────────────┬──────────────────┐
│ COL GAUCHE  │   COL CENTRE             │  COL DROITE      │
│ Recherche   │   Liste du deck          │  Stats live      │
│             │   (groupée par catégorie)│                  │
│ [⌕ search]  │                          │  ┌────────────┐  │
│             │   ▼ Commander (1)        │  │ Mana Curve │  │
│ Filtres :   │   • Aragorn the Uniter   │  └────────────┘  │
│ ☐ W ☐ U     │                          │  ┌────────────┐  │
│ ☐ B ☐ R     │   ▼ Ramp (10)            │  │ Couleurs   │  │
│ ☐ G         │   • Sol Ring             │  └────────────┘  │
│             │   • Arcane Signet        │  ┌────────────┐  │
│ CMC 0-7     │   • ...                  │  │ Synergie   │  │
│ ─────       │                          │  │ Globale 78%│  │
│ Type        │   ▼ Card Draw (8)        │  └────────────┘  │
│ ☐ Creature  │   ...                    │                  │
│ ☐ Instant   │                          │  ⚙ Catégories   │
│             │   ▶ Removal (6)          │  + Ajouter      │
│ Résultats : │   ▶ Win Cons (5)         │                  │
│ [card tile] │                          │  Prix total :   │
│ [card tile] │   [+ Ajouter une carte]  │  342$           │
│             │                          │                  │
└─────────────┴──────────────────────────┴──────────────────┘
```

- Chaque carte de la liste : nom (Khula), CMC, prix si > 50$ alerte sable doré, score synergie en badge.
- Drag & drop pour réordonner / changer de catégorie.
- Hover sur une carte → preview de l'image Scryfall en overlay.

### 4.4 Vue analyse `/decks/[id]/analysis`

```
┌──────────────────────────────────────────────────────────┐
│  Analyse — Aragorn Allies                                │
│  (Cormorant Infant, terracotta)                          │
│                                                          │
│  ╔════════════════════════════════════════════════════╗  │
│  ║   Score synergie global : 78 / 100                 ║  │
│  ║   ████████████████████░░░░░  (Khula, ink)          ║  │
│  ╚════════════════════════════════════════════════════╝  │
│                                                          │
│  Heatmap synergie paire-à-paire                          │
│  ┌──────────────────────────────────────┐                │
│  │  [Matrice 99x99 colorée terracotta]  │                │
│  │   Hover = nom des 2 cartes + score   │                │
│  └──────────────────────────────────────┘                │
│                                                          │
│  ▼ Maillons faibles (3)                                  │
│   • Card X — score 12/100 — "peu d'interactions avec     │
│     ton commander, considère retirer"                    │
│   • ...                                                  │
│                                                          │
│  ▼ Noyaux synergiques (4 clusters identifiés)            │
│   • Cluster "Allies tribal" (12 cartes)                  │
│   • Cluster "Combat triggers" (8 cartes)                 │
│   • ...                                                  │
│                                                          │
│  ▼ Score commander ↔ deck                                │
│   • 84% des cartes ont un lien direct avec Aragorn       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.5 Profil joueur `/profile`

Édition libre de :
- Pet cards (auto-suggestion dans tous les decks compatibles)
- Bans personnels (jamais suggérées)
- Règles pod (no tutors, plafond 50$, no MLD si tu veux ajouter)
- Préférences de stratégies favorites
- Notes libres

---

## 5. Moteur de scoring synergique

### Principe général
La synergie est **le cœur** de l'outil. Elle ne peut pas être qu'un score de co-inclusion EDHrec — sinon on retombe dans "les gens incluent ces cartes ensemble". On veut **comprendre pourquoi** deux cartes vont bien ensemble.

### Architecture du scoring : 4 sources combinées

```
synergy(A, B) = w1·tag_overlap(A,B)
              + w2·pattern_match(A,B)
              + w3·edhrec_cooccurrence(A,B)
              + w4·llm_evaluation(A,B)
```

Avec poids par défaut : `w1=0.25`, `w2=0.30`, `w3=0.15`, `w4=0.30`. Configurable.

### Source 1 — Tag overlap (rapide, déterministe)

Chaque carte se voit attribuer des **tags** extraits automatiquement de son texte Oracle.

Exemples de tags :
- `produces:treasure`, `produces:token-creature`, `produces:+1+1-counter`
- `triggers-on:etb`, `triggers-on:combat-damage`, `triggers-on:cast-spell`
- `cares-about:artifacts`, `cares-about:tokens`, `cares-about:graveyard`
- `payoff:counters`, `payoff:tokens`, `payoff:lifegain`
- `enabler:sacrifice`, `enabler:blink`, `enabler:reanimate`
- `mechanic:flicker`, `mechanic:scry`, `mechanic:cascade`

Score de tag overlap = Jaccard pondéré :
```
tag_overlap(A,B) = Σ weight(t) pour t ∈ tags(A) ∩ tags(B)
                 / Σ weight(t) pour t ∈ tags(A) ∪ tags(B)
```

Les tags `produces:X` ↔ `cares-about:X` ou `payoff:X` ont un poids x3 (vraie synergie producteur ↔ payoff).

### Source 2 — Pattern matching (le vrai cerveau MTG)

Une bibliothèque de **patterns canoniques** :

```ts
type SynergyPattern = {
  name: string;
  match: (a: Card, b: Card) => boolean;
  score: number; // 0-100
  explanation: string;
}

// Exemples :
{
  name: "Producer × Payoff (treasure)",
  match: (a, b) => hasTag(a, "produces:treasure") && hasTag(b, "cares-about:treasure"),
  score: 85,
  explanation: "A produit des treasures, B en bénéficie"
}

{
  name: "Sac outlet × Death trigger",
  match: (a, b) => hasTag(a, "enabler:sacrifice") && hasTag(b, "triggers-on:dies"),
  score: 90,
  explanation: "A peut sacrifier B (ou autre) pour déclencher des effets de mort"
}

{
  name: "Untapper × Tap-ability",
  match: (a, b) => hasTag(a, "untaps:permanent") && hasTag(b, "tap-ability"),
  score: 75,
  explanation: "A permet de réutiliser les abilités de tap de B"
}
```

Cible : ~100-150 patterns à la sortie de la phase 3. Extensibles via une UI dédiée plus tard.

### Source 3 — EDHrec co-occurrence

EDHrec donne pour chaque carte ses "high synergy cards" (cartes qui apparaissent **disproportionnellement** dans les decks contenant la carte cible). C'est un signal de la communauté.

On cache ces données en DB pour 30 jours. Score normalisé 0-100.

⚠️ **Pondération volontairement basse (15%)** parce que EDHrec est biaisé vers les cartes populaires/staples — ce qui va à l'encontre de ton principe "les game changers ne font pas la force du deck".

### Source 4 — Évaluation LLM (Gemini Flash 2.0, gratuit)

Pour les paires non-évidentes ou les patterns qu'on n'a pas codés, on demande à Gemini.

**Prompt template** :

```
Tu es un expert MTG Commander. Évalue la synergie entre ces 2 cartes
dans le contexte du deck (commander + stratégie).

Commander : {commander.name} — {commander.oracle_text}
Stratégie du deck : {deck.strategy_summary}

Carte A : {a.name}
{a.oracle_text}

Carte B : {b.name}
{b.oracle_text}

Réponds en JSON strict :
{
  "score": 0-100,
  "reason": "courte explication française",
  "interaction_type": "producer-payoff|enabler-trigger|protection|redundancy|none|..."
}
```

⚠️ Un deck de 100 cartes a 4 950 paires. On ne LLM-score PAS toutes les paires. On LLM-score :
- Les paires impliquant le commander (99 paires)
- Les paires avec score tag/pattern flou (entre 30 et 70) — typiquement ~200-400 paires
- À la demande dans l'UI (clic sur une paire pour l'analyser)

**Volume estimé par deck** : ~150k tokens — soit 15% du free tier journalier Gemini. Mis en cache à vie tant que la carte ne change pas. **Coût : 0$.**

### Score global du deck

```
deck_score = 0.4 × moyenne(score_commander_↔_chaque_carte)
           + 0.4 × moyenne(scores_paires_top_25%)
           + 0.2 × cluster_cohesion_score
```

Le top 25% des paires capture les "vrais liens" sans diluer dans le bruit. Cluster cohesion mesure si le deck a des noyaux clairs ou s'il est éparpillé.

### Identification des maillons faibles

Carte = maillon faible si :
- Score moyen avec les 99 autres < 25
- Score avec le commander < 30
- N'apparaît dans aucun cluster synergique

→ Affichées en haut de la liste de suggestions de retraits.

### Identification des clusters synergiques

Clustering hiérarchique sur la matrice de synergie (algo : Louvain ou hiérarchique agglomératif). Chaque cluster reçoit un nom auto-généré via Claude (ex: "Engine sacrifice/recursion", "Token swarm payoffs").

---

## 6. Intégrations externes

### 6.1 Scryfall

- **Bulk data** : `https://api.scryfall.com/bulk-data` — endpoint `oracle-cards` (~250 MB JSON, ~30k cartes uniques).
- **Sync** : cron Vercel quotidien à 3h du matin. Stocke dans table `cards` Supabase.
- **Live API** : pour autocomplete de recherche, on appelle `/cards/autocomplete?q=...` en direct (rate limit 10 req/sec, on est large).
- **Image** : on ne stocke PAS les images. On utilise les URLs CDN Scryfall (rapide, pas de coût stockage).

### 6.2 Archidekt

- **Endpoint public** : `https://archidekt.com/api/decks/{deck_id}/`
- **Format** : JSON avec liste des cartes (par UUID Scryfall ou nom).
- **Mapping** : on matche par `scryfall_id` quand dispo, sinon par `name` exact.
- **Limite** : pas d'auth nécessaire pour les decks publics. Pour decks privés → tu copies-colles l'export texte.

### 6.3 EDHrec

⚠️ Pas d'API officielle. Deux options :

1. **Scraping ciblé** des pages cartes (`/cards/{slug}`) avec extraction des "high synergy" + cache 30j. Respect des robots.txt et delay entre requêtes.
2. **API communautaire** non-officielle (existe, mais non garantie). À tester en phase 3.

Cache agressif (30 jours) pour minimiser les requêtes.

### 6.4 Gemini API (Google)

- **Modèle** : `gemini-2.0-flash` pour scoring synergique et génération de tags. Free tier : 1M tokens/jour, 15 req/min, 1500 req/jour.
- **Authentification** : clé API Google AI Studio (gratuite, création en 2 minutes).
- **Architecture LLM-agnostic** : wrapper interne qui permet de switcher Gemini → Claude → autre en changeant un seul fichier (`lib/synergy/llm-scorer.ts`).
- **Coût** : 0$ tant qu'on reste sous le free tier (largement le cas pour usage perso).

---

## 7. Structure de données et mémoire

### 7.1 Schéma Postgres (Supabase)

```sql
-- Cartes (sync Scryfall)
CREATE TABLE cards (
  scryfall_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  oracle_text TEXT,
  type_line TEXT,
  cmc REAL,
  colors TEXT[],
  color_identity TEXT[],
  power TEXT, toughness TEXT,
  keywords TEXT[],
  legalities JSONB,
  prices JSONB,           -- {usd, usd_foil, eur}
  image_uris JSONB,
  set_code TEXT,
  released_at DATE,
  -- enrichissements internes
  tags TEXT[],            -- générés par notre extracteur
  edhrec_data JSONB,      -- cache scrap EDHrec
  edhrec_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON cards USING GIN (tags);
CREATE INDEX ON cards USING GIN (color_identity);
CREATE INDEX ON cards (name);

-- Profil utilisateur (Francis)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  display_name TEXT,
  pet_cards UUID[],          -- scryfall_ids
  banned_cards UUID[],       -- scryfall_ids
  pod_rules JSONB,           -- {no_tutors: true, max_card_price: 50, no_infinite_combos: true, ...}
  preferences JSONB,         -- {favorite_archetypes: [], ...}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decks
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  commander_id UUID REFERENCES cards(scryfall_id),
  partner_commander_id UUID REFERENCES cards(scryfall_id), -- nullable
  strategy_summary TEXT,
  bracket_target SMALLINT,           -- 1 à 5
  custom_categories JSONB,           -- [{name: "Triggers", color: "..."}, ...]
  archidekt_id TEXT,                 -- si importé
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cartes dans un deck (relation N-N enrichie)
CREATE TABLE deck_cards (
  deck_id UUID REFERENCES decks ON DELETE CASCADE,
  card_id UUID REFERENCES cards(scryfall_id),
  qty SMALLINT DEFAULT 1,
  categories TEXT[],         -- overlaps permis : ["Ramp", "Removal"]
  notes TEXT,                -- pourquoi cette carte
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (deck_id, card_id)
);

-- Versions / snapshots
CREATE TABLE deck_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks ON DELETE CASCADE,
  snapshot JSONB NOT NULL,   -- état complet à l'instant T
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historique des actions
CREATE TABLE deck_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks ON DELETE CASCADE,
  action TEXT,               -- 'add' | 'remove' | 'recategorize' | 'note_update'
  card_id UUID,
  details JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache scoring synergique
CREATE TABLE synergy_cache (
  card_a_id UUID,
  card_b_id UUID,
  context_hash TEXT,         -- hash du commander+stratégie pour invalidation
  score SMALLINT,            -- 0-100
  factors JSONB,             -- détail par source (tag/pattern/edhrec/llm)
  explanation TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (card_a_id, card_b_id, context_hash)
);

-- Base de connaissance MTG
CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  related_cards UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON knowledge_entries USING GIN (tags);
```

### 7.2 Stratégies de cache

| Donnée | Source | TTL | Stockage |
|---|---|---|---|
| Cartes Scryfall | Bulk Scryfall | 24h | Supabase `cards` |
| Images | Scryfall CDN | ∞ | URLs uniquement (pas de copie) |
| EDHrec data | Scrap | 30j | Supabase `cards.edhrec_data` |
| Synergy scores | Calcul | ∞ (invalidé si carte mise à jour) | Supabase `synergy_cache` |
| LLM evaluations | Claude API | ∞ (idem) | Supabase `synergy_cache.factors.llm` |

---

## 8. Stratégie de déploiement et coûts

### 8.1 Infrastructure et plans gratuits

| Service | Plan | Limite | Coût |
|---|---|---|---|
| Vercel | Hobby | 100 GB bandwidth/mois | Gratuit |
| Supabase | Free | 500 MB DB, 50k MAU, 2 GB bandwidth | Gratuit |
| Scryfall | API publique | 10 req/sec | Gratuit |
| Domaine custom (optionnel) | ex: Namecheap | — | ~12$/an |

### 8.2 Coûts variables (LLM scoring)

| Usage | Volume estimé | Coût/mois |
|---|---|---|
| Scoring synergie nouveaux decks (Gemini Flash free) | ~150k tokens/deck × 5 decks | 0$ |
| Re-scoring incrémental modifs | ~50k tokens/jour | 0$ |
| Suggestions IA & analyses | ~30k tokens/jour | 0$ |
| **Total** | | **0$/mois** |

Free tier Gemini = 1M tokens/jour. Notre usage estimé = 200-300k tokens/jour max. **On reste à 30% du quota.**

Si plan tier dépassé un jour : bascule en Option A (zéro LLM, tags + patterns + EDHrec uniquement) en quelques heures, ou migration Claude API en 1h.

### 8.3 Scaling

Largement dimensionné pour usage perso. Si plus tard tu veux ouvrir à ton pod ou à plus large :
- Supabase Pro à 25$/mois si on dépasse 500 MB DB
- Vercel Pro si trafic explose

---

## 9. Risques identifiés et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Scryfall change son API/bulk format | Faible | Élevé | Adapter régulièrement, tests automatisés sur le format |
| EDHrec bloque le scraping | Moyenne | Moyen | Cache 30j atténue. Plan B : utiliser uniquement nos sources internes |
| Free tier Gemini réduit ou supprimé | Faible | Moyen | Architecture LLM-agnostic. Fallback vers Option A (zéro LLM, tags + patterns) ou migration Claude/autre en quelques heures |
| Qualité du scoring déçoit | Moyenne | Élevé | Phase 3 commence par un échantillon de 5 decks tests, on calibre les poids et patterns avant scale |
| Archidekt change son API | Faible | Moyen | Fallback : import par texte standard MTG |
| Tu trouves le résultat moins bon que Moxfield | — | Critique | Itération continue. La phase 3 (synergie) est le différenciateur — si elle ne convainc pas, on revoit |
| Bug de règles MTG (interactions exotiques) | Élevée | Faible | Base de connaissance enrichie au fil du temps, on gère au cas par cas |

---

## 10. Décisions à valider avant code

Avant de lancer la phase 0, j'ai besoin de tes réponses sur ces points :

### 10.1 Décisions techniques
- [ ] **Domaine custom** : tu en veux un (ex: `francis-mtg.com`, `gouletmtg.com`, `goulcommander.com`) ? Ou Vercel par défaut (`xxx.vercel.app`) suffit ?
- [ ] **GitHub** : tu as un compte GitHub ? Le repo sera privé ou public ?
- [ ] **Clé Google AI Studio (Gemini)** : il faut créer un compte gratuit sur https://aistudio.google.com/ pour obtenir une clé API. Création en 2 minutes avec un compte Google. Tu as déjà un compte Google utilisable ?

### 10.2 Décisions produit
- [ ] **Multi-utilisateurs ?** : pour l'instant, juste toi. Mais à terme, partage de decks avec ton pod ?
- [ ] **Niveau de détail des règles MTG** : on commence avec un sous-ensemble (priority, stack, layers) ou on essaie de couvrir TOUT (replacement effects, rule 616, etc.) dès la phase 5 ?
- [ ] **Mode hors-ligne** : nice-to-have ou pas important ? (Tu as toujours internet selon tes specs.)

### 10.3 Décisions de scope MVP
- [ ] **Phase 1 doit-elle inclure l'import Archidekt ?** Si oui → on fusionne phase 1 et 2. Sinon, MVP plus rapide mais moins utile pour toi tout de suite.
- [ ] **Phase 3 : tu veux qu'on commence par 5 decks tests** (parmi tes 9 actuels) pour calibrer le moteur de synergie ? Lesquels ? (Idéalement variés en couleurs et stratégies.)

### 10.4 Calibration du scoring
- [ ] **Pondérations par défaut** des 4 sources (tag/pattern/edhrec/llm) — OK avec `0.25/0.30/0.15/0.30` ou tu veux ajuster ?
- [ ] **Seuil "maillon faible"** : score < 25 — OK ou trop strict/lâche ?

---

## Prochaines étapes proposées

1. **Tu lis ce doc** et tu réponds aux questions de la section 10.
2. Je révise le doc avec tes réponses → **version finale validée**.
3. **Phase 0** : on lance le setup (repo + Vercel + Supabase + brand). Tu vois un site live brandé en 2-3 jours.
4. **Phase 1** : on construit le MVP. Tu peux créer ton premier deck dans la semaine suivante.
5. On itère phase par phase, avec validation à chaque livrable.

---

*Document maintenu dans `/Users/gougou/Desktop/Agent-yoga/mtg_commander/ARCHITECTURE.md`. Toute évolution majeure du projet fait l'objet d'une révision de ce document.*
