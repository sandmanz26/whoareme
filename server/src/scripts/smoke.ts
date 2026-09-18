/**
 * End-to-end smoke test.
 *
 * Boots the real app against an ephemeral single-node replica set (transactions
 * need one), seeds the fixtures, and exercises every route a client uses —
 * including the paths that are easy to get wrong: refresh-token rotation, the
 * two-per-topic quota under a third publish, and traffic de-duplication.
 *
 *   npm run test:smoke
 *
 * No external services required; the mongod binary is cached after the first
 * run. Exits non-zero on the first failed assertion group.
 */
import { readFileSync } from "node:fs"
import { MongoMemoryReplSet } from "mongodb-memory-server"

/**
 * Expectations come from the fixtures, not from literals.
 *
 * This test previously asserted "total is 36" and named one seeded slug. The
 * fixtures were later regenerated and every one of those numbers went stale,
 * so the suite failed for reasons that had nothing to do with the API. Reading
 * the same file the seed reads keeps the assertions about behaviour.
 */
const ALL_WORKS: Array<{ id: string; authorId: string; role: string; skills: string[] }> =
  JSON.parse(readFileSync(new URL("../../fixtures/works.json", import.meta.url), "utf8"))
const ALL_PEOPLE: Array<{ id: string; role: string; years: number; languages?: string[] }> =
  JSON.parse(readFileSync(new URL("../../fixtures/people.json", import.meta.url), "utf8"))

/**
 * The public API serves the launch scope, so the public assertions count over
 * it too. The seed still writes every fixture row - a craft marked `soon` is
 * withheld, not deleted - which is why the seed assertions below count the
 * full files and everything after them counts the live subset.
 */
const LIVE = new Set(["design", "engineering", "product", "infra"])
const FIXTURE_WORKS = ALL_WORKS.filter((w) => LIVE.has(w.role))
const FIXTURE_PEOPLE = ALL_PEOPLE.filter((p) => LIVE.has(p.role))
const SOON_PERSON = ALL_PEOPLE.find((p) => !LIVE.has(p.role))!
const SOON_WORK = ALL_WORKS.find((w) => !LIVE.has(w.role))!

/** An author with more than one entry, so "more from this person" has something
 *  to return regardless of which fixtures are loaded. */
const WORKS_BY_AUTHOR = new Map<string, string[]>()
for (const work of FIXTURE_WORKS) {
  WORKS_BY_AUTHOR.set(work.authorId, [...(WORKS_BY_AUTHOR.get(work.authorId) ?? []), work.id])
}
const PROLIFIC = [...WORKS_BY_AUTHOR.entries()].find(([, slugs]) => slugs.length > 1)!
const SAMPLE_SLUG = PROLIFIC[1][0]
const SAMPLE_MORE = PROLIFIC[1].length - 1

/**
 * A language some live author actually speaks.
 *
 * Named rather than hard-coded for the reason at the top of this file: an
 * earlier version of this block asked for Thai, which nobody in the launch
 * scope speaks, so the assertion failed on the fixtures rather than on the
 * API. English is skipped because everybody has it, which would make the
 * filter indistinguishable from no filter.
 */
const PEOPLE_BY_ID = new Map(FIXTURE_PEOPLE.map((person) => [person.id, person]))
const LANGUAGE_COUNTS = new Map<string, number>()
for (const work of FIXTURE_WORKS) {
  for (const language of PEOPLE_BY_ID.get(work.authorId)?.languages ?? []) {
    LANGUAGE_COUNTS.set(language, (LANGUAGE_COUNTS.get(language) ?? 0) + 1)
  }
}
const SAMPLE_LANGUAGE = [...LANGUAGE_COUNTS.entries()]
  .filter(([language]) => language !== "English")
  .sort((a, b) => b[1] - a[1])[0]![0]

const SKILL_COUNTS = new Map<string, number>()
for (const work of FIXTURE_WORKS) {
  for (const skill of work.skills) SKILL_COUNTS.set(skill, (SKILL_COUNTS.get(skill) ?? 0) + 1)
}
const [SAMPLE_SKILL, SAMPLE_SKILL_COUNT] = [...SKILL_COUNTS.entries()].sort(
  (a, b) => b[1] - a[1],
)[0]!

const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } })
const uri = rs.getUri("whoareyou")

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "4123",
  LOG_LEVEL: "warn",
  MONGODB_URI: uri,
  MONGODB_DB: "whoareyou",
  JWT_ACCESS_SECRET: "smoke-access-secret-0123456789",
  JWT_REFRESH_SECRET: "smoke-refresh-secret-0123456789",
  VIEWER_HASH_SALT: "smoke-viewer-salt",
  CORS_ORIGINS: "http://localhost:9800",
})

