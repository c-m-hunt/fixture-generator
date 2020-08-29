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
