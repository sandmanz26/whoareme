import { BUSINESS_MODEL_OPTIONS } from "./businessModels"
import type { RoleId } from "./taxonomy"

export type FieldKind = "text" | "textarea" | "url" | "number" | "tags" | "select"

export interface FieldSpec {
  name: string
  label: string
  kind: FieldKind
  placeholder?: string
  hint?: string
  required?: boolean
  maxLength?: number
  /** Required for `select`. */
  options?: ReadonlyArray<{ value: string; label: string }>
  /** Marks a metric worth showing on the card - keep it to two or three. */
  proof?: boolean
}

export interface RoleSchema {
  role: RoleId
  /** Sets expectations before the person starts typing. */
  headline: string
  intro: string
  fields: FieldSpec[]
}

/**
 * Every craft proves itself differently. A developer's evidence is latency and
 * a diff; a researcher's is who they talked to and what the team decided
 * afterwards. Forcing both through one generic "description" box is exactly
 * what makes portfolio sites unusable for hiring - so the second half of the
 * form is generated from the schema for the role the author picks.
 */
export const ROLE_SCHEMAS: Record<RoleId, RoleSchema> = {
  design: {
    role: "design",
    headline: "Show the decisions, not just the pixels",
    intro: "Anyone can post a dribbble shot. Say what you changed and how you knew it worked.",
    fields: [
      {
        name: "designProblem",
        label: "User problem you were solving",
        kind: "textarea",
        required: true,
        placeholder: "Enterprise users abandoned the approval flow at step 3…",
        maxLength: 400,
      },
      {
        name: "process",
        label: "Process & methods",
        kind: "tags",
        placeholder: "Discovery, Service blueprint, Prototyping",
        hint: "Comma separated.",
      },
      { name: "tools", label: "Tools", kind: "tags", placeholder: "Figma, Framer, Maze" },
      {
        name: "taskSuccess",
        label: "Task success / usability result",
        kind: "text",
        proof: true,
        placeholder: "Task success 61% → 92%",
        hint: "The number that shows it landed.",
      },
      {
        name: "adoption",
        label: "Adoption or business outcome",
        kind: "text",
        proof: true,
        placeholder: "Support tickets down 34% in a quarter",
      },
      {
        name: "systemImpact",
        label: "Design system contribution",
        kind: "text",
        placeholder: "12 new components, adopted by 4 squads",
      },
      { name: "caseStudy", label: "Case study link", kind: "url", placeholder: "https://" },
      { name: "figma", label: "Figma / prototype link", kind: "url", placeholder: "https://" },
    ],
  },

  engineering: {
    role: "engineering",
    headline: "Ship evidence, not a stack list",
    intro: "Repo, scale, and the number that moved. Reviewers open the code first.",
    fields: [
      {
        name: "techProblem",
        label: "Engineering problem",
        kind: "textarea",
        required: true,
        placeholder: "Checkout p95 sat at 840ms under Black Friday load…",
        maxLength: 400,
      },
      {
        name: "architecture",
        label: "Architecture / approach",
        kind: "textarea",
        placeholder: "Split the monolith read path behind a CQRS projection…",
        maxLength: 400,
      },
      {
        name: "techStack",
        label: "Tech stack",
        kind: "tags",
        placeholder: "TypeScript, Postgres, Kafka, Kubernetes",
        hint: "Comma separated. Shows on the card and feeds the stack filter.",
      },
      {
        name: "performance",
        label: "Performance result",
        kind: "text",
        proof: true,
        placeholder: "p95 840ms → 120ms",
      },
      {
        name: "scale",
        label: "Scale it runs at",
        kind: "text",
        proof: true,
        placeholder: "18k req/s, 40M rows/day",
      },
      {
        name: "ownership",
        label: "What was yours specifically",
        kind: "text",
        placeholder: "Owned the projection service and the migration",
      },
      {
        name: "testing",
        label: "Testing & reliability",
        kind: "text",
        placeholder: "94% branch coverage, zero P1s post-launch",
      },
      { name: "repo", label: "Repository", kind: "url", placeholder: "https://github.com/…" },
      { name: "live", label: "Live environment", kind: "url", placeholder: "https://" },
    ],
  },

  product: {
    role: "product",
    headline: "Bets, evidence, and what actually shipped",
    intro: "The interesting part is what you chose not to build, and why.",
    fields: [
      {
        name: "opportunity",
        label: "Opportunity or bet",
        kind: "textarea",
        required: true,
        placeholder: "Self-serve trials converted at 2.1% while sales-led sat at 19%…",
        maxLength: 400,
      },
      {
        name: "discovery",
        label: "How you validated it",
        kind: "textarea",
        placeholder: "28 customer calls, two painted-door tests…",
        maxLength: 400,
      },
      {
        name: "primaryMetric",
        label: "Primary metric moved",
        kind: "text",
        proof: true,
        placeholder: "Trial → paid 2.1% → 6.4%",
      },
      {
        name: "businessImpact",
        label: "Business impact",
        kind: "text",
        proof: true,
        placeholder: "$1.2M net-new ARR in two quarters",
      },
      {
        name: "descoped",
        label: "What you deliberately cut",
        kind: "text",
        placeholder: "Dropped the workspace migration to ship a quarter earlier",
      },
      {
        name: "stakeholders",
        label: "Who you worked with",
        kind: "text",
        placeholder: "6 engineers, 1 designer, sales + finance",
      },
      { name: "prd", label: "PRD or strategy doc", kind: "url", placeholder: "https://" },
      { name: "launch", label: "Launch / changelog link", kind: "url", placeholder: "https://" },
    ],
  },

  data: {
    role: "data",
    headline: "Baselines, evals, and what shipped to production",
    intro: "A notebook is not a result. Show the baseline you beat and where it runs.",
    fields: [
      {
        name: "question",
        label: "Question or task",
        kind: "textarea",
        required: true,
        placeholder: "Flag fraudulent merchant onboarding within 60 seconds…",
        maxLength: 400,
      },
      {
        name: "dataset",
        label: "Data you worked with",
        kind: "text",
        placeholder: "42M transactions, heavily imbalanced (0.3% positive)",
      },
      {
        name: "approach",
        label: "Modelling approach",
        kind: "textarea",
        placeholder: "Gradient-boosted baseline, then a graph model over merchant links…",
        maxLength: 400,
      },
      {
        name: "evalMetric",
        label: "Eval result vs baseline",
        kind: "text",
        proof: true,
        placeholder: "PR-AUC 0.61 → 0.83 vs rules baseline",
      },
      {
        name: "production",
        label: "Production impact",
        kind: "text",
        proof: true,
        placeholder: "Serving 900 req/s, ~$40k/month fraud prevented",
      },
      {
        name: "guardrails",
        label: "Evals, drift & guardrails",
        kind: "text",
        placeholder: "Weekly drift checks, human review above 0.7",
      },
      { name: "notebook", label: "Notebook / paper / repo", kind: "url", placeholder: "https://" },
      { name: "dashboard", label: "Dashboard or demo", kind: "url", placeholder: "https://" },
    ],
  },

  infra: {
    role: "infra",
    headline: "Before and after, in numbers your on-call feels",
    intro: "Deploy frequency, MTTR, cost. Infra work is invisible until you quantify it.",
    fields: [
      {
        name: "infraProblem",
        label: "Platform problem",
        kind: "textarea",
        required: true,
        placeholder: "Deploys took 55 minutes and needed a human at every stage…",
        maxLength: 400,
      },
      {
        name: "tooling",
        label: "Tooling",
        kind: "tags",
        placeholder: "Terraform, ArgoCD, Kubernetes, Grafana",
      },
      {
        name: "deployMetric",
        label: "Delivery result",
        kind: "text",
        proof: true,
        placeholder: "Deploys 3/week → 40/day, lead time 55min → 9min",
      },
      {
        name: "reliability",
        label: "Reliability result",
        kind: "text",
        proof: true,
        placeholder: "MTTR 4h → 18min, 99.97% availability",
      },
      {
        name: "cost",
        label: "Cost impact",
        kind: "text",
        placeholder: "Compute spend down 38% ($21k/month)",
      },
      {
        name: "blastRadius",
        label: "Scope you were responsible for",
        kind: "text",
        placeholder: "34 services, 6 squads, 3 regions",
      },
      { name: "iac", label: "IaC repo or module", kind: "url", placeholder: "https://" },
      {
        name: "writeup",
        label: "Runbook / postmortem writeup",
        kind: "url",
        placeholder: "https://",
      },
    ],
  },

  quality: {
    role: "quality",
    headline: "Escape rate beats test count",
    intro: "Show the strategy and what stopped reaching production because of it.",
    fields: [
      {
        name: "qualityProblem",
        label: "Quality problem",
        kind: "textarea",
        required: true,
        placeholder: "Regression passes took four days and still missed payment edge cases…",
        maxLength: 400,
      },
      {
        name: "strategy",
        label: "Test strategy",
        kind: "textarea",
        placeholder: "Pushed contract tests down the pyramid, kept 40 critical E2E journeys…",
        maxLength: 400,
      },
      {
        name: "escapeRate",
        label: "Defect escape rate",
        kind: "text",
        proof: true,
        placeholder: "Escaped defects 23/release → 3/release",
      },
      {
        name: "cycleTime",
        label: "Regression cycle time",
        kind: "text",
        proof: true,
        placeholder: "Full regression 4 days → 35 minutes",
      },
      {
        name: "automation",
        label: "Automation footprint",
        kind: "text",
        placeholder: "780 automated cases, 12min CI gate",
      },
      {
        name: "frameworks",
        label: "Frameworks",
        kind: "tags",
        placeholder: "Playwright, Pact, k6",
      },
      { name: "pipeline", label: "Pipeline or report link", kind: "url", placeholder: "https://" },
      { name: "repo", label: "Test repo", kind: "url", placeholder: "https://" },
    ],
  },

  growth: {
    role: "growth",
    headline: "Experiments with a control group",
    intro: "A channel and a hypothesis, not a list of tools you have logins for.",
    fields: [
      {
        name: "growthProblem",
        label: "Growth problem",
        kind: "textarea",
        required: true,
        placeholder: "Activation stalled at 21% because setup needed a developer…",
        maxLength: 400,
      },
      {
        name: "hypothesis",
        label: "Hypothesis & experiment design",
        kind: "textarea",
        placeholder: "If we ship a no-code connector, activation rises - 50/50 split over 6 weeks…",
        maxLength: 400,
      },
      {
        name: "lift",
        label: "Result vs control",
        kind: "text",
        proof: true,
        placeholder: "Activation 21% → 34% (p < 0.01, n = 18k)",
      },
      {
        name: "efficiency",
        label: "Spend efficiency",
        kind: "text",
        proof: true,
        placeholder: "CAC $410 → $260, payback 14mo → 8mo",
      },
      {
        name: "channels",
        label: "Channels",
        kind: "tags",
        placeholder: "Lifecycle email, Paid social, SEO",
      },
      {
        name: "retention",
        label: "Did it hold?",
        kind: "text",
        placeholder: "Week-8 retention flat, so the lift was real",
      },
      { name: "dashboard", label: "Dashboard or writeup", kind: "url", placeholder: "https://" },
      {
        name: "creative",
        label: "Creative or campaign link",
        kind: "url",
        placeholder: "https://",
      },
    ],
  },

  research: {
    role: "research",
    headline: "Who you talked to, and what changed because of it",
    intro: "Research without a decision attached is a document nobody read.",
    fields: [
      {
        name: "researchQuestion",
        label: "Research question",
        kind: "textarea",
        required: true,
        placeholder: "Why do field engineers re-enter data they already captured offline?",
        maxLength: 400,
      },
      {
        name: "method",
        label: "Method & sample",
        kind: "text",
        placeholder: "14 contextual inquiries across 3 sites, 2 diary studies",
      },
      {
        name: "findings",
        label: "Key finding",
        kind: "textarea",
        placeholder: "Sync failures were silent, so people kept a paper backup…",
        maxLength: 400,
      },
      {
        name: "decision",
        label: "Decision it changed",
        kind: "text",
        proof: true,
        placeholder: "Killed the planned redesign, shipped offline-first sync instead",
      },
      {
        name: "downstream",
        label: "Downstream outcome",
        kind: "text",
        proof: true,
        placeholder: "Duplicate entries down 71% within two releases",
      },
      {
        name: "artefacts",
        label: "Artefacts produced",
        kind: "tags",
        placeholder: "Journey map, Opportunity tree, Research repo",
      },
      { name: "report", label: "Report or repository", kind: "url", placeholder: "https://" },
      { name: "readout", label: "Readout deck", kind: "url", placeholder: "https://" },
    ],
  },
}

