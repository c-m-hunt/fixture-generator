import { teamConflictsToObject, shuffle, setSeed } from "../utils";
import { loadDivConfig, loadVenReqConfig } from "./configLoader";
import { Fixture, MatchStructure, Config, VenRequirements } from "./types";
import { generateVenueConflicts } from "./utils";

export const setupConfig = async (): Promise<Config> => {
  const seed = setSeed();
  const divConfig = await loadDivConfig();
  const venReqConfig = await loadVenReqConfig();
  const divTeams = divConfig.map((d) => shuffle(d.teams));
  const divWeeks = divConfig.map((d) => d.teams.length - 1);
  const divNames = divConfig.map((d) => d.name);
  const venConflicts = generateVenueConflicts(divConfig);
  const venConflictsLookup = teamConflictsToObject(venConflicts, false);

  if (divTeams.length !== divWeeks.length) {
    throw new Error("Teams and weeks must be the same length");
  }
  let matches: MatchStructure = new Array(divWeeks.length);

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

  matches = populateVenueRequirements(matches, divTeams, venReqConfig);

  return {
    seed,
    matches,
    divTeams,
    divWeeks,
    divNames,
    venRequirements: venReqConfig,
    venConflicts: venConflictsLookup,
  };
};

const populateVenueRequirements = (
  matches: MatchStructure,
  divTeams: string[][],
  venReq: VenRequirements[]
) => {
  for (const req of venReq) {
    const { team, venue, week } = req;
    const divIdx = divTeams.findIndex((d) => d.includes(team));
    if (divIdx === -1) {
      return matches;
    }
    const weekIdx = week - 1;
    const venIdx = venue === "h" ? 0 : 1;
    for (const match of matches[divIdx][weekIdx]) {
      if (match[venIdx] === null) {
        match[venIdx] = team;
        break;
      }
    }
  }
  return matches;
};
