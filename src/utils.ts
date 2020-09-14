import chalk from "chalk";

import { MatchStructure } from "./config";
import seedrandom from "seedrandom";

export const seed = Math.random(); // 0.142026522958016;
console.log(`Using seed ${seed.toString()}`);
seedrandom(seed.toString(), { global: true });

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

export const elapsedTime = (note: string, start: [number, number]) => {
  var precision = 3; // 3 decimal places
  var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  console.log(
    process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " +
      note,
  ); // print message + time
  //start = process.hrtime(); // reset the timer
};
