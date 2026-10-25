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
  userAgent?: string,
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (userAgent) headers["User-Agent"] = userAgent

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  // 204 has no body; also guard against any other empty-body responses.
  const text = await res.text()
  const json = (text ? JSON.parse(text) : {}) as Json
  return { status: res.status, json }
}

function get(base: string, path: string, token?: string, userAgent?: string) {
  return api(base, "GET", path, undefined, token, userAgent)
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

/** Multipart upload, used to exercise the thumbnail/portrait routes. */
async function uploadFile(
  base: string,
  path: string,
  token: string,
  filename: string,
  mime: string,
  bytes: Uint8Array,
): Promise<{ status: number; json: Json }> {
  const form = new FormData()
  form.append("file", new Blob([bytes], { type: mime }), filename)
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const text = await res.text()
  return { status: res.status, json: (text ? JSON.parse(text) : {}) as Json }
}

/**
 * Register, then sign in.
 *
 * Registration deliberately returns no token and a uniform body, so the
 * endpoint cannot be used to enumerate addresses. A session therefore needs a
 * login after the account exists.
 */
async function registerAndLogin(base: string, body: Json) {
  const reg = await post(base, "/auth/register", body)
  const login = await post(base, "/auth/login", {
    email: body["email"],
    password: body["password"],
  })
  const data = (login.json["data"] as Json) ?? {}
  return {
    status: reg.status,
    token: data["token"] as string,
    user: (data["user"] as Json) ?? {},
  }
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
  process.env["TOKEN_HASH_SECRET"] = "smoke-token-hash-secret-at-least-32-chars"
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
  const regBody = {
    name: "Smoke User",
    email: "smoke@test.local",
    password: "SmokePass123!",
    location: "Jakarta, ID",
    role: "engineering",
    title: "Senior Engineer",
    years: 5,
    topics: ["saas"],
  }
  const reg = await post(base, "/auth/register", regBody)
  assertEq("POST /auth/register → 202", reg.status, 202)
  assert("register response carries no token", (reg.json["data"] ?? null) === null)

  // Duplicate registration returns the same generic response, not a 409.
  const dup = await post(base, "/auth/register", { ...regBody, title: "SE" })
  assertEq("duplicate register → 202", dup.status, 202)

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
  const userId = ((login.json["data"] as Json)["user"] as Json)["slug"] as string

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

    // Profile views and work opens write to different fields of the same daily
    // document. The profile update once incremented `total` while also setting
    // it on insert, which MongoDB rejects as a conflict; because the controller
    // is fire-and-forget, only the work counter moved. This pins that down.
    const viewedProfile = await get(base, `/people/${userId}`, undefined, "smoke-profile-viewer/1.0")
    assertEq("anonymous profile view → 200", viewedProfile.status, 200)

    type ProfileData = { totals: { profileViews: number } }
    let profileData: ProfileData | null = null
    for (let i = 0; i < 40; i++) {
      const summary = await get(base, "/traffic/me", loginToken)
      profileData = summary.json["data"] as ProfileData
      if ((profileData.totals.profileViews ?? 0) > 0) break
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    assert("traffic profileViews > 0", (profileData?.totals.profileViews ?? 0) > 0)

    // The traffic read is an aggregate, which does not cast the owner id against
    // the schema. Prove a recorded view comes back, since a total of zero was
    // the silent failure this covers.
    const t = await post(base, "/work", makeWork({ title: "Traffic probe entry" }), loginToken)
    const tWork = (t.json["data"] as Json)["work"] as Json
    const tid = tWork["_id"] as string
    const tslug = tWork["slug"] as string
    await post(base, `/work/${tid}/publish`, {}, loginToken)

    // Anonymous view with a distinct UA, so the daily de-dup counts it.
    const viewed = await get(base, `/work/${tslug}`, undefined, "smoke-viewer/1.0")
    assertEq("anonymous work view → 200", viewed.status, 200)

    // RecordOpen is fire-and-forget, so poll until this entry shows up. The
    // summary can already be non-zero from earlier views, so wait on the entry.
    type TrafficData = {
      totals: { workOpens: number }
      perWork: Array<{ slug: string | null; opens: number }>
    }
    let data: TrafficData | null = null
    for (let i = 0; i < 40; i++) {
      const summary = await get(base, "/traffic/me", loginToken)
      data = summary.json["data"] as TrafficData
      if (data.perWork.some((row) => row.slug === tslug && row.opens > 0)) break
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    assert("traffic workOpens > 0", (data?.totals.workOpens ?? 0) > 0)
    assert(
      "traffic perWork lists the viewed entry",
      (data?.perWork ?? []).some((row) => row.slug === tslug && row.opens > 0),
    )

    await post(base, `/work/${tid}/unpublish`, {}, loginToken)
    await del(base, `/work/${tid}`, loginToken)
  }

  // ── § 9 Reports ───────────────────────────────────────────────────────────────
  console.log("\n§9 Reports")
  let reportTargetId = ""
  {
    // Get a published work to report. /reports accepts a slug (not ObjectId)
    // and requires auth — pass loginToken.
    const works = await get(base, "/work")
    const item = ((works.json["data"] as Json)["items"] as Json[])[0]
    reportTargetId = (item?.["slug"] as string) ?? ""

    if (reportTargetId) {
      const r = await post(
        base,
        "/reports",
        {
          targetId: reportTargetId,
          targetKind: "work",
          reason: "false-claim",
        },
        loginToken,
      )
      assertEq("POST /reports → 202", r.status, 202)

      // Duplicate report collapses silently (same hash)
      const r2 = await post(
        base,
        "/reports",
        {
          targetId: reportTargetId,
          targetKind: "work",
          reason: "false-claim",
        },
        loginToken,
      )
      assert("duplicate report does not error", r2.status < 500)
    } else {
      assert("skipped report test (no works)", false)
    }
  }

  // ── § 10 Moderation setup — promote user to moderator ────────────────────────
  console.log("\n§10 Moderation")

  // Register a second user who will be the moderator
  const modReg = await registerAndLogin(base, {
    name: "Smoke Mod",
    email: "mod@test.local",
    password: "ModPass456!",
    location: "Singapore, SG",
    role: "product",
    title: "Product Lead",
    years: 8,
    topics: ["saas"],
  })
  assertEq("moderator register → 202", modReg.status, 202)
  const modToken = modReg.token
  const modSlug = modReg.user["slug"] as string

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
  const target = await registerAndLogin(base, {
    name: "Smoke Target",
    email: "target@test.local",
    password: "TargetPass789!",
    location: "Kuala Lumpur, MY",
    role: "design",
    title: "Product Designer",
    years: 3,
    topics: ["saas"],
  })
  const targetToken = target.token
  const targetSlug = target.user["slug"] as string

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
  const twSlug = ((tw.json["data"] as Json)["work"] as Json)["slug"] as string
  await post(base, `/work/${twId}/publish`, {}, targetToken)

  // Moderation: unpublish work (moderation endpoints resolve by slug, not ObjectId)
  const modUnpub = await post(
    mod,
    `/work/${twSlug}/unpublish`,
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
    `/work/${twSlug}/republish`,
    { reason: "Reviewed, actually fine." },
    modToken,
  )
  assertEq("POST /moderation/work/:id/republish → 200", modRepub.status, 200)

  // Moderation: suspend user
  const suspend = await post(
    mod,
    `/people/${targetSlug}/suspend`,
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
    `/people/${targetSlug}/reinstate`,
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

      // Double appeal → 409 (text must be ≥20 chars to pass validation)
      const appeal2 = await post(
        base,
        `/notices/${appealNoticeId}/appeal`,
        { text: "Trying this appeal one more time please." },
        targetToken,
      )
      assertEq("double appeal → 409", appeal2.status, 409)

      // Moderation: get open appeals
      const openAppeals = await get(mod, "/appeals", modToken)
      assertEq("GET /moderation/appeals → 200", openAppeals.status, 200)
      const appealItems = (openAppeals.json["data"] as Json)["items"] as Json[]
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
      const mod2Reg = await registerAndLogin(base, {
        name: "Smoke Mod2",
        email: "mod2@test.local",
        password: "Mod2Pass000!",
        location: "Manila, PH",
        role: "product",
        title: "Lead",
        years: 4,
        topics: ["saas"],
      })
      const mod2Slug = mod2Reg.user["slug"] as string
      const mod2Token = mod2Reg.token
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

      // An admin may review their own decision. The overturn above republished
      // the work, so unpublish it again to produce a fresh notice for the same
      // actor, then promote that actor to admin before they decide.
      const unpubAgain = await post(
        mod,
        `/work/${twSlug}/unpublish`,
        { reason: "Second look at the same entry." },
        modToken,
      )
      assertEq("moderator unpublishes again → 200", unpubAgain.status, 200)

      const noticeRes3 = await get(base, "/notices", targetToken)
      const noticeList3 = ((noticeRes3.json["data"] as Json)["items"] ??
        noticeRes3.json["data"]) as Json[]
      const adminNoticeId = noticeList3.find(
        (n) => n["action"] === "unpublish" && !n["appeal"],
      )?.["_id"] as string | undefined
      assert("fresh notice for admin self-review", typeof adminNoticeId === "string")

      if (adminNoticeId) {
        const adminAppeal = await post(
          base,
          `/notices/${adminNoticeId}/appeal`,
          { text: "A second appeal on the fresh notice, for the admin self-review case." },
          targetToken,
        )
        assertEq("second appeal → 201", adminAppeal.status, 201)

        await User.updateOne({ slug: modSlug }, { $set: { access: "admin" } })
        const selfAdmin = await post(
          mod,
          `/appeals/${adminNoticeId}/decide`,
          {
            outcome: "overturned",
            reason: "Admin reviewed the same decision and reversed it.",
          },
          modToken,
        )
        assertEq("admin self-review → 200", selfAdmin.status, 200)
      }
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
    assert(
      "audit records admin self-review",
      logItems.some((entry) =>
        String(entry["reason"] ?? "").includes("self-reviewed by an admin"),
      ),
    )
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
        contact: {
          email: "hello@test.local",
          location: "Jakarta, ID",
          responseTime: "Within two working days.",
        },
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

  // ── § 18 Account deletion ─────────────────────────────────────────────────────
  console.log("\n§18 Account deletion")
  {
    const email = "deletion-probe@example.com"
    const password = "deletion-probe-12345"

    const reg = await registerAndLogin(base, {
      name: "Deletion Probe",
      email,
      password,
      role: "engineering",
      years: 4,
    })
    assertEq("register deletion probe → 202", reg.status, 202)
    const probeToken = reg.token

    // Verify so the probe can publish, then publish one entry.
    const vreq = await post(base, "/auth/verify/request", {}, probeToken)
    const vt = (vreq.json["data"] as Json)["token"] as string
    await post(base, "/auth/verify/confirm", { token: vt })

    const made = await post(
      base,
      "/work",
      makeWork({ title: "Deletion cascade entry" }),
      probeToken,
    )
    const madeWork = (made.json["data"] as Json)["work"] as Json
    const madeId = madeWork["_id"] as string
    const madeSlug = madeWork["slug"] as string
    await post(base, `/work/${madeId}/publish`, {}, probeToken)

    const listedBefore = await get(base, `/work/${madeSlug}`)
    assertEq("probe entry is public before deletion → 200", listedBefore.status, 200)

    const delRes = await del(base, "/auth/me", probeToken)
    assertEq("DELETE /auth/me → 200", delRes.status, 200)

    const meAfter = await get(base, "/auth/me", probeToken)
    assertEq("deleted account token rejected → 401", meAfter.status, 401)

    const loginAfter = await post(base, "/auth/login", { email, password })
    assertEq("deleted account cannot log in → 401", loginAfter.status, 401)

    const listedAfter = await get(base, `/work/${madeSlug}`)
    assertEq("probe entry gone from public → 404", listedAfter.status, 404)

    const reReg = await post(base, "/auth/register", {
      name: "Deletion Probe Two",
      email,
      password,
      role: "engineering",
      years: 1,
    })
    assertEq("email freed for re-registration → 202", reReg.status, 202)
  }

  // ── § 19 Moderator republish quota guard ──────────────────────────────────────
  console.log("\n§19 Moderator republish quota guard")
  {
    const owner = await registerAndLogin(base, {
      name: "Quota Probe",
      email: "quota-probe@example.com",
      password: "quota-probe-12345",
      role: "engineering",
      years: 3,
    })
    const ownerToken = owner.token
    const ovreq = await post(base, "/auth/verify/request", {}, ownerToken)
    await post(base, "/auth/verify/confirm", {
      token: (ovreq.json["data"] as Json)["token"] as string,
    })

    const a = await post(base, "/work", makeWork({ title: "Quota probe A" }), ownerToken)
    const aWork = (a.json["data"] as Json)["work"] as Json
    const b = await post(base, "/work", makeWork({ title: "Quota probe B" }), ownerToken)
    const bWork = (b.json["data"] as Json)["work"] as Json
    await post(base, `/work/${aWork["_id"] as string}/publish`, {}, ownerToken)
    await post(base, `/work/${bWork["_id"] as string}/publish`, {}, ownerToken)

    const modReg = await registerAndLogin(base, {
      name: "Quota Mod",
      email: "quota-mod@example.com",
      password: "quota-mod-12345",
      role: "product",
      years: 6,
    })
    const qmodToken = modReg.token
    const qmodSlug = modReg.user["slug"] as string
    await User.updateOne({ slug: qmodSlug }, { $set: { access: "moderator" } })

    // Take A down, so saas has one published entry.
    const down = await post(
      mod,
      `/work/${aWork["slug"] as string}/unpublish`,
      { reason: "Temporary moderation test reason." },
      qmodToken,
    )
    assertEq("mod unpublish frees a quota slot → 200", down.status, 200)

    // The owner refills it: saas is back at the cap of two.
    const c = await post(base, "/work", makeWork({ title: "Quota probe C" }), ownerToken)
    const cWork = (c.json["data"] as Json)["work"] as Json
    const cp = await post(base, `/work/${cWork["_id"] as string}/publish`, {}, ownerToken)
    assertEq("owner refills the second saas slot → 200", cp.status, 200)

    // Republishing A would make three in saas, which the rule forbids.
    const up = await post(
      mod,
      `/work/${aWork["slug"] as string}/republish`,
      { reason: "Attempting to exceed the topic cap." },
      qmodToken,
    )
    assertEq("moderator republish over quota → 409", up.status, 409)
    assert(
      "moderator quota error names the topic",
      JSON.stringify(up.json).toLowerCase().includes("quota"),
    )
  }

  // ── § 20 Uploads ──────────────────────────────────────────────────────────────
  console.log("\n§20 Uploads")
  {
    const reg = await registerAndLogin(base, {
      name: "Upload Probe",
      email: "upload-probe@example.com",
      password: "upload-probe-12345",
      role: "engineering",
      years: 2,
    })
    const uToken = reg.token
    const made = await post(base, "/work", makeWork({ title: "Upload probe entry" }), uToken)
    const workId = ((made.json["data"] as Json)["work"] as Json)["_id"] as string

    // A PNG sent under an .html filename must still land as .png: the extension
    // comes from the MIME allowlist, not the client's name.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    )
    const up = await uploadFile(
      base,
      `/uploads/work/${workId}/thumbnail`,
      uToken,
      "evil.html",
      "image/png",
      png,
    )
    assertEq("POST thumbnail upload → 201", up.status, 201)
    const stored = (((up.json["data"] as Json)["thumbnailPath"] as string) ?? "").trim()
    assert("stored path is under /uploads/thumbnails", stored.includes("/uploads/thumbnails/"))
    assert("extension comes from the MIME, not the filename", stored.endsWith(".png"))

    // Removing it must resolve the file from the new URL shape.
    const rm = await del(base, `/uploads/work/${workId}/thumbnail`, uToken)
    assertEq("DELETE thumbnail → 200", rm.status, 200)
  }

  // ── § 21 Suspended account access ─────────────────────────────────────────────
  console.log("\n§21 Suspended account access")
  {
    const reg = await registerAndLogin(base, {
      name: "Suspend Probe",
      email: "suspend-probe@example.com",
      password: "suspend-probe-12345",
      role: "design",
      years: 2,
    })
    const sSlug = reg.user["slug"] as string

    const sus = await post(
      mod,
      `/people/${sSlug}/suspend`,
      { reason: "Suspension access test reason." },
      modToken,
    )
    assertEq("moderator suspends probe → 200", sus.status, 200)

    // A suspended person can still sign in, read the notice, and delete the account.
    const login = await post(base, "/auth/login", {
      email: "suspend-probe@example.com",
      password: "suspend-probe-12345",
    })
    assertEq("suspended user can sign in → 200", login.status, 200)
    const sToken = (login.json["data"] as Json)["token"] as string

    const me = await get(base, "/auth/me", sToken)
    assertEq("suspended GET /auth/me → 200", me.status, 200)
    const notices = await get(base, "/notices", sToken)
    assertEq("suspended GET /notices → 200", notices.status, 200)
    assert(
      "suspension notice delivered",
      JSON.stringify(notices.json).toLowerCase().includes("suspend"),
    )

    // Everything else stays closed.
    const mine = await get(base, "/work/mine/list", sToken)
    assertEq("suspended work routes stay closed → 401", mine.status, 401)
    const patchRes = await patch(base, "/auth/me", { pitch: "nope" }, sToken)
    assertEq("suspended profile edits stay closed → 401", patchRes.status, 401)

    // Cleanup.
    const rein = await post(
      mod,
      `/people/${sSlug}/reinstate`,
      { reason: "Reinstate after access test." },
      modToken,
    )
    assertEq("moderator reinstates probe → 200", rein.status, 200)
  }

  // ── § 22 Work delete cascade ──────────────────────────────────────────────────
  console.log("\n§22 Work delete cascade")
  {
    const reg = await registerAndLogin(base, {
      name: "Delete Work Probe",
      email: "delete-work-probe@example.com",
      password: "delete-work-probe-12345",
      role: "engineering",
      years: 2,
    })
    const dToken = reg.token
    const vreq = await post(base, "/auth/verify/request", {}, dToken)
    await post(base, "/auth/verify/confirm", {
      token: (vreq.json["data"] as Json)["token"] as string,
    })

    const made = await post(base, "/work", makeWork({ title: "Delete cascade entry 2" }), dToken)
    const w = (made.json["data"] as Json)["work"] as Json
    const wId = w["_id"] as string
    const wSlug = w["slug"] as string
    await post(base, `/work/${wId}/publish`, {}, dToken)

    const before = await get(base, `/work/${wSlug}`)
    assertEq("entry public before delete → 200", before.status, 200)

    const delRes = await del(base, `/work/${wId}`, dToken)
    assertEq("DELETE /work/:id → 200", delRes.status, 200)

    const after = await get(base, `/work/${wSlug}`)
    assertEq("entry gone from public after delete → 404", after.status, 404)

    const mine = await get(base, "/work/mine/list", dToken)
    const ids = (((mine.json["data"] as Json)["items"] as Json[]) ?? []).map((i) => i["_id"])
    assert("deleted entry absent from mine list", !ids.includes(wId))
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
