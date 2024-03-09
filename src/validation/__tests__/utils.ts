import { Config } from "../../config/types";

export const generalConfig: Config = {
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
