import { teamConflictsToObject, shuffle } from "../utils";
import { loadDivConfig } from "./configLoader";
import { Fixture, MatchStructure, Config, ConflictsObject } from "./types";
import { generateVenueConflicts } from "./utils";

export const setupConfig = async (): Promise<Config> => {
  const divConfig = await loadDivConfig();
  const divTeams = divConfig.map((d) => shuffle(d.teams));
  const divWeeks = divConfig.map((d) => d.teams.length - 1);
  const divNames = divConfig.map((d) => d.name);
  const venConflicts = generateVenueConflicts(divConfig);
  const venConflictsLookup = teamConflictsToObject(venConflicts, false);

  if (divTeams.length !== divWeeks.length) {
    throw new Error("Teams and weeks must be the same length");
  }
  const matches: MatchStructure = new Array(divWeeks.length);

  const fixture: Fixture = [null, null];
  for (let d = 0; d < matches.length; d++) {
    matches[d] = new Array(divWeeks[d]);
    for (let w = 0; w < matches[d].length; w++) {
      const matchCount = Math.floor(divTeams[d].length / 2);
      matches[d][w] = new Array(matchCount);
      for (let m = 0; m < matches[d][w].length; m++) {
        matches[d][w][m] = [...fixture];
      }
    }
  }

  return {
    matches,
    divTeams,
    divWeeks,
    divNames,
    venConflicts: venConflictsLookup,
  };
};
