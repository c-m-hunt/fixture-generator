import { setupConfig } from "./config";
import { displayRunHeader } from "./process/display";
import { runProcess } from "./process/process";
import {
  LowStartPointError,
  MaxIterationsExceededError,
  NoProgressError,
} from "./process/errors";
import { logger } from "./logger";

(async () => {
  for (let i = 1; i <= 100000; i++) {
    try {
      displayRunHeader(i);

      const config = await setupConfig();
      const success = runProcess(config);
      if (success) {
        logger.info("Success");
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
