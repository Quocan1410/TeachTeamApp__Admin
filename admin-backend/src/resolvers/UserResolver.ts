import {
    Resolver,
    Query,
    Mutation,
    Arg,
    Int,
    ObjectType,
    Field,
    InputType,
    Ctx,
    UseMiddleware,
} from "type-graphql";
import {
    IsEmail,
    IsEnum,
    IsOptional,
    MaxLength,
    MinLength,
} from "class-validator";
import { Brackets } from "typeorm";
import {
    normalizePagination,
    paginatedResult,
} from "../utils/pagination";
import { applyEntitySort } from "../utils/sort";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { User, UserType } from "../types/User";
import { AppDataSource } from "../config/database";
import { NotificationService } from "../services/NotificationService";
import { NotificationType } from "../types/Notification";
import { Course } from "../types/Course";
import { Announcement } from "../types/Announcement";
import { pubsub, SUBSCRIPTION_TOPICS } from "../config/pubsub";
import {
    CandidateBlockedEvent,
    UserAccountEvent,
} from "./SubscriptionResolver";
import { ApplicationService } from "../services/ApplicationService";
import { UserService } from "../services/UserService";
import type { CandidateApplicationCleanupResult } from "../services/ApplicationService";
import type { GraphQLContext } from "../utils/graphqlContext";

@ObjectType()
class UserStats {
    @Field(() => Int)
    totalUsers: number;

    @Field(() => Int)
    totalCandidates: number;

    @Field(() => Int)
    totalLecturers: number;

    @Field(() => Int)
    totalAdmins: number;

    @Field(() => Int)
    blockedUsers: number;

    @Field(() => Int)
    totalCourses: number;

    @Field(() => Int)
    totalAnnouncements: number;
}

@InputType()
class UserListInput {
    @Field(() => Int, { defaultValue: 1 })
    page: number;

    @Field(() => Int, { defaultValue: 20 })
    pageSize: number;

    @Field({ nullable: true })
    search?: string;

    /** all | active | blocked | candidate | lecturer | admin */
    @Field({ nullable: true, defaultValue: "all" })
    filter?: string;

    @Field({ nullable: true })
    sortBy?: string;

    @Field({ nullable: true })
    sortDir?: string;
}

@InputType()
class CreateUserInput {
    @Field()
    @IsEmail()
    email: string;

    @Field()
    @MinLength(8)
    @MaxLength(128)
    password: string;

    @Field()
    @MinLength(1)
    @MaxLength(100)
    firstName: string;

    @Field()
    @MinLength(1)
    @MaxLength(100)
    lastName: string;

    @Field(() => UserType)
    @IsEnum(UserType)
    userType: UserType;

    @Field({ nullable: true })
    @IsOptional()
    @MaxLength(10)
    honorific?: string;
}

@InputType()
class UpdateUserInput {
    @Field({ nullable: true })
    @IsOptional()
    @MinLength(1)
    @MaxLength(100)
    firstName?: string;

    @Field({ nullable: true })
    @IsOptional()
    @MinLength(1)
    @MaxLength(100)
    lastName?: string;

    @Field(() => UserType, { nullable: true })
    @IsOptional()
    @IsEnum(UserType)
    userType?: UserType;
}

@ObjectType()
class UserPage {
    @Field(() => [User])
    items: User[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;

    @Field(() => Int)
    totalPages: number;
}

@ObjectType()
class UserResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    message?: string;

    @Field(() => User, { nullable: true })
    user?: User;
}

async function publishCandidateBlockingUpdate(
    user: User,
    affectedLecturerIds: number[],
    cleanup: CandidateApplicationCleanupResult,
    isBlocked: boolean
): Promise<void> {
    const event: CandidateBlockedEvent = {
        candidateId: user.id,
        candidateName: user.fullName,
        candidateEmail: user.email,
        isBlocked,
        timestamp: new Date().toISOString(),
        candidate: user,
        unselectedApplicationsCount: cleanup.unselectedCount,
        unrankedApplicationsCount: cleanup.unrankedCount,
        affectedLecturerIds,
    };

    await pubsub.publish(
        isBlocked
            ? SUBSCRIPTION_TOPICS.CANDIDATE_BLOCKED
            : SUBSCRIPTION_TOPICS.CANDIDATE_UNBLOCKED,
        { candidateBlockingUpdates: event }
    );
}

async function notifyLecturersAboutCandidateChange(
    user: User,
    affectedLecturerIds: number[],
    cleanup: CandidateApplicationCleanupResult,
    action: "blocked" | "deleted"
): Promise<void> {
    if (affectedLecturerIds.length === 0) {
        return;
    }

    const title =
        action === "deleted" ? "Candidate removed" : "Candidate blocked";
    const message =
        action === "deleted"
            ? `${user.fullName} was deleted from the system`
            : `${user.fullName} has been blocked`;

    await NotificationService.notifyLecturers(affectedLecturerIds, {
        type: NotificationType.CANDIDATE_BLOCKED,
        title,
        message,
        link: "/lecturer",
        metadata: {
            candidateId: user.id,
            action,
            unselectedApplicationsCount: cleanup.unselectedCount,
            unrankedApplicationsCount: cleanup.unrankedCount,
            selectionsClearedCount: cleanup.selectionsClearedCount,
        },
    });
}

