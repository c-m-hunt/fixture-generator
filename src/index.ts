import { setupConfig } from "./config";
import { runProcess, MaxIterationsExceededError } from "./process";

const maxIterations = 2000000;

(async () => {
  for (let i = 1; i <= 100000; i++) {
    try {
      console.log("-----------------------------------");
      console.log(`Run ${i}`);
      console.log("-----------------------------------");

      const config = await setupConfig();
      const success = runProcess(config, maxIterations);
      if (success) {
        console.log("Success");
        break;
      }
    } catch (e) {
      if (e instanceof MaxIterationsExceededError === false) {
        throw e;
      } else {
        console.log("Max iterations exceeded");
      }
    }
  }
})();
