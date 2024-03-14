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
import { teamsNotPlayingThatWeek } from "./team";

export type ConflictResponse = {
  match: Fixture;
  divIdx: number;
  weekIdx: number;
  matchIdx: number;
} | null;

/**
 * Finds the conflicting team and division for a given team based on venue conflicts.
 * @param {Fixture} match - The match to find
 * @param {string[][]} divTeams - The array of division teams.
 * @param {ConflictsObject} venConflicts - The object containing venue conflicts.
 * @returns {[Fixture, number] | null} - An array containing the conflicting team and division, or null if no conflicts exist.
 */
export const findVenueConflictAndDiv = (
  match: Fixture,
  divTeams: string[][],
  venConflicts: ConflictsObject
): [Fixture, number] | null => {
  const [team1, team2] = match;
  if (
    team1 === null ||
    team2 === null ||
    !Object.keys(venConflicts).includes(team1) ||
    !Object.keys(venConflicts).includes(team2)
  ) {
    return null;
  }
  const conflictTeam1 = venConflicts[team1];
  const conflictTeam2 = venConflicts[team2];
  const div = divTeams.findIndex(
    (t) => t.includes(conflictTeam1) && t.includes(conflictTeam2)
  );
  return [[conflictTeam2, conflictTeam1], div];
};

export type ValidationFunction = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  match: Fixture
) => boolean;

const generateValidationFunctions = (): ValidationFunction[] => {
  return [
    teamsNotPlayingThatWeek,
    fixtureDoesNotExists,
    notVenueClash,
    notSameVenueXWeeks,
    // notUnevenVenues,
  ];
};

export const isValid = (
  config: Config,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  match: Fixture,
  checkDependents = false,
  validationFunctions: ValidationFunction[] = generateValidationFunctions()
): [boolean, ConflictResponse[] | null] => {
  for (const v of validationFunctions) {
    if (!v(config, divIdx, weekIdx, matchIdx, match)) {
      return [false, null];
    }
  }

  if (checkDependents) {
    const dependentsValid = checkDependentsValid(
      config,
      divIdx,
      weekIdx,
      matchIdx,
      match
    );
    if (dependentsValid) {
      return dependentsValid;
    }
  }
  return [true, null];
};

type DelendentsValid = [boolean, ConflictResponse[] | null] | null;

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
  match: Fixture
): DelendentsValid => {
  const { matches: matchStructure, divTeams, venConflicts } = config;
  const [team1, team2] = match;
  const teamDiv = findVenueConflictAndDiv(match, divTeams, venConflicts);
  if (teamDiv) {
    // Grab the conflicting team and division
    const [conflictMatch, conflictTeamDivIdx] = teamDiv;

    // If there's no conflict, return true
    if (conflictTeamDivIdx === -1) {
      return [true, null];
    }

    const valid = isValid(
      config,
      conflictTeamDivIdx,
      weekIdx,
      matchIdx,
      conflictMatch,
      false
    )[0];
    if (valid) {
      return [
        true,
        [
          {
            match: conflictMatch,
            divIdx: conflictTeamDivIdx,
            weekIdx,
            matchIdx,
          },
        ],
      ];
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
