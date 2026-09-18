/**
 * Generates `dist/sitemap.xml` from the fixtures after a build.
 *
 * A directory is only useful if its entries can be found, and a crawler will
 * not discover 37 case studies by walking a client-rendered grid. The sitemap
 * is the list, stated plainly.
 *
 * It reads `server/fixtures/*.json` rather than the TypeScript sources so it
 * stays a plain Node script with no build step of its own, and it applies the
 * same launch scope the app does: crafts marked `soon` are not in the app, so
 * they are not in the sitemap either. Announcing a URL that renders a 404
 * would be worse than omitting it.
 *
 *   node scripts/build-sitemap.mjs [origin]
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const origin = (process.argv[2] ?? "https://whoareyou.directory").replace(/\/+$/, "")

/** Read the live crafts straight out of the taxonomy source. */
function liveRoles() {
  const source = readFileSync(join(root, "src/data/taxonomy.ts"), "utf8")
  const block = source.slice(source.indexOf("export const ROLES"), source.indexOf("export type RoleId"))
  return new Set(
    [...block.matchAll(/\{\s*id:\s*"([^"]+)"[^}]*status:\s*"live"/g)].map((match) => match[1]),
  )
}

const live = liveRoles()
const works = JSON.parse(readFileSync(join(root, "server/fixtures/works.json"), "utf8"))
const people = JSON.parse(readFileSync(join(root, "server/fixtures/people.json"), "utf8"))

const inScopeWorks = works.filter((work) => live.has(work.role))
const authored = new Set(inScopeWorks.map((work) => work.authorId))
const inScopePeople = people.filter((person) => live.has(person.role))

/** `changefreq` is advisory at best; `priority` orders what matters to us. */
const urls = [
  { loc: "/", priority: "1.0" },
  { loc: "/work", priority: "0.9" },
  { loc: "/about", priority: "0.6" },
  { loc: "/changelog", priority: "0.3" },
  { loc: "/terms", priority: "0.2" },
  { loc: "/privacy", priority: "0.2" },
  { loc: "/content-policy", priority: "0.2" },
  { loc: "/accessibility", priority: "0.2" },
  ...inScopeWorks.map((work) => ({ loc: `/work/${work.id}`, priority: "0.8" })),
  // A profile with no entries has nothing for a search result to show.
  ...inScopePeople
    .filter((person) => authored.has(person.id))
    .map((person) => ({ loc: `/people/${person.id}`, priority: "0.7" })),
]

const today = new Date().toISOString().slice(0, 10)
const body = urls
  .map(
    ({ loc, priority }) =>
      `  <url>\n    <loc>${origin}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`,
  )
  .join("\n")

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

writeFileSync(join(root, "dist/sitemap.xml"), xml)
console.log(
  `sitemap.xml: ${urls.length} urls (${inScopeWorks.length} entries, ` +
    `${inScopePeople.filter((p) => authored.has(p.id)).length} profiles) at ${origin}`,
)
