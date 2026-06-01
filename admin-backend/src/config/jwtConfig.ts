import jwt from "jsonwebtoken";
import { UserType } from "../types/User";

export interface AppJwtPayload {
    userId: number;
    email: string;
    userType: UserType;
}

const isProduction = (): boolean => process.env.NODE_ENV === "production";

export const getAdminJwtSecret = (): string => {
    const secret =
        process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "";

    if (!secret && isProduction()) {
        throw new Error("ADMIN_JWT_SECRET must be set in production");
    }

    return secret || "dev-only-admin-jwt-secret-change-me";
};

export const getBackendJwtSecret = (): string => {
    const secret =
        process.env.BACKEND_JWT_SECRET || process.env.JWT_SECRET || "";

    if (!secret && isProduction()) {
        throw new Error("BACKEND_JWT_SECRET must be set in production");
    }

    return secret || "dev-only-backend-jwt-secret-change-me";
};

export const signAdminToken = (payload: AppJwtPayload): string => {
    return jwt.sign(payload, getAdminJwtSecret(), { expiresIn: "8h" });
};

export const verifyAdminToken = (token: string): AppJwtPayload | null => {
    try {
        return jwt.verify(token, getAdminJwtSecret()) as AppJwtPayload;
    } catch {
        return null;
    }
};

/** Accept main-app JWT for WebSocket subscriptions (lecturer/candidate). */
export const verifyBackendToken = (token: string): AppJwtPayload | null => {
    try {
        return jwt.verify(token, getBackendJwtSecret()) as AppJwtPayload;
    } catch {
        return null;
    }
};

export const verifyAnyAppToken = (token: string): AppJwtPayload | null => {
    return verifyAdminToken(token) || verifyBackendToken(token);
};

export const extractBearerToken = (
    authorization?: string | null
): string | null => {
    if (!authorization?.startsWith("Bearer ")) {
        return null;
    }
    return authorization.slice(7).trim() || null;
};
