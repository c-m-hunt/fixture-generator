import {
  fixtureDoesNotExists,
  notPartialConflict,
  notSameVenueXWeeks,
  notVenueClash,
} from "../fixture";
import { Config, Fixture, MatchStructure } from "../../config/types";
import { generalConfig } from "./utils";

describe("Fixture validation", () => {
  it("should validate a match doesn't already exist", () => {
    const matches: MatchStructure = [
      [
        [
          ["WAN", "CHI"],
          ["ABC", "BAS"],
        ],
        [
          ["ABC", "CHI"],
          ["WAN", null],
        ],
        [
          ["ABC", "SOS"],
          [null, "WAN"],
        ],
      ],
    ];
    const config: Config = {
      ...generalConfig,
      matches,
      divTeams: [["WAN", "CHI", "ABC"]],
      divNames: ["A"],
      divWeeks: [1],
    };
    let valid = fixtureDoesNotExists(config, 0, 1, 1, ["WAN", "CHI"]);
    expect(valid).toBe(false);
    valid = fixtureDoesNotExists(config, 0, 1, 1, ["CHI", "WAN"]);
    expect(valid).toBe(false);
    valid = fixtureDoesNotExists(config, 0, 1, 1, ["CHI", "SOS"]);
    expect(valid).toBe(true);
  });

  // it("should validate a team is playing that week", () => {
  //   const matches: MatchStructure = [
  //     [
  //       [
  //         ["WAN", "CHI"],
  //         ["ABC", "BAS"],
  //       ],
  //       [
  //         ["ABC", "CHI"],
  //         ["WAN", null],
  //       ],
  //       [
  //         ["ABC", "SOS"],
  //         [null, "WAN"],
  //       ],
  //     ],
  //   ];
  //   const config: Config = {
  //     ...generalConfig,
  //     matches,
  //     divTeams: [["WAN", "CHI", "ABC"]],
  //     divNames: ["A"],
  //     divWeeks: [1],
  //   };
  //   let valid = fixtureDoesNotExists(config, 0, 1, 1, 1, "CHI");
  //   expect(valid).toBe(false);
  //   valid = fixtureDoesNotExists(config, 0, 1, 1, 1, "SOS");
  //   expect(valid).toBe(true);
  //   valid = fixtureDoesNotExists(config, 0, 2, 1, 0, "CHI");
  //   expect(valid).toBe(false);
  // });

  // it("should validate not same venue for three weeks", () => {
  //   const matches: MatchStructure = [
  //     [
  //       [
  //         ["WAN", "WHA"],
  //         ["ABC", "BAS"],
  //       ],
  //       [
  //         ["ABC", "CHI"],
  //         ["WAN", "CHI"],
  //       ],
  //       [
  //         ["ABC", "CHI"],
  //         ["WHA", "CHI"],
  //       ],
  //       [
  //         ["WHA", "CHE"],
  //         ["SOS", null],
  //       ],
  //     ],
  //   ];
  //   let valid = true;
  //   const config: Config = {
  //     ...generalConfig,
  //     matches,
  //     divTeams: [["WAN", "CHI", "ABC"]],
  //     divNames: ["A"],
  //     divWeeks: [1],
  //     appConfig: {
  //       ...generalConfig.appConfig,
  //       consecutiveVenueWeeks: 2,
  //       reverseFixtures: true,
  //     },
  //   };
  //   valid = notSameVenueXWeeks(config, 0, 2, 1, 0, "WAN");
  //   expect(valid).toBe(false);
  //   valid = notSameVenueXWeeks(config, 0, 2, 1, 0, "CHI");
  //   expect(valid).toBe(true);
  //   // // If the fixtures reverse, the same team shouldn't be valid if
  //   // // last venue is the same as the reverse of the first two
  //   valid = notSameVenueXWeeks(config, 0, 3, 1, 1, "WAN");
  //   expect(valid).toBe(false);
  //   valid = notSameVenueXWeeks(config, 0, 3, 1, 0, "WHA");
  //   expect(valid).toBe(false);
  // });

  // it("should validate ground available", () => {
  //   const matches: MatchStructure = [
  //     [
  //       [
  //         ["WAN1", "CHI1"],
  //         ["ABC1", "BAS1"],
  //       ],
  //     ],
  //     [
  //       [
  //         ["ABC1", "CHI1"],
  //         [null, "CHI1"],
  //       ],
  //     ],
  //   ];
  //   const config: Config = {
  //     ...generalConfig,
  //     matches,
  //     divTeams: [["WAN", "CHI", "ABC"]],
  //     divNames: ["A"],
  //     divWeeks: [1],
  //     venConflicts: { WAN2: "WAN1" },
  //   };
  //   expect(notVenueClash(config, 1, 0, 1, 1, "WAN2")).toBe(true);
  //   expect(notVenueClash(config, 1, 0, 1, 0, "WAN2")).toBe(false);
  // });
});

describe("notPartialConflict", () => {
  // Happy path test with all teams in existing match as null
  test("should return true when all teams in existing match are null", () => {
    // Arrange
    const config: Config = {
      matches: [[[[null, null] as Fixture]]],
    };
    const divIdx = 0;
    const weekIdx = 0;
    const matchIdx = 0;
    const match: Fixture = ["test1", "test2"];

    // Act
    const result = notPartialConflict(config, divIdx, weekIdx, matchIdx, match);

    // Assert
    expect(result).toBe(true);
  });

  // Happy path test with matching teams
  test("should return true when existing match and new match have the same teams", () => {
    // Arrange
    const config: Config = {
      matches: [[[["test1", "test2"] as Fixture]]],
    };
    const divIdx = 0;
    const weekIdx = 0;
    const matchIdx = 0;
    const match: Fixture = ["test1", "test2"];

    // Act
    const result = notPartialConflict(config, divIdx, weekIdx, matchIdx, match);

    // Assert
    expect(result).toBe(true);
  });

  // Happy path test with one matching team
  test("should return true when existing match and new match have the same single", () => {
    // Arrange
    const config: Config = {
      matches: [[[["test1", null] as Fixture]]],
    };
    const divIdx = 0;
    const weekIdx = 0;
    const matchIdx = 0;
    const match: Fixture = ["test1", "test2"];

    // Act
    const result = notPartialConflict(config, divIdx, weekIdx, matchIdx, match);

    // Assert
    expect(result).toBe(true);
  });

  // Edge case test with one null team in existing match
  test("should return false when existing match has one null team and does not match new team", () => {
    // Arrange
    const config: Config = {
      matches: [[[["test1", null] as Fixture]]],
    };
    const divIdx = 0;
    const weekIdx = 0;
    const matchIdx = 0;
    const match: Fixture = ["test2", "test3"];

    // Act
    const result = notPartialConflict(config, divIdx, weekIdx, matchIdx, match);

    // Assert
    expect(result).toBe(false);
  });

  // Edge case test with different teams
  test("should return false when existing match and new match have different teams", () => {
    // Arrange
    const config: Config = {
      matches: [[[["test1", "test2"] as Fixture]]],
    };
    const divIdx = 0;
    const weekIdx = 0;
    const matchIdx = 0;
    const match: Fixture = ["test3", "test4"];

    // Act
    const result = notPartialConflict(config, divIdx, weekIdx, matchIdx, match);

    // Assert
    expect(result).toBe(false);
  });
});
