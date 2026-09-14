# whoareyou API

Node + Express + MongoDB backend for the whoareyou directory. TypeScript, ESM,
native MongoDB driver (no ODM), Zod at the edges.

See [`../docs/DATABASE.md`](../docs/DATABASE.md) for the collection design,
indexes and every query this server runs.

## Run it

```bash
cp .env.example .env          # then fill in the three secrets
docker compose up -d          # single-node replica set on :27017
npm install
npm run db:setup              # validators + indexes (idempotent)
npm run export:fixtures       # from the REPO ROOT, writes server/fixtures/*.json
npm run db:seed               # 62 people, 36 case studies
npm run dev                   # :4000
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**A replica set is required.** Publish runs in a transaction. `docker-compose.yml`
starts one locally; Atlas is one by default. On a standalone `mongod` the server
logs a warning at boot and falls back to compensating writes.

## Verify

```bash
npm run test:smoke
```

Boots the real app against an ephemeral replica set, seeds it, and runs 47
assertions across every route — including refresh-token rotation, the
two-per-topic quota under a third publish, and traffic de-duplication. No
external services; the mongod binary is cached after the first run.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | tsx watch |
| `npm run build` / `start` | `tsc` to `dist/`, then run it |
| `npm run lint` | types only |
| `npm run db:setup` | apply `$jsonSchema` validators and indexes |
| `npm run db:seed` | upsert fixtures, derive counters |
| `npm run db:reconcile` | repair drifted `users.counts` (safe on a live DB) |
| `npm run test:smoke` | full end-to-end run |

## API

Base path `/api`. Errors are always
`{ error: { code, message, details? } }`.

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | → `{ user, accessToken }` + httpOnly refresh cookie |
| POST | `/auth/login` | same shape |
| POST | `/auth/refresh` | rotates: the old refresh token is deleted as the new one is issued |
| POST | `/auth/logout` | revokes one session |
| POST | `/auth/logout-all` | revokes every session for the user |
| GET | `/auth/me` | requires `Authorization: Bearer` |
| PATCH | `/auth/me` | also refreshes the author snapshot on every card |

Access tokens are 15-minute JWTs held in memory by the client. Refresh tokens
are opaque random strings; only their SHA-256 is stored, so a database leak
does not hand over live sessions.

### Directory

| Method | Path | Notes |
|---|---|---|
| GET | `/people` | `role, topic, skills (csv), q, page, limit` |
| GET | `/people/facets` | role and topic counts, `Cache-Control: 60s` |
| GET | `/people/:slug` | records a profile view |
| GET | `/people/:slug/work` | that person's published entries |

### Work

| Method | Path | Notes |
|---|---|---|
| GET | `/work` | `role, topic, model, skills, q, sort, page, limit` → items + facets + meta |
| GET | `/work/:slug` | → `{ work, moreByAuthor, similar }`, records an open |
| GET | `/work/mine/list` | auth — drafts and published |
| GET | `/work/mine/:id` | auth |
| POST | `/work` | auth — creates a draft |
| PUT | `/work/:id` | auth |
| POST | `/work/:id/publish` | auth — 409 `topic_quota_exceeded`, 422 `not_publishable` |
| POST | `/work/:id/unpublish` | auth — frees a topic slot |
| DELETE | `/work/:id` | auth |

### Traffic and uploads

| Method | Path | Notes |
|---|---|---|
| GET | `/traffic/me` | `?days=7..90`, default 30, gaps filled with zeroes |
| POST | `/uploads/work/:id/thumbnail` | multipart `file`, JPEG/PNG/WebP |
| DELETE | `/uploads/work/:id/thumbnail` | |
| GET | `/uploads/thumbnails/:id` | immutable, 1-year cache |

## Decisions worth knowing

**Native driver, not Mongoose.** The queries in `docs/DATABASE.md` are literally
what runs. Validation lives at the edge (Zod) and at rest (`$jsonSchema`), which
is where it belongs — an ODM would put a third copy in the middle.

**scrypt, not argon2.** `node:crypto` means no native build step. If you are
happy with one, `@node-rs/argon2` is stronger — swap the two functions in
`lib/password.ts` and keep the `scrypt$` prefix check so old hashes verify.

**GridFS, not S3.** One dependency instead of two. The client already downscales
to 960px; the size cap here is the backstop. Swap the bucket for an S3 client
when image traffic justifies it — nothing else changes.

**Denormalised author snapshot on every work.** Listing 24 cards is one query
instead of a `$lookup`. `PATCH /auth/me` fans the update out.

**Denormalised `users.counts.topicUsage`.** Makes the two-per-topic quota an
atomic guarded update instead of a count-then-write race. `db:reconcile`
repairs drift if it ever happens.

## Still to do before production

- [ ] Email verification and password reset (no mail transport is wired up)
- [ ] A real test suite — the smoke test covers the happy paths and the main
      failure modes, not edge cases
- [ ] Structured audit log for moderation actions
- [ ] `helmet` CSP tuned for whatever domain serves the SPA
- [ ] Rate limits are in-process; move to a Redis store behind more than one
      instance or each replica gets its own budget
- [ ] Atlas Search once `works` passes ~50k documents (see `docs/DATABASE.md` §6)
