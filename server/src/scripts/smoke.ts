/**
 * End-to-end smoke test.
 * Boots the real app against an ephemeral replica set, seeds it, then runs
 * assertions across every route. No external services required.
 * Run with: npm run test:smoke
 */
import { MongoMemoryReplSet } from "mongodb-memory-server"
import type mongoose from "mongoose"
import http from "node:http"
import type { AddressInfo } from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import User from "../models/user.js"
import Work from "../models/work.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Assertion helpers ─────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++
    process.stdout.write(`  ✓ ${label}\n`)
  } else {
    failed++
    process.stderr.write(`  ✗ ${label}${detail ? ` — ${detail}` : ""}\n`)
  }
}

function assertEq<T>(label: string, actual: T, expected: T) {
  assert(
    label,
    actual === expected,
    `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`,
  )
}

// ── HTTP client ───────────────────────────────────────────────────────────────

type Json = Record<string, unknown>

async function api(
  base: string,
  method: string,
  path: string,
  body?: Json,
  token?: string,
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json()) as Json
  return { status: res.status, json }
}

function get(base: string, path: string, token?: string) {
  return api(base, "GET", path, undefined, token)
}
function post(base: string, path: string, body: Json, token?: string) {
  return api(base, "POST", path, body, token)
}
function put(base: string, path: string, body: Json, token?: string) {
  return api(base, "PUT", path, body, token)
}
function patch(base: string, path: string, body: Json, token?: string) {
  return api(base, "PATCH", path, body, token)
}
function del(base: string, path: string, token?: string) {
  return api(base, "DELETE", path, undefined, token)
}

// ── Minimal work input that passes publishable validation ─────────────────────

