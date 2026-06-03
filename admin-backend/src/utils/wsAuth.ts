import { UserType } from "../types/User";

export interface WsAuthExtra {
    userId?: number;
    userType?: UserType;
}

export const assertWsRole = (
    extra: WsAuthExtra | undefined,
    allowed: UserType[]
): void => {
    if (!extra?.userType || !allowed.includes(extra.userType)) {
        throw new Error("Forbidden subscription");
    }
};

export const assertWsSelf = (
    extra: WsAuthExtra | undefined,
    userId: number
): void => {
    if (!extra?.userId || extra.userId !== userId) {
        throw new Error("Forbidden subscription");
    }
};
