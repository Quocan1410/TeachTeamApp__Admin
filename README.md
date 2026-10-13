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
cp admin-backend/env.example admin-backend/.env
cp admin-frontend/env.example admin-frontend/.env
npm run install:all
npm run dev:windows
```

On macOS or Linux, use `npm run dev:unix`.

One service at a time:

```bash
cd admin-backend && npm run dev
cd admin-frontend && npm run dev
```

Each package has its own `.env` (same pattern as TeachTeamApp). The API reads `admin-backend/.env` and seeds the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults in `admin-backend/env.example`: `admin@admin.com` / `admin`).

## Database

Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` in `admin-backend/.env` to the **same MySQL database** as TeachTeamApp. Match `DB_SSL` too when the host needs TLS.

This API does not run the user app’s migrations. Primary keys are **UUIDs** (same shape as the user API). Leave `DB_SYNC` unset on a shared or production database. Never set `DB_SYNC=true` against live data.

`ADMIN_JWT_SECRET` must match `ADMIN_JWT_SECRET` in the user API when admin actions call shared routes (for example avatar upload).

## Deploy (same pattern as TeachTeamApp)

TeachTeamApp ships as **Vercel (Next)** + **Render (API)** + shared hosted MySQL. Admin mirrors that:

| Piece | Host | Notes |
|-------|------|--------|
| Admin frontend | Vercel | Root directory `admin-frontend`. Set `MAIN_API_ORIGIN` (user API) and `ADMIN_GRAPHQL_ORIGIN` (this API). |
| Admin GraphQL API | Render | Root `admin-backend`. Build `npm ci && npm run build`, start `npm start`. |
| MySQL | Same instance as user | Same `DB_*` as TeachTeamApp backend. Keep `DB_CONNECTION_LIMIT` modest on both APIs. |

Checklist:

1. Point Admin API `DB_*` at the production TeachTeamApp database (UUID schema already applied by the user API).
2. Set `ADMIN_JWT_SECRET` identical on user API and admin API.
3. Deploy Admin API on Render; confirm `/health`.
4. Deploy Admin frontend on Vercel with rewrite origins above.
5. On TeachTeamApp: set `ADMIN_GRAPHQL_ORIGIN` to the Admin Render URL, add the Admin Vercel origin to `ALLOWED_ORIGINS` / `ADMIN_FRONTEND_URL`, redeploy user frontend so `/admin-graphql` works.
6. Smoke: admin sign-in, users/courses list, one mutation visible in the user app.

See `admin-backend/env.example` and `admin-frontend/env.example`.

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

Those reports cover the listed modules, not every GraphQL resolver or dashboard page. CI fails if **any** of those files drops below 80% lines, statements, or functions.

### End-to-end (Playwright)

With the admin app on port 3001 and this API on port 4002:

```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

GitHub Actions runs unit coverage, typecheck/build, then Playwright on a fresh MySQL database.
