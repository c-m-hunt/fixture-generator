import fs from "fs";
import { setup, MatchStructure } from "./config";
import { divWeeks, divTeams, divNames } from "./config";
import { displayOutput, seed } from "./utils";
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
