import { divTeams, venConflictsLookup } from "./config/config";

export type ConflictsArray = [string, string][];

export interface ConflictsObject {
  [key: string]: string;
}

export const teamConflictsToObject = (
  teamConflicts: ConflictsArray,
  includeReverse: boolean = false,
): ConflictsObject => {
  let teamConflictsObj: ConflictsObject = Object.fromEntries(
    new Map(teamConflicts),
  );
  if (includeReverse) {
    for (const k of Object.keys(teamConflictsObj)) {
      teamConflictsObj[teamConflictsObj[k]] = k;
    }
  }

  return teamConflictsObj;
};

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
