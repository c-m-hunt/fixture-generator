#!/usr/bin/env python3
"""
Validate fixtures against venue requirements, venue conflicts, and club list.

Checks:
1. All team codes exist in clubs.csv
2. Venue requirements (venReq.csv) are satisfied
3. Venue conflicts (venConflicts.csv) are not violated
"""

import csv
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

# Path setup
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
FIXTURES_DIR = BASE_DIR / "data"


def load_clubs() -> Set[str]:
    """Load valid club codes from clubs.csv."""
    clubs = set()
    with open(DATA_DIR / "clubs.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["code"]:  # Skip empty rows
                clubs.add(row["code"])
    return clubs


def load_venue_requirements() -> Dict[str, Dict[int, str]]:
    """Load venue requirements from venReq.csv.

    Returns: {team: {game_week: venue}} where venue is 'h' or 'a'
    """
    requirements = defaultdict(dict)
    with open(DATA_DIR / "venReq.csv", "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) == 3:
                team, venue, game_week = parts
                requirements[team][int(game_week)] = venue
    return requirements


def load_venue_conflicts() -> List[Tuple[str, str]]:
    """Load venue conflicts from venConflicts.csv.

    Returns: List of (team1, team2) pairs that share a ground
    """
    conflicts = []
    with open(DATA_DIR / "venConflicts.csv", "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) == 2:
                conflicts.append((parts[0], parts[1]))
    return conflicts


def load_fixtures(fixture_file: Path) -> List[Dict]:
    """Load fixtures from a CSV file."""
    fixtures = []
    with open(fixture_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fixtures.append(row)
    return fixtures


def check_club_codes(fixtures: List[Dict], valid_clubs: Set[str]) -> List[str]:
    """Check if all team codes in fixtures exist in clubs.csv."""
    errors = []
    seen_invalid = set()

    for fixture in fixtures:
        home = fixture["home_team"]
        away = fixture["away_team"]

        # Extract base club code (everything except the last digit)
        home_code = home[:-1] if home[-1].isdigit() else home
        away_code = away[:-1] if away[-1].isdigit() else away

        # Special handling for BYE in Division 12
        if home == "BYE" or away == "BYE":
            continue

        if home_code not in valid_clubs and home not in seen_invalid:
            errors.append(f"Invalid club code: {home} (base: {home_code})")
            seen_invalid.add(home)

        if away_code not in valid_clubs and away not in seen_invalid:
            errors.append(f"Invalid club code: {away} (base: {away_code})")
            seen_invalid.add(away)

    return errors


def check_venue_requirements(fixtures: List[Dict], requirements: Dict[str, Dict[int, str]]) -> List[str]:
    """Check if venue requirements are satisfied."""
    errors = []

    for fixture in fixtures:
        game_week = int(fixture["game_week"])
        home = fixture["home_team"]
        away = fixture["away_team"]
        division = fixture["division"]

        # Check home team requirements
        if home in requirements and game_week in requirements[home]:
            required_venue = requirements[home][game_week]
            if required_venue == "a":  # Should be away but is home
                errors.append(
                    f"{division}, Week {game_week}: {home} must be AWAY but is HOME vs {away}"
                )

        # Check away team requirements
        if away in requirements and game_week in requirements[away]:
            required_venue = requirements[away][game_week]
            if required_venue == "h":  # Should be home but is away
                errors.append(
                    f"{division}, Week {game_week}: {away} must be HOME but is AWAY vs {home}"
                )

    return errors


def check_venue_conflicts(fixtures: List[Dict], conflicts: List[Tuple[str, str]]) -> List[str]:
    """Check if venue conflicts are violated (both teams playing at home in same week)."""
    errors = []

    # Build a map of {game_week: {division: [home_teams]}}
    home_teams_by_week = defaultdict(lambda: defaultdict(list))

    for fixture in fixtures:
        game_week = int(fixture["game_week"])
        division = fixture["division"]
        home = fixture["home_team"]

        if home != "BYE":  # Skip BYE entries
            home_teams_by_week[game_week][division].append(home)

    # Check each conflict pair
    for team1, team2 in conflicts:
        for game_week, divisions in home_teams_by_week.items():
            for division, home_teams in divisions.items():
                if team1 in home_teams and team2 in home_teams:
                    errors.append(
                        f"{division}, Week {game_week}: {team1} and {team2} both at home (ground conflict)"
                    )

    return errors


def main():
    print("=" * 80)
    print("FIXTURE VALIDATION")
    print("=" * 80)
    print()

    # Load reference data
    print("Loading reference data...")
    valid_clubs = load_clubs()
    print(f"  - Loaded {len(valid_clubs)} valid clubs")

    venue_requirements = load_venue_requirements()
    total_requirements = sum(len(v) for v in venue_requirements.values())
    print(f"  - Loaded {total_requirements} venue requirements")

    venue_conflicts = load_venue_conflicts()
    print(f"  - Loaded {len(venue_conflicts)} venue conflict pairs")
    print()

    # Find all fixture files
    fixture_files = sorted(FIXTURES_DIR.glob("*_fixtures.csv"))
    print(f"Found {len(fixture_files)} fixture files")
    print()

    all_errors = []

    # Validate each fixture file
    for fixture_file in fixture_files:
        division_name = fixture_file.stem.replace("_fixtures", "")
        print(f"Validating {division_name}...")

        fixtures = load_fixtures(fixture_file)
        print(f"  - {len(fixtures)} fixtures loaded")

        # Check club codes
        club_errors = check_club_codes(fixtures, valid_clubs)
        if club_errors:
            all_errors.extend([f"{division_name}: {err}" for err in club_errors])

        # Check venue requirements
        venue_req_errors = check_venue_requirements(fixtures, venue_requirements)
        if venue_req_errors:
            all_errors.extend(venue_req_errors)

        # Check venue conflicts
        venue_conflict_errors = check_venue_conflicts(fixtures, venue_conflicts)
        if venue_conflict_errors:
            all_errors.extend(venue_conflict_errors)

        errors_for_division = len(club_errors) + len(venue_req_errors) + len(venue_conflict_errors)
        if errors_for_division == 0:
            print(f"  ✓ No errors")
        else:
            print(f"  ✗ {errors_for_division} errors")
        print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)

    if all_errors:
        print(f"\n❌ VALIDATION FAILED: {len(all_errors)} errors found\n")
        print("Errors by type:")
        print()

        club_code_errors = [e for e in all_errors if "Invalid club code" in e]
        venue_req_errors = [e for e in all_errors if "must be" in e]
        venue_conflict_errors = [e for e in all_errors if "ground conflict" in e]

        if club_code_errors:
            print(f"Club Code Errors ({len(club_code_errors)}):")
            for error in club_code_errors[:10]:  # Show first 10
                print(f"  - {error}")
            if len(club_code_errors) > 10:
                print(f"  ... and {len(club_code_errors) - 10} more")
            print()

        if venue_req_errors:
            print(f"Venue Requirement Violations ({len(venue_req_errors)}):")
            for error in venue_req_errors[:10]:  # Show first 10
                print(f"  - {error}")
            if len(venue_req_errors) > 10:
                print(f"  ... and {len(venue_req_errors) - 10} more")
            print()

        if venue_conflict_errors:
            print(f"Venue Conflict Violations ({len(venue_conflict_errors)}):")
            for error in venue_conflict_errors[:10]:  # Show first 10
                print(f"  - {error}")
            if len(venue_conflict_errors) > 10:
                print(f"  ... and {len(venue_conflict_errors) - 10} more")
            print()

        return 1
    else:
        print("\n✅ VALIDATION PASSED: No errors found!\n")
        return 0


if __name__ == "__main__":
    exit(main())
