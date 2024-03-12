import { isValid, ConflictResponse } from "../validation";
import {
  completedState,
  elapsedTime,
  matchUnused,
  matchUsed,
  State,
} from "./utils";
import { Config, MatchStructure } from "../config/types";
import { displayOutput, displayState } from "./display";
import { logger } from "../logger";
import { LowStartPointError, NoProgressError } from "./errors";
import { config as appConfig } from "../appConfig";
import { OutputWriter } from "../outputWriter";

const EXIT_PCT = appConfig.exitPct;
const CHECK_INTERVAL = appConfig.checkInterval;
const IMPROVEMENT_CHECK_INTERVAL = appConfig.improvementCheckInterval;

export const applyConflict = (
  matchStructure: MatchStructure,
  conflict: ConflictResponse
) => {
  if (!conflict) {
    return;
  }
  const { match, divIdx, weekIdx, matchIdx } = conflict;
  matchStructure[divIdx][weekIdx][matchIdx] = match;
};

export const undoConflict = (
  matchStructure: MatchStructure,
  conflict: ConflictResponse
) => {
  if (!conflict) {
    return;
  }
  const { match, divIdx, weekIdx, matchIdx } = conflict;
  matchStructure[divIdx][weekIdx][matchIdx] = [null, null];
};

export const runProcess = (
  config: Config,
  writer: OutputWriter
): MatchStructure | null => {
  let { matches, divTeams, divNames, allMatches } = config;
  const start = process.hrtime();
  let state = {
    completed: false,
    currentGen: 0,
    completedState: 0,
    maxCompletedState: 0,
    lastTestCompletedState: 0,
  } as State;

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
          if (
            !matches[divIdx][weekIdx][matchIdx].every((val) => val === null)
          ) {
            continue;
          }
          // Iterate matches in fixture check list
          for (
            let matchCheckIdx = 0;
            matchCheckIdx < allMatches[divIdx].length;
            matchCheckIdx++
          ) {
            if (allMatches[divIdx][matchCheckIdx].used === null) {
              continue;
            }
            let { match } = allMatches[divIdx][matchCheckIdx];
            match =
              Math.random() >= 0.5
                ? match
                : (match.reverse() as [string, string]);

            let [valid, conflict] = isValid(
              config,
              divIdx,
              weekIdx,
              matchIdx,
              match,
              true
            );

            if (!valid) {
              [valid, conflict] = isValid(
                config,
                divIdx,
                weekIdx,
                matchIdx,
                match.reverse() as [string, string],
                false
              );
            }

            if (valid) {
              matches[divIdx][weekIdx][matchIdx] = [...match];
              allMatches = matchUsed(match, divIdx, allMatches);
              if (conflict) {
                applyConflict(matches, conflict);
                allMatches = matchUsed(
                  conflict.match,
                  conflict.divIdx,
                  allMatches
                );
              }

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
              writer.storeBest(matches, state);
              if (c % CHECK_INTERVAL === 0) {
                elapsedTime(c.toString(), start);
                displayState(state);
                if (state.maxCompletedState < EXIT_PCT) {
                  throw new LowStartPointError("Low start point");
                }
                if (c % IMPROVEMENT_CHECK_INTERVAL === 0) {
                  if (
                    state.maxCompletedState === state.lastTestCompletedState ||
                    (state.maxCompletedState > state.lastTestCompletedState &&
                      state.lastTestCompletedState === state.completedState)
                  ) {
                    displayOutput(matches, divNames);
                    writer.writeBest();
                    throw new NoProgressError("No progress");
                  }
                  state.lastTestCompletedState = state.completedState;
                }
              }

              const complete = generate();
              if (complete) {
                return true;
              }
              matches[divIdx][weekIdx][matchIdx] = [null, null];
              allMatches = matchUnused(match, divIdx, allMatches);
              if (conflict) {
                undoConflict(matches, conflict);
                allMatches = matchUnused(
                  conflict.match,
                  conflict.divIdx,
                  allMatches
                );
              }
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  c = 0;
  const success = generate();
  logger.info("Complete");
  displayOutput(matches, divNames);
  logger.info(`Used seed ${config.seed.toString()}`);

  if (success) {
    writer.writeOutput(matches);
  } else {
    writer.writeBest();
  }

  return success ? matches : null;
};
