#!/usr/bin/env python3
"""
Entrypoint for running fixture validation tests.

Usage:
    python run_tests.py              # Run all tests
    python run_tests.py -v           # Verbose output
    python run_tests.py -x           # Stop on first failure
    python run_tests.py --soft-only  # Only run soft constraint checks (warnings)
    python run_tests.py --hard-only  # Only run hard constraint checks
"""

import sys
import argparse
from pathlib import Path

import pytest


def main():
    parser = argparse.ArgumentParser(description='Run fixture validation tests')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Verbose output')
    parser.add_argument('-x', '--exitfirst', action='store_true',
                        help='Stop on first failure')
    parser.add_argument('--soft-only', action='store_true',
                        help='Only run soft constraint tests')
    parser.add_argument('--hard-only', action='store_true',
                        help='Only run hard constraint tests')
    parser.add_argument('--summary', action='store_true',
                        help='Show summary statistics only')
    parser.add_argument('-k', '--keyword', type=str,
                        help='Only run tests matching keyword expression')

    args = parser.parse_args()

    # Build pytest arguments
    pytest_args = [
        str(Path(__file__).parent / 'tests' / 'test_fixtures.py'),
        '--tb=short',
    ]

    if args.verbose:
        pytest_args.append('-v')

    if args.exitfirst:
        pytest_args.append('-x')

    if args.soft_only:
        pytest_args.extend(['-k', 'Soft'])
    elif args.hard_only:
        pytest_args.extend(['-k', 'Hard or Unique or RoundRobin or GameWeek or Division'])

    if args.keyword:
        pytest_args.extend(['-k', args.keyword])

    if args.summary:
        pytest_args.append('--co')  # Collect only, don't run

    # Run pytest
    exit_code = pytest.main(pytest_args)

    # Print summary
    if exit_code == 0:
        print("\n✓ All tests passed!")
    else:
        print(f"\n✗ Tests failed (exit code: {exit_code})")

    return exit_code


if __name__ == '__main__':
    sys.exit(main())
