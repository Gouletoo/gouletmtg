-- Ajout d'une colonne pour les tags de stratégie extraits par LLM.
-- Ces tags enrichissent le profil du commander pour le scoring de synergie.
-- Format : ["produces:treasure", "cares-about:creatures", "tribal:elf", ...]

ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS strategy_tags JSONB DEFAULT '[]'::jsonb;
