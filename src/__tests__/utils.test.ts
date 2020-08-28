import { teamConflictsToObject } from "./../utils";

describe("Utils", () => {
  it("should convert conflict array to objects", () => {
    const conflicts: [string, string][] = [
      ["WAN1", "WAN2"],
      ["CHI1", "CHI2"],
    ];

    const conflictObj = teamConflictsToObject(conflicts);
    expect(Object.keys(conflictObj).length).toBe(2);
    expect(conflictObj["WAN1"]).toEqual("WAN2");
  });
  it("should convert conflict array to objects and produce reverse", () => {
    const conflicts: [string, string][] = [
      ["WAN1", "WAN2"],
      ["CHI1", "CHI2"],
    ];

    const conflictObj = teamConflictsToObject(conflicts, true);
    expect(Object.keys(conflictObj).length).toBe(4);
    expect(conflictObj["WAN2"]).toEqual("WAN1");
    expect(conflictObj["WAN1"]).toEqual("WAN2");
  });
});
