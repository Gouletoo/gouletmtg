# 🎯 Phase 1 — Récap & Activation

> Tu reviens, tout le code est prêt. Voici ce que tu dois faire pour activer.

## ✅ Ce qui a été ajouté

### Code livré

- **Sync Scryfall** (`scripts/sync-scryfall.ts`) — télécharge les ~30k cartes legal en commander dans ta DB.
- **Auth Supabase magic link** :
  - `/login` (formulaire email)
  - `/auth/callback` (handle du token)
  - `/auth/signout`
  - `proxy.ts` (refresh session côté serveur — Next.js 16 utilise `proxy` au lieu de `middleware`)
- **API recherche cartes** (`/api/cards/search`) avec filtres : nom, oracle text, couleurs, CMC, types, pagination.
- **Page recherche** (`/cards`) — sidebar de filtres + grid de cartes + preview hover.
- **Pages decks** :
  - `/decks` (liste, vide pour l'instant)
  - `/decks/new` (3 modes A/B/C — stubs « En construction » pour les pages cibles)
- **Page profil** (`/profile`) — édition des règles du pod (no tutors, max price, etc.).
- **Header partagé** (`SiteHeader`) avec navigation et bouton login/déconnexion.

### Sécurité
- RLS Supabase active sur les tables user-data — chaque utilisateur ne voit que ses decks/profil.
- Service role key (sync) n'est utilisée que côté serveur, jamais exposée au navigateur.

## 🚀 Ce que tu dois faire maintenant

### 1. Synchroniser Scryfall (~5 min, une fois)

Dans **Terminal 2** (pas celui de `npm run dev`) :

```bash
cd ~/Desktop/gouletmtg
npx tsx --env-file=.env.local scripts/sync-scryfall.ts
```

Tu vas voir :
```
[bulk] oracle_cards → 250.X MB, updated 2026-XX-XX
[bulk] downloading…
[bulk] 30000 cartes téléchargées
[filter] 28000 cartes legal en commander
[upsert] 2000/28000
[upsert] 4000/28000
…
[done] 28000 cartes synchronisées en XXs
```

**Si ça plante** : copie-colle l'erreur et on debug.

### 2. Configurer le Site URL dans Supabase (~2 min)

Pour que le magic link fonctionne en prod :

1. Va sur https://supabase.com/dashboard → ton projet `gouletmtg`
2. **Authentication → URL Configuration**
3. **Site URL** : `https://gouletmtg.vercel.app`
4. **Redirect URLs** (ajoute les deux) :
   - `https://gouletmtg.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Sauvegarde.

### 3. Tester en local

Le `npm run dev` devrait déjà tourner. Si ce n'est pas le cas :
```bash
cd ~/Desktop/gouletmtg
npm run dev
```

- Va sur http://localhost:3000/cards → tu devrais voir des cartes 🎉
- Va sur http://localhost:3000/login → entre ton email → tu reçois un lien magique → clique → tu arrives sur `/decks`
- Va sur http://localhost:3000/profile → tu peux éditer tes règles de pod

### 4. Vérifier en prod

Le site Vercel se redéploie automatiquement après chaque push. Va sur https://gouletmtg.vercel.app/cards quelques minutes après le push.

## ⚠️ Points d'attention / décisions techniques prises

- **Filtre commander** : seules les cartes avec `legalities.commander === 'legal'` sont synchronisées. Les cartes bannies sont exclues. ~28k cartes.
- **Pas d'images stockées** : on utilise les URLs CDN Scryfall directement. DB plus petite, performance équivalente.
- **Recherche oracle text** : utilise `ILIKE %texte%` (Postgres). Pour de la recherche full-text plus avancée, on ajoutera un index `tsvector` plus tard.
- **Sync = upsert** : tu peux relancer le script autant de fois que tu veux, il met à jour les cartes existantes et ajoute les nouvelles. Idéal pour récupérer les nouveaux sets.
- **Stubs Mode A/B/C** : les pages `/decks/new/{commander,theme,import}` existent mais sont des « En construction ». À implémenter en Phase 2.

## 🔮 Prochaine session (Phase 2)

- Implémenter le Mode C (import Archidekt) en premier — pour pouvoir importer tes 9 decks existants.
- Implémenter le Mode A (créer deck à partir d'un commander).
- Builder de deck visuel (3 colonnes : recherche / liste / stats).
- Catégories custom par deck.
- Stats : courbe de mana, répartition couleurs/types, count par catégorie, prix total avec alerte 50$.
- Versions / snapshots.

Le moteur de synergie (Phase 3) viendra après — c'est le gros morceau.

---

*Bonne reprise Francis.*
