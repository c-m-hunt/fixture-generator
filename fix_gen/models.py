"""
Data models for the fixture generator.
"""

import re
from dataclasses import dataclass


@dataclass
class Team:
    code: str  # e.g., "WAN1"
    club: str  # e.g., "WAN"
    number: int  # e.g., 1
    division: str  # e.g., "1st XI Premier"

    @classmethod
    def from_code(cls, code: str, division: str) -> "Team":
        match = re.match(r"([A-Z]+)(\d+)", code)
        if not match:
            raise ValueError(f"Invalid team code: {code}")
        return cls(
            code=code,
            club=match.group(1),
            number=int(match.group(2)),
            division=division,
        )


@dataclass
class Division:
    name: str
    teams: list[Team]
    tier: int  # 1 = 1st XI, 2 = 2nd XI, etc.

    @property
    def has_bye_weeks(self) -> bool:
        """Returns True if this division has 11 teams (requires bye weeks)."""
        return len(self.teams) == 11

    @classmethod
    def from_row(cls, row: list[str]) -> "Division":
        name = row[0]
        # Determine tier from name
        if "Premier" in name or name in ["Div 1", "Div 2", "Div 3", "Div 4"]:
            tier = 1
        elif name in ["Div 5", "Div 6", "Div 7"]:
            tier = 2
        elif name in ["Div 8", "Div 9"]:
            tier = 3
        elif name in ["Div 10", "Div 11", "Div 12"]:
            tier = 4
        # Fallback for old naming convention
        elif "1st XI" in name:
            tier = 1
        elif "2nd XI" in name:
            tier = 2
        elif "3rd XI" in name:
            tier = 3
        else:
            tier = 4
        teams = [Team.from_code(code, name) for code in row[1:]]
        return cls(name=name, teams=teams, tier=tier)


@dataclass
class FixedMatch:
    week: int
    team1: str
    team2: str


@dataclass
class VenueRequirement:
    team: str
    venue: str  # "h" or "a"
    week: int


@dataclass
class Fixture:
    week: int
    home_team: str
    away_team: str
    division: str
