# TeachTeamApp-Admin

Admin dashboard for the TeachTeam hiring system. It manages users, courses, lecturer assignments, and hiring selections.

The candidate and lecturer app is a separate repository: [TeachTeamApp](https://github.com/Quocan1410/TeachTeamApp).

| | |
|---|---|
| Admin app | http://localhost:3001 |
| GraphQL API | http://localhost:4002/graphql |
| Health | http://localhost:4002/health |

The frontend is Next.js. The API is Express, Apollo Server, and TypeORM. Browser calls go through Next rewrites: `/graphql` to this API, and `/api` to the user API when that API is running.

## Run

Node.js 20+ and MySQL 8.

```bash
cp env.example .env
npm run install:all
npm run dev:windows
```

On macOS or Linux, use `npm run dev:unix`.

One service at a time:

```bash
cd admin-backend && npm run dev
cd admin-frontend && npm run dev
```

The API reads the repository-root `.env`. On startup it ensures the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` exists. The default in `env.example` is `admin@admin.com` / `admin`.

## Database

Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` in `.env`. This API does not run the user app’s migrations.

Its tables use auto-increment integer ids: users, courses, roles, applications, notifications, course assignments, and selected candidates. Leave `DB_SYNC` unset for a database that already has that shape. Set `DB_SYNC=true` only on an empty database you are willing to let TypeORM create. Do not point `DB_SYNC=true` at the user app’s UUID database.

`ADMIN_JWT_SECRET` should match `ADMIN_JWT_SECRET` in the user API when admin actions call that API.

## Pages

| Route | What it does |
|-------|----------------|
| `/` | Admin sign-in |
| `/dashboard` | Totals and a course preview |
| `/dashboard/users` | Search, create, edit, block, and delete users |
| `/dashboard/courses` | Create, edit, and delete courses, and assign lecturers |
| `/dashboard/reports` | Selection overview and selected candidates by course |

User search matches email, first name, last name, and the full name together. A new candidate must use `@candidate.edu.au`. A new lecturer must use `@lecturer.edu.au`. A deleted email cannot be reused.

## Demo sign-in

| Role | URL | Email | Password |
|------|-----|-------|----------|
| Admin | http://localhost:3001 | `admin@admin.com` | `admin` |

Lecturer and candidate passwords for the user app are listed in that repository’s README. Those rows appear here only when this `.env` points at the same database.

## Tests

### Unit tests (Jest)

```bash
cd admin-backend && npm test
cd admin-frontend && npm test
```

Coverage for the pagination/sort helpers and GraphQL user-type mapping:

```bash
cd admin-backend && npm run test:coverage
cd admin-frontend && npm run test:coverage
```

Those reports cover the listed modules, not every GraphQL resolver or dashboard page. CI fails if that scoped coverage drops below 80% lines.

### End-to-end (Playwright)

With the admin app on port 3001 and this API on port 4002:

```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

GitHub Actions runs unit coverage, typecheck/build, then Playwright on a fresh MySQL database.
