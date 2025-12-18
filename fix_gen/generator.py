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
    ):
        self.divisions = divisions
        self.fixed_matches = fixed_matches
        self.venue_requirements = venue_requirements

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
        """Generate complete fixture list for all divisions in one unified model.

        Args:
            seed: Optional random seed for reproducible but varied fixture generation.
                  Different seeds produce different valid fixture sets.
        """
        if seed is not None:
            print(f"Using seed: {seed}")
            random.seed(seed)

        print("Building unified CP-SAT model for all divisions...")
        model = cp_model.CpModel()
        weeks_first_half = list(range(1, 10))  # Weeks 1-9

        # =================================================================
        # Variables - for all divisions
        # =================================================================

        # week_var[(div_name, t1, t2)] = which week (1-9) this matchup occurs
        week_var: dict[tuple[str, str, str], cp_model.IntVar] = {}
        # home_var[(div_name, t1, t2)] = 1 if t1 is home, 0 if t2 is home
        home_var: dict[tuple[str, str, str], cp_model.IntVar] = {}
        # is_home[(team, week)] = 1 if team plays at home in this week (first half)
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

        # =================================================================
        # Link variables - connect matchup assignments to is_home
        # =================================================================

        print("  Adding variable linkage constraints...")
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

        print("  Linking is_home variables...")
        for team in self.all_teams:
            for week in weeks_first_half:
                indicators = team_home_indicators[(team, week)]
                if indicators:
                    model.Add(is_home[(team, week)] == sum(indicators))

        # =================================================================
        # Hard Constraint: Each team plays exactly once per week
        # =================================================================

        print("  Adding one-game-per-week constraints...")
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

        # =================================================================
        # Hard Constraint: Fixed matches (fixReq)
        # =================================================================

        print("  Adding fixed match constraints...")
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

        # =================================================================
        # Hard Constraint: Venue requirements (venReq)
        # =================================================================

        print("  Adding venue requirement constraints...")
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

        # =================================================================
        # Hard Constraint: No 4 consecutive home or away games
        # =================================================================

        print("  Adding no-4-consecutive constraints...")
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

        # =================================================================
        # Soft Constraints - Ground sharing and consecutive limits
        # =================================================================

        print("  Adding soft constraints (ground sharing, consecutive)...")
        penalties = []

        for t1, t2, max_tier in self.ground_sharing_pairs:
            weight = {
                1: WEIGHTS["ground_sharing_1st_xi"],
                2: WEIGHTS["ground_sharing_2nd_xi"],
                3: WEIGHTS["ground_sharing_3rd_xi"],
                4: WEIGHTS["ground_sharing_4th_xi"],
            }.get(max_tier, WEIGHTS["ground_sharing_4th_xi"])

            for week in weeks_first_half:
                both_home = model.NewBoolVar(f"both_home_{t1}_{t2}_{week}")
                model.AddBoolAnd([is_home[(t1, week)], is_home[(t2, week)]]).OnlyEnforceIf(both_home)
                model.AddBoolOr([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()]).OnlyEnforceIf(both_home.Not())
                penalties.append(both_home * weight)

                both_away = model.NewBoolVar(f"both_away_{t1}_{t2}_{week}")
                model.AddBoolAnd([is_home[(t1, week)].Not(), is_home[(t2, week)].Not()]).OnlyEnforceIf(both_away)
                model.AddBoolOr([is_home[(t1, week)], is_home[(t2, week)]]).OnlyEnforceIf(both_away.Not())
                penalties.append(both_away * weight)

        for team in self.all_teams:
            # Within first half (weeks 1-9)
            for start in range(1, 8):
                weeks_seq = [start, start + 1, start + 2]
                home_list = [is_home[(team, w)] for w in weeks_seq]

                all_home = model.NewBoolVar(f"cons_h_{team}_{start}")
                model.AddBoolAnd(home_list).OnlyEnforceIf(all_home)
                model.AddBoolOr([h.Not() for h in home_list]).OnlyEnforceIf(all_home.Not())
                penalties.append(all_home * WEIGHTS["consecutive_3"])

                all_away = model.NewBoolVar(f"cons_a_{team}_{start}")
                model.Add(sum(home_list) == 0).OnlyEnforceIf(all_away)
                model.Add(sum(home_list) >= 1).OnlyEnforceIf(all_away.Not())
                penalties.append(all_away * WEIGHTS["consecutive_3"])

            # Cross-boundary: weeks 8-9-10 (week 10 = opposite of week 1)
            # 3 consecutive home: H in 8, H in 9, A in 1 (meaning H in 10)
            cross_8_9_10_home = model.NewBoolVar(f"cons_h_{team}_8_9_10")
            model.AddBoolAnd([
                is_home[(team, 8)],
                is_home[(team, 9)],
                is_home[(team, 1)].Not()
            ]).OnlyEnforceIf(cross_8_9_10_home)
            model.AddBoolOr([
                is_home[(team, 8)].Not(),
                is_home[(team, 9)].Not(),
                is_home[(team, 1)]
            ]).OnlyEnforceIf(cross_8_9_10_home.Not())
            penalties.append(cross_8_9_10_home * WEIGHTS["consecutive_3"])

            # 3 consecutive away: A in 8, A in 9, H in 1 (meaning A in 10)
            cross_8_9_10_away = model.NewBoolVar(f"cons_a_{team}_8_9_10")
            model.AddBoolAnd([
                is_home[(team, 8)].Not(),
                is_home[(team, 9)].Not(),
                is_home[(team, 1)]
            ]).OnlyEnforceIf(cross_8_9_10_away)
            model.AddBoolOr([
                is_home[(team, 8)],
                is_home[(team, 9)],
                is_home[(team, 1)].Not()
            ]).OnlyEnforceIf(cross_8_9_10_away.Not())
            penalties.append(cross_8_9_10_away * WEIGHTS["consecutive_3"])

            # Cross-boundary: weeks 9-10-11 (week 10 = opposite of 1, week 11 = opposite of 2)
            # 3 consecutive home: H in 9, A in 1, A in 2
            cross_9_10_11_home = model.NewBoolVar(f"cons_h_{team}_9_10_11")
            model.AddBoolAnd([
                is_home[(team, 9)],
                is_home[(team, 1)].Not(),
                is_home[(team, 2)].Not()
            ]).OnlyEnforceIf(cross_9_10_11_home)
            model.AddBoolOr([
                is_home[(team, 9)].Not(),
                is_home[(team, 1)],
                is_home[(team, 2)]
            ]).OnlyEnforceIf(cross_9_10_11_home.Not())
            penalties.append(cross_9_10_11_home * WEIGHTS["consecutive_3"])

            # 3 consecutive away: A in 9, H in 1, H in 2
            cross_9_10_11_away = model.NewBoolVar(f"cons_a_{team}_9_10_11")
            model.AddBoolAnd([
                is_home[(team, 9)].Not(),
                is_home[(team, 1)],
                is_home[(team, 2)]
            ]).OnlyEnforceIf(cross_9_10_11_away)
            model.AddBoolOr([
                is_home[(team, 9)],
                is_home[(team, 1)].Not(),
                is_home[(team, 2)].Not()
            ]).OnlyEnforceIf(cross_9_10_11_away.Not())
            penalties.append(cross_9_10_11_away * WEIGHTS["consecutive_3"])

        if penalties:
            model.Minimize(sum(penalties))

        # =================================================================
        # Solve
        # =================================================================

        print("  Solving...")
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = SOLVER_TIME_LIMIT
        solver.parameters.num_search_workers = 8
        if seed is not None:
            solver.parameters.random_seed = seed

        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            print("  WARNING: No solution found!")
            return []

        print(f"  Solution found! Status: {solver.StatusName(status)}")
        if penalties:
            print(f"  Objective (penalty): {solver.ObjectiveValue()}")

        # =================================================================
        # Extract solution
        # =================================================================

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

                fixtures.append(Fixture(
                    week=week,
                    home_team=home,
                    away_team=away,
                    division=div.name,
                ))

                # Mirror for second half
                fixtures.append(Fixture(
                    week=week + 9,
                    home_team=away,
                    away_team=home,
                    division=div.name,
                ))

        return fixtures
