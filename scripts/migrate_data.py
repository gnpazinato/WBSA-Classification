"""
WBSA Classification — Data Migration Script
Reads May 2025 2.xlsx and inserts all player data into Supabase.

Usage:
    pip install pandas openpyxl supabase
    python migrate_data.py
"""

import pandas as pd
import re
import sys
import os

# --- Supabase Configuration ---
SUPABASE_URL = "https://haqsvbmnitxutlzgckld.supabase.co"
SUPABASE_KEY = "SUA_CHAVE_AQUI"
# Use service_role key for bypassing RLS during migration.
# If you have a service_role key, replace SUPABASE_KEY above with it.

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'May 2025 2.xlsx')


def normalize_country(val):
    """Normalize country name variants to a canonical form."""
    if not val or pd.isna(val):
        return None
    val = str(val).strip().upper()
    mapping = {
        'R S A': 'RSA',
        'SOUTH AFRICA': 'RSA',
        'SOUTH  AFRICA': 'RSA',
        'SOUTH AFRCIA': 'RSA',
        'SOUTH AGFRICA': 'RSA',
        'R S A (BRITTISH)': 'RSA',
        'R SA': 'RSA',
        'SOUTH AFICA': 'RSA',
        'ZIM': 'ZIMBABWE',
        'NIG': 'NIGERIA',
        'G B R': 'UNITED KINGDOM',
        'ENGLAND': 'UNITED KINGDOM',
        'NEW ZELAND': 'NEW ZEALAND',
        'LESHOTO': 'LESOTHO',
    }
    return mapping.get(val, val)


def normalize_zone(val):
    """Normalize zone/province abbreviations."""
    if not val or pd.isna(val):
        return None
    val = str(val).strip().upper()
    # Remove extra spaces
    val = re.sub(r'\s+', '', val)
    mapping = {
        'EC': 'EC', 'E.C': 'EC', 'EASTERNC': 'EC',
        'ECB': 'ECB', 'ECM': 'ECM',
        'EP': 'EP', 'E.P': 'EP',
        'WC': 'WC', 'WP': 'WP', 'W.C': 'WC',
        'GP': 'GP', 'GPC': 'GPC', 'GPN': 'GPN',
        'FS': 'FS', 'F.S': 'FS',
        'KZN': 'KZN', 'KZM': 'KZM',
        'LP': 'LP', 'L.P': 'LP',
        'MP': 'MP', 'M.P': 'MP',
        'NC': 'NC', 'N.C': 'NC',
        'NW': 'NW', 'N.W': 'NW',
        'AMA': 'AMA', 'BOL': 'BOL',
        'CG': 'CG', 'CGN': 'CGN',
    }
    return mapping.get(val, val)


def normalize_disability(val):
    """Normalize common disability type variants."""
    if not val or pd.isna(val):
        return None
    val = str(val).strip()
    upper = val.upper()
    mapping = {
        'PARA': 'Paraplegia',
        'PARAP': 'Paraplegia',
        'PARAPLEGIA': 'Paraplegia',
        'PARAPLEGI': 'Paraplegia',
        'PARAPLEGIC': 'Paraplegia',
        'PATA': 'Paraplegia',
        'AMP': 'Amputee',
        'AMPUTEE': 'Amputee',
        'AMOUTEE': 'Amputee',
        'AMPUTT': 'Amputee',
        'AMPUTUTEE': 'Amputee',
        'AMPUTEE/PARA': 'Amputee/Paraplegia',
        'SPINA BIFIDA': 'Spina Bifida',
        'SB': 'Spina Bifida',
        'POLIO': 'Polio',
        'CP': 'Cerebral Palsy',
        'CEREBRAL PALSY': 'Cerebral Palsy',
        'ABLE': 'Able-Bodied',
        'ABLE BODY': 'Able-Bodied',
        'ABLE-BODY': 'Able-Bodied',
        'ARTHRITIS': 'Arthritis',
        'ATHRITIS': 'Arthritis',
    }
    result = mapping.get(upper, None)
    if result:
        return result
    # Title-case for anything else
    return val.title()


