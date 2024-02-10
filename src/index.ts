import { setupConfig } from "./config";
import {
  runProcess,
  MaxIterationsExceededError,
  NoProgressError,
} from "./process";

(async () => {
  for (let i = 1; i <= 100000; i++) {
    try {
      console.log("-----------------------------------");
      console.log(`Run ${i}`);
      console.log("-----------------------------------");

      const config = await setupConfig();
      console.log(config.venConflicts);
      const success = runProcess(config);
      if (success) {
        console.log("Success");
        break;
      }
    } catch (e) {
      if (e instanceof NoProgressError) {
        console.log("No progress. Exiting");
      } else if (e instanceof MaxIterationsExceededError) {
        console.log("Max iterations exceeded");
      } else {
        throw e;
      }
    }
  }
})();
