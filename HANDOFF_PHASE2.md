# 🎯 Phase 2 (partielle) — pendant que tu te préparais

> Ce qui a avancé pendant que tu te lavais. Aucune action requise pour activer.

## ✅ Ce qui marche maintenant

### Mode C — Import Archidekt (le plus utile pour toi)
- Va sur **`/decks/new`** → clique **"J'importe un deck Archidekt"**
- Colle l'URL d'un de tes 9 decks (ex: `https://archidekt.com/decks/12345`)
- Le système :
  - Récupère la liste depuis l'API Archidekt
  - Identifie automatiquement le commander
  - Mappe chaque carte à ta DB Scryfall (par `scryfall_id` puis fallback par nom)
  - Crée le deck + les `deck_cards` avec les catégories d'origine
- Tu es redirigé vers le deck builder. Si certaines cartes n'ont pas pu être résolues, on te les liste.

### Mode A — Création par commander
- `/decks/new/commander`
- Recherche dans tes 28k cartes (filtré sur "Legendary Creature")
- Tu choisis, tu nommes le deck, tu décris la stratégie en quelques mots, tu choisis un bracket
- Création → redirect vers builder

### Vue deck (`/decks/[id]/builder`)
- Header avec nom + résumé stratégie + bracket + count `X/100` + prix total USD
- ⚠ Alerte si une ou plusieurs cartes au-dessus de 50$
- Commander affiché en premier
- Cartes groupées par catégorie (Ramp, Card Draw, etc.)
- Sidebar stats :
  - Courbe de mana (CMC 0 à 7+)
  - Identité couleur (count par couleur W/U/B/R/G/C)
- Prix par carte signalé si > 50$ (badge "50$+" sur la tile)

## 🚀 Ce que tu peux tester

Sur **localhost:3000** ou **gouletmtg.vercel.app** (Vercel a redéployé automatiquement) :

1. **Importe un de tes decks** : `/decks/new` → Mode C → colle une URL Archidekt
2. **Vérifie l'aperçu** : tu devrais voir le commander + cartes groupées + stats
3. **Ou crée un nouveau deck** : `/decks/new/commander` → cherche ton commander préféré

Si l'import échoue ou que des cartes manquent, dis-moi le nombre exact + les noms — on debug.

## ⏳ Pas encore fait (prochaines sessions)

- **Mode B** (thème → propositions de commanders) — toujours un stub
- **Édition** du deck dans le builder (ajouter/retirer des cartes, drag & drop, recategorize)
- **Catégories custom** par deck (ajouter "Triggers", "Sac outlets", etc.)
- **Notes** par carte (pourquoi cette carte est là)
- **Versions / snapshots**
- Le **moteur de synergie** (Phase 3) — la vraie pièce maîtresse

## 🐛 Limites connues

- Le builder est en **lecture seule** pour l'instant. Tu vois ton deck importé mais tu ne peux pas modifier depuis l'UI (faudrait passer par Archidekt et réimporter, ou ajouter via Supabase direct).
- L'**API Archidekt** : on parse défensivement, mais si Archidekt change son schéma JSON, l'import peut casser. Si ça arrive, copie-colle l'erreur.
- **Match par nom** : si une carte n'a pas de `scryfall_id` dans la réponse Archidekt et que le nom diffère légèrement (ex: cartes split, double-faced), elle peut ne pas être résolue.

---

*Bonne journée Francis. Quand tu reviendras, on attaque l'édition du builder ou le moteur de synergie selon ce qui te tente.*