@Resolver()
@UseMiddleware(AdminAuthMiddleware)
export class UserResolver {
    @Query(() => [User])
    async getAllUsers(): Promise<User[]> {
        const userRepository = AppDataSource.getRepository(User);
        return await userRepository.find({
            order: { createdAt: "DESC" },
        });
    }

    @Query(() => UserPage)
    async getUsers(@Arg("input") input: UserListInput): Promise<UserPage> {
        const userRepository = AppDataSource.getRepository(User);
        const { skip, take, page, pageSize } = normalizePagination(
            input.page,
            input.pageSize
        );
        const filter = (input.filter ?? "all").toLowerCase();
        const search = input.search?.trim();

        const qb = userRepository.createQueryBuilder("user");

        if (!input.sortBy) {
            qb.orderBy(
                "CASE WHEN user.userType = 'admin' THEN 0 ELSE 1 END",
                "ASC"
            ).addOrderBy("user.id", "ASC");
        } else {
            applyEntitySort(
                qb,
                input.sortBy,
                input.sortDir,
                {
                    email: "user.email",
                    firstName: "user.firstName",
                    lastName: "user.lastName",
                    userType: "user.userType",
                    isBlocked: "user.isBlocked",
                    createdAt: "user.createdAt",
                },
                "createdAt"
            );
        }

        if (filter === "active") {
            qb.andWhere("user.isBlocked = :blocked", { blocked: false });
        } else if (filter === "blocked") {
            qb.andWhere("user.isBlocked = :blocked", { blocked: true });
        } else if (
            filter === UserType.CANDIDATE ||
            filter === UserType.LECTURER ||
            filter === UserType.ADMIN
        ) {
            qb.andWhere("user.userType = :userType", { userType: filter });
        }

        if (search) {
            const term = `%${search}%`;
            qb.andWhere(
                new Brackets((sub) => {
                    sub.where("user.email LIKE :term", { term })
                        .orWhere("user.firstName LIKE :term", { term })
                        .orWhere("user.lastName LIKE :term", { term });
                })
            );
        }

        const [items, totalCount] = await qb
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return paginatedResult(items, totalCount, page, pageSize);
    }

    @Query(() => [User])
    async getUsersByType(@Arg("userType") userType: UserType): Promise<User[]> {
        const userRepository = AppDataSource.getRepository(User);
        return await userRepository.find({
            where: { userType },
            order: { createdAt: "DESC" },
        });
    }

    @Query(() => UserStats)
    async getUserStats(): Promise<UserStats> {
        const userRepository = AppDataSource.getRepository(User);

        const [
            totalUsers,
            totalCandidates,
            totalLecturers,
            totalAdmins,
            blockedUsers,
            totalCourses,
            totalAnnouncements,
        ] = await Promise.all([
            userRepository.count(),
            userRepository.count({ where: { userType: UserType.CANDIDATE } }),
            userRepository.count({ where: { userType: UserType.LECTURER } }),
            userRepository.count({ where: { userType: UserType.ADMIN } }),
            userRepository.count({ where: { isBlocked: true } }),
            AppDataSource.getRepository(Course).count(),
            AppDataSource.getRepository(Announcement).count(),
        ]);

        return {
            totalUsers,
            totalCandidates,
            totalLecturers,
            totalAdmins,
            blockedUsers,
            totalCourses,
            totalAnnouncements,
        };
    }

    @Mutation(() => UserResponse)
    async createUser(
        @Arg("input") input: CreateUserInput
    ): Promise<UserResponse> {
        try {
            const result = await UserService.createUser(input);
            return {
                success: result.success,
                message: result.message,
                user: result.user,
            };
        } catch {
            return { success: false, message: "Failed to create user" };
        }
    }

    @Mutation(() => UserResponse)
    async updateUser(
        @Arg("id", () => Int) id: number,
        @Arg("input") input: UpdateUserInput,
        @Ctx() ctx: GraphQLContext
    ): Promise<UserResponse> {
        try {
            const result = await UserService.updateUser(
                id,
                input,
                ctx.adminUser?.id
            );
            return {
                success: result.success,
                message: result.message,
                user: result.user,
            };
        } catch {
            return { success: false, message: "Failed to update user" };
        }
    }

    @Query(() => User, { nullable: true })
    async getUserById(@Arg("id", () => Int) id: number): Promise<User | null> {
        const userRepository = AppDataSource.getRepository(User);
        return await userRepository.findOne({
            where: { id },
            relations: [
                "courseAssignments",
                "applications",
                "candidateSelections",
            ],
        });
    }

