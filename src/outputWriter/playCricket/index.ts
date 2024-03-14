import parse from "csv-simple-parser";
import moment from "moment";
import { readFileSync, appendFileSync } from "fs";
import { Config, Fixture, MatchStructure } from "../../config/types";
import { uploadFileToS3 } from "./utils";
import path from "path";
import fs from "fs";
import { OutputWriter, OutputWriterBase } from "..";

type Mapping = {
  team: string;
  divisionId: number;
  teamId: number;
  ground: Number;
};

// Class which formats the output for PlayCricket.
// This class is responsible for taking the generated fixtures and formatting them
// in a way that can be used by the PlayCricket API.
export class PlayCricketWriter
  extends OutputWriterBase
  implements OutputWriter
{
  config: Config;
  matches?: MatchStructure;
  remainingFixtures?: Fixture[][];
  mappings: Mapping[];
  outputPath?: string;
  outputFileName?: string = `${new Date().toISOString()}.txt`;
  fullOutputPath?: string;
  startDate?: Date;
  constructor(config: Config) {
    super();
    this.mappings = this.#loadMappings();
    this.outputPath = "";
    this.config = config;
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
    if (!this.outputPath || !this.fullOutputPath) {
      throw new Error("No output path set");
    }

    appendFileSync(this.fullOutputPath, `${line}\n`);
  };

  #writeOutputLineDivider = () => {
    this.#writeOutputLine(
      "----------------------------------------------------"
    );
  };

  writeOutput = (matches: MatchStructure, remainingFixtures: Fixture[][]) => {
    if (!this.outputPath) {
      throw new Error("No output path set");
    }
    if (!matches || matches.length === 0) {
      throw new Error("No data to output");
    }
    if (!this.startDate) {
      throw new Error("No start date set");
    }
    if (this.outputFileName === undefined) {
      throw new Error("No output file name set");
    }
    this.matches = matches;
    this.remainingFixtures = remainingFixtures;
    let filePath = this.outputPath;
    if (this.bestState?.completed === false) {
      filePath = path.join(
        this.outputPath,
        this.bestState.completedState.toString()
      );
    }
    this.fullOutputPath = path.join(filePath, this.outputFileName);
    fs.mkdirSync(filePath, { recursive: true });

    this.writeState();
    this.writeConfig();
    this.writeReadableFixtures();
    this.writeRemainingFixtures();
    this.writeFixtures();
    if (this.config.appConfig.s3Path) {
      this.writeToS3();
    }
  };

  writeRemainingFixtures = () => {
    if (!this.remainingFixtures) {
      return;
    }
    for (const [divIdx, div] of this.remainingFixtures.entries()) {
      this.#writeOutputLineDivider();
      this.#writeOutputLine(this.config.divNames[divIdx]);
      for (const fix of div) {
        this.#writeOutputLine(`${fix[0]} v ${fix[1]}`);
      }
    }
  };

  writeReadableFixtures = () => {
    if (!this.matches) {
      throw new Error("No matches to output");
    }
    const lines = this.createOutput(this.matches, this.config.divNames);
    for (const line of lines) {
      this.#writeOutputLine(line);
    }
    this.#writeOutputLineDivider();
  };

  writeToS3 = async () => {
    console.log("Uploading to S3");
    if (this.config.appConfig.s3Path && this.fullOutputPath) {
      const key = path.join(
        this.config.appConfig.s3Path.key,
        this.fullOutputPath
      );
      console.log(
        `Uploading to S3. Bucket: ${this.config.appConfig.s3Path.bucket}, Key:${key}`
      );
      try {
        await uploadFileToS3(
          this.fullOutputPath,
          this.config.appConfig.s3Path.bucket,
          key
        );
      } catch (e) {
        console.error(e);
      }
    }
  };

  writeConfig = () => {
    const { config } = this;
    this.#writeOutputLine(config.seed.toString());
    this.#writeOutputLineDivider();
    if (Object.keys(config.venConflicts).length > 0) {
      for (const team1 in config.venConflicts) {
        this.#writeOutputLine(`${team1},${config.venConflicts[team1]}`);
      }
    } else {
      this.#writeOutputLine("No venue conflicts");
    }
    this.#writeOutputLineDivider();

    if (config.venRequirements.length > 0) {
      for (const team of config.venRequirements) {
        this.#writeOutputLine(`${team.team},${team.venue},${team.week}`);
      }
    } else {
      this.#writeOutputLine("No venue requirements");
    }
    this.#writeOutputLineDivider();

    if (config.divNames.length > 0) {
      for (const [i, divName] of config.divNames.entries()) {
        this.#writeOutputLine(`${divName},${config.divTeams[i].join(",")}`);
      }
      this.#writeOutputLineDivider();
    }
  };

  writeState = () => {
    if (this.bestState) {
      this.#writeOutputLine(
        `Completed state: ${this.bestState.completedState.toString()}`
      );
      this.#writeOutputLineDivider();
    }
  };

  writeBest = () => {
    if (this.bestMatches) {
      this.writeOutput(
        this.bestMatches,
        this.bestState?.remainingFixtures || []
      );
    }
  };

  writeFixtures = () => {
    const { matches } = this;
    if (!matches) {
      throw new Error("No matches to output");
    }
    for (const div of matches) {
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
