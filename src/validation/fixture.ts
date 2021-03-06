import { MatchStructure, Fixture } from "../config";
import { venConflictsLookup } from "../config";
import { logger } from "../logger";

export const fixtureDoesNotExists = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
  if (teamIdx === 0) {
    return true;
  }

  const match: Fixture = [...matchStructure[divIdx][weekIdx][matchIdx]];
  match[teamIdx] = team;
  const divMatches = matchStructure[divIdx].flat();
  const filteredDivMatches = divMatches.filter((m) =>
    m[0] !== null && m[1] !== null
  );

  if (fixtureExists(filteredDivMatches, match)) {
    return false;
  }
  return true;
};

export const notSameVenueXWeeks = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
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

export const notUnevenVenues = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
  const consecutiveVenueWeeks = 2;
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

export const notVenueClash = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
  if (teamIdx === 1) {
    return true;
  }

  const homeTeams = matchStructure.map((d) => d[weekIdx]).flat()
    .filter((w) => w !== undefined)
    .map((f) => f[0]);

  const clashTeam = venConflictsLookup[team];
  if (homeTeams.includes(clashTeam)) {
    //logger.debug("Fails notVenueClash");
    return false;
  }
  return true;
};

const fixtureExists = (
  fixList: Fixture[],
  fix: Fixture,
  checkReverse: boolean = true,
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
