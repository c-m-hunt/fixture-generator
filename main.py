#!/usr/bin/env python3
"""
Cricket League Fixture Generator - Entry Point

Generates fixtures for a cricket league with multiple divisions,
satisfying constraints around ground sharing, venue requirements,
and scheduling rules.
"""

import argparse
from pathlib import Path

from fix_gen import (
    CrossDivisionCoordinator,
    FixtureGenerator,
    load_divisions,
    load_fixed_matches,
    load_venue_requirements,
    print_fixture_grids,
    print_summary,
    validate_fixtures,
    write_fixtures_csv,
    write_fixtures_html,
)


def main():
    parser = argparse.ArgumentParser(description="Generate cricket league fixtures")
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible fixture generation. Different seeds produce different valid fixtures.",
    )
    args = parser.parse_args()

    data_dir = Path(__file__).parent / "data"
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)

    # Load data
    print("Loading data...")
    divisions = load_divisions(data_dir / "divisions.csv")
    fixed_matches = load_fixed_matches(data_dir / "fixReq.csv")
    venue_requirements = load_venue_requirements(data_dir / "venReq.csv")

    print(f"Loaded {len(divisions)} divisions")
    print(f"Loaded {len(fixed_matches)} fixed match requirements")
    print(f"Loaded {len(venue_requirements)} venue requirements")

    # Generate fixtures
    generator = FixtureGenerator(divisions, fixed_matches, venue_requirements)
    fixtures = generator.generate(seed=args.seed)

    # Validate
    print("\nValidating fixtures...")
    violations = validate_fixtures(fixtures, divisions)

    # Check cross-division ground sharing
    coordinator = CrossDivisionCoordinator(divisions)
    cross_violations = coordinator.check_violations(fixtures)

    # Output
    write_fixtures_csv(fixtures, output_dir / "fixtures.csv", seed=args.seed)
    write_fixtures_html(fixtures, divisions, output_dir / "fixtures.html", seed=args.seed)
    print(f"\nFixtures written to {output_dir}")

    # Summary
    print_summary(fixtures, violations, cross_violations)

    # Print fixture grids and write to file
    print_fixture_grids(fixtures, divisions, output_dir / "fixtures.txt", seed=args.seed)


if __name__ == "__main__":
    main()
