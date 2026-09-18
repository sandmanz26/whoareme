# MongoDB design — whoareyou

Collections, validators, indexes and the exact queries the API runs. Everything
here is copy-pasteable into `mongosh`; the server executes the same pipelines
from `server/src/modules/*/queries.ts`.

Target: MongoDB 7.0+. Transactions are used on publish, so the deployment must
be a replica set — Atlas is one by default, and `docker-compose.yml` in
`server/` starts a single-node replica set for local work.

---

## 1. Collections at a glance

| Collection | Holds | Growth |
|---|---|---|
| `users` | Everyone in the directory: seeded people and real accounts | Slow |
| `works` | Portfolio entries, drafts and published | Medium |
| `sessions` | Refresh tokens (hashed), TTL-expired | Fast, self-pruning |
| `trafficEvents` | Append-only raw views and opens | Fast, TTL 400 days |
| `trafficDaily` | Per-owner per-day rollup, read by the panel | Slow |
| `thumbnails.*` | GridFS bucket for uploaded covers | Medium |
| `reports` | What readers flagged, TTL 400 days | Slow |
| `moderationActions` | The audit log. Append-only, never expires | Slow |
| `notices` | The same decisions, addressed to the people they were about, with their appeals | Slow |
| `siteSettings` | One document, `_id: "site"` | Static |
| `funnelDaily` | One document per day of funnel counters. No identifiers | One row a day |

Three deliberate denormalisations, all justified below:

- `works.author` — a snapshot of the author's card fields, so listing 24 cards
  is one query instead of a `$lookup` per page. It carries `years` and
  `languages` as well as the display fields, because the entry grid filters on
  those two and every listing matches on the work document alone.
- `users.counts.topicUsage` — published entries per topic, so the two-per-topic
  quota is an O(1) guarded update instead of a count-then-write race.
- `works.authorSuspended` — mirrors the author's suspension. The listings match
  on the work document alone, so without this a suspended profile would 404
  while its case studies stayed on the grid. Fanned out on suspend and
  reinstate, the same way the author snapshot is fanned out on a profile edit.

---

## 2. Document shapes

### `users`

```js
{
  _id:        ObjectId("..."),
  slug:       "rani-ardhana",          // stable public id, used in URLs
  name:       "Rani Ardhana",
  email:      "rani@example.com",      // null for seeded rows; unique when set
  passwordHash: "$argon2id$...",       // null for seeded rows
  emailVerifiedAt: null,

  role:       "design",                // one of the eight crafts
  title:      "Senior Product Designer",
  company:    "Notionary",
  location:   "Jakarta, ID",
  years:      7,
  languages:  ["English", "Bahasa Indonesia"],  // filter axis; seeded from the
                                       // country on register, editable after
  topics:     ["saas"],                // industries / tracks
  skills:     ["Design systems", "Figma", "Prototyping"],
  openToWork: true,
  photoUrl:   "https://randomuser.me/api/portraits/women/11.jpg",
  portfolioUrl: "https://rani.design",
  pitch:      "I turn messy enterprise workflows into interfaces...",

  seeded:     true,                    // fixture row, not a real signup
  status:     "active",                // active | suspended | deleted
  // Access level, separate from `role`. `role` is the person's craft and
  // carries no permission meaning; conflating the two would make every
  // designer a moderator of designers.
  access:     "member",                // member | moderator | admin

  counts: {
    publishedWorks: 2,
    topicUsage: { saas: 2, erp: 1 }    // drives the quota guard
  },

  searchBlob: "rani ardhana senior product designer notionary jakarta id design systems figma",

  createdAt:  ISODate(),
  updatedAt:  ISODate()
}
```

### `works`

