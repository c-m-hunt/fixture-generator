import {
  DivisionConfig,
  VenConflicts,
  ClubTeams,
  Fixture,
  FixtureCheck,
} from "./types";
/**
 * Generates an array of venue conflicts based on the provided division configuration.
 * @param divConfig - The division configuration.
 * @returns An array of venue conflicts.
 */
export const generateVenueConflicts = (
  divConfig: DivisionConfig[]
): VenConflicts => {
  const clubTeams = getClubList(divConfig);
  const conflicts: VenConflicts = [];
  for (const club of Object.keys(clubTeams)) {
    const teams = clubTeams[club];
    if (teams.length === 1) {
      continue;
    }
    for (const [i, team] of teams.entries()) {
      if (team % 2 === 1 && i + 1 < teams.length && teams.includes(team + 1)) {
        conflicts.push([`${club}${team}`, `${club}${teams[i + 1]}`]);
      }
    }
  }

  // Add reverse conflicts
  for (const conflict of [...conflicts]) {
    conflicts.push([conflict[1], conflict[0]]);
  }
  console.log(conflicts);
  return conflicts;
};

/**
 * Retrieves a list of clubs from the given division configuration.
 * @param divConfig - The division configuration containing team information.
 * @returns An object representing the clubs and their corresponding teams.
 */
export const getClubList = (divConfig: DivisionConfig[]): ClubTeams => {
  const teamList = divConfig.map((d) => d.teams).flat();
  const clubs: ClubTeams = {};
  for (const team of teamList) {
    const club = team.substring(0, 3);
    if (!Object.keys(clubs).includes(club)) {
      clubs[club] = [];
    }
    clubs[club].push(parseInt(team.substring(3)));
  }
  return clubs;
};

/**
 * Generate all fixtures for multiple division configurations.
 *
 * @param divConfig
 * @returns An array of arrays of fixtures.
 */
export const generateAllMatches = (divConfig: string[][]): FixtureCheck[][] => {
  return divConfig.map((teams) => generateDivMatches(teams));
};

/**
 * Generate all fixtures for a given division configuration.
 *
 * @param divConfig
 * @returns An array of fixtures.
 */
export const generateDivMatches = (teamList: string[]): FixtureCheck[] => {
  const matches: FixtureCheck[] = [];
  for (let i = 0; i < teamList.length; i++) {
    for (let j = i; j < teamList.length; j++) {
      if (i !== j) {
        matches.push({ match: [teamList[i], teamList[j]], used: false });
      }
    }
  }
  return matches;
};
