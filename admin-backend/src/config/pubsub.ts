import { PubSub } from "graphql-subscriptions";

// Create a singleton PubSub instance
export const pubsub = new PubSub();

// Subscription topics
export const SUBSCRIPTION_TOPICS = {
    CANDIDATE_BLOCKED: "CANDIDATE_BLOCKED",
    CANDIDATE_UNBLOCKED: "CANDIDATE_UNBLOCKED",
    USER_ACCOUNT_BLOCKED: "USER_ACCOUNT_BLOCKED",
    USER_ACCOUNT_DELETED: "USER_ACCOUNT_DELETED",
    COURSE_CREATED: "COURSE_CREATED",
    COURSE_UPDATED: "COURSE_UPDATED",
    COURSE_DELETED: "COURSE_DELETED",
} as const;

// Simplified async iterator implementation that uses PubSub's built-in asyncIterableIterator
export const createAsyncIterator = (
    topics: string | string[]
): AsyncIterableIterator<any> => {
    // Use the built-in asyncIterableIterator from PubSub which handles cleanup properly
    return pubsub.asyncIterableIterator(topics);
};
