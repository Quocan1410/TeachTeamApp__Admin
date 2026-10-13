/** Max connections this process may open. Hosted MySQL plans cap this. */
export function mysqlPoolSize(): number {
    const parsed = Number(process.env.DB_CONNECTION_LIMIT ?? 10);
    if (!Number.isFinite(parsed)) return 10;
    return Math.min(20, Math.max(1, Math.floor(parsed)));
}
