"""
Fixture Generator using CP-SAT constraint programming.
"""

import random
from collections import defaultdict
from itertools import combinations

from ortools.sat.python import cp_model

from .config import WEIGHTS, SOLVER_TIME_LIMIT
from .ground_sharing import build_ground_sharing_pairs
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
        venue_conflicts: list[set[str]] | None = None,
    ):
        self.divisions = divisions
        self.fixed_matches = fixed_matches
        self.venue_requirements = venue_requirements
        self.venue_conflicts = venue_conflicts or []

        # Build lookup structures
        self.team_to_division: dict[str, Division] = {}
        for div in divisions:
            for team in div.teams:
                self.team_to_division[team.code] = div

        self.ground_sharing_pairs = build_ground_sharing_pairs(divisions)

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

    def generate(self, seed: int | None = None) -> list[Fixture]:
        """Generate complete fixture list for all divisions.

        Tries mirrored approach first (faster, guarantees home/away balance).
        Falls back to full 18-week scheduling if mirrored approach fails.

        Args:
            seed: Optional random seed for reproducible but varied fixture generation.
                  Different seeds produce different valid fixture sets.
        """
        if seed is not None:
            print(f"Using seed: {seed}")
            random.seed(seed)

        # Try mirrored approach first
        print("Attempting mirrored schedule (weeks 1-9, mirrored to 10-18)...")
        fixtures = self._generate_mirrored(seed)

        if fixtures:
            print("  ✓ Mirrored schedule successful!")
            return fixtures

        print("  ✗ Mirrored schedule failed, trying full 18-week schedule...")
        fixtures = self._generate_full_18_weeks(seed)

        if fixtures:
            print("  ✓ Full 18-week schedule successful!")
            return fixtures

        print("  ✗ No solution found with either approach!")
        return []

    def _generate_mirrored(self, seed: int | None) -> list[Fixture]:
        """Generate fixtures using mirrored approach (weeks 1-9 mirrored to 10-18)."""
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

        # No 4 consecutive
        for team in self.all_teams:
            for start in range(1, 7):
                weeks_seq = [start, start + 1, start + 2, start + 3]
                home_vars = [is_home[(team, w)] for w in weeks_seq]
                model.Add(sum(home_vars) <= 3)
                model.Add(sum(home_vars) >= 1)

            # Cross-boundary sequences
            model.Add(
                is_home[(team, 7)] + is_home[(team, 8)] + is_home[(team, 9)]
                + (1 - is_home[(team, 1)]) <= 3
            )
            model.Add(is_home[(team, 1)] <= is_home[(team, 7)] + is_home[(team, 8)] + is_home[(team, 9)])

            model.Add(
                is_home[(team, 8)] + is_home[(team, 9)]
                + (1 - is_home[(team, 1)]) + (1 - is_home[(team, 2)]) <= 3
            )
            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)]
                <= is_home[(team, 8)] + is_home[(team, 9)] + 1
            )

            model.Add(
                is_home[(team, 9)]
                + (1 - is_home[(team, 1)]) + (1 - is_home[(team, 2)]) + (1 - is_home[(team, 3)]) <= 3
            )
            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)] + is_home[(team, 3)]
                <= is_home[(team, 9)] + 2
            )

            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)] + is_home[(team, 3)] + is_home[(team, 4)] >= 1
            )
            model.Add(
                is_home[(team, 1)] + is_home[(team, 2)] + is_home[(team, 3)] + is_home[(team, 4)] <= 3
            )

        # Soft constraints
        penalties = []

        # Ground sharing
        for t1, t2, max_tier in self.ground_sharing_pairs:
            weight = {
                1: WEIGHTS["ground_sharing_1st_xi"],
                2: WEIGHTS["ground_sharing_2nd_xi"],
                3: WEIGHTS["ground_sharing_3rd_xi"],
                4: WEIGHTS["ground_sharing_4th_xi"],
            }.get(max_tier, WEIGHTS["ground_sharing_4th_xi"])

            for week in weeks_first_half:
                both_home = model.NewBoolVar(f"gs_{t1}_{t2}_{week}")
                model.AddBoolAnd([is_home[(t1, week)], is_home[(t2, week)]]).OnlyEnforceIf(both_home)
                model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()]).OnlyEnforceIf(both_home.Not())
                penalties.append(both_home * weight)

        # Venue conflicts
        for conflict_set in self.venue_conflicts:
            conflict_teams = [t for t in conflict_set if t in self.all_teams]
            if len(conflict_teams) >= 2:
                for t1_idx, t1 in enumerate(conflict_teams):
                    for t2 in conflict_teams[t1_idx + 1:]:
                        weight = WEIGHTS["ground_sharing_1st_xi"]
                        for week in weeks_first_half:
                            both_home = model.NewBoolVar(f"vc_{t1}_{t2}_{week}")
                            model.AddBoolAnd([is_home[(t1, week)], is_home[(t2, week)]]).OnlyEnforceIf(both_home)
                            model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()]).OnlyEnforceIf(both_home.Not())
                            penalties.append(both_home * weight)

        # Consecutive 3
        for team in self.all_teams:
            for start in range(1, 8):
                if start + 2 <= 9:
                    all_home = model.NewBoolVar(f"cons_h_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_home)
                    model.AddBoolOr([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_home.Not())
                    penalties.append(all_home * WEIGHTS["consecutive_3"])

                    all_away = model.NewBoolVar(f"cons_a_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_away)
                    model.AddBoolOr([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_away.Not())
                    penalties.append(all_away * WEIGHTS["consecutive_3"])

            # Cross-boundary
            cross_8_9_10_home = model.NewBoolVar(f"cons_h_{team}_8_9_10")
            model.AddBoolAnd([is_home[(team, 8)], is_home[(team, 9)], is_home[(team, 1)].Not()]).OnlyEnforceIf(cross_8_9_10_home)
            model.AddBoolOr([is_home[(team, 8)].Not(), is_home[(team, 9)].Not(), is_home[(team, 1)]]).OnlyEnforceIf(cross_8_9_10_home.Not())
            penalties.append(cross_8_9_10_home * WEIGHTS["consecutive_3"])

            cross_8_9_10_away = model.NewBoolVar(f"cons_a_{team}_8_9_10")
            model.AddBoolAnd([is_home[(team, 8)].Not(), is_home[(team, 9)].Not(), is_home[(team, 1)]]).OnlyEnforceIf(cross_8_9_10_away)
            model.AddBoolOr([is_home[(team, 8)], is_home[(team, 9)], is_home[(team, 1)].Not()]).OnlyEnforceIf(cross_8_9_10_away.Not())
            penalties.append(cross_8_9_10_away * WEIGHTS["consecutive_3"])

            cross_9_10_11_home = model.NewBoolVar(f"cons_h_{team}_9_10_11")
            model.AddBoolAnd([is_home[(team, 9)], is_home[(team, 1)].Not(), is_home[(team, 2)].Not()]).OnlyEnforceIf(cross_9_10_11_home)
            model.AddBoolOr([is_home[(team, 9)].Not(), is_home[(team, 1)], is_home[(team, 2)]]).OnlyEnforceIf(cross_9_10_11_home.Not())
            penalties.append(cross_9_10_11_home * WEIGHTS["consecutive_3"])

            cross_9_10_11_away = model.NewBoolVar(f"cons_a_{team}_9_10_11")
            model.AddBoolAnd([is_home[(team, 9)].Not(), is_home[(team, 1)], is_home[(team, 2)]]).OnlyEnforceIf(cross_9_10_11_away)
            model.AddBoolOr([is_home[(team, 9)], is_home[(team, 1)].Not(), is_home[(team, 2)].Not()]).OnlyEnforceIf(cross_9_10_11_away.Not())
            penalties.append(cross_9_10_11_away * WEIGHTS["consecutive_3"])

        if penalties:
            model.Minimize(sum(penalties))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = SOLVER_TIME_LIMIT
        solver.parameters.num_search_workers = 8
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
        """Generate fixtures over full 18 weeks without mirroring."""
        model = cp_model.CpModel()
        all_weeks = list(range(1, 19))  # Weeks 1-18

        # Variables
        week_var: dict[tuple[str, str, str], cp_model.IntVar] = {}
        home_var: dict[tuple[str, str, str], cp_model.IntVar] = {}
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

            # Create 2 matchups for each team pair (home and away)
            matchups_with_reverse = []
            base_matchups = list(combinations(teams, 2))
            if seed is not None:
                random.shuffle(base_matchups)

            for idx, (t1, t2) in enumerate(base_matchups):
                matchups_with_reverse.append((t1, t2, idx * 2))      # First meeting
                matchups_with_reverse.append((t1, t2, idx * 2 + 1))  # Reverse meeting

            div_matchups[div.name] = matchups_with_reverse

            for t1, t2, meeting_id in matchups_with_reverse:
                week_var[(div.name, t1, t2, meeting_id)] = model.NewIntVar(1, 18, f"week_{div.name}_{t1}_{t2}_{meeting_id}")
                home_var[(div.name, t1, t2, meeting_id)] = model.NewBoolVar(f"home_{div.name}_{t1}_{t2}_{meeting_id}")

        # Link variables
        team_home_indicators: dict[tuple[str, int], list] = defaultdict(list)
        for div in self.divisions:
            matchups = div_matchups[div.name]
            for t1, t2, meeting_id in matchups:
                for week in all_weeks:
                    is_week = model.NewBoolVar(f"is_week_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                    model.Add(week_var[(div.name, t1, t2, meeting_id)] == week).OnlyEnforceIf(is_week)
                    model.Add(week_var[(div.name, t1, t2, meeting_id)] != week).OnlyEnforceIf(is_week.Not())

                    t1_home_this = model.NewBoolVar(f"t1h_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                    model.AddBoolAnd([is_week, home_var[(div.name, t1, t2, meeting_id)]]).OnlyEnforceIf(t1_home_this)
                    model.AddBoolOr([is_week.Not(), home_var[(div.name, t1, t2, meeting_id)].Not()]).OnlyEnforceIf(t1_home_this.Not())
                    team_home_indicators[(t1, week)].append(t1_home_this)

                    t2_home_this = model.NewBoolVar(f"t2h_{div.name}_{t1}_{t2}_{meeting_id}_{week}")
                    model.AddBoolAnd([is_week, home_var[(div.name, t1, t2, meeting_id)].Not()]).OnlyEnforceIf(t2_home_this)
                    model.AddBoolOr([is_week.Not(), home_var[(div.name, t1, t2, meeting_id)]]).OnlyEnforceIf(t2_home_this.Not())
                    team_home_indicators[(t2, week)].append(t2_home_this)

        for team in self.all_teams:
            for week in all_weeks:
                indicators = team_home_indicators[(team, week)]
                if indicators:
                    model.Add(is_home[(team, week)] == sum(indicators))

        # One game per week
        for div in self.divisions:
            teams = [t.code for t in div.teams]
            matchups = div_matchups[div.name]
            for team in teams:
                for week in all_weeks:
                    matchups_this_week = []
                    for t1, t2, meeting_id in matchups:
                        if team in (t1, t2):
                            is_w = model.NewBoolVar(f"cnt_{div.name}_{team}_{t1}_{t2}_{meeting_id}_{week}")
                            model.Add(week_var[(div.name, t1, t2, meeting_id)] == week).OnlyEnforceIf(is_w)
                            model.Add(week_var[(div.name, t1, t2, meeting_id)] != week).OnlyEnforceIf(is_w.Not())
                            matchups_this_week.append(is_w)
                    model.Add(sum(matchups_this_week) == 1)

        # Ensure reverse fixtures
        for div in self.divisions:
            base_matchups = list(combinations([t.code for t in div.teams], 2))
            for idx, (t1, t2) in enumerate(base_matchups):
                meeting_1 = (div.name, t1, t2, idx * 2)
                meeting_2 = (div.name, t1, t2, idx * 2 + 1)

                # Opposite home/away
                model.Add(home_var[meeting_1] + home_var[meeting_2] == 1)

                # No consecutive reverse (different weeks, not adjacent)
                week_diff = model.NewIntVar(-17, 17, f"wdiff_{div.name}_{t1}_{t2}")
                model.Add(week_diff == week_var[meeting_1] - week_var[meeting_2])
                model.Add(week_diff != 1)
                model.Add(week_diff != -1)

        # Home/away balance (exactly 9 home, 9 away)
        for team in self.all_teams:
            model.Add(sum(is_home[(team, w)] for w in all_weeks) == 9)

        # Fixed matches
        for fm in self.fixed_matches:
            for div in self.divisions:
                teams = [t.code for t in div.teams]
                if fm.team1 in teams and fm.team2 in teams:
                    matchups = div_matchups[div.name]
                    for t1, t2, meeting_id in matchups:
                        if {t1, t2} == {fm.team1, fm.team2}:
                            model.Add(week_var[(div.name, t1, t2, meeting_id)] == fm.week)
                    break

        # Venue requirements
        for (team, week), venue in self.venue_req_lookup.items():
            if team in self.all_teams:
                if venue == "h":
                    model.Add(is_home[(team, week)] == 1)
                else:
                    model.Add(is_home[(team, week)] == 0)

        # No 4 consecutive
        for team in self.all_teams:
            for start in range(1, 16):
                if start + 3 <= 18:
                    weeks_seq = [start, start + 1, start + 2, start + 3]
                    home_vars = [is_home[(team, w)] for w in weeks_seq]
                    model.Add(sum(home_vars) <= 3)
                    model.Add(sum(home_vars) >= 1)

        # Soft constraints
        penalties = []

        # Ground sharing
        for t1, t2, max_tier in self.ground_sharing_pairs:
            weight = {
                1: WEIGHTS["ground_sharing_1st_xi"],
                2: WEIGHTS["ground_sharing_2nd_xi"],
                3: WEIGHTS["ground_sharing_3rd_xi"],
                4: WEIGHTS["ground_sharing_4th_xi"],
            }.get(max_tier, WEIGHTS["ground_sharing_4th_xi"])

            for week in all_weeks:
                both_home = model.NewBoolVar(f"gs_{t1}_{t2}_{week}")
                model.AddBoolAnd([is_home[(t1, week)], is_home[(t2, week)]]).OnlyEnforceIf(both_home)
                model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()]).OnlyEnforceIf(both_home.Not())
                penalties.append(both_home * weight)

        # Venue conflicts
        for conflict_set in self.venue_conflicts:
            conflict_teams = [t for t in conflict_set if t in self.all_teams]
            if len(conflict_teams) >= 2:
                for t1_idx, t1 in enumerate(conflict_teams):
                    for t2 in conflict_teams[t1_idx + 1:]:
                        weight = WEIGHTS["ground_sharing_1st_xi"]
                        for week in all_weeks:
                            both_home = model.NewBoolVar(f"vc_{t1}_{t2}_{week}")
                            model.AddBoolAnd([is_home[(t1, week)], is_home[(t2, week)]]).OnlyEnforceIf(both_home)
                            model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()]).OnlyEnforceIf(both_home.Not())
                            penalties.append(both_home * weight)

        # Consecutive 3
        for team in self.all_teams:
            for start in range(1, 17):
                if start + 2 <= 18:
                    all_home = model.NewBoolVar(f"cons_h_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_home)
                    model.AddBoolOr([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_home.Not())
                    penalties.append(all_home * WEIGHTS["consecutive_3"])

                    all_away = model.NewBoolVar(f"cons_a_{team}_{start}")
                    model.AddBoolAnd([is_home[(team, start)].Not(), is_home[(team, start+1)].Not(), is_home[(team, start+2)].Not()]).OnlyEnforceIf(all_away)
                    model.AddBoolOr([is_home[(team, start)], is_home[(team, start+1)], is_home[(team, start+2)]]).OnlyEnforceIf(all_away.Not())
                    penalties.append(all_away * WEIGHTS["consecutive_3"])

        if penalties:
            model.Minimize(sum(penalties))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = SOLVER_TIME_LIMIT * 3  # Give more time for 18-week
        solver.parameters.num_search_workers = 8
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
                week = solver.Value(week_var[(div.name, t1, t2, meeting_id)])
                t1_is_home = solver.Value(home_var[(div.name, t1, t2, meeting_id)])

                if t1_is_home:
                    home, away = t1, t2
                else:
                    home, away = t2, t1

                fixtures.append(Fixture(week=week, home_team=home, away_team=away, division=div.name))

        return fixtures
