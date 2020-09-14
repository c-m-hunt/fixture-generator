import fs from "fs";
import { setup, MatchStructure } from "./config";
import { divWeeks, divTeams, divNames } from "./config";
import { isValid, ConflictResponse } from "./validation";
import { displayOutput, elapsedTime, seed } from "./utils";

let matchStructure: MatchStructure = setup(divTeams, divWeeks);
let i = 0;

let start = process.hrtime();

const applyConflict = (
  matchStructure: MatchStructure,
  conflict: ConflictResponse,
) => {
  if (!conflict) {
    return;
  }
  const [team, divIdx, weekIdx, matchIdx, teamIdx] = conflict;
  matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
};

const undoConflict = (
  matchStructure: MatchStructure,
  conflict: ConflictResponse,
) => {
  if (!conflict) {
    return;
  }
  const [team, divIdx, weekIdx, matchIdx, teamIdx] = conflict;
  matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = null;
};

let c = 0;
const generate = () => {
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
              const [valid, conflict] = isValid(
                matchStructure,
                divIdx,
                weekIdx,
                matchIdx,
                teamIdx,
                team,
                true,
              );
              if (valid) {
                matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
                applyConflict(matchStructure, conflict);
                c += 1;
                if (c % 100000 === 0) {
                  elapsedTime(c.toString(), start);
                  displayOutput(matchStructure, divNames);
                }

                generate();
                matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = null;
                undoConflict(matchStructure, conflict);
              }
            }
            return false;
          }
        }
      }
    }
  }
  console.log(c);
  throw Error("Complete");
};

try {
  generate();
} catch (ex) {
  console.log(ex);
  fs.writeFileSync("./output.json", JSON.stringify(matchStructure, null, 2));
  displayOutput(matchStructure, divNames);
  console.log(`Used seed ${seed.toString()}`);
}
