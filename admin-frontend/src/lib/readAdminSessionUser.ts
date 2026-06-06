import {
    ADMIN_TOKEN_KEY,
    getStoredAdminUser,
    isAdminUser,
    type StoredAdminUser,
} from "@/lib/adminSession";

/** Read admin session from sessionStorage (client only). */
export function readAdminSessionUser(): StoredAdminUser | null {
    if (typeof window === "undefined") return null;
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    const stored = getStoredAdminUser();
    if (!token || !stored || !isAdminUser(stored)) return null;
    return stored;
}