const { connect, disconnect } = await import("../db/client.js")
const { applyValidators } = await import("../db/schema.js")
const { ensureIndexes } = await import("../db/indexes.js")
const { createApp } = await import("../app.js")

await connect()
await applyValidators()
await ensureIndexes()

const { users, works } = await import("../db/collections.js")

const app = createApp()
const server = app.listen(4123)
const base = "http://127.0.0.1:4123"

let pass = 0
let fail = 0
function check(name: string, ok: boolean, extra = "") {
  if (ok) { pass += 1; console.log(`  ok   ${name}`) }
  else { fail += 1; console.log(`  FAIL ${name} ${extra}`) }
}

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(base + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  return { status: res.status, json, headers: res.headers }
}

// ── seed via the exported helpers ────────────────────────────────────
{
  const { execSync } = await import("node:child_process")
  execSync(`MONGODB_URI='${uri}' MONGODB_DB=whoareyou NODE_ENV=test LOG_LEVEL=warn ` +
    `JWT_ACCESS_SECRET=smoke-access-secret-0123456789 ` +
    `JWT_REFRESH_SECRET=smoke-refresh-secret-0123456789 ` +
    `VIEWER_HASH_SALT=smoke-viewer-salt ` +
    `npx tsx src/scripts/seed.ts`, { stdio: "inherit" })
  check(`seed: ${ALL_PEOPLE.length} users inserted`,
    (await users().countDocuments()) === ALL_PEOPLE.length,
    String(await users().countDocuments()))
  check(`seed: ${ALL_WORKS.length} works inserted`,
    (await works().countDocuments()) === ALL_WORKS.length,
    String(await works().countDocuments()))
  const seededLanguages = await users().findOne({ slug: FIXTURE_PEOPLE[0]!.id })
  check("seed: languages carried onto the person",
    (seededLanguages?.languages ?? []).length > 0, JSON.stringify(seededLanguages?.languages))
  const snapshot = await works().findOne({ slug: FIXTURE_WORKS[0]!.id })
  check("seed: author snapshot carries years and languages",
    typeof snapshot?.author.years === "number" && Array.isArray(snapshot?.author.languages),
    JSON.stringify({ years: snapshot?.author.years, languages: snapshot?.author.languages }))
  // The counters are derived from the seed, so check them against the author
  // the fixtures actually give the most entries to.
  const withCounts = await users().findOne({ slug: PROLIFIC[0] })
  check("seed: counters derived", withCounts?.counts.publishedWorks === PROLIFIC[1].length,
    `${withCounts?.counts.publishedWorks}, expected ${PROLIFIC[1].length}`)
}

console.log("\n── public reads ──")
{
  const health = await api("/api/health")
  check("GET /api/health", health.status === 200 && health.json.ok === true)

  const list = await api("/api/work?limit=6")
  check("GET /api/work", list.status === 200 && list.json.items.length === 6)
  check(`  total is ${FIXTURE_WORKS.length}`, list.json.meta.total === FIXTURE_WORKS.length,
    String(list.json.meta.total))
  check("  skill facets present", list.json.facets.skills.length > 0)
  check("  model facets present", list.json.facets.models.length > 0)
  check("  cards carry only proof details",
    list.json.items.every((w: any) => w.details.every((d: any) => d.proof === true)))

  const filtered = await api("/api/work?role=engineering&topic=saas")
  check("GET /api/work?role&topic", filtered.status === 200 && filtered.json.meta.total > 0,
    String(filtered.json?.meta?.total))

  const skillFiltered = await api(`/api/work?skills=${encodeURIComponent(SAMPLE_SKILL)}`)
  check("GET /api/work?skills", skillFiltered.json.meta.total === SAMPLE_SKILL_COUNT,
    `${skillFiltered.json.meta.total} for ${SAMPLE_SKILL}, expected ${SAMPLE_SKILL_COUNT}`)

  const searched = await api("/api/work?q=rust%20edge")
  check("GET /api/work?q AND-s tokens", searched.json.meta.total >= 1, String(searched.json.meta.total))

  const detail = await api(`/api/work/${SAMPLE_SLUG}`)
  check("GET /api/work/:slug", detail.status === 200 && detail.json.work.slug === SAMPLE_SLUG,
    String(detail.status))
  check("  moreByAuthor", detail.json.moreByAuthor.length === SAMPLE_MORE,
    `${detail.json.moreByAuthor?.length}, expected ${SAMPLE_MORE}`)
  check("  similar returns 3", detail.json.similar.length === 3, String(detail.json.similar.length))
  check("  similar is scored", detail.json.similar.every((s: any) => s.score > 0))
  check("  similar de-duped by author",
    new Set(detail.json.similar.map((s: any) => s.author.slug)).size === detail.json.similar.length)

  const missing = await api("/api/work/does-not-exist")
  check("GET unknown slug → 404", missing.status === 404)

  const people = await api("/api/people?limit=5")
  check("GET /api/people", people.status === 200 && people.json.items.length === 5)
  const facets = await api("/api/people/facets")
  check("GET /api/people/facets", facets.status === 200 && facets.json.total === FIXTURE_PEOPLE.length,
    `${facets.json?.total}, expected ${FIXTURE_PEOPLE.length}`)
  check("  facets count languages", Object.keys(facets.json.languages ?? {}).length > 0,
    JSON.stringify(facets.json?.languages))
}

