/** Admin session fields without augmenting express-session (ncc-safe). */
export type AdminSessionData = {
    userId?: string;
    userType?: string;
    destroy?: (callback?: (err?: Error) => void) => void;
};

type RequestWithSession = {
    session?: AdminSessionData;
};

export function getAdminSession(req: unknown): AdminSessionData | undefined {
    return (req as RequestWithSession).session;
}

export function getAdminSessionUserId(req: unknown): string | undefined {
    return getAdminSession(req)?.userId;
}
