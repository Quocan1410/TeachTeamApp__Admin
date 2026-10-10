import { toGraphQLUserType } from "./userType";

describe("toGraphQLUserType", () => {
  it("maps form values to GraphQL enum names", () => {
    expect(toGraphQLUserType("candidate")).toBe("CANDIDATE");
    expect(toGraphQLUserType("LECTURER")).toBe("LECTURER");
    expect(toGraphQLUserType(" admin ")).toBe("ADMIN");
    expect(toGraphQLUserType("something-else")).toBe("CANDIDATE");
  });
});
