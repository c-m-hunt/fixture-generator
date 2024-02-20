import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notVenueClash,
} from "../fixture";
import { Config, MatchStructure } from "../../config/types";

describe("Fixture validation", () => {
  it("should validate a team is playing that week", () => {
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
      ],
    ];
    const config: Config = {
      seed: 1,
      venRequirements: [],
      matches,
      divTeams: [["WAN", "CHI", "ABC"]],
      divNames: ["A"],
      divWeeks: [1],
      venConflicts: {},
    };
    const valid = fixtureDoesNotExists(config, 0, 1, 1, 1, "CHI");
    expect(valid).toBe(false);
  });

  it("should validate not same venue for three weeks", () => {
    const matches: MatchStructure = [
      [
        [
          ["WAN", "WHA"],
          ["ABC", "BAS"],
        ],
        [
          ["ABC", "CHI"],
          ["WAN", "CHI"],
        ],
        [
          ["ABC", "CHI"],
          ["WHA", "CHI"],
        ],
        [
          ["WHA", "CHE"],
          ["SOS", null],
        ],
      ],
    ];
    let valid = true;
    const config: Config = {
      seed: 1,
      venRequirements: [],
      matches,
      divTeams: [["WAN", "CHI", "ABC"]],
      divNames: ["A"],
      divWeeks: [1],
      venConflicts: {},
    };
    valid = notSameVenueXWeeks(config, 0, 2, 1, 0, "WAN");
    expect(valid).toBe(false);
    valid = notSameVenueXWeeks(config, 0, 2, 1, 0, "CHI");
    expect(valid).toBe(true);
    // // If the fixtures reverse, the same team shouldn't be valid if
    // // last venue is the same as the reverse of the first two
    valid = notSameVenueXWeeks(config, 0, 3, 1, 1, "WAN");
    expect(valid).toBe(false);
    valid = notSameVenueXWeeks(config, 0, 3, 1, 0, "WHA");
    expect(valid).toBe(false);
  });

  it("should validate ground available", () => {
    const matches: MatchStructure = [
      [
        [
          ["WAN1", "CHI1"],
          ["ABC1", "BAS1"],
        ],
      ],
      [
        [
          ["ABC1", "CHI1"],
          [null, "CHI1"],
        ],
      ],
    ];
    const config: Config = {
      seed: 1,
      venRequirements: [],
      matches,
      divTeams: [["WAN", "CHI", "ABC"]],
      divNames: ["A"],
      divWeeks: [1],
      venConflicts: { WAN2: "WAN1" },
    };
    expect(notVenueClash(config, 1, 0, 1, 1, "WAN2")).toBe(true);
    expect(notVenueClash(config, 1, 0, 1, 0, "WAN2")).toBe(false);
  });
});
