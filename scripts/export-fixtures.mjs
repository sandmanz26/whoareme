/**
 * Bundles the front-end data fixtures to JSON for the API's seed script.
 *
 * The server must stay independently deployable, so it never imports from the
 * app's source tree — it reads `server/fixtures/*.json`, and this script is
 * the one place the two are connected. Re-run it whenever the fixtures change.
 *
 *   npm run export:fixtures
 */
import { build } from "esbuild"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)))
const tmp = path.join(root, "node_modules", ".fixtures-bundle.mjs")
const outDir = path.join(root, "server", "fixtures")

// esbuild's stdin resolves relative to `resolveDir`, so plain relative
// specifiers are what it wants here — file:// URLs are not resolvable.
const entry = `
  export { PEOPLE } from "./src/data/people"
  export { SEED_WORK } from "./src/data/portfolios"
  export { ROLES, CATEGORIES } from "./src/data/taxonomy"
  export { BUSINESS_MODELS } from "./src/data/businessModels"
`

await build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  outfile: tmp,
  logLevel: "warning",
})

const { PEOPLE, SEED_WORK, ROLES, CATEGORIES, BUSINESS_MODELS } = await import(
  `${pathToFileURL(tmp).href}?v=${Date.now()}`
)

await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, "people.json"), `${JSON.stringify(PEOPLE, null, 2)}\n`)
await writeFile(path.join(outDir, "works.json"), `${JSON.stringify(SEED_WORK, null, 2)}\n`)
await writeFile(
  path.join(outDir, "taxonomy.json"),
  `${JSON.stringify({ roles: ROLES, topics: CATEGORIES, businessModels: BUSINESS_MODELS }, null, 2)}\n`,
)
await rm(tmp, { force: true })

console.log(
  `fixtures written to server/fixtures: ${PEOPLE.length} people, ${SEED_WORK.length} works`,
)
