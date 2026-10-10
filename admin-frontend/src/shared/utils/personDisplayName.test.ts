import {
  formatCandidateDisplayName,
  formatLecturerDisplayName,
  formatPersonDisplayName,
  getUserDisplayName,
  joinPersonName,
  splitDisplayName,
  formatApplicationApplicantDisplayName,
} from "./personDisplayName";

describe("personDisplayName", () => {
  it("joins names and formats honorifics", () => {
    expect(joinPersonName({ firstName: "Eden", lastName: "Coverage" })).toBe(
      "Eden Coverage"
    );
    expect(
      formatPersonDisplayName({
        firstName: "Jane",
        lastName: "Morrison",
        honorific: "Dr.",
      })
    ).toBe("Dr. Jane Morrison");
    expect(
      formatLecturerDisplayName({ firstName: "Jane", lastName: "Morrison" })
    ).toBe("Dr. Jane Morrison");
    expect(
      formatCandidateDisplayName({ firstName: "Eden", lastName: "Coverage" })
    ).toBe("Mr. Eden Coverage");
    expect(getUserDisplayName({ firstName: "Alex", lastName: "Nguyen" })).toBe(
      "Mr. Alex Nguyen"
    );
  });

  it("splits display names", () => {
    expect(splitDisplayName("Dr. Jane Morrison")).toEqual({
      leading: "Dr.",
      rest: "Jane Morrison",
    });
  });

  it("formats application applicants", () => {
    expect(
      formatApplicationApplicantDisplayName({
        candidate: { firstName: "Eden", lastName: "Coverage" },
      })
    ).toBe("Mr. Eden Coverage");
    expect(formatApplicationApplicantDisplayName({})).toBeNull();
  });
});
