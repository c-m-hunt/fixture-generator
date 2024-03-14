import { Fixture, FixtureCheck, MatchStructure } from "../../config/types";
import {
  completedState,
  matchUsed,
  teamConflictsToObject,
  matchFilled,
  matchPartiallyFilled,
} from "./../utils";

describe("Utils", () => {
  it("should convert conflict array to objects", () => {
    const conflicts: [string, string][] = [
      ["WAN1", "WAN2"],
      ["CHI1", "CHI2"],
    ];

    const conflictObj = teamConflictsToObject(conflicts);
    expect(Object.keys(conflictObj).length).toBe(2);
    expect(conflictObj["WAN1"]).toEqual("WAN2");
  });
  it("should convert conflict array to objects and produce reverse", () => {
    const conflicts: [string, string][] = [
      ["WAN1", "WAN2"],
      ["CHI1", "CHI2"],
    ];

    const conflictObj = teamConflictsToObject(conflicts, true);
    expect(Object.keys(conflictObj).length).toBe(4);
    expect(conflictObj["WAN2"]).toEqual("WAN1");
    expect(conflictObj["WAN1"]).toEqual("WAN2");
  });

  it("should give a percentage of completed fixtures", () => {
    let matches = [
      [
        [
          ["BRE1", "WAN1"],
          ["CHE1", "SOS1"],
        ],
      ],
    ] as MatchStructure;
    expect(completedState(matches)).toBe(1);

    matches = [
      [
        [
          ["BRE1", "WAN1"],
          ["CHE1", null],
        ],
        [
          ["BRE1", "WAN1"],
          ["CHE1", "SOS1"],
        ],
      ],
    ] as MatchStructure;
    expect(completedState(matches)).toBe(0.75);

    matches = [
      [
        [
          ["BRE1", "WAN1"],
          ["CHE1", null],
        ],
        [
          [null, null],
          ["CHE1", "SOS1"],
        ],
      ],
    ] as MatchStructure;
    expect(completedState(matches)).toBe(0.5);
  });
});

describe("matchPartiallyFilled", () => {
  test("should return true for a partially filled match", () => {
    // Arrange
    const partiallyFilledMatch: Fixture = [null, "TeamA"];

    // Act
    const result = matchPartiallyFilled(partiallyFilledMatch);

    // Assert
    expect(result).toBe(true);
  });

  test("should return false for a fully filled match", () => {
    // Arrange
    const fullyFilledMatch: Fixture = ["TeamA", "TeamB"];

    // Act
    const result = matchPartiallyFilled(fullyFilledMatch);

    // Assert
    expect(result).toBe(false);
  });

  test("should return false for an empty match", () => {
    // Arrange
    const emptyMatch: Fixture = [null, null];

    // Act
    const result = matchPartiallyFilled(emptyMatch);

    // Assert
    expect(result).toBe(false);
  });
  // Add more tests if there are more branches or edge cases to cover
});
