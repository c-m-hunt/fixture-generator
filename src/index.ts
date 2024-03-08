/**
 * Entry point of the fixture generator application.
 *
 * This script runs a process multiple times, attempting to generate a fixture.
 * It displays a run header, sets up the configuration, and runs the process.
 * If the process is successful, it logs a success message and exits.
 * If an error occurs, it handles specific error types and logs corresponding warning messages.
 *
 * @throws {NoProgressError} If there is no progress during the process.
 * @throws {MaxIterationsExceededError} If the maximum number of iterations is exceeded.
 * @throws {LowStartPointError} If the start point is too low and needs to be retried.
 */
import { setupConfig } from "./config";
import { PlayCricketForamtter } from "./outputFormatter/playCricket";
import { displayRunHeader } from "./process/display";
import { runProcess } from "./process/process";
import {
  LowStartPointError,
  MaxIterationsExceededError,
  NoProgressError,
} from "./process/errors";
import { logger } from "./logger";
import { config as appConfig } from "./appConfig";

(async () => {
  for (let i = 1; i <= 100000; i++) {
    try {
      displayRunHeader(i);

      const config = await setupConfig();
      const matches = runProcess(config);
      if (matches) {
        logger.info("Success");
        const outputFormatter = new PlayCricketForamtter(config, matches);
        outputFormatter.outputPath = `${appConfig.outputPath}`;
        outputFormatter.startDate = appConfig.startDate;
        outputFormatter.writeOutput();
        break;
      }
    } catch (e) {
      if (e instanceof NoProgressError) {
        logger.warn("No progress. Exiting");
      } else if (e instanceof MaxIterationsExceededError) {
        logger.warn("Max iterations exceeded");
      } else if (e instanceof LowStartPointError) {
        logger.warn("Low start point. Let's retry");
      } else {
        throw e;
      }
    }
  }
})();
