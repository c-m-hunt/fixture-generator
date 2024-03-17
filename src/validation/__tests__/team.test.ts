import { teamsNotPlayingThatWeek } from "./../team";
import { Config, MatchStructure } from "../../config/types";
import { generalConfig } from "./utils";

describe("Team validation", () => {
  it("should validate a team is playing that week", () => {
    const matches: MatchStructure = [
      [
        [
          ["WAN", "CHI"],
          ["ABC", "SOS"],
          ["LOS", null],
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
    let valid = teamsNotPlayingThatWeek(config, 0, 0, 3, ["WAN", "BLA"]);
    expect(valid).toBe(false);
    valid = teamsNotPlayingThatWeek(config, 0, 0, 3, ["WHA", "BLA"]);
    expect(valid).toBe(true);
    valid = teamsNotPlayingThatWeek(config, 0, 0, 3, ["WAN", null]);
    expect(valid).toBe(false);
    valid = teamsNotPlayingThatWeek(config, 0, 0, 3, [null, "WAN"]);
    expect(valid).toBe(false);
    valid = teamsNotPlayingThatWeek(config, 0, 0, 3, [null, "WES"]);
    expect(valid).toBe(true);

    valid = teamsNotPlayingThatWeek(config, 0, 0, 2, ["SOM", "LOS"]);
    expect(valid).toBe(true);
  });

  // it("should validate if a team has venue requirements", () => {
  //   const config: Config = {
  //     ...generalConfig,
  //     venRequirements: [
  //       { team: "WAN", week: 1, venue: "a" },
  //       { team: "CHI", week: 2, venue: "h" },
  //     ],
  //   };
  //   // Team with venue requirements can only play at home
  //   let valid = matchesVenueRequirements(config, 0, 0, 0, 0, "WAN");
  //   expect(valid).toBe(false);
  //   valid = matchesVenueRequirements(config, 0, 0, 0, 1, "WAN");
  //   expect(valid).toBe(true);
  //   // Team with no requirements can play home or away
  //   valid = matchesVenueRequirements(config, 0, 0, 0, 0, "SOS");
  //   expect(valid).toBe(true);
  //   valid = matchesVenueRequirements(config, 0, 0, 0, 1, "SOS");
  //   expect(valid).toBe(true);
  //   // Team with venue requirements one week aren't affected next week
  //   valid = matchesVenueRequirements(config, 0, 1, 0, 0, "WAN");
  //   expect(valid).toBe(true);
  //   valid = matchesVenueRequirements(config, 0, 1, 0, 1, "WAN");
  //   expect(valid).toBe(true);
  //   // Couple of other adhoc tests
  //   valid = matchesVenueRequirements(config, 0, 1, 0, 1, "CHI");
  //   expect(valid).toBe(false);
  //   valid = matchesVenueRequirements(config, 0, 2, 0, 0, "ABC");
  //   expect(valid).toBe(true);
  // });
});
