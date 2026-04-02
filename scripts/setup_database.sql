-- ============================================================
-- WBSA Classification — Supabase Database Setup
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create the players table
CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    player_number INTEGER UNIQUE NOT NULL,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    birth_date DATE,
    birth_country TEXT,
    legal_nationality TEXT,
    card_issue_date DATE,
    classification TEXT,
    zone TEXT,
    gender TEXT,
    disability TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_classification ON players(classification);
CREATE INDEX IF NOT EXISTS idx_players_zone ON players(zone);
CREATE INDEX IF NOT EXISTS idx_players_gender ON players(gender);
CREATE INDEX IF NOT EXISTS idx_players_is_active ON players(is_active);
CREATE INDEX IF NOT EXISTS idx_players_last_name ON players(last_name);

-- 3. Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies — only authenticated users can access
CREATE POLICY "Authenticated users can read players"
    ON players FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert players"
    ON players FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update players"
    ON players FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete players"
    ON players FOR DELETE
    TO authenticated
    USING (true);

-- 5. Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Verify setup
SELECT 'Setup complete! Table "players" created with RLS enabled.' AS status;
