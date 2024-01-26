import fs from "fs";
import { isValid, ConflictResponse } from "./validation";
import { displayOutput, elapsedTime, seed } from "./utils";
import { Config, MatchStructure } from "./config/types";

export const runProcess = (config: Config): void => {
  const { matches, divTeams, divNames } = config;

  const start = process.hrtime();
  let c = 0;
  const generate = () => {
    // Iterate divs
    for (let divIdx = 0; divIdx < matches.length; divIdx++) {
      // Iterate weeks in division
      for (let weekIdx = 0; weekIdx < matches[divIdx].length; weekIdx++) {
        // Iterate matches in division week
        for (
          let matchIdx = 0;
          matchIdx < matches[divIdx][weekIdx].length;
          matchIdx++
        ) {
          // Iterate teams in fixture
          for (
            let teamIdx = 0;
            teamIdx < matches[divIdx][weekIdx][matchIdx].length;
            teamIdx++
          ) {
            if (matches[divIdx][weekIdx][matchIdx][teamIdx] === null) {
              for (const team of divTeams[divIdx]) {
                const [valid, conflict] = isValid(
                  config,
                  divIdx,
                  weekIdx,
                  matchIdx,
                  teamIdx,
                  team,
                  true
                );
                if (valid) {
                  matches[divIdx][weekIdx][matchIdx][teamIdx] = team;
                  applyConflict(matches, conflict);
                  c += 1;
                  if (c % 100000 === 0) {
                    elapsedTime(c.toString(), start);
                    displayOutput(matches, divNames);
                  }

                  const complete = generate();
                  if (complete) {
                    return true;
                  }
                  matches[divIdx][weekIdx][matchIdx][teamIdx] = null;
                  undoConflict(matches, conflict);
                }
              }
              return false;
            }
          }
        }
      }
    }
    console.log(c);
    return true;
  };
  try {
    generate();
  } catch (ex) {
    console.log(ex);
  } finally {
    fs.writeFileSync(
      "./output.json",
      JSON.stringify(
        {
          seed,
          matches,
        },
        null,
        2
      )
    );
    displayOutput(matches, divNames);
    console.log(`Used seed ${seed.toString()}`);
  }
};
const applyConflict = (
  matchStructure: MatchStructure,
  conflict: ConflictResponse
) => {
  if (!conflict) {
    return;
  }
  const [team, divIdx, weekIdx, matchIdx, teamIdx] = conflict;
  matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
};

const undoConflict = (
  matchStructure: MatchStructure,
  conflict: ConflictResponse
) => {
  if (!conflict) {
    return;
  }
  const [team, divIdx, weekIdx, matchIdx, teamIdx] = conflict;
  matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = null;
};
