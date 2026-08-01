#!/usr/bin/env python3
"""
Analyze venue requirements and conflicts to find potential blockers.

A blocker occurs when:
1. Two teams in the same division both have strict requirements and can't find 2 compatible weeks
2. Teams with venue conflicts have incompatible requirements
3. Over-constrained situations with 3-way conflicts
"""

import csv
from collections import defaultdict
from pathlib import Path


def load_divisions(filepath):
    """Load divisions from CSV."""
    divisions = {}
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0]:
                div_name = row[0]
                teams = [t for t in row[1:] if t and t != 'BYE1']
                divisions[div_name] = teams
    return divisions


def load_venue_requirements(filepath):
    """Load venue requirements. Returns dict of team -> list of (week, venue)."""
    requirements = defaultdict(list)
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and len(row) >= 3:
                team = row[0]
                venue = row[1]  # 'h' or 'a'
                week = int(row[2])
                requirements[team].append((week, venue))
    return requirements


def load_venue_conflicts(filepath):
    """Load venue conflicts."""
    conflicts = []
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                t1, t2 = row[0].strip(), row[1].strip()
                if t1 and t2:
                    conflicts.append((t1, t2))
    return conflicts


def get_venue_pattern(team, requirements):
    """Get the home/away pattern for a team (18 weeks)."""
    pattern = {}
    for week, venue in requirements.get(team, []):
        pattern[week] = venue
    return pattern


def can_teams_play(team1, pattern1, team2, pattern2):
    """Check if two teams can play each other twice given their patterns."""
    # Find weeks where they can play (one home, one away)
    possible_weeks = []
    for week in range(1, 19):
        v1 = pattern1.get(week)
        v2 = pattern2.get(week)

        if v1 is None or v2 is None:
            # At least one team is flexible this week
            possible_weeks.append((week, 'flexible'))
        elif (v1 == 'h' and v2 == 'a') or (v1 == 'a' and v2 == 'h'):
            # Compatible: one home, one away
            possible_weeks.append((week, 'compatible'))

    # Count how many ways they can play home and away
    team1_home_weeks = [w for w, _ in possible_weeks if pattern1.get(w) == 'h' or pattern1.get(w) is None]
    team2_home_weeks = [w for w, _ in possible_weeks if pattern2.get(w) == 'h' or pattern2.get(w) is None]

    return possible_weeks, len(team1_home_weeks), len(team2_home_weeks)


def main():
    base_dir = Path(__file__).parent.parent

    divisions = load_divisions(base_dir / 'data' / 'divisions.csv')
    requirements = load_venue_requirements(base_dir / 'data' / 'venReq.csv')
    conflicts = load_venue_conflicts(base_dir / 'data' / 'venConflicts.csv')

    # Build conflict map
    conflict_map = defaultdict(set)
    for t1, t2 in conflicts:
        conflict_map[t1].add(t2)
        conflict_map[t2].add(t1)

    print("=" * 80)
    print("CONSTRAINT ANALYSIS - POTENTIAL BLOCKERS")
    print("=" * 80)
    print()

    # Check 1: Teams with complete venue requirements (all 18 weeks)
    print("Teams with complete venue requirements (most constrained):")
    complete_teams = []
    for team, reqs in requirements.items():
        if len(reqs) == 18:
            pattern = ''.join([v for _, v in sorted(reqs)])
            complete_teams.append((team, pattern))
            print(f"  {team}: {pattern}")
    print()

    # Check 2: Duplicate patterns (impossible to schedule in same division)
    print("Checking for duplicate patterns in same division:")
    pattern_to_teams = defaultdict(list)
    for team, pattern in complete_teams:
        pattern_to_teams[pattern].append(team)

    duplicates_found = False
    for pattern, teams in pattern_to_teams.items():
        if len(teams) > 1:
            # Check if any are in the same division
            for div_name, div_teams in divisions.items():
                teams_in_div = [t for t in teams if t in div_teams]
                if len(teams_in_div) > 1:
                    print(f"  ⚠️  BLOCKER: {teams_in_div} in {div_name} have identical pattern: {pattern}")
                    duplicates_found = True

    if not duplicates_found:
        print("  ✓ No duplicate patterns in same division")
    print()

    # Check 3: Teams in same division with limited compatibility
    print("Checking within-division compatibility for constrained teams:")
    for div_name, div_teams in divisions.items():
        # Get teams with any requirements in this division
        constrained = [t for t in div_teams if t in requirements]

        if len(constrained) >= 2:
            print(f"\n  {div_name} has {len(constrained)} constrained teams: {constrained}")

            for i, t1 in enumerate(constrained):
                for t2 in constrained[i+1:]:
                    p1 = get_venue_pattern(t1, requirements)
                    p2 = get_venue_pattern(t2, requirements)

                    possible, t1_home, t2_home = can_teams_play(t1, p1, t2, p2)

                    if len(possible) < 2:
                        print(f"    ⚠️  BLOCKER: {t1} vs {t2} - only {len(possible)} possible weeks!")
                    elif t1_home < 1 or t2_home < 1:
                        print(f"    ⚠️  BLOCKER: {t1} vs {t2} - can't complete home/away (t1_home={t1_home}, t2_home={t2_home})")
                    elif len(possible) < 4:
                        print(f"    ⚠️  WARNING: {t1} vs {t2} - only {len(possible)} possible weeks (tight)")
                    else:
                        print(f"    ✓ {t1} vs {t2} - {len(possible)} possible weeks")
    print()

    # Check 4: Venue conflicts with incompatible requirements
    print("Checking venue conflicts for incompatible requirements:")
    conflict_issues = []
    for t1, t2 in conflicts:
        if t1 in requirements and t2 in requirements:
            p1 = get_venue_pattern(t1, requirements)
            p2 = get_venue_pattern(t2, requirements)

            # Check for weeks where both are home
            both_home = []
            for week in range(1, 19):
                if p1.get(week) == 'h' and p2.get(week) == 'h':
                    both_home.append(week)

            if both_home:
                conflict_issues.append((t1, t2, both_home))
                print(f"  ⚠️  CONFLICT: {t1} and {t2} both home in weeks {both_home}")

    if not conflict_issues:
        print("  ✓ No conflicts between venue requirements")
    print()

    # Check 5: 3-way conflicts with constraints
    print("Checking 3-way conflicts for over-constraint:")
    chains = []
    for team_a in sorted(conflict_map.keys()):
        for team_b in sorted(conflict_map[team_a]):
            for team_c in sorted(conflict_map[team_b]):
                if team_c != team_a and team_c not in conflict_map[team_a]:
                    chain = tuple(sorted([team_a, team_b, team_c]))
                    if chain not in chains:
                        chains.append(chain)
                        # Check if middle team has requirements
                        if team_a in requirements or team_b in requirements or team_c in requirements:
                            constrained = [t for t in [team_a, team_b, team_c] if t in requirements]
                            print(f"  {team_a}--{team_b}--{team_c}: {len(constrained)} constrained ({constrained})")

    if not chains:
        print("  ✓ No 3-way conflicts found")
    print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total teams with requirements: {len(requirements)}")
    print(f"Teams with complete requirements (18 weeks): {len(complete_teams)}")
    print(f"Venue conflict pairs: {len(conflicts)}")
    print(f"3-way conflict chains: {len(chains)}")

    if duplicates_found or conflict_issues:
        print("\n⚠️  POTENTIAL BLOCKERS FOUND - review issues above")
    else:
        print("\n✓ No obvious blockers detected")


if __name__ == '__main__':
    main()
