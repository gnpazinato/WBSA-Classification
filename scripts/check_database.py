"""
Run SQL setup against Supabase via the REST API.
Uses the service_role or anon key to execute SQL through the Supabase SQL endpoint.
"""
import requests
import json

SUPABASE_URL = "https://haqsvbmnitxutlzgckld.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcXN2Ym1uaXR4dXRsemdja2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzMxNTIsImV4cCI6MjA5MDcwOTE1Mn0.z19LBiiZ7NJaakhc0EwkOEgBAaonVzve43_oHwiAiVU"

# SQL statements to execute (one at a time via RPC)
SQL_STATEMENTS = [
    # Create players table
    """
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
    """,
    # Indexes
    "CREATE INDEX IF NOT EXISTS idx_players_classification ON players(classification);",
    "CREATE INDEX IF NOT EXISTS idx_players_zone ON players(zone);",
    "CREATE INDEX IF NOT EXISTS idx_players_gender ON players(gender);",
    "CREATE INDEX IF NOT EXISTS idx_players_is_active ON players(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_players_last_name ON players(last_name);",
    # RLS
    "ALTER TABLE players ENABLE ROW LEVEL SECURITY;",
    # Policies
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read players') THEN
            CREATE POLICY "Authenticated users can read players" ON players FOR SELECT TO authenticated USING (true);
        END IF;
    END $$;
    """,
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert players') THEN
            CREATE POLICY "Authenticated users can insert players" ON players FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
    END $$;
    """,
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update players') THEN
            CREATE POLICY "Authenticated users can update players" ON players FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
    END $$;
    """,
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete players') THEN
            CREATE POLICY "Authenticated users can delete players" ON players FOR DELETE TO authenticated USING (true);
        END IF;
    END $$;
    """,
    # updated_at trigger
    """
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """,
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_players_updated_at') THEN
            CREATE TRIGGER update_players_updated_at
                BEFORE UPDATE ON players
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END $$;
    """,
]

def run_sql_via_rpc():
    """Try to run SQL via Supabase RPC or direct postgres connection."""
    # Method: Use the Supabase REST API to check if table exists
    # then use the Python supabase client to create it
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    # Check if players table already exists by trying to query it
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/players?select=id&limit=1",
        headers=headers
    )
    
    if resp.status_code == 200:
        print("✓ Table 'players' already exists!")
        print(f"  Current response: {resp.json()}")
        return True
    elif resp.status_code == 404 or (resp.status_code >= 400 and 'relation' in resp.text.lower()):
        print("✗ Table 'players' does not exist yet.")
        print(f"  Response: {resp.status_code} - {resp.text[:200]}")
        print("\n  ⚠ You need to create the table manually:")
        print("  1. Go to https://supabase.com/dashboard/project/haqsvbmnitxutlzgckld/sql")
        print("  2. Copy and paste the contents of scripts/setup_database.sql")
        print("  3. Click 'Run'")
        print("  4. Then run this script again or run migrate_data.py directly")
        return False
    else:
        print(f"  Unexpected response: {resp.status_code}")
        print(f"  Body: {resp.text[:300]}")
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("WBSA Classification — Database Setup Check")
    print("=" * 60)
    print()
    run_sql_via_rpc()
