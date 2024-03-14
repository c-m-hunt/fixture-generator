import { Config, Fixture } from "../config/types";
import { ValidationFunction } from ".";

/**
 * Validate whether teams are not already playing that week
 *
 * @param config
 * @param divIdx
 * @param weekIdx
 * @param matchIdx
 * @param match
 * @returns
 */
export const teamsNotPlayingThatWeek: ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  match: Fixture
): boolean => {
  const [team1, team2] = match;
  const { matches: matchStructure } = config;

  const teams = matchStructure[divIdx][weekIdx]
    .flat(2)
    .filter((t) => t !== null);

  return !teams.includes(team1) && !teams.includes(team2);
};
