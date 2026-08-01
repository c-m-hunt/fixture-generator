"""
Validation functions for generated fixtures.
"""

from collections import defaultdict
from itertools import combinations

from .config import MAX_CONSECUTIVE_SAME_VENUE
from .models import Division, Fixture


def validate_fixtures(fixtures: list[Fixture], divisions: list[Division]) -> list[str]:
    """Validate the generated fixtures against all constraints."""
    issues = []

    # Group fixtures by division
    by_division: dict[str, list[Fixture]] = defaultdict(list)
    for f in fixtures:
        by_division[f.division].append(f)

    for div in divisions:
        div_fixtures = by_division[div.name]
        teams = [t.code for t in div.teams]

        if div.has_bye_weeks:
            # 11-team division validation
            # Check each team plays 16-17 games (with bye weeks)
            for team in teams:
                games = [f for f in div_fixtures if f.home_team == team or f.away_team == team]
                if not (16 <= len(games) <= 17):
                    issues.append(f"{team}: plays {len(games)} games, expected 16-17 (with bye weeks)")

            # For 11-team divisions, bye weeks make an exact 9/9 split impossible,
            # but home and away must still be within 1 of each other
            for team in teams:
                home_games = [f for f in div_fixtures if f.home_team == team]
                away_games = [f for f in div_fixtures if f.away_team == team]
                if abs(len(home_games) - len(away_games)) > 1:
                    issues.append(
                        f"{team}: unbalanced home/away ({len(home_games)}H/{len(away_games)}A), "
                        f"expected within 1"
                    )

            # Check each pair plays at least once, at most twice
            for t1, t2 in combinations(teams, 2):
                h2h = [f for f in div_fixtures
                       if (f.home_team == t1 and f.away_team == t2) or
                          (f.home_team == t2 and f.away_team == t1)]
                if len(h2h) < 1:
                    issues.append(f"{t1} vs {t2}: {len(h2h)} matches, expected at least 1")
                elif len(h2h) > 2:
                    issues.append(f"{t1} vs {t2}: {len(h2h)} matches, expected at most 2")
                elif len(h2h) == 2:
                    homes = [f.home_team for f in h2h]
                    if homes[0] == homes[1]:
                        issues.append(f"{t1} vs {t2}: same home team in both matches")
        else:
            # 10-team division validation (standard)
            # Check each team plays 18 games
            for team in teams:
                games = [f for f in div_fixtures if f.home_team == team or f.away_team == team]
                if len(games) != 18:
                    issues.append(f"{team}: plays {len(games)} games, expected 18")

            # Check each team plays 9 home and 9 away
            for team in teams:
                home_games = [f for f in div_fixtures if f.home_team == team]
                away_games = [f for f in div_fixtures if f.away_team == team]
                if len(home_games) != 9:
                    issues.append(f"{team}: {len(home_games)} home games, expected 9")
                if len(away_games) != 9:
                    issues.append(f"{team}: {len(away_games)} away games, expected 9")

            # Check each pair plays twice (once each way)
            for t1, t2 in combinations(teams, 2):
                h2h = [f for f in div_fixtures
                       if (f.home_team == t1 and f.away_team == t2) or
                          (f.home_team == t2 and f.away_team == t1)]
                if len(h2h) != 2:
                    issues.append(f"{t1} vs {t2}: {len(h2h)} matches, expected 2")
                elif len(h2h) == 2:
                    homes = [f.home_team for f in h2h]
                    if homes[0] == homes[1]:
                        issues.append(f"{t1} vs {t2}: same home team in both matches")

        # Check no consecutive reverse fixtures
        for t1, t2 in combinations(teams, 2):
            h2h = [f for f in div_fixtures
                   if (f.home_team == t1 and f.away_team == t2) or
                      (f.home_team == t2 and f.away_team == t1)]
            if len(h2h) == 2:
                weeks = sorted([f.week for f in h2h])
                if weeks[1] - weeks[0] == 1:
                    issues.append(f"{t1} vs {t2}: consecutive reverse fixtures in weeks {weeks}")

        # Check no MAX_CONSECUTIVE_SAME_VENUE+ consecutive home or away games.
        # Bye weeks are skipped rather than treated as away, so away/away/bye/away
        # counts as 3 in a row and away/away/bye/away/away counts as 4.
        for team in teams:
            week_venue = {}
            for f in div_fixtures:
                if f.home_team == team:
                    week_venue[f.week] = "H"
                elif f.away_team == team:
                    week_venue[f.week] = "A"

            run: list[tuple[int, str]] = []
            for week, venue in sorted(week_venue.items()):
                if run and venue != run[-1][1]:
                    run = []
                run.append((week, venue))
                if len(run) == MAX_CONSECUTIVE_SAME_VENUE:
                    venue_name = "home" if venue == "H" else "away"
                    weeks_in_run = [w for w, _ in run]
                    issues.append(
                        f"{team}: {MAX_CONSECUTIVE_SAME_VENUE} consecutive "
                        f"{venue_name} games in weeks {weeks_in_run}"
                    )

    return issues


class CrossDivisionCoordinator:
    """
    Coordinates ground sharing across divisions.
    Checks and reports cross-division ground sharing violations.
    """

    def __init__(self, venue_conflicts: list[tuple[str, str]]):
        """
        Initialize with explicit venue conflicts from venConflicts.csv.

        Args:
            venue_conflicts: List of (team1, team2) tuples that share a venue/pitch
        """
        self.ground_sharing_pairs = venue_conflicts

    def check_violations(self, fixtures: list[Fixture]) -> list[str]:
        """Check for ground sharing violations across divisions."""
        team_home_weeks: dict[str, set[int]] = defaultdict(set)
        for f in fixtures:
            team_home_weeks[f.home_team].add(f.week)

        violations = []
        for t1, t2 in self.ground_sharing_pairs:
            t1_home = team_home_weeks[t1]
            t2_home = team_home_weeks[t2]
            conflict_weeks = t1_home & t2_home
            if conflict_weeks:
                violations.append(
                    f"Ground sharing conflict: {t1} and {t2} both home in weeks {sorted(conflict_weeks)}"
                )

        return violations
