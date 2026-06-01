/** Canonical single system admin (shared with main backend validation). */
export const getAdminEmail = (): string =>
    (process.env.ADMIN_EMAIL || "admin@admin.com").trim().toLowerCase();

export const getAdminSeedPassword = (): string =>
    process.env.ADMIN_PASSWORD || "admin";

export const isCanonicalAdminEmail = (email: string): boolean =>
    email.trim().toLowerCase() === getAdminEmail();
