-- gouletmtg — schéma initial
-- Référence : ARCHITECTURE.md §7.1

-- Extensions (doivent être créées AVANT les index qui les utilisent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Reset propre si exécution partielle précédente
DROP TABLE IF EXISTS knowledge_entries CASCADE;
DROP TABLE IF EXISTS synergy_cache CASCADE;
DROP TABLE IF EXISTS deck_history CASCADE;
DROP TABLE IF EXISTS deck_versions CASCADE;
DROP TABLE IF EXISTS deck_cards CASCADE;
DROP TABLE IF EXISTS decks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- 1. Cartes (sync Scryfall)
CREATE TABLE cards (
  scryfall_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  oracle_text TEXT,
  type_line TEXT,
  cmc REAL,
  colors TEXT[],
  color_identity TEXT[],
  power TEXT,
  toughness TEXT,
  keywords TEXT[],
  legalities JSONB,
  prices JSONB,
  image_uris JSONB,
  set_code TEXT,
  released_at DATE,
  tags TEXT[],
  edhrec_data JSONB,
  edhrec_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX cards_tags_idx ON cards USING GIN (tags);
CREATE INDEX cards_color_identity_idx ON cards USING GIN (color_identity);
CREATE INDEX cards_name_idx ON cards (name);
CREATE INDEX cards_name_trgm_idx ON cards USING GIN (name gin_trgm_ops);

-- 2. Profil utilisateur
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  pet_cards UUID[] DEFAULT '{}',
  banned_cards UUID[] DEFAULT '{}',
  pod_rules JSONB DEFAULT '{
    "noTutors": true,
    "noInfiniteCombos": true,
    "maxCardPriceUsd": 50
  }'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Decks
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  commander_id UUID REFERENCES cards(scryfall_id),
  partner_commander_id UUID REFERENCES cards(scryfall_id),
  strategy_summary TEXT,
  bracket_target SMALLINT CHECK (bracket_target BETWEEN 1 AND 5),
  custom_categories JSONB DEFAULT '[]'::jsonb,
  archidekt_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX decks_user_id_idx ON decks (user_id);

-- 4. Cartes dans un deck
CREATE TABLE deck_cards (
  deck_id UUID REFERENCES decks ON DELETE CASCADE,
  card_id UUID REFERENCES cards(scryfall_id),
  qty SMALLINT DEFAULT 1 CHECK (qty > 0),
  categories TEXT[] DEFAULT '{}',
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (deck_id, card_id)
);

-- 5. Versions (snapshots)
CREATE TABLE deck_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX deck_versions_deck_id_idx ON deck_versions (deck_id);

-- 6. Historique
CREATE TABLE deck_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks ON DELETE CASCADE,
  action TEXT NOT NULL,
  card_id UUID,
  details JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX deck_history_deck_id_idx ON deck_history (deck_id);

-- 7. Cache scoring synergique
CREATE TABLE synergy_cache (
  card_a_id UUID,
  card_b_id UUID,
  context_hash TEXT NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  factors JSONB,
  explanation TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (card_a_id, card_b_id, context_hash)
);

-- 8. Base de connaissance MTG
CREATE TABLE knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  related_cards UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX knowledge_tags_idx ON knowledge_entries USING GIN (tags);

-- Trigger : auto-update du champ updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER decks_updated_at BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER knowledge_updated_at BEFORE UPDATE ON knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS (Row-Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
-- cards et synergy_cache restent publics en lecture (pas de données user)

CREATE POLICY "users see own profile" ON profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users see own decks" ON decks
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users see own deck cards" ON deck_cards
  FOR ALL USING (deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid()));

CREATE POLICY "users see own deck versions" ON deck_versions
  FOR ALL USING (deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid()));

CREATE POLICY "users see own deck history" ON deck_history
  FOR ALL USING (deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid()));

CREATE POLICY "users see own knowledge" ON knowledge_entries
  FOR ALL USING (user_id = auth.uid());
