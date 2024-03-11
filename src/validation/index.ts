import {
  Config,
  ConflictsObject,
  Fixture,
  MatchStructure,
} from "../config/types";
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

/***
 * Checks to see if a team has any dependents that are valid.
 * @param config - The configuration object.
 * @param divIdx - The division index.
 * @param weekIdx - The week index.
 * @param matchIdx - The match index.
 * @param teamIdx - The team index.
 * @param team - The team name.
 * @returns Indicates whether the team has any dependents that are valid and config for that dependent.
 */
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
  const conflictTeamIdx = teamIdx === 1 ? 0 : 1;
  if (teamDiv) {
    // Grab the conflicting team and division
    const [conflictTeam, conflictTeamDivIdx] = teamDiv;

    // If there's no conflict, return true
    if (conflictTeamDivIdx === -1) {
      return [true, null];
    }

    // If the oppo team already has a match, check if the conflicting team can be placed in that match
    const oppoTeam =
      matchStructure[divIdx][weekIdx][matchIdx][teamIdx === 0 ? 1 : 0];
    if (oppoTeam !== null) {
      const oppoTeamDiv = findVenueConflictAndDiv(
        oppoTeam,
        divTeams,
        venConflicts
      );

      if (oppoTeamDiv) {
        const [oppoConflictTeam, oppoConflictTeamDivIdx] = oppoTeamDiv;

        // If they're in the same division
        if (oppoConflictTeamDivIdx === conflictTeamDivIdx) {
          // Find oppo conflict match details
          const oppoConflictMatch = findTeamMatch(
            matchStructure,
            oppoConflictTeam,
            oppoConflictTeamDivIdx,
            weekIdx
          );
          if (
            oppoConflictMatch &&
            oppoConflictMatch.matchIdx !== -1 &&
            matchStructure[conflictTeamDivIdx][weekIdx][
              oppoConflictMatch.matchIdx
            ][conflictTeamIdx] === null &&
            isValid(
              config,
              conflictTeamDivIdx,
              weekIdx,
              oppoConflictMatch.matchIdx,
              conflictTeamIdx,
              conflictTeam,
              false
            )[0]
          ) {
            return [
              true,
              [
                conflictTeam,
                conflictTeamDivIdx,
                weekIdx,
                oppoConflictMatch.matchIdx,
                conflictTeamIdx,
              ],
            ];
          }
        }
      }
    }

    // If nothing matches above, let's put the conflicting team in a match that doesn't have the oppo team
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

type FindMatchResponse = {
  matchIdx: number;
  teamIdx: number;
  oppoTeam: string | null;
  match: Fixture | null;
} | null;

export const findTeamMatch = (
  matches: MatchStructure,
  team: string,
  divIdx: number,
  weekIdx: number
): FindMatchResponse => {
  const match = matches[divIdx][weekIdx].find((m) => m.includes(team));
  if (match) {
    const teamIdx = match.indexOf(team);
    return {
      matchIdx: matches[divIdx][weekIdx].indexOf(match),
      teamIdx,
      oppoTeam: match[teamIdx === 0 ? 1 : 0],
      match,
    };
  }
  return null;
};
