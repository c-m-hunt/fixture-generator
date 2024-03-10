import { Config } from "../../../config/types";
import { PlayCricketWriter } from "../index";

export const config: Config = {
  seed: 1,
  matches: [],
  divTeams: [],
  divNames: [],
  divWeeks: [],
  venConflicts: {},
  venRequirements: [],
  fixtureRequirements: [],
  appConfig: {
    reverseFixtures: false,
    exitPct: 0.5,
    startDate: new Date(),
    checkInterval: 1000,
    improvementCheckInterval: 1000,
    consecutiveVenueWeeks: 2,
    outputPath: "outputPath",
    s3Path: {
      key: "key",
      bucket: "bucket",
    },
  },
};

describe("Play", () => {
  it("should initialise and load mappings", () => {
    const formatter = new PlayCricketWriter(config);
    expect(formatter.mappings[0]).toEqual({
      team: "CHI1",
      divisionId: 117997,
      teamId: 46056,
      ground: 12335,
    });
  });

  it("should throw error if no output path given", () => {
    const formatter = new PlayCricketWriter(config);
    expect(() => formatter.writeOutput()).toThrow("No output path set");
  });

  it("should throw error if no data given", () => {
    const formatter = new PlayCricketWriter(config);
    formatter.outputPath = "test";
    expect(() => formatter.writeOutput()).toThrow("No data to output");
  });
});
