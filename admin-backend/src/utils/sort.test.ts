import { applyEntitySort, resolveSortDirection } from "./sort";

describe("resolveSortDirection", () => {
  it("defaults to DESC and accepts ASC", () => {
    expect(resolveSortDirection(undefined)).toBe("DESC");
    expect(resolveSortDirection("asc")).toBe("ASC");
    expect(resolveSortDirection("ASC")).toBe("ASC");
  });
});

describe("applyEntitySort", () => {
  it("orders by a known column", () => {
    const qb = { orderBy: jest.fn() };
    applyEntitySort(qb, "email", "asc", { email: "user.email" }, "createdAt");
    expect(qb.orderBy).toHaveBeenCalledWith("user.email", "ASC");
  });

  it("falls back when the sort key is unknown", () => {
    const qb = { orderBy: jest.fn() };
    applyEntitySort(
      qb,
      "unknown",
      "desc",
      { createdAt: "user.createdAt" },
      "createdAt"
    );
    expect(qb.orderBy).toHaveBeenCalledWith("user.createdAt", "DESC");
  });
});
