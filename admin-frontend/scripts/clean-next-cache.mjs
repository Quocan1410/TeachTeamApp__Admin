import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), ".next");

try {
    rmSync(root, { recursive: true, force: true });
    console.log("Removed admin-frontend/.next cache");
} catch {
    // Ignore if folder does not exist
}
