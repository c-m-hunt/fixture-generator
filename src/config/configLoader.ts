import parse from "csv-simple-parser";
import { DivisionConfig, FixtureRequirement, VenRequirement } from "./types";

/**
 * Loads the division configuration from a CSV file.
 * @returns A promise that resolves to an array of DivisionConfig objects.
 */
export const loadDivConfig = async (): Promise<DivisionConfig[]> => {
  const file = Bun.file(`${import.meta.dir}/data/divisions.csv`);
  const csv = await file.text();
  const configData = parse(csv, {
    header: false,
  }) as string[][];
  return configData.map((d: string[]) => ({
    name: d[0] as string,
    teams: d.slice(1) as string[],
  }));
};

/**
 * Loads the VenRequirements configuration from a CSV file.
 * @returns A promise that resolves to an array of VenRequirements objects.
 */
export const loadVenReqConfig = async (): Promise<VenRequirement[]> => {
  const file = Bun.file(`${import.meta.dir}/data/venReq.csv`);
  const csv = await file.text();
  const data = parse(csv, {
    header: false,
  }) as string[][];
  return data.map((d: string[]) => ({
    team: d[0] as string,
    venue: d[1] as "h" | "a",
    week: Number(d[2]),
  }));
};

/**
 * Loads the FixtureRequirements configuration from a CSV file.
 * @returns A promise that resolves to an array of FixtureRequirement objects.
 */
export const loadFixtureReqConfig = async (): Promise<FixtureRequirement[]> => {
  const file = Bun.file(`${import.meta.dir}/data/fixReq.csv`);
  const csv = await file.text();
  const data = parse(csv, {
    header: false,
  }) as string[][];
  return data.map((d: string[]) => ({
    week: Number(d[0]),
    team1: d[1] as string,
    team2: d[2] as string,
  }));
};
