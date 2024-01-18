import parse from "csv-simple-parser";

type DivisionConfig = {
    name: string;
    teams: string[];
};

export const loadDivConfig = async (): Promise<DivisionConfig[]> => {
    const file = Bun.file(`${import.meta.dir}/data/divisions.csv`)
    const csv = await file.text();
    const configData = parse(csv, {
        header: false,
    }) as string[][];
    return configData.map((d: string[]) => ({
        name: d[0] as string,
        teams: d.slice(1) as string[],
    }));
}
