import { isValid, ConflictResponse } from "../validation";
import {
  completedState,
  elapsedTime,
  matchFilled,
  matchUnused,
  matchUsed,
  State,
} from "./utils";
import { Config, Fixture, FixtureCheck, MatchStructure } from "../config/types";
import { displayOutput, displayState } from "./display";
import { logger } from "../logger";
import { LowStartPointError, NoProgressError } from "./errors";
import { config as appConfig } from "../appConfig";
import { OutputWriter } from "../outputWriter";
import { log } from "console";

const EXIT_PCT = appConfig.exitPct;
const CHECK_INTERVAL = appConfig.checkInterval;
const IMPROVEMENT_CHECK_INTERVAL = appConfig.improvementCheckInterval;

export const applyConflict = (
  matchStructure: MatchStructure,
  conflicts: ConflictResponse[] | null,
  allMatches: FixtureCheck[][]
): FixtureCheck[][] => {
  if (!conflicts || conflicts?.length == 0) {
    return allMatches;
  }
  for (const conflict of conflicts) {
    if (!conflict) {
      continue;
    }
    const { match, divIdx, weekIdx, matchIdx } = conflict;
    matchStructure[divIdx][weekIdx][matchIdx] = match;

    allMatches = matchUsed(match, divIdx, allMatches);
  }
  return allMatches;
};

export const undoConflict = (
  matchStructure: MatchStructure,
  conflicts: ConflictResponse[] | null,
  allMatches: FixtureCheck[][]
) => {
  if (!conflicts || conflicts?.length == 0) {
    return allMatches;
  }
  for (const conflict of conflicts) {
    if (!conflict) {
      continue;
    }
    const { match, divIdx, weekIdx, matchIdx } = conflict;
    matchStructure[divIdx][weekIdx][matchIdx] = [null, null];
  }
  return allMatches;
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

  let reverse = false;

  const fixtureRestorer = generateFixtureRestorer(matches);

  let c = 0;
  const generate = (): boolean => {
    // Iterate divs
    const startDiv = reverse ? matches.length - 1 : 0;
    const endDiv = reverse ? -1 : matches.length;
    for (
      let divIdx = startDiv;
      reverse ? divIdx > endDiv : divIdx < endDiv;
      reverse ? divIdx-- : divIdx++
    ) {
      // Iterate weeks in division
      const startWeek = reverse ? matches[divIdx].length - 1 : 0;
      const endWeek = reverse ? -1 : matches[divIdx].length;
      for (
        let weekIdx = startWeek;
        reverse ? weekIdx > endWeek : weekIdx < endWeek;
        reverse ? weekIdx-- : weekIdx++
      ) {
        // Iterate matches in division week
        const startMatch = reverse ? matches[divIdx][weekIdx].length - 1 : 0;
        const endMatch = reverse ? -1 : matches[divIdx][weekIdx].length;
        for (
          let matchIdx = startMatch;
          reverse ? matchIdx > endMatch : matchIdx < endMatch;
          reverse ? matchIdx-- : matchIdx++
        ) {
          if (matchFilled(matches[divIdx][weekIdx][matchIdx])) {
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

            let [valid, conflicts] = isValid(
              config,
              divIdx,
              weekIdx,
              matchIdx,
              match,
              true
            );

            if (!valid) {
              [valid, conflicts] = isValid(
                config,
                divIdx,
                weekIdx,
                matchIdx,
                match.reverse() as [string, string],
                false
              );
            }

            if (valid) {
              // fixtureRestorer[divIdx][weekIdx][matchIdx] = match;
              matches[divIdx][weekIdx][matchIdx] = match;
              allMatches = matchUsed(match, divIdx, allMatches);
              allMatches = applyConflict(matches, conflicts, allMatches);

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

                    if (reverse) {
                      writer.writeBest();
                      throw new NoProgressError("No progress");
                    }
                    // Reverse direction
                    logger.info("Reversing direction");
                    reverse = true;
                  }
                  state.lastTestCompletedState = state.completedState;
                }
              }

              const complete = generate();
              if (complete) {
                return true;
              }
              matches[divIdx][weekIdx][matchIdx] =
                fixtureRestorer[divIdx][weekIdx][matchIdx];
              fixtureRestorer[divIdx][weekIdx][matchIdx] = [null, null];
              allMatches = matchUnused(match, divIdx, allMatches);
              allMatches = undoConflict(matches, conflicts, allMatches);
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

const generateFixtureRestorer = (matches: MatchStructure): MatchStructure => {
  const fixtureRestorer: MatchStructure = [];
  for (let divIdx = 0; divIdx < matches.length; divIdx++) {
    fixtureRestorer[divIdx] = [];
    for (let weekIdx = 0; weekIdx < matches[divIdx].length; weekIdx++) {
      fixtureRestorer[divIdx][weekIdx] = [];
      for (
        let matchIdx = 0;
        matchIdx < matches[divIdx][weekIdx].length;
        matchIdx++
      ) {
        fixtureRestorer[divIdx][weekIdx][matchIdx] = [null, null];
      }
    }
  }
  return fixtureRestorer;
};
