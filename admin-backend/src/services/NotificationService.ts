import { AppDataSource } from "../config/database";
import {
    Notification,
    NotificationType,
} from "../types/Notification";
import { User, UserType } from "../types/User";
import { CourseAssignment } from "../types/CourseAssignment";
import { pubsub, SUBSCRIPTION_TOPICS } from "../config/pubsub";

export interface CreateNotificationInput {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
}

export class NotificationService {
    private static getRepository() {
        if (!AppDataSource.isInitialized) {
            throw new Error("Database not initialized");
        }
        return AppDataSource.getRepository(Notification);
    }

    static async create(input: CreateNotificationInput): Promise<Notification> {
        const repo = this.getRepository();
        const notification = repo.create({
            ...input,
            read: false,
        });
        const saved = await repo.save(notification);

        await pubsub.publish(SUBSCRIPTION_TOPICS.ADMIN_NOTIFICATION_UPDATED, {
            adminNotificationUpdates: {
                userId: saved.userId,
                timestamp: saved.createdAt.toISOString(),
            },
        });

        return saved;
    }

    static async createForUsers(
        userIds: number[],
        input: Omit<CreateNotificationInput, "userId">
    ): Promise<void> {
        const uniqueIds = [...new Set(userIds.filter((id) => id > 0))];
        if (uniqueIds.length === 0) return;

        await Promise.all(
            uniqueIds.map((userId) =>
                this.create({
                    userId,
                    ...input,
                })
            )
        );
    }

    static async notifyAdmins(
        input: Omit<CreateNotificationInput, "userId">
    ): Promise<void> {
        const userRepo = AppDataSource.getRepository(User);
        const admins = await userRepo.find({
            where: { userType: UserType.ADMIN },
            select: ["id"],
        });
        await this.createForUsers(
            admins.map((a) => a.id),
            input
        );
    }

    static async notifyLecturers(
        lecturerIds: number[],
        input: Omit<CreateNotificationInput, "userId">
    ): Promise<void> {
        await this.createForUsers(lecturerIds, input);
    }

    static async getForUser(
        userId: number,
        limit = 50
    ): Promise<Notification[]> {
        return this.getRepository().find({
            where: { userId },
            order: { createdAt: "DESC" },
            take: limit,
        });
    }

    static async getUnreadCount(userId: number): Promise<number> {
        return this.getRepository().count({
            where: { userId, read: false },
        });
    }

    static async markAsRead(
        notificationId: number,
        userId: number
    ): Promise<boolean> {
        const result = await this.getRepository().update(
            { id: notificationId, userId },
            { read: true }
        );
        return (result.affected ?? 0) > 0;
    }

    static async markAllAsRead(userId: number): Promise<void> {
        await this.getRepository().update({ userId, read: false }, { read: true });
    }

    static async deleteNotification(
        notificationId: number,
        userId: number
    ): Promise<boolean> {
        const result = await this.getRepository().delete({
            id: notificationId,
            userId,
        });
        return (result.affected ?? 0) > 0;
    }
}
