import parse from "csv-simple-parser";
import moment from "moment";
import { readFileSync, appendFileSync } from "fs";
import { MatchStructure } from "../../config/types";
import { State } from "../../process/utils";
type Mapping = {
  team: string;
  divisionId: number;
  teamId: number;
  ground: Number;
};

interface OutputFormatter {
  mappings: Mapping[];
  writeFixtures: (data: MatchStructure, seed: number) => void;
}

// Class which formats the output for PlayCricket.
// This class is responsible for taking the generated fixtures and formatting them
// in a way that can be used by the PlayCricket API.
export class PlayCricketForamtter implements OutputFormatter {
  mappings: Mapping[];
  outputPath?: string;
  outputFileName?: string = `${new Date().toISOString()}.csv`;
  startDate?: Date;
  _fullOutputPath?: string;
  constructor() {
    this.mappings = this.#loadMappings();
    this.outputPath = "";
  }

  #loadMappings = (): Mapping[] => {
    const csv = readFileSync(
      `${import.meta.dir}/../../config/data/mappings.csv`,
      "utf-8"
    );
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

  #writeOutputLine = (line: string) => {
    if (!this.outputPath) {
      throw new Error("No output path set");
    }
    const fileName = `${this.outputPath}${this.outputFileName}`;
    appendFileSync(fileName, `${line}\n`);
  };

  writeFixtures = (data: MatchStructure, seed: number) => {
    if (!data) {
      throw new Error("No data to output");
    }
    if (!this.outputPath) {
      throw new Error("No output path set");
    }
    if (!this.startDate) {
      throw new Error("No start date set");
    }
    this.#writeOutputLine(seed.toString());
    for (const div of data) {
      let weekNo = 0;
      for (const week of div) {
        const matchDate1 = moment(this.startDate).add(weekNo * 7, "days");
        const matchDate2 = moment(this.startDate).add((weekNo + 9) * 7, "days");
        for (const match of week) {
          if (match[0] && match[1]) {
            const homeTeam = this.mappings.find((m) => m.team === match[0]);
            const awayTeam = this.mappings.find((m) => m.team === match[1]);

            // Division, Date, Time, Team1, Team2, Ground
            if (!homeTeam) {
              throw new Error(`Home team not found in mappings: ${match[0]}`);
            }
            if (!awayTeam) {
              throw new Error(`Away team not found in mappings: ${match[1]}`);
            }
            const outputLine1 = `${homeTeam.divisionId}, ${matchDate1.format(
              "YYYY-MM-DD"
            )}, 12:00, ${homeTeam.teamId}, ${awayTeam.teamId}, ${
              homeTeam.ground
            }`;
            const outputLine2 = `${awayTeam.divisionId}, ${matchDate2.format(
              "YYYY-MM-DD"
            )}, 12:00, ${awayTeam.teamId}, ${homeTeam.teamId}, ${
              awayTeam.ground
            }`;
            this.#writeOutputLine(outputLine1);
            this.#writeOutputLine(outputLine2);
          }
        }
        weekNo++;
      }
    }
  };
}