```js
{
  _id:       ObjectId("..."),
  slug:      "checkout-throughput",
  authorId:  ObjectId("..."),

  // Denormalised author snapshot — refreshed when the profile changes.
  author: {
    slug: "elias-kovac", name: "Elias Kovač",
    title: "Staff Frontend Engineer", company: "Loopbase",
    photoUrl: "https://randomuser.me/api/portraits/men/3.jpg"
  },

  mode:      "template",               // template | custom
  role:      "engineering",
  topics:    ["saas"],
  model:     "b2b-saas",               // business model
  skills:    ["TypeScript", "Distributed systems", "Postgres"],

  title:     "Rebuilding checkout for 18k req/s",
  summary:   "Split a monolith's hottest read path...",
  year:      2025,
  duration:  "5 months",
  scope:     "Team of 6 · I owned the projection service",

  // template mode
  problem:   "Checkout p95 sat at 840ms...",
  approach:  "Moved the read path behind a CQRS projection...",
  outcome:   "Peak day ran unattended...",

  // custom mode
  sections:  [{ heading: "Why this was hard", body: "..." }],

  details:   [{ label: "Performance", value: "p95 840ms → 120ms", proof: true }],
  links:     [{ label: "Projection service", href: "https://github.com/..." }],
  stack:     ["TypeScript", "Postgres", "Kafka"],

  thumbnailId: ObjectId("...") | null, // GridFS file in `thumbnails`
  status:    "published",              // draft | published
  publishedAt: ISODate(),

  metrics:   { opens: 412 },           // denormalised counter, see §7

  searchBlob: "rebuilding checkout for 18k req/s split a monolith...",
  createdAt: ISODate(),
  updatedAt: ISODate()
}
```

`searchBlob` is a lowercased concatenation of the text fields plus skills,
author name and company. It exists so a multi-word query can be AND-ed as
substrings, which is how the UI behaves. See §6 for the trade-off and the
Atlas Search upgrade path.

### `reports`

Filed by readers, signed in or not. A report is a *request for review*, so it
carries no decision of its own: `resolvedAt` says a human looked, and what they
decided lives in `moderationActions`.

```js
{
  _id:        ObjectId("..."),
  targetKind: "work",                  // work | user
  targetId:   ObjectId("..."),
  reason:     "false-claim",           // false-claim | not-their-work |
                                       // confidential | spam | offensive | other
  note:       "The headline figure is not in the outcome.",
  // Salted daily hash of IP + UA, the same construction traffic uses. It
  // identifies nobody and rotates daily; it exists only so one person cannot
  // file the same complaint fifty times.
  reporterHash: "9f2c...",
  resolvedAt: null,                    // set when a moderator closes it
  resolvedBy: null,                    // ObjectId of the moderator
  createdAt:  ISODate("...")
}
```

### `moderationActions`

The audit log, and the only record that has to outlive everything it refers to.
**Append-only by contract:** nothing in the API updates or deletes a row here,
and there is no TTL index. A moderation record that can be edited is not a
record.

```js
{
  _id:         ObjectId("..."),
  action:      "unpublish",   // unpublish | republish | suspend | reinstate |
                              // dismiss | settings
  targetKind:  "work",        // null for settings changes
  targetId:    ObjectId("..."),
  // Denormalised so the log still reads correctly if the entry it names is
  // later removed.
  targetLabel: "Ordering that survives a dead signal",
  // Required at the schema level, minimum 12 characters at the API edge. An
  // audit log full of empty reasons is the same as no audit log.
  reason:      "Reported: headline figure unsupported by the outcome.",
  actorId:     ObjectId("..."),
  actorSlug:   "rangga-mahendra",
  createdAt:   ISODate("...")
}
```

### `siteSettings`

A single document. Settings are read on nearly every render, so splitting them
across rows would buy nothing and cost a join.

```js
{
  _id:      "site",
  contact:  { email: "hello@...", location: "Jakarta, ID", responseTime: "..." },
  copy:     { "footer.blurb": "..." },   // overrides, keyed by the SPA's slot ids
  disabledRoles: ["quality"],            // crafts withdrawn from the browse
                                         // controls. NOT a content filter:
                                         // entries keep their craft and stay
                                         // readable.
  updatedAt: ISODate("..."),
  updatedBy: ObjectId("...")
}
```

### `sessions`, `trafficEvents`, `trafficDaily`

```js
// sessions
{ _id, userId, tokenHash: "sha256...", userAgent, ip, createdAt, expiresAt }

// trafficEvents — append-only, one row per view/open
{ _id, ownerId, type: "profile_view" | "work_open", workId: ObjectId|null,
  day: "2026-09-11", viewerHash: "sha256(ip+ua+day)", createdAt }

// trafficDaily — rollup the panel reads
{ _id, ownerId, day: "2026-09-11",
  profile: 14, work: { "<workId>": 6, "<workId>": 2 }, total: 8 }
```

