import {
    Resolver,
    Subscription,
    Root,
    ObjectType,
    Field,
    ID,
    Int,
    Mutation,
    Arg,
} from "type-graphql";
import {
    pubsub,
    SUBSCRIPTION_TOPICS,
    createAsyncIterator,
} from "../config/pubsub";
import { User, UserType } from "../types/User";
import { Course } from "../types/Course";
import {
    assertWsRole,
    assertWsSelf,
    WsAuthExtra,
} from "../utils/wsAuth";

@ObjectType()
export class CandidateBlockedEvent {
    @Field(() => ID)
    candidateId: number;

    @Field()
    candidateName: string;

    @Field()
    candidateEmail: string;

    @Field()
    isBlocked: boolean;

    @Field()
    timestamp: string;

    @Field(() => User)
    candidate: User;

    @Field(() => Int, { nullable: true })
    unselectedApplicationsCount?: number;

    @Field(() => Int, { nullable: true })
    unrankedApplicationsCount?: number;

    @Field(() => [Int], { nullable: true })
    affectedLecturerIds?: number[];
}

@ObjectType()
export class UserAccountEvent {
    @Field(() => ID)
    userId: number;

    @Field()
    userEmail: string;

    @Field()
    userName: string;

    @Field()
    userType: string;

    @Field()
    action: string; // "blocked" or "deleted"

    @Field()
    timestamp: string;

    @Field(() => User, { nullable: true })
    user?: User;
}

@ObjectType()
export class AdminNotificationEvent {
    @Field(() => Int)
    userId: number;

    @Field()
    timestamp: string;
}

@ObjectType()
export class CourseEvent {
    @Field(() => ID)
    courseId: number;

    @Field()
    action: string; // "created", "updated", or "deleted"

    @Field()
    timestamp: string;

    @Field(() => Course, { nullable: true })
    course?: Course;

    @Field({ nullable: true })
    message?: string;
}

@Resolver()
export class SubscriptionResolver {
    @Subscription(() => CandidateBlockedEvent, {
        description: "Subscribe to candidate blocking/unblocking events",
        subscribe: ({ context }) => {
            assertWsRole(context?.extra as WsAuthExtra, [
                UserType.LECTURER,
                UserType.ADMIN,
            ]);
            return createAsyncIterator([
                SUBSCRIPTION_TOPICS.CANDIDATE_BLOCKED,
                SUBSCRIPTION_TOPICS.CANDIDATE_UNBLOCKED,
            ]);
        },
    })
    candidateBlockingUpdates(@Root() payload: any): CandidateBlockedEvent {
        const eventData = payload?.candidateBlockingUpdates || payload;

        if (!eventData) {
            throw new Error("No subscription data available");
        }

        return eventData;
    }

    @Subscription(() => UserAccountEvent, {
        description:
            "Subscribe to user account status changes (blocking/deletion)",
        subscribe: ({ args, context }) => {
            assertWsSelf(context?.extra as WsAuthExtra, args.userId);
            const iterator = createAsyncIterator([
                SUBSCRIPTION_TOPICS.USER_ACCOUNT_BLOCKED,
                SUBSCRIPTION_TOPICS.USER_ACCOUNT_DELETED,
            ]) as AsyncIterable<any>;

            return (async function* filteredIterator() {
                for await (const payload of iterator) {
                    const eventData = payload?.userAccountUpdates || payload;
                    if (eventData && eventData.userId === args.userId) {
                        yield payload;
                    }
                }
            })();
        },
    })
    userAccountUpdates(
        @Root() payload: any,
        @Arg("userId", () => Int) _userId: number
    ): UserAccountEvent {
        const eventData = payload?.userAccountUpdates || payload;
        return eventData;
    }

    @Subscription(() => CourseEvent, {
        description: "Subscribe to course changes (create/update/delete)",
        subscribe: ({ context }) => {
            assertWsRole(context?.extra as WsAuthExtra, [UserType.ADMIN]);
            return createAsyncIterator([
                SUBSCRIPTION_TOPICS.COURSE_CREATED,
                SUBSCRIPTION_TOPICS.COURSE_UPDATED,
                SUBSCRIPTION_TOPICS.COURSE_DELETED,
            ]);
        },
    })
    courseUpdates(@Root() payload: any): CourseEvent {
        const eventData = payload?.courseUpdates || payload;

        if (!eventData) {
            throw new Error("No course subscription data available");
        }

        return eventData;
    }

    @Subscription(() => AdminNotificationEvent, {
        description: "Subscribe to in-app notification changes for the signed-in admin",
        subscribe: ({ context }) => {
            assertWsRole(context?.extra as WsAuthExtra, [UserType.ADMIN]);
            const adminId = (context?.extra as WsAuthExtra).userId;
            const iterator = createAsyncIterator([
                SUBSCRIPTION_TOPICS.ADMIN_NOTIFICATION_UPDATED,
            ]) as AsyncIterable<Record<string, AdminNotificationEvent>>;

            return (async function* filteredIterator() {
                for await (const payload of iterator) {
                    const eventData =
                        payload?.adminNotificationUpdates || payload;
                    if (eventData && eventData.userId === adminId) {
                        yield payload;
                    }
                }
            })();
        },
    })
    adminNotificationUpdates(@Root() payload: any): AdminNotificationEvent {
        const eventData = payload?.adminNotificationUpdates || payload;

        if (!eventData) {
            throw new Error("No notification subscription data available");
        }

        return eventData;
    }
}
