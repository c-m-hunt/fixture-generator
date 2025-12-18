"""
Output formatting functions for generated fixtures.
"""

import csv
from collections import defaultdict
from pathlib import Path

from .models import Division, Fixture


def write_fixtures_csv(
    fixtures: list[Fixture],
    filepath: Path,
    seed: int | None = None,
) -> None:
    """Write fixtures to CSV file."""
    fixtures_sorted = sorted(fixtures, key=lambda f: (f.week, f.division, f.home_team))
    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        # Write seed as comment if provided
        if seed is not None:
            f.write(f"# Generated with seed: {seed}\n")
        writer.writerow(["game_week", "home_team", "away_team", "division"])
        for fix in fixtures_sorted:
            writer.writerow([fix.week, fix.home_team, fix.away_team, fix.division])


def print_summary(
    fixtures: list[Fixture],
    violations: list[str],
    cross_violations: list[str],
) -> None:
    """Print a summary of the generated fixtures."""
    print("\n" + "=" * 60)
    print("FIXTURE GENERATION SUMMARY")
    print("=" * 60)

    print(f"\nTotal fixtures generated: {len(fixtures)}")

    by_div = defaultdict(int)
    for f in fixtures:
        by_div[f.division] += 1
    print(f"Divisions: {len(by_div)}")

    if violations:
        print(f"\n⚠️  Validation issues: {len(violations)}")
        for v in violations[:10]:
            print(f"   - {v}")
        if len(violations) > 10:
            print(f"   ... and {len(violations) - 10} more")
    else:
        print("\n✓ All validation checks passed!")

    if cross_violations:
        print(f"\n⚠️  Cross-division ground sharing violations: {len(cross_violations)}")
        for v in cross_violations[:10]:
            print(f"   - {v}")
        if len(cross_violations) > 10:
            print(f"   ... and {len(cross_violations) - 10} more")
    else:
        print("✓ No cross-division ground sharing violations!")


def print_fixture_grids(
    fixtures: list[Fixture],
    divisions: list[Division],
    output_file: Path | None = None,
    seed: int | None = None,
) -> None:
    """Print a grid of fixtures for each division, organized by week."""
    lines: list[str] = []

    def output(text: str = ""):
        print(text)
        lines.append(text)

    # Print seed at the top if provided
    if seed is not None:
        output(f"Generated with seed: {seed}")
        output()

    # Group fixtures by division
    by_division: dict[str, list[Fixture]] = defaultdict(list)
    for f in fixtures:
        by_division[f.division].append(f)

    # Calculate column width based on longest team code
    max_team_len = max(len(t.code) for div in divisions for t in div.teams)
    col_width = max_team_len * 2 + 1 + 2  # "TEAM1-TEAM2" + padding

    for div in divisions:
        div_fixtures = by_division[div.name]

        # Group by week
        by_week: dict[int, list[Fixture]] = defaultdict(list)
        for f in div_fixtures:
            by_week[f.week].append(f)

        output()
        output("=" * 100)
        output(f" {div.name}")
        output("=" * 100)

        # Print in two halves: weeks 1-9 then 10-18
        for half, week_range in enumerate([(1, 10), (10, 19)]):
            start_week, end_week = week_range
            half_label = "First Half (Weeks 1-9)" if half == 0 else "Second Half (Weeks 10-18)"
            output(f"\n  {half_label}")

            # Print header row with week numbers
            header = "     "
            for week in range(start_week, end_week):
                header += f"{'Wk' + str(week):^{col_width}}"
            output(header)
            output("     " + "-" * (col_width * 9))

            # Each week has 5 matches (10 teams / 2)
            for match_idx in range(5):
                row = f"  {match_idx + 1}  "
                for week in range(start_week, end_week):
                    week_fixtures = sorted(by_week[week], key=lambda x: x.home_team)
                    if match_idx < len(week_fixtures):
                        f = week_fixtures[match_idx]
                        fixture_str = f"{f.home_team}-{f.away_team}"
                    else:
                        fixture_str = ""
                    row += f"{fixture_str:^{col_width}}"
                output(row)

        output()

    # Write to file if path provided
    if output_file:
        output_file.write_text("\n".join(lines))
        print(f"\nFixture grids written to {output_file}")


def write_fixtures_html(
    fixtures: list[Fixture],
    divisions: list[Division],
    output_file: Path,
    seed: int | None = None,
) -> None:
    """Write fixtures to HTML file with clean, minimal formatting."""
    # Group fixtures by division
    by_division: dict[str, list[Fixture]] = defaultdict(list)
    for f in fixtures:
        by_division[f.division].append(f)

    # Build title with seed if provided
    title = "Cricket League Fixtures"
    if seed is not None:
        title += f" (Seed: {seed})"

    html_parts = [
        "<!DOCTYPE html>",
        "<html>",
        "<head>",
        "<meta charset='utf-8'>",
        f"<title>{title}</title>",
        "<style>",
        "body { font-family: monospace; font-size: 14px; margin: 20px; }",
        ".seed { color: #666; font-size: 12px; margin-bottom: 10px; }",
        "h2 { margin-top: 30px; border-bottom: 2px solid #333; padding-bottom: 5px; }",
        "h3 { margin: 15px 0 10px 0; color: #555; }",
        "table { border-collapse: collapse; margin-bottom: 20px; }",
        "th, td { padding: 4px 8px; text-align: center; }",
        "th { background: #f0f0f0; }",
        "td { border-bottom: 1px solid #ddd; }",
        "</style>",
        "</head>",
        "<body>",
        "<h1>Cricket League Fixtures</h1>",
    ]

    # Add seed info below title if provided
    if seed is not None:
        html_parts.append(f"<p class='seed'>Generated with seed: {seed}</p>")

    for div in divisions:
        div_fixtures = by_division[div.name]

        # Group by week
        by_week: dict[int, list[Fixture]] = defaultdict(list)
        for f in div_fixtures:
            by_week[f.week].append(f)

        html_parts.append(f"<h2>{div.name}</h2>")

        # Two halves
        for half, week_range in enumerate([(1, 10), (10, 19)]):
            start_week, end_week = week_range
            half_label = "Weeks 1-9" if half == 0 else "Weeks 10-18"
            html_parts.append(f"<h3>{half_label}</h3>")
            html_parts.append("<table>")

            # Header row
            html_parts.append("<tr>")
            for week in range(start_week, end_week):
                html_parts.append(f"<th>Wk{week}</th>")
            html_parts.append("</tr>")

            # Match rows
            for match_idx in range(5):
                html_parts.append("<tr>")
                for week in range(start_week, end_week):
                    week_fixtures = sorted(by_week[week], key=lambda x: x.home_team)
                    if match_idx < len(week_fixtures):
                        fix = week_fixtures[match_idx]
                        cell = f"{fix.home_team}-{fix.away_team}"
                    else:
                        cell = ""
                    html_parts.append(f"<td>{cell}</td>")
                html_parts.append("</tr>")

            html_parts.append("</table>")

    html_parts.extend(["</body>", "</html>"])

    output_file.write_text("\n".join(html_parts))
    print(f"Fixtures HTML written to {output_file}")
