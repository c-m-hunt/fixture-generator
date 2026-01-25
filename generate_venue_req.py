#!/usr/bin/env python3
"""
One-off script to generate venReq.csv for Div 12 teams based on existing fixtures.

Reads fixtures.csv and divisions_2.csv to create venue requirements for
Div 12 teams by copying home/away patterns from their club-mates.
"""

import csv
from pathlib import Path


def load_div12_teams(divisions_file: Path) -> list[str]:
    """Load Div 12 teams from divisions_2.csv (excluding BYE)."""
    with open(divisions_file, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0]:
                # First column is division name, rest are teams
                teams = [team for team in row[1:] if team and team != 'BYE1']
                return teams
    return []


def get_club_code(team: str) -> str:
    """Extract the 3-letter club code from a team name (e.g., 'BAP6' -> 'BAP')."""
    # Team codes are 3 letters followed by a number
    if len(team) >= 4:
        return team[:3]
    return team


def get_team_number(team: str) -> int | None:
    """Extract the team number from a team name (e.g., 'BAP6' -> 6)."""
    # Team codes are 3 letters followed by a number
    if len(team) >= 4:
        try:
            return int(team[3:])
        except ValueError:
            return None
    return None


def load_venue_conflicts(conflicts_file: Path) -> dict[str, str]:
    """
    Load venue conflicts and return a mapping of team -> conflicting team.

    Returns:
        Dict mapping team code to its conflicting team (bidirectional)
    """
    conflicts = {}
    with open(conflicts_file, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and len(row) >= 2:
                team1, team2 = row[0], row[1]
                # Create bidirectional mapping
                conflicts[team1] = team2
                conflicts[team2] = team1
    return conflicts


def load_fixtures_by_club(fixtures_file: Path) -> dict[str, dict[int, str]]:
    """
    Load fixtures and build a mapping of team -> {week: venue}.

    Returns:
        Dict mapping team code to {week: 'h' or 'a'}
    """
    team_venues = {}

    with open(fixtures_file, 'r') as f:
        # Skip comment lines starting with #
        lines = [line for line in f if not line.startswith('#')]
        reader = csv.DictReader(lines)
        for row in reader:
            if not row['game_week']:  # Skip empty rows
                continue

            week = int(row['game_week'])
            home_team = row['home_team']
            away_team = row['away_team']

            # Track venue for home team
            if home_team not in team_venues:
                team_venues[home_team] = {}
            team_venues[home_team][week] = 'h'

            # Track venue for away team
            if away_team not in team_venues:
                team_venues[away_team] = {}
            team_venues[away_team][week] = 'a'

    return team_venues


def find_pattern_for_team(
    div12_team: str,
    all_fixtures: dict[str, dict[int, str]],
    venue_conflicts: dict[str, str]
) -> tuple[dict[int, str] | None, str | None, str]:
    """
    Find a team's home/away pattern to use for the Div 12 team.

    Priority:
    1. Check venue conflicts first (ground sharing)
    2. If even-numbered team, match with "one up" club-mate

    Returns:
        Tuple of (pattern dict, source team name, match reason) or (None, None, reason)
    """
    # Priority 1: Check venue conflicts (ground sharing)
    if div12_team in venue_conflicts:
        conflicting_team = venue_conflicts[div12_team]
        if conflicting_team in all_fixtures:
            return all_fixtures[conflicting_team], conflicting_team, "venue_conflict"
        else:
            return None, None, f"venue_conflict_not_found ({conflicting_team})"

    # Priority 2: Even-numbered teams match with "one up"
    club_code = get_club_code(div12_team)
    team_number = get_team_number(div12_team)

    # Only match if team number is even
    if team_number is None or team_number % 2 != 0:
        return None, None, "odd_team_number"

    # Look for the team "one up" (number - 1)
    target_number = team_number - 1
    target_team = f"{club_code}{target_number}"

    if target_team in all_fixtures:
        return all_fixtures[target_team], target_team, "club_mate"

    return None, None, "club_mate_not_found"


def generate_venue_requirements(
    div12_teams: list[str],
    all_fixtures: dict[str, dict[int, str]],
    venue_conflicts: dict[str, str],
    output_file: Path
):
    """
    Generate venReq.csv for Div 12 teams based on venue conflicts and club-mate patterns.
    """
    venue_reqs = []
    teams_without_pattern = []

    print("\nMapping Div 12 teams to patterns:")
    for div12_team in sorted(div12_teams):
        pattern, source_team, reason = find_pattern_for_team(div12_team, all_fixtures, venue_conflicts)

        if pattern and source_team:
            if reason == "venue_conflict":
                print(f"  {div12_team} <- {source_team} (venue conflict)")
            elif reason == "club_mate":
                print(f"  {div12_team} <- {source_team} (club mate)")
            else:
                print(f"  {div12_team} <- {source_team}")

            # Add venue requirements for all 18 weeks
            for week in range(1, 19):
                if week in pattern:
                    venue = pattern[week]
                    venue_reqs.append((div12_team, venue, week))
        else:
            teams_without_pattern.append(div12_team)
            if reason == "odd_team_number":
                print(f"  ⚠️  {div12_team} - Odd team number (no matching required)")
            elif "venue_conflict_not_found" in reason:
                print(f"  ⚠️  {div12_team} - {reason}")
            elif reason == "club_mate_not_found":
                print(f"  ⚠️  {div12_team} - No matching club mate found in fixtures")
            else:
                print(f"  ⚠️  {div12_team} - {reason}")

    if teams_without_pattern:
        print(f"\n⚠️  {len(teams_without_pattern)} teams without venue constraints (will be flexible)")

    # Sort by team, then week
    venue_reqs.sort(key=lambda x: (x[0], x[2]))

    # Write to file
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        for team, venue, week in venue_reqs:
            writer.writerow([team, venue, week])

    matched_teams = len(div12_teams) - len(teams_without_pattern)
    print(f"\n✓ Generated {len(venue_reqs)} venue requirements for {matched_teams} matched teams")
    print(f"✓ Written to: {output_file}")


def main():
    # Paths
    base_dir = Path(__file__).parent
    fixtures_file = base_dir / 'output' / 'fixtures.csv'
    div12_file = base_dir / 'data' / 'divisions_2.csv'
    conflicts_file = base_dir / 'data' / 'venConflicts.csv'
    output_file = base_dir / 'data' / 'venReq_div12.csv'

    # Verify files exist
    if not fixtures_file.exists():
        print(f"Error: {fixtures_file} not found")
        return
    if not div12_file.exists():
        print(f"Error: {div12_file} not found")
        return
    if not conflicts_file.exists():
        print(f"Error: {conflicts_file} not found")
        return

    print("Loading Div 12 teams...")
    div12_teams = load_div12_teams(div12_file)
    print(f"  Found {len(div12_teams)} teams in Div 12")
    print(f"  Teams: {', '.join(sorted(div12_teams))}")

    print("\nLoading venue conflicts...")
    venue_conflicts = load_venue_conflicts(conflicts_file)
    print(f"  Found {len(venue_conflicts) // 2} conflict pairs")

    print("\nLoading existing fixtures (Premier - Div 11)...")
    all_fixtures = load_fixtures_by_club(fixtures_file)
    print(f"  Found fixtures for {len(all_fixtures)} teams")

    generate_venue_requirements(div12_teams, all_fixtures, venue_conflicts, output_file)

    print("\n✓ Done!")


if __name__ == '__main__':
    main()
