"""
Ground sharing analysis functions.

DEPRECATED: This module is no longer used in the fixture generator.
Ground sharing/venue conflicts are now explicitly defined in data/venConflicts.csv
and loaded via data_loading.load_venue_conflicts().

This file is kept for reference only and may be removed in the future.
"""

from collections import defaultdict
from itertools import combinations

from .models import Division, Team


def build_ground_sharing_pairs(divisions: list[Division]) -> list[tuple[str, str]]:
    """
    Build list of team pairs that share a ground.

    Teams share a ground based on their number within the same club:
    - Teams 1 & 2 share (e.g., BAP1, BAP2)
    - Teams 3 & 4 share (e.g., BAP3, BAP4)
    - Teams 5 & 6 share (e.g., BAP5, BAP6)
    - Teams 7 & 8 share (e.g., BAP7, BAP8)

    Returns: List of (team1_code, team2_code) tuples.
    """
    # Group all teams by club
    club_teams: dict[str, list[Team]] = defaultdict(list)
    for division in divisions:
        for team in division.teams:
            club_teams[team.club].append(team)

    pairs = []
    for _club, teams in club_teams.items():
        # Group by ground sharing group
        by_group: dict[int, list[Team]] = defaultdict(list)
        for team in teams:
            by_group[team.ground_sharing_group()].append(team)

        # Create pairs within each group
        for group_teams in by_group.values():
            if len(group_teams) >= 2:
                for t1, t2 in combinations(group_teams, 2):
                    pairs.append((t1.code, t2.code))

    return pairs
