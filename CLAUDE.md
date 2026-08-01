# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Keeping the rules documented

`FIXTURE_RULES.md` is the canonical statement of the scheduling rules. **Whenever you change a rule, update `FIXTURE_RULES.md` in the same change** — never leave the two out of sync. A rule change means any of:

- adding, removing or altering a constraint in `fix_gen/generator.py` (remember both the mirrored and full-18 paths)
- changing a tunable in `fix_gen/config.py` (`MAX_CONSECUTIVE_SAME_VENUE`, `CONSECUTIVE_3_PENALTY`, …)
- moving a rule between hard and soft, or changing what the objective minimises
- changing the post-solve checks in `fix_gen/validation.py` or `tests/test_fixtures.py`

Read `FIXTURE_RULES.md` before touching the constraint model — it records which rules are enforced, which are only tightened as a side effect of the mirrored strategy, and which appear in older docs but are not implemented.

## What this is

A CP-SAT (OR-Tools) fixture generator for a cricket league (Essex TRMEL). It reads CSVs from `data/`, solves one constraint model covering **all divisions at once**, and writes fixtures to `output/`. Both the inputs in `data/` and the generated `output/` are committed — this repo is as much a data workspace as a codebase, and most commits are data/output changes rather than code changes.

## Commands

```bash
uv sync                                  # install (Python >=3.12; .python-version pins 3.13.9)
uv run python main.py                    # generate with a random seed
uv run python main.py --seed 42          # reproducible run

uv run python scripts/retry_until_solution.py 100   # re-run with fresh seeds until a solution is found
./scripts/retry_until_solution.sh 100               # same, in bash

uv run --extra test pytest tests/test_fixtures.py -q                 # validate output/fixtures.csv
uv run --extra test pytest tests/test_fixtures.py -k RoundRobin -v   # single test class
uv run --extra test python run_tests.py --hard-only                  # wrapper: --soft-only/--hard-only/-k/-x
```

pytest is an optional dependency, so `uv run pytest` fails with "Failed to spawn: pytest" — the `--extra test` is required (this also applies to `run_tests.py`, which imports pytest).

Diagnostic scripts (all read `data/` and `output/` directly, no args):

```bash
uv run python scripts/analyze_constraints.py       # find venReq combinations that make a division unsolvable
uv run python scripts/check_venreq_duplicates.py   # teams with identical venue patterns (guaranteed infeasible)
uv run python scripts/check_3way_conflicts.py      # triangles/chains in venConflicts.csv
uv run python scripts/analyze_fixtures.py          # stats + violations for the generated schedule
uv run python scripts/validate_fixtures.py         # cross-check fixtures vs clubs/venReq/venConflicts
uv run python scripts/generate_venConflicts.py     # rebuild venConflicts.csv from divisions.csv team numbers
```

## Architecture

`main.py` is a thin pipeline: `data_loading` → `FixtureGenerator.generate()` → `validation` → `output`.

**One model, all divisions.** `FixtureGenerator` (`fix_gen/generator.py`, the only substantial file) builds a single CP-SAT model spanning every division. This is forced by ground sharing: `BAP1` (Premier) and `BAP2` (Div 3) share a pitch, so divisions cannot be solved independently. Adding a per-division fast path would break that.

**Two solving strategies, chosen automatically in `generate()`:**

1. `_generate_mirrored` — solves weeks 1–9 only and mirrors to 10–18 with home/away swapped. Half the variables; free 9H/9A balance; reverse fixtures are always 9 weeks apart. Consecutive-venue penalties wrap around the week 9→10 boundary explicitly (`cons_h_*_8_9_10`, `cons_h_*_9_10_11`).
2. `_generate_full_18_weeks` — all 18 weeks independent, with a `matchup_used` bool per meeting so 11-team divisions can leave meetings unplayed (bye weeks).

Mirroring is skipped when any division has 11 teams (`Division.has_bye_weeks`) or when `_check_mirroring_conflicts()` finds a team requiring the *same* venue in weeks `N` and `N+9` — mirroring makes that unsatisfiable by construction. It also falls back to full-18 if the mirrored solve returns no solution. Full-18 gets `SOLVER_TIME_LIMIT * FULL_18_WEEK_TIME_MULTIPLIER` seconds.

