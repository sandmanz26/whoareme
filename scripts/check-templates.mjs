/**
 * Does every seeded entry look like something the form could produce?
 *
 * A case study page renders whatever `Work.details` holds. For a real entry
 * that is safe by construction: `workFromDraft` builds `details` from the
 * fields of the entry's template, in the template's order. Seeded fixtures are
 * hand-written, so they can drift, and when they do the demo teaches a shape
 * the authoring form cannot make.
 *
 * This is a report, not a gate: it exits 0 and prints what it found, so it can
 * be run while the fixtures are being brought back into line without blocking
 * a build. Change `process.exit(0)` to `process.exit(strays ? 1 : 0)` once
 * they are clean.
 *
 *   node scripts/check-templates.mjs
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

/** Pull `label: "..."` pairs out of a TS source without compiling it. */
function labelsFrom(file) {
  const source = readFileSync(join(root, file), "utf8")
  return new Set([...source.matchAll(/label:\s*"([^"]+)"/g)].map((match) => match[1]))
}

const templateLabels = labelsFrom("src/data/workTemplates.ts")
const schemaLabels = labelsFrom("src/data/portfolioSchemas.ts")
const allowed = new Set([...templateLabels, ...schemaLabels])

const works = JSON.parse(readFileSync(join(root, "server/fixtures/works.json"), "utf8"))

const strayCounts = new Map()
let entriesWithStrays = 0

for (const work of works) {
  const strays = (work.details ?? [])
    .map((detail) => detail.label)
    .filter((label) => !allowed.has(label))
  if (strays.length === 0) continue
  entriesWithStrays += 1
  for (const label of strays) strayCounts.set(label, (strayCounts.get(label) ?? 0) + 1)
}

console.log(`entries checked:            ${works.length}`)
console.log(`known field labels:         ${allowed.size}`)
console.log(`entries with stray labels:  ${entriesWithStrays}`)

if (strayCounts.size > 0) {
  console.log(`distinct stray labels:      ${strayCounts.size}\n`)
  const ranked = [...strayCounts].sort((a, b) => b[1] - a[1])
  for (const [label, count] of ranked.slice(0, 20)) {
    console.log(`  ${String(count).padStart(3)}  ${label}`)
  }
  if (ranked.length > 20) console.log(`  … and ${ranked.length - 20} more`)
  console.log(
    "\nThese labels appear on case study pages but no form produces them.\n" +
      "Either add the field to the right template, or relabel the fixture.",
  )
} else {
  console.log("\nEvery seeded detail label maps to a real form field.")
}

process.exit(0)
