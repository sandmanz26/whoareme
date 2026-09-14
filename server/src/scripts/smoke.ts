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
import { MongoMemoryReplSet } from "mongodb-memory-server"

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
  check("seed: users inserted", (await users().countDocuments()) === 62)
  check("seed: works inserted", (await works().countDocuments()) === 36)
  const withCounts = await users().findOne({ slug: "sinta-wijaya" })
  check("seed: counters derived", withCounts?.counts.publishedWorks === 2,
    JSON.stringify(withCounts?.counts))
}

console.log("\n── public reads ──")
{
  const health = await api("/api/health")
  check("GET /api/health", health.status === 200 && health.json.ok === true)

  const list = await api("/api/work?limit=6")
  check("GET /api/work", list.status === 200 && list.json.items.length === 6)
  check("  total is 36", list.json.meta.total === 36, String(list.json.meta.total))
  check("  skill facets present", list.json.facets.skills.length > 0)
  check("  model facets present", list.json.facets.models.length > 0)
  check("  cards carry only proof details",
    list.json.items.every((w: any) => w.details.every((d: any) => d.proof === true)))

  const filtered = await api("/api/work?role=engineering&topic=saas")
  check("GET /api/work?role&topic", filtered.status === 200 && filtered.json.meta.total > 0,
    String(filtered.json?.meta?.total))

  const skillFiltered = await api("/api/work?skills=Distributed%20systems")
  check("GET /api/work?skills", skillFiltered.json.meta.total === 7, String(skillFiltered.json.meta.total))

  const searched = await api("/api/work?q=rust%20edge")
  check("GET /api/work?q AND-s tokens", searched.json.meta.total >= 1, String(searched.json.meta.total))

  const detail = await api("/api/work/rider-maps-onboarding")
  check("GET /api/work/:slug", detail.status === 200 && detail.json.work.title.includes("Onboarding"))
  check("  moreByAuthor", detail.json.moreByAuthor.length === 1, String(detail.json.moreByAuthor.length))
  check("  similar returns 3", detail.json.similar.length === 3, String(detail.json.similar.length))
  check("  similar is scored", detail.json.similar.every((s: any) => s.score > 0))
  check("  similar de-duped by author",
    new Set(detail.json.similar.map((s: any) => s.author.slug)).size === detail.json.similar.length)

  const missing = await api("/api/work/does-not-exist")
  check("GET unknown slug → 404", missing.status === 404)

  const people = await api("/api/people?limit=5")
  check("GET /api/people", people.status === 200 && people.json.items.length === 5)
  const facets = await api("/api/people/facets")
  check("GET /api/people/facets", facets.status === 200 && facets.json.total === 62)
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

console.log(`\n${pass} passed, ${fail} failed`)
server.close()
await disconnect()
await rs.stop()
process.exit(fail === 0 ? 0 : 1)
