import {
  MatchStructure,
  ConflictsArray,
  ConflictsObject,
} from "../config/types";
import seedrandom from "seedrandom";
import { logger } from "../logger";

export const setSeed = (): number => {
  const seed = process.env.SEED ? parseFloat(process.env.SEED) : Math.random();
  logger.info(`Using seed ${seed.toString()}`);
  seedrandom(seed.toString(), { global: true });
  return seed;
};

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

export const shuffle = <T>(a: Array<T>): Array<T> => {
  a.sort(() => Math.random() - 0.5);
  return a;
};

export const elapsedTime = (note: string, start: [number, number]): void => {
  const precision = 3; // 3 decimal places
  const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  logger.info(
    process.hrtime(start)[0] +
      " s, " +
      elapsed.toFixed(precision) +
      " ms - " +
      note
  ); // print message + time
  //start = process.hrtime(); // reset the timer
};

export const completedState = (matchStructure: MatchStructure): number => {
  let totalMatches = 0;
  let totalMatchesCompleted = 0;
  for (const week of matchStructure) {
    for (const div of week) {
      for (const match of div) {
        totalMatches += 1;
        if (match.every((t) => t !== null)) {
          totalMatchesCompleted += 1;
        }
      }
    }
  }
  return totalMatchesCompleted / totalMatches;
};
