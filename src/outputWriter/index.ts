import { Fixture, FixtureCheck, MatchStructure } from "../config/types";
import { State } from "../process/utils";

export interface OutputWriter {
  writeOutput: (
    matches: MatchStructure,
    remainingFixtures: Fixture[][]
  ) => void;
  writeBest: () => void;
  storeBest: (matches: MatchStructure, state: State) => void;
  createOutput: (
    matchStructure: MatchStructure,
    divNames: Array<string>
  ) => string[];
}

export abstract class OutputWriterBase {
  bestMatches: MatchStructure | null = null;
  bestState: State | null = null;

  abstract writeOutput: (
    matches: MatchStructure,
    remainingFixtures: Fixture[][]
  ) => void;

  /**
   * Stores the best matches and state.
   *
   * @param matches
   * @param state
   */
  storeBest = (matches: MatchStructure, state: State) => {
    if (state.completedState > (this.bestState?.completedState ?? 0)) {
      this.bestMatches = JSON.parse(JSON.stringify(matches));
      this.bestState = JSON.parse(JSON.stringify(state));
    }
  };

  /**
   * Creates the output of the match structure.
   *
   * @param matchStructure - The match structure to display.
   * @param divNames - An array of division names.
   * @returns The output as an array of strings.
   */
  createOutput = (
    matchStructure: MatchStructure,
    divNames: Array<string>
  ): string[] => {
    let outputStr: string[] = [];
    for (let d = 0; d < matchStructure.length; d++) {
      const div = matchStructure[d];
      outputStr.push(divNames[d]);
      for (let m = 0; m < div[0].length; m++) {
        outputStr.push(div.map((w) => `${w[m][0]} v ${w[m][1]}`).join("    "));
      }
      outputStr.push("-------------------------------------------------");
    }
    outputStr.push("-------------------------------------------------");
    return outputStr;
  };
}
