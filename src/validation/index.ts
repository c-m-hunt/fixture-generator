import { Config, ConflictsObject } from "../config/types";
import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notUnevenVenues,
  notVenueClash,
} from "./fixture";
import {
  validateOppoTeam,
  notPlayingThatWeek,
  matchesVenueRequirements,
} from "./team";

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

const generateValidationFunctions = (): ValidationFunction[] => {
  return [
    matchesVenueRequirements,
    notVenueClash,
    validateOppoTeam,
    notPlayingThatWeek,
    fixtureDoesNotExists,
    notSameVenueXWeeks,
    // notUnevenVenues,
  ];
};

export const isValid = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
  checkDependents = false,
  validationFunctions: ValidationFunction[] = generateValidationFunctions()
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

type DelendentsValid = [boolean, ConflictResponse | null] | null;

const checkDependentsValid = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string
): DelendentsValid => {
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
      return findTeamGap(
        config,
        conflictTeamDivIdx,
        weekIdx,
        conflictTeamIdx,
        conflictTeam
      );
    }
    // Away team - only match up of full reverse fixture
    if (teamIdx === 1) {
      const oppoConflict = findVenueConflictAndDiv(
        matchStructure[divIdx][weekIdx][matchIdx][0] as string,
        divTeams,
        venConflicts
      );
      // Only interested if there's a match up
      if (!oppoConflict || oppoConflict[1] != conflictTeamDivIdx) {
        // return [true, null];
        return findTeamGap(
          config,
          conflictTeamDivIdx,
          weekIdx,
          conflictTeamIdx,
          conflictTeam
        );
      }

      for (
        let mIdx = 0;
        mIdx < matchStructure[divIdx][weekIdx].length;
        mIdx++
      ) {
        if (
          oppoConflict[1] == conflictTeamDivIdx &&
          matchStructure[conflictTeamDivIdx][weekIdx][mIdx][teamIdx] ===
            oppoConflict[0] &&
          matchStructure[conflictTeamDivIdx][weekIdx][mIdx][conflictTeamIdx] ===
            null
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

const findTeamGap = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  teamIdx: number,
  team: string
): DelendentsValid => {
  const { matches: matchStructure } = config;
  for (let mIdx = 0; mIdx < matchStructure[divIdx][weekIdx].length; mIdx++) {
    if (matchStructure[divIdx][weekIdx][mIdx][teamIdx] === null) {
      return [true, [team, divIdx, weekIdx, mIdx, teamIdx]];
    }
  }
  return [false, null];
};
