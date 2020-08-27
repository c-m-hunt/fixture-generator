import fs from "fs";
import { setup, MatchStructure } from "./config";
import { divWeeks, divTeams } from "./config/config";
import { isValid } from "./validation";

let matchStructure: MatchStructure = setup(divTeams, divWeeks);
let i = 0;

const displayOutput = (matchStructure: MatchStructure) => {
  for (let d of matchStructure) {
    for (let m = 0; m < d[0].length; m++) {
      console.log(d.map((w) => `${w[m][0]} v ${w[m][1]}`).join("    "));
    }
    console.log("-------------------------------------------------");
  }
};

const generate = () => {
  const maxDivs = Math.max(...matchStructure.map((d) => d.length));
  // Iterate divs
  for (let divIdx = 0; divIdx < matchStructure.length; divIdx++) {
    // Iterate weeks in division
    for (let weekIdx = 0; weekIdx < matchStructure[divIdx].length; weekIdx++) {
      // Iterate matches in division week
      for (
        let matchIdx = 0;
        matchIdx < matchStructure[divIdx][weekIdx].length;
        matchIdx++
      ) {
        // Iterate teams in fixture
        for (
          let teamIdx = 0;
          teamIdx < matchStructure[divIdx][weekIdx][matchIdx].length;
          teamIdx++
        ) {
          if (matchStructure[divIdx][weekIdx][matchIdx][teamIdx] === null) {
            for (let team of divTeams[divIdx]) {
              if (
                isValid(
                  matchStructure,
                  divIdx,
                  weekIdx,
                  matchIdx,
                  teamIdx,
                  team,
                )
              ) {
                matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
                generate();
                matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = null;
              }
            }
            return false;
          }
        }
      }
    }
  }
  throw Error("Complete");
};

try {
  generate();
} catch (ex) {
  fs.writeFileSync("./output.json", JSON.stringify(matchStructure, null, 2));
  displayOutput(matchStructure);
}
