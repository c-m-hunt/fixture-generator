import { validateOppoTeam, notPlayingThatWeek } from "./team";
import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notUnevenVenues,
  notVenueClash,
} from "./fixture";
import { Config, ConflictsObject } from "../config/types";

export type ConflictResponse = [string, number, number, number, number] | null;

export const findVenueConflictAndDiv = (
  team: string,
  divTeams: string[][],
  venConflicts: ConflictsObject
): [string, number] | null => {
  if (!Object.keys(venConflicts).includes(team)) {
    return null;
  }
  const conflictTeam = venConflicts[team];
  const div = divTeams.findIndex((t) => t.includes(conflictTeam));
  return [conflictTeam, div];
};

export type ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
) => boolean;

export const isValid = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
  checkDependents = false,
  validationFunctions: ValidationFunction[] = [
    validateOppoTeam,
    notPlayingThatWeek,
    fixtureDoesNotExists,
    notSameVenueXWeeks,
    notUnevenVenues,
    notVenueClash,
  ]
): [boolean, ConflictResponse | null] => {
  for (const v of validationFunctions) {
    if (!v(config, divIdx, weekIdx, matchIdx, teamIdx, team)) {
      return [false, null];
    }
  }

  if (checkDependents) {
    const dependentsValid = checkDependentsValid(
      config,
      divIdx,
      weekIdx,
      matchIdx,
      teamIdx,
      team
    );
    if (dependentsValid) {
      return dependentsValid;
    }
  }
  return [true, null];
};

const checkDependentsValid = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): [boolean, ConflictResponse | null] | null => {
  const { matches: matchStructure, divTeams, venConflicts } = config;
  const teamDiv = findVenueConflictAndDiv(team, divTeams, venConflicts);

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
          matchStructure[conflictTeamDivIdx][weekIdx][mIdx][conflictTeamIdx] ===
          null
        ) {
          return [
            true,
            [conflictTeam, conflictTeamDivIdx, weekIdx, mIdx, conflictTeamIdx],
          ];
        }
      }
      return [false, null];
    }
    // Away team - only match up of full reverse fixture
    if (teamIdx === 1) {
      const oppoConflict = findVenueConflictAndDiv(
        matchStructure[divIdx][weekIdx][matchIdx][0] as string,
        divTeams,
        venConflicts
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
            [conflictTeam, conflictTeamDivIdx, weekIdx, mIdx, conflictTeamIdx],
          ];
        }
      }
    }
  }
  return null;
};
