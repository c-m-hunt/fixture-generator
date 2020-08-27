import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notVenueClash,
} from "../fixture";
import { MatchStructure } from "../../config";

describe("Fixture validation", () => {
  it("should validate a team is playing that week", () => {
    const matchStructure: MatchStructure = [
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
    let valid = fixtureDoesNotExists(matchStructure, 0, 1, 1, 1, "CHI");
    expect(valid).toBe(false);
  });

  it("should validate not same venue for three weeks", () => {
    const matchStructure: MatchStructure = [
      [
        [
          ["WAN", "CHI"],
          ["ABC", "BAS"],
        ],
        [
          ["ABC", "CHI"],
          ["WAN", "CHI"],
        ],
        [
          ["ABC", "CHI"],
          [null, "CHI"],
        ],
      ],
    ];
    let valid = true;
    valid = notSameVenueXWeeks(matchStructure, 0, 2, 1, 0, "WAN");
    expect(valid).toBe(false);
    valid = notSameVenueXWeeks(matchStructure, 0, 2, 1, 0, "CHI");
    expect(valid).toBe(true);
  });

  it("should validate ground available", () => {
    const matchStructure: MatchStructure = [
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
    expect(notVenueClash(matchStructure, 1, 0, 1, 1, "WAN2")).toBe(true);
    expect(notVenueClash(matchStructure, 1, 0, 1, 0, "WAN2")).toBe(
      false,
    );
  });
});