console.log("\n── launch scope ──")
{
  const taxonomy = await api("/api/taxonomy")
  check("GET /api/taxonomy", taxonomy.status === 200)
  check("  names the live crafts",
    taxonomy.json.roles.filter((r: any) => r.status === "live").length === LIVE.size,
    JSON.stringify(taxonomy.json?.roles))
  check("  topics carry their kind",
    taxonomy.json.topics.some((t: any) => t.kind === "practice") &&
      taxonomy.json.topics.some((t: any) => t.kind === "industry"))
  check("  states the topic quota", taxonomy.json.topicQuota === 2, String(taxonomy.json?.topicQuota))
  check("  lists experience bands and languages",
    taxonomy.json.experience.length === 4 && taxonomy.json.languages.length > 1)

  // A craft that is not open yet is withheld, not deleted: the row is in the
  // database (the seed assertions above counted it) and the public reads skip it.
  const soonProfile = await api(`/api/people/${SOON_PERSON.id}`)
  check("profile in a craft that is not live → 404", soonProfile.status === 404, String(soonProfile.status))
  const soonEntry = await api(`/api/work/${SOON_WORK.id}`)
  check("entry in a craft that is not live → 404", soonEntry.status === 404, String(soonEntry.status))
  const stillThere = await users().countDocuments({ slug: SOON_PERSON.id })
  check("  but the row is still there", stillThere === 1, String(stillThere))

  const soonFilter = await api(`/api/work?role=${SOON_WORK.role}`)
  check("filtering by a craft that is not live returns nothing",
    soonFilter.json.meta.total === 0, String(soonFilter.json?.meta?.total))
}

console.log("\n── experience and language filters ──")
{
  const band = await api("/api/people?experience=5-9&limit=48")
  const expected = FIXTURE_PEOPLE.filter((p) => p.years >= 5 && p.years < 10).length
  check("GET /api/people?experience", band.json.meta.total === expected,
    `${band.json?.meta?.total}, expected ${expected}`)
  check("  every result is inside the band",
    (band.json.items ?? []).every((p: any) => p.years >= 5 && p.years < 10))

  const twoBands = await api("/api/people?experience=5-9,10-14&limit=48")
  const expectedTwo = FIXTURE_PEOPLE.filter((p) => p.years >= 5 && p.years < 15).length
  check("  bands OR together", twoBands.json.meta.total === expectedTwo,
    `${twoBands.json?.meta?.total}, expected ${expectedTwo}`)

  const language = SAMPLE_LANGUAGE
  const byLanguage = await api(`/api/people?language=${encodeURIComponent(language)}&limit=48`)
  const expectedLang = FIXTURE_PEOPLE.filter((p) => (p.languages ?? []).includes(language)).length
  check("GET /api/people?language", byLanguage.json.meta.total === expectedLang,
    `${byLanguage.json?.meta?.total}, expected ${expectedLang}`)

  const both = await api(`/api/people?language=${encodeURIComponent(language)}&experience=15&limit=48`)
  const expectedBoth = FIXTURE_PEOPLE.filter(
    (p) => (p.languages ?? []).includes(language) && p.years >= 15,
  ).length
  check("  facets AND across axes", both.json.meta.total === expectedBoth,
    `${both.json?.meta?.total}, expected ${expectedBoth}`)

  // The same two axes on entries, answered from the denormalised snapshot.
  const workByLanguage = await api(`/api/work?language=${encodeURIComponent(language)}&limit=48`)
  check("GET /api/work?language", workByLanguage.status === 200 && workByLanguage.json.meta.total > 0,
    String(workByLanguage.json?.meta?.total))
  check("  every entry's author speaks it",
    (workByLanguage.json.items ?? []).every((w: any) => w.author.languages.includes(language)))

  const workByBand = await api("/api/work?experience=15&limit=48")
  check("GET /api/work?experience",
    (workByBand.json.items ?? []).every((w: any) => w.author.years >= 15),
    JSON.stringify((workByBand.json.items ?? []).map((w: any) => w.author.years)))

  const nonsense = await api("/api/work?experience=not-a-band&limit=6")
  check("an unknown band is ignored, not rejected", nonsense.status === 200, String(nonsense.status))

  const listFacets = await api("/api/work?limit=6")
  check("  work facets include languages and bands",
    listFacets.json.facets.languages.length > 0 && listFacets.json.facets.experience.length > 0,
    JSON.stringify(listFacets.json?.facets?.experience))
}

