import { setupConfig } from "./config";
import { runProcess } from "./process";

setupConfig().then((config) => {
  runProcess(config);
});
