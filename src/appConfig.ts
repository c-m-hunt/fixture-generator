export type AppConfig = {
  reverseFixtures: boolean;
  startDate: Date;
  consecutiveVenueWeeks: number;
  exitPct: number;
  checkInterval: number;
  improvementCheckInterval: number;
  outputPath: string;
  s3Path: {
    bucket: string;
    key: string;
  } | null;
};

export const config: AppConfig = {
  // -------------------
  // General
  // -------------------

  // If the fixtures will be reversed after the first half of the season
  // This will trigger the notSameVenueXWeeks validation function to check
  // for the same venue for the reverse fixtures of the first few games of season
  reverseFixtures: true,
  startDate: new Date("2024-05-11"),

  // -------------------
  // Validation
  // -------------------

  // The number of consecutive weeks a team can play in the same venue
  consecutiveVenueWeeks: 3,

  // -------------------
  // Process
  // -------------------

  // Will exit if the improvement is less than this percentage by the check interval
  exitPct: 0.5,
  checkInterval: 100000,
  improvementCheckInterval: 1000000,

  // -------------------
  // Display
  // -------------------
  outputPath: "./output/",
  s3Path:
    process.env.S3_BUCKET && process.env.S3_KEY
      ? {
          bucket: process.env.S3_BUCKET,
          key: process.env.S3_KEY,
        }
      : null,
};