console.log("\n── auth ──")
let accessToken = ""
let cookie = ""
{
  const bad = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "x", email: "not-an-email", password: "short" }),
  })
  check("register validation → 400", bad.status === 400 && bad.json.error.code === "validation_failed")

  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Chandra Wijaya", email: "ai3@bluesilo.studio", password: "correct-horse-battery",
      location: "Jakarta, ID", role: "design", title: "Principal Product Designer",
      years: 9, topics: ["saas"], portfolioUrl: "https://chandra.studio", pitch: "",
    }),
  })
  check("POST /api/auth/register → 201", reg.status === 201, JSON.stringify(reg.json).slice(0, 200))
  accessToken = reg.json.accessToken
  cookie = reg.headers.get("set-cookie")?.split(";")[0] ?? ""
  check("  slug generated", reg.json.user.slug === "chandra-wijaya", reg.json.user?.slug)
  check("  refresh cookie is httpOnly",
    (reg.headers.get("set-cookie") ?? "").toLowerCase().includes("httponly"))

  const dupe = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Someone Else", email: "ai3@bluesilo.studio", password: "correct-horse-battery",
      location: "Bali, ID", role: "design", title: "Designer", years: 3, topics: ["saas"],
    }),
  })
  check("duplicate email → 409", dupe.status === 409, String(dupe.status))

  const soonCraft = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Too Early", email: "early@example.com", password: "correct-horse-battery",
      location: "Jakarta, ID", role: "growth", title: "Growth Lead", years: 4, topics: ["saas"],
    }),
  })
  check("register into a craft that is not live → 400", soonCraft.status === 400, String(soonCraft.status))

  const me0 = await api("/api/auth/me", { headers: { authorization: `Bearer ${accessToken}` } })
  check("  registration derived languages from the country",
    (me0.json.user?.languages ?? []).includes("Bahasa Indonesia"),
    JSON.stringify(me0.json.user?.languages))

  const wrongPw = await api("/api/auth/login", {
    method: "POST", body: JSON.stringify({ email: "ai3@bluesilo.studio", password: "nope" }),
  })
  check("wrong password → 401", wrongPw.status === 401)

  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "ai3@bluesilo.studio", password: "correct-horse-battery" }),
  })
  check("POST /api/auth/login → 200", login.status === 200)
  accessToken = login.json.accessToken

  const me = await api("/api/auth/me", { headers: { authorization: `Bearer ${accessToken}` } })
  check("GET /api/auth/me", me.status === 200 && me.json.user.email === "ai3@bluesilo.studio")

  const noAuth = await api("/api/auth/me")
  check("me without token → 401", noAuth.status === 401)

  const refresh = await api("/api/auth/refresh", { method: "POST", headers: { cookie } })
  check("POST /api/auth/refresh", refresh.status === 200 && Boolean(refresh.json.accessToken))
  const replay = await api("/api/auth/refresh", { method: "POST", headers: { cookie } })
  check("refresh token rotates (replay → 401)", replay.status === 401, String(replay.status))
}

console.log("\n── authoring, quota, traffic ──")
const auth = () => ({ authorization: `Bearer ${accessToken}` })

console.log("\n── email verification ──")
{
  const gate = await api("/api/work", {
    method: "POST", headers: auth(),
    body: JSON.stringify({
      mode: "template", role: "design", topics: ["saas"], model: "b2b-saas",
      skills: ["Design systems"],
      title: "Gate check", summary: "A draft that exists only to test the publish gate.",
      year: 2026, duration: "1 month", scope: "Solo",
      problem: "The gate needed a draft to refuse.", approach: "Wrote one.",
      outcome: "It refused.",
      details: [{ label: "Task success", value: "0 to 1", proof: true }],
      links: [], stack: [], sections: [],
    }),
  })
  const draftId = gate.json?.work?._id
  check("draft created for the gate check", gate.status === 201 && !!draftId,
    `${gate.status} ${JSON.stringify(gate.json?.error ?? "").slice(0, 120)}`)

  if (draftId) {
    const blocked = await api(`/api/work/${draftId}/publish`, { method: "POST", headers: auth() })
    check("publish before verifying → 403", blocked.status === 403, String(blocked.status))
    check("  names the reason", blocked.json?.error?.code === "email_unverified",
      JSON.stringify(blocked.json?.error?.code))
  }

  const requested = await api("/api/auth/verify/request", { method: "POST", headers: auth() })
  check("POST /api/auth/verify/request", requested.status === 200 && !!requested.json.token,
    String(requested.status))
  check("  marks how it was delivered", requested.json.deliveredBy === "response")

  const badToken = await api("/api/auth/verify/confirm", {
    method: "POST", body: JSON.stringify({ token: "x".repeat(32) }),
  })
  check("confirm with a wrong token → 400", badToken.status === 400, String(badToken.status))

  const confirmed = await api("/api/auth/verify/confirm", {
    method: "POST", body: JSON.stringify({ token: requested.json.token }),
  })
  check("POST /api/auth/verify/confirm", confirmed.status === 200, String(confirmed.status))

  const replay = await api("/api/auth/verify/confirm", {
    method: "POST", body: JSON.stringify({ token: requested.json.token }),
  })
  check("  token is single use (replay → 400)", replay.status === 400, String(replay.status))

  const me = await api("/api/auth/me", { headers: auth() })
  check("  me reports the address as verified", !!me.json.user?.emailVerifiedAt,
    JSON.stringify(me.json.user?.emailVerifiedAt))
}

