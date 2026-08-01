#!/usr/bin/env python3
"""
Check for duplicate venue requirement patterns in Div 12.

A solution is impossible if two teams have identical venue patterns,
as they would need to be in opposite venues when playing each other.
"""

import csv
from pathlib import Path


def main():
    base_dir = Path(__file__).parent.parent
    venreq_file = base_dir / 'data' / 'venReq_div12.csv'

    # Load venReq patterns
    patterns = {}
    with open(venreq_file, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and len(row) >= 3:
                team = row[0]
                venue = row[1]
                week = int(row[2])
                if team not in patterns:
                    patterns[team] = {}
                patterns[team][week] = venue

    # Div 12 teams
    div12_teams = ['BAP6', 'BEL1', 'BFL2', 'GBA3', 'GTO4', 'IGF3', 'RAY6', 'RAF3', 'SPM4', 'SWB4', 'TIL3']

    print("Venue patterns for Div 12 teams:\n")
    for team in sorted(div12_teams):
        if team in patterns:
            pattern_str = ''.join([patterns[team].get(w, '-') for w in range(1, 19)])
            print(f"{team}: {pattern_str}")
        else:
            print(f"{team}: (no constraints)")

    # Check for duplicates
    print("\n" + "="*60)
    print("CHECKING FOR DUPLICATE PATTERNS:")
    print("="*60 + "\n")

    pattern_to_teams = {}
    for team in div12_teams:
        if team in patterns:
            pattern_str = ''.join([patterns[team].get(w, '-') for w in range(1, 19)])
            if pattern_str not in pattern_to_teams:
                pattern_to_teams[pattern_str] = []
            pattern_to_teams[pattern_str].append(team)

    duplicates_found = False
    for pattern, teams in pattern_to_teams.items():
        if len(teams) > 1:
            duplicates_found = True
            print(f"⚠️  DUPLICATE PATTERN: {', '.join(teams)}")
            print(f"   Pattern: {pattern}\n")

    if not duplicates_found:
        print("✓ No duplicate patterns found - solution is POSSIBLE")
    else:
        print("\n❌ SOLUTION IS NOT POSSIBLE")
        print("   Teams with identical patterns cannot both be scheduled")
        print("   (they would need opposite venues when playing each other)")


if __name__ == '__main__':
    main()
