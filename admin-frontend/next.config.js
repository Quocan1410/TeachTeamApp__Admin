const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mainApiOrigin =
    process.env.MAIN_API_ORIGIN ||
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    "http://localhost:5000";
const adminGraphqlOrigin =
    process.env.ADMIN_GRAPHQL_ORIGIN || "http://localhost:4002";

/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${mainApiOrigin}/api/:path*`,
            },
            {
                source: "/graphql",
                destination: `${adminGraphqlOrigin}/graphql`,
            },
            {
                source: "/uploads/:path*",
                destination: `${mainApiOrigin}/uploads/:path*`,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "5000",
                pathname: "/uploads/**",
            },
        ],
    },
    env: {
        NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT:
            process.env.NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT,
        NEXT_PUBLIC_ADMIN_WS_ENDPOINT:
            process.env.NEXT_PUBLIC_ADMIN_WS_ENDPOINT,
        NEXT_PUBLIC_GRAPHQL_ENDPOINT: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
    },
};

module.exports = nextConfig;
