import fs from "fs";
import { setup, MatchStructure } from "./config";
import { divWeeks, divTeams } from "./config/config";
import { isValid, ConflictResponse } from "./validation";

let matchStructure: MatchStructure = setup(divTeams, divWeeks);
let i = 0;

export const displayOutput = (matchStructure: MatchStructure) => {
  for (let d of matchStructure) {
    for (let m = 0; m < d[0].length; m++) {
      console.log(d.map((w) => `${w[m][0]} v ${w[m][1]}`).join("    "));
    }
    console.log("-------------------------------------------------");
  }
  console.log("-------------------------------------------------");
};

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
                false,
              );
              if (valid) {
                matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
                applyConflict(matchStructure, conflict);
                c += 1;
                if (c % 100000 === 0) {
                  console.log(c);
                  displayOutput(matchStructure);
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
  displayOutput(matchStructure);
}
