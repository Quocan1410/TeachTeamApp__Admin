import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { preloadAdminDashboard } from "@/lib/preloadAdminDashboard";

export const DASHBOARD_PATH = "/dashboard";
export const DASHBOARD_PRELOAD_TIMEOUT_MS = 12000;

/** Prefetch dashboard route + warm chunks before navigation (best-effort). */
export async function prepareAdminDashboardNavigation(
    router: AppRouterInstance,
    timeoutMs = DASHBOARD_PRELOAD_TIMEOUT_MS
): Promise<void> {
    const timeout = new Promise<void>((resolve) => {
        setTimeout(resolve, timeoutMs);
    });

    try {
        await Promise.race([
            Promise.all([
                router.prefetch(DASHBOARD_PATH),
                preloadAdminDashboard(),
            ]),
            timeout,
        ]);
    } catch {
        // Preload is best-effort only.
    }
}
