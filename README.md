# Fixture generator

## WORK IN PROGRESS
If you're interested in helping, please contact me.

## Overview
Will handle the generation of fixtures with complex rules. Examples:
* Venue clashes
* Max consecutive home/away games

## Config
In the `src/config/data` directory, add the following files:

### `divisions.csv`
Sample:
```
1st XI Premier,BRE1,BUC1,CHE1,CHI1,COL1,HAD1,HOR1,HUT1,LOU1,WAN1
1st XI Div 1,BEL1,BIL1,EPP1,FIV1,GPR1,HAW1,ILF1,ORS1,SPR1,UPM1
1st XI Div 2,AZT1,GOR1,HOH1,OBR1,OPA1,OSS1,SHE1,WGR1,WOS1,WWE1
1st XI Div 3,BAR1,BEN1,BNT1,HAR1,HAT1,LOS1,NEW1,SLH1,WES1,WFG1
2nd XI Premier,BIL2,CHE2,CHI2,EPP2,HAW2,HOR2,ILF2,SHE2,UPM2,WAN2
2nd XI Div 1,BRE2,BUC2,GPR2,HAR2,HUT2,LOU2,OPA2,ORS2,SWD2,WWE2
2nd XI Div 2,BEN2,COL2,FIV2,HAD2,OBR2,OSS2,SLH2,WES2,WIC2,WOS2
2nd XI Div 3,BEL2,FRE2,GOR2,HAT2,HOH2,LOS2,NEW2,SOS2,WAL2,WGR2
```

### `venReq.csv`
This file contains the venue requirements for each team. The file should be in the following format:
* Team
* Venue (h, a)
* Week no

Sample:
```
WAN1,a,7
COL1,a,3
HAR1,a,2
HAR4,a,2
HAR2,a,3
```
NOTE: There is no logic applied when filling in venue requirements. Teams will be placed in the first available slot.

## Running
To run the program, execute the following command:
```
bun run ./src/index.ts
```

## Working seeds
0.25211828478073406
0.4744967766477323
1st XI Premier,BRE1,BUC1,CHE1,CHI1,COL1,HAD1,HOR1,HUT1,LOU1,WAN1
1st XI Div 1,BEL1,BIL1,EPP1,FIV1,GPR1,HAW1,ILF1,ORS1,SPR1,UPM1
1st XI Div 2,AZT1,GOR1,HOH1,OBR1,OPA1,OSS1,SHE1,WGR1,WOS1,WWE1
1st XI Div 3,BAR1,BEN1,BNT1,HAR1,HAT1,LOS1,NEW1,SLH1,WES1,WFG1
2nd XI Premier,BIL2,CHE2,CHI2,EPP2,HAW2,HOR2,ILF2,SHE2,UPM2,WAN2
2nd XI Div 1,BRE2,BUC2,GPR2,HAR2,HUT2,LOU2,OPA2,ORS2,SWD2,WWE2
2nd XI Div 2,BEN2,COL2,FIV2,HAD2,OBR2,OSS2,SLH2,WES2,WIC2,WOS2
2nd XI Div 3,BEL2,FRE2,GOR2,HAT2,HOH2,LOS2,NEW2,SOS2,WAL2,WGR2