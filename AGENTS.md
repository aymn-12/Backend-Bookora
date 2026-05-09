# AGENTS.md

## Dev Commands
```
npm run dev   # nodemon src/server.js
npm start     # node src/server.js
```
**No test, lint, or typecheck scripts defined.** Verify manually or with external tooling.

## Key Rules (from CLAUDE.md — read it for full context)

### Before coding — self-review
1. Build first plan → reject it (waste tokens? shorter path? gotcha change it?) → write improved plan only → execute

### After completion — response format
- ✅ One line per action taken
- ⚠️ Non-obvious decisions/warnings
- ❌ No restating visible code, no explaining approach (unless asked)

## Non-obvious gotchas

- `user.name` = system ID `"BKR-XXXXXX"` — NOT a display name, never sent by client
- `book.author` = **String** (display name), `book.authorId` = User ref (only for author-submitted books)
- `book.publishStatus` (`pending_review|approved|rejected`) ≠ `book.status` (`published|draft|archived`)
- **Cover images** → Supabase bucket `book-covers.` (trailing dot) — env key is `SUPABASE_SERVICE_ROLE_KEY`
- **PDFs** → Google Drive via `drive.service.js` — uses `axios` (NOT googleapis client), supports Range headers
- **Image proxy** `GET /api/images/cover/:driveFileId` is legacy — effectively dead for new books
- Auth middleware imported as **`authMiddleware`** (not `protect`) from `OAuth.middlewares.js`
- Token: `req.cookies.accessToken` OR `Authorization: Bearer <token>`
- Roles: **`user | admin | superadmin`** (3, not 2). `superadmin` cannot be assigned via API.
- **No `asyncHandler`** — all controllers use `try { ... } catch (error) { next(error); }`
- `GET /api/auth/csrf-token` required before logout, refresh-token, change-password
- Author trial: **unlimited** uploads for 15 days; active: max 10 books/month
- Temp files (`uploads/tmp/`) cleaned in `finally` block — don't skip it

## Module System
- **CommonJS** (`"type": "commonjs"` in package.json) — no ESM imports

## Reference
- Full context: `CLAUDE.md` (verified 2026-05-09)
- Env vars, response shapes, full route table, and all conventions are documented there
