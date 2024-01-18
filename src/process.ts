import { MatchStructure } from "./config";
import { divTeams, divNames } from "./config";
import { isValid, ConflictResponse } from "./validation";
import { displayOutput, elapsedTime } from "./utils";

export const runProcess = (matchStructure: MatchStructure): void => {
    const start = process.hrtime();
    let c = 0;
    const generate = () => {
        // Iterate divs
        for (let divIdx = 0; divIdx < matchStructure.length; divIdx++) {
            // Iterate weeks in division
            for (let weekIdx = 0; weekIdx < matchStructure[divIdx].length; weekIdx++) {
                // Iterate matches in division week
                for (
                    let matchIdx = 0;
                    matchIdx < matchStructure[divIdx][weekIdx].length;
                    matchIdx++
                ) {
                    // Iterate teams in fixture
                    for (
                        let teamIdx = 0;
                        teamIdx < matchStructure[divIdx][weekIdx][matchIdx].length;
                        teamIdx++
                    ) {
                        if (matchStructure[divIdx][weekIdx][matchIdx][teamIdx] === null) {
                            for (const team of divTeams[divIdx]) {
                                const [valid, conflict] = isValid(
                                    matchStructure,
                                    divIdx,
                                    weekIdx,
                                    matchIdx,
                                    teamIdx,
                                    team,
                                    true,
                                );
                                if (valid) {
                                    matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
                                    applyConflict(matchStructure, conflict);
                                    c += 1;
                                    if (c % 100000 === 0) {
                                        elapsedTime(c.toString(), start);
                                        displayOutput(matchStructure, divNames);
                                    }

                                    const complete = generate();
                                    if (complete) {
                                        return true;
                                    }
                                    matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = null;
                                    undoConflict(matchStructure, conflict);
                                }
                            }
                            return false;
                        }
                    }
                }
            }
        }
        console.log(c);
        return true
    };
    generate();
}
const applyConflict = (
    matchStructure: MatchStructure,
    conflict: ConflictResponse,
) => {
    if (!conflict) {
        return;
    }
    const [team, divIdx, weekIdx, matchIdx, teamIdx] = conflict;
    matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = team;
};

const undoConflict = (
    matchStructure: MatchStructure,
    conflict: ConflictResponse,
) => {
    if (!conflict) {
        return;
    }
    const [team, divIdx, weekIdx, matchIdx, teamIdx] = conflict;
    matchStructure[divIdx][weekIdx][matchIdx][teamIdx] = null;
};
