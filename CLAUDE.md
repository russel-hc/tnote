# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Tnote (티노트) is a Korean **학원** (private academy) student-management SaaS: students, courses, exams, retakes (재시험), clinic attendance, assignments, consultations, calendar, and SMS messaging. Multi-tenant — every academy is a **workspace**. Next.js 16 App Router + React 19 + Supabase (Postgres). All user-facing strings are Korean.

## Commands

```bash
bun dev            # dev server (Turbopack via next dev)
bun run build      # production build
bun run typecheck  # tsc --noEmit
bun run lint       # biome check (read-only)
bun run lint:fix   # biome check --write (autofix + organize imports)
bun run check      # typecheck + lint + format:check — run this before considering work done
bun test           # run all *.test.ts (node:test API, executed by Bun)
bun test src/shared/lib/utils/date.test.ts   # single test file
```

Notes:
- Tests import from `node:test`/`node:assert` but **must be run with `bun test`**, not `node --test` (the date tests assert against the Asia/Seoul timezone and Bun handles the TS + intl setup transparently).
- Package manager is **Bun** (`bun.lock`). React Compiler is enabled (`reactCompiler: true`) — do not hand-add `useMemo`/`useCallback` purely for referential stability.

## Architecture

### Multi-tenancy is the central invariant
Every domain row carries a `workspace` column. **Every query must filter by `session.workspace`**, and every insert must stamp it. This is enforced in application code, not (solely) by RLS — forgetting it leaks data across academies. The CRUD factories and most handlers apply `.eq("workspace", session.workspace)` for you; preserve that whenever you touch a query by hand.

