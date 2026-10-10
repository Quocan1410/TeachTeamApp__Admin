import { parseApiDateTime } from "./parseApiDateTime";

describe("parseApiDateTime", () => {
  it("returns Date instances unchanged", () => {
    const now = new Date("2026-01-02T03:04:05.000Z");
    expect(parseApiDateTime(now)).toBe(now);
  });

  it("treats naive strings as UTC", () => {
    expect(parseApiDateTime("2026-01-02 03:04:05").toISOString()).toBe(
      "2026-01-02T03:04:05.000Z"
    );
  });
});
