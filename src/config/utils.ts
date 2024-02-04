import { DivisionConfig, ConflictsArray } from "./types";
export const generateVenueConflicts = (
  divConfig: DivisionConfig[]
): ConflictsArray => {
  const clubTeams = getClubList(divConfig);
  const conflicts: ConflictsArray = [];
  for (const club of Object.keys(clubTeams)) {
    const teams = clubTeams[club];

    if (teams.length === 1) {
      continue;
    }
    for (const [i, team] of teams.entries()) {
      if (team % 2 === 1 && i + 1 < teams.length) {
        conflicts.push([`${club}${team}`, `${club}${teams[i + 1]}`]);
      }
    }
  }
  return conflicts;
};

type ClubTeams = { [k: string]: number[] };

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