`viewerHash` is a salted daily hash of IP + user agent. It de-duplicates repeat
views within a day without storing anything that identifies a visitor, and it
rotates daily so it cannot be used to track across days.

---

## 3. Schema validators

Applied with `collMod` on startup (`server/src/db/schema.ts`) so bad documents
cannot be written even by a script that bypasses the API.

```js
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["slug", "name", "role", "status", "createdAt"],
      properties: {
        slug:   { bsonType: "string", pattern: "^[a-z0-9][a-z0-9-]{1,80}$" },
        name:   { bsonType: "string", minLength: 1, maxLength: 120 },
        email:  { bsonType: ["string", "null"], pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$" },
        role:   { enum: ["design","engineering","product","data","infra","quality","growth","research"] },
        years:  { bsonType: ["int", "null"], minimum: 0, maximum: 60 },
        topics: { bsonType: "array", maxItems: 12, items: { bsonType: "string" } },
        skills: { bsonType: "array", maxItems: 24, items: { bsonType: "string" } },
        status: { enum: ["active", "suspended", "deleted"] },
        access: { enum: ["member", "moderator", "admin"] },
        counts: {
          bsonType: "object",
          properties: {
            publishedWorks: { bsonType: "int", minimum: 0 },
            topicUsage:     { bsonType: "object" }
          }
        }
      }
    }
  },
  validationLevel: "moderate",   // don't reject updates to pre-existing rows
  validationAction: "error"
})

db.runCommand({
  collMod: "works",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["slug", "authorId", "mode", "role", "title", "status", "createdAt"],
      properties: {
        slug:    { bsonType: "string", pattern: "^[a-z0-9][a-z0-9-]{1,120}$" },
        mode:    { enum: ["template", "custom"] },
        role:    { enum: ["design","engineering","product","data","infra","quality","growth","research"] },
        status:  { enum: ["draft", "published"] },
        title:   { bsonType: "string", minLength: 1, maxLength: 90 },
        summary: { bsonType: "string", maxLength: 140 },
        year:    { bsonType: "int", minimum: 1980, maximum: 2100 },
        topics:  { bsonType: "array", maxItems: 4, items: { bsonType: "string" } },
        skills:  { bsonType: "array", maxItems: 8,  items: { bsonType: "string" } },
        model:   { enum: ["b2b-saas","consumer","marketplace","enterprise","platform",
                          "ecommerce","agency","open-source","deep-tech","public", null] },
        details: {
          bsonType: "array", maxItems: 12,
          items: {
            bsonType: "object", required: ["label", "value"],
            properties: {
              label: { bsonType: "string", maxLength: 60 },
              value: { bsonType: "string", maxLength: 200 },
              proof: { bsonType: "bool" }
            }
          }
        },
        links: {
          bsonType: "array", maxItems: 8,
          items: {
            bsonType: "object", required: ["href"],
            properties: {
              label: { bsonType: "string", maxLength: 60 },
              href:  { bsonType: "string", pattern: "^https?://" }
            }
          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
})
```

`topics: maxItems 4` and `skills: maxItems 8` mirror the UI limits. The
two-per-topic quota is *not* expressible here — it is cross-document, so it
lives in the guarded update in §5.

---

## 4. Indexes

Created idempotently on boot (`server/src/db/indexes.ts`).

