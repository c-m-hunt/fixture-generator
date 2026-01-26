"""
Fixture Generator using CP-SAT constraint programming.
"""

import random
from collections import defaultdict
from itertools import combinations

from ortools.sat.python import cp_model

from .config import (
    CONSECUTIVE_3_PENALTY,
    FULL_18_WEEK_TIME_MULTIPLIER,
    MAX_CONSECUTIVE_SAME_VENUE,
    NUM_SEARCH_WORKERS,
    RANDOM_SEED_RANGE,
    SOLVER_TIME_LIMIT,
)
from .models import Division, FixedMatch, Fixture, VenueRequirement


class FixtureGenerator:
    """
    Generates fixtures for all divisions using a unified CP-SAT model.

    Uses constraint programming to satisfy hard constraints (round-robin,
    fixed matches, venue requirements, no 4+ consecutive) and minimize
    soft constraint violations (ground sharing, 3 consecutive).
    """

    def __init__(
        self,
        divisions: list[Division],
        fixed_matches: list[FixedMatch],
        venue_requirements: list[VenueRequirement],
        venue_conflicts: list[tuple[str, str]] | None = None,
    ):
        self.divisions = divisions
        self.fixed_matches = fixed_matches
        self.venue_requirements = venue_requirements
        # venue_conflicts now includes ALL ground sharing pairs (same-club and cross-club)
        # loaded from venConflicts.csv
        self.ground_sharing_pairs = venue_conflicts or []

        # Build lookup structures
        self.team_to_division: dict[str, Division] = {}
        for div in divisions:
            for team in div.teams:
                self.team_to_division[team.code] = div

        # Venue requirements by team and week
        self.venue_req_lookup: dict[tuple[str, int], str] = {}
        for req in venue_requirements:
            self.venue_req_lookup[(req.team, req.week)] = req.venue

        # Fixed matches by week
        self.fixed_match_lookup: dict[int, list[FixedMatch]] = defaultdict(list)
        for fm in fixed_matches:
            self.fixed_match_lookup[fm.week].append(fm)

        # All teams
        self.all_teams = [t.code for div in divisions for t in div.teams]

    def generate(self, seed: int | None = None) -> tuple[list[Fixture], int]:
        """Generate complete fixture list for all divisions.

        Tries mirrored approach first (faster, guarantees home/away balance).
        Falls back to full 18-week scheduling if mirrored approach fails.
        For divisions with 11 teams (bye weeks), only uses full 18-week approach.

        Args:
            seed: Optional random seed for reproducible but varied fixture generation.
                  Different seeds produce different valid fixture sets.

        Returns:
            Tuple of (fixtures, seed) where seed is the seed that was used (either provided or generated).
        """
        if seed is None:
            seed = random.randint(*RANDOM_SEED_RANGE)
            print(f"Generated random seed: {seed}")
        else:
            print(f"Using seed: {seed}")

        random.seed(seed)

        # Check if any division has 11 teams (requires bye weeks)
        has_bye_divisions = any(div.has_bye_weeks for div in self.divisions)
        if has_bye_divisions:
            bye_divs = [div.name for div in self.divisions if div.has_bye_weeks]
            print(f"  → Divisions with 11 teams detected: {', '.join(bye_divs)}")
            print("  → Skipping mirrored approach (not compatible with bye weeks), using full 18-week schedule...")
        else:
            # Check if mirrored approach is viable
            print("Attempting mirrored schedule (weeks 1-9, mirrored to 10-18)...")
            mirroring_conflicts = self._check_mirroring_conflicts()

            if mirroring_conflicts:
                print(f"  ✗ Mirrored approach not viable due to {len(mirroring_conflicts)} venue requirement conflicts:")
                for team, conflicts in mirroring_conflicts.items():
                    print(f"     {team}: {conflicts}")
                print("  → Skipping mirrored approach, using full 18-week schedule...")
            else:
                fixtures = self._generate_mirrored(seed)
                if fixtures:
                    print("  ✓ Mirrored schedule successful!")
                    return fixtures, seed
                print("  ✗ Mirrored schedule failed (solver couldn't find solution), trying full 18-week schedule...")

        fixtures = self._generate_full_18_weeks(seed)
        if fixtures:
            print("  ✓ Full 18-week schedule successful!")
            return fixtures, seed

        print("  ✗ No solution found with either approach!")
        return [], seed

    def _check_mirroring_conflicts(self) -> dict[str, str]:
        """
        Check if venue requirements conflict with mirrored scheduling.

        In a mirrored schedule, week X (1-9) mirrors to week X+9 (10-18) with home/away swapped.
        A conflict occurs when a team has the same venue requirement in both mirrored weeks.

        Returns:
            Dictionary mapping team codes to conflict descriptions.
        """
        conflicts = {}

        # Group venue requirements by team
        team_requirements: dict[str, dict[int, bool]] = defaultdict(dict)
        for req in self.venue_requirements:
            team_requirements[req.team][req.week] = (req.venue == "h")

        # Check each team for mirroring conflicts
        for team, weeks in team_requirements.items():
            team_conflicts = []

            # Check weeks 1-9 against their mirrors (10-18)
            for week in range(1, 10):
                mirror_week = week + 9

                if week in weeks and mirror_week in weeks:
                    # Both weeks have requirements
                    if weeks[week] == weeks[mirror_week]:
                        # Same requirement in both weeks = conflict
                        venue = "home" if weeks[week] else "away"
                        team_conflicts.append(f"weeks {week} and {mirror_week} both require {venue}")

            if team_conflicts:
                conflicts[team] = "; ".join(team_conflicts)

        return conflicts

    def _generate_mirrored(self, seed: int | None) -> list[Fixture]:
        """Generate fixtures using mirrored approach (weeks 1-9 mirrored to 10-18)."""
        if seed is not None:
            random.seed(seed)

        model = cp_model.CpModel()
        weeks_first_half = list(range(1, 10))  # Weeks 1-9

        # Variables
        week_var: dict[tuple[str, str, str], cp_model.IntVar] = {}
        home_var: dict[tuple[str, str, str], cp_model.IntVar] = {}
        is_home: dict[tuple[str, int], cp_model.IntVar] = {}

        # Create variables for each team's home status per week
        for team in self.all_teams:
            for week in weeks_first_half:
                is_home[(team, week)] = model.NewBoolVar(f"home_{team}_{week}")

        # Create variables for each division's matchups
        div_matchups: dict[str, list[tuple[str, str]]] = {}
        for div in self.divisions:
            teams = [t.code for t in div.teams]
            if seed is not None:
                random.shuffle(teams)
            matchups = list(combinations(teams, 2))
            if seed is not None:
                random.shuffle(matchups)
            div_matchups[div.name] = matchups

            for t1, t2 in matchups:
                week_var[(div.name, t1, t2)] = model.NewIntVar(1, 9, f"week_{div.name}_{t1}_{t2}")
                home_var[(div.name, t1, t2)] = model.NewBoolVar(f"home_{div.name}_{t1}_{t2}")

        # Link variables
        team_home_indicators: dict[tuple[str, int], list] = defaultdict(list)
        for div in self.divisions:
            matchups = div_matchups[div.name]
            for t1, t2 in matchups:
                for week in weeks_first_half:
                    is_week = model.NewBoolVar(f"is_week_{div.name}_{t1}_{t2}_{week}")
                    model.Add(week_var[(div.name, t1, t2)] == week).OnlyEnforceIf(is_week)
                    model.Add(week_var[(div.name, t1, t2)] != week).OnlyEnforceIf(is_week.Not())

                    t1_home_this = model.NewBoolVar(f"t1h_{div.name}_{t1}_{t2}_{week}")
                    model.AddBoolAnd([is_week, home_var[(div.name, t1, t2)]]).OnlyEnforceIf(t1_home_this)
                    model.AddBoolOr([is_week.Not(), home_var[(div.name, t1, t2)].Not()]).OnlyEnforceIf(t1_home_this.Not())
                    team_home_indicators[(t1, week)].append(t1_home_this)

                    t2_home_this = model.NewBoolVar(f"t2h_{div.name}_{t1}_{t2}_{week}")
                    model.AddBoolAnd([is_week, home_var[(div.name, t1, t2)].Not()]).OnlyEnforceIf(t2_home_this)
                    model.AddBoolOr([is_week.Not(), home_var[(div.name, t1, t2)]]).OnlyEnforceIf(t2_home_this.Not())
                    team_home_indicators[(t2, week)].append(t2_home_this)

        for team in self.all_teams:
            for week in weeks_first_half:
                indicators = team_home_indicators[(team, week)]
                if indicators:
                    model.Add(is_home[(team, week)] == sum(indicators))

        # One game per week
        for div in self.divisions:
            teams = [t.code for t in div.teams]
            matchups = div_matchups[div.name]
            for team in teams:
                for week in weeks_first_half:
                    matchups_this_week = []
                    for t1, t2 in matchups:
                        if team in (t1, t2):
                            is_w = model.NewBoolVar(f"cnt_{div.name}_{team}_{t1}_{t2}_{week}")
                            model.Add(week_var[(div.name, t1, t2)] == week).OnlyEnforceIf(is_w)
                            model.Add(week_var[(div.name, t1, t2)] != week).OnlyEnforceIf(is_w.Not())
                            matchups_this_week.append(is_w)
                    model.Add(sum(matchups_this_week) == 1)

        # Fixed matches
        for fm in self.fixed_matches:
            for div in self.divisions:
                teams = [t.code for t in div.teams]
                if fm.team1 in teams and fm.team2 in teams:
                    matchups = div_matchups[div.name]
                    key = (div.name, fm.team1, fm.team2) if (fm.team1, fm.team2) in [(m[0], m[1]) for m in matchups] else (div.name, fm.team2, fm.team1)
                    if fm.week <= 9:
                        model.Add(week_var[key] == fm.week)
                    else:
                        model.Add(week_var[key] == fm.week - 9)
                    break

        # Venue requirements
        for (team, week), venue in self.venue_req_lookup.items():
            if team in self.all_teams:
                if week <= 9:
                    if venue == "h":
                        model.Add(is_home[(team, week)] == 1)
                    else:
                        model.Add(is_home[(team, week)] == 0)
                else:
                    mirror_week = week - 9
                    if venue == "h":
                        model.Add(is_home[(team, mirror_week)] == 0)
                    else:
                        model.Add(is_home[(team, mirror_week)] == 1)

        # Hard constraint: No MAX_CONSECUTIVE_SAME_VENUE consecutive home or away
        for team in self.all_teams:
            for start in range(1, 7):
                weeks_seq = [start, start + 1, start + 2, start + 3]
                home_vars = [is_home[(team, w)] for w in weeks_seq]
                # Can't have all MAX_CONSECUTIVE_SAME_VENUE home (sum must be <= MAX-1)
                model.Add(sum(home_vars) <= MAX_CONSECUTIVE_SAME_VENUE - 1)
                # Can't have all MAX_CONSECUTIVE_SAME_VENUE away (sum must be >= 1)
                model.Add(sum(home_vars) >= 1)

            # Cross-boundary sequences (weeks 7-9 to 1-4 wrapping around mirror point)
            model.Add(
                is_home[(team, 7)] + is_home[(team, 8)] + is_home[(team, 9)]
                + (1 - is_home[(team, 1)]) <= MAX_CONSECUTIVE_SAME_VENUE - 1
            )
            model.Add(is_home[(team, 1)] <= is_home[(team, 7)] + is_home[(team, 8)] + is_home[(team, 9)])

            model.Add(
                is_home[(team, 8)] + is_home[(team, 9)]
                + (1 - is_home[(team, 1)]) + (1 - is_home[(team, 2)]) <= MAX_CONSECUTIVE_SAME_VENUE - 1
            )
            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)]
                <= is_home[(team, 8)] + is_home[(team, 9)] + 1
            )

            model.Add(
                is_home[(team, 9)]
                + (1 - is_home[(team, 1)]) + (1 - is_home[(team, 2)]) + (1 - is_home[(team, 3)]) <= MAX_CONSECUTIVE_SAME_VENUE - 1
            )
            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)] + is_home[(team, 3)]
                <= is_home[(team, 9)] + 2
            )

            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)] + is_home[(team, 3)] + is_home[(team, 4)] >= 1
            )
            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)] + is_home[(team, 3)] + is_home[(team, 4)] <= MAX_CONSECUTIVE_SAME_VENUE - 1
            )

        # Hard constraint: Ground sharing (teams from same club can't both be home)
        # In mirrored approach, must constrain both weeks 1-9 AND their mirrors (10-18)
        # If both are away in week N, they'll both be home in week N+9 (mirror)
        for t1, t2 in self.ground_sharing_pairs:
            # Skip if either team is not in current divisions (e.g., cross-division conflicts)
            if t1 not in self.all_teams or t2 not in self.all_teams:
                continue
            for week in weeks_first_half:
                # Can't both be home in weeks 1-9
                model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()])
                # Can't both be away in weeks 1-9 (would both be home in weeks 10-18)
                model.AddBoolOr([is_home[(t1, week)], is_home[(t2, week)]])

        # Note: ground_sharing_pairs now includes ALL venue conflicts from venConflicts.csv
        # (both same-club ground sharing and cross-club venue sharing)
        # No need for separate venue_conflicts constraint

        # Soft constraints
        penalties = []

        # Consecutive 3
        for team in self.all_teams:
            for start in range(1, 8):
                if start + 2 <= 9:
                    all_home = model.NewBoolVar(f"cons_h_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_home)
                    model.AddBoolOr([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_home.Not())
                    penalties.append(all_home * CONSECUTIVE_3_PENALTY)

                    all_away = model.NewBoolVar(f"cons_a_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_away)
                    model.AddBoolOr([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_away.Not())
                    penalties.append(all_away * CONSECUTIVE_3_PENALTY)

            # Cross-boundary
            cross_8_9_10_home = model.NewBoolVar(f"cons_h_{team}_8_9_10")
            model.AddBoolAnd([is_home[(team, 8)], is_home[(team, 9)], is_home[(team, 1)].Not()]).OnlyEnforceIf(cross_8_9_10_home)
            model.AddBoolOr([is_home[(team, 8)].Not(), is_home[(team, 9)].Not(), is_home[(team, 1)]]).OnlyEnforceIf(cross_8_9_10_home.Not())
            penalties.append(cross_8_9_10_home * CONSECUTIVE_3_PENALTY)

            cross_8_9_10_away = model.NewBoolVar(f"cons_a_{team}_8_9_10")
            model.AddBoolAnd([is_home[(team, 8)].Not(), is_home[(team, 9)].Not(), is_home[(team, 1)]]).OnlyEnforceIf(cross_8_9_10_away)
            model.AddBoolOr([is_home[(team, 8)], is_home[(team, 9)], is_home[(team, 1)].Not()]).OnlyEnforceIf(cross_8_9_10_away.Not())
            penalties.append(cross_8_9_10_away * CONSECUTIVE_3_PENALTY)

            cross_9_10_11_home = model.NewBoolVar(f"cons_h_{team}_9_10_11")
            model.AddBoolAnd([is_home[(team, 9)], is_home[(team, 1)].Not(), is_home[(team, 2)].Not()]).OnlyEnforceIf(cross_9_10_11_home)
            model.AddBoolOr([is_home[(team, 9)].Not(), is_home[(team, 1)], is_home[(team, 2)]]).OnlyEnforceIf(cross_9_10_11_home.Not())
            penalties.append(cross_9_10_11_home * CONSECUTIVE_3_PENALTY)

            cross_9_10_11_away = model.NewBoolVar(f"cons_a_{team}_9_10_11")
            model.AddBoolAnd([is_home[(team, 9)].Not(), is_home[(team, 1)], is_home[(team, 2)]]).OnlyEnforceIf(cross_9_10_11_away)
            model.AddBoolOr([is_home[(team, 9)], is_home[(team, 1)].Not(), is_home[(team, 2)].Not()]).OnlyEnforceIf(cross_9_10_11_away.Not())
            penalties.append(cross_9_10_11_away * CONSECUTIVE_3_PENALTY)

        if penalties:
            model.Minimize(sum(penalties))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = SOLVER_TIME_LIMIT
        solver.parameters.num_search_workers = NUM_SEARCH_WORKERS
        if seed is not None:
            solver.parameters.random_seed = seed

        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return []

        # Extract solution and mirror
        fixtures = []
        for div in self.divisions:
            matchups = div_matchups[div.name]
            for t1, t2 in matchups:
                week = solver.Value(week_var[(div.name, t1, t2)])
                t1_is_home = solver.Value(home_var[(div.name, t1, t2)])

                if t1_is_home:
                    home, away = t1, t2
                else:
                    home, away = t2, t1

                fixtures.append(Fixture(week=week, home_team=home, away_team=away, division=div.name))
                fixtures.append(Fixture(week=week + 9, home_team=away, away_team=home, division=div.name))

        return fixtures

    def _generate_full_18_weeks(self, seed: int | None) -> list[Fixture]:
        """Generate fixtures over full 18 weeks without mirroring.

        Handles both 10-team divisions (standard) and 11-team divisions (with bye weeks).
        """
        if seed is not None:
            random.seed(seed)

        model = cp_model.CpModel()
        all_weeks = list(range(1, 19))  # Weeks 1-18

        # Variables
        week_var: dict[tuple[str, str, str, int], cp_model.IntVar] = {}
        home_var: dict[tuple[str, str, str, int], cp_model.IntVar] = {}
        matchup_used: dict[tuple[str, str, str, int], cp_model.IntVar] = {}  # For 11-team divisions
        is_home: dict[tuple[str, int], cp_model.IntVar] = {}

        # Create variables
        for team in self.all_teams:
            for week in all_weeks:
                is_home[(team, week)] = model.NewBoolVar(f"home_{team}_{week}")

        div_matchups: dict[str, list[tuple[str, str, int]]] = {}
        for div in self.divisions:
            teams = [t.code for t in div.teams]
            if seed is not None:
                random.shuffle(teams)

            matchups_with_reverse = []
            base_matchups = list(combinations(teams, 2))
            if seed is not None:
                random.shuffle(base_matchups)

            if div.has_bye_weeks:
                # 11-team division: each pair can have 1 or 2 meetings
                for idx, (t1, t2) in enumerate(base_matchups):
                    matchups_with_reverse.append((t1, t2, idx * 2))      # First meeting
                    matchups_with_reverse.append((t1, t2, idx * 2 + 1))  # Second meeting (optional)
            else:
                # 10-team division: each pair has exactly 2 meetings
                for idx, (t1, t2) in enumerate(base_matchups):
                    matchups_with_reverse.append((t1, t2, idx * 2))      # First meeting
                    matchups_with_reverse.append((t1, t2, idx * 2 + 1))  # Reverse meeting

            div_matchups[div.name] = matchups_with_reverse

            for t1, t2, meeting_id in matchups_with_reverse:
                week_var[(div.name, t1, t2, meeting_id)] = model.NewIntVar(1, 18, f"week_{div.name}_{t1}_{t2}_{meeting_id}")
                home_var[(div.name, t1, t2, meeting_id)] = model.NewBoolVar(f"home_{div.name}_{t1}_{t2}_{meeting_id}")

                if div.has_bye_weeks:
                    # Add variable to track if this matchup is actually used
                    matchup_used[(div.name, t1, t2, meeting_id)] = model.NewBoolVar(f"used_{div.name}_{t1}_{t2}_{meeting_id}")

        # Link variables
        team_home_indicators: dict[tuple[str, int], list] = defaultdict(list)
        for div in self.divisions:
            matchups = div_matchups[div.name]
            for t1, t2, meeting_id in matchups:
                for week in all_weeks:
                    key = (div.name, t1, t2, meeting_id)

                    if div.has_bye_weeks:
                        # For 11-team divisions, only count if matchup is used
                        is_week = model.NewBoolVar(f"is_week_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.Add(week_var[key] == week).OnlyEnforceIf(is_week)
                        model.Add(week_var[key] != week).OnlyEnforceIf(is_week.Not())

                        is_week_and_used = model.NewBoolVar(f"is_week_used_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.AddBoolAnd([is_week, matchup_used[key]]).OnlyEnforceIf(is_week_and_used)
                        model.AddBoolOr([is_week.Not(), matchup_used[key].Not()]).OnlyEnforceIf(is_week_and_used.Not())

                        t1_home_this = model.NewBoolVar(f"t1h_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.AddBoolAnd([is_week_and_used, home_var[key]]).OnlyEnforceIf(t1_home_this)
                        model.AddBoolOr([is_week_and_used.Not(), home_var[key].Not()]).OnlyEnforceIf(t1_home_this.Not())
                        team_home_indicators[(t1, week)].append(t1_home_this)

                        t2_home_this = model.NewBoolVar(f"t2h_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.AddBoolAnd([is_week_and_used, home_var[key].Not()]).OnlyEnforceIf(t2_home_this)
                        model.AddBoolOr([is_week_and_used.Not(), home_var[key]]).OnlyEnforceIf(t2_home_this.Not())
                        team_home_indicators[(t2, week)].append(t2_home_this)
                    else:
                        # For 10-team divisions, standard logic
                        is_week = model.NewBoolVar(f"is_week_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.Add(week_var[key] == week).OnlyEnforceIf(is_week)
                        model.Add(week_var[key] != week).OnlyEnforceIf(is_week.Not())

                        t1_home_this = model.NewBoolVar(f"t1h_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.AddBoolAnd([is_week, home_var[key]]).OnlyEnforceIf(t1_home_this)
                        model.AddBoolOr([is_week.Not(), home_var[key].Not()]).OnlyEnforceIf(t1_home_this.Not())
                        team_home_indicators[(t1, week)].append(t1_home_this)

                        t2_home_this = model.NewBoolVar(f"t2h_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.AddBoolAnd([is_week, home_var[key].Not()]).OnlyEnforceIf(t2_home_this)
                        model.AddBoolOr([is_week.Not(), home_var[key]]).OnlyEnforceIf(t2_home_this.Not())
                        team_home_indicators[(t2, week)].append(t2_home_this)

        for team in self.all_teams:
            for week in all_weeks:
                indicators = team_home_indicators[(team, week)]
                if indicators:
                    model.Add(is_home[(team, week)] == sum(indicators))

        # One game per week (or bye week for 11-team divisions)
        for div in self.divisions:
            teams = [t.code for t in div.teams]
            matchups = div_matchups[div.name]
            for team in teams:
                for week in all_weeks:
                    matchups_this_week = []
                    for t1, t2, meeting_id in matchups:
                        if team in (t1, t2):
                            key = (div.name, t1, t2, meeting_id)
                            if div.has_bye_weeks:
                                # For 11-team: count only if matchup is used
                                is_w = model.NewBoolVar(f"is_w_{div.name}_{team}_{t1}_{t2}_{meeting_id}_{week}")
                                model.Add(week_var[key] == week).OnlyEnforceIf(is_w)
                                model.Add(week_var[key] != week).OnlyEnforceIf(is_w.Not())

                                is_w_and_used = model.NewBoolVar(f"cnt_{div.name}_{team}_{t1}_{t2}_{meeting_id}_{week}")
                                model.AddBoolAnd([is_w, matchup_used[key]]).OnlyEnforceIf(is_w_and_used)
                                model.AddBoolOr([is_w.Not(), matchup_used[key].Not()]).OnlyEnforceIf(is_w_and_used.Not())
                                matchups_this_week.append(is_w_and_used)
                            else:
                                # For 10-team: standard logic
                                is_w = model.NewBoolVar(f"cnt_{div.name}_{team}_{t1}_{t2}_{meeting_id}_{week}")
                                model.Add(week_var[key] == week).OnlyEnforceIf(is_w)
                                model.Add(week_var[key] != week).OnlyEnforceIf(is_w.Not())
                                matchups_this_week.append(is_w)

                    if div.has_bye_weeks:
                        # 11-team division: 0 or 1 game per week (allows bye weeks)
                        model.Add(sum(matchups_this_week) <= 1)
                    else:
                        # 10-team division: exactly 1 game per week
                        model.Add(sum(matchups_this_week) == 1)

        # For 11-team divisions: ensure exactly 5 matches per week (10 teams playing, 1 bye)
        for div in self.divisions:
            if div.has_bye_weeks:
                matchups = div_matchups[div.name]
                for week in all_weeks:
                    matches_this_week = []
                    for t1, t2, meeting_id in matchups:
                        key = (div.name, t1, t2, meeting_id)
                        is_w = model.NewBoolVar(f"match_week_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.Add(week_var[key] == week).OnlyEnforceIf(is_w)
                        model.Add(week_var[key] != week).OnlyEnforceIf(is_w.Not())

                        match_played = model.NewBoolVar(f"match_played_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                        model.AddBoolAnd([is_w, matchup_used[key]]).OnlyEnforceIf(match_played)
                        model.AddBoolOr([is_w.Not(), matchup_used[key].Not()]).OnlyEnforceIf(match_played.Not())
                        matches_this_week.append(match_played)
                    # Exactly 5 matches per week (10 teams playing, 1 team has bye)
                    model.Add(sum(matches_this_week) == 5)

        # Ensure reverse fixtures
        for div in self.divisions:
            matchups = div_matchups[div.name]
            # Group by team pairs (each pair has 2 potential meetings)
            pairs: dict[tuple[str, str], list[int]] = defaultdict(list)
            for t1, t2, meeting_id in matchups:
                pairs[(t1, t2)].append(meeting_id)

            for (t1, t2), meeting_ids in pairs.items():
                meeting_1 = (div.name, t1, t2, meeting_ids[0])
                meeting_2 = (div.name, t1, t2, meeting_ids[1])

                if div.has_bye_weeks:
                    # 11-team division: play at least once, at most twice
                    # At least one meeting must be used
                    model.AddBoolOr([matchup_used[meeting_1], matchup_used[meeting_2]])

                    # If both meetings are used, they must have opposite home/away and not be consecutive
                    both_used = model.NewBoolVar(f"both_used_{div.name}_{t1}_{t2}")
                    model.AddBoolAnd([matchup_used[meeting_1], matchup_used[meeting_2]]).OnlyEnforceIf(both_used)
                    model.AddBoolOr([matchup_used[meeting_1].Not(), matchup_used[meeting_2].Not()]).OnlyEnforceIf(both_used.Not())

                    # When both used: opposite home/away
                    model.Add(home_var[meeting_1] + home_var[meeting_2] == 1).OnlyEnforceIf(both_used)

                    # When both used: no consecutive reverse
                    week_diff = model.NewIntVar(-17, 17, f"wdiff_{div.name}_{t1}_{t2}")
                    model.Add(week_diff == week_var[meeting_1] - week_var[meeting_2])
                    model.Add(week_diff != 1).OnlyEnforceIf(both_used)
                    model.Add(week_diff != -1).OnlyEnforceIf(both_used)
                else:
                    # 10-team division: both meetings must be used with opposite home/away
                    # Opposite home/away
                    model.Add(home_var[meeting_1] + home_var[meeting_2] == 1)

                    # No consecutive reverse (different weeks, not adjacent)
                    week_diff = model.NewIntVar(-17, 17, f"wdiff_{div.name}_{t1}_{t2}")
                    model.Add(week_diff == week_var[meeting_1] - week_var[meeting_2])
                    model.Add(week_diff != 1)
                    model.Add(week_diff != -1)

        # Home/away balance and minimum games
        for div in self.divisions:
            teams = [t.code for t in div.teams]
            if div.has_bye_weeks:
                # 11-team division: ensure each team plays at least 16 games
                # Count matchups involving each team that are actually used
                for team in teams:
                    team_matchups_used = []
                    for t1, t2, meeting_id in div_matchups[div.name]:
                        if team in (t1, t2):
                            key = (div.name, t1, t2, meeting_id)
                            team_matchups_used.append(matchup_used[key])
                    # Each team must play at least 16 games (16 matchups used involving this team)
                    model.Add(sum(team_matchups_used) >= 16)
            else:
                # 10-team division: exactly 9 home, 9 away
                for team in teams:
                    model.Add(sum(is_home[(team, w)] for w in all_weeks) == 9)

        # Fixed matches
        for fm in self.fixed_matches:
            for div in self.divisions:
                teams = [t.code for t in div.teams]
                if fm.team1 in teams and fm.team2 in teams:
                    matchups = div_matchups[div.name]
                    for t1, t2, meeting_id in matchups:
                        if {t1, t2} == {fm.team1, fm.team2}:
                            key = (div.name, t1, t2, meeting_id)
                            model.Add(week_var[key] == fm.week)
                            if div.has_bye_weeks:
                                # Ensure this matchup is used
                                model.Add(matchup_used[key] == 1)
                    break

        # Venue requirements
        for (team, week), venue in self.venue_req_lookup.items():
            if team in self.all_teams:
                if venue == "h":
                    model.Add(is_home[(team, week)] == 1)
                else:
                    model.Add(is_home[(team, week)] == 0)

        # Hard constraint: No MAX_CONSECUTIVE_SAME_VENUE consecutive home or away
        for team in self.all_teams:
            for start in range(1, 16):
                if start + 3 <= 18:
                    weeks_seq = [start, start + 1, start + 2, start + 3]
                    home_vars = [is_home[(team, w)] for w in weeks_seq]
                    # Can't have all MAX_CONSECUTIVE_SAME_VENUE home (sum must be <= MAX-1)
                    model.Add(sum(home_vars) <= MAX_CONSECUTIVE_SAME_VENUE - 1)
                    # Can't have all MAX_CONSECUTIVE_SAME_VENUE away (sum must be >= 1)
                    model.Add(sum(home_vars) >= 1)

        # Hard constraint: Ground sharing (teams from same club can't both be home)
        for t1, t2 in self.ground_sharing_pairs:
            # Skip if either team is not in current divisions (e.g., cross-division conflicts)
            if t1 not in self.all_teams or t2 not in self.all_teams:
                continue
            for week in all_weeks:
                # At least one must NOT be home (they can't both be home)
                model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()])

        # Note: ground_sharing_pairs now includes ALL venue conflicts from venConflicts.csv
        # (both same-club ground sharing and cross-club venue sharing)
        # No need for separate venue_conflicts constraint

        # Soft constraints
        penalties = []

        # Consecutive 3
        for team in self.all_teams:
            for start in range(1, 17):
                if start + 2 <= 18:
                    all_home = model.NewBoolVar(f"cons_h_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_home)
                    model.AddBoolOr([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_home.Not())
                    penalties.append(all_home * CONSECUTIVE_3_PENALTY)

                    all_away = model.NewBoolVar(f"cons_a_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_away)
                    model.AddBoolOr([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_away.Not())
                    penalties.append(all_away * CONSECUTIVE_3_PENALTY)

        if penalties:
            model.Minimize(sum(penalties))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = SOLVER_TIME_LIMIT * FULL_18_WEEK_TIME_MULTIPLIER
        solver.parameters.num_search_workers = NUM_SEARCH_WORKERS
        if seed is not None:
            solver.parameters.random_seed = seed

        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return []

        # Extract solution
        fixtures = []
        for div in self.divisions:
            matchups = div_matchups[div.name]
            for t1, t2, meeting_id in matchups:
                key = (div.name, t1, t2, meeting_id)

                # For 11-team divisions, only extract fixtures that are actually used
                if div.has_bye_weeks:
                    if not solver.Value(matchup_used[key]):
                        continue  # Skip unused matchups

                week = solver.Value(week_var[key])
                t1_is_home = solver.Value(home_var[key])

                if t1_is_home:
                    home, away = t1, t2
                else:
                    home, away = t2, t1

                fixtures.append(Fixture(week=week, home_team=home, away_team=away, division=div.name))

        return fixtures
