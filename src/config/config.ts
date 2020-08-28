import {
  ConflictsArray,
  ConflictsObject,
  teamConflictsToObject,
} from "../utils";

export const divTeams = [
  [
    "BRE1",
    "WAN1",
    "CHE1",
    "HAD1",
    "HOR1",
    "BIL1",
    "CHI1",
    "BEL1",
    "COL1",
    "HAW1",
  ], // Prem
  // [
  //   "BUC1",
  //   "ILF1",
  //   "SHE1",
  //   "WWE1",
  //   "FIV1",
  //   "HUT1",
  //   "LOU1",
  //   "UPM1",
  //   "OSS1",
  //   "HOH1",
  // ], // Div 1
  // [
  //   "GPR1",
  //   "SOS1",
  //   "OPA1",
  //   "ORS1",
  //   "HAT1",
  //   "BEN1",
  //   "WIC1",
  //   "FRE1",
  //   "LOS1",
  //   "WOS1",
  // ], // Div 2
  // [
  // "OLB1",
  // "SWD1",
  //   "HAR1",
  //   "WAL1",
  //   "ARD1",
  //   "EPP1",
  //   "GOR1",
  //   "SLH1",
  //   "WFG1",
  //   "WES1",
  //   "RAI1",
  //   "BAR1",
  //   "NEW1",
  //   "SPR1",
  // ],
  [
    "HOR2",
    "CHE2",
    "BRE2",
    "WAN2",
    "ILF2",
    "SHE2",
    "WWE2",
    "OPA2",
    "UPM2",
    "WIC2",
  ], // 2nd XI Prem
];

export const divWeeks = [
  9, // Prem
  // 9, // Div 1
  // 9, // Div 2
  //13, // Div 3,
  9,
];

// export const divTeams = [
//   ["BRE", "WAN"], // Prem
//   ["COL", "HAW"], // Div 1
// ];

// export const divWeeks = [
//   1, // Prem
//   1, // Div 1
// ];

export const venConflicts: ConflictsArray = [
  ["BRE1", "BRE2"],
  ["WAN1", "WAN2"],
  ["CHE1", "CHE2"],
  ["HAD1", "HAD2"],
  ["HOR1", "HOR2"],
  ["BIL1", "BIL2"],
  ["CHI1", "CHI2"],
  ["BEL1", "BEL2"],
  ["COL1", "COL2"],
  ["HAW1", "HAW2"],
];

export const venConflictsLookup: ConflictsObject = teamConflictsToObject(
  venConflicts,
);
