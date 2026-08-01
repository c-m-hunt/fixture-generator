#!/usr/bin/env python3
"""
Retry fixture generation until a solution is found (or max attempts reached).

Usage:
    python scripts/retry_until_solution.py [max_attempts]
"""

import subprocess
import sys


def main():
    max_attempts = int(sys.argv[1]) if len(sys.argv) > 1 else 100

    print(f"Starting fixture generation with up to {max_attempts} attempts...")
    print()

    for attempt in range(1, max_attempts + 1):
        print("=" * 40)
        print(f"Attempt {attempt} of {max_attempts}")
        print("=" * 40)
        print()

        # Run the command and capture output
        result = subprocess.run(
            ["uv", "run", "python", "main.py"],
            capture_output=True,
            text=True
        )

        output = result.stdout + result.stderr

        # Check if the failure message is NOT in the output
        if "No solution found with either approach!" not in output:
            # Success! Print the output and exit
            print(output)
            print()
            print("=" * 40)
            print(f"✓ SUCCESS on attempt {attempt}!")
            print("=" * 40)
            sys.exit(0)
        else:
            print(f"✗ No solution found on attempt {attempt}")
            print()

    print("=" * 40)
    print(f"❌ FAILED after {max_attempts} attempts")
    print("=" * 40)
    sys.exit(1)


if __name__ == '__main__':
    main()
