# whoareyou — complete project context

**This document is self-contained.** Hand it to an engineer or an AI agent with
no other context and they should be able to work on any part of the system.
Everything below reflects code that exists and has been verified, not a plan.

Last verified: 12 September 2026.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Current state](#2-current-state)
3. [Product context](#3-product-context)
4. [The domain model](#4-the-domain-model)
5. [Repository layout](#5-repository-layout)
6. [Front end](#6-front-end)
7. [Back end](#7-back-end)
8. [Database](#8-database)
9. [Rules and invariants](#9-rules-and-invariants)
10. [Running everything](#10-running-everything)
11. [Verifying a change](#11-verifying-a-change)
12. [Known gaps](#12-known-gaps)
13. [Glossary](#13-glossary)

---

## 1. What this is

A directory of people who build technology, and — the part that matters — the
real work they have done. Not a picture of the work. The work: the problem, the
decisions, and the number that changed.

The tagline that captures it: **"like Dribbble, but what you're looking at is
the real work, not a picture of it."**

Two deployables in one repository:

| | Path | Stack |
|---|---|---|
| SPA | `/` | React 19, Vite 7, Tailwind v4. **Zero runtime deps beyond React.** |
| API | `/server` | Node ≥20, Express 5, MongoDB 7 (native driver), TypeScript, Zod |

The SPA was built first and still runs completely standalone against static
fixtures plus `localStorage`. The API is the production path. Both are live in
the repo; wiring the SPA to the API is the next piece of work (see §12).

---

## 2. Current state

### Working and verified

**SPA** — home page with a revolving-portrait hero, craft grid, portfolio
browser, people directory, join flow, a full authoring panel (profile,
portfolio with role-specific forms, traffic), a full portfolio index, and case
study detail pages with related work, profile pages, and standing About /
Changelog / Privacy pages. 54 seeded case studies, 40 seeded people, all Southeast Asia.
Verified in a real browser: no console errors and no horizontal overflow at
360 / 390 / 768 / 1024 / 1440 on every route.

**API** — auth (register, login, refresh with rotation, logout, profile, email
verification by mail), directory listing and facets, work CRUD, publish with
atomic quota enforcement, similar-work scoring, the experience and language
filters, the launch scope, traffic recording and summary, GridFS thumbnails and
profile photos, reports, moderation with an audit log, notices to the people a
decision was about, appeals a second moderator must review, site settings, the
taxonomy, and funnel counters. Verified by `npm run test:smoke`: **125
assertions, all passing**, against an ephemeral single-node MongoDB replica set.

There is **nothing the SPA does that the API cannot answer.** What is missing
is a provisioned database and the wiring between the two — see §12.

### Not yet done

The SPA still reads `localStorage`, not the API. See §12.

---

## 3. Product context

### The problem

Hiring evidence in tech barely exists in portable form. A CV compresses three
years into six bullets and a job title that reflects one company's levelling.
LinkedIn optimises for keywords, so everyone converges on the same vocabulary.
Dribbble and Behance show what work *looked like* — a reviewer cannot tell
whether it shipped or what changed. GitHub is real evidence for one craft and
only for public code.

A reviewer wants three facts in ten seconds: what was the problem, what did
this person decide, what changed. Almost no portfolio surface makes those easy
to state, so people write prose that hides them.

### The thesis

**A portfolio should be segmented by craft, evidenced by outcome, and the
product should make it hard to publish anything else.**

Two consequences run through the whole build:

1. **The form is the product.** What you ask determines what you get. Asking a
   developer for p95 and a repo, and a researcher for who they interviewed and
   what the team decided, produces better entries than one generic description
   box. Forms are generated per craft for exactly this reason.
2. **Nobody wins on presentation.** Covers are generated from the craft and the
   headline number. Uploads are allowed but still carry the metric on top. A
   prettier mockup must not out-rank a better result.

### Who it is for

- **Supply** — designers, engineers, product, data, platform, QA, growth,
  research who have done substantial work they cannot show because it is
  internal, under NDA, or looks like nothing in a screenshot.
- **Demand** — hiring managers, founders, agency leads who are scanning, not
  browsing.

### Rules that are the value proposition, not arbitrary constraints

| Rule | Why |
|---|---|
| **Two published entries per topic, per person** | Forces people to lead with their best two. Keeps a topic page readable. Makes density a feature. Drafts are unlimited; unpublishing frees a slot. |
| **Every entry states problem, decisions, outcome** | Required in the guided template. Free-form entries use their own headings but still owe result rows. "It never shipped" is a valid outcome — the seeded data includes cancelled projects and accepted cost increases, because a portfolio where everything succeeded is not credible. |
| **Proof points are labelled "Results claimed"** | We cannot verify a number. Pretending otherwise would be the most damaging thing this product could do. |
| **Generated covers by default** | Protects confidential work from being second-class. Stops the grid becoming a visual-design competition for people who are not visual designers. |
| **Simulated data is disclosed** | The SPA's local traffic history is generated and the panel says so. The one screen whose job is to be factual must not be the one that lies. |

### Deliberately not built

Messaging, shortlists, job posts, applications (a two-sided hiring flow is a
different product). Likes, follows, feeds (popularity ranking reintroduces
exactly the dynamic this exists to avoid). Verification badges (attractive and
hard; doing it badly is worse than not doing it). AI-written case studies (the
form's value is that a person answered the questions).

### Metrics that would matter

1. Completion rate of a first entry — the core tension: the forms are demanding
   on purpose, and too demanding kills supply.
2. Entries per active person (2–4, capped by the topic quota).
3. Proof-point fill rate — if this drops, the differentiator is gone.
4. Portfolio opens per profile view.
5. Demand-side return rate.

Avoid optimising total profiles or page views. A directory of thin profiles is
worth less than a small directory of substantial ones; the quota is a bet on
exactly that.

---

## 4. The domain model

Three axes. Shared vocabulary across SPA, API and database — the string values
below are the literal ids used everywhere.

### Craft (`role`) — what the person does

`design` · `engineering` · `product` · `data` · `infra` · `quality` · `growth` ·
`research`

Displayed as Designer, Developer, Product, Data & AI, DevOps, QA, Growth,
Research.

**Per entry, not per person.** A designer who shipped a routing engine files it
as developer work, and the UI says so explicitly.

### Topic — where it shipped

One storage axis, two **kinds**, distinguished by a `kind` field on each entry
in `CATEGORIES` and surfaced as two separate filter controls.

**Industry** (`kind: "industry"`) — `saas` · `ai` · `banking` · `finance` ·
`erp` · `energy` · `mobility` · `healthtech` · `gaming` · `climate` ·
`security`. Carries a business case almost by definition.

**Practice** (`kind: "practice"`) — `leadership` · `design-ops` · `devex` ·
`accessibility` · `hiring` · `reliability`. Discipline work with no revenue
line of its own. It is real and often the most senior thing a person has done,
and filing it under an industry would either flatter it with a business case it
never had or bury it entirely.

Everything except the first eight sits behind a "See more" control on the
directory rail.

**One storage axis, two controls.** `Work.topics` holds both kinds, so the
two-per-topic quota keeps working unmodified and a person whose year was half
ERP and half design ops can say exactly that. The filter bar splits them into
**Industry** and **Practice**, because they answer different questions and
picking one is not a vote against the other. `Filters.topic` and
`Filters.practice` are AND-ed; 13 of the 92 seeded entries carry one of each.

The directory rail stays a single row of chips over both kinds and routes by
`isPracticeTopic()` in `HomePage`, so it remains single-select: picking a
practice clears the industry and the other way round.

**People inherit topics from their work.** `Person.categories` is hand-written
in the fixtures and only ever holds industries, so `withDerivedTopics()` in
`src/lib/authors.ts` unions in the topics of everything a person published.
Without it, filtering the directory by a practice topic returns case studies
and zero people. It is also the more honest model: a person belongs to a topic
because of what they shipped there, not because of a label on their profile.

### Business model — how the thing made money

`b2b-saas` · `consumer` · `marketplace` · `enterprise` · `platform` ·
`ecommerce` · `agency` · `open-source` · `deep-tech` · `public`

This axis exists because craft + topic is not enough to tell whether two
projects are comparable. A payments feature for twelve on-prem bank tenants and
one for two million consumers share both and almost nothing else.

### Skills

Free text with per-craft suggestions (`src/data/skills.ts`). Suggestions exist
to keep strings consistent so filters can group on them. Max 8 per entry.

### Person facets: experience and language

Two filters describe the **person**, not the entry:

- **Experience** is banded (`src/data/experience.ts`), never an exact number.
  Bands are `[min, max)` so they tile with no gap, and nobody hiring
  distinguishes seven years from eight.
- **Language** is the working language, seeded per country from the code
  already in `Person.location` (`COUNTRY_LANGUAGES` in `src/data/people.ts`).
  English is on every row, which makes that one option near-useless and every
  other one useful.

Both reach a case study **through its author**, which is why `Author` carries
`years` and `languages`. One filter bar narrowing people and work to the same
set of humans is the point; a control that silently does nothing on one of the
two surfaces is worse than no control.

### Similarity

"Similar" means *comparable to a reviewer*, not visually alike:

```
score = min(sharedSkills, 3) × 2     // the language / skills axis
      + sharedTopics × 3
      + (sameBusinessModel ? 3 : 0)
      + (sameRole ? 1 : 0)
```

The skill cap matters: uncapped, skill overlap swamps the other two axes and
every result is "the same craft again" — the least useful thing to show someone
already reading that craft. Results are de-duplicated by author, because three
projects by one person is a worse reference set than three by three people (and
their own other work has its own section directly above). Every match carries
`reasons[]`, rendered on the card, so a match never looks arbitrary.

Implemented twice, identically: `src/lib/similar.ts` (client) and
`server/src/modules/work/queries.ts` → `similarWorkPipeline` (aggregation).
**If you change one, change both.**

---

## 5. Repository layout

```
/
├── CLAUDE.md                  agent rules, short
├── README.md                  SPA readme
├── docs/
│   ├── PROJECT_CONTEXT.md     this file
│   ├── ENGINEERING.md         front-end deep dive + invariants
│   ├── BUSINESS.md            product thesis, long form
│   └── DATABASE.md            collections, indexes, every query
├── scripts/
│   └── export-fixtures.mjs    src/data/*.ts → server/fixtures/*.json
├── src/                       the SPA
│   ├── components/{ui,layout,home,work,panel,join}/
│   ├── pages/                 HomePage, WorkIndexPage, WorkPage, PanelPage
│   ├── data/                  taxonomy, businessModels, skills, people,
│   │                          portfolios, portfolioSchemas, work, account,
│   │                          traffic, trafficSeed
│   ├── hooks/                 useAccount, useLockBodyScroll
│   ├── lib/                   router, storage, filter, workFilter, similar,
│   │                          workMapper, authors, image, css, utils
│   ├── App.tsx                routes + all browse state
│   └── index.css              @theme design tokens
└── server/                    the API
    ├── README.md              API surface, decisions, TODO
    ├── docker-compose.yml     single-node replica set
    ├── fixtures/*.json        generated, committed
    └── src/
        ├── config/env.ts      Zod-validated environment
        ├── db/                client, collections, schema, indexes
        ├── lib/               errors, http, password, tokens, text,
        │                      pagination, logger
        ├── middleware/        auth, validate, error, rateLimit
        ├── modules/           auth, users, work, traffic, uploads
        ├── scripts/           setup, seed, reconcile-counts, smoke
        ├── app.ts             express wiring
        └── index.ts           bootstrap + graceful shutdown
```

---

## 6. Front end

### Stack and constraints

React 19 + TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`),
Vite 7, Tailwind v4 with tokens in `@theme` and **no `tailwind.config.js`**.

**Runtime dependencies: `react` and `react-dom`. Nothing else.** Icons, the
dialog, the focus trap, the router, the stepper and the image downscaler are
hand-rolled. Total bundle ~164 kB gzipped, most of the growth being seed data
rather than code. Do not add a UI library, an icon
package, a router or a state manager without a stated reason.

### Routing

Hand-rolled hash router (`src/lib/router.ts`) so the static build deploys
anywhere. `useRoute()` parses `location.hash` into `{ path, segments }`.

**Non-obvious:** in-page anchors (`#work`, `#roles`, `#directory`) parse to
routes that match nothing and fall through to `HomePage`, so jump links keep
working alongside real routes. `pageRootOf()` returns `"home" | "work" |
"panel"`; a new page must be added to `PAGE_ROUTES` or it silently renders home.

| Route | View |
|---|---|
| `#/` | Home |
| `#/work` | Full portfolio index — filters, sort, grid/list |
| `#/work/:id` | Case study + more from author + similar |
| `#/people/:id` | Profile — the person's portfolio, grouped by topic |
| `#/about` | Product thesis and the rules that are the product |
| `#/changelog` | Reader-facing release notes |
| `#/privacy` | Where data goes in this build (nowhere) |
| `#/panel` | Overview: profile strength, portfolio and traffic stats |
| `#/panel/profile` | Profile form |
| `#/panel/portfolio` | Entry list with completeness |
| `#/panel/portfolio/new` | Format + craft, then the form |
| `#/panel/portfolio/:id` | Edit |
| `#/panel/traffic` | Views and opens |

`App.tsx` scrolls to top on page-root change only, so anchors are not hijacked.

### State ownership

- **Browse state** (`role`, `topic`, `practice`, `model`, `experience`,
  `language`, `skills`, `query`) lives in
  `App.tsx` as one `Filters` object. **Every facet is an array**: empty means no
  opinion, values inside one facet are OR-ed, and facets are AND-ed with each
  other. `skills` is the exception and stays AND-ed within itself, because a
  skill list is a spec rather than a shortlist. Every surface reads it, so selecting a
  craft in the role grid, the home dropdown or the index dropdown gives one
  consistent answer everywhere. **Do not add a second copy.**
- **Account and entries** live in `useAccount` (React context over
  `localStorage`). Components never touch storage directly. **This is the seam
  the API slots into** — see §12.
- **Component-local** state covers pagination, editor buffers and view toggles.
  Pagination resets via the derive-state-during-render pattern (compare a
  signature string against the previous one), not `useEffect`.

Storage keys, all prefixed `whoareyou:` — `account`, `drafts`, `traffic`.
`signOut()` clears all three.

### Schema-driven portfolio forms

Each craft proves itself differently, so the evidence half of the form is
generated from `ROLE_SCHEMAS` in `src/data/portfolioSchemas.ts`. One renderer
(`SchemaField`) and one validator (`validateFields`) serve all eight roles.

- **Add a field to a craft:** add a `FieldSpec` to that role's `fields`. Done —
  no component, no validator change, no migration. Mark `proof: true` only if
  it is a metric worth putting on the card.
- **Add a craft:** add to `ROLES` in `src/data/taxonomy.ts`, add a schema under
  the same id, add suggestions to `SKILL_SUGGESTIONS`, and add a motif case to
  `Motif` in `WorkCover.tsx`. TypeScript points at all four.

`FieldKind` is `text | textarea | url | number | tags | select`.

### Two authoring modes

- **Guided template** — the role's evidence schema.
- **Your own structure** — a section builder (the author's headings, in their
  order) plus their own result rows.

Both converge on one `Work` model via `workFromDraft()` in
`src/lib/workMapper.ts`. **If a schema field does not appear on a card, that
function is where to look.**

### Design system

Tokens in `src/index.css` under `@theme`: `--color-ink` (#0B0B0F),
`--color-paper` (#F5F4EF), five `--color-pop-*` (lime, pink, violet, sky,
tangerine), `--font-display` (Space Grotesk) / `--font-sans` (DM Sans),
`--radius-card`, `--radius-pill`, `--ease-pop`. **Never hard-code a hex.**

- `.display` — tight tracking, 0.92 line-height, headings.
- `.eyebrow` — uppercase label above a section.
- Motion 200–300 ms with `ease-pop`; the whole system stops under
  `prefers-reduced-motion` via one global block.
- **Hero orbit** — pure CSS transforms. A ring rotates; each portrait
  counter-rotates at the same rate so faces stay upright. Radius and portrait
  size are fractions of one `--stage` variable, so it scales from 360 px to
  1440 px with no breakpoint. No per-frame JavaScript.
- **Covers are drawn** (`WorkCover`) — a line motif per craft plus a
  deterministic mirror, carrying the headline metric. Uploads are optional and
  still render the metric on a scrim.

---

## 7. Back end

### Stack and decisions

Node ≥20, Express 5, **native MongoDB driver (no ODM)**, TypeScript ESM, Zod at
the edges, pino for logs.

| Decision | Reason |
|---|---|
| Native driver, not Mongoose | The queries in `docs/DATABASE.md` are literally what runs. Validation lives at the edge (Zod) and at rest (`$jsonSchema`); an ODM would add a third copy in the middle. |
| `node:crypto` scrypt, not argon2 | No native build step. `@node-rs/argon2` is stronger — swap the two functions in `lib/password.ts` and keep the `scrypt$` prefix check so old hashes verify. |
| GridFS, not S3 | One dependency instead of two. Swap the bucket for an S3 client when image traffic justifies it; nothing else changes. |
| Opaque refresh tokens, not refresh JWTs | They must be revocable. Only the SHA-256 is stored, so a database leak does not hand over live sessions. |

### Auth model

- **Access token** — 15-minute JWT, `Authorization: Bearer`, held in memory by
  the client.
- **Refresh token** — opaque 48-byte random string in an httpOnly cookie scoped
  to `/api/auth`. **Rotates on every use**: the old row is deleted as the new
  one is issued, so a replayed token fails (verified by the smoke test).
- Sessions carry a TTL index, so expiry is enforced by the database.
- Login hashes a dummy password when the user does not exist, so response time
  does not reveal which emails are registered.

### API surface

Base `/api`. Errors are always `{ error: { code, message, details? } }`.

**Auth** — `POST /auth/register`, `/login`, `/refresh`, `/logout`,
`/logout-all`; `GET /auth/me`; `PATCH /auth/me` (also fans the author snapshot
out to every card).

**Directory** — `GET /people` (`role, topic, skills, q, page, limit`),
`GET /people/facets` (cached 60 s), `GET /people/:slug` (records a profile
view), `GET /people/:slug/work`.

**Work** — `GET /work` (`role, topic, model, skills, q, sort, page, limit` →
items + facets + meta), `GET /work/:slug` (→ `{ work, moreByAuthor, similar }`,
records an open), `GET /work/mine/list`, `GET /work/mine/:id`, `POST /work`,
`PUT /work/:id`, `POST /work/:id/publish`, `POST /work/:id/unpublish`,
`DELETE /work/:id`.

**Traffic** — `GET /traffic/me?days=7..90`. Your own numbers only; there is no
endpoint that reveals anyone else's.

**Uploads** — `POST|DELETE /uploads/work/:id/thumbnail`,
`GET /uploads/thumbnails/:id` (immutable, 1-year cache).

### The quota, enforced atomically

The two-per-topic cap is cross-document, so it cannot be a schema validator,
and a count-then-write would let two concurrent requests both pass. It is a
**guarded update**: the filter refuses to match if any target topic is already
at the cap, which makes check-and-increment one atomic operation.

```js
const guard = await users.updateOne(
  { _id: authorId, status: "active",
    $nor: topics.map(t => ({ [`counts.topicUsage.${t}`]: { $gte: 2 } })) },
  { $inc: { "counts.publishedWorks": 1,
            ...Object.fromEntries(topics.map(t => [`counts.topicUsage.${t}`, 1])) } },
  { session })

if (guard.matchedCount === 0) throw new QuotaError(topics, 2)
```

Wrapped in a transaction with the status flip. **A replica set is required.**
On a standalone `mongod` the server warns at boot and falls back to
compensating writes. `npm run db:reconcile` repairs drift and is safe to run
live.

Publish also re-validates against a stricter schema than a draft
(`publishableSchema`) and returns `422 not_publishable` with per-field issues.

### Traffic recording

Two cheap writes per event, so the panel never aggregates raw events at read
time: an append-only `trafficEvents` row and a `trafficDaily` rollup, plus a
denormalised `works.metrics.opens` for the "popular" sort.

De-duplication is a **unique index** on
`{ownerId, type, viewerHash, day, workId}` — a refresh loop is a duplicate-key
no-op, not an inflated number. `viewerHash` is a salted daily hash of IP + user
agent: it identifies nobody and rotates daily so it cannot be joined across
days. The owner viewing their own page is not counted.

Days with no traffic have no document; the API fills the gaps so the client
never has to know that absence means zero.

---

## 8. Database

Full detail, including copy-pasteable `mongosh` queries, is in
[`docs/DATABASE.md`](DATABASE.md). Summary:

| Collection | Holds |
|---|---|
| `users` | Everyone in the directory — seeded people and real accounts |
| `works` | Portfolio entries, drafts and published |
| `sessions` | Refresh tokens (hashed), TTL-expired |
| `trafficEvents` | Append-only raw views and opens, TTL 400 days |
| `trafficDaily` | Per-owner per-day rollup |
| `thumbnails.*` | GridFS bucket |

**Two deliberate denormalisations:**

- `works.author` — a snapshot of the author's card fields, so listing 24 cards
  is one query instead of a `$lookup`. `PATCH /auth/me` fans updates out.
- `users.counts.topicUsage` — published entries per topic, so the quota is an
  O(1) guarded update.

**Index ordering is `status → filter → sort`,** because every listing filters
on `status: "published"` first. `topics` and `skills` are both arrays and Mongo
will not compound two multikey fields, which is why they have separate indexes.

**Search** is an AND of case-insensitive regexes over a denormalised lowercase
`searchBlob`, which matches the UI's behaviour exactly (`$text` is an OR of
stemmed terms). Unanchored regex cannot use an index, so it is a filtered
collection scan — fine at a few thousand entries, and `works_text` exists as
the portable middle option. Above ~50k entries, move to Atlas Search.

---

## 9. Rules and invariants

### Product rules (do not relax without replacing what they protect)

1. Two published entries per topic, per person.
2. Every entry states problem, decisions and outcome.
3. Proof points are "Results claimed", never verified facts.
4. Generated covers by default; uploads never drop the metric.
5. Simulated data is labelled as such in the UI.

### Front-end invariants — break these and something regresses

1. **Grid items need `min-w-0`.** A no-wrap badge row widens the grid track and
   clips card content on narrow screens. Cards are `w-full min-w-0`; the list
   items wrapping them are `flex min-w-0`.
2. **`<Avatar>` renders a `<span>`,** never a `<div>` — it appears inside `<p>`
   in places, and a div there is invalid HTML.
3. **Keys must tolerate duplicates.** Links and stack entries can repeat, so
   key by `${value}-${index}`, not by value.
4. **`PanelPage`'s portfolio section stays mounted across `/new → /:id`.** New
   entry state is reset by comparing the route target against the previous one
   during render. Remove that and "Add work" reopens the last draft.
5. **`Button` sets its own `display`.** Wrap it in a span to hide it
   responsively; `hidden sm:inline-flex` on the button itself loses.
6. **Thumbnails must go through `lib/image.ts`** (960 px, JPEG q0.72) or a raw
   camera JPEG blows the ~5 MB localStorage budget.
7. All storage access goes through `lib/storage.ts`, which swallows
   private-mode and quota errors.

### Back-end invariants

1. **Quota changes must stay inside the guarded update.** Reading the count and
   then writing is a race.
2. **`limit: 0` does not disable `express-rate-limit` v7 — it blocks
   everything.** Use `skip`. (This shipped as a bug and was caught by the smoke
   test.)
3. **The API never imports from the SPA's source tree.** It reads
   `server/fixtures/*.json`, regenerated by `npm run export:fixtures` at the
   repo root.
4. **Traffic writes are fire-and-forget.** An analytics write must never fail a
   page load.
5. **Similarity scoring exists in two places and must stay identical.**

---

## 10. Running everything

### SPA only

```bash
npm install
npm run dev          # http://localhost:9800
```

Works with no database and no API.

### Full stack

```bash
# 1. fixtures for the API
npm run export:fixtures

# 2. database (needs Docker; Atlas works too)
cd server
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # ×3 secrets
docker compose up -d

# 3. API
npm install
npm run db:setup     # validators + indexes, idempotent
npm run db:seed      # 40 people, 54 case studies
npm run dev          # http://localhost:4000
```

**A replica set is required** — publish runs in a transaction.
`server/docker-compose.yml` starts a single-node one; Atlas is one by default.

---

## 11. Verifying a change

### SPA

No test suite. Drive a real browser (Playwright over the cached Chrome for
Testing works; `playwright-core` is installed temporarily and removed after,
which is why it is not in `package.json`) and assert:

- no console errors and no `pageerror` on every route;
- `document.scrollWidth === clientWidth` at 360 / 390 / 768 / 1024 / 1440;
- register → panel → starter → publish → the entry appears on the home grid and
  the index.

Those three assertions have each caught a genuine bug. Keep them if you add a
real test suite.

### API

```bash
cd server && npm run test:smoke
```

47 assertions against an ephemeral replica set, covering every route plus the
paths that are easy to get wrong: refresh-token rotation, the quota under a
third publish, slot release on unpublish, `422 not_publishable`, and traffic
de-duplication. No external services; the mongod binary is cached after the
first run.

---

## 12. Known gaps

Ordered by what I would do next.

### 1. Wire the SPA to the API — the main remaining work

`src/hooks/useAccount.tsx` is the seam. Its context contract
(`account`, `drafts`, `publishedWork`, `traffic`, `register`, `updateProfile`,
`saveDraft`, `deleteDraft`, `trackProfileView`, `trackWorkOpen`, `signOut`)
already matches the API's shape. Replace the `localStorage` bodies with fetch
calls; **no component needs to change.**

Alongside it, and worth knowing before you start: **the API is no longer the
lagging half.** Notices and appeals, funnel counters, the craft `live`/`soon`
status, `languages`, and the experience and language filter parameters all
exist server-side and are covered by the smoke suite. Four SPA features that
previously had no API counterpart now have one, so wiring will not knock them
out. `GET /api/taxonomy` returns the crafts, topic kinds, models, experience
bands, languages and the topic quota — use it to check the SPA's own copy of
the taxonomy has not drifted.

- `SEED_WORK` / `PEOPLE` become fetched collections. The `Work` type stays as
  is — the API returns the same shape.
- Filtering, faceting and pagination move server-side; `lib/filter.ts` and
  `lib/workFilter.ts` become dead code on the client.
- Thumbnails move to `POST /uploads/work/:id/thumbnail` and the profile photo
  to `POST /uploads/profile/photo`. Keep `lib/image.ts` as the client-side
  pre-upload downscale.
- `src/lib/analytics.ts` keeps its counters and gains a flush: `POST
  /api/analytics/funnel` with `{ counts }`. The schema is strict on both
  levels, so send counters and nothing else.
- `src/hooks/useAdmin.tsx` moves onto `/api/moderation/*` and
  `src/components/panel/NoticeList.tsx` onto `/api/notices`. Note that the
  server refuses to let a moderator review an appeal against their own
  decision; the SPA has no such check, and this is where it gets one.
- The traffic disclosure copy in `TrafficPanel` comes out once numbers are real.
- Decide the fallback: keep the offline/localStorage path as a demo mode, or
  drop it. Rule 2 in `CLAUDE.md` currently says keep it.

### 2. Before the API goes to production

- **Provision a database.** The API is written against MongoDB and proven
  against a real one by the smoke suite, which boots an ephemeral single-node
  replica set. What does not exist is a *standing* instance: no Atlas cluster,
  no `mongod` on this machine. Publish runs in a transaction, so it must be a
  replica set, not a standalone. Then `npm run db:setup && npm run db:seed`.
- **Password reset.** Email verification is wired up and mailed
  (`MAIL_TRANSPORT`, see `server/lib/mail.ts`); reset is not.
- Rate limits are in-process. Behind more than one instance, move to a Redis
  store or each replica gets its own budget.
- `helmet` CSP tuned for whatever domain serves the SPA.
- A real test suite. The smoke test covers happy paths and the main failure
  modes, not edge cases.
- Topic quota is currently bypassable only by direct database access, which is
  acceptable — but it is a product rule, not a security control. Do not start
  treating it as one.

### 3. Open product questions

- Does the topic quota help or frustrate people with a genuinely broad body of
  work? It is a flat 2 with no appeal path.
- Is "business model" vocabulary real users share, or an internal convenience?
  It is the newest axis and the least validated.
- Where is the honest line on verification — self-reported, reference-backed,
  employer-confirmed — and what does each cost?
- Do the guided templates raise quality enough to justify the completion cost,
  or does the free-form escape hatch quietly become the default?

### 4. Monetisation hypotheses (unvalidated, nothing is priced)

1. **Demand-side subscription** — free to be listed, paid to search and
   contact. Standard directory economics; keeps supply frictionless. Default.
2. **Team pages** — companies publish their own work. Aligns with the product
   because it is more evidence, not more ads.
3. **Talent-collective layer** — curated pools, commission on placement.
   Highest revenue per transaction and the largest risk to the directory's
   neutrality. Worth naming because it would change what the product is, and
   that should be a decision rather than a drift.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Craft / role** | What a person does. Eight values. Set per *entry*, not per person. |
| **Topic** | The industry or track something shipped in. Twelve values. |
| **Business model** | How the thing made money. Ten values. Third similarity axis. |
| **Entry / work** | One piece of portfolio work. The unit this product is about. |
| **Proof point** | A `detail` with `proof: true`. Surfaces on the card cover. |
| **Guided template** | Authoring mode that renders the craft's evidence schema. |
| **Own structure** | Authoring mode where the author writes their own headings. |
| **Topic quota** | Two published entries per topic, per person. |
| **Generated cover** | The drawn card image: a craft motif plus the headline metric. |
| **Author snapshot** | Denormalised author card fields stored on each work. |
| **searchBlob** | Denormalised lowercase haystack the regex search matches against. |
| **viewerHash** | Salted daily hash of IP + UA used to de-duplicate traffic. |
