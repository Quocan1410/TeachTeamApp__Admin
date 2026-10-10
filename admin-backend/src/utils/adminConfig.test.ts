import {
  getAdminEmail,
  getAdminSeedPassword,
  isCanonicalAdminEmail,
} from "./adminConfig";

describe("adminConfig", () => {
  const originalEmail = process.env.ADMIN_EMAIL;
  const originalPassword = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEmail;
    process.env.ADMIN_PASSWORD = originalPassword;
  });

  it("uses defaults when env is unset", () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    expect(getAdminEmail()).toBe("admin@admin.com");
    expect(getAdminSeedPassword()).toBe("admin");
  });

  it("reads env overrides and matches the canonical email", () => {
    process.env.ADMIN_EMAIL = " Admin@Example.com ";
    process.env.ADMIN_PASSWORD = "secret";
    expect(getAdminEmail()).toBe("admin@example.com");
    expect(getAdminSeedPassword()).toBe("secret");
    expect(isCanonicalAdminEmail("admin@example.com")).toBe(true);
    expect(isCanonicalAdminEmail("other@example.com")).toBe(false);
  });
});
