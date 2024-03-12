import { AppConfig } from "../appConfig";

export type DivisionConfig = {
  name: string;
  teams: string[];
};

export type VenRequirement = {
  team: string;
  venue: "h" | "a";
  week: number;
};

export type FixtureRequirement = {
  week: number;
  team1: string;
  team2: string;
};

export type Fixture = [string | null, string | null];
export type FixtureCheck = {
  match: Fixture;
  used: boolean;
};

export type MatchStructure = Array<Array<Array<Fixture>>>;

/**
 * Represents the configuration object for generating fixtures.
 */
export type Config = {
  seed: number;
  matches: MatchStructure;
  allMatches: FixtureCheck[][];
  divTeams: string[][];
  divWeeks: number[];
  divNames: string[];
  venRequirements: VenRequirement[];
  fixtureRequirements: FixtureRequirement[];
  venConflicts: ConflictsObject;
  startDate?: Date;
  appConfig: AppConfig;
};

export type VenConflicts = [string, string][];

export interface ConflictsObject {
  [key: string]: string;
}

export type ClubTeams = { [k: string]: number[] };
