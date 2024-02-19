import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notUnevenVenues,
  notVenueClash,
} from "./validation/fixture";
import { notPlayingThatWeek, validateOppoTeam } from "./validation/team";

export const config = {
  // Validation
  consecutiveVenueWeeks: 2,
  defaultValidationFunctions: [
    validateOppoTeam,
    notPlayingThatWeek,
    fixtureDoesNotExists,
    notSameVenueXWeeks,
    notUnevenVenues,
    notVenueClash,
  ],

  // Process
  exitPct: 0.3,
  checkInterval: 100000,
  improvementCheckInterval: 1000000,
};