```js
// ── users ───────────────────────────────────────────────────────────
db.users.createIndex({ slug: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } })
db.users.createIndex({ status: 1, role: 1, topics: 1 })      // directory filter
db.users.createIndex({ status: 1, skills: 1 })               // skill refinement
db.users.createIndex({ status: 1, languages: 1 })            // language filter (multikey)
db.users.createIndex({ status: 1, years: 1 })                // experience bands
db.users.createIndex({ status: 1, "counts.publishedWorks": -1, _id: 1 }) // default sort + stable tiebreak

// ── works ───────────────────────────────────────────────────────────
db.works.createIndex({ slug: 1 }, { unique: true })
db.works.createIndex({ status: 1, publishedAt: -1, _id: -1 })          // index page default sort
db.works.createIndex({ status: 1, role: 1, publishedAt: -1 })          // + craft filter
db.works.createIndex({ status: 1, topics: 1, publishedAt: -1 })        // + topic filter (multikey)
db.works.createIndex({ status: 1, model: 1, publishedAt: -1 })         // + business model
db.works.createIndex({ status: 1, skills: 1 })                         // skill facet + filter (multikey)
db.works.createIndex({ authorId: 1, status: 1, publishedAt: -1 })      // "more from this person"
db.works.createIndex({ status: 1, "metrics.opens": -1 })               // popularity sort
db.works.createIndex({ status: 1, "author.languages": 1 })             // language filter on entries (multikey)
db.works.createIndex({ status: 1, "author.years": 1 })                 // experience bands on entries

// One text index per collection is the hard limit — spend it on works.
db.works.createIndex(
  { title: "text", summary: "text", problem: "text", approach: "text", outcome: "text", skills: "text" },
  { weights: { title: 10, summary: 6, skills: 4, problem: 2, approach: 1, outcome: 1 },
    name: "works_text" }
)

// ── sessions ────────────────────────────────────────────────────────
db.sessions.createIndex({ tokenHash: 1 }, { unique: true })
db.sessions.createIndex({ userId: 1 })
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })   // TTL

// ── traffic ─────────────────────────────────────────────────────────
db.trafficEvents.createIndex({ ownerId: 1, day: 1 })
db.trafficEvents.createIndex({ ownerId: 1, type: 1, viewerHash: 1, day: 1, workId: 1 },
                             { unique: true })                         // dedupe per viewer per day
db.trafficEvents.createIndex({ createdAt: 1 }, { expireAfterSeconds: 34560000 })  // 400 days
db.trafficDaily.createIndex({ ownerId: 1, day: 1 }, { unique: true })
```

**Why compound order is `status → filter → sort`:** every listing filters on
`status: "published"` first, so it must lead the key. The sort field comes last
so Mongo can walk the index in order and avoid an in-memory sort. Adding
`_id: -1` to the default sort index gives a stable tiebreak for cursor
pagination.

**Multikey caution:** `topics` and `skills` are arrays. Mongo will not use two
multikey fields in one compound index, which is why `topics` and `skills` have
separate indexes rather than one combined key. A query filtering on both will
use one index and filter the rest in memory — acceptable at this cardinality,
and the point at which Atlas Search becomes the right answer.

---

### Moderation

```js
db.reports.createIndexes([
  // The queue: open reports, newest first.
  { key: { resolvedAt: 1, createdAt: -1 }, name: "reports_open_recent" },
  // How many open reports point at one entry.
  { key: { targetKind: 1, targetId: 1, resolvedAt: 1 }, name: "reports_target" },
  // One person filing the same complaint about the same thing on the same day
  // is one complaint. The hash rotates daily, so this cannot suppress a
  // genuine second report tomorrow.
  { key: { reporterHash: 1, targetKind: 1, targetId: 1, reason: 1 },
    unique: true, name: "reports_dedupe" },
  { key: { createdAt: 1 }, expireAfterSeconds: 400 * 24 * 60 * 60, name: "reports_ttl" },
])

db.moderationActions.createIndexes([
  { key: { createdAt: -1 }, name: "moderation_recent" },
  { key: { targetKind: 1, targetId: 1, createdAt: -1 }, name: "moderation_target" },
  { key: { actorId: 1, createdAt: -1 }, name: "moderation_actor" },
  // Deliberately no TTL. Raw reports expire; the decisions do not.
])
```

`siteSettings` has one document and needs no index beyond `_id`.

**`works.authorSuspended` is not indexed.** It is matched as `{ $ne: true }`,
which is not selective enough to earn its own key, and the listing indexes
already lead with `status`. Mongo walks those and filters the flag in memory.
Revisit if suspensions ever become common enough to matter, which would be its
own problem.

## 5. Write queries

### Publish, with the two-per-topic quota enforced atomically

The quota is cross-document, so it cannot be a validator. It is a **guarded
update**: the filter refuses to match if any target topic is already at the
cap, which makes check-and-increment a single atomic operation with no race.

