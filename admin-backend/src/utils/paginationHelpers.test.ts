import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
  paginatedResult,
} from "./paginationHelpers";

describe("normalizePagination", () => {
  it("uses defaults", () => {
    expect(normalizePagination()).toEqual({
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it("caps page size and keeps page at least 1", () => {
    expect(normalizePagination(0, 500)).toEqual({
      skip: 0,
      take: MAX_PAGE_SIZE,
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
  });

  it("computes skip for later pages", () => {
    expect(normalizePagination(3, 10)).toEqual({
      skip: 20,
      take: 10,
      page: 3,
      pageSize: 10,
    });
  });
});

describe("paginatedResult", () => {
  it("returns total pages", () => {
    expect(paginatedResult(["a"], 25, 1, 10).totalPages).toBe(3);
    expect(paginatedResult([], 0, 1, 20).totalPages).toBe(1);
  });
});
