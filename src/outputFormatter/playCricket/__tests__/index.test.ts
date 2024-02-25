import { PlayCricketForamtter } from "../index";

describe("Play", () => {
  it("should initialise and load mappings", () => {
    const formatter = new PlayCricketForamtter();
    expect(formatter.mappings[0]).toEqual({
      team: "CHI1",
      divisionId: 117997,
      teamId: 46056,
      ground: 12335,
    });
  });

  it("should throw error if no output path given", () => {
    const formatter = new PlayCricketForamtter();
    expect(() => formatter.writeFixtures({}, 123)).toThrow(
      "No output path set"
    );
  });

  it("should throw error if no data given", () => {
    const formatter = new PlayCricketForamtter();
    formatter.outputPath = "path";
    expect(() => formatter.writeFixtures()).toThrow("No data to output");

    expect(() => formatter.writeFixtures(null)).toThrow("No data to output");
  });
});