```js
const session = client.startSession()
await session.withTransaction(async () => {
  const topics = ["saas", "finance"]

  // 1. Guarded increment. Fails to match if ANY topic is already at 2.
  const guard = await db.users.updateOne(
    {
      _id: authorId,
      status: "active",
      $nor: topics.map(t => ({ [`counts.topicUsage.${t}`]: { $gte: 2 } }))
    },
    {
      $inc: {
        "counts.publishedWorks": 1,
        ...Object.fromEntries(topics.map(t => [`counts.topicUsage.${t}`, 1]))
      },
      $set: { updatedAt: new Date() }
    },
    { session }
  )

  if (guard.matchedCount === 0) {
    throw new QuotaError(topics)   // → 409 with the offending topics
  }

  // 2. Flip the entry. `status: "draft"` in the filter makes it idempotent.
  const res = await db.works.updateOne(
    { _id: workId, authorId, status: "draft" },
    { $set: { status: "published", publishedAt: new Date(), updatedAt: new Date() } },
    { session }
  )
  if (res.matchedCount === 0) throw new ConflictError("Already published")
})
```

Unpublishing is the mirror image: `$inc` by `-1` guarded on `$gt: 0`, and the
entry flips back to `draft`.

### Keep the denormalised author snapshot fresh

Run whenever a profile field that appears on a card changes.

```js
db.works.updateMany(
  { authorId },
  { $set: {
      "author.name": user.name,
      "author.title": user.title,
      "author.company": user.company,
      "author.photoUrl": user.photoUrl,
      updatedAt: new Date()
  }}
)
```

### Moderation: unpublish, and release the topic slots

Moderation does not add a second "hidden" flag. `works.status` already decides
what the listings return, so a withheld entry is withheld by the same mechanism
an author's own unpublish uses: one code path, and no chance of two flags
drifting apart. Releasing the counters matters because leaving them would cost
the author a topic slot they are no longer using.

```js
const session = client.startSession()
await session.withTransaction(async () => {
  const work = await db.works.findOne({ _id: workId }, { session })
  await db.works.updateOne(
    { _id: workId },
    { $set: { status: "draft", publishedAt: null, updatedAt: new Date() } },
    { session },
  )
  await db.users.updateOne(
    { _id: work.authorId },
    { $inc: {
        "counts.publishedWorks": -1,
        ...Object.fromEntries(work.topics.map(t => [`counts.topicUsage.${t}`, -1])),
    } },
    { session },
  )
  await db.moderationActions.insertOne({ /* action, target, reason, actor */ }, { session })
})
```

### Moderation: suspend a person, and withhold their work with them

The entries keep `status: "published"`, so reinstating restores exactly what was
there rather than guessing which ones to bring back.

```js
await db.users.updateOne(
  { _id: userId },
  { $set: { status: "suspended", updatedAt: new Date() } },
)
await db.works.updateMany({ authorId: userId }, { $set: { authorSuspended: true } })
```

### Upsert a seeded fixture (idempotent re-seed)

```js
db.works.updateOne(
  { slug: "checkout-throughput" },
  { $set: { ...doc, updatedAt: new Date() },
    $setOnInsert: { createdAt: new Date(), metrics: { opens: 0 } } },
  { upsert: true }
)
```

---

## 6. Read queries

### Work index — filters, sort, pagination and facets in one round trip

`$facet` returns the page, the total and the skill/model facet counts together.
The facets are computed from the *filtered* set, so the chip row never offers a
filter that would return nothing.