{
  const draftBody = (title: string, topics: string[]) => JSON.stringify({
    mode: "template", role: "engineering", topics, model: "b2b-saas",
    skills: ["TypeScript", "Performance"],
    title, summary: "Cold starts added 1.9s to the first request after a deploy.",
    year: 2025, duration: "3 months", scope: "Solo, 40 endpoints",
    problem: "Every deploy reset the pool.", approach: "Traffic-shaped warmer.",
    outcome: "Cold starts left the p99.",
    details: [{ label: "Performance", value: "p99 2.4s → 310ms", proof: true }],
    links: [{ label: "Repo", href: "https://github.com/chandra/warmer" }],
    stack: [], sections: [],
  })

  const c1 = await api("/api/work", { method: "POST", headers: auth(), body: draftBody("Cutting cold-start on a serverless API", ["saas"]) })
  check("POST /api/work → 201 draft", c1.status === 201 && c1.json.work.status === "draft",
    JSON.stringify(c1.json).slice(0, 300))
  check("  entry role may differ from profile craft",
    c1.json.work.role === "engineering" && c1.json.work.author.slug === "chandra-wijaya")
  const id1 = c1.json.work._id

  const notMine = await api("/api/work/mine/507f1f77bcf86cd799439011", { headers: auth() })
  check("other people's entry → 404/403", notMine.status === 404 || notMine.status === 403)

  const p1 = await api(`/api/work/${id1}/publish`, { method: "POST", headers: auth() })
  check("publish #1 → 200", p1.status === 200 && p1.json.work.status === "published",
    JSON.stringify(p1.json).slice(0, 200))

  const c2 = await api("/api/work", { method: "POST", headers: auth(), body: draftBody("A second SaaS entry", ["saas"]) })
  const p2 = await api(`/api/work/${c2.json.work._id}/publish`, { method: "POST", headers: auth() })
  check("publish #2 in same topic → 200", p2.status === 200)

  const c3 = await api("/api/work", { method: "POST", headers: auth(), body: draftBody("A third SaaS entry", ["saas"]) })
  const p3 = await api(`/api/work/${c3.json.work._id}/publish`, { method: "POST", headers: auth() })
  check("publish #3 in same topic → 409 quota", p3.status === 409 && p3.json.error.code === "topic_quota_exceeded",
    `${p3.status} ${JSON.stringify(p3.json?.error)}`)
  check("  quota error names the topic", p3.json.error.details.topics.includes("saas"))

  const me = await api("/api/auth/me", { headers: auth() })
  check("counters incremented exactly twice", me.json.user.counts.topicUsage.saas === 2,
    JSON.stringify(me.json.user.counts))

  const unpub = await api(`/api/work/${c2.json.work._id}/unpublish`, { method: "POST", headers: auth() })
  check("unpublish → 200", unpub.status === 200 && unpub.json.work.status === "draft")
  const p3b = await api(`/api/work/${c3.json.work._id}/publish`, { method: "POST", headers: auth() })
  check("slot freed → third publishes", p3b.status === 200, String(p3b.status))

  const incomplete = await api("/api/work", {
    method: "POST", headers: auth(),
    body: JSON.stringify({ mode: "template", role: "design", title: "Bare", year: 2025 }),
  })
  const pBad = await api(`/api/work/${incomplete.json.work._id}/publish`, { method: "POST", headers: auth() })
  check("incomplete entry → 422 not_publishable", pBad.status === 422 && pBad.json.error.code === "not_publishable",
    String(pBad.status))

  const onHome = await api("/api/work?q=cold-start")
  check("published entry appears in the index", onHome.json.meta.total >= 1, String(onHome.json.meta.total))

  // Traffic: a different viewer opens the entry twice — only the first counts.
  const asVisitor = { "user-agent": "smoke-visitor/1.0" }
  await api("/api/work/cutting-cold-start-on-a-serverless-api", { headers: asVisitor })
  await api("/api/work/cutting-cold-start-on-a-serverless-api", { headers: asVisitor })
  await new Promise((r) => setTimeout(r, 300))

  const traffic = await api("/api/traffic/me", { headers: auth() })
  check("GET /api/traffic/me", traffic.status === 200 && traffic.json.series.length === 30)
  check("  open counted once (deduped)", traffic.json.totals.workOpens === 1,
    JSON.stringify(traffic.json.totals))
  check("  perWork names the entry", traffic.json.perWork[0]?.opens === 1,
    JSON.stringify(traffic.json.perWork))

  const otherTraffic = await api("/api/traffic/me")
  check("traffic requires auth", otherTraffic.status === 401)
}

