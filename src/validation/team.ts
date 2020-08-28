import { MatchStructure } from "../config";

export const validateOppoTeam = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
  const otherTeam = teamIdx === 1 ? 0 : 1;
  if (matchStructure[divIdx][weekIdx][matchIdx][otherTeam] === team) {
    return false;
  }
  return true;
};

export const notPlayingThatWeek = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
  const teams = matchStructure[divIdx][weekIdx].flat(2);
  if (teams.includes(team)) {
    return false;
  }
  return true;
};
