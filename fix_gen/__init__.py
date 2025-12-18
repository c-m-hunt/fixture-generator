"""
Cricket League Fixture Generator

Uses constraint programming (OR-Tools CP-SAT) to generate fixtures
for a cricket league with multiple divisions and complex constraints.
"""

from .config import SOLVER_TIME_LIMIT, WEIGHTS
from .data_loading import load_divisions, load_fixed_matches, load_venue_requirements
from .generator import FixtureGenerator
from .models import Division, FixedMatch, Fixture, Team, VenueRequirement
from .output import print_fixture_grids, print_summary, write_fixtures_csv, write_fixtures_html
from .validation import CrossDivisionCoordinator, validate_fixtures

__all__ = [
    # Config
    "WEIGHTS",
    "SOLVER_TIME_LIMIT",
    # Models
    "Team",
    "Division",
    "FixedMatch",
    "VenueRequirement",
    "Fixture",
    # Data loading
    "load_divisions",
    "load_fixed_matches",
    "load_venue_requirements",
    # Generator
    "FixtureGenerator",
    # Validation
    "validate_fixtures",
    "CrossDivisionCoordinator",
    # Output
    "write_fixtures_csv",
    "write_fixtures_html",
    "print_summary",
    "print_fixture_grids",
]
