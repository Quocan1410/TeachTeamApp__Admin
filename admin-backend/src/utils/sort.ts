type SortDirection = "ASC" | "DESC";

const DEFAULT_SORT_DIR: SortDirection = "DESC";

export function resolveSortDirection(
    sortDir?: string | null
): SortDirection {
    return String(sortDir || "").toLowerCase() === "asc" ? "ASC" : DEFAULT_SORT_DIR;
}

export function applyEntitySort(
    qb: {
        orderBy: (column: string, direction: SortDirection) => unknown;
    },
    sortBy: string | undefined | null,
    sortDir: string | undefined | null,
    columns: Record<string, string>,
    fallback: string
): void {
    const column = columns[sortBy ?? ""] ?? columns[fallback] ?? fallback;
    qb.orderBy(column, resolveSortDirection(sortDir));
}
