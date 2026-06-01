import { MiddlewareFn } from "type-graphql";
import { GraphQLError } from "graphql";
import { UserType } from "../types/User";
import {
    GraphQLContext,
    resolveAdminFromContext,
} from "../utils/graphqlContext";

export const AdminAuthMiddleware: MiddlewareFn<GraphQLContext> = async (
    { context },
    next
) => {
    const adminUser = await resolveAdminFromContext(context);

    if (!adminUser || adminUser.userType !== UserType.ADMIN) {
        throw new GraphQLError("Admin authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
        });
    }

    context.adminUser = adminUser;
    return next();
};
