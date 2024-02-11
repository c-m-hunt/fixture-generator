import { generateVenueConflicts, getClubList } from "../utils";

describe("Club list", () => {
  it("should generate a club list", () => {
    const divConfig = [
      {
        name: "Prem",
        teams: ["BRE1", "WAN1", "CHE1"],
      },
      {
        name: "1",
        teams: ["BRE2", "WAN2", "SOS1"],
      },
    ];

    const clubTeams = getClubList(divConfig);

    expect(clubTeams).toEqual({
      BRE: [1, 2],
      WAN: [1, 2],
      CHE: [1],
      SOS: [1],
    });
  });
});

describe("Venue conflicts", () => {
  it("should generate venue conflicts", () => {
    const divConfig = [
      {
        name: "Prem",
        teams: ["BRE1", "WAN3", "CHE1"],
      },
      {
        name: "1",
        teams: ["BRE2", "WAN4", "SOS1"],
      },
      {
        name: "1",
        teams: ["LOS3", "LOS4", "SOS3"],
      },
    ];

    const venueConflicts = generateVenueConflicts(divConfig);

    expect(venueConflicts).toEqual([
      ["BRE1", "BRE2"],
      ["WAN3", "WAN4"],
      ["LOS3", "LOS4"],
    ]);
  });
});
