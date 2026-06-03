/**
 * Admin client env — proxied by Next.js rewrites in dev (Phase 5).
 */
export const adminEnv = {
  graphqlHttp:
    process.env.NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT?.trim() ||
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.trim() ||
    "/graphql",
  graphqlWs:
    process.env.NEXT_PUBLIC_ADMIN_WS_ENDPOINT?.trim() || "/graphql",
  apiEndpoint:
    process.env.NEXT_PUBLIC_API_ENDPOINT?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "/api",
  apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || "",
} as const;

export function resolveAdminGraphqlWsUrl(): string {
  const configured = adminEnv.graphqlWs;
  if (configured.startsWith("ws://") || configured.startsWith("wss://")) {
    return configured;
  }

  if (typeof window === "undefined") {
    return "ws://localhost:4002/graphql";
  }

  const path = configured.startsWith("/") ? configured : "/graphql";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

export const resolveUploadUrl = (path: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!adminEnv.apiOrigin) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  return `${adminEnv.apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};
