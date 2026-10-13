import session from "express-session";
import { AppDataSource } from "./database";

const TABLE = "admin_sessions";

/**
 * Persist admin Express sessions in the shared MySQL database so production
 * does not rely on the default in-memory MemoryStore.
 */
export async function createMysqlSessionStore(): Promise<session.Store> {
    await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
            session_id VARCHAR(128) NOT NULL PRIMARY KEY,
            expires DATETIME NOT NULL,
            data MEDIUMTEXT NOT NULL,
            INDEX idx_admin_sessions_expires (expires)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    class MysqlSessionStore extends session.Store {
        get(
            sid: string,
            callback: (
                err: unknown,
                sessionData?: session.SessionData | null
            ) => void
        ): void {
            AppDataSource.query(
                `SELECT data, expires FROM \`${TABLE}\` WHERE session_id = ? LIMIT 1`,
                [sid]
            )
                .then((rows: Array<{ data: string; expires: Date | string }>) => {
                    if (!rows?.length) {
                        callback(null, null);
                        return;
                    }
                    const row = rows[0];
                    if (new Date(row.expires).getTime() <= Date.now()) {
                        this.destroy(sid, () => callback(null, null));
                        return;
                    }
                    callback(null, JSON.parse(row.data) as session.SessionData);
                })
                .catch((err) => callback(err));
        }

        set(
            sid: string,
            sessionData: session.SessionData,
            callback?: (err?: unknown) => void
        ): void {
            const maxAge = sessionData.cookie?.maxAge ?? 8 * 60 * 60 * 1000;
            const expires = new Date(Date.now() + maxAge);
            const data = JSON.stringify(sessionData);
            AppDataSource.query(
                `INSERT INTO \`${TABLE}\` (session_id, expires, data)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
                [sid, expires, data]
            )
                .then(() => callback?.())
                .catch((err) => callback?.(err));
        }

        destroy(sid: string, callback?: (err?: unknown) => void): void {
            AppDataSource.query(
                `DELETE FROM \`${TABLE}\` WHERE session_id = ?`,
                [sid]
            )
                .then(() => callback?.())
                .catch((err) => callback?.(err));
        }

        touch(
            sid: string,
            sessionData: session.SessionData,
            callback?: (err?: unknown) => void
        ): void {
            const maxAge = sessionData.cookie?.maxAge ?? 8 * 60 * 60 * 1000;
            const expires = new Date(Date.now() + maxAge);
            AppDataSource.query(
                `UPDATE \`${TABLE}\` SET expires = ? WHERE session_id = ?`,
                [expires, sid]
            )
                .then(() => callback?.())
                .catch((err) => callback?.(err));
        }
    }

    return new MysqlSessionStore();
}
