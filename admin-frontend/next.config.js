const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
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
