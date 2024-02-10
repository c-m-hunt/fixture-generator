import { MatchStructure } from "../config/types";
import { completedState, teamConflictsToObject } from "./../utils";

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

  it("should give a percentage of completed fixtures", () => {
    let matches = [
      [
        [
          ["BRE1", "WAN1"],
          ["CHE1", "SOS1"],
        ],
      ],
    ] as MatchStructure;
    expect(completedState(matches)).toBe(1);

    matches = [
      [
        [
          ["BRE1", "WAN1"],
          ["CHE1", null],
        ],
        [
          ["BRE1", "WAN1"],
          ["CHE1", "SOS1"],
        ],
      ],
    ] as MatchStructure;
    expect(completedState(matches)).toBe(0.75);

    matches = [
      [
        [
          ["BRE1", "WAN1"],
          ["CHE1", null],
        ],
        [
          [null, null],
          ["CHE1", "SOS1"],
        ],
      ],
    ] as MatchStructure;
    expect(completedState(matches)).toBe(0.5);
  });
});
