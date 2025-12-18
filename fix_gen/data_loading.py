"""
Data loading functions for the fixture generator.
"""

import csv
from collections import Counter
from pathlib import Path

from .models import Division, FixedMatch, VenueRequirement


def load_divisions(filepath: Path) -> list[Division]:
    """Load divisions from CSV file."""
    divisions = []
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        for row in reader:
            if row:
                divisions.append(Division.from_row(row))

    # Validate: check for duplicate teams
    all_teams = []
    team_to_div = {}
    for div in divisions:
        for team in div.teams:
            if team.code in team_to_div:
                print(f"ERROR: Team {team.code} appears in both '{team_to_div[team.code]}' and '{div.name}'")
            team_to_div[team.code] = div.name
            all_teams.append(team.code)

    dupes = {t: c for t, c in Counter(all_teams).items() if c > 1}
    if dupes:
        print(f"\nFATAL: Found {len(dupes)} duplicate team(s) in divisions.csv:")
        for team, count in sorted(dupes.items()):
            print(f"  {team}: appears {count} times")
        print("\nPlease fix the data before running again.")
        raise ValueError("Duplicate teams in divisions.csv")

    return divisions


def load_fixed_matches(filepath: Path) -> list[FixedMatch]:
    """Load fixed match requirements from CSV file."""
    matches = []
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        for row in reader:
            if row and len(row) >= 3:
                matches.append(FixedMatch(
                    week=int(row[0]),
                    team1=row[1],
                    team2=row[2],
                ))
    return matches


def load_venue_requirements(filepath: Path) -> list[VenueRequirement]:
    """Load venue requirements from CSV file."""
    requirements = []
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        for row in reader:
            if row and len(row) >= 3:
                requirements.append(VenueRequirement(
                    team=row[0],
                    venue=row[1],
                    week=int(row[2]),
                ))
    return requirements
