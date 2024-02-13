import { ValidationFunction } from ".";
import { Fixture, Config } from "../config/types";

/**
 * Checks if a fixture does not already exist in the given configuration.
 * @param config - The configuration object.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns Returns true if the fixture does not exist, otherwise false.
 */
export const fixtureDoesNotExists: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  if (teamIdx === 0) {
    return true;
  }
  const { matches: matchStructure } = config;
  const match: Fixture = [...matchStructure[divIdx][weekIdx][matchIdx]];
  match[teamIdx] = team;
  const divMatches = matchStructure[divIdx].flat();
  const filteredDivMatches = divMatches.filter(
    (m) => m[0] !== null && m[1] !== null
  );

  if (fixtureExists(filteredDivMatches, match)) {
    return false;
  }
  return true;
};

/**
 * Checks if a team has played in the same venue for consecutive weeks.
 *
 * @param config - The configuration object.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns A boolean indicating whether the team has played in the same venue for consecutive weeks.
 */
export const notSameVenueXWeeks: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  const { matches: matchStructure } = config;
  const consecutiveVenueWeeks = 2;
  const latestWeek = Math.max(weekIdx - 1, 0);
  const earliestWeek = Math.max(weekIdx - consecutiveVenueWeeks, 0);
  let testFixtures: Fixture[] = [];
  for (let w = earliestWeek; w <= latestWeek; w++) {
    const fixtures = matchStructure[divIdx][w];
    testFixtures = testFixtures.concat([...fixtures]);
  }
  let invalidCount = 0;
  for (const f of testFixtures) {
    const fixTeamIdx = f.indexOf(team);
    if (fixTeamIdx > -1 && fixTeamIdx == teamIdx) {
      invalidCount++;
    }
  }
  if (invalidCount === consecutiveVenueWeeks) {
    return false;
  }
  return true;
};

/**
 * Checks if the number of venues for a team in a given configuration is uneven.
 * @param config - The configuration object.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns A boolean indicating whether the number of venues is uneven.
 */
export const notUnevenVenues: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  const { matches: matchStructure } = config;
  const latestWeek = Math.max(weekIdx - 1, 0);
  const earliestWeek = 0;
  let testFixtures: Fixture[] = [];
  for (let w = earliestWeek; w <= latestWeek; w++) {
    const fixtures = matchStructure[divIdx][w];
    testFixtures = testFixtures.concat([...fixtures]);
  }

  const venueCount = [0, 0];
  for (const f of testFixtures) {
    const fixTeamIdx = f.indexOf(team);
    if (fixTeamIdx > -1) {
      venueCount[fixTeamIdx]++;
    }
  }

  venueCount[teamIdx]++;

  if (Math.abs(venueCount[0] - venueCount[1]) > 1) {
    return false;
  }
  return true;
};

/**
 * Checks if a team has a venue clash with another team in a given fixture configuration.
 * @param config - The fixture configuration.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns A boolean indicating whether there is a venue clash or not.
 */
export const notVenueClash: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  const { matches: matchStructure, venConflicts } = config;
  if (teamIdx === 1) {
    return true;
  }

  const homeTeams = matchStructure
    .map((d) => d[weekIdx])
    .flat()
    .filter((w) => w !== undefined)
    .map((f) => f[0]);

  const clashTeam = venConflicts[team];
  if (homeTeams.includes(clashTeam)) {
    return false;
  }
  return true;
};

/**
 * Checks if a fixture exists in a given list of fixtures.
 * @param fixList - The list of fixtures to check.
 * @param fix - The fixture to search for.
 * @param checkReverse - Optional. Specifies whether to check for the reverse of the fixture as well. Default is true.
 * @returns True if the fixture exists in the list, false otherwise.
 */
const fixtureExists = (
  fixList: Fixture[],
  fix: Fixture,
  checkReverse = true
): boolean => {
  for (const f of fixList) {
    if (f[0] !== null && f[1] !== null && f[0] === fix[0] && f[1] === fix[1]) {
      return true;
    }
    if (checkReverse && f[1] === fix[0] && f[0] === fix[1]) {
      return true;
    }
  }
  //logger.debug("Fails fixtureExists");
  return false;
};
