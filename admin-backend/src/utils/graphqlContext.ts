import { AppDataSource } from "../config/database";
import { User, UserType } from "../types/User";
import {
    extractBearerToken,
    verifyAdminToken,
    verifyAnyAppToken,
} from "../config/jwtConfig";

export interface GraphQLContext {
    req: {
        headers: { authorization?: string };
        session?: { userId?: number };
    };
    res: unknown;
    user?: { id: number } | null;
    adminUser?: User | null;
}

export const resolveAdminFromContext = async (
    context: GraphQLContext
): Promise<User | null> => {
    if (context.adminUser) {
        return context.adminUser;
    }

    const userRepository = AppDataSource.getRepository(User);

    if (context.req?.session?.userId) {
        const sessionUser = await userRepository.findOne({
            where: { id: context.req.session.userId },
        });
        if (sessionUser?.userType === UserType.ADMIN && !sessionUser.isBlocked) {
            return sessionUser;
        }
    }

    const token = extractBearerToken(context.req?.headers?.authorization);
    if (!token) {
        return null;
    }

    const decoded = verifyAdminToken(token);
    if (!decoded || decoded.userType !== UserType.ADMIN) {
        return null;
    }

    const user = await userRepository.findOne({
        where: { id: decoded.userId },
    });

    if (!user || user.isBlocked) {
        return null;
    }

    return user;
};

export const resolveWsUser = async (
    connectionParams: Record<string, unknown> | undefined
): Promise<User | null> => {
    const rawAuth =
        (connectionParams?.authorization as string) ||
        (connectionParams?.Authorization as string) ||
        "";

    const token = extractBearerToken(rawAuth);
    if (!token) {
        return null;
    }

    const decoded = verifyAnyAppToken(token);
    if (!decoded) {
        return null;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
        where: { id: decoded.userId },
    });

    if (!user || user.isBlocked) {
        return null;
    }

    return user;
};
