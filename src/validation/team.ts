import { Config } from "../config/types";
import { ValidationFunction } from ".";

/**
 * Validates the opposing team for a specific match.
 * @param config - The configuration object.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns A boolean indicating whether the opposing team is valid or not.
 */
export const validateOppoTeam = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  const { matches } = config;
  const otherTeam = teamIdx === 1 ? 0 : 1;
  return !(matches[divIdx][weekIdx][matchIdx][otherTeam] === team);
};

/**
 * Checks if a team is not playing in a specific week of a fixture.
 * @param config - The fixture configuration.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns A boolean indicating whether the team is not playing in that week.
 */
export const notPlayingThatWeek: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  const { matches: matchStructure } = config;
  return !matchStructure[divIdx][weekIdx].flat(2).includes(team);
};

/**
 * Checks if a tean is not playing at a specific venue for a specific week.
 * @param config - The fixture configuration.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns A boolean indicating whether the fixture does not exist.
 */
export const matchesVenueRequirements: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): boolean => {
  const { venRequirements } = config;
  const searchTeamIdx = teamIdx === 1 ? "a" : "h";
  const req = venRequirements.find(
    (v) => v.team === team && v.week === weekIdx + 1
  );
  if (!req) {
    return true;
  }
  return req.venue === searchTeamIdx;
};
