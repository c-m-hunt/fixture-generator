import { MatchStructure } from "../config/types";

export interface OutputWriter {
  writeOutput: (matches: MatchStructure) => void;
}
