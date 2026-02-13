// Shared database query helpers

export function getOne<T>(result: { columns: string[]; values: unknown[][] }[]): T | undefined {
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    const row = result[0].values[0];
    const columns = result[0].columns;
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
        obj[col] = row[i];
    });
    return obj as T;
}

export function getAll<T>(result: { columns: string[]; values: unknown[][] }[]): T[] {
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj as T;
    });
}
