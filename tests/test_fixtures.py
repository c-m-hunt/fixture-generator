"""
Test suite for validating fixture generator output.

Validates fixtures.csv against all hard and soft constraints defined in CLAUDE.md.
"""

import csv
import pytest
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass


@dataclass
class Fixture:
    game_week: int
    home_team: str
    away_team: str
    division: str


@dataclass
class VenueRequirement:
    team: str
    venue: str  # 'h' or 'a'
    game_week: int


@dataclass
class FixedMatchRequirement:
    game_week: int
    team1: str
    team2: str


def get_club_code(team: str) -> str:
    """Extract club code from team (e.g., 'WOS1' -> 'WOS')."""
    return ''.join(c for c in team if c.isalpha())


def get_team_number(team: str) -> int:
    """Extract team number from team (e.g., 'WOS1' -> 1)."""
    return int(''.join(c for c in team if c.isdigit()))


def load_fixtures(fixtures_path: Path) -> list[Fixture]:
    """Load fixtures from CSV file."""
    fixtures = []
    with open(fixtures_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 4:
                # Skip comment lines and header row
                if row[0].startswith('#') or row[0] == 'game_week':
                    continue
                fixtures.append(Fixture(
                    game_week=int(row[0]),
                    home_team=row[1],
                    away_team=row[2],
                    division=row[3]
                ))
    return fixtures


def load_divisions(divisions_path: Path) -> dict[str, list[str]]:
    """Load divisions from CSV file. Returns dict of division name -> list of teams."""
    divisions = {}
    with open(divisions_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                division_name = row[0]
                teams = [t.strip() for t in row[1:] if t.strip()]
                divisions[division_name] = teams
    return divisions


def load_venue_requirements(venreq_path: Path) -> list[VenueRequirement]:
    """Load venue requirements from CSV file."""
    requirements = []
    if not venreq_path.exists():
        return requirements
    with open(venreq_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 3 and row[0].strip():
                requirements.append(VenueRequirement(
                    team=row[0].strip(),
                    venue=row[1].strip().lower(),
                    game_week=int(row[2])
                ))
    return requirements


def load_fixed_match_requirements(fixreq_path: Path) -> list[FixedMatchRequirement]:
    """Load fixed match requirements from CSV file."""
    requirements = []
    if not fixreq_path.exists():
        return requirements
    with open(fixreq_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 3 and row[0].strip():
                requirements.append(FixedMatchRequirement(
                    game_week=int(row[0]),
                    team1=row[1].strip(),
                    team2=row[2].strip()
                ))
    return requirements


def load_venue_conflicts(venconflicts_path: Path) -> list[set[str]]:
    """Load venue conflicts from CSV file.

    Each row contains teams that share a venue/pitch.
    Returns a list of sets, where each set contains teams sharing a venue.
    """
    conflicts = []
    if not venconflicts_path.exists():
        return conflicts
    with open(venconflicts_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            teams = {t.strip() for t in row if t.strip()}
            if len(teams) >= 2:
                conflicts.append(teams)
    return conflicts


class FixtureValidator:
    """Validator for fixture data."""

    def __init__(self, data_dir: Path, output_dir: Path):
        self.data_dir = data_dir
        self.output_dir = output_dir
        self.fixtures_path = output_dir / 'fixtures.csv'
        self.divisions_path = data_dir / 'divisions.csv'
        self.venreq_path = data_dir / 'venReq.csv'
        self.fixreq_path = data_dir / 'fixReq.csv'
        self.venconflicts_path = data_dir / 'venConflicts.csv'

        self.fixtures: list[Fixture] = []
        self.divisions: dict[str, list[str]] = {}
        self.venue_requirements: list[VenueRequirement] = []
        self.fixed_match_requirements: list[FixedMatchRequirement] = []
        self.venue_conflicts: list[set[str]] = []

        self._load_data()

    def _load_data(self):
        """Load all data files."""
        if self.fixtures_path.exists():
            self.fixtures = load_fixtures(self.fixtures_path)
        if self.divisions_path.exists():
            self.divisions = load_divisions(self.divisions_path)
        self.venue_requirements = load_venue_requirements(self.venreq_path)
        self.fixed_match_requirements = load_fixed_match_requirements(self.fixreq_path)
        self.venue_conflicts = load_venue_conflicts(self.venconflicts_path)

    def get_fixtures_by_division(self) -> dict[str, list[Fixture]]:
        """Group fixtures by division."""
        by_division = defaultdict(list)
        for f in self.fixtures:
            by_division[f.division].append(f)
        return dict(by_division)

    def get_team_schedule(self, team: str) -> list[tuple[int, str, str]]:
        """Get schedule for a team: list of (game_week, opponent, venue)."""
        schedule = []
        for f in self.fixtures:
            if f.home_team == team:
                schedule.append((f.game_week, f.away_team, 'h'))
            elif f.away_team == team:
                schedule.append((f.game_week, f.home_team, 'a'))
        return sorted(schedule, key=lambda x: x[0])


@pytest.fixture
def validator():
    """Create a validator instance for testing."""
    data_dir = Path(__file__).parent.parent / 'data'
    output_dir = Path(__file__).parent.parent / "output"
    return FixtureValidator(data_dir, output_dir)


@pytest.fixture
def fixtures(validator):
    """Get loaded fixtures."""
    return validator.fixtures


@pytest.fixture
def divisions(validator):
    """Get loaded divisions."""
    return validator.divisions


class TestFixturesExist:
    """Tests for basic file existence and structure."""

    def test_fixtures_file_exists(self, validator):
        """Fixtures file should exist."""
        assert validator.fixtures_path.exists(), f"fixtures.csv not found at {validator.fixtures_path}"

    def test_fixtures_not_empty(self, fixtures):
        """Fixtures should not be empty."""
        assert len(fixtures) > 0, "fixtures.csv is empty"

    def test_divisions_file_exists(self, validator):
        """Divisions file should exist."""
        assert validator.divisions_path.exists(), f"divisions.csv not found at {validator.divisions_path}"


class TestUniqueFixtures:
    """Tests for fixture uniqueness."""

    def test_no_duplicate_fixtures(self, fixtures):
        """Each fixture (home_team vs away_team in game_week) should be unique."""
        seen = set()
        duplicates = []
        for f in fixtures:
            key = (f.game_week, f.home_team, f.away_team)
            if key in seen:
                duplicates.append(f)
            seen.add(key)

        assert len(duplicates) == 0, f"Found {len(duplicates)} duplicate fixtures: {duplicates[:5]}"

    def test_no_same_match_same_week(self, fixtures):
        """Same two teams should not play each other twice in same week."""
        seen = set()
        violations = []
        for f in fixtures:
            # Create a key that's the same regardless of home/away
            teams = tuple(sorted([f.home_team, f.away_team]))
            key = (f.game_week, teams)
            if key in seen:
                violations.append(f)
            seen.add(key)

        assert len(violations) == 0, f"Found teams playing twice in same week: {violations[:5]}"


class TestRoundRobin:
    """Tests for complete round-robin schedule."""

    def test_each_team_plays_every_opponent_twice(self, validator):
        """Each team must play every other team in their division twice (once home, once away)."""
        violations = []

        for division_name, teams in validator.divisions.items():
            if len(teams) != 10:
                # Skip non-standard divisions
                continue

            division_fixtures = [f for f in validator.fixtures if f.division == division_name]

            for team in teams:
                opponents = [t for t in teams if t != team]

                for opponent in opponents:
                    # Check for home game against opponent
                    home_games = [f for f in division_fixtures
                                  if f.home_team == team and f.away_team == opponent]
                    # Check for away game against opponent
                    away_games = [f for f in division_fixtures
                                  if f.away_team == team and f.home_team == opponent]

                    if len(home_games) != 1:
                        violations.append(f"{team} has {len(home_games)} home games vs {opponent} (expected 1)")
                    if len(away_games) != 1:
                        violations.append(f"{team} has {len(away_games)} away games vs {opponent} (expected 1)")

        assert len(violations) == 0, f"Round-robin violations:\n" + "\n".join(violations[:20])

    def test_each_team_plays_9_home_9_away(self, validator):
        """Each team in a 10-team division should have exactly 9 home and 9 away games."""
        violations = []

        for division_name, teams in validator.divisions.items():
            if len(teams) != 10:
                continue

            division_fixtures = [f for f in validator.fixtures if f.division == division_name]

            for team in teams:
                home_count = sum(1 for f in division_fixtures if f.home_team == team)
                away_count = sum(1 for f in division_fixtures if f.away_team == team)

                if home_count != 9:
                    violations.append(f"{team} has {home_count} home games (expected 9)")
                if away_count != 9:
                    violations.append(f"{team} has {away_count} away games (expected 9)")

        assert len(violations) == 0, f"Home/away balance violations:\n" + "\n".join(violations[:20])

    def test_each_team_plays_18_games(self, validator):
        """Each team in a 10-team division should play exactly 18 games."""
        violations = []

        for division_name, teams in validator.divisions.items():
            if len(teams) != 10:
                continue

            division_fixtures = [f for f in validator.fixtures if f.division == division_name]

            for team in teams:
                game_count = sum(1 for f in division_fixtures
                                if f.home_team == team or f.away_team == team)

                if game_count != 18:
                    violations.append(f"{team} plays {game_count} games (expected 18)")

        assert len(violations) == 0, f"Game count violations:\n" + "\n".join(violations[:20])


class TestHardConstraints:
    """Tests for hard constraints that must never be violated."""

    def test_no_consecutive_reverse_fixtures(self, validator):
        """If Team A plays Team B in week N, the reverse cannot be in week N+1."""
        violations = []

        for division_name, teams in validator.divisions.items():
            division_fixtures = [f for f in validator.fixtures if f.division == division_name]

            for team in teams:
                schedule = validator.get_team_schedule(team)

                for i in range(len(schedule) - 1):
                    week1, opp1, venue1 = schedule[i]
                    week2, opp2, venue2 = schedule[i + 1]

                    # Check if consecutive weeks and same opponent with reversed venue
                    if (week2 == week1 + 1 and
                        opp1 == opp2 and
                        venue1 != venue2):
                        violations.append(
                            f"{team} plays {opp1} in weeks {week1} ({venue1}) and {week2} ({venue2})"
                        )

        assert len(violations) == 0, f"Consecutive reverse fixture violations:\n" + "\n".join(violations[:20])

    def test_no_four_consecutive_same_venue(self, validator):
        """A team can NEVER have 4+ consecutive home or away games."""
        violations = []

        for division_name, teams in validator.divisions.items():
            for team in teams:
                schedule = validator.get_team_schedule(team)
                if len(schedule) < 4:
                    continue

                # Check for 4 consecutive same venue
                for i in range(len(schedule) - 3):
                    venues = [schedule[j][2] for j in range(i, i + 4)]
                    weeks = [schedule[j][0] for j in range(i, i + 4)]

                    # Check if weeks are actually consecutive
                    if all(weeks[j+1] == weeks[j] + 1 for j in range(3)):
                        if all(v == 'h' for v in venues):
                            violations.append(f"{team} has 4 consecutive home games in weeks {weeks}")
                        elif all(v == 'a' for v in venues):
                            violations.append(f"{team} has 4 consecutive away games in weeks {weeks}")

        assert len(violations) == 0, f"4+ consecutive venue violations:\n" + "\n".join(violations[:20])

    def test_fixed_match_requirements(self, validator):
        """Fixed match requirements must be satisfied."""
        if not validator.fixed_match_requirements:
            pytest.skip("No fixed match requirements defined")

        violations = []

        for req in validator.fixed_match_requirements:
            # Find if these teams play in this week
            matches_in_week = [
                f for f in validator.fixtures
                if f.game_week == req.game_week and
                {f.home_team, f.away_team} == {req.team1, req.team2}
            ]

            if len(matches_in_week) == 0:
                violations.append(
                    f"Required match {req.team1} vs {req.team2} in week {req.game_week} not found"
                )

        assert len(violations) == 0, f"Fixed match requirement violations:\n" + "\n".join(violations)

    def test_venue_requirements(self, validator):
        """Venue requirements must be satisfied."""
        if not validator.venue_requirements:
            pytest.skip("No venue requirements defined")

        violations = []

        for req in validator.venue_requirements:
            # Find this team's fixture in this week
            team_fixtures = [
                f for f in validator.fixtures
                if f.game_week == req.game_week and
                (f.home_team == req.team or f.away_team == req.team)
            ]

            if len(team_fixtures) == 0:
                violations.append(f"{req.team} has no fixture in week {req.game_week}")
                continue

            fixture = team_fixtures[0]
            actual_venue = 'h' if fixture.home_team == req.team else 'a'

            if actual_venue != req.venue:
                violations.append(
                    f"{req.team} required {req.venue} in week {req.game_week}, got {actual_venue}"
                )

        assert len(violations) == 0, f"Venue requirement violations:\n" + "\n".join(violations)


class TestSoftConstraints:
    """Tests for soft constraints (warnings, not failures)."""

    def test_three_consecutive_same_venue_count(self, validator):
        """Count teams with 3 consecutive home or away games (soft constraint)."""
        occurrences = []

        for division_name, teams in validator.divisions.items():
            for team in teams:
                schedule = validator.get_team_schedule(team)
                if len(schedule) < 3:
                    continue

                for i in range(len(schedule) - 2):
                    venues = [schedule[j][2] for j in range(i, i + 3)]
                    weeks = [schedule[j][0] for j in range(i, i + 3)]

                    # Check if weeks are actually consecutive
                    if all(weeks[j+1] == weeks[j] + 1 for j in range(2)):
                        if all(v == 'h' for v in venues):
                            occurrences.append(f"{team}: 3 consecutive home in weeks {weeks}")
                        elif all(v == 'a' for v in venues):
                            occurrences.append(f"{team}: 3 consecutive away in weeks {weeks}")

        # This is a soft constraint - just report, don't fail
        if occurrences:
            print(f"\nWARNING: {len(occurrences)} instances of 3 consecutive same venue:")
            for occ in occurrences[:10]:
                print(f"  {occ}")
            if len(occurrences) > 10:
                print(f"  ... and {len(occurrences) - 10} more")

    def test_ground_sharing_conflicts(self, validator):
        """Check ground sharing conflicts (teams 1&2, 3&4, 5&6 from same club)."""
        conflicts = []

        # Group teams by club
        clubs = defaultdict(list)
        for division_name, teams in validator.divisions.items():
            for team in teams:
                club = get_club_code(team)
                clubs[club].append(team)

        # Define ground sharing pairs
        def shares_ground(team1: str, team2: str) -> bool:
            if get_club_code(team1) != get_club_code(team2):
                return False
            num1, num2 = get_team_number(team1), get_team_number(team2)
            # Teams 1&2, 3&4, 5&6, 7&8 share grounds
            return (num1 - 1) // 2 == (num2 - 1) // 2

        # Check each game week for conflicts
        for week in range(1, 19):
            week_fixtures = [f for f in validator.fixtures if f.game_week == week]
            home_teams = [f.home_team for f in week_fixtures]

            # Check for ground sharing conflicts
            for i, team1 in enumerate(home_teams):
                for team2 in home_teams[i+1:]:
                    if shares_ground(team1, team2):
                        conflicts.append(f"Week {week}: {team1} and {team2} both at home")

        # This is a soft constraint - report but don't fail
        if conflicts:
            print(f"\nWARNING: {len(conflicts)} ground sharing conflicts:")
            for conflict in conflicts[:10]:
                print(f"  {conflict}")
            if len(conflicts) > 10:
                print(f"  ... and {len(conflicts) - 10} more")

    def test_venue_conflicts(self, validator):
        """Check venue conflicts from venConflicts.csv (teams from different clubs sharing pitches)."""
        if not validator.venue_conflicts:
            pytest.skip("No venue conflicts defined")

        conflicts = []

        # Check each game week for venue conflicts
        for week in range(1, 19):
            week_fixtures = [f for f in validator.fixtures if f.game_week == week]
            home_teams = set(f.home_team for f in week_fixtures)

            # Check each venue conflict group
            for conflict_group in validator.venue_conflicts:
                # Find which teams in this conflict group are playing at home this week
                home_in_group = home_teams & conflict_group
                if len(home_in_group) > 1:
                    conflicts.append(f"Week {week}: {sorted(home_in_group)} all at home (share venue)")

        # This is a soft constraint - report but don't fail
        if conflicts:
            print(f"\nWARNING: {len(conflicts)} venue conflicts (different clubs sharing pitches):")
            for conflict in conflicts[:10]:
                print(f"  {conflict}")
            if len(conflicts) > 10:
                print(f"  ... and {len(conflicts) - 10} more")


class TestGameWeekStructure:
    """Tests for game week structure."""

    def test_game_weeks_1_to_18(self, fixtures):
        """All game weeks should be between 1 and 18."""
        invalid_weeks = [f for f in fixtures if f.game_week < 1 or f.game_week > 18]

        assert len(invalid_weeks) == 0, f"Invalid game weeks found: {set(f.game_week for f in invalid_weeks)}"

    def test_each_team_plays_once_per_week(self, validator):
        """Each team should play exactly once per game week."""
        violations = []

        for division_name, teams in validator.divisions.items():
            if len(teams) != 10:
                continue

            division_fixtures = [f for f in validator.fixtures if f.division == division_name]

            for week in range(1, 19):
                week_fixtures = [f for f in division_fixtures if f.game_week == week]

                for team in teams:
                    appearances = sum(1 for f in week_fixtures
                                     if f.home_team == team or f.away_team == team)

                    if appearances != 1:
                        violations.append(
                            f"{team} appears {appearances} times in week {week} (expected 1)"
                        )

        assert len(violations) == 0, f"Per-week appearance violations:\n" + "\n".join(violations[:20])

    def test_five_games_per_week_per_division(self, validator):
        """Each 10-team division should have exactly 5 games per week."""
        violations = []

        for division_name, teams in validator.divisions.items():
            if len(teams) != 10:
                continue

            division_fixtures = [f for f in validator.fixtures if f.division == division_name]

            for week in range(1, 19):
                week_fixtures = [f for f in division_fixtures if f.game_week == week]

                if len(week_fixtures) != 5:
                    violations.append(
                        f"{division_name} week {week}: {len(week_fixtures)} games (expected 5)"
                    )

        assert len(violations) == 0, f"Games per week violations:\n" + "\n".join(violations[:20])


class TestDivisionIntegrity:
    """Tests for division data integrity."""

    def test_all_fixture_teams_in_divisions(self, validator):
        """All teams in fixtures should exist in their division."""
        all_teams = set()
        for teams in validator.divisions.values():
            all_teams.update(teams)

        unknown_teams = set()
        for f in validator.fixtures:
            if f.home_team not in all_teams:
                unknown_teams.add(f.home_team)
            if f.away_team not in all_teams:
                unknown_teams.add(f.away_team)

        assert len(unknown_teams) == 0, f"Unknown teams in fixtures: {unknown_teams}"

    def test_fixtures_match_divisions(self, validator):
        """Teams in each fixture should both be from the same division."""
        violations = []

        for f in validator.fixtures:
            # Find which division each team belongs to
            home_division = None
            away_division = None

            for div_name, teams in validator.divisions.items():
                if f.home_team in teams:
                    home_division = div_name
                if f.away_team in teams:
                    away_division = div_name

            if home_division != away_division:
                violations.append(
                    f"{f.home_team} ({home_division}) vs {f.away_team} ({away_division})"
                )
            elif home_division != f.division:
                violations.append(
                    f"Fixture claims division {f.division} but teams are in {home_division}"
                )

        assert len(violations) == 0, f"Division mismatch violations:\n" + "\n".join(violations[:20])


def run_all_tests():
    """Run all tests and return results."""
    import sys

    # Run pytest programmatically
    exit_code = pytest.main([
        __file__,
        '-v',
        '--tb=short',
        '-x',  # Stop on first failure
    ])

    return exit_code


if __name__ == '__main__':
    run_all_tests()
