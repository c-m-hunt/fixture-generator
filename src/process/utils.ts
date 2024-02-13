import {
  MatchStructure,
  ConflictsArray,
  ConflictsObject,
} from "../config/types";
import seedrandom from "seedrandom";
import { logger } from "../logger";

/**
 * Sets the seed for generating random numbers.
 * If the SEED environment variable is set, it will be used as the seed.
 * Otherwise, a random seed will be generated.
 * @returns The seed value used.
 */
export const setSeed = (): number => {
  const seed = process.env.SEED ? parseFloat(process.env.SEED) : Math.random();
  logger.info(`Using seed ${seed.toString()}`);
  seedrandom(seed.toString(), { global: true });
  return seed;
};

/**
 * Converts an array of team conflicts into an object representation.
 * @param teamConflicts - The array of team conflicts.
 * @param includeReverse - Optional. Specifies whether to include the reverse mapping in the resulting object. Default is false.
 * @returns The object representation of the team conflicts.
 */
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

/**
 * Shuffles the elements in an array.
 *
 * @param a - The array to be shuffled.
 * @returns The shuffled array.
 * @template T - The type of elements in the array.
 */
export const shuffle = <T>(a: Array<T>): Array<T> => {
  a.sort(() => Math.random() - 0.5);
  return a;
};

/**
 * Calculates and logs the elapsed time in seconds and milliseconds.
 * @param note - A description of the elapsed time.
 * @param start - The start time as an array of [seconds, nanoseconds].
 */
export const elapsedTime = (note: string, start: [number, number]): void => {
  const precision = 3; // 3 decimal places
  const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
  logger.info(
    process.hrtime(start)[0] +
      " s, " +
      elapsed.toFixed(precision) +
      " ms - " +
      note
  );
};

/**
 * Calculates the completion state of a match structure.
 *
 * @param matchStructure - The match structure to calculate the completion state for.
 * @returns The completion state as a decimal value between 0 and 1.
 */
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
