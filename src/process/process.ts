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

const EXIT_PCT = appConfig.exitPct;
const CHECK_INTERVAL = appConfig.checkInterval;
const IMPROVEMENT_CHECK_THRESHOLD = appConfig.improvementCheckThreshold;

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
    lastImprovement: 0,
    maxCompletedFixtures: matches,
    maxCompletedMatchesState: allMatches,
  } as State;

  let c = 0;

  let { divIdxs, weekIdxs, matchIdxs } = getIndexes(matches, false);

  const generate = (): boolean => {
    // Iterate divs
    for (const divIdx of divIdxs) {
      // Iterate weeks in division
      for (const weekIdx of weekIdxs) {
        // Iterate matches in division week
        for (const matchIdx of matchIdxs) {
          if (matchFilled(matches[divIdx][weekIdx][matchIdx])) {
            continue;
          }
          // Iterate matches in fixture check list
          for (
            let matchCheckIdx = 0;
            matchCheckIdx < allMatches[divIdx].length;
            matchCheckIdx++
          ) {
            if (allMatches[divIdx][matchCheckIdx].used === true) {
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
              match = match.reverse() as [string, string];
              [valid, conflicts] = isValid(
                config,
                divIdx,
                weekIdx,
                matchIdx,
                match,
                true
              );
            }

            if (valid) {
              const restoredMatch = matches[divIdx][weekIdx][matchIdx];
              matches[divIdx][weekIdx][matchIdx] = match;
              allMatches = matchUsed(match, divIdx, allMatches);
              allMatches = applyConflict(matches, conflicts, allMatches);

              c += 1;
              const completedPct = completedState(matches);
              if (completedPct > state.maxCompletedState) {
                writer.storeBest(matches, state);
              }
              state = {
                ...state,
                completed: completedPct < 1,
                currentGen: c,
                maxCompletedState: Math.max(
                  completedPct,
                  state.maxCompletedState
                ),
                maxCompletedFixtures: matches,
                completedState: completedPct,
                maxCompletedMatchesState: allMatches,
                lastImprovement:
                  state.maxCompletedState > completedPct
                    ? (state.lastImprovement += 1)
                    : 0,
              };

              const complete = generate();
              if (complete) {
                return true;
              }
              matches[divIdx][weekIdx][matchIdx] = restoredMatch;
              allMatches = matchUnused(match, divIdx, allMatches);
              allMatches = undoConflict(matches, conflicts, allMatches);
            }
            if (c % CHECK_INTERVAL === 0) {
              elapsedTime(c.toString(), start);
              displayState(state);
              if (state.maxCompletedState < EXIT_PCT) {
                throw new LowStartPointError("Low start point");
              }
              if (state.lastImprovement > IMPROVEMENT_CHECK_THRESHOLD) {
                displayState(state);
                displayOutput(matches, divNames);
                // logger.info("No progress. Trying a random blast");
                // matches = randomFill(config, matches, allMatches);
                // const completedPct = completedState(matches);
                // state = {
                //   ...state,
                //   maxCompletedState: Math.max(
                //     completedPct,
                //     state.maxCompletedState
                //   ),
                //   completedState: completedPct,
                //   remainingFixtures: remainingFixtures(allMatches),
                // };
                // displayState(state);
                // displayOutput(matches, divNames);
                matches = state.maxCompletedFixtures;
                allMatches = state.maxCompletedMatchesState;
                state.lastImprovement = 0;
                throw new NoProgressError("No progress");
              }
              state.lastTestCompletedState = state.completedState;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  c = 0;
  let success = false;
  for (let i = 0; i < 1; i++) {
    try {
      const idxs = getIndexes(matches, true);
      console.log(idxs);
      success = false;
      divIdxs = idxs.divIdxs;
      weekIdxs = idxs.weekIdxs;
      matchIdxs = idxs.matchIdxs;
      logger.info(`Running iteration ${i}`);
      success = generate();
      console.log(`Success: ${success}`);
    } catch (e) {
      logger.warn("No progress");
    }
  }
  writer.writeBest();

  logger.info("Complete");
  displayState(state);
  displayOutput(matches, divNames);
  logger.info(`Used seed ${config.seed.toString()}`);

  if (success) {
    writer.writeOutput(matches, allMatches);
  } else {
    writer.writeBest();
  }

  return success ? matches : null;
};

const randomFill = (
  config: Config,
  matches: MatchStructure,
  allMatches: FixtureCheck[][]
): MatchStructure => {
  for (let i = 0; i < config.appConfig.randomFillCount; i++) {
    const divIdx = Math.floor(Math.random() * matches.length);
    const weekIdx = Math.floor(Math.random() * matches[divIdx].length);
    const matchIdx = Math.floor(
      Math.random() * matches[divIdx][weekIdx].length
    );
    if (matchFilled(matches[divIdx][weekIdx][matchIdx])) {
      continue;
    }
    for (
      let matchCheckIdx = 0;
      matchCheckIdx < allMatches[divIdx].length;
      matchCheckIdx++
    ) {
      const { match } = allMatches[divIdx][matchCheckIdx];
      const [valid, conflicts] = isValid(
        config,
        divIdx,
        weekIdx,
        matchIdx,
        match,
        true
      );
      if (valid) {
        matches[divIdx][weekIdx][matchIdx] = match;
        allMatches = matchUsed(match, divIdx, allMatches);
        allMatches = applyConflict(matches, conflicts, allMatches);
        break;
      }
    }
  }

  return matches;
};

const shuffle = (arr: Array<number>) => {
  return arr.sort(() => Math.random() - 0.5);
};

const getIndexes = (matches: MatchStructure, random: boolean = false) => {
  let divIdxs = Array.from(Array(matches.length).keys());
  let weekIdxs = Array.from(Array(matches[0].length).keys());
  let matchIdxs = Array.from(Array(matches[0][0].length).keys());

  if (random) {
    divIdxs = shuffle(divIdxs);
    weekIdxs = shuffle(weekIdxs);
    matchIdxs = shuffle(matchIdxs);
  }
  return { divIdxs, weekIdxs, matchIdxs };
};