```js
const match = {
  status: "published",
  ...(role   && { role }),
  ...(topic  && { topics: topic }),
  ...(model  && { model }),
  ...(skills?.length && { skills: { $all: skills } }),
  ...(tokens?.length && { $and: tokens.map(t => ({ searchBlob: { $regex: escapeRegex(t) } })) })
}

const sortStage = {
  recent:  { publishedAt: -1, _id: -1 },
  title:   { title: 1, _id: 1 },
  role:    { role: 1, publishedAt: -1 },
  popular: { "metrics.opens": -1, _id: -1 }
}[sort ?? "recent"]

db.works.aggregate([
  { $match: match },
  { $facet: {
      items: [
        { $sort: sortStage },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: {
            slug: 1, title: 1, summary: 1, role: 1, topics: 1, model: 1, skills: 1,
            year: 1, thumbnailId: 1, author: 1, publishedAt: 1,
            // Only the proof rows are needed for a card.
            details: { $filter: { input: "$details", as: "d", cond: { $eq: ["$$d.proof", true] } } }
        }}
      ],
      total:  [ { $count: "value" } ],
      skills: [
        { $unwind: "$skills" },
        { $group: { _id: "$skills", n: { $sum: 1 } } },
        { $sort: { n: -1, _id: 1 } },
        { $limit: 14 }
      ],
      models: [ { $group: { _id: "$model", n: { $sum: 1 } } }, { $sort: { n: -1 } } ]
  }},
  { $addFields: { total: { $ifNull: [ { $first: "$total.value" }, 0 ] } } }
])
```

> **On the `searchBlob` regex.** An unanchored regex cannot use an index, so
> search does a filtered collection scan. At a few thousand entries that is
> single-digit milliseconds and it exactly matches the UI's AND-of-substrings
> behaviour, which `$text` (OR of stemmed terms) does not. Above ~50k entries,
> switch to Atlas Search — the drop-in replacement is a `$search` stage with a
> `compound.must` of `text` clauses, and `works_text` exists as the portable
> middle option (`{ $text: { $search: q } }`, sorted by
> `{ score: { $meta: "textScore" } }`).

### Similar work — the three-axis score

Mirrors `src/lib/similar.ts` exactly: skills capped at 3, topic and model
weighted equally above them, one result per author.

```js
db.works.aggregate([
  { $match: {
      status: "published",
      _id:      { $ne: target._id },
      authorId: { $ne: target.authorId },
      // Cheap pre-filter so scoring only runs on plausible candidates.
      $or: [
        { skills: { $in: target.skills } },
        { topics: { $in: target.topics } },
        ...(target.model ? [{ model: target.model }] : [])
      ]
  }},
  { $addFields: {
      sharedSkills: { $setIntersection: ["$skills", target.skills] },
      sharedTopics: { $setIntersection: ["$topics", target.topics] }
  }},
  { $addFields: {
      score: { $add: [
        { $multiply: [ { $min: [ { $size: "$sharedSkills" }, 3 ] }, 2 ] },  // language axis, capped
        { $multiply: [ { $size: "$sharedTopics" }, 3 ] },                   // topic axis
        { $cond: [ { $eq: ["$model", target.model] }, 3, 0 ] },             // business model axis
        { $cond: [ { $eq: ["$role",  target.role ] }, 1, 0 ] }
      ]}
  }},
  { $match: { score: { $gt: 0 } } },
  { $sort:  { score: -1, publishedAt: -1 } },

  // One entry per author: three projects by one person is a worse reference
  // set than three by three people, and their own work has its own section.
  { $group: { _id: "$authorId", doc: { $first: "$$ROOT" } } },
  { $replaceRoot: { newRoot: "$doc" } },
  { $sort:  { score: -1, publishedAt: -1 } },
  { $limit: 3 },

  { $project: {
      slug: 1, title: 1, summary: 1, role: 1, topics: 1, model: 1, skills: 1,
      year: 1, thumbnailId: 1, author: 1, score: 1,
      sharedSkills: 1, sharedTopics: 1,
      sameModel: { $eq: ["$model", target.model] },
      details: { $filter: { input: "$details", as: "d", cond: { $eq: ["$$d.proof", true] } } }
  }}
])
```

The `$or` pre-filter matters: without it every published entry is scored on
every detail-page load. With it, the candidate set is index-selected on
`skills`, `topics` or `model` first.

### More from the same author

```js
db.works.find(
  { authorId: target.authorId, _id: { $ne: target._id }, status: "published" },
  { projection: { slug:1, title:1, summary:1, role:1, topics:1, model:1, skills:1,
                  year:1, thumbnailId:1, author:1, details:1 } }
).sort({ publishedAt: -1 }).limit(3)
```

### Directory listing with role and topic counts