/** Shared across every craft - the part of a case study nobody gets to skip. */
export const COMMON_FIELDS: FieldSpec[] = [
  {
    name: "title",
    label: "Project title",
    kind: "text",
    required: true,
    placeholder: "Rebuilding checkout for 18k req/s",
    maxLength: 90,
  },
  {
    name: "summary",
    label: "One-line summary",
    kind: "text",
    required: true,
    placeholder: "What it was, in the sentence you'd say out loud.",
    maxLength: 140,
  },
  { name: "year", label: "Year", kind: "number", required: true, placeholder: "2025" },
  { name: "duration", label: "Duration", kind: "text", placeholder: "4 months" },
  {
    name: "model",
    label: "Business model",
    kind: "select",
    required: true,
    options: BUSINESS_MODEL_OPTIONS,
    hint: "How the thing you worked on made money. Used to find comparable work.",
  },
  {
    name: "scope",
    label: "Your scope",
    kind: "text",
    placeholder: "Team of 6 · I owned the payment path",
  },
]

export const STORY_FIELDS: FieldSpec[] = [
  {
    name: "problem",
    label: "The problem",
    kind: "textarea",
    required: true,
    placeholder: "What was broken, and who it hurt.",
    maxLength: 500,
  },
  {
    name: "approach",
    label: "What you did",
    kind: "textarea",
    required: true,
    placeholder: "The decisions, the trade-offs, the parts that failed first.",
    maxLength: 500,
  },
  {
    name: "outcome",
    label: "What changed",
    kind: "textarea",
    required: true,
    placeholder: "The result, honestly. 'It never shipped' is a valid answer.",
    maxLength: 500,
  },
]

export function schemaFor(role: RoleId): RoleSchema {
  return ROLE_SCHEMAS[role]
}
