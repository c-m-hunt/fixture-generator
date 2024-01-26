import chalk from "chalk";

import {
  MatchStructure,
  ConflictsArray,
  ConflictsObject,
} from "./config/types";
import seedrandom from "seedrandom";

//export const seed = Math.random();
export const seed = 0.28617905420599443;
console.log(`Using seed ${seed.toString()}`);
seedrandom(seed.toString(), { global: true });

export const teamConflictsToObject = (
  teamConflicts: ConflictsArray,
  includeReverse = false
): ConflictsObject => {
  const teamConflictsObj = Object.fromEntries(new Map(teamConflicts));
  if (includeReverse) {
    for (const k of Object.keys(teamConflictsObj)) {
      teamConflictsObj[teamConflictsObj[k]] = k;
    }
  }

  return teamConflictsObj;
};

export const shuffle = (a: Array<any>): Array<any> => {
  a.sort(() => Math.random() - 0.5);
  return a;
};

export const displayOutput = (
  matchStructure: MatchStructure,
  divNames: Array<string>
): void => {
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

export const elapsedTime = (note: string, start: [number, number]): void => {
  const precision = 3; // 3 decimal places
  const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  console.log(
    process.hrtime(start)[0] +
      " s, " +
      elapsed.toFixed(precision) +
      " ms - " +
      note
  ); // print message + time
  //start = process.hrtime(); // reset the timer
};
