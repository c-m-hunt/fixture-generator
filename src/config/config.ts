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
  [
    "BUC1",
    "ILF1",
    "SHE1",
    "WWE1",
    "FIV1",
    "HUT1",
    "LOU1",
    "UPM1",
    "OSS1",
    "HOH1",
  ], // Div 1
  [
    "GPR1",
    "SOS1",
    "OPA1",
    "ORS1",
    "HAT1",
    "BEN1",
    "WIC1",
    "FRE1",
    "LOS1",
    "WOS1",
  ], // Div 2
  // [
  //   "OLB1",
  //   "SWD1",
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
  // ], // Div 3
  [
    "HOR2",
    "CHE2",
    "BRE2",
    "WAN2",
    "ILF2",
    "SHE2",
    "WWE2",
    "OPA2",
    "CHI2",
    "BUC2",
  ], // 2nd XI Prem
  [
    "UPM2",
    "WIC2",
    "HAW2",
    "LOU2",
    "HUT2",
    "COL2",
    "BIL2",
    "FRE2",
    "SWF2",
    "GPR2",
  ], // 2nd XI Div 1
  [
    "BEL2",
    "SOS2",
    "HAR2",
    "WOS2",
    "OLB2",
    "OSS2",
    "ARD2",
    "HAT2",
    "LOS2",
    "EPP2",
  ], // 2nd XI Div 2
  [
    "WES2",
    "ORS2",
    "BEN2",
    "FIV2",
    "SLH2",
    "WFG2",
    "GOR2",
    "WAL2",
    "HOH2",
    "HAT2",
  ], // 2nd XI Div 3
];

export const divWeeks = [
  9, // Prem
  9, // Div 1
  9, // Div 2
  // 13, // Div 3,
  9, // 2nd XI Prem
  9, // 2nd XI Div 1
  9, // 2nd XI Div 2
  9, // 2nd XI Div 3
];

export const venConflicts: ConflictsArray = [
  ["ARD1", "ARD2"],
  ["BEL1", "BEL2"],
  ["BEN1", "BEN2"],
  ["BIL1", "BIL2"],
  ["BRE1", "BRE2"],
  ["BUC1", "BUC2"],
  ["CHE1", "CHE2"],
  ["CHI1", "CHI2"],
  ["COL1", "COL2"],
  ["EPP1", "EPP2"],
  ["FIV1", "FIV2"],
  ["FRE1", "FRE2"],
  ["GOR1", "GOR2"],
  ["GPR1", "GPR2"],
  ["HAD1", "HAD2"],
  ["HAR1", "HAR2"],
  ["HAT1", "HAT2"],
  ["HAW1", "HAW2"],
  ["HOH1", "HOH2"],
  ["HOR1", "HOR2"],
  ["HUT1", "HUT2"],
  ["ILF1", "ILF2"],
  ["LOS1", "LOS2"],
  ["LOU1", "LOU2"],
  ["OLB1", "OLB2"], // Check
  ["OPA1", "OPA2"],
  ["ORS1", "ORS2"],
  ["OSS1", "OSS2"],
  ["SHE1", "SHE2"],
  ["SLH1", "SLH2"],
  ["SOS1", "SOS2"],
  ["SWD1", "SWD2"],
  ["WAL1", "WAL2"],
  ["UPM1", "UPM2"],
  ["WAN1", "WAN2"],
  ["WES1", "WES2"],
  ["WFG1", "WFG2"],
  ["WIC1", "WIC2"],
  ["WOS1", "WOS2"],
  ["WWE1", "WWE2"],
];

export const venConflictsLookup: ConflictsObject = teamConflictsToObject(
  venConflicts,
);