console.log("\n── moderation ──")
{
  // The account registered in the auth block above, promoted here so the
  // gate is exercised from both sides with one user.
  const me = (await users().findOne({ email: "ai3@bluesilo.studio" }))!
  const mySlug = me.slug
  const myEmail = "ai3@bluesilo.studio"
  const myPassword = "correct-horse-battery"

  const target = await api(`/api/work/${SAMPLE_SLUG}`)
  const targetId: string = target.json.work.id ?? target.json.work._id

  // Anyone may file a report, signed in or not.
  const filed = await api("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      targetKind: "work",
      targetId,
      reason: "false-claim",
      note: "The headline figure is not in the outcome.",
    }),
  })
  check("POST /api/reports (anonymous) → 202", filed.status === 202, String(filed.status))

  const badTarget = await api("/api/reports", {
    method: "POST",
    body: JSON.stringify({ targetKind: "work", targetId, reason: "not-a-reason" }),
  })
  check("report with unknown reason → 400", badTarget.status === 400, String(badTarget.status))

  // The gate: no token, then a token without the access level.
  const anon = await api("/api/moderation/reports")
  check("moderation without token → 401", anon.status === 401, String(anon.status))

  const asMember = await api("/api/moderation/reports", { headers: auth() })
  check("moderation as member → 403", asMember.status === 403, String(asMember.status))

  // Promote, then re-login so the new access level is in the token.
  await users().updateOne({ slug: mySlug }, { $set: { access: "moderator" } })
  const relogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: myEmail, password: myPassword }),
  })
  const modToken = relogin.json.accessToken
  const asMod = { authorization: `Bearer ${modToken}` }

  const queue = await api("/api/moderation/reports", { headers: asMod })
  check("GET /api/moderation/reports", queue.status === 200 && queue.json.items.length >= 1,
    String(queue.json?.items?.length))

  const thin = await api(`/api/moderation/work/${targetId}/unpublish`, {
    method: "POST", headers: asMod, body: JSON.stringify({ reason: "nope" }),
  })
  check("reason under 12 chars → 400", thin.status === 400, String(thin.status))

  const down = await api(`/api/moderation/work/${targetId}/unpublish`, {
    method: "POST", headers: asMod,
    body: JSON.stringify({ reason: "Reported: headline figure unsupported by the outcome." }),
  })
  check("unpublish → 200", down.status === 200, String(down.status))

  const afterDown = await api(`/api/work/${SAMPLE_SLUG}`)
  check("  entry leaves the public index", afterDown.status === 404, String(afterDown.status))

  const up = await api(`/api/moderation/work/${targetId}/republish`, {
    method: "POST", headers: asMod,
    body: JSON.stringify({ reason: "Author supplied the source; the figure checks out." }),
  })
  check("republish → 200", up.status === 200, String(up.status))
  check("  entry returns", (await api(`/api/work/${SAMPLE_SLUG}`)).status === 200)

  // Suspending an author withholds their work through the author's status.
  const authorSlug = PROLIFIC[0]
  const author = await users().findOne({ slug: authorSlug })
  const suspend = await api(`/api/moderation/users/${author!._id.toHexString()}/suspend`, {
    method: "POST", headers: asMod,
    body: JSON.stringify({ reason: "Multiple entries claim results we cannot source." }),
  })
  check("suspend → 200", suspend.status === 200, String(suspend.status))
  const listAfterSuspend = await api(`/api/work?q=${encodeURIComponent(author!.name)}&limit=48`)
  check("  their work leaves the listing",
    (listAfterSuspend.json.items ?? []).every((w: any) => w.author.slug !== authorSlug),
    JSON.stringify(listAfterSuspend.json?.meta))

  await api(`/api/moderation/users/${author!._id.toHexString()}/reinstate`, {
    method: "POST", headers: asMod,
    body: JSON.stringify({ reason: "Sources provided on review. Reinstated." }),
  })
  const listAfterBack = await api(`/api/work?q=${encodeURIComponent(author!.name)}&limit=48`)
  check("  reinstate restores the listing",
    (listAfterBack.json.items ?? []).some((w: any) => w.author.slug === authorSlug),
    JSON.stringify(listAfterBack.json?.meta))

  const log = await api("/api/moderation/log", { headers: asMod })
  check("GET /api/moderation/log", log.status === 200 && log.json.items.length >= 4,
    String(log.json?.items?.length))
  check("  every action carries a reason",
    log.json.items.every((a: any) => typeof a.reason === "string" && a.reason.length >= 12))

  const settings = await api("/api/moderation/settings", {
    method: "PUT", headers: asMod,
    body: JSON.stringify({
      disabledRoles: ["quality"],
      reason: "QA has no entries yet; hiding it until it does.",
    }),
  })
  check("PUT /api/moderation/settings", settings.status === 200, String(settings.status))
  const publicSettings = await api("/api/settings")
  check("  public settings reflect it",
    publicSettings.status === 200 && publicSettings.json.disabledRoles.includes("quality"),
    JSON.stringify(publicSettings.json?.disabledRoles))
}