function makeWork(overrides: Partial<Record<string, unknown>> = {}): Json {
  return {
    mode: "template",
    role: "engineering",
    topics: ["saas"],
    model: "b2b-saas",
    skills: ["Go"],
    title: "Smoke test entry",
    summary: "A one-liner summary for testing.",
    year: 2024,
    duration: "3 months",
    scope: "Solo",
    problem: "The test needed a publishable entry with enough length to pass validation.",
    approach: "Wrote the minimum required text in each field to satisfy the schema.",
    outcome: "The smoke test creates and publishes this entry then tears it down.",
    ...overrides,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting ephemeral replica set…")
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  const uri = rs.getUri()

  // Set env vars before importing app modules that read process.env at import time
  process.env["MONGODB_URI"] = uri
  process.env["MONGODB_DB"] = "whoareyou_smoke"
  process.env["JWT_SECRET"] = "smoke-test-secret-at-least-sixteen"
  process.env["JWT_EXPIRES_IN"] = "30d"
  process.env["VIEWER_HASH_SALT"] = "smoke-salt-1234"
  process.env["CORS_ORIGINS"] = ""
  process.env["NODE_ENV"] = "test"
  process.env["PORT"] = "0"
  process.env["LOG_LEVEL"] = "error"
  process.env["MAIL_TRANSPORT"] = "none"
  process.env["MAX_THUMBNAIL_BYTES"] = "1500000"
  process.env["APP_BASE_URL"] = "http://localhost:9800"

  // Build and start the Express app
  const { default: express } = await import("express")
  const { default: helmet } = await import("helmet")
  const { default: cors } = await import("cors")
  const { connectDB, disconnectDB } = await import("../db/mongo.js")
  const { errorHandler } = await import("../middleware/error.js")
  const { default: AppRouter } = await import("../routes/index.js")

  await connectDB()

  const app = express()
  app.set("trust proxy", false)
  app.use(helmet())
  app.use(cors({ origin: true }))
  app.use(express.json())
  app.get("/api/health", (_req, res) => res.json({ ok: true }))
  app.use("/api", AppRouter)
  app.use(errorHandler)

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://localhost:${port}/api/v1/user`
  const mod = `http://localhost:${port}/api/v1/moderation`
  console.log(`App listening on :${port}`)

  // ── Seed ─────────────────────────────────────────────────────────────────────
  console.log("\nSeeding fixtures…")
  await _seed(uri)
  console.log("Seeded\n")

  // ── § 1 Taxonomy ─────────────────────────────────────────────────────────────
  console.log("§1 Taxonomy")
  {
    const r = await get(base, "/taxonomy")
    assertEq("GET /taxonomy → 200", r.status, 200)
    assert("taxonomy has roles", Array.isArray((r.json["data"] as Json)["roles"]))
    assert("taxonomy has topics", Array.isArray((r.json["data"] as Json)["topics"]))
    assert("taxonomy has quota", typeof (r.json["data"] as Json)["topicQuota"] === "number")
  }

  // ── § 2 Settings ─────────────────────────────────────────────────────────────
  console.log("\n§2 Settings")
  {
    const r = await get(base, "/settings")
    assertEq("GET /settings → 200", r.status, 200)
  }

  // ── § 3 Auth — register ───────────────────────────────────────────────────────
  console.log("\n§3 Auth")
  const reg = await post(base, "/auth/register", {
    name: "Smoke User",
    email: "smoke@test.local",
    password: "SmokePass123!",
    location: "Jakarta, ID",
    role: "engineering",
    title: "Senior Engineer",
    years: 5,
    topics: ["saas"],
  })
  assertEq("POST /auth/register → 201", reg.status, 201)
  assert("register returns token", typeof (reg.json["data"] as Json)["token"] === "string")
  assert("register returns user", typeof (reg.json["data"] as Json)["user"] === "object")

  const userId = ((reg.json["data"] as Json)["user"] as Json)["slug"] as string

  // Duplicate registration
  const dup = await post(base, "/auth/register", {
    name: "Smoke User",
    email: "smoke@test.local",
    password: "SmokePass123!",
    location: "Jakarta, ID",
    role: "engineering",
    title: "SE",
    years: 5,
    topics: ["saas"],
  })
  assertEq("duplicate register → 409", dup.status, 409)

  // Bad login
  const badLogin = await post(base, "/auth/login", { email: "smoke@test.local", password: "wrong" })
  assertEq("bad login → 401", badLogin.status, 401)
  assertEq("bad login success=false", badLogin.json["success"], false)

  // Good login
  const login = await post(base, "/auth/login", {
    email: "smoke@test.local",
    password: "SmokePass123!",
  })
  assertEq("good login → 200", login.status, 200)
  assert("login returns token", typeof (login.json["data"] as Json)["token"] === "string")
  const loginToken = (login.json["data"] as Json)["token"] as string

  // Me
  const me = await get(base, "/auth/me", loginToken)
  assertEq("GET /auth/me → 200", me.status, 200)
  assertEq("me.slug matches", ((me.json["data"] as Json)["user"] as Json)["slug"], userId)

  // Unauthenticated me
  const meNoAuth = await get(base, "/auth/me")
  assertEq("GET /auth/me no token → 401", meNoAuth.status, 401)

  // Update profile
  const up = await patch(base, "/auth/me", { title: "Staff Engineer", years: 6 }, loginToken)
  assertEq("PATCH /auth/me → 200", up.status, 200)
  assertEq(
    "profile title updated",
    ((up.json["data"] as Json)["user"] as Json)["title"],
    "Staff Engineer",
  )

  // Email verify request (MAIL_TRANSPORT=none returns the token)
  const vreq = await post(base, "/auth/verify/request", {}, loginToken)
  assertEq("POST /auth/verify/request → 200", vreq.status, 200)
  const verifyToken = (vreq.json["data"] as Json)["token"] as string
  assert("verify token present", typeof verifyToken === "string" && verifyToken.length > 0)

  // Confirm email
  const vconf = await post(base, "/auth/verify/confirm", { token: verifyToken })
  assertEq("POST /auth/verify/confirm → 200", vconf.status, 200)

  // ── § 4 People ─────────────────────────────────────────────────────────────────
  console.log("\n§4 People")
  {
    const r = await get(base, "/people")
    assertEq("GET /people → 200", r.status, 200)
    assert("people items array", Array.isArray((r.json["data"] as Json)["items"]))
    assert("people meta present", typeof (r.json["data"] as Json)["meta"] === "object")

    const facets = await get(base, "/people/facets")
    assertEq("GET /people/facets → 200", facets.status, 200)

    // Get a seeded person
    const items = (r.json["data"] as Json)["items"] as Json[]
    if (items.length > 0) {
      const slug = items[0]!["slug"] as string
      const person = await get(base, `/people/${slug}`)
      assertEq(`GET /people/${slug} → 200`, person.status, 200)
      assert(
        "person has slug",
        typeof ((person.json["data"] as Json)["user"] as Json)["slug"] === "string",
      )

      // Person's work
      const pw = await get(base, `/people/${slug}/work`)
      assertEq(`GET /people/${slug}/work → 200`, pw.status, 200)
    }
  }

  // ── § 5 Work — public listing ─────────────────────────────────────────────────
  console.log("\n§5 Work — public listing")
  {
    const r = await get(base, "/work")
    assertEq("GET /work → 200", r.status, 200)
    assert("work items array", Array.isArray((r.json["data"] as Json)["items"]))
    assert("work facets present", typeof (r.json["data"] as Json)["facets"] === "object")
    assert("work meta present", typeof (r.json["data"] as Json)["meta"] === "object")

    // Filtered by role
    const byRole = await get(base, "/work?role=engineering")
    assertEq("GET /work?role=engineering → 200", byRole.status, 200)
  }

  // ── § 6 Work — CRUD ───────────────────────────────────────────────────────────
  console.log("\n§6 Work — CRUD")
  let workId = ""
  let workSlug = ""

  // Create draft (requires email verified)
  const created = await post(base, "/work", makeWork(), loginToken)
  assertEq("POST /work (create draft) → 201", created.status, 201)
  workId = ((created.json["data"] as Json)["work"] as Json)["_id"] as string
  workSlug = ((created.json["data"] as Json)["work"] as Json)["slug"] as string
  assertEq(
    "new work status=draft",
    ((created.json["data"] as Json)["work"] as Json)["status"],
    "draft",
  )

  // Mine list
  const mineList = await get(base, "/work/mine/list", loginToken)
  assertEq("GET /work/mine/list → 200", mineList.status, 200)
  assert("mine list is array", Array.isArray((mineList.json["data"] as Json)["items"]))

  // Mine by id
  const mineById = await get(base, `/work/mine/${workId}`, loginToken)
  assertEq("GET /work/mine/:id → 200", mineById.status, 200)

  // Mine by id — wrong user can't see it (test with no token gives 401)
  const mineByIdNoAuth = await get(base, `/work/mine/${workId}`)
  assertEq("GET /work/mine/:id no auth → 401", mineByIdNoAuth.status, 401)

  // Update
  const updated = await put(
    base,
    `/work/${workId}`,
    makeWork({ title: "Updated smoke entry" }),
    loginToken,
  )
  assertEq("PUT /work/:id → 200", updated.status, 200)
  assertEq(
    "work title updated",
    ((updated.json["data"] as Json)["work"] as Json)["title"],
    "Updated smoke entry",
  )

  // Publish (email is now verified)
  const published = await post(base, `/work/${workId}/publish`, {}, loginToken)
  assertEq("POST /work/:id/publish → 200", published.status, 200)
  assertEq(
    "work status=published",
    ((published.json["data"] as Json)["work"] as Json)["status"],
    "published",
  )

  // Double-publish → 409
  const pubAgain = await post(base, `/work/${workId}/publish`, {}, loginToken)
  assertEq("double publish → 409", pubAgain.status, 409)

  // Public detail
  const detail = await get(base, `/work/${workSlug}`)
  assertEq("GET /work/:slug → 200", detail.status, 200)
  assert(
    "work detail has moreByAuthor",
    Array.isArray((detail.json["data"] as Json)["moreByAuthor"]),
  )
  assert("work detail has similar", Array.isArray((detail.json["data"] as Json)["similar"]))

  // Unpublish
  const unp = await post(base, `/work/${workId}/unpublish`, {}, loginToken)
  assertEq("POST /work/:id/unpublish → 200", unp.status, 200)
  assertEq("work back to draft", ((unp.json["data"] as Json)["work"] as Json)["status"], "draft")

  // ── § 7 Topic quota ───────────────────────────────────────────────────────────
  console.log("\n§7 Topic quota")
  {
    // Re-publish the existing draft entry on saas
    await post(base, `/work/${workId}/publish`, {}, loginToken)

    // Create and publish a 2nd entry on saas (quota = 2, so this should pass)
    const w2 = await post(base, "/work", makeWork({ title: "Quota entry 2" }), loginToken)
    const w2id = ((w2.json["data"] as Json)["work"] as Json)["_id"] as string
    const pub2 = await post(base, `/work/${w2id}/publish`, {}, loginToken)
    assertEq("second saas entry publishes → 200", pub2.status, 200)

    // Third entry on saas → quota exceeded
    const w3 = await post(
      base,
      "/work",
      makeWork({ title: "Quota entry 3 (should fail)" }),
      loginToken,
    )
    const w3id = ((w3.json["data"] as Json)["work"] as Json)["_id"] as string
    const pub3 = await post(base, `/work/${w3id}/publish`, {}, loginToken)
    assertEq("third saas entry → 409 quota", pub3.status, 409)
    assert(
      "quota error code present",
      ((pub3.json["message"] as string) ?? "").toLowerCase().includes("quota"),
    )

    // Delete the extra entries (cleanup)
    await post(base, `/work/${workId}/unpublish`, {}, loginToken)
    await del(base, `/work/${workId}`, loginToken)
    await post(base, `/work/${w2id}/unpublish`, {}, loginToken)
    await del(base, `/work/${w2id}`, loginToken)
    await del(base, `/work/${w3id}`, loginToken)
  }

  // ── § 8 Traffic ───────────────────────────────────────────────────────────────
  console.log("\n§8 Traffic")
  {
    const r = await get(base, "/traffic/me", loginToken)
    assertEq("GET /traffic/me → 200", r.status, 200)
    assert("traffic summary is object", typeof r.json["data"] === "object")
  }

  // ── § 9 Reports ───────────────────────────────────────────────────────────────
  console.log("\n§9 Reports")
  let reportTargetId = ""
  {
    // Get a published work to report
    const works = await get(base, "/work")
    const item = ((works.json["data"] as Json)["items"] as Json[])[0]
    reportTargetId = (item?.["_id"] as string) ?? ""

    if (reportTargetId) {
      const r = await post(base, "/reports", {
        targetId: reportTargetId,
        targetKind: "work",
        reason: "false-claim",
      })
      assertEq("POST /reports → 202", r.status, 202)

      // Duplicate report collapses silently (same hash)
      const r2 = await post(base, "/reports", {
        targetId: reportTargetId,
        targetKind: "work",
        reason: "false-claim",
      })
      assert("duplicate report does not error", r2.status < 500)
    } else {
      assert("skipped report test (no works)", false)
    }
  }

  // ── § 10 Moderation setup — promote user to moderator ────────────────────────
  console.log("\n§10 Moderation")

  // Register a second user who will be the moderator
  const modReg = await post(base, "/auth/register", {
    name: "Smoke Mod",
    email: "mod@test.local",
    password: "ModPass456!",
    location: "Singapore, SG",
    role: "product",
    title: "Product Lead",
    years: 8,
    topics: ["saas"],
  })
  assertEq("moderator register → 201", modReg.status, 201)
  const modToken = (modReg.json["data"] as Json)["token"] as string
  const modSlug = ((modReg.json["data"] as Json)["user"] as Json)["slug"] as string

  // Directly promote to moderator via DB (no admin API exists).
  // isAuth reads access from the DB record at middleware time, so the existing token
  // immediately gains moderator access without a re-login.
  await User.updateOne({ slug: modSlug }, { $set: { access: "moderator" } })

  // Reports queue (moderator-gated)
  const reports = await get(mod, "/reports", modToken)
  assertEq("GET /moderation/reports → 200", reports.status, 200)
  assert(
    "reports is array",
    Array.isArray((reports.json["data"] as Json)["items"] ?? reports.json["data"]),
  )

  const reportItems =
    ((reports.json["data"] as Json)["items"] as Json[]) ?? (reports.json["data"] as Json[])
  const reportId = reportItems?.[0]?.["_id"] as string | undefined

  // Resolve report
  if (reportId) {
    const resolved = await post(
      mod,
      `/reports/${reportId}/resolve`,
      { reason: "Reviewed and found no violation." },
      modToken,
    )
    assertEq("POST /moderation/reports/:id/resolve → 200", resolved.status, 200)
  } else {
    assert("skipped resolve (no reports)", true)
  }

  // Create a fresh work for the smoke user to test moderation actions on
  const vreq2 = await post(base, "/auth/verify/request", {}, modToken)
  const vconf2 = vreq2.json["data"] as Json
  if (vconf2["token"]) {
    await post(base, "/auth/verify/confirm", { token: vconf2["token"] })
  }

  // Register a third user (the target for suspend/reinstate)
  const target = await post(base, "/auth/register", {
    name: "Smoke Target",
    email: "target@test.local",
    password: "TargetPass789!",
    location: "Kuala Lumpur, MY",
    role: "design",
    title: "Product Designer",
    years: 3,
    topics: ["saas"],
  })
  const targetToken = (target.json["data"] as Json)["token"] as string
  const targetSlug = ((target.json["data"] as Json)["user"] as Json)["slug"] as string
  const targetUser = await User.findOne({ slug: targetSlug }).select("_id").lean()
  const targetId = (targetUser as { _id: mongoose.Types.ObjectId })._id.toString()

  // Create + publish a work as target user (need verified email first)
  const tvreq = await post(base, "/auth/verify/request", {}, targetToken)
  const tvtoken = (tvreq.json["data"] as Json)["token"] as string
  await post(base, "/auth/verify/confirm", { token: tvtoken })

  const tw = await post(
    base,
    "/work",
    makeWork({ role: "design", title: "Target entry" }),
    targetToken,
  )
  const twId = ((tw.json["data"] as Json)["work"] as Json)["_id"] as string
  await post(base, `/work/${twId}/publish`, {}, targetToken)

  // Moderation: unpublish work
  const modUnpub = await post(
    mod,
    `/work/${twId}/unpublish`,
    { reason: "Violates community standards." },
    modToken,
  )
  assertEq("POST /moderation/work/:id/unpublish → 200", modUnpub.status, 200)

  // Check notice was created
  const notices = await get(base, "/notices", targetToken)
  assertEq("GET /notices → 200", notices.status, 200)
  const noticeList = ((notices.json["data"] as Json)["items"] ?? notices.json["data"]) as Json[]
  assert("notice created for unpublish", Array.isArray(noticeList) && noticeList.length > 0)

  const noticeId = noticeList[0]?.["_id"] as string

  // Mark notice read
  const markRead = await post(base, `/notices/${noticeId}/read`, {}, targetToken)
  assertEq("POST /notices/:id/read → 200", markRead.status, 200)

  // Moderation: republish work
  const modRepub = await post(
    mod,
    `/work/${twId}/republish`,
    { reason: "Reviewed, actually fine." },
    modToken,
  )
  assertEq("POST /moderation/work/:id/republish → 200", modRepub.status, 200)

  // Moderation: suspend user
  const suspend = await post(
    mod,
    `/people/${targetId}/suspend`,
    { reason: "Repeated violations." },
    modToken,
  )
  assertEq("POST /moderation/people/:id/suspend → 200", suspend.status, 200)

  // Works should now have authorSuspended=true
  const suspendedWork = await Work.findOne({ _id: twId }).select("authorSuspended").lean()
  assert(
    "authorSuspended=true after suspend",
    (suspendedWork as { authorSuspended: boolean })?.authorSuspended === true,
  )

  // Moderation: reinstate user
  const reinstate = await post(
    mod,
    `/people/${targetId}/reinstate`,
    { reason: "Issue resolved." },
    modToken,
  )
  assertEq("POST /moderation/people/:id/reinstate → 200", reinstate.status, 200)

  // ── § 11 Appeals ─────────────────────────────────────────────────────────────
  console.log("\n§11 Appeals")
  {
    // Target user appeals the unpublish notice (from the first unpublish that was then re-published)
    const noticeRes2 = await get(base, "/notices", targetToken)
    const noticeList2 = ((noticeRes2.json["data"] as Json)["items"] ??
      noticeRes2.json["data"]) as Json[]
    const unpublishNotice = noticeList2.find((n) => n["action"] === "unpublish")
    const appealNoticeId = unpublishNotice?.["_id"] as string | undefined

    if (appealNoticeId) {
      const appeal = await post(
        base,
        `/notices/${appealNoticeId}/appeal`,
        {
          text: "I believe this decision was incorrect because the content meets all guidelines.",
        },
        targetToken,
      )
      assertEq("POST /notices/:id/appeal → 201", appeal.status, 201)

      // Double appeal → 409
      const appeal2 = await post(
        base,
        `/notices/${appealNoticeId}/appeal`,
        { text: "Trying again" },
        targetToken,
      )
      assertEq("double appeal → 409", appeal2.status, 409)

      // Moderation: get open appeals
      const openAppeals = await get(mod, "/appeals", modToken)
      assertEq("GET /moderation/appeals → 200", openAppeals.status, 200)
      const appealItems = openAppeals.json["data"] as Json[]
      assert("appeal is in queue", Array.isArray(appealItems) && appealItems.length > 0)

      const appealId = appealItems[0]?.["_id"] as string

      // Moderator who took the decision tries to decide — should be forbidden
      // (the same moderator who unpublished tries to decide the appeal)
      const selfDecide = await post(
        mod,
        `/appeals/${appealId}/decide`,
        {
          outcome: "upheld",
          reason: "Still violated the guidelines.",
        },
        modToken,
      )
      assertEq("same-actor appeal decide → 403", selfDecide.status, 403)

      // Register a second moderator to decide
      const mod2Reg = await post(base, "/auth/register", {
        name: "Smoke Mod2",
        email: "mod2@test.local",
        password: "Mod2Pass000!",
        location: "Manila, PH",
        role: "product",
        title: "Lead",
        years: 4,
        topics: ["saas"],
      })
      const mod2Slug = ((mod2Reg.json["data"] as Json)["user"] as Json)["slug"] as string
      const mod2Token = (mod2Reg.json["data"] as Json)["token"] as string
      await User.updateOne({ slug: mod2Slug }, { $set: { access: "moderator" } })

      // mod2 overturns the appeal (this republishes the work)
      const decide = await post(
        mod,
        `/appeals/${appealId}/decide`,
        {
          outcome: "overturned",
          reason: "Content meets the community standards on review.",
        },
        mod2Token,
      )
      assertEq("second mod overturns appeal → 200", decide.status, 200)

      // Double decide → 409
      const decide2 = await post(
        mod,
        `/appeals/${appealId}/decide`,
        {
          outcome: "upheld",
          reason: "Changed my mind.",
        },
        mod2Token,
      )
      assertEq("double appeal decide → 409", decide2.status, 409)
    } else {
      assert("skipped appeal test (no unpublish notice found)", true)
    }
  }

  // ── § 12 Audit log ────────────────────────────────────────────────────────────
  console.log("\n§12 Audit log")
  {
    const r = await get(mod, "/log", modToken)
    assertEq("GET /moderation/log → 200", r.status, 200)
    const logItems = ((r.json["data"] as Json)["items"] ?? r.json["data"]) as Json[]
    assert("audit log is array", Array.isArray(logItems))
    assert("audit log has entries", logItems.length > 0)
  }

  // ── § 13 Moderation settings ──────────────────────────────────────────────────
  console.log("\n§13 Moderation settings")
  {
    const s = await get(mod, "/settings", modToken)
    assertEq("GET /moderation/settings → 200", s.status, 200)

    const upd = await put(
      mod,
      "/settings",
      {
        contact: "hello@test.local",
        reason: "Smoke test update",
      },
      modToken,
    )
    assertEq("PUT /moderation/settings → 200", upd.status, 200)
  }

  // ── § 14 Analytics funnel ─────────────────────────────────────────────────────
  console.log("\n§14 Analytics funnel")
  {
    const r = await post(mod, "/analytics/funnel", {
      counts: { signup_opened: 3, signup_completed: 1, entry_published: 1 },
    })
    assertEq("POST /analytics/funnel → 204", r.status, 204)

    // Read funnel (moderator-gated)
    const f = await get(mod, "/analytics/funnel?days=7", modToken)
    assertEq("GET /analytics/funnel → 200", f.status, 200)
    assert("funnel totals present", typeof (f.json["data"] as Json)["totals"] === "object")
  }

  // ── § 15 Launch scope ─────────────────────────────────────────────────────────
  console.log("\n§15 Launch scope")
  {
    // Attempting to register with a 'soon' craft should fail
    const badRole = await post(base, "/auth/register", {
      name: "Data Person",
      email: "data@test.local",
      password: "DataPass000!",
      location: "Jakarta, ID",
      role: "data",
      title: "Data Scientist",
      years: 3,
      topics: ["ai"],
    })
    assertEq("register with soon role → 400", badRole.status, 400)

    // Published works should not include 'soon' roles
    const works = await get(base, "/work")
    const items = (works.json["data"] as Json)["items"] as Json[]
    const hasSoon = items.some((w) =>
      ["data", "quality", "growth", "research"].includes(w["role"] as string),
    )
    assert("no soon-role works in public listing", !hasSoon)
  }

  // ── § 16 Backfill script ──────────────────────────────────────────────────────
  console.log("\n§16 Backfill")
  {
    // Strip languages from a user to create a gap, then run backfill
    const any = await User.findOne({
      languages: { $exists: true, $not: { $size: 0 } },
      location: { $ne: "" },
    }).lean()
    if (any) {
      await User.updateOne(
        { _id: (any as { _id: mongoose.Types.ObjectId })._id },
        { $set: { languages: [] } },
      )
      await _backfill()
      const restored = await User.findOne({
        _id: (any as { _id: mongoose.Types.ObjectId })._id,
      }).lean()
      assert(
        "backfill restored languages",
        ((restored as { languages?: string[] })?.languages?.length ?? 0) > 0,
      )
    } else {
      assert("skipped backfill test (no suitable user)", true)
    }
  }

  // ── § 17 Logout ───────────────────────────────────────────────────────────────
  console.log("\n§17 Logout")
  {
    const r = await post(base, "/auth/logout", {}, loginToken)
    assertEq("POST /auth/logout → 200", r.status, 200)

    // Token should no longer work
    const meAfter = await get(base, "/auth/me", loginToken)
    assertEq("old token rejected after logout → 401", meAfter.status, 401)
  }

  // ── Results ───────────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────────────`)
  console.log(`  ${passed} passed  ${failed > 0 ? failed + " FAILED" : ""}`)
  console.log(`─────────────────────────────────────────\n`)

  server.close()
  await disconnectDB()
  await rs.stop()

  if (failed > 0) process.exit(1)
}

// ── Inline seed logic (avoids double-connect from importing the script) ────────

async function _seed(_uri: string) {
  const fixturePath = path.join(__dirname, "../../fixtures")
  const { default: people } = await import(path.join(fixturePath, "people.json"), {
    with: { type: "json" },
  })
  const { default: works } = await import(path.join(fixturePath, "works.json"), {
    with: { type: "json" },
  })
  const { buildSearchBlob } = await import("../utils/text.js")

  const now = new Date()
  const slugToId = new Map<string, mongoose.Types.ObjectId>()
  const personMap = new Map<string, (typeof people)[number]>()

  for (const p of people as Array<Record<string, unknown>>) {
    personMap.set(p["id"] as string, p)
    const topics = (p["categories"] as string[]) ?? []
    const blob = buildSearchBlob([
      p["name"] as string,
      p["title"] as string,
      p["company"] as string,
      p["location"] as string,
      ...((p["skills"] as string[]) ?? []),
      ...topics,
    ])
    const result = await User.findOneAndUpdate(
      { slug: p["id"] as string },
      {
        $set: {
          slug: p["id"],
          name: p["name"],
          title: p["title"],
          company: p["company"],
          role: p["role"],
          topics,
          location: p["location"],
          skills: p["skills"],
          years: p["years"],
          openToWork: p["open"],
          photoUrl: p["photo"],
          languages: p["languages"],
          pitch: p["bio"],
          seeded: true,
          status: "active",
          access: "member",
          emailVerifiedAt: now,
          searchBlob: blob,
          updatedAt: now,
        },
        $setOnInsert: {
          email: null,
          passwordHash: null,
          token: null,
          portfolioUrl: "",
          counts: { publishedWorks: 0, topicUsage: {} },
          createdAt: now,
          deletedAt: null,
          createdBy: null,
          updatedBy: null,
          deletedBy: null,
        },
      },
      { upsert: true, new: true },
    ).lean()
    if (result) slugToId.set(p["id"] as string, (result as { _id: mongoose.Types.ObjectId })._id)
  }

  for (const w of works as Array<Record<string, unknown>>) {
    const authorId = slugToId.get(w["authorId"] as string)
    if (!authorId) continue
    const p = personMap.get(w["authorId"] as string)!

    const blob = buildSearchBlob([
      w["title"] as string,
      w["summary"] as string,
      w["problem"] as string,
      w["approach"] as string,
      w["outcome"] as string,
      ...((w["skills"] as string[]) ?? []),
      ...((w["stack"] as string[]) ?? []),
      ...((w["topics"] as string[]) ?? []),
      w["model"] as string,
      p["name"] as string,
      p["company"] as string,
      p["location"] as string,
    ])

    await Work.findOneAndUpdate(
      { slug: w["id"] as string },
      {
        $set: {
          slug: w["id"],
          authorId,
          author: {
            slug: p["id"],
            name: p["name"],
            title: p["title"],
            company: p["company"],
            photoUrl: p["photo"],
            years: p["years"],
            languages: p["languages"],
          },
          authorSuspended: false,
          mode: "template",
          role: w["role"],
          topics: w["topics"],
          model: w["model"],
          skills: w["skills"],
          title: w["title"],
          summary: w["summary"] ?? "",
          year: w["year"],
          duration: w["duration"] ?? "",
          scope: w["scope"] ?? "",
          problem: w["problem"] ?? "",
          approach: w["approach"] ?? "",
          outcome: w["outcome"] ?? "",
          sections: [],
          details: ((w["details"] as Array<Record<string, unknown>>) ?? []).map((d) => ({
            ...d,
            proof: d["proof"] ?? false,
          })),
          links: w["links"] ?? [],
          stack: w["stack"] ?? [],
          thumbnailPath: null,
          status: "published",
          publishedAt: now,
          metrics: { opens: 0 },
          searchBlob: blob,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          deletedAt: null,
          createdBy: null,
          updatedBy: null,
          deletedBy: null,
        },
      },
      { upsert: true },
    )
  }

  // Reconcile counts
  const rows = await Work.aggregate([
    { $match: { status: "published" as const, deletedAt: null } },
    { $group: { _id: "$authorId", publishedWorks: { $sum: 1 }, topics: { $push: "$topics" } } },
  ])
  for (const row of rows) {
    const topicUsage: Record<string, number> = {}
    for (const arr of row.topics as string[][])
      for (const t of arr) topicUsage[t] = (topicUsage[t] ?? 0) + 1
    await User.updateOne(
      { _id: row._id },
      {
        $set: {
          "counts.publishedWorks": row.publishedWorks,
          "counts.topicUsage": topicUsage,
          updatedAt: now,
        },
      },
    )
  }
}

// ── Inline backfill logic ──────────────────────────────────────────────────────

async function _backfill() {
  const { languagesFor } = await import("../utils/languages.js")
  const now = new Date()

  const users = await User.find({
    $or: [{ languages: { $exists: false } }, { languages: { $size: 0 } }],
    location: { $nin: ["", null] },
    deletedAt: null,
  })
    .select("_id location")
    .lean()

  for (const u of users) {
    const languages = languagesFor((u as { location: string }).location)
    await User.updateOne({ _id: u._id }, { $set: { languages, updatedAt: now } })
  }

  const worksToFix = await Work.find({
    $or: [
      { "author.years": { $exists: false } },
      { "author.languages": { $exists: false } },
      { "author.languages": { $size: 0 } },
    ],
    deletedAt: null,
  })
    .select("_id authorId")
    .lean()

  const authorIds = [
    ...new Set(
      worksToFix.map((w) => (w as { authorId: mongoose.Types.ObjectId }).authorId.toString()),
    ),
  ]
  const authors = await User.find({ _id: { $in: authorIds } })
    .select("_id years languages")
    .lean()
  const authorMap = new Map(
    (authors as { _id: mongoose.Types.ObjectId; years: number; languages: string[] }[]).map((a) => [
      a._id.toString(),
      a,
    ]),
  )

  for (const w of worksToFix) {
    const a = authorMap.get((w as { authorId: mongoose.Types.ObjectId }).authorId.toString())
    if (!a) continue
    await Work.updateOne(
      { _id: w._id },
      { $set: { "author.years": a.years, "author.languages": a.languages ?? [], updatedAt: now } },
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
