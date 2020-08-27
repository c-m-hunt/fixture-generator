import { setup } from "./..";

describe("Config", () => {
  it("should throw an exception when weeks and teams aren't same length", () => {
    const divTeams = [
      ["BRE", "WAN", "CHE", "HAD", "HOR", "BIL", "CHI", "BEL", "BUC", "ILF"], // Prem
    ];

    const divWeeks = [
      9, // Prem
      9, // Div 1
    ];
    expect(() => {
      setup(divTeams, divWeeks);
    }).toThrow();
  });

  it("should generate an initial setup", () => {
    const divTeams = [
      ["BRE", "WAN", "CHE", "HAD", "HOR", "BIL", "CHI", "BEL", "BUC", "ILF"], // Prem
      ["COL", "HAW", "SHE", "WWE", "FIV", "HUT", "LOU", "UPM", "GPR", "SOS"], // Div 1
    ];

    const divWeeks = [
      9, // Prem
      9, // Div 1
    ];

    const matches = setup(divTeams, divWeeks);

    expect(matches.length).toEqual(2);
    expect(matches[0].length).toEqual(9);
    expect(matches[0][0].length).toEqual(5);
    expect(matches[0][0][0]).toEqual([null, null]);
  });
});
