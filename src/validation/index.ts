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

/**
 * Finds the conflicting team and division for a given team based on venue conflicts.
 * @param {string} team - The team for which to find the conflicting team and division.
 * @param {string[][]} divTeams - The array of division teams.
 * @param {ConflictsObject} venConflicts - The object containing venue conflicts.
 * @returns {[string, number] | null} - An array containing the conflicting team and division, or null if no conflicts exist.
 */
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
    validateOppoTeam,
    notPlayingThatWeek,
    matchesVenueRequirements,
    notVenueClash,
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

export const checkDependentsValid = (
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
    // Grab the conflicting team and division
    const [conflictTeam, conflictTeamDivIdx] = teamDiv;

    // If there's no conflict, return true
    if (conflictTeamDivIdx === -1) {
      return [true, null];
    }
    const conflictTeamIdx = teamIdx === 1 ? 0 : 1;
    for (let mIdx = 0; mIdx < matchStructure[divIdx][weekIdx].length; mIdx++) {
      if (
        matchStructure[conflictTeamDivIdx][weekIdx][mIdx][conflictTeamIdx] ===
          null &&
        isValid(
          config,
          conflictTeamDivIdx,
          weekIdx,
          mIdx,
          conflictTeamIdx,
          conflictTeam,
          false
        )[0]
      ) {
        return [
          true,
          [conflictTeam, conflictTeamDivIdx, weekIdx, mIdx, conflictTeamIdx],
        ];
      }
    }
  }
  return null;
};
