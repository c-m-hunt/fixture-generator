export const config = {
  // -------------------
  // General
  // -------------------

  // If the fixtures will be reversed after the first half of the season
  // This will trigger the notSameVenueXWeeks validation function to check
  // for the same venue for the reverse fixtures of the first few games of season
  reverseFixtures: true,

  // -------------------
  // Validation
  // -------------------

  // The number of consecutive weeks a team can play in the same venue
  consecutiveVenueWeeks: 2,

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
};
