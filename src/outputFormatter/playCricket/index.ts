import parse from "csv-simple-parser";
import { MatchStructure } from "../../config/types";
import { readFileSync } from "fs";
type Mapping = {
  team: string;
  divisionId: number;
  teamId: number;
  ground: Number;
};

interface OutputFormatter {
  mappings: Mapping[];
  outputData: (data: MatchStructure) => void;
}

export class PlayCricketForamtter implements OutputFormatter {
  mappings: Mapping[];
  outputPath: string;
  constructor() {
    this.mappings = this.#loadMappings();
    this.outputPath = "";
  }

  #loadMappings = (): Mapping[] => {
    const csv = readFileSync(`${import.meta.dir}/data/mappings.csv`, "utf-8");
    const data = parse(csv, {
      header: false,
    }) as string[][];
    return data.map((d: string[]) => ({
      team: d[0] as string,
      divisionId: Number(d[1]),
      teamId: Number(d[2]),
      ground: Number(d[3]),
    }));
  };

  outputData = (data: MatchStructure) => {
    if (!data) {
      throw new Error("No data to output");
    }
    if (!this.outputPath) {
      throw new Error("No output path set");
    }
  };
}
