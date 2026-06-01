import {
    Resolver,
    Query,
    Mutation,
    Arg,
    Int,
    ObjectType,
    Field,
    Ctx,
    UseMiddleware,
} from "type-graphql";
import { AdminAuthMiddleware } from "../middleware/AdminAuthMiddleware";
import { User, UserType } from "../types/User";
import { AppDataSource } from "../config/database";
import { NotificationService } from "../services/NotificationService";
import { NotificationType } from "../types/Notification";
import { pubsub, SUBSCRIPTION_TOPICS } from "../config/pubsub";
import {
    CandidateBlockedEvent,
    UserAccountEvent,
} from "./SubscriptionResolver";
import { ApplicationService } from "../services/ApplicationService";

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
        ] = await Promise.all([
            userRepository.count(),
            userRepository.count({ where: { userType: UserType.CANDIDATE } }),
            userRepository.count({ where: { userType: UserType.LECTURER } }),
            userRepository.count({ where: { userType: UserType.ADMIN } }),
            userRepository.count({ where: { isBlocked: true } }),
        ]);

        return {
            totalUsers,
            totalCandidates,
            totalLecturers,
            totalAdmins,
            blockedUsers,
        };
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
        @Ctx() ctx: any
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

            // Prevent admin from blocking themselves
            if (ctx.user && ctx.user.id === id) {
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

            // If blocking a candidate, automatically unselect and unrank their applications
            let applicationResult = null;
            let affectedLecturerIds: number[] = [];

            if (user.userType === UserType.CANDIDATE) {
                // First find affected lecturers before unselecting applications
                affectedLecturerIds =
                    await ApplicationService.getAffectedLecturerIds(user.id);

                applicationResult =
                    await ApplicationService.unselectAndUnrankCandidateApplications(
                        user.id
                    );
            }

            // Publish subscription event if user is a candidate
            if (user.userType === UserType.CANDIDATE) {
                const event: CandidateBlockedEvent = {
                    candidateId: user.id,
                    candidateName: user.fullName,
                    candidateEmail: user.email,
                    isBlocked: true,
                    timestamp: new Date().toISOString(),
                    candidate: user,
                    unselectedApplicationsCount:
                        applicationResult?.unselectedCount || 0,
                    unrankedApplicationsCount:
                        applicationResult?.unrankedCount || 0,
                    affectedLecturerIds: affectedLecturerIds,
                };

                await pubsub.publish(SUBSCRIPTION_TOPICS.CANDIDATE_BLOCKED, {
                    candidateBlockingUpdates: event,
                });
            }

            // Publish user account event for the blocked user
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
                link: user.userType === UserType.CANDIDATE ? "/signin" : "/signin",
            });

            if (user.userType === UserType.CANDIDATE) {
                await NotificationService.notifyLecturers(
                    affectedLecturerIds,
                    {
                        type: NotificationType.CANDIDATE_BLOCKED,
                        title: "Candidate blocked",
                        message: `${user.fullName} has been blocked`,
                        link: "/lecturer",
                        metadata: {
                            candidateId: user.id,
                            unselectedApplicationsCount:
                                applicationResult?.unselectedCount || 0,
                            unrankedApplicationsCount:
                                applicationResult?.unrankedCount || 0,
                        },
                    }
                );
            }

            return {
                success: true,
                message: "User blocked successfully",
                user,
            };
        } catch (error) {
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
        @Ctx() ctx: any
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

            // Prevent admin from deleting themselves
            if (ctx.user && ctx.user.id === id) {
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

            // Publish user account event before deletion
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
        } catch (error) {
            return {
                success: false,
                message: "Failed to delete user",
            };
        }
    }
}
