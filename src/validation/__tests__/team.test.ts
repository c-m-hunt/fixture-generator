import { notPlayingThatWeek } from "./../team";
import { Config, MatchStructure } from "../../config/types";

describe("Team validation", () => {
  it("should validate a team is playing that week", () => {
    const matches: MatchStructure = [
      [
        [
          ["WAN", "CHI"],
          ["ABC", null],
        ],
      ],
    ];
    const config: Config = {
      matches,
      divTeams: [["WAN", "CHI", "ABC"]],
      divNames: ["A"],
      divWeeks: [1],
      venConflicts: {},
    };
    let valid = notPlayingThatWeek(config, 0, 0, 0, 0, "WAN");
    expect(valid).toBe(false);
    valid = notPlayingThatWeek(config, 0, 0, 0, 0, "DEF");
    expect(valid).toBe(true);
  });
});
