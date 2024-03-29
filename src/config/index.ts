import { applyConflict } from "../process/process";
import { setSeed, shuffle, teamConflictsToObject } from "../process/utils";
import { isValid } from "../validation";
import {
  loadDivConfig,
  loadFixtureReqConfig,
  loadVenReqConfig,
} from "./configLoader";
import { Config, Fixture, MatchStructure } from "./types";
import { generateVenueConflicts } from "./utils";
import { config as appConfig } from "../appConfig";

/**
 * Sets up the configuration for generating fixtures.
 *
 * @returns A promise that resolves to a Config object.
 */
export const setupConfig = async (): Promise<Config> => {
  const seed = setSeed();
  const divConfig = await loadDivConfig();
  const venReqConfig = await loadVenReqConfig();
  const fixtureReqConfig = await loadFixtureReqConfig();
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

  let venReqConfigSuffled = venReqConfig
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  const config = {
    seed,
    matches,
    divTeams,
    divWeeks,
    divNames,
    venRequirements: venReqConfigSuffled,
    fixtureRequirements: fixtureReqConfig,
    venConflicts: venConflictsLookup,
    appConfig,
  };

  // matches = populateVenueRequirements(config);

  matches = populateFixtureRequirements(config);

  return { ...config, matches };
};

const populateFixtureRequirements = (config: Config): MatchStructure => {
  const { matches, divTeams, venRequirements, fixtureRequirements } = config;
  for (const fix of fixtureRequirements) {
    const { week, team1, team2 } = fix;
    const divIdx = divTeams.findIndex(
      (d) => d.includes(team1) && d.includes(team2)
    );
    if (divIdx === -1) {
      throw new Error("Teams not found in the same division");
    }
    const weekIdx = week - 1;
    for (const matchIdx in matches[divIdx][weekIdx]) {
      const [valid1, conflict1] = isValid(
        config,
        divIdx,
        weekIdx,
        parseInt(matchIdx),
        0,
        team1,
        true
      );
      const [valid2, conflict2] = isValid(
        config,
        divIdx,
        weekIdx,
        parseInt(matchIdx),
        1,
        team2,
        true
      );
      if (valid1 && valid2) {
        matches[divIdx][weekIdx][matchIdx][0] = team1;
        applyConflict(matches, conflict1);
        matches[divIdx][weekIdx][matchIdx][1] = team2;
        applyConflict(matches, conflict2);
        break;
      }
    }
  }
  return matches;
};

/**
 * Populates the venue requirements for matches in a given division.
 *
 * DEPRECATED: This function is no longer used.
 *
 * @param config - The configuration object.
 * @returns The updated structure of matches with venue requirements populated.
 */
const populateVenueRequirements = (config: Config): MatchStructure => {
  const { matches, divTeams, venRequirements, venConflicts } = config;
  for (const req of venRequirements) {
    const { team, venue, week } = req;
    const divIdx = divTeams.findIndex((d) => d.includes(team));
    if (divIdx === -1) {
      continue;
    }
    const weekIdx = week - 1;
    const venIdx = venue === "h" ? 0 : 1;
    for (const matchIdx in matches[divIdx][weekIdx]) {
      const [valid, conflict] = isValid(
        config,
        divIdx,
        weekIdx,
        parseInt(matchIdx),
        venIdx,
        team,
        true
      );
      if (valid) {
        matches[divIdx][weekIdx][matchIdx][venIdx] = team;
        applyConflict(matches, conflict);
        break;
      }
    }
  }
  return matches;
};
