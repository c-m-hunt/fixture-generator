"""
Configuration settings for the fixture generator.

Adjust these weights to change constraint priorities.
"""

# Ground sharing weights by division tier (higher = more important to satisfy)
WEIGHTS = {
    "ground_sharing_1st_xi": 1000,
    "ground_sharing_2nd_xi": 500,
    "ground_sharing_3rd_xi": 100,
    "ground_sharing_4th_xi": 10,
    # Consecutive home/away penalty (for 3 in a row; 4+ is hard constraint)
    "consecutive_3": 50,
}

# Maximum solver time in seconds
SOLVER_TIME_LIMIT = 300
