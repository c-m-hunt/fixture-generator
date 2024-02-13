import chalk from "chalk";
import { MatchStructure } from "../config/types";
import { State } from "./process";
import { logger } from "../logger";

export const displayRunHeader = (run: number): void => {
  console.log("-----------------------------------");
  console.log(`Run ${run}`);
  console.log("-----------------------------------");
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

export const displayState = (state: State): void => {
  logger.info(`Completed: ${state.completedState}`);
  logger.info(`Max completed: ${state.maxCompletedState}`);
  console.log("-------------------------------------------------");
};
