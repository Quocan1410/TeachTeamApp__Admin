import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    split,
    from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { clearAdminSession } from "@/lib/adminSession";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { adminEnv, resolveAdminGraphqlWsUrl } from "@/lib/env";

const httpUrl = adminEnv.graphqlHttp;
const wsUrl = resolveAdminGraphqlWsUrl();

const httpLink = createHttpLink({
    uri: httpUrl,
    credentials: "include",
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
    const unauthenticated = graphQLErrors?.some(
        (err) =>
            err.extensions?.code === "UNAUTHENTICATED" ||
            /authentication required/i.test(err.message)
    );
    if (unauthenticated || (networkError && "statusCode" in networkError && networkError.statusCode === 401)) {
        clearAdminSession();
        if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/"
        ) {
            window.location.href = "/";
        }
    }
});

const authLink = setContext((_, { headers }) => {
    // Get the authentication token from local storage if it exists
    const token =
        typeof window !== "undefined"
            ? sessionStorage.getItem("admin-token")
            : null;

    // Return the headers to the context so httpLink can read them
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        },
    };
});

// Create WebSocket client for subscriptions
const wsClient = createClient({
    url: wsUrl,
    lazy: true,
    keepAlive: 30000,
    retryAttempts: 5,
    retryWait: async (attempt) => {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
    },
    shouldRetry: (errOrCloseEvent) => {
        if (
            typeof errOrCloseEvent === "object" &&
            errOrCloseEvent &&
            "code" in errOrCloseEvent
        ) {
            const code = errOrCloseEvent.code as number;
            return code < 4000 || code >= 5000;
        }
        return true;
    },
    connectionParams: () => {
        if (typeof window === "undefined") {
            return {};
        }
        const token = sessionStorage.getItem("admin-token");
        return token ? { authorization: `Bearer ${token}` } : {};
    },
    on: {
        error: (error: unknown) => {
            // Silent error handling for production
        },
        closed: (event) => {
            // Silent connection handling for production
        },
    },
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(wsClient);

// Split link - use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
        );
    },
    wsLink,
    from([errorLink, authLink.concat(httpLink)])
);

const client = new ApolloClient({
    link: from([errorLink, splitLink]),
    cache: new InMemoryCache({
        typePolicies: {
            CourseEvent: {
                keyFields: false, // Don't cache individual events
            },
        },
    }),
    defaultOptions: {
        watchQuery: {
            errorPolicy: "all",
            notifyOnNetworkStatusChange: true,
        },
        query: {
            errorPolicy: "all",
        },
        mutate: {
            errorPolicy: "all",
        },
    },
    devtools: {
        enabled: process.env.NODE_ENV === "development",
    },
});

export default client;
