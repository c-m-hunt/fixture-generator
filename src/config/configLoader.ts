import parse from "csv-simple-parser";
import { DivisionConfig, VenRequirements } from "./types";

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
export const loadVenReqConfig = async (): Promise<VenRequirements[]> => {
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
