import { ValidationFunction } from ".";
import { Fixture, Config } from "../config/types";

/**
 * Checks if a fixture does not already exist in the given configuration.
 * @param config - The configuration object.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param match - The fixture to check.
 * @returns Returns true if the fixture does not exist, otherwise false.
 */
export const fixtureDoesNotExists: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  match: Fixture
): boolean => {
  const { matches: matchStructure } = config;
  const [team1, team2] = match;
  const divMatches = matchStructure[divIdx]
    .flat()
    .find(
      (m) =>
        (m[0] === team1 && m[1] === team2) || (m[0] === team2 && m[1] === team1)
    );

  return !divMatches;
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
  match: Fixture
): boolean => {
  const { matches: matchStructure } = config;
  const { consecutiveVenueWeeks, reverseFixtures } = config.appConfig;

  for (let [teamIdx, team] of match.entries()) {
    if (!team || team === null) {
      continue;
    }
    let consecutiveWeeks = 0;
    for (let w = weekIdx - 1; w >= weekIdx - consecutiveVenueWeeks; w--) {
      if (w < 0) {
        break;
      }
      const weekFixs = matchStructure[divIdx][w].find(
        (f) => f[teamIdx] === team
      );
      if (!weekFixs) {
        break;
      }
      consecutiveWeeks++;
    }
    if (reverseFixtures && weekIdx === matchStructure[divIdx].length - 1) {
      const newTeamIdx = teamIdx === 0 ? 1 : 0;
      for (let w = 0; w < consecutiveVenueWeeks; w++) {
        const reverseWeekFixs = matchStructure[divIdx][w].find(
          (f) => f[newTeamIdx] === team
        );
        if (!reverseWeekFixs) {
          break;
        }
        consecutiveWeeks++;
      }
    }
    if (consecutiveWeeks >= consecutiveVenueWeeks) {
      return false;
    }
  }
  return true;
};

export const notPartialConflict: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  match: Fixture
): boolean => {
  const { matches: matchStructure } = config;
  const existingMatch = matchStructure[divIdx][weekIdx][matchIdx];

  // If all teams in existing match are null, return true
  if (existingMatch.every((t) => t === null)) {
    return true;
  }

  for (const teamIdx of [0, 1]) {
    if (existingMatch[0] != null && existingMatch[0] != match[0]) {
      return false;
    }
  }
  return true;
};

// /**
//  * Checks if the number of venues for a team in a given configuration is uneven.
//  * @param config - The configuration object.
//  * @param divIdx - The division index.
//  * @param weekIdx - The week index.
//  * @param matchIdx - The match index.
//  * @param teamIdx - The team index.
//  * @param team - The team name.
//  * @returns A boolean indicating whether the number of venues is uneven.
//  */
// export const notUnevenVenues: ValidationFunction = (
//   config: Config,
//   divIdx: number,
//   weekIdx: number,
//   matchIdx: number,
//   teamIdx: number,
//   team: string
// ): boolean => {
//   const { matches: matchStructure } = config;
//   const latestWeek = Math.max(weekIdx - 1, 0);
//   const earliestWeek = 0;
//   let testFixtures: Fixture[] = [];
//   for (let w = earliestWeek; w <= latestWeek; w++) {
//     const fixtures = matchStructure[divIdx][w];
//     testFixtures = testFixtures.concat([...fixtures]);
//   }

//   const venueCount = [0, 0];
//   for (const f of testFixtures) {
//     const fixTeamIdx = f.indexOf(team);
//     if (fixTeamIdx > -1) {
//       venueCount[fixTeamIdx]++;
//     }
//   }

//   venueCount[teamIdx]++;
//   return !(Math.abs(venueCount[0] - venueCount[1]) > 1);
// };

/**
 * Checks if a team has a venue clash with another team in a given fixture configuration.
 * @param config - The fixture configuration.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param match - The fixture to check.
 * @returns A boolean indicating whether there is a venue clash or not.
 */
export const notVenueClash: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  match: Fixture
): boolean => {
  const { matches: matchStructure, venConflicts } = config;
  const [team1, team2] = match;

  for (const [teamIdx, team] of match.entries()) {
    if (!team || team === null) {
      continue;
    }
    const venueTeams = matchStructure
      .map((d) => d[weekIdx])
      .flat()
      .filter((w) => w !== undefined)
      .map((f) => f[teamIdx]);

    const venueClashTeam = venConflicts[team];
    if (venueTeams.includes(venueClashTeam)) {
      return false;
    }
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
  if (fix[0] === null || fix[1] === null) {
    return false;
  }
  for (const f of fixList) {
    if (f[0] !== null && f[1] !== null && f[0] === fix[0] && f[1] === fix[1]) {
      return true;
    }
    if (checkReverse && f[1] === fix[0] && f[0] === fix[1]) {
      return true;
    }
  }
  return false;
};
