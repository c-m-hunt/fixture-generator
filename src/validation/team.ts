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
  if (matches[divIdx][weekIdx][matchIdx][otherTeam] === team) {
    return false;
  }
  return true;
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
  const teams = matchStructure[divIdx][weekIdx].flat(2);
  if (teams.includes(team)) {
    return false;
  }
  return true;
};
