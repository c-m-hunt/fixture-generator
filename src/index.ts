import { setupConfig } from "./config";
import { runProcess, MaxIterationsExceededError } from "./process";

const maxIterations = 5000000;

for (let i = 1; i <= 100; i++) {
  try {
    setupConfig().then((config) => {
      runProcess(config, maxIterations);
    });
  } catch (e) {
    if (e instanceof MaxIterationsExceededError === false) {
      throw e;
    } else {
      console.log("Max iterations exceeded");
    }
  }
}
