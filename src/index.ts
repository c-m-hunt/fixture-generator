import fs from "fs";
import { setup, MatchStructure } from "./config";
import { divWeeks, divTeams, divNames } from "./config";
import { isValid, ConflictResponse } from "./validation";
import { displayOutput, elapsedTime, seed } from "./utils";
import { runProcess } from "./process";

const matchStructure: MatchStructure = setup(divTeams, divWeeks);

try {
  runProcess(matchStructure);
} catch (ex) {
  console.log(ex);
} finally {
  fs.writeFileSync("./output.json", JSON.stringify(matchStructure, null, 2));
  displayOutput(matchStructure, divNames);
  console.log(`Used seed ${seed.toString()}`);
}
