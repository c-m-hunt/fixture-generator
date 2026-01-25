"""
Validation functions for generated fixtures.
"""

from collections import defaultdict
from itertools import combinations

from .ground_sharing import build_ground_sharing_pairs
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

            # For 11-team divisions, don't check exact home/away balance (bye weeks make it impossible)
            # Just check that teams play a reasonable mix
            for team in teams:
                home_games = [f for f in div_fixtures if f.home_team == team]
                away_games = [f for f in div_fixtures if f.away_team == team]
                total_games = len(home_games) + len(away_games)
                # Allow some imbalance, but not too extreme (at least 6 of each for 16 games)
                if total_games >= 16:
                    if len(home_games) < 6 or len(away_games) < 6:
                        issues.append(f"{team}: unbalanced home/away ({len(home_games)}H/{len(away_games)}A)")

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

        # Check no 4+ consecutive home or away
        for team in teams:
            week_venue = {}
            for f in div_fixtures:
                if f.home_team == team:
                    week_venue[f.week] = "H"
                elif f.away_team == team:
                    week_venue[f.week] = "A"

            sequence = [week_venue.get(w, "?") for w in range(1, 19)]

            for i in range(15):
                window = sequence[i:i+4]
                if window == ["H", "H", "H", "H"]:
                    issues.append(f"{team}: 4 consecutive home games starting week {i+1}")
                elif window == ["A", "A", "A", "A"]:
                    issues.append(f"{team}: 4 consecutive away games starting week {i+1}")

    return issues


class CrossDivisionCoordinator:
    """
    Coordinates ground sharing across divisions.
    Checks and reports cross-division ground sharing violations.
    """

    def __init__(self, divisions: list[Division]):
        self.divisions = divisions
        self.ground_sharing_pairs = build_ground_sharing_pairs(divisions)

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
