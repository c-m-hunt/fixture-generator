export type DivisionConfig = {
  name: string;
  teams: string[];
};

export type Fixture = [string | null, string | null];

export type MatchStructure = Array<Array<Array<Fixture>>>;

export type Config = {
  matches: MatchStructure;
  divTeams: string[][];
  divWeeks: number[];
  divNames: string[];
  venConflicts: ConflictsObject;
};

export type ConflictsArray = [string, string][];

export interface ConflictsObject {
  [key: string]: string;
}
