#!/usr/bin/env python3
"""
Analyze fixture schedule for constraint violations and statistics.
"""

import csv
from collections import defaultdict
from pathlib import Path


def load_fixtures(filepath):
    """Load fixtures from CSV file."""
    fixtures = []
    with open(filepath, 'r') as f:
        # Skip comment lines starting with # (main.py writes the seed as a comment)
        lines = [line for line in f if not line.startswith('#')]
        reader = csv.DictReader(lines)
        for row in reader:
            if not row.get('game_week'):  # Skip blank rows
                continue

            fixtures.append({
                'game_week': int(row['game_week']),
                'home_team': row['home_team'],
                'away_team': row['away_team'],
                'division': row['division']
            })
    return fixtures


def load_venue_requirements(filepath):
    """Load venue requirements from CSV file."""
    requirements = []
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            requirements.append({
                'team': row[0],
                'venue': row[1],  # 'h' or 'a'
                'game_week': int(row[2])
            })
    return requirements


def load_venue_conflicts(filepath):
    """Load venue conflicts (teams that can't both be home same week)."""
    conflicts = []
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            conflicts.append((row[0], row[1]))
    return conflicts


def load_fixed_requirements(filepath):
    """Load fixed match requirements from CSV file."""
    requirements = []
    try:
        with open(filepath, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                requirements.append({
                    'game_week': int(row[0]),
                    'team1': row[1],
                    'team2': row[2]
                })
    except FileNotFoundError:
        pass  # File is optional
    return requirements


def build_team_schedules(fixtures):
    """Build schedule for each team showing home/away by game week."""
    schedules = defaultdict(dict)

    for fixture in fixtures:
        game_week = fixture['game_week']
        home_team = fixture['home_team']
        away_team = fixture['away_team']

        schedules[home_team][game_week] = 'h'
        schedules[away_team][game_week] = 'a'

    return schedules


def find_max_consecutive_venue(schedules):
    """Find maximum consecutive games at same venue for each team."""
    results = {}

    for team, schedule in schedules.items():
        # Get sorted game weeks
        weeks = sorted(schedule.keys())

        if not weeks:
            continue

        max_home_streak = 1
        max_away_streak = 1
        current_home_streak = 0
        current_away_streak = 0

        for week in weeks:
            venue = schedule[week]

            if venue == 'h':
                current_home_streak += 1
                current_away_streak = 0
                max_home_streak = max(max_home_streak, current_home_streak)
            else:  # 'a'
                current_away_streak += 1
                current_home_streak = 0
                max_away_streak = max(max_away_streak, current_away_streak)

        results[team] = {
            'max_home': max_home_streak,
            'max_away': max_away_streak,
            'max_overall': max(max_home_streak, max_away_streak)
        }

    return results


def check_venue_requirements(schedules, requirements):
    """Check if all venue requirements are satisfied."""
    violations = []

    for req in requirements:
        team = req['team']
        required_venue = req['venue']
        game_week = req['game_week']

        if team not in schedules:
            violations.append({
                'team': team,
                'game_week': game_week,
                'required': required_venue,
                'actual': 'NO GAME',
                'error': 'Team not found in fixtures'
            })
            continue

        if game_week not in schedules[team]:
            violations.append({
                'team': team,
                'game_week': game_week,
                'required': required_venue,
                'actual': 'NO GAME',
                'error': 'No game scheduled for this week'
            })
            continue

        actual_venue = schedules[team][game_week]
        if actual_venue != required_venue:
            violations.append({
                'team': team,
                'game_week': game_week,
                'required': required_venue,
                'actual': actual_venue,
                'error': 'Venue mismatch'
            })

    return violations


def check_venue_conflicts(schedules, conflicts):
    """Check if any conflicting teams are both home on the same week."""
    violations = []

    for team1, team2 in conflicts:
        # Check if both teams exist
        if team1 not in schedules or team2 not in schedules:
            continue

        # Check each game week
        for game_week in range(1, 19):  # Weeks 1-18
            if game_week in schedules[team1] and game_week in schedules[team2]:
                venue1 = schedules[team1][game_week]
                venue2 = schedules[team2][game_week]

                if venue1 == 'h' and venue2 == 'h':
                    violations.append({
                        'team1': team1,
                        'team2': team2,
                        'game_week': game_week,
                        'error': 'Both teams playing at home'
                    })

    return violations


def check_fixed_requirements(fixtures, requirements):
    """Check if all fixed match requirements are satisfied."""
    violations = []

    # Build a map of (game_week, team1, team2) tuples for quick lookup
    fixture_set = set()
    for fixture in fixtures:
        gw = fixture['game_week']
        home = fixture['home_team']
        away = fixture['away_team']
        # Add both orderings since requirement doesn't specify home/away
        fixture_set.add((gw, home, away))
        fixture_set.add((gw, away, home))

    for req in requirements:
        gw = req['game_week']
        team1 = req['team1']
        team2 = req['team2']

        # Check if either ordering exists
        if (gw, team1, team2) not in fixture_set and (gw, team2, team1) not in fixture_set:
            violations.append({
                'game_week': gw,
                'team1': team1,
                'team2': team2,
                'error': 'Required match not found'
            })

    return violations


def check_no_consecutive_reverse(fixtures):
    """Check that reverse fixtures are not consecutive (A vs B week N, then B vs A week N+1)."""
    violations = []

    # Build a map of fixtures by teams
    fixtures_by_teams = defaultdict(list)
    for fixture in fixtures:
        gw = fixture['game_week']
        home = fixture['home_team']
        away = fixture['away_team']
        key = tuple(sorted([home, away]))
        fixtures_by_teams[key].append({
            'game_week': gw,
            'home': home,
            'away': away
        })

    # Check each pair of teams
    for teams, matches in fixtures_by_teams.items():
        if len(matches) != 2:
            continue  # Should be exactly 2 (home and away)

        matches = sorted(matches, key=lambda x: x['game_week'])
        week_gap = matches[1]['game_week'] - matches[0]['game_week']

        if week_gap == 1:
            violations.append({
                'team1': matches[0]['home'],
                'team2': matches[0]['away'],
                'week1': matches[0]['game_week'],
                'week2': matches[1]['game_week'],
                'error': 'Consecutive reverse fixtures'
            })

    return violations


def check_round_robin_completeness(fixtures):
    """Verify that every team in each division plays every other team exactly twice."""
    violations = []

    # Group fixtures by division
    by_division = defaultdict(list)
    for fixture in fixtures:
        by_division[fixture['division']].append(fixture)

    # Check each division
    for division, div_fixtures in by_division.items():
        # Get all teams in division
        teams = set()
        for fixture in div_fixtures:
            teams.add(fixture['home_team'])
            teams.add(fixture['away_team'])

        if len(teams) != 10:
            violations.append({
                'division': division,
                'error': f'Division has {len(teams)} teams, expected 10'
            })
            continue

        # Check matchups
        matchup_count = defaultdict(int)
        home_away_count = defaultdict(lambda: {'home': 0, 'away': 0})

        for fixture in div_fixtures:
            home = fixture['home_team']
            away = fixture['away_team']
            key = tuple(sorted([home, away]))
            matchup_count[key] += 1
            home_away_count[(home, away)]['home'] += 1
            home_away_count[(away, home)]['away'] += 1

        # Every pair should play exactly twice
        expected_pairs = len(teams) * (len(teams) - 1) // 2
        if len(matchup_count) != expected_pairs:
            violations.append({
                'division': division,
                'error': f'Found {len(matchup_count)} matchups, expected {expected_pairs}'
            })

        # Check for wrong counts
        for (team1, team2), count in matchup_count.items():
            if count != 2:
                violations.append({
                    'division': division,
                    'team1': team1,
                    'team2': team2,
                    'count': count,
                    'error': f'Teams play {count} times, expected 2'
                })

        # Check home/away balance for each matchup
        for (team1, team2), counts in home_away_count.items():
            if counts['home'] != 1 or counts['away'] != 1:
                violations.append({
                    'division': division,
                    'team1': team1,
                    'team2': team2,
                    'error': f'{team1} home {counts["home"]}x, away {counts["away"]}x vs {team2}'
                })

    return violations


def check_home_away_balance(schedules):
    """Check that each team has exactly 9 home and 9 away games."""
    violations = []

    for team, schedule in schedules.items():
        home_count = sum(1 for v in schedule.values() if v == 'h')
        away_count = sum(1 for v in schedule.values() if v == 'a')
        total_count = len(schedule)

        if total_count != 18:
            violations.append({
                'team': team,
                'home': home_count,
                'away': away_count,
                'total': total_count,
                'error': f'Has {total_count} games, expected 18'
            })
        elif home_count != 9 or away_count != 9:
            violations.append({
                'team': team,
                'home': home_count,
                'away': away_count,
                'error': 'Unbalanced home/away (expected 9 each)'
            })

    return violations


def get_consecutive_distribution(consecutive_stats):
    """Get distribution of maximum consecutive games."""
    distribution = defaultdict(int)
    for stats in consecutive_stats.values():
        max_val = stats['max_overall']
        distribution[max_val] += 1
    return dict(sorted(distribution.items()))


def main():
    # Setup paths
    base_dir = Path(__file__).parent.parent
    fixtures_file = base_dir / 'output' / 'fixtures.csv'
    venreq_file = base_dir / 'data' / 'venReq.csv'
    venconflicts_file = base_dir / 'data' / 'venConflicts.csv'
    fixreq_file = base_dir / 'data' / 'fixReq.csv'

    print("=" * 80)
    print("FIXTURE SCHEDULE ANALYSIS")
    print("=" * 80)
    print()

    # Load data
    print("Loading data...")
    fixtures = load_fixtures(fixtures_file)
    venue_requirements = load_venue_requirements(venreq_file)
    venue_conflicts = load_venue_conflicts(venconflicts_file)
    fixed_requirements = load_fixed_requirements(fixreq_file)

    # Build team schedules
    schedules = build_team_schedules(fixtures)

    print(f"Loaded {len(fixtures)} fixtures")
    print(f"Found {len(schedules)} teams")
    print(f"Loaded {len(venue_requirements)} venue requirements")
    print(f"Loaded {len(venue_conflicts)} venue conflict pairs")
    if fixed_requirements:
        print(f"Loaded {len(fixed_requirements)} fixed match requirements")
    print()

    # 1. Maximum consecutive venue analysis
    print("=" * 80)
    print("1. MAXIMUM CONSECUTIVE GAMES AT SAME VENUE")
    print("=" * 80)
    print()

    consecutive_stats = find_max_consecutive_venue(schedules)

    # Find worst offenders
    by_max_overall = sorted(consecutive_stats.items(),
                           key=lambda x: x[1]['max_overall'],
                           reverse=True)

    # Show teams with 4+ consecutive
    critical = [t for t, s in by_max_overall if s['max_overall'] >= 4]
    warning = [t for t, s in by_max_overall if s['max_overall'] == 3]

    if critical:
        print(f"⚠️  CRITICAL: {len(critical)} teams with 4+ consecutive games at same venue:")
        print()
        for team in critical[:20]:  # Show top 20
            stats = consecutive_stats[team]
            print(f"  {team:8s}: {stats['max_overall']} consecutive "
                  f"(Home: {stats['max_home']}, Away: {stats['max_away']})")
        if len(critical) > 20:
            print(f"  ... and {len(critical) - 20} more")
    else:
        print("✓ No teams with 4+ consecutive games at same venue")

    print()

    if warning:
        print(f"⚠️  WARNING: {len(warning)} teams with exactly 3 consecutive games:")
        print()
        for team in warning[:20]:  # Show top 20
            stats = consecutive_stats[team]
            print(f"  {team:8s}: {stats['max_overall']} consecutive "
                  f"(Home: {stats['max_home']}, Away: {stats['max_away']})")
        if len(warning) > 20:
            print(f"  ... and {len(warning) - 20} more")
    else:
        print("✓ No teams with exactly 3 consecutive games")

    print()

    # Overall statistics
    max_of_all = max(s['max_overall'] for s in consecutive_stats.values())
    print(f"Maximum consecutive games at same venue (any team): {max_of_all}")
    print()

    # 2. Venue requirements check
    print("=" * 80)
    print("2. VENUE REQUIREMENTS VERIFICATION")
    print("=" * 80)
    print()

    venreq_violations = check_venue_requirements(schedules, venue_requirements)

    if venreq_violations:
        print(f"❌ VIOLATIONS FOUND: {len(venreq_violations)} venue requirements not satisfied")
        print()
        for v in venreq_violations[:30]:  # Show first 30
            print(f"  Week {v['game_week']:2d}: {v['team']:8s} "
                  f"required '{v['required']}', got '{v['actual']}' - {v['error']}")
        if len(venreq_violations) > 30:
            print(f"  ... and {len(venreq_violations) - 30} more violations")
    else:
        print(f"✓ All {len(venue_requirements)} venue requirements satisfied")

    print()

    # 3. Venue conflicts check
    print("=" * 80)
    print("3. VENUE CONFLICTS VERIFICATION (Ground Sharing)")
    print("=" * 80)
    print()

    venconflict_violations = check_venue_conflicts(schedules, venue_conflicts)

    if venconflict_violations:
        print(f"❌ VIOLATIONS FOUND: {len(venconflict_violations)} venue conflicts detected")
        print()
        for v in venconflict_violations[:30]:  # Show first 30
            print(f"  Week {v['game_week']:2d}: {v['team1']:8s} and {v['team2']:8s} "
                  f"both at home - {v['error']}")
        if len(venconflict_violations) > 30:
            print(f"  ... and {len(venconflict_violations) - 30} more violations")
    else:
        print(f"✓ No venue conflicts - all {len(venue_conflicts)} conflict pairs respected")

    print()

    # Show distribution
    distribution = get_consecutive_distribution(consecutive_stats)
    print("Distribution of maximum consecutive games:")
    for max_consecutive, count in distribution.items():
        print(f"  {max_consecutive} consecutive: {count} teams")
    print()

    # 4. Fixed match requirements check (if available)
    if fixed_requirements:
        print("=" * 80)
        print("4. FIXED MATCH REQUIREMENTS VERIFICATION")
        print("=" * 80)
        print()

        fixreq_violations = check_fixed_requirements(fixtures, fixed_requirements)

        if fixreq_violations:
            print(f"❌ VIOLATIONS FOUND: {len(fixreq_violations)} fixed requirements not satisfied")
            print()
            for v in fixreq_violations[:30]:
                print(f"  Week {v['game_week']:2d}: {v['team1']:8s} vs {v['team2']:8s} - {v['error']}")
            if len(fixreq_violations) > 30:
                print(f"  ... and {len(fixreq_violations) - 30} more violations")
        else:
            print(f"✓ All {len(fixed_requirements)} fixed match requirements satisfied")

        print()

    # 5. No consecutive reverse fixtures check
    next_section = 5 if fixed_requirements else 4
    print("=" * 80)
    print(f"{next_section}. NO CONSECUTIVE REVERSE FIXTURES CHECK")
    print("=" * 80)
    print()

    reverse_violations = check_no_consecutive_reverse(fixtures)

    if reverse_violations:
        print(f"❌ VIOLATIONS FOUND: {len(reverse_violations)} consecutive reverse fixture violations")
        print()
        for v in reverse_violations[:30]:
            print(f"  {v['team1']:8s} vs {v['team2']:8s} in weeks {v['week1']} and {v['week2']} - {v['error']}")
        if len(reverse_violations) > 30:
            print(f"  ... and {len(reverse_violations) - 30} more violations")
    else:
        print("✓ No consecutive reverse fixtures detected")

    print()

    # 6. Round robin completeness check
    next_section += 1
    print("=" * 80)
    print(f"{next_section}. ROUND ROBIN COMPLETENESS CHECK")
    print("=" * 80)
    print()

    rr_violations = check_round_robin_completeness(fixtures)

    if rr_violations:
        print(f"❌ VIOLATIONS FOUND: {len(rr_violations)} round robin issues")
        print()
        for v in rr_violations[:30]:
            div = v.get('division', 'N/A')
            if 'team1' in v:
                print(f"  {div}: {v['team1']:8s} vs {v['team2']:8s} - {v['error']}")
            else:
                print(f"  {div}: {v['error']}")
        if len(rr_violations) > 30:
            print(f"  ... and {len(rr_violations) - 30} more violations")
    else:
        print("✓ All divisions have complete round robin schedules")

    print()

    # 7. Home/Away balance check
    next_section += 1
    print("=" * 80)
    print(f"{next_section}. HOME/AWAY BALANCE CHECK")
    print("=" * 80)
    print()

    balance_violations = check_home_away_balance(schedules)

    if balance_violations:
        print(f"❌ VIOLATIONS FOUND: {len(balance_violations)} teams with unbalanced schedules")
        print()
        for v in balance_violations[:30]:
            print(f"  {v['team']:8s}: {v['home']} home, {v['away']} away - {v['error']}")
        if len(balance_violations) > 30:
            print(f"  ... and {len(balance_violations) - 30} more violations")
    else:
        print(f"✓ All {len(schedules)} teams have balanced schedules (9 home, 9 away)")

    print()

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()

    fixreq_violations = check_fixed_requirements(fixtures, fixed_requirements) if fixed_requirements else []

    total_critical_issues = (
        len(critical) +
        len(venreq_violations) +
        len(venconflict_violations) +
        len(fixreq_violations) +
        len(reverse_violations) +
        len(rr_violations) +
        len(balance_violations)
    )

    total_warnings = len(warning)

    if total_critical_issues == 0 and total_warnings == 0:
        print("✅ ALL CONSTRAINTS SATISFIED! Perfect schedule.")
    else:
        print(f"Issues found:")
        print()
        print("HARD CONSTRAINT VIOLATIONS:")
        print(f"  - Round robin completeness: {len(rr_violations)}")
        if fixed_requirements:
            print(f"  - Fixed match requirements: {len(fixreq_violations)}")
        print(f"  - Venue requirements: {len(venreq_violations)}")
        print(f"  - Consecutive reverse fixtures: {len(reverse_violations)}")
        print(f"  - Teams with 4+ consecutive at venue: {len(critical)}")
        print()
        print("SOFT CONSTRAINT VIOLATIONS:")
        print(f"  - Teams with 3 consecutive at venue: {len(warning)}")
        print(f"  - Venue conflicts (ground sharing): {len(venconflict_violations)}")
        print(f"  - Home/away balance issues: {len(balance_violations)}")
        print()
        print(f"Total critical issues: {total_critical_issues}")
        print(f"Total warnings: {total_warnings}")

    print()


if __name__ == '__main__':
    main()
