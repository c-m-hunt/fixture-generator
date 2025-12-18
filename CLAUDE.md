# Fixture Generator

Generate fixtures for a cricket league across multiple divisions with complex interdependent constraints.

## Terminology

- **Club**: A cricket club with a three-letter code (e.g., WOS = Westcliff on Sea)
- **Team**: A club's code plus a number (e.g., WOS1 = Westcliff 1st XI, WOS2 = 2nd XI)
- **Division**: A league of 10 teams that play each other
- **Game Week**: Numbered 1-18 across the season
- **Fixture**: A match between two teams (home team vs away team)

## League Structure

- 18 divisions total
- Each division has exactly 10 teams
- Each team plays every other team twice (once home, once away)
- This results in 18 game weeks (9 opponents × 2 = 18 matches per team)
- Each team plays exactly 9 home games and 9 away games

## Constraints (Priority Order - Highest First)

### Hard Constraints (Must be satisfied)

1. **Complete Round Robin**: Every team must play every other team in their division exactly twice (once home, once away)

2. **Fixed Match Requirements** (fixReq.csv): Specific teams MUST play each other on specified game weeks

3. **Venue Requirements** (venReq.csv): Specific teams MUST play at home (h) or away (a) on specified game weeks

4. **No Consecutive Reverse Fixtures**: If Team A plays Team B in week N, the reverse fixture cannot be in week N+1

5. **Maximum Consecutive Same Venue**: A team can NEVER have 4 consecutive home games or 4 consecutive away games

### Soft Constraints (Break if necessary, in order of preference to maintain)

6. **Consecutive Venue Limit**: Prefer no more than 2 consecutive home or away games. 3 is acceptable if unavoidable.

7. **Ground Sharing**: Teams from the same club that share a ground should not both play at home on the same game week:
   - Teams 1 & 2 share a ground
   - Teams 3 & 4 share a ground
   - Teams 5 & 6 share a ground
   - Teams 7 & 8 share a ground (if they exist)

   This is the LAST rule to break if necessary.

### Division Priority

When constraints must be broken, prioritize satisfying constraints for higher divisions:
1. 1st XI divisions (Premier, Div 1, Div 2, Div 3)
2. 2nd XI divisions
3. 3rd XI divisions
4. 4th XI divisions

## Data Files

### divisions.csv
Format: `division_name,team1,team2,team3,team4,team5,team6,team7,team8,team9,team10`

Contains all 18 divisions with their 10 teams each.

### fixReq.csv
Format: `game_week,team1,team2`

Fixed match requirements - these two teams MUST play each other in this game week.

### venReq.csv
Format: `team,venue,game_week`

Venue requirements - team must play at specified venue (h=home, a=away) on this game week.

### venConflicts.csv
Reserved for future use (venue conflicts).

### mappings.csv
External system mappings (not relevant to fixture generation).

## Output Format

CSV with columns: `game_week,home_team,away_team,division`

## Algorithm Considerations

### Mirrored Schedule Approach
One approach is to generate weeks 1-9, then mirror for weeks 10-18 (swapping home/away). This automatically guarantees:
- Perfect home/away balance (9 each)
- Reverse fixtures are always 9 weeks apart (satisfies "no consecutive reverse" rule)

Trade-off: Less flexibility - any constraint violations in first half are mirrored in second half.

### Cross-Division Coupling
Ground sharing creates dependencies between divisions. For example, if WAN1 (1st XI Premier) is home in week 3, then WAN2 (2nd XI Premier) should be away in week 3. This means divisions cannot be scheduled independently.
