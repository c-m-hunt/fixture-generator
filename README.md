# Cricket League Fixture Generator

A constraint programming-based fixture generator for cricket leagues with multiple divisions. Uses Google OR-Tools CP-SAT solver to generate valid fixtures while satisfying complex scheduling constraints.

## Features

- Generates fixtures for multiple divisions simultaneously
- Handles ground sharing between teams from the same club
- Supports fixed match requirements (specific teams must play on specific weeks)
- Supports venue requirements (team must play home/away on specific weeks)
- Mirrored schedule (weeks 1-9 solved, weeks 10-18 are the reverse fixtures)
- Prevents 4+ consecutive home or away games (hard constraint)
- Minimizes 3 consecutive home or away games (soft constraint)
- Reproducible output with optional seed parameter
- Multiple output formats: CSV, HTML, and text grids

## Installation

Requires Python 3.12+

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install ortools>=9.8
```

## Usage

```bash
# Generate fixtures (non-deterministic)
python main.py

# Generate fixtures with a specific seed (reproducible)
python main.py --seed 42
```

Output files are written to the `output/` directory:
- `fixtures.csv` - Machine-readable fixture list
- `fixtures.html` - Browser-viewable fixture grids
- `fixtures.txt` - Text-based fixture grids

When using a seed, it's recorded in all output files for reproducibility.

## Data Files

All input data is in the `data/` directory:

### divisions.csv

Each row defines a division with its teams:

```
division_name,team1,team2,team3,team4,team5,team6,team7,team8,team9,team10
```

Teams use a club code (3 letters) plus a number (e.g., `WOS1` = Westcliff on Sea 1st XI).

### fixReq.csv

Fixed match requirements - specific teams that must play each other on a given week:

```
game_week,team1,team2
```

### venReq.csv

Venue requirements - a team must play at home (`h`) or away (`a`) on a specific week:

```
team,venue,game_week
```

## Constraints

### Hard Constraints (must be satisfied)

- Each team plays exactly one match per week
- Each pair of teams plays twice (home and away)
- No team plays 4+ consecutive home or away games
- Fixed match requirements are honoured
- Venue requirements are honoured

### Soft Constraints (minimized via weighted penalties)

- **Ground sharing**: Teams 1&2, 3&4, 5&6 from the same club shouldn't play at home on the same week. Weights vary by division tier:
  - 1st XI: 1000
  - 2nd XI: 500
  - 3rd XI: 100
  - 4th XI: 10

- **3 consecutive games**: Avoid 3 consecutive home or away games (penalty: 50)

## Project Structure

```
fix-gen-new/
├── main.py                 # Entry point
├── data/                   # Input data files
│   ├── divisions.csv
│   ├── fixReq.csv
│   └── venReq.csv
├── output/                 # Generated fixtures
└── fix_gen/                # Core module
    ├── config.py           # Weights and solver settings
    ├── models.py           # Data classes
    ├── data_loading.py     # CSV parsing
    ├── generator.py        # CP-SAT constraint model
    ├── validation.py       # Post-generation validation
    ├── ground_sharing.py   # Cross-division ground checks
    └── output.py           # CSV/HTML/text output
```

## Algorithm

The generator uses a mirrored schedule approach:

1. Build a CP-SAT model for weeks 1-9 only
2. For each match, decide which team is home in the first half
3. Add all constraints (hard and soft with weighted penalties)
4. Solve to minimize total penalty
5. Mirror the solution: week 10 = reverse of week 1, week 11 = reverse of week 2, etc.

This approach reduces the problem size by half while ensuring balanced home/away distribution.

## Configuration

Edit `fix_gen/config.py` to adjust:

- `WEIGHTS` - Penalty weights for soft constraints
- `SOLVER_TIME_LIMIT` - Maximum solver time in seconds (default: 300)

## License

MIT
