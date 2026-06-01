import fs from "fs";
import path from "path";
import { config } from "dotenv";

/** Load `.env` from admin repo root (works for src and dist). */
export function loadAdminRepoEnv(): void {
    const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "..", ".env"),
        path.resolve(__dirname, "../../../.env"),
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
