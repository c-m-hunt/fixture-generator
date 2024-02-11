import fs from "fs";
import { isValid, ConflictResponse } from "./validation";
import { completedState, displayOutput, elapsedTime, setSeed } from "./utils";
import { Config, MatchStructure } from "./config/types";

type State = {
  completed: boolean;
  currentGen: number;
  completedState: number;
  maxCompletedState: number;
  lastTestCompletedState: number;
};

export class MaxIterationsExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaxIterationsExceededError";
  }
}

export class NoProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoProgressError";
  }
}

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

export const runProcess = (config: Config): boolean => {
  const { matches, divTeams, divNames } = config;
  const start = process.hrtime();
  let state = {
    completed: false,
    currentGen: 0,
    completedState: 0,
    maxCompletedState: 0,
    lastTestCompletedState: 0,
  } as State;
  const checkInterval = 100000;
  const improvementCheckInterval = 1000000;
  let c = 0;
  const generate = (): boolean => {
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
                  const completedPct = completedState(matches);
                  state = {
                    ...state,
                    completed: false,
                    currentGen: c,
                    maxCompletedState: Math.max(
                      completedPct,
                      state.maxCompletedState
                    ),
                    completedState: completedPct,
                  };
                  if (c % checkInterval === 0) {
                    elapsedTime(c.toString(), start);
                    console.log(`Completed: ${completedPct}`);
                    console.log(`Max completed: ${state.maxCompletedState}`);
                    //displayOutput(matches, divNames);
                    if (c % improvementCheckInterval === 0) {
                      if (
                        state.maxCompletedState ===
                          state.lastTestCompletedState ||
                        (state.maxCompletedState >
                          state.lastTestCompletedState &&
                          state.lastTestCompletedState === state.completedState)
                      ) {
                        writeLog(config.seed, c, state);
                        displayOutput(matches, divNames);
                        throw new NoProgressError("No progress");
                      }
                      state.lastTestCompletedState = state.completedState;
                    }
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
  c = 0;
  const success = generate();
  writeOutput(matches, config.seed);
  console.log("Complete");
  displayOutput(matches, divNames);
  console.log(`Used seed ${config.seed.toString()}`);
  return success;
};

const writeOutput = (matches: MatchStructure, seed: number) => {
  fs.writeFileSync(
    "./output/output.json",
    JSON.stringify(
      {
        seed,
        matches,
      },
      null,
      2
    )
  );
};

const writeLog = (seed: number, iterations: number, state: State) => {
  fs.appendFileSync(
    "./output/log.txt",
    `{"seed":${seed}, "iterations": ${iterations}, "maxCompletedPct": ${state.maxCompletedState}}\n`
  );
};
