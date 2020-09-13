import { MatchStructure, divNames } from "../config";
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
import { venConflictsLookup, divTeams } from "../config";
import { displayOutput } from "../utils";

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

type ValidationFunction = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
) => boolean;

export const isValid = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
  checkDependents: boolean = false,
  validationFunctions: ValidationFunction[] = [
    validateOppoTeam,
    notPlayingThatWeek,
    fixtureDoesNotExists,
    notSameVenueXWeeks,
    notUnevenVenues,
    notVenueClash,
  ],
): [boolean, ConflictResponse | null] => {
  for (const v of validationFunctions) {
    if (
      !v(matchStructure, divIdx, weekIdx, matchIdx, teamIdx, team)
    ) {
      return [false, null];
    }
  }

  if (team === "WAN2" && weekIdx === 0) {
    console.log(divIdx, weekIdx, matchIdx, teamIdx);
    displayOutput(matchStructure, divNames);
  }

  if (checkDependents) {
    const dependentsValid = checkDependentsValid(
      matchStructure,
      divIdx,
      weekIdx,
      matchIdx,
      teamIdx,
      team,
    );
    if (dependentsValid) {
      return dependentsValid;
    }
  }
  return [true, null];
};

const checkDependentsValid = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): [boolean, ConflictResponse | null] | null => {
  const teamDiv = findVenueConflictAndDiv(team);

  if (teamDiv) {
    const [conflictTeam, conflictTeamDivIdx] = teamDiv;
    if (conflictTeamDivIdx === -1) {
      return [true, null];
    }
    const conflictTeamIdx = teamIdx === 1 ? 0 : 1;
    // Fill in home teams
    if (teamIdx === 0) {
      for (
        let mIdx = 0;
        mIdx < matchStructure[divIdx][weekIdx].length;
        mIdx++
      ) {
        if (
          matchStructure[conflictTeamDivIdx][weekIdx][mIdx][
            conflictTeamIdx
          ] ===
            null
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
      // console.log(conflictTeam, conflictTeamDivIdx, weekIdx, conflictTeamIdx);
      // displayOutput(matchStructure);
      return [false, null];
    }
    // Away team - only match up of full reverse fixture
    if (teamIdx === 1) {
      let oppoConflict = findVenueConflictAndDiv(
        //@ts-ignore
        matchStructure[divIdx][weekIdx][matchIdx][0],
      );
      // Only interested if there's a match up
      if (!oppoConflict) {
        return [true, null];
      }

      for (
        let mIdx = 0;
        mIdx < matchStructure[divIdx][weekIdx].length;
        mIdx++
      ) {
        if (
          oppoConflict[1] == conflictTeamDivIdx &&
          matchStructure[conflictTeamDivIdx][weekIdx][mIdx][teamIdx] ===
            oppoConflict[0]
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
  }
  return null;
};
