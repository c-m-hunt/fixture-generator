"""
Ground sharing analysis functions.
"""

from collections import defaultdict
from itertools import combinations

from .models import Division, Team


def get_division_tier(division_name: str) -> int:
    """Get tier number from division name."""
    if "1st XI" in division_name:
        return 1
    elif "2nd XI" in division_name:
        return 2
    elif "3rd XI" in division_name:
        return 3
    return 4


def build_ground_sharing_pairs(divisions: list[Division]) -> list[tuple[str, str, int]]:
    """
    Build list of team pairs that share a ground.
    Returns: List of (team1_code, team2_code, max_tier) tuples.
    max_tier is the highest (lowest number) tier between the two teams.
    """
    # Group all teams by club
    club_teams: dict[str, list[Team]] = defaultdict(list)
    for division in divisions:
        for team in division.teams:
            club_teams[team.club].append(team)

    pairs = []
    for club, teams in club_teams.items():
        # Group by ground sharing group
        by_group: dict[int, list[Team]] = defaultdict(list)
        for team in teams:
            by_group[team.ground_sharing_group()].append(team)

        # Create pairs within each group
        for group_teams in by_group.values():
            if len(group_teams) >= 2:
                for t1, t2 in combinations(group_teams, 2):
                    max_tier = min(
                        get_division_tier(t1.division),
                        get_division_tier(t2.division)
                    )
                    pairs.append((t1.code, t2.code, max_tier))

    return pairs
