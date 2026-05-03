# 🚀 Handoff Phase 0 — État du projet

> Pour Francis. Ouvre ça quand tu reviens.

## ✅ Ce qui est fait

Le projet **gouletmtg** est créé et fonctionnel localement.

- ✅ Next.js 16 + TypeScript + Tailwind v4 + App Router
- ✅ Brand visual appliqué (couleurs crème/terracotta/ink/sable/ciel + Cormorant Infant + Khula)
- ✅ Page d'accueil brandée (hero + 3 features + footer)
- ✅ Structure de base : `lib/`, `components/`, `supabase/migrations/`, `scripts/`, `docs/`
- ✅ Clients : Supabase (browser + server), Scryfall, LLM scorer (Gemini)
- ✅ Build passe (`npm run build` ✓)
- ✅ Premier commit git en place
- ✅ GitHub CLI (`gh`) installé

**Dépôt** : `/Users/gougou/Desktop/gouletmtg/` — pas encore poussé sur GitHub (besoin de toi).

## 🎯 Ce que tu dois faire (~15 min total)

### 1️⃣ Tester le site en local (2 min)

```bash
cd ~/Desktop/gouletmtg
npm run dev
```

Ouvre http://localhost:3000 dans ton navigateur. Tu devrais voir la landing page brandée. Confirme-moi visuellement que ça te plaît avant qu'on aille plus loin.

### 2️⃣ Authentifier GitHub CLI (3 min)

```bash
gh auth login
```

- Choisis : `GitHub.com` → `HTTPS` → `Yes (auth git ops)` → `Login with a web browser`
- Copie le code, ça ouvre ton navigateur, tu autorises.

### 3️⃣ Créer le repo GitHub et pousser (1 min)

```bash
cd ~/Desktop/gouletmtg
gh repo create gouletmtg --public --source=. --remote=origin --push
```

Le repo sera à `https://github.com/<ton-handle>/gouletmtg`.

### 4️⃣ Créer le projet Supabase (5 min)

1. Va sur https://supabase.com/dashboard
2. **New project** → nom : `gouletmtg` → région : `East US (North Virginia)` (proche du Québec) → mot de passe DB : génère un fort, sauvegarde-le dans 1Password/etc
3. Attends ~2 min que la DB soit prête
4. Va dans **Project Settings → API** et note les 3 valeurs :
   - `Project URL` (commence par `https://xxx.supabase.co`)
   - `anon public` key (longue chaîne)
   - `service_role` key (longue chaîne — ⚠️ ULTRA SECRET, ne jamais committer)

### 5️⃣ Créer ton fichier `.env.local` (2 min)

```bash
cd ~/Desktop/gouletmtg
cp .env.example .env.local
```

Ouvre `.env.local` dans ton éditeur et remplis :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
```

> 🔒 `.env.local` est dans `.gitignore` — il ne sera **jamais** poussé sur GitHub. Tu peux y mettre tes secrets sans risque.

### 6️⃣ Déployer sur Vercel (3 min)

1. Va sur https://vercel.com/new
2. **Import Git Repository** → choisis `gouletmtg`
3. **Framework Preset** : Next.js (auto-détecté)
4. **Environment Variables** : ajoute les 4 mêmes que dans `.env.local`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
5. **Deploy**

Au bout de ~1 min, ton site est en ligne sur `https://gouletmtg.vercel.app` (ou similaire).

## 📋 Quand tu reviens dans Claude

Dis-moi simplement :
- ✅ "Repo poussé sur GitHub"
- ✅ "Supabase créé et clés copiées"
- ✅ "Vercel déployé, le site est live"

Et on enchaîne sur **Phase 1 — MVP recherche & builder + import Archidekt** (~3-5h de travail combiné, étalable).

## 🔗 Ressources

- **Architecture du projet** : `/Users/gougou/Desktop/Agent-yoga/mtg_commander/ARCHITECTURE.md`
- **Mémoire du projet** (préférences, règles, decks de test) : `/Users/gougou/.claude/projects/-Users-gougou-Desktop-Agent-yoga/memory/project_mtg_commander.md`

## ⚠️ Si tu coinces

- **`gh auth login` qui plante** : essaie `gh auth login --web` (force le mode navigateur)
- **`npm run dev` qui crashe** : `rm -rf .next node_modules && npm install && npm run dev`
- **Build qui échoue après edit** : envoie-moi le log d'erreur, on debug ensemble
- **N'importe quoi qui te frustre** : laisse tomber et reviens me voir, on regarde à deux

---

*Bon retour Francis. Tout est prêt pour que tu cliques 4 boutons et qu'on ait le site live.*