### Auth = Supabase Auth (not custom JWT)
There is **no custom JWT and no `jsonwebtoken` dependency**. Auth is Supabase Auth via cookie sessions (`@supabase/ssr`):
- Users have no real email — login maps phone → `` `${phoneNumber}@tnote.local` ``. `getSession()` strips the `@tnote.local` suffix back to a phone number.
- `role` (`"owner" | "admin" | "student"`) and `workspace` live in Supabase `user_metadata`, read via `getSession()` in `src/shared/lib/supabase/auth.ts`.
- Centralized request gating lives in **`src/proxy.ts`** (Next.js 16's renamed middleware). It refreshes the Supabase session on every request, returns 401 for unauthenticated API calls / redirects pages to `/login`, and confines `student`-role users to `/`, `/my/*`, and the `/api/my/*` + `/api/auth/*` endpoints. Handlers still re-check auth/roles via `withLogging`.

### Two Supabase clients — pick deliberately (`src/shared/lib/supabase/`)
- `createClient()` (server, anon key, cookie-scoped) — the default. Subject to RLS and the logged-in user's permissions. Used inside `withLogging` handlers as `ctx.supabase`.
- `createAdminClient()` (service-role key, **bypasses RLS**) — only for privileged operations: creating/deleting Supabase Auth users (`auth.admin.*`), registration, password resets. When you use it, you are responsible for workspace scoping manually.
- `createClient()` in `client.ts` is the browser client (rarely used directly; data flows through the API + React Query instead).

### API layer (`src/app/api/**` + `src/shared/lib/api/`)
Route handlers are wrapped, never bare:
- **`withLogging(handler, { resource, action, allowedRoles, requireAuth })`** — resolves the session, enforces `allowedRoles`, injects `ApiContext { request, session, supabase, params }`, and logs every request to Axiom via `after()`. Throwing `new Error("Unauthorized")` / `"Forbidden")"` inside a handler is converted to 401/403 with Korean messages; any other throw becomes a 500. Return Korean error bodies as `NextResponse.json({ error }, { status })`. `withPublicLogging` is the unauthenticated variant.
- **`createCrudRoute.ts`** factories — `createListHandler`, `createDetailHandler`, `createCreateHandler`, `createUpdateHandler`, `createDeleteHandler`. Use these for standard table CRUD; they auto-apply the workspace filter/stamp, map Postgres `23505` → 409, and standardize response shapes (`{ data }` for reads, `{ success, data }` for writes). Reach for a hand-written handler only when logic exceeds a simple table op (see `api/students/route.ts` for the pattern).
- Role guards: `["owner", "admin"]` for teacher/staff endpoints; `["student"]` (or include it) for the student-facing `my/*` endpoints.

### Frontend data layer
- **React Query** for all server state. `createQuery`/`createMutation` (`src/shared/lib/hooks/`) are thin factories over `fetchWithAuth`; simpler features use them, complex ones write `useQuery`/`useMutation` directly (often with optimistic `onMutate`).
- **`fetchWithAuth`** (`src/shared/lib/api/fetchWithAuth.ts`) is the only fetch wrapper — sends cookies and hard-redirects to `/login` on 401. Always go through it, never raw `fetch`.
- **`QUERY_KEYS`** (`src/shared/lib/queryKeys.ts`) is the single source of truth for query keys and cache invalidation. Add new keys here; mutations invalidate by referencing them.
- **Jotai** for ephemeral client/UI state (modals, form drafts, filters).

### Feature-folder convention (`src/app/(pages)/<feature>/`)
Route groups `(auth)`, `(legal)`, `(pages)` organize URLs without path segments. Within a feature:
- `(atoms)/` — Jotai atoms (modal/form/filter state)
- `(hooks)/` — React Query hooks (one file per query/mutation)
- `(components)/` — feature-local components
Shared/cross-feature code lives in `src/shared/` (`components/ui`, `components/common`, `lib/`, `types/`, `hooks/`). Import via the `@/` alias (→ `src/`).

### The shared "workflow" abstraction (`src/shared/lib/workflow/`)
**Retakes** (재시험) and **assignment-tasks** are two instances of one generic lifecycle: list → postpone → complete → absent → edit-date → history → undo, plus management-status. `workflow/` exports factories (`createWorkflowList`, `createWorkflowComplete`, `createWorkflowPostpone`, `createWorkflowModalAtoms`, …) that both `(pages)/retakes` and `(pages)/assignments` build their hooks/atoms on top of. When changing one of these lifecycles, check whether the change belongs in the shared factory (affecting both) or the feature wrapper (one only). Their API routes mirror each other: `api/retakes/[id]/*` and `api/assignment-tasks/[id]/*`.

### Assignment status duality (`src/shared/lib/utils/studentAssignments.ts`)
The DB (`StudentAssignments`/`StudentAssignmentHistory`) stores English statuses (`pending|completed|absent|insufficient|not_submitted`) while the UI/submission flow uses Korean labels (`검사예정|완료|결석|미흡|미제출`). `toStudentAssignmentStatus` / `toAssignmentSubmissionStatus` convert between them — route status values through these helpers rather than hardcoding either vocabulary.

### Cross-cutting infrastructure (`src/shared/lib/`)
- **Logging** (`utils/logger.ts`) — structured logs to Axiom (when `AXIOM_TOKEN` set), console only in dev. Emitted via `after()` so it never blocks the response. `withLogging` wires this automatically.
- **SMS** (`services/sms.ts`, `services/messageSender.ts`) — Solapi. Credentials are **per-workspace, stored in the DB** (managed at `/api/settings/solapi`), passed explicitly as `SolapiCredentials` — they are **not** global env vars.
- **Pagination** (`supabase/pagination.ts`) — `fetchAllRows(build)` loops `.range()` to defeat Supabase's 1000-row REST cap. Use it for any unbounded workspace-wide read; the builder must apply a stable `.order()`.
- **Rate limiting** (`utils/rateLimit.ts`) — in-memory sliding window, applied to auth endpoints (`checkAuthRateLimit`).
- **Validation/format utils** (`utils/`) — `phone.ts` (normalize/validate, strip hyphens — phone numbers are stored without hyphens), `password.ts`, `date.ts` (Korean/Asia-Seoul formatting). Prefer these over inline logic.

### Styling & theming
Tailwind CSS v4 (config in `tailwind.config.ts`, imported from `globals.css`). Colors are CSS-variable **design tokens** (`--solid-*`, `--background-*`, `--text-*`, etc.) defined in `globals.css` with light/dark values; use the semantic Tailwind classes, not raw hex. Dark mode is class-based with an inline FOUC-prevention script in `layout.tsx` reading `localStorage["tnote-theme"]`.

## Environment variables

Actually consumed by the code (the README's `JWT_*` and `SOLAPI_*` entries are stale — JWT is unused, Solapi creds are per-workspace in the DB):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — admin client (server only)
- `AXIOM_TOKEN`, `AXIOM_DATASET` (optional) — logging; logging is a no-op without the token

## Database

Schema is **managed in Supabase, not in this repo** (no migrations directory). A Supabase MCP server is configured (`.mcp.json`) for inspecting/querying the live schema. Tables are PascalCase (`Users`, `Workspaces`, `Courses`, `CourseEnrollments`, `ConsultationLogs`, `StudentTags`, `StudentTagAssignments`, `StudentAssignments`, `StudentAssignmentHistory`, `Retakes`, `Exams`, `Clinics`, …). Students and staff are both rows in `Users` distinguished by `role`.

## Conventions

- **Code style**: Biome (`biome.json`) — 2-space indent, 120-col, double quotes, semicolons, trailing commas. `noExplicitAny` is **off** (the factories use `any` deliberately); `useExhaustiveDependencies` is off (React Compiler). Run `bun run lint:fix` before finishing.
- `CLAUDE.md`, `.claude/`, and `.mcp.json` are gitignored — this file is local-only.
