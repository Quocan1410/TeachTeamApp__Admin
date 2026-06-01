export const ADMIN_TOKEN_KEY = "admin-token";
export const ADMIN_USER_KEY = "admin-user";

export type StoredAdminUser = {
    id?: number;
    email: string;
    firstName?: string;
    lastName?: string;
    userType: string;
    fullName?: string;
};

export function getStoredAdminUser(): StoredAdminUser | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredAdminUser;
    } catch {
        return null;
    }
}

export function isAdminUser(user: StoredAdminUser | null | undefined): boolean {
    return user?.userType?.toLowerCase() === "admin";
}

export function clearAdminSession(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
}

export function getAdminAppOrigin(): string {
    return (
        process.env.NEXT_PUBLIC_ADMIN_APP_URL?.replace(/\/$/, "") ||
        "http://localhost:3001"
    );
}
