export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function normalizePagination(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): { skip: number; take: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  return {
    skip: (safePage - 1) * safeSize,
    take: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}

export function paginatedResult<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number
) {
  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
