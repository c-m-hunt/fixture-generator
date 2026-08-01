#!/usr/bin/env python3
"""
Generate venConflicts.csv from divisions.csv based on ground sharing rules.

Ground sharing rules:
- Teams 1 & 2 share a ground
- Teams 3 & 4 share a ground
- Teams 5 & 6 share a ground
- Teams 7 & 8 share a ground (if they exist)
"""

import csv
from pathlib import Path
from collections import defaultdict


def get_club_code(team: str) -> str:
    """Extract the 3-letter club code from a team name (e.g., 'BAP6' -> 'BAP')."""
    if len(team) >= 4:
        return team[:3]
    return team


def get_team_number(team: str) -> int | None:
    """Extract the team number from a team name (e.g., 'BAP6' -> 6)."""
    if len(team) >= 4:
        try:
            return int(team[3:])
        except ValueError:
            return None
    return None


def main():
    base_dir = Path(__file__).parent.parent
    divisions_file = base_dir / 'data' / 'divisions.csv'
    output_file = base_dir / 'data' / 'venConflicts.csv'

    # Load all teams and group by club
    clubs = defaultdict(list)

    with open(divisions_file, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0]:  # Skip empty rows
                # First column is division name, rest are teams
                for team in row[1:]:
                    if team and team != 'BYE1':
                        club_code = get_club_code(team)
                        team_number = get_team_number(team)
                        if team_number:
                            clubs[club_code].append((team_number, team))

    # Sort teams within each club by number
    for club in clubs:
        clubs[club].sort()

    # Generate conflict pairs based on ground sharing rules
    conflicts = []

    for club_code, teams in sorted(clubs.items()):
        # Create a dict for easier lookup
        team_dict = {num: name for num, name in teams}

        # Check each conflict pair
        conflict_pairs = [
            (1, 2),
            (3, 4),
            (5, 6),
            (7, 8)
        ]

        for num1, num2 in conflict_pairs:
            if num1 in team_dict and num2 in team_dict:
                team1 = team_dict[num1]
                team2 = team_dict[num2]
                conflicts.append((team1, team2))
                print(f"  {team1} <-> {team2}")

    # Write to venConflicts.csv
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        for team1, team2 in conflicts:
            writer.writerow([team1, team2])

    print(f"\n✓ Generated {len(conflicts)} conflict pairs")
    print(f"✓ Written to: {output_file}")


if __name__ == '__main__':
    main()
