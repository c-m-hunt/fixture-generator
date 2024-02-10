import { Config } from "../config/types";
import { ValidationFunction } from ".";

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
