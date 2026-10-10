/**
 * Hard-delete one admin-portal test account so the email can be created again.
 * Soft-deleted rows stay in users and the product refuses to reuse that email.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const email = process.argv[2];
if (email !== "e2e.admin@candidate.edu.au") {
  console.error("Refusing to delete an email outside the admin e2e test account");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
  if (!process.env.DB_HOST) {
    const requireFromBackend = createRequire(path.join(root, "admin-backend/package.json"));
    requireFromBackend("dotenv").config({ path: envPath });
  }
}

const requireFromBackend = createRequire(path.join(root, "admin-backend/package.json"));
const mysql = requireFromBackend("mysql2/promise");
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "teachteamapp",
});

const [rows] = await connection.execute(
  "SELECT id FROM users WHERE email = ? LIMIT 1",
  [email]
);
if (!rows.length) {
  console.log("No admin test user to delete");
  await connection.end();
  process.exit(0);
}

const userId = rows[0].id;
await connection.execute("DELETE FROM notifications WHERE userId = ?", [userId]);
await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
await connection.end();
console.log("Deleted admin test user");
