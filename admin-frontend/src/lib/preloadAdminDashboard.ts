/**
 * Warm dashboard route chunks before navigation after login.
 */
export async function preloadAdminDashboard(): Promise<void> {
    await Promise.all([
        import("@/app/dashboard/page"),
        import("@/app/dashboard/layout"),
    ]);
}
