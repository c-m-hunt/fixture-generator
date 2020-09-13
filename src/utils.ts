import chalk from "chalk";

import { MatchStructure } from "./config";

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

export const shuffle = (a: Array<any>) => {
  a.sort(() => Math.random() - 0.5);
  return a;
};

export const displayOutput = (
  matchStructure: MatchStructure,
  divNames: Array<string>,
) => {
  for (let d = 0; d < matchStructure.length; d++) {
    const div = matchStructure[d];
    console.log(chalk.bold.underline(`${divNames[d]}`));
    for (let m = 0; m < div[0].length; m++) {
      console.log(div.map((w) => `${w[m][0]} v ${w[m][1]}`).join("    "));
    }
    console.log("-------------------------------------------------");
  }
  console.log("-------------------------------------------------");
};
