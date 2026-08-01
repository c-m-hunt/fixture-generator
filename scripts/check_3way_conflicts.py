#!/usr/bin/env python3
"""
Check for 3-way venue conflicts in venConflicts.csv.

A 3-way conflict occurs when:
- Triangle: A-B, B-C, A-C (all three teams conflict with each other)
- Chain: A-B-C (A conflicts with B, B conflicts with C, but A doesn't conflict with C)

These can create additional scheduling complexity.
"""

import csv
from collections import defaultdict
from pathlib import Path


def main():
    base_dir = Path(__file__).parent.parent
    conflicts_file = base_dir / 'data' / 'venConflicts.csv'

    # Build a conflict graph
    conflicts = defaultdict(set)

    with open(conflicts_file, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                t1, t2 = row[0].strip(), row[1].strip()
                if t1 and t2:
                    conflicts[t1].add(t2)
                    conflicts[t2].add(t1)

    print(f"Loaded {len(conflicts)} teams with conflicts")
    print(f"Total conflict pairs: {sum(len(v) for v in conflicts.values()) // 2}")
    print()

    # Find chains: A-B-C (but not A-C)
    chains = set()
    for team_a in sorted(conflicts.keys()):
        for team_b in sorted(conflicts[team_a]):
            for team_c in sorted(conflicts[team_b]):
                if team_c != team_a and team_c not in conflicts[team_a]:
                    # Chain found (not a triangle)
                    # Normalize to avoid duplicates (smallest team first)
                    chain = tuple(sorted([team_a, team_b, team_c]))
                    chains.add(chain)

    # Find triangles: A-B, B-C, A-C (all three conflict)
    triangles = []
    for team_a in sorted(conflicts.keys()):
        for team_b in sorted(conflicts[team_a]):
            if team_b <= team_a:  # Skip to avoid duplicates
                continue
            for team_c in sorted(conflicts[team_b]):
                if team_c <= team_b:  # Skip to avoid duplicates
                    continue
                if team_c in conflicts[team_a]:
                    # Triangle found
                    triple = tuple(sorted([team_a, team_b, team_c]))
                    if triple not in triangles:
                        triangles.append(triple)

    # Print results
    if chains:
        print(f"Found {len(chains)} chain(s) (3-way indirect conflicts):")
        for chain in sorted(chains):
            # Find the middle team (the one that connects the other two)
            t1, t2, t3 = chain
            if t2 in conflicts[t1] and t2 in conflicts[t3] and t3 not in conflicts[t1]:
                middle = t2
                ends = [t1, t3]
            elif t1 in conflicts[t2] and t1 in conflicts[t3] and t3 not in conflicts[t2]:
                middle = t1
                ends = [t2, t3]
            else:
                middle = t3
                ends = [t1, t2]
            print(f"  {ends[0]} -- {middle} -- {ends[1]}")
    else:
        print("No chains found")

    print()

    if triangles:
        print(f"Found {len(triangles)} triangle(s) (3-way complete conflicts):")
        for triple in triangles:
            print(f"  {triple[0]} -- {triple[1]} -- {triple[2]} (all conflict)")
    else:
        print("No triangles found (no sets of 3 teams where all 3 conflict with each other)")


if __name__ == '__main__':
    main()
