import { divConfig, venConflicts } from "./config";
import {
  ConflictsObject,
  teamConflictsToObject,
  shuffle,
} from "../utils";

export type Fixture = [string | null, string | null];

export type MatchStructure = Array<
  Array<Array<Fixture>>
>;

export const setup = (
  divTeams: string[][],
  divWeeks: number[],
): MatchStructure => {
  if (divTeams.length !== divWeeks.length) {
    throw new Error("Teams and weeks must be the same length");
  }
  const matches: MatchStructure = new Array(divWeeks.length);

  const fixture: Fixture = [null, null];
  for (let d = 0; d < matches.length; d++) {
    matches[d] = new Array(divWeeks[d]);
    for (let w = 0; w < matches[d].length; w++) {
      const matchCount = Math.floor(divTeams[d].length / 2);
      matches[d][w] = new Array(matchCount);
      for (let m = 0; m < matches[d][w].length; m++) {
        matches[d][w][m] = [...fixture];
      }
    }
  }

  return matches;
};

export const divTeams = divConfig.map((d) => shuffle(d.teams));

export const divNames = divConfig.map((d) => d.name);

export const divWeeks = divConfig.map((d) => d.teams.length - 1);

export const venConflictsLookup: ConflictsObject = teamConflictsToObject(
  venConflicts, true,
);
