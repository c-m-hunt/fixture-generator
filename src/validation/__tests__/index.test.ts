import { findTeamMatch } from "..";
import { MatchStructure } from "../../config/types";

describe("findTeamMatch", () => {
  // Test case: Happy path where team is found in the first match of the week
  test("findTeamMatch should return correct indices when team is found in the first match of the week", () => {
    // Arrange
    const matches: MatchStructure = [
      [
        // Division 0
        [
          // Week 0
          ["Team A", "Team B"], // Match 0
          ["Team C", "Team D"], // Match 1
        ],
        // ... other weeks
      ],
      // ... other divisions
    ];
    const team = "Team A";
    const divIdx = 0;
    const weekIdx = 0;

    // Act
    const result = findTeamMatch(matches, team, divIdx, weekIdx);

    // Assert
    expect(result).toEqual({
      match: ["Team A", "Team B"],
      matchIdx: 0,
      teamIdx: 0,
      oppoTeam: "Team B",
    });
  });

  // Test case: Happy path where team is found in a subsequent match of the week
  test("findTeamMatch should return correct indices when team is found in a subsequent match of the week", () => {
    // Arrange
    const matches: MatchStructure = [
      [
        // Division 0
        [
          // Week 0
          ["Team E", "Team F"], // Match 0
          ["Team D", "Team A"], // Match 1
        ],
        // ... other weeks
      ],
      // ... other divisions
    ];
    const team = "Team A";
    const divIdx = 0;
    const weekIdx = 0;

    // Act
    const result = findTeamMatch(matches, team, divIdx, weekIdx);

    // Assert
    expect(result).toEqual({
      match: ["Team D", "Team A"],
      matchIdx: 1,
      teamIdx: 1,
      oppoTeam: "Team D",
    });
  });

  // Test case: Team is not found in any match of the week
  test("findTeamMatch should return null when team is not found in any match of the week", () => {
    // Arrange
    const matches: MatchStructure = [
      [
        // Division 0
        [
          // Week 0
          ["Team E", "Team F"], // Match 0
          ["Team C", "Team D"], // Match 1
        ],
        // ... other weeks
      ],
      // ... other divisions
    ];
    const team = "Team A";
    const divIdx = 0;
    const weekIdx = 0;

    // Act
    const result = findTeamMatch(matches, team, divIdx, weekIdx);

    // Assert
    expect(result).toBeNull();
  });

  // Test case: Division index is out of bounds
  test("findTeamMatch should throw an error when division index is out of bounds", () => {
    // Arrange
    const matches: MatchStructure = [
      [
        // Division 0
        [
          // Week 0
          ["Team A", "Team B"],
        ],
        // ... other weeks
      ],
      // ... other divisions
    ];
    const team = "Team A";
    const divIdx = 10; // Out of bounds index
    const weekIdx = 0;

    // Act & Assert
    expect(() => findTeamMatch(matches, team, divIdx, weekIdx)).toThrow();
  });

  // Test case: Week index is out of bounds
  test("findTeamMatch should throw an error when week index is out of bounds", () => {
    // Arrange
    const matches: MatchStructure = [
      [
        // Division 0
        [
          // Week 0
          ["Team A", "Team B"],
        ],
        // ... other weeks
      ],
      // ... other divisions
    ];
    const team = "Team A";
    const divIdx = 0;
    const weekIdx = 10; // Out of bounds index

    // Act & Assert
    expect(() => findTeamMatch(matches, team, divIdx, weekIdx)).toThrow();
  });

  // Test case: Team name is an empty string
  test("findTeamMatch should return null when team name is an empty string", () => {
    // Arrange
    const matches: MatchStructure = [
      [
        // Division 0
        [
          // Week 0
          ["Team A", "Team B"],
        ],
        // ... other weeks
      ],
      // ... other divisions
    ];
    const team = ""; // Empty team name
    const divIdx = 0;
    const weekIdx = 0;

    // Act
    const result = findTeamMatch(matches, team, divIdx, weekIdx);
  });
});
