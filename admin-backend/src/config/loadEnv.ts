import fs from "fs";
import path from "path";
import { config } from "dotenv";

/** Load `.env` from admin-backend (works for src, dist, and monorepo cwd). */
export function loadAdminRepoEnv(): void {
    const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "admin-backend", ".env"),
        path.resolve(__dirname, "../../.env"),
        path.resolve(__dirname, "../../../.env"),
        // Legacy: old single root .env
        path.resolve(process.cwd(), "..", ".env"),
        path.resolve(__dirname, "../../../../.env"),
    ];

    for (const envPath of candidates) {
        if (fs.existsSync(envPath)) {
            config({ path: envPath });
            return;
        }
    }

    config();
}
