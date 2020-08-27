import { notPlayingThatWeek } from "./../team";
import { MatchStructure } from "../../config";

describe("Team validation", () => {
  it("should validate a team is playing that week", () => {
    const matchStructure: MatchStructure = [
      [
        [
          ["WAN", "CHI"],
          ["ABC", null],
        ],
      ],
    ];
    let valid = notPlayingThatWeek(matchStructure, 0, 0, 0, 0, "WAN");
    expect(valid).toBe(false);
    valid = notPlayingThatWeek(matchStructure, 0, 0, 0, 0, "DEF");
    expect(valid).toBe(true);
  });
});
