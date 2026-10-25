# whoareyou API

Node + Express + MongoDB backend for the whoareyou directory. TypeScript, ESM,
Mongoose at the data layer, Zod at the edges.

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

**Standalone is assumed.** Production runs a standalone `mongod`, so publish and
every other multi-document operation use guarded atomic updates plus compensating
writes, never transactions. `npm run db:reconcile` is the safety net for a counter
that drifts; run it on a schedule. `docker-compose.yml` starts a single-node
replica set if you prefer, but nothing in the API requires one.

## Mail

`MAIL_TRANSPORT` selects how verification and password-reset mail leaves the
server:

| Value | What it does |
|---|---|
| `none` | development only; the token comes back in the API response |
| `log` | writes the message to the log |
| `resend` | POSTs to the Resend API (`MAIL_API_URL`, `MAIL_API_KEY`) |
| `nodemailer` | sends over SMTP (`SMTP_SERVICE` or `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) |

`http` is still accepted as an alias for `resend`. For Gmail, turn on 2-Step
Verification, create an App Password, set `SMTP_SERVICE=gmail`, and make
`MAIL_FROM` the same address as `SMTP_USER` (or an alias on that account).
Production refuses to start with `MAIL_TRANSPORT=none`.

## Verify

```bash
npm run test:smoke
```

Boots the real app against an ephemeral MongoDB, seeds it, and runs a growing
set of assertions across every route - the two-per-topic quota under a third
publish, moderator republish past the cap, account deletion and its cascade,
traffic reads, uploads, suspended-account access, the launch scope, an appeal
that a second moderator overturns, and the backfill script. No external
services; the mongod binary is cached after the first run.

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

Base path `/api/v1`. Every response, success or error, is
`{ success, data, message, details? }`.

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | returns `{ token, user }` |
| POST | `/auth/login` | returns `{ token, user }`; a suspended account may sign in |
| POST | `/auth/logout` | clears the stored token |
| GET | `/auth/me` | `Authorization: Bearer`; a suspended account may read it |
| PATCH | `/auth/me` | active accounts only; refreshes the author snapshot |
| DELETE | `/auth/me` | erases the account and everything attached to it |
| POST | `/auth/verify/request` | auth; with `MAIL_TRANSPORT=none` returns the token instead |
| POST | `/auth/verify/confirm` | `{ token }`, single use, 24 hours |
| POST | `/auth/forgot-password` | always `200`; sends a reset link only if the address exists |
| POST | `/auth/reset-password` | `{ token, password }`, single use, 1 hour |

Registration only accepts a craft whose status is `live`. Publishing requires a
verified address; drafting does not.

One active token per account: signing in on a second device replaces the stored
token and ends the first session. The token lives on the user document, so logout
revocation is immediate. There is no refresh token yet.

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
| POST | `/moderation/appeals/:id/decide` | moderator — `{ outcome, reason }`; 403 if you took the decision, unless you are an admin |
| GET | `/moderation/log` | moderator — the audit log |
| PUT | `/moderation/settings` | moderator — `{ contact?, copy?, disabledRoles?, reason }` |
| GET | `/notices` | auth — the decisions taken about **you**, with their reasons |
| POST | `/notices/:id/read` | auth |
| POST | `/notices/:id/appeal` | auth — `{ text }`, one per notice |
| POST | `/analytics/funnel` | open — `{ counts: { step: n } }`, strict schema, → 204 |
| GET | `/analytics/funnel` | moderator — `?days=1..180`, totals plus one row per day |

## Decisions worth knowing

**Mongoose at the data layer.** Schemas live in `server/src/models`, validation
at the edge is Zod, and `$jsonSchema` is applied by `db:setup`. The one thing to
watch is that `aggregate()` does not cast query values the way `find()` does, so
ids passed into a pipeline have to be `ObjectId`.

**bcrypt, not argon2.** The hashes are bcrypt and verified through
`service/password.ts`. If you later move to argon2, keep the existing verify path
so old hashes still let people in, and rehash on next sign-in.

**Local disk, not S3.** Uploads are written under `uploads/` and served from
`/uploads/*`. Swap in an S3 client behind the same two helpers when image traffic
justifies it.

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
somebody other than whoever decided (enforced in the service, not the UI). An
admin may review their own decision, and the audit line records that it was
self-reviewed. Overturning genuinely republishes or reinstates — an outcome
that changed nothing would be worse than no appeal, because it would look like
recourse.

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