console.log("\n── notices and appeals ──")
{
  /**
   * The point of this block is that a decision reaches the person it was about
   * and can actually be reversed. That needs two moderators: the reviewer of
   * an appeal may not be whoever took the decision, and an API that only
   * checks that in its UI is not checking it.
   */
  const second = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Sita Raharjo", email: "sita@example.com", password: "correct-horse-battery",
      location: "Bandung, ID", role: "product", title: "Group PM", years: 11, topics: ["saas"],
    }),
  })
  check("second account registered", second.status === 201, String(second.status))
  await users().updateOne({ email: "sita@example.com" }, { $set: { access: "moderator" } })
  const sitaLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "sita@example.com", password: "correct-horse-battery" }),
  })
  const asSita = { authorization: `Bearer ${sitaLogin.json.accessToken}` }

  // Sita withholds an entry belonging to the first account.
  const mine = await works().findOne({ slug: "cutting-cold-start-on-a-serverless-api" })
  const mineId = mine!._id.toHexString()
  const down = await api(`/api/moderation/work/${mineId}/unpublish`, {
    method: "POST", headers: asSita,
    body: JSON.stringify({ reason: "The p99 figure is not supported by anything in the entry." }),
  })
  check("moderator unpublishes someone else's entry → 200", down.status === 200, String(down.status))

  // The author's end of the same decision.
  const mineNotices = await api("/api/notices", { headers: auth() })
  check("GET /api/notices", mineNotices.status === 200 && mineNotices.json.items.length >= 1,
    String(mineNotices.json?.items?.length))
  const notice = mineNotices.json.items[0]
  check("  the notice carries the reason the moderator gave",
    notice?.reason?.includes("p99"), JSON.stringify(notice?.reason))
  check("  and starts unread", notice?.readAt === null, JSON.stringify(notice?.readAt))

  const otherPersons = await api("/api/notices", { headers: asSita })
  check("  notices are scoped to their addressee",
    (otherPersons.json.items ?? []).length === 0, String(otherPersons.json?.items?.length))

  const read = await api(`/api/notices/${notice.id ?? notice._id}/read`, { method: "POST", headers: auth() })
  check("POST /api/notices/:id/read", read.status === 200, String(read.status))

  const thinAppeal = await api(`/api/notices/${notice._id}/appeal`, {
    method: "POST", headers: auth(), body: JSON.stringify({ text: "no" }),
  })
  check("an appeal with nothing in it → 400", thinAppeal.status === 400, String(thinAppeal.status))

  const appealed = await api(`/api/notices/${notice._id}/appeal`, {
    method: "POST", headers: auth(),
    body: JSON.stringify({ text: "The figure is in the details block, labelled Performance, with the before and after." }),
  })
  check("POST /api/notices/:id/appeal → 201", appealed.status === 201, String(appealed.status))

  const twice = await api(`/api/notices/${notice._id}/appeal`, {
    method: "POST", headers: auth(),
    body: JSON.stringify({ text: "Appealing a second time to keep this permanently open." }),
  })
  check("  one appeal per notice (second → 409)", twice.status === 409, String(twice.status))

  const queue = await api("/api/moderation/appeals", { headers: asSita })
  check("GET /api/moderation/appeals", queue.status === 200 && queue.json.items.length === 1,
    String(queue.json?.items?.length))

  // The decision was Sita's, so Sita may not review the appeal against it.
  const selfReview = await api(`/api/moderation/appeals/${notice._id}/decide`, {
    method: "POST", headers: asSita,
    body: JSON.stringify({ outcome: "upheld", reason: "Reviewing my own decision, which should be refused." }),
  })
  check("the moderator who decided cannot review the appeal → 403",
    selfReview.status === 403, String(selfReview.status))

  // A different moderator can, and overturning actually puts the entry back.
  const modToken2 = (await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "ai3@bluesilo.studio", password: "correct-horse-battery" }),
  })).json.accessToken
  const decided = await api(`/api/moderation/appeals/${notice._id}/decide`, {
    method: "POST", headers: { authorization: `Bearer ${modToken2}` },
    body: JSON.stringify({ outcome: "overturned", reason: "The figure is where the author says it is." }),
  })
  check("a different moderator decides → 200", decided.status === 200, String(decided.status))

  const back = await api("/api/work/cutting-cold-start-on-a-serverless-api")
  check("  overturning actually republished the entry", back.status === 200, String(back.status))

  const afterDecision = await api("/api/notices", { headers: auth() })
  const settled = (afterDecision.json.items ?? []).find((n: any) => n._id === notice._id)
  check("  the author is told the outcome", settled?.appeal?.outcome === "overturned",
    JSON.stringify(settled?.appeal?.outcome))
  check("  and the reason for it", (settled?.appeal?.outcomeReason ?? "").length > 10)

  const again = await api(`/api/moderation/appeals/${notice._id}/decide`, {
    method: "POST", headers: { authorization: `Bearer ${modToken2}` },
    body: JSON.stringify({ outcome: "upheld", reason: "Deciding an already-decided appeal." }),
  })
  check("  an appeal is decided once (second → 409)", again.status === 409, String(again.status))

  const log = await api("/api/moderation/log", { headers: asSita })
  check("  the audit log records the appeal as its own action",
    (log.json.items ?? []).some((a: any) => a.action === "appeal"))
}

