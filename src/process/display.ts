import chalk from "chalk";
import { MatchStructure } from "../config/types";
import { State } from "./utils";
import { logger } from "../logger";

/**
 * Displays the run header.
 *
 * @param run - The run number.
 */
export const displayRunHeader = (run: number): void => {
  console.log("-----------------------------------");
  console.log(`Run ${run}`);
  console.log("-----------------------------------");
};

/**
 * Displays the output of the match structure.
 *
 * @param matchStructure - The match structure to display.
 * @param divNames - An array of division names.
 */
export const displayOutput = (
  matchStructure: MatchStructure,
  divNames: Array<string>
): void => {
  const output = createOutput(matchStructure, divNames);
  console.log(output.join("\n"));
};

/**
 * Creates the output of the match structure.
 *
 * @param matchStructure - The match structure to display.
 * @param divNames - An array of division names.
 * @returns The output as an array of strings.
 */
export const createOutput = (
  matchStructure: MatchStructure,
  divNames: Array<string>
): string[] => {
  let outputStr: string[] = [];
  for (let d = 0; d < matchStructure.length; d++) {
    const div = matchStructure[d];
    outputStr.push(chalk.bold.underline(`${divNames[d]}`));
    for (let m = 0; m < div[0].length; m++) {
      outputStr.push(div.map((w) => `${w[m][0]} v ${w[m][1]}`).join("    "));
    }
    outputStr.push("-------------------------------------------------");
  }
  outputStr.push("-------------------------------------------------");
  return outputStr;
};

/**
 * Displays the state information.
 * @param state - The state object.
 */
export const displayState = (state: State): void => {
  logger.info(`Completed: ${state.completedState}`);
  logger.info(`Max completed: ${state.maxCompletedState}`);
  logger.info(`Last improvement: ${state.lastImprovement}`);
  console.log("-------------------------------------------------");
};
