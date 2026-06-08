import "reflect-metadata";
import express from "express";
import { createServer } from "http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { buildSchema } from "type-graphql";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import { loadAdminRepoEnv } from "./config/loadEnv";
import { initializeDatabase } from "./config/database";
import { AuthResolver } from "./resolvers/AuthResolver";
import { UserResolver } from "./resolvers/UserResolver";
import { CourseResolver } from "./resolvers/CourseResolver";
import { ReportResolver } from "./resolvers/ReportResolver";
import { SubscriptionResolver } from "./resolvers/SubscriptionResolver";
import { NotificationResolver } from "./resolvers/NotificationResolver";
import { AnnouncementResolver } from "./resolvers/AnnouncementResolver";
import { resolveAdminFromContext, resolveWsUser } from "./utils/graphqlContext";
import "./types/session";
loadAdminRepoEnv();

const parseAllowedOrigins = (): string[] => {
    const fromEnv = process.env.ALLOWED_ORIGINS;
    if (fromEnv) {
        return fromEnv.split(",").map((o) => o.trim()).filter(Boolean);
    }
    return [
        process.env.ADMIN_FRONTEND_URL || "http://localhost:3001",
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:3001",
    ];
};

async function startServer() {
    try {
        await initializeDatabase();

        const app = express();
        const isProduction = process.env.NODE_ENV === "production";

        const sessionSecret =
            process.env.ADMIN_SESSION_SECRET ||
            process.env.SESSION_SECRET ||
            (isProduction ? "" : "dev-only-admin-session-secret");

        if (!sessionSecret && isProduction) {
            throw new Error("ADMIN_SESSION_SECRET must be set in production");
        }

        app.use(helmet({ contentSecurityPolicy: false }));
        app.use(
            session({
                secret: sessionSecret,
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: isProduction,
                    httpOnly: true,
                    maxAge: 8 * 60 * 60 * 1000,
                },
            })
        );

        const schema = await buildSchema({
            resolvers: [
                AuthResolver,
                UserResolver,
                CourseResolver,
                ReportResolver,
                SubscriptionResolver,
                NotificationResolver,
                AnnouncementResolver,
            ],
            validate: true,
            pubSub: require("./config/pubsub").pubsub,
        });

        const httpServer = createServer(app);

        const wsServer = new WebSocketServer({
            server: httpServer,
            path: "/graphql",
        });

        const serverCleanup = useServer(
            {
                schema,
                onConnect: async (ctx) => {
                    const user = await resolveWsUser(
                        ctx.connectionParams as
                            | Record<string, unknown>
                            | undefined
                    );
                    if (!user) {
                        return false;
                    }
                    (ctx.extra as { userId?: number; userType?: string }).userId =
                        user.id;
                    (ctx.extra as { userId?: number; userType?: string }).userType =
                        user.userType;
                    return true;
                },
                context: (ctx) => ({
                    extra: ctx.extra as { userId?: number; userType?: string },
                }),
            },
            wsServer
        );

        const server = new ApolloServer({
            schema,
            introspection: !isProduction,
            plugins: [
                ApolloServerPluginDrainHttpServer({ httpServer }),
                {
                    async serverWillStart() {
                        return {
                            async drainServer() {
                                await serverCleanup.dispose();
                            },
                        };
                    },
                },
            ],
        });

        await server.start();

        app.use(
            "/graphql",
            cors<cors.CorsRequest>({
                origin: (origin, callback) => {
                    if (!origin) {
                        callback(null, true);
                        return;
                    }
                    const allowed = parseAllowedOrigins();
                    callback(
                        null,
                        allowed.includes(origin)
                    );
                },
                credentials: true,
            }),
            express.json({ limit: "1mb" }),
            expressMiddleware(server, {
                context: async ({ req, res }) => {
                    const adminUser = await resolveAdminFromContext({
                        req,
                        res,
                    });
                    return {
                        req,
                        res,
                        user: adminUser
                            ? { id: adminUser.id }
                            : req.session?.userId
                              ? { id: req.session.userId }
                              : null,
                        adminUser,
                    };
                },
            })
        );

        app.get("/health", (_req, res) => {
            res.json({
                status: "OK",
                service: "Admin GraphQL Backend",
                timestamp: new Date().toISOString(),
            });
        });

        const PORT = process.env.ADMIN_BACKEND_PORT || process.env.PORT || 4002;
        httpServer.listen(PORT);
    } catch (error) {
        process.exit(1);
    }
}

startServer();
