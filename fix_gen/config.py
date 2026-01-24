"""
Configuration settings for the fixture generator.

Adjust these settings to tune solver performance and constraint behavior.
"""

# ============================================================================
# Solver Settings
# ============================================================================

# Maximum solver time in seconds for mirrored approach (weeks 1-9)
SOLVER_TIME_LIMIT = 300

# Time multiplier for full 18-week approach (more complex, needs more time)
FULL_18_WEEK_TIME_MULTIPLIER = 3

# Number of parallel search workers for CP-SAT solver
NUM_SEARCH_WORKERS = 8

# Random seed range for auto-generated seeds (min, max)
RANDOM_SEED_RANGE = (1, 999999)


# ============================================================================
# Constraint Settings
# ============================================================================

# Maximum consecutive home or away games allowed (hard constraint)
# Teams can never have this many consecutive games at the same venue
MAX_CONSECUTIVE_SAME_VENUE = 4

# Soft constraint penalty for having 3 consecutive home/away games
# Higher values make the solver work harder to avoid 3 in a row
CONSECUTIVE_3_PENALTY = 50
