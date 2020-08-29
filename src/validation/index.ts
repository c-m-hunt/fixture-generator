import { MatchStructure } from "../config";
import {
  validateOppoTeam,
  notPlayingThatWeek,
} from "./team";
import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notUnevenVenues,
  notVenueClash,
} from "./fixture";
import { venConflictsLookup, divTeams } from "../config/config";

export type ConflictResponse = [string, number, number, number, number] | null;

export const findVenueConflictAndDiv = (
  team: string,
): [string, number] | null => {
  if (!Object.keys(venConflictsLookup).includes(team)) {
    return null;
  }
  const conflictTeam = venConflictsLookup[team];
  const div = divTeams.findIndex((t) => t.includes(conflictTeam));
  return [conflictTeam, div];
};

export const isValid = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
  checkDependents: boolean = false,
): [boolean, ConflictResponse | null] => {
  const validationFunctions = [
    validateOppoTeam,
    notPlayingThatWeek,
    fixtureDoesNotExists,
    notSameVenueXWeeks,
    notUnevenVenues,
    notVenueClash,
  ];

  for (const v of validationFunctions) {
    if (
      !v(matchStructure, divIdx, weekIdx, matchIdx, teamIdx, team)
    ) {
      return [false, null];
    }
  }

  if (checkDependents) {
    const teamDiv = findVenueConflictAndDiv(team);
    if (teamDiv) {
      const [conflictTeam, conflictTeamDivIdx] = teamDiv;
      if (conflictTeamDivIdx === -1) {
        return [true, null];
      }
      const conflictTeamIdx = teamIdx === 1 ? 0 : 1;
      for (
        let mIdx = 0;
        mIdx < matchStructure[divIdx][weekIdx].length;
        mIdx++
      ) {
        if (
          matchStructure[conflictTeamDivIdx][weekIdx][mIdx][conflictTeamIdx] ===
            null
        ) {
          // console.log(
          //   "Trying ",
          //   conflictTeamDivIdx,
          //   weekIdx,
          //   mIdx,
          //   conflictTeamIdx,
          // );
          const [conflictValid, _] = isValid(
            matchStructure,
            conflictTeamDivIdx,
            weekIdx,
            mIdx,
            conflictTeamIdx,
            conflictTeam,
            false,
          );
          if (
            conflictValid
          ) {
            return [
              true,
              [
                conflictTeam,
                conflictTeamDivIdx,
                weekIdx,
                mIdx,
                conflictTeamIdx,
              ],
            ];
          }
        }
      }
      // console.log(conflictTeam, conflictTeamDivIdx, weekIdx, conflictTeamIdx);
      // displayOutput(matchStructure);
      return [false, null];
    }
  }
  return [true, null];
};
