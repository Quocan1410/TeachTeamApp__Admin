import {
    Resolver,
    Query,
    Mutation,
    Arg,
    Int,
    Ctx,
    ObjectType,
    Field,
    UseMiddleware,
} from "type-graphql";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import {
    Notification,
    NotificationListResponse,
} from "../types/Notification";
import { NotificationService } from "../services/NotificationService";
import { getUserIdFromContext } from "../utils/authContext";

@ObjectType()
class NotificationActionResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field({ nullable: true })
    unreadCount?: number;
}

@Resolver()
@UseMiddleware(AdminAuthMiddleware)
export class NotificationResolver {
    @Query(() => NotificationListResponse)
    async getMyNotifications(
        @Ctx() ctx: any,
        @Arg("limit", () => Int, { nullable: true }) limit?: number
    ): Promise<NotificationListResponse> {
        const userId = getUserIdFromContext(ctx);
        if (!userId) {
            return { notifications: [], unreadCount: 0 };
        }

        const notifications = await NotificationService.getForUser(
            userId,
            limit ?? 50
        );
        const unreadCount = await NotificationService.getUnreadCount(userId);

        return { notifications, unreadCount };
    }

    @Query(() => Int)
    async getUnreadNotificationCount(@Ctx() ctx: any): Promise<number> {
        const userId = getUserIdFromContext(ctx);
        if (!userId) return 0;
        return NotificationService.getUnreadCount(userId);
    }

    @Mutation(() => NotificationActionResponse)
    async markNotificationAsRead(
        @Arg("id", () => Int) id: number,
        @Ctx() ctx: any
    ): Promise<NotificationActionResponse> {
        const userId = getUserIdFromContext(ctx);
        if (!userId) {
            return { success: false, message: "Unauthorized" };
        }

        const updated = await NotificationService.markAsRead(id, userId);
        if (!updated) {
            return { success: false, message: "Notification not found" };
        }

        const unreadCount = await NotificationService.getUnreadCount(userId);
        return { success: true, unreadCount };
    }

    @Mutation(() => NotificationActionResponse)
    async markAllNotificationsAsRead(
        @Ctx() ctx: any
    ): Promise<NotificationActionResponse> {
        const userId = getUserIdFromContext(ctx);
        if (!userId) {
            return { success: false, message: "Unauthorized" };
        }

        await NotificationService.markAllAsRead(userId);
        return { success: true, unreadCount: 0 };
    }

    @Mutation(() => NotificationActionResponse)
    async deleteNotification(
        @Arg("id", () => Int) id: number,
        @Ctx() ctx: any
    ): Promise<NotificationActionResponse> {
        const userId = getUserIdFromContext(ctx);
        if (!userId) {
            return { success: false, message: "Unauthorized" };
        }

        const deleted = await NotificationService.deleteNotification(id, userId);
        if (!deleted) {
            return { success: false, message: "Notification not found" };
        }

        const unreadCount = await NotificationService.getUnreadCount(userId);
        return { success: true, unreadCount };
    }
}
