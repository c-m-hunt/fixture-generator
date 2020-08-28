import { MatchStructure } from "../config";
import {
  validateOppoTeam,
  notPlayingThatWeek,
} from "./team";
import {
  fixtureDoesNotExists,
  notSameVenueXWeeks,
  notUnevenVenues,
  notVenueClash,
} from "./fixture";

export const isValid = (
  matchStructure: MatchStructure,
  divIdx: number,
  weekIdx: number,
  matchIdx: number,
  teamIdx: number,
  team: string,
): boolean => {
  const validationFunctions = [
    validateOppoTeam,
    notPlayingThatWeek,
    fixtureDoesNotExists,
    notSameVenueXWeeks,
    notUnevenVenues,
    // notVenueClash,
  ];

  for (const v of validationFunctions) {
    if (
      !v(matchStructure, divIdx, weekIdx, matchIdx, teamIdx, team)
    ) {
      return false;
    }
  }

  return true;
};
