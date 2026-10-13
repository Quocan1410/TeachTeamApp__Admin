/**
 * Maps DB_SSL onto mysql2.
 * preferred = SslMode.Preferred: do not force TLS. This host rejects SSL
 * (HANDSHAKE_NO_SSL_SUPPORT) and accepts a plain connection.
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
