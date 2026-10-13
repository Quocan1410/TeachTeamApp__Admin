/**
 * Maps DB_SSL onto mysql2 (same behaviour as TeachTeamApp user API).
 * preferred / disable = plain connection.
 * required = always open TLS.
 */
export function mysqlSslOption():
    | { rejectUnauthorized: boolean }
    | undefined {
    const mode = (process.env.DB_SSL || "disable").trim().toLowerCase();
    if (
        mode === "" ||
        mode === "disable" ||
        mode === "disabled" ||
        mode === "false" ||
        mode === "0" ||
        mode === "preferred"
    ) {
        return undefined;
    }

    return {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
    };
}