    @Mutation(() => UserResponse)
    async blockUser(
        @Arg("id", () => Int) id: number,
        @Ctx() ctx: GraphQLContext
    ): Promise<UserResponse> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id } });

            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }

            if (ctx.adminUser && ctx.adminUser.id === id) {
                return {
                    success: false,
                    message: "You cannot block yourself",
                };
            }

            if (user.userType === UserType.ADMIN) {
                return {
                    success: false,
                    message: "Cannot block admin users",
                };
            }

            user.isBlocked = true;
            await userRepository.save(user);

            if (user.userType === UserType.CANDIDATE) {
                const affectedLecturerIds =
                    await ApplicationService.getAffectedLecturerIds(user.id);
                const cleanup =
                    await ApplicationService.cleanupCandidateApplications(
                        user.id
                    );

                if (!cleanup.success) {
                    return {
                        success: false,
                        message: cleanup.message,
                    };
                }

                await publishCandidateBlockingUpdate(
                    user,
                    affectedLecturerIds,
                    cleanup,
                    true
                );

                await notifyLecturersAboutCandidateChange(
                    user,
                    affectedLecturerIds,
                    cleanup,
                    "blocked"
                );
            }

            const userAccountEvent: UserAccountEvent = {
                userId: user.id,
                userEmail: user.email,
                userName: user.fullName,
                userType: user.userType,
                action: "blocked",
                timestamp: new Date().toISOString(),
                user: user,
            };

            await pubsub.publish(SUBSCRIPTION_TOPICS.USER_ACCOUNT_BLOCKED, {
                userAccountUpdates: userAccountEvent,
            });

            await NotificationService.create({
                userId: user.id,
                type: NotificationType.ACCOUNT_BLOCKED,
                title: "Account blocked",
                message:
                    "Your account has been blocked by an administrator. Contact support for assistance.",
                link: "/signin",
            });

            return {
                success: true,
                message: "User blocked successfully",
                user,
            };
        } catch {
            return {
                success: false,
                message: "Failed to block user",
            };
        }
    }

    @Mutation(() => UserResponse)
    async unblockUser(@Arg("id", () => Int) id: number): Promise<UserResponse> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id } });

            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }

            user.isBlocked = false;
            await userRepository.save(user);

            // Publish subscription event if user is a candidate
            if (user.userType === UserType.CANDIDATE) {
                // Find affected lecturers who have this candidate's applications
                const affectedLecturerIds =
                    await ApplicationService.getAffectedLecturerIds(user.id);

                const event: CandidateBlockedEvent = {
                    candidateId: user.id,
                    candidateName: user.fullName,
                    candidateEmail: user.email,
                    isBlocked: false,
                    timestamp: new Date().toISOString(),
                    candidate: user,
                    affectedLecturerIds: affectedLecturerIds,
                };

                await pubsub.publish(SUBSCRIPTION_TOPICS.CANDIDATE_UNBLOCKED, {
                    candidateBlockingUpdates: event,
                });

                await NotificationService.notifyLecturers(
                    affectedLecturerIds,
                    {
                        type: NotificationType.CANDIDATE_UNBLOCKED,
                        title: "Candidate unblocked",
                        message: `${user.fullName} has been unblocked`,
                        link: "/lecturer",
                        metadata: { candidateId: user.id },
                    }
                );
            }

            await NotificationService.create({
                userId: user.id,
                type: NotificationType.ACCOUNT_UNBLOCKED,
                title: "Account unblocked",
                message: "Your account access has been restored.",
                link:
                    user.userType === UserType.CANDIDATE ? "/tutor" : "/lecturer",
            });

            return {
                success: true,
                message: "User unblocked successfully",
                user,
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to unblock user",
            };
        }
    }

    @Mutation(() => UserResponse)
    async deleteUser(
        @Arg("id", () => Int) id: number,
        @Ctx() ctx: GraphQLContext
    ): Promise<UserResponse> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id } });

            if (!user) {
                return {
                    success: false,
                    message: "User not found",
                };
            }

            if (ctx.adminUser && ctx.adminUser.id === id) {
                return {
                    success: false,
                    message: "You cannot delete yourself",
                };
            }

            if (user.userType === UserType.ADMIN) {
                return {
                    success: false,
                    message: "Cannot delete admin users",
                };
            }

            if (user.userType === UserType.CANDIDATE) {
                const affectedLecturerIds =
                    await ApplicationService.getAffectedLecturerIds(user.id);
                const cleanup =
                    await ApplicationService.cleanupCandidateApplications(
                        user.id
                    );

                if (!cleanup.success) {
                    return {
                        success: false,
                        message: cleanup.message,
                    };
                }

                await publishCandidateBlockingUpdate(
                    user,
                    affectedLecturerIds,
                    cleanup,
                    true
                );

                await notifyLecturersAboutCandidateChange(
                    user,
                    affectedLecturerIds,
                    cleanup,
                    "deleted"
                );
            }

            const userAccountEvent: UserAccountEvent = {
                userId: user.id,
                userEmail: user.email,
                userName: user.fullName,
                userType: user.userType,
                action: "deleted",
                timestamp: new Date().toISOString(),
                user: user,
            };

            await pubsub.publish(SUBSCRIPTION_TOPICS.USER_ACCOUNT_DELETED, {
                userAccountUpdates: userAccountEvent,
            });

            await userRepository.remove(user);

            return {
                success: true,
                message: "User deleted successfully",
            };
        } catch {
            return {
                success: false,
                message: "Failed to delete user",
            };
        }
    }
}
