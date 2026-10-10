/**
 * Demo rows for the admin Playwright project.
 * The admin API creates the admin login before this script runs.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const requireFromBackend = createRequire(path.join(root, "admin-backend/package.json"));
const bcrypt = requireFromBackend("bcryptjs");
const mysql = requireFromBackend("mysql2/promise");

const passwordHash = bcrypt.hashSync("Password123!", 10);

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
    (email, password, firstName, lastName, userType, honorific, isBlocked, createdAt, updatedAt)
   VALUES ('alex.candidate@candidate.edu.au', ?, 'Alex', 'Nguyen', 'candidate', 'Mr.', 0, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE firstName = VALUES(firstName), lastName = VALUES(lastName)`,
  [passwordHash]
);

await connection.execute(
  `INSERT INTO users
    (email, password, firstName, lastName, userType, isBlocked, createdAt, updatedAt)
   VALUES ('jane.morrison@lecturer.edu.au', ?, 'Jane', 'Morrison', 'lecturer', 0, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE firstName = VALUES(firstName)`,
  [passwordHash]
);

for (let index = 1; index <= 20; index += 1) {
  const label = String(index).padStart(2, "0");
  await connection.execute(
    `INSERT INTO users
      (email, password, firstName, lastName, userType, honorific, isBlocked, createdAt, updatedAt)
     VALUES (?, ?, 'Page', ?, 'candidate', 'Ms.', 0, NOW(6), NOW(6))
     ON DUPLICATE KEY UPDATE firstName = VALUES(firstName)`,
    [`e2e.page${label}@candidate.edu.au`, passwordHash, `User${label}`]
  );
}

await connection.execute(
  `INSERT INTO roles (roleName) VALUES ('tutor')
   ON DUPLICATE KEY UPDATE roleName = VALUES(roleName)`
);

await connection.execute(
  `INSERT INTO courses
    (courseCode, courseName, semester, maxTutors, maxLabAssistants, createdAt, updatedAt)
   VALUES ('ACCT5001', 'Financial Accounting', 'Semester 2 2026', 5, 3, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE courseName = VALUES(courseName)`
);

const [[alexRow]] = await connection.execute(
  "SELECT id FROM users WHERE email = 'alex.candidate@candidate.edu.au' LIMIT 1"
);
const [[roleRow]] = await connection.execute(
  "SELECT id FROM roles WHERE roleName = 'tutor' LIMIT 1"
);
const [[courseRow]] = await connection.execute(
  "SELECT id FROM courses WHERE courseCode = 'ACCT5001' LIMIT 1"
);

await connection.execute(
  `INSERT INTO applications
    (candidateId, courseId, roleId, status, isWithdrawn, appliedAt, updatedAt)
   VALUES (?, ?, ?, 'selected', 0, NOW(6), NOW(6))
   ON DUPLICATE KEY UPDATE status = VALUES(status)`,
  [alexRow.id, courseRow.id, roleRow.id]
);

const [[applicationRow]] = await connection.execute(
  "SELECT id FROM applications WHERE candidateId = ? AND courseId = ? AND roleId = ? LIMIT 1",
  [alexRow.id, courseRow.id, roleRow.id]
);

await connection.execute(
  `INSERT INTO selected_candidates (applicationId, selectedById, selectedAt)
   VALUES (?, ?, NOW(6))
   ON DUPLICATE KEY UPDATE selectedById = VALUES(selectedById)`,
  [applicationRow.id, adminId]
);

await connection.end();
console.log("Admin E2E seed ready");
