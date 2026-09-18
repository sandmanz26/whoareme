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
npm run db:seed               # 40 people, 54 case studies
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

Boots the real app against an ephemeral replica set, seeds it, and runs 125
assertions across every route — including refresh-token rotation, the
two-per-topic quota under a third publish, traffic de-duplication, the launch
scope, an appeal that a second moderator overturns, and the backfill script. No
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
| `npm run db:backfill` | add `languages` and the author snapshot's `years`/`languages` to documents written before them (safe on a live DB) |
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
| POST | `/auth/verify/request` | auth — mails a link; with `MAIL_TRANSPORT=none` returns the token instead and says so |
| POST | `/auth/verify/confirm` | `{ token }` — single use, 24 hours |

Registration only accepts a craft whose status is `live`. Publishing requires a
verified address; drafting does not.

Access tokens are 15-minute JWTs held in memory by the client. Refresh tokens
are opaque random strings; only their SHA-256 is stored, so a database leak
does not hand over live sessions.

### Directory

| Method | Path | Notes |
|---|---|---|
| GET | `/people` | `role, topic, skills, experience, language (all csv), q, page, limit` |
| GET | `/people/facets` | role, topic and language counts, `Cache-Control: 60s` |
| GET | `/people/:slug` | records a profile view |
| GET | `/people/:slug/work` | that person's published entries |

### Work

| Method | Path | Notes |
|---|---|---|
| GET | `/work` | `role, topic, model, skills, experience, language, q, sort, page, limit` → items + facets + meta |
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
| POST | `/uploads/profile/photo` | multipart `file` — sets `photoUrl` and fans it out to every card |
| DELETE | `/uploads/profile/photo` | |

### Taxonomy, moderation, notices, analytics

| Method | Path | Notes |
|---|---|---|
| GET | `/taxonomy` | crafts with `live`/`soon`, topics with `industry`/`practice`, models, experience bands, languages, the topic quota |
| GET | `/settings` | public contact, copy overrides, `disabledRoles` |
| POST | `/reports` | open to anyone; 10/hour; duplicates collapse silently |
| GET | `/moderation/reports` | moderator — the open queue |
| POST | `/moderation/reports/:id/resolve` | moderator — `{ reason }`, min 12 chars |
| POST | `/moderation/work/:id/unpublish` \| `/republish` | moderator — writes a notice to the author |
| POST | `/moderation/users/:id/suspend` \| `/reinstate` | moderator — fans `authorSuspended` onto their entries |
| GET | `/moderation/appeals` | moderator — appeals nobody has answered |
| POST | `/moderation/appeals/:id/decide` | moderator — `{ outcome, reason }`; 403 if you took the decision |
| GET | `/moderation/log` | moderator — the audit log |
| PUT | `/moderation/settings` | moderator — `{ contact?, copy?, disabledRoles?, reason }` |
| GET | `/notices` | auth — the decisions taken about **you**, with their reasons |
| POST | `/notices/:id/read` | auth |
| POST | `/notices/:id/appeal` | auth — `{ text }`, one per notice |
| POST | `/analytics/funnel` | open — `{ counts: { step: n } }`, strict schema, → 204 |
| GET | `/analytics/funnel` | moderator — `?days=1..180`, totals plus one row per day |

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
instead of a `$lookup`. `PATCH /auth/me` fans the update out. `years` and
`languages` are in the snapshot because the entry grid filters on them, and a
filter is not cosmetic: a profile edit that skipped the fan-out would put
someone in the wrong experience band on their own case studies, invisibly.

**The launch scope lives in the query, not at the edge.** A craft marked `soon`
in `ROLE_STATUS` is withheld from every public read — listings, facets, detail
pages, similar work. The rows stay, with their ids, and come back the day the
craft goes live. Applying it in `buildWorkMatch` and `PUBLIC_PERSON` rather
than per route means a new route cannot forget it. Separate from
`siteSettings.disabledRoles`, which is a moderator turning a craft off in the
browse controls.

**A moderation decision writes its notice in the same operation.** Split into
two calls, the missing half would always be the notice, because nothing
visibly breaks when an author is not told. An appeal has to be reviewed by
somebody other than whoever decided (enforced in the service, not the UI), and
overturning genuinely republishes or reinstates — an outcome that changed
nothing would be worse than no appeal, because it would look like recourse.

**The funnel is counters, not events.** One document per day, `$inc` only, and
a `$jsonSchema` with `additionalProperties: false` so the collection could not
hold an identifier even if a later version tried to send one.

**Denormalised `users.counts.topicUsage`.** Makes the two-per-topic quota an
atomic guarded update instead of a count-then-write race. `db:reconcile`
repairs drift if it ever happens.

## Still to do before production

- [ ] **Password reset.** Verification is wired up and mailed; reset is not.
- [ ] **Point the SPA at this.** The API is complete and proven, and the SPA
      still reads `localStorage`. That is the one remaining gap between the
      two halves of the repo.
- [ ] A real test suite — the smoke test covers the happy paths and the main
      failure modes, not edge cases
- [ ] `helmet` CSP tuned for whatever domain serves the SPA
- [ ] Rate limits are in-process; move to a Redis store behind more than one
      instance or each replica gets its own budget
- [ ] Atlas Search once `works` passes ~50k documents (see `docs/DATABASE.md` §6)