```js
db.users.aggregate([
  { $match: {
      status: "active",
      ...(role  && { role }),
      ...(topic && { topics: topic }),
      ...(skills?.length && { skills: { $all: skills } }),
      ...(tokens?.length && { $and: tokens.map(t => ({ searchBlob: { $regex: escapeRegex(t) } })) })
  }},
  { $facet: {
      items: [
        { $sort: { "counts.publishedWorks": -1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { slug:1, name:1, title:1, company:1, location:1, role:1,
                      topics:1, skills:1, years:1, openToWork:1, photoUrl:1,
                      publishedWorks: "$counts.publishedWorks" } }
      ],
      total: [ { $count: "value" } ]
  }}
])

// Counts for the craft grid and the topic rail — unfiltered, cacheable.
db.users.aggregate([
  { $match: { status: "active" } },
  { $facet: {
      byRole:  [ { $group: { _id: "$role", n: { $sum: 1 } } } ],
      byTopic: [ { $unwind: "$topics" }, { $group: { _id: "$topics", n: { $sum: 1 } } } ],
      total:   [ { $count: "value" } ]
  }}
])
```

### Case study by slug

```js
db.works.findOne({ slug, status: "published" })
// Author card fields are embedded; a $lookup is only needed for the full
// profile page, which fetches the user by `author.slug` separately.
```

---

## 7. Traffic

Two writes per event, both cheap, so the panel never aggregates raw events at
read time.

```js
// 1. Raw event. The unique index makes repeat views in the same day a no-op.
try {
  await db.trafficEvents.insertOne({
    ownerId, type: "work_open", workId, day: "2026-09-11",
    viewerHash, createdAt: new Date()
  })
} catch (e) {
  if (e.code === 11000) return   // already counted this viewer today
  throw e
}

// 2. Rollup.
await db.trafficDaily.updateOne(
  { ownerId, day: "2026-09-11" },
  { $inc: { [`work.${workId}`]: 1, total: 1 }, $setOnInsert: { profile: 0 } },
  { upsert: true }
)

// 3. Denormalised counter for the "popular" sort.
await db.works.updateOne({ _id: workId }, { $inc: { "metrics.opens": 1 } })
```

Reading the panel — 30 days plus per-entry totals, one query:

```js
db.trafficDaily.aggregate([
  { $match: { ownerId, day: { $gte: "2026-08-13", $lte: "2026-09-11" } } },
  { $sort: { day: 1 } },
  { $group: {
      _id: null,
      days:          { $push: { day: "$day", profile: "$profile", work: "$total" } },
      profileTotal:  { $sum: "$profile" },
      workTotal:     { $sum: "$total" },
      perWork:       { $push: "$work" }
  }},
  { $project: {
      _id: 0, days: 1, profileTotal: 1, workTotal: 1,
      perWork: { $mergeObjects: "$perWork" }   // NOTE: last-wins, see below
  }}
])
```

> `$mergeObjects` over daily maps takes the last value rather than summing.
> The server therefore sums `perWork` in application code after fetching the
> daily rows — a pure-pipeline alternative is `$objectToArray` → `$unwind` →
> `$group` by key, which is included in
> `server/src/modules/traffic/queries.ts` as `perWorkTotalsPipeline`.

Days with no traffic have no document. The API fills the gaps so the chart has
30 bars — the client should not have to know that absence means zero.

---

## 8. Operational notes

### Moderation retention

Raw reports expire after 400 days; `moderationActions` never does. That
asymmetry is deliberate: the complaint is transient evidence, the decision is
the accountable record, and a log that quietly deletes itself cannot answer the
question it exists for. If a jurisdiction ever requires erasure of a specific
action, that is a targeted, logged operation, not a TTL.


- **Backfill `searchBlob`** after changing which fields feed it:
  ```js
  db.works.updateMany({}, [{ $set: { searchBlob: { $toLower: {
    $concat: ["$title", " ", "$summary", " ", { $reduce: {
      input: "$skills", initialValue: "", in: { $concat: ["$$value", " ", "$$this"] } } }]
  }}}}])
  ```
