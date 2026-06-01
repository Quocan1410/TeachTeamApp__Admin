import { resolveAdminFromContext, GraphQLContext } from "./graphqlContext";

export function getUserIdFromContext(ctx: GraphQLContext): number | null {
    if (ctx.adminUser?.id) {
        return ctx.adminUser.id;
    }

    if (ctx.user?.id) {
        return ctx.user.id;
    }

    return null;
}

export async function getAdminUserIdFromContext(
    ctx: GraphQLContext
): Promise<number | null> {
    const admin = await resolveAdminFromContext(ctx);
    return admin?.id ?? null;
}