console.log("\n── funnel counters ──")
{
  const anon = await api("/api/analytics/funnel", {
    method: "POST",
    body: JSON.stringify({ counts: { signup_opened: 3, signup_completed: 1, entry_published: 2 } }),
  })
  check("POST /api/analytics/funnel (anonymous) → 204", anon.status === 204, String(anon.status))

  const junk = await api("/api/analytics/funnel", {
    method: "POST",
    body: JSON.stringify({ counts: { not_a_step: 5 } }),
  })
  check("an unknown step → 400", junk.status === 400, String(junk.status))

  const identifying = await api("/api/analytics/funnel", {
    method: "POST",
    body: JSON.stringify({ counts: { signup_opened: 1 }, userId: "someone", path: "/join" }),
  })
  check("the schema has nowhere to put an identifier", identifying.status === 400,
    String(identifying.status))

  const closed = await api("/api/analytics/funnel")
  check("reading the funnel requires auth", closed.status === 401, String(closed.status))

  const asMember = await api("/api/analytics/funnel", {
    headers: { authorization: `Bearer ${(await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "sita@example.com", password: "correct-horse-battery" }),
    })).json.accessToken}` },
  })
  check("GET /api/analytics/funnel as moderator → 200", asMember.status === 200, String(asMember.status))
  check("  counters add up", asMember.json.totals.signup_opened === 3,
    JSON.stringify(asMember.json?.totals))
  check("  one row per day", asMember.json.series.length === 1, String(asMember.json?.series?.length))
  check("  the row holds nothing but a day and counters",
    Object.keys(asMember.json.series[0]).sort().join(",") === "_id,counts,updatedAt",
    Object.keys(asMember.json.series[0]).join(","))
}

console.log("\n── backfill ──")
{
  /**
   * The backfill is the only script here that will ever be pointed at real
   * data, so it is the one worth proving. Strip the two fields a database
   * seeded before the language filter would be missing, then run it.
   */
  const person = await users().findOne({ seeded: true })
  const entry = await works().findOne({ authorId: person!._id })
  await users().updateOne({ _id: person!._id }, { $unset: { languages: "" } })
  await works().updateOne({ _id: entry!._id }, { $unset: { "author.years": "", "author.languages": "" } })

  const { execSync } = await import("node:child_process")
  execSync(`MONGODB_URI='${uri}' MONGODB_DB=whoareyou NODE_ENV=test LOG_LEVEL=warn ` +
    `JWT_ACCESS_SECRET=smoke-access-secret-0123456789 ` +
    `JWT_REFRESH_SECRET=smoke-refresh-secret-0123456789 ` +
    `VIEWER_HASH_SALT=smoke-viewer-salt ` +
    `npx tsx src/scripts/backfill.ts`, { stdio: "inherit" })

  const healed = await users().findOne({ _id: person!._id })
  check("backfill restores languages from the location",
    (healed?.languages ?? []).length > 0, JSON.stringify(healed?.languages))
  const healedWork = await works().findOne({ _id: entry!._id })
  check("  and re-snapshots the author onto the entry",
    typeof healedWork?.author.years === "number" && Array.isArray(healedWork?.author.languages),
    JSON.stringify(healedWork?.author))
}

console.log(`\n${pass} passed, ${fail} failed`)
server.close()
await disconnect()
await rs.stop()
process.exit(fail === 0 ? 0 : 1)