def parse_date(val):
    """Parse date string to YYYY-MM-DD format."""
    if not val or pd.isna(val):
        return None
    try:
        s = str(val).strip()
        d = pd.to_datetime(s, errors='coerce')
        if pd.isna(d):
            return None
        # Sanity check year
        if d.year < 1920 or d.year > 2025:
            return None
        return d.strftime('%Y-%m-%d')
    except Exception:
        return None


def main():
    print("=" * 60)
    print("WBSA Classification — Data Migration")
    print("=" * 60)

    # 1. Read Excel
    excel_path = os.path.abspath(EXCEL_PATH)
    print(f"\n  Reading: {excel_path}")

    if not os.path.exists(excel_path):
        print(f"  ERROR: File not found: {excel_path}")
        sys.exit(1)

    df = pd.read_excel(excel_path, sheet_name='players')
    print(f"  Rows read: {len(df)}")

    # 2. Transform data
    print("\n  Transforming data...")
    players = []
    issues = []

    for idx, row in df.iterrows():
        try:
            player = {
                'player_number': int(row['no-player']),
                'last_name': str(row['last-name']).strip().upper() if pd.notna(row['last-name']) else None,
                'first_name': str(row['first-name']).strip().upper() if pd.notna(row['first-name']) else None,
                'birth_date': parse_date(row.get('birth-date')),
                'birth_country': normalize_country(row.get('birth-country')),
                'legal_nationality': normalize_country(row.get('legal-nationality')),
                'card_issue_date': parse_date(row.get('card-issue')),
                'classification': str(row['Classification']).strip() if pd.notna(row.get('Classification')) else None,
                'zone': normalize_zone(row.get('zone_2')),
                'gender': str(row['Combo97']).strip().upper() if pd.notna(row.get('Combo97')) else None,
                'disability': normalize_disability(row.get('Disablity')),
                'is_active': bool(row['Status']) if pd.notna(row.get('Status')) else True,
                'notes': str(row['comment']).strip() if pd.notna(row.get('comment')) else None,
            }

            # Validate required fields
            if not player['last_name']:
                issues.append(f"Row {idx}: missing last name (player #{player['player_number']})")
                continue
            if not player['first_name']:
                issues.append(f"Row {idx}: missing first name (player #{player['player_number']})")
                continue

            players.append(player)
        except Exception as e:
            issues.append(f"Row {idx}: {str(e)}")

    print(f"  Valid players: {len(players)}")
    if issues:
        print(f"  Issues: {len(issues)}")
        for issue in issues[:10]:
            print(f"    ⚠ {issue}")

    # 3. Insert into Supabase
    print("\n  Connecting to Supabase...")

    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    except ImportError:
        print("  ERROR: supabase package not installed.")
        print("  Run: pip install supabase")
        sys.exit(1)

    # Insert in batches of 50
    batch_size = 50
    total_inserted = 0
    total_errors = 0

    print(f"  Inserting {len(players)} players in batches of {batch_size}...")

    for i in range(0, len(players), batch_size):
        batch = players[i:i + batch_size]
        try:
            result = sb.table('players').upsert(batch, on_conflict='player_number').execute()
            total_inserted += len(batch)
            pct = int((total_inserted / len(players)) * 100)
            print(f"    Batch {i // batch_size + 1}: {len(batch)} inserted ({pct}%)")
        except Exception as e:
            total_errors += len(batch)
            print(f"    Batch {i // batch_size + 1}: ERROR - {str(e)[:100]}")

    print(f"\n  {'=' * 40}")
    print(f"  Migration complete!")
    print(f"  Inserted: {total_inserted}")
    print(f"  Errors: {total_errors}")
    print(f"  {'=' * 40}")


if __name__ == '__main__':
    main()
