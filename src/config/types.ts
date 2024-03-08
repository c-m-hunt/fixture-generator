import { AppConfig } from "../appConfig";

export type DivisionConfig = {
  name: string;
  teams: string[];
};

export type VenRequirements = {
  team: string;
  venue: "h" | "a";
  week: number;
};

export type Fixture = [string | null, string | null];

export type MatchStructure = Array<Array<Array<Fixture>>>;

/**
 * Represents the configuration object for generating fixtures.
 */
export type Config = {
  seed: number;
  matches: MatchStructure;
  divTeams: string[][];
  divWeeks: number[];
  divNames: string[];
  venRequirements: VenRequirements[];
  venConflicts: ConflictsObject;
  startDate?: Date;
  appConfig: AppConfig;
};

export type VenConflicts = [string, string][];

export interface ConflictsObject {
  [key: string]: string;
}

export type ClubTeams = { [k: string]: number[] };