**Constraints in the model.** Full detail is in `FIXTURE_RULES.md`. In short — hard: round robin, one game per team per week, 9H/9A, no consecutive reverse fixture, never 4 consecutive same venue, `fixReq`, `venReq`, and **ground sharing**. Soft: exactly one penalty term, `CONSECUTIVE_3_PENALTY` per run of 3 consecutive home or away games, summed into `model.Minimize()`. Both solve paths build these separately, so a rule change usually has to be made twice.

Two stale claims to ignore: `README.md` describes tier-weighted ground-sharing penalties (1st XI 1000 / 2nd XI 500 / …) and a `WEIGHTS` dict in `config.py`. Neither exists — ground sharing is a hard `AddBoolOr` in both strategies, and `Division.tier` is parsed but never read by the solver. Making ground sharing soft again means re-adding penalty vars, not flipping a config value.

**`data/venConflicts.csv` is the single source of ground-sharing truth.** It is an explicit pair list covering same-club sharing *and* cross-club pitch sharing (e.g. `ILC1,SLO1`), so pairs are no longer derived from team numbers at runtime. `fix_gen/ground_sharing.py` is dead code kept for reference; its `build_ground_sharing_pairs()` calls a `Team.ground_sharing_group()` method that no longer exists on the model, so it raises `AttributeError` if called. Use `scripts/generate_venConflicts.py` to regenerate the same-club pairs, then hand-add cross-club ones.

**Validation runs in two places** and they are not equivalent: `fix_gen/validation.py` (called by `main.py`, checks the in-memory fixtures) and `tests/test_fixtures.py` (re-implements its own loaders and checks the *committed* `output/fixtures.csv` against `data/`). The test suite is a data check, not a unit test suite — it passes or fails based on whether the last generated output matches the current inputs, so regenerate before trusting it. As of this writing 7 tests fail because `output/fixtures.csv` still contains `RAF3` in Div 12 while `data/divisions.csv` has since dropped it.

## Data files

Live inputs are in `data/`; `data-ecl-2024/`, `data-ecl-2025/`, `data-trmel-2026/` are per-season snapshots (`data-trmel-2026/divisions.csv` is currently identical to `data/`). Paths are hardcoded to `data/` and `output/` in `main.py`, tests, and every script — switching seasons means copying files into `data/`, not passing a flag.

| File | Format | Loaded by |
| --- | --- | --- |
| `divisions.csv` | `division_name,team1,…,team10` (headerless) | solver |
| `fixReq.csv` | `game_week,team1,team2` — must play each other that week | solver |
| `venReq.csv` | `team,venue(h/a),game_week` | solver |
| `venConflicts.csv` | `teamA,teamB` pairs that cannot both be home | solver |
| `clubs.csv` | `code,name` | `scripts/validate_fixtures.py` only |
| `weeks.csv` | `week,date` | reference only |
| `mappings.csv` | external system IDs | not used |

Currently 13 divisions (Premier, Div 1–12) of 10 teams each; the code also handles 11-team divisions. `load_divisions` raises on duplicate team codes across divisions.

Outputs: `output/fixtures.csv` (`game_week,home_team,away_team,division`, with a `# Generated with seed: N` comment line), `fixtures.html`, `fixtures.txt` (per-division week grids).

## Domain terminology

- **Club**: three-letter code (`WOS` = Westcliff on Sea). **Team**: club code + XI number (`WOS2` = 2nd XI).
- **Division**: 10 teams; **game week**: 1–18; each team plays every opponent home and away.
- Ground sharing pairs XIs 1&2, 3&4, 5&6, 7&8 within a club — plus cross-club pairs listed in `venConflicts.csv`.

## When there is no solution

The venue requirements in `venReq.csv` (200+ rows) are what usually make a season infeasible, and CP-SAT gives no explanation. The established workflow: retry across seeds first (`retry_until_solution.py` — the seed reorders matchups and the CP-SAT search, so a failure at the time limit is not proof of infeasibility), then run `analyze_constraints.py` / `check_venreq_duplicates.py` to find the over-constrained division, then relax the offending `venReq` rows. `notes.md` records which requests could not be accommodated in past seasons — append to it rather than silently dropping a requirement.

`notes.md` also describes a virtual `BYE1` team and a two-phase (standard divisions, then BYE divisions) scheduler. That design is **not implemented**: the current code detects bye divisions by team count (11) and solves everything in one full-18 pass, with no BYE-team filtering in `output.py`. Treat it as a proposal.