- **Reconcile the quota counters** if they ever drift (they should not, but a
  crashed migration could):
  ```js
  db.works.aggregate([
    { $match: { status: "published" } },
    { $unwind: "$topics" },
    { $group: { _id: { a: "$authorId", t: "$topics" }, n: { $sum: 1 } } }
  ])
  // compare against users.counts.topicUsage, then $set the truth
  ```
  `server/src/scripts/reconcile-counts.ts` does this and is safe to run live.
- **Explain before shipping a new filter:** `db.works.find(q).explain("executionStats")`
  and check `totalDocsExamined` is close to `nReturned`. A jump means the new
  predicate lost the index.
- **Retention:** `trafficEvents` self-prune at 400 days via TTL. `trafficDaily`
  is kept indefinitely — it is tiny and it is the only long-range history.


---

## 9. What was added after the filter bar grew

Three things landed in the database after the first pass, each because the SPA
had grown a capability the API could not answer. They are grouped here because
they share one lesson: **every axis the interface filters on has to exist in
the query, or the filter silently returns the wrong set.**

### `users.languages`, and `works.author.years` / `works.author.languages`

The filter bar gained an experience band and a language. Both are properties of
a *person*, and the entry grid matches on the work document alone — so both are
carried on the author snapshot and fanned out by `updateProfile`, exactly as
`authorSuspended` is fanned out on suspension.

Both filters are OR-ed within themselves and AND-ed against everything else.
`skills` remains the deliberate exception, AND-ed within itself, because "React
and Go" means somebody who has both.

```js
// Experience: an OR of half-open ranges, so the bands tile with no overlap.
{ $or: [
  { "author.years": { $gte: 5,  $lt: 10 } },
  { "author.years": { $gte: 10, $lt: 15 } },
]}
```

A database seeded before these fields existed is not invalid — the validators
run at `validationLevel: "moderate"` — it is simply invisible to those two
filters, which is the worst kind of wrong: nothing errors and results are
quietly missing. `npm run db:backfill` repairs it and is idempotent.

### `notices`

The audit log answers "what did we do". A notice is the same decision read from
the other end: "what was done to me, and why". Only the second discharges the
obligation, because a reason filed where the author cannot read it is
bookkeeping.

```js
{
  _id:        ObjectId("..."),
  userId:     ObjectId("..."),   // addressed to
  actionId:   ObjectId("..."),   // the audit row this restates
  action:     "unpublish",
  targetKind: "work",
  targetId:   ObjectId("..."),
  targetLabel:"Cutting cold-start on a serverless API",
  reason:     "The headline figure is not supported by the outcome.",
  actorId:    ObjectId("..."),   // kept so an appeal can refuse this reviewer
  createdAt:  ISODate("..."),
  readAt:     null,
  appeal: {
    text:          "The figure is in the details block, labelled Performance.",
    createdAt:     ISODate("..."),
    outcome:       "overturned",   // or "upheld", or null while open
    outcomeReason: "The figure is where the author says it is.",
    decidedAt:     ISODate("..."),
    decidedBy:     ObjectId("..."),
  },
}
```

The notice is written in the same transaction as the action, never as a
follow-up. The appeal is embedded rather than a collection of its own: it is
only ever read with its notice, there is at most one, and it is bounded.

```js
db.notices.createIndex({ userId: 1, createdAt: -1 })                  // the author's list
db.notices.createIndex({ "appeal.outcome": 1, "appeal.createdAt": 1 }) // the reviewer's queue
db.notices.createIndex({ actionId: 1 })
// No TTL, for the same reason the audit log has none.
```

Two rules are enforced in the service, not the interface, because the interface
is not the thing that has to hold:

1. An appeal is reviewed by somebody **other than** whoever took the decision.
2. `overturned` performs the actual reversal — republish or reinstate — before
   the outcome is recorded. An appeal marked upheld with nothing undone would
   be worse than no appeal, because it would look like recourse.

### `funnelDaily`

One document per day, `$inc` only, so concurrent writers never race and there
is nothing to merge.

```js
{ _id: "2026-09-18", counts: { signup_opened: 42, signup_completed: 11 }, updatedAt: ISODate("...") }
```

The validator sets `additionalProperties: false` on both levels. That is the
point: this collection *could not* hold a visitor id, a path or a referrer even
if a later version of the client started sending one. It answers "do people
finish", which needs counters, not "did this person finish", which would need a
behavioural record.
