/**
 * Demo rows for the admin Playwright project.
 * The admin API creates the admin login before this script runs.
 * Ids are UUIDs (same shape as TeachTeamApp / shared production MySQL).
 */
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const requireFromBackend = createRequire(path.join(root, "admin-backend/package.json"));
const bcrypt = requireFromBackend("bcryptjs");
const mysql = requireFromBackend("mysql2/promise");

const passwordHash = bcrypt.hashSync("Password123!", 10);

const alexId = "11111111-1111-4111-8111-111111111111";
const janeId = "22222222-2222-4222-8222-222222222222";
const roleTutorId = "66666666-6666-4666-8666-666666666666";
const courseAcctId = "77777777-7777-4777-8777-777777777777";
const applicationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
const selectedId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "e2e",
  database: process.env.DB_NAME || "teachteamapp",
});

const [admins] = await connection.execute(
  "SELECT id FROM users WHERE userType = 'admin' LIMIT 1"
);
if (!admins.length) {
  throw new Error("Admin login was not created");
}
const adminId = admins[0].id;

await connection.execute(
  `INSERT INTO users
    (id, email, password, firstName, lastName, userType, honorific, isBlocked, createdAt, updatedAt)
   VALUES (?, 'alex.candidate@candidate.edu.au', ?, 'Alex', 'Nguyen', 'candidate', 'Mr.', 0, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE firstName = VALUES(firstName), lastName = VALUES(lastName)`,
  [alexId, passwordHash]
);

await connection.execute(
  `INSERT INTO users
    (id, email, password, firstName, lastName, userType, isBlocked, createdAt, updatedAt)
   VALUES (?, 'jane.morrison@lecturer.edu.au', ?, 'Jane', 'Morrison', 'lecturer', 0, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE firstName = VALUES(firstName)`,
  [janeId, passwordHash]
);

for (let index = 1; index <= 20; index += 1) {
  const label = String(index).padStart(2, "0");
  await connection.execute(
    `INSERT INTO users
      (id, email, password, firstName, lastName, userType, honorific, isBlocked, createdAt, updatedAt)
     VALUES (?, ?, ?, 'Page', ?, 'candidate', 'Ms.', 0, NOW(6), NOW(6))
     ON DUPLICATE KEY UPDATE firstName = VALUES(firstName)`,
    [
      randomUUID(),
      `e2e.page${label}@candidate.edu.au`,
      passwordHash,
      `User${label}`,
    ]
  );
}

await connection.execute(
  `INSERT INTO roles (id, roleName) VALUES (?, 'tutor')
   ON DUPLICATE KEY UPDATE roleName = VALUES(roleName)`,
  [roleTutorId]
);

await connection.execute(
  `INSERT INTO courses
    (id, courseCode, courseName, semester, maxTutors, maxLabAssistants, createdAt, updatedAt)
   VALUES (?, 'ACCT5001', 'Financial Accounting', 'Semester 2 2026', 5, 3, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE courseName = VALUES(courseName)`,
  [courseAcctId]
);

await connection.execute(
  `INSERT INTO applications
    (id, candidateId, courseId, roleId, status, isWithdrawn, appliedAt, updatedAt)
   VALUES (?, ?, ?, ?, 'selected', 0, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE status = VALUES(status)`,
  [applicationId, alexId, courseAcctId, roleTutorId]
);

await connection.execute(
  `INSERT INTO selected_candidates (id, applicationId, selectedById, selectedAt)
   VALUES (?, ?, ?, NOW(6))
   ON DUPLICATE KEY UPDATE selectedById = VALUES(selectedById)`,
  [selectedId, applicationId, adminId]
);

await connection.end();
console.log("Admin E2E seed ready");
