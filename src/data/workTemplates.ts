import type { FieldSpec } from "./portfolioSchemas"
import { ROLE_SCHEMAS } from "./portfolioSchemas"
import type { RoleId } from "./taxonomy"

/**
 * Templates: the second question, after "which craft is this".
 *
 * A role tells you the vocabulary. It does not tell you the *shape* of the
 * work, and the shape is what decides which questions are worth asking. A
 * designer's design-system contribution and their flagship case study are both
 * design, and almost nothing they should be asked about is the same: one is
 * judged on adoption and governance over years, the other on a decision and a
 * task-success number.
 *
 * Five shapes cover almost everything people actually have to show:
 *
 * - `shipped`    A bounded thing that launched. Problem, decisions, outcome.
 * - `system`     Reusable, serves other teams. Judged on adoption, not launch.
 * - `craft`      The artefact itself. Judged on constraints and decisions.
 * - `discovery`  The deliverable is a decision, not a shipped thing.
 * - `rescue`     Something was failing. Judged on recurrence, not the fix.
 * - `leadership` The team and the practice. Judged on what the team could do after.
 *
 * Every role gets exactly four, never all six. Four is enough range to cover a
 * real career and few enough to pick from without deliberating - a chooser
 * with eight options stops being a help and becomes another form.
 */
export const ARCHETYPES = [
  "shipped",
  "system",
  "craft",
  "discovery",
  "rescue",
  "leadership",
] as const

export type Archetype = (typeof ARCHETYPES)[number]

/**
 * The questions each shape is defined by. Role-specific vocabulary is layered
 * on top per template, so the same shape stays recognisable across crafts.
 */
const ARCHETYPE_FIELDS: Record<Archetype, FieldSpec[]> = {
  // `shipped` deliberately has no base: it uses the craft's own evidence
  // schema, which is already specific and already good.
  shipped: [],

  system: [
    { name: "systemScope", label: "What it covers", kind: "textarea", required: true, placeholder: "Which surfaces, which teams, which parts of the problem it does and does not solve.", maxLength: 400 },
    { name: "adoption", label: "Adoption", kind: "text", proof: true, placeholder: "Used by 6 of 8 squads, 88% of shipped surfaces", hint: "A system nobody adopted is a proposal." },
    { name: "governance", label: "How changes get decided", kind: "textarea", placeholder: "Who can change it, what the review is, how a breaking change is handled.", maxLength: 400 },
    { name: "maintenance", label: "How it survives you", kind: "text", proof: true, placeholder: "Still maintained 2 years on by a rota of 3", hint: "The real test of a system is what happens after the person who built it leaves." },
    { name: "contribution", label: "What was specifically yours", kind: "text", placeholder: "I owned the token layer and the migration codemods" },
    { name: "repo", label: "Repository, docs or library", kind: "url", placeholder: "https://" },
  ],

  craft: [
    { name: "brief", label: "The brief or the constraint", kind: "textarea", required: true, placeholder: "What you were asked for, and what you were not allowed to do.", maxLength: 400 },
    { name: "decisions", label: "Decisions you would defend", kind: "textarea", placeholder: "The two or three choices someone could disagree with, and why you made them.", maxLength: 400 },
    { name: "hardest", label: "The hardest constraint", kind: "text", placeholder: "Had to render legibly at 16px on a 2G connection" },
    { name: "technique", label: "Techniques and tools", kind: "tags", placeholder: "Variable fonts, Figma, After Effects" },
    { name: "reception", label: "How it was received or measured", kind: "text", proof: true, placeholder: "Shipped across 4 markets; brand recall +12pt", hint: "Even craft work lands somewhere. Say where." },
    { name: "artefact", label: "Link to the work itself", kind: "url", placeholder: "https://" },
  ],

  discovery: [
    { name: "question", label: "The question", kind: "textarea", required: true, placeholder: "What was genuinely unknown, and who was about to make a decision without knowing it.", maxLength: 400 },
    { name: "method", label: "Method and sample", kind: "text", placeholder: "14 contextual inquiries across 3 sites, 2 diary studies" },
    { name: "finding", label: "What you found", kind: "textarea", placeholder: "Including the part that contradicted what the team expected.", maxLength: 400 },
    { name: "decision", label: "The decision it changed", kind: "text", proof: true, placeholder: "Cancelled a funded redesign, shipped offline-first sync instead", hint: "Research with no decision attached is a document nobody read." },
    { name: "downstream", label: "What happened afterwards", kind: "text", proof: true, placeholder: "Duplicate entries down 71% in two releases" },
    { name: "report", label: "Report, repository or readout", kind: "url", placeholder: "https://" },
  ],

  rescue: [
    { name: "failure", label: "What was failing", kind: "textarea", required: true, placeholder: "The symptom, who it hurt, and how long it had been going on.", maxLength: 400 },
    { name: "diagnosis", label: "How you found the cause", kind: "textarea", placeholder: "Including the first theory that turned out to be wrong.", maxLength: 400 },
    { name: "beforeAfter", label: "Before and after", kind: "text", proof: true, placeholder: "MTTR 4h → 18min", hint: "The number that says it is actually fixed." },
    { name: "recurrence", label: "What stops it happening again", kind: "text", proof: true, placeholder: "Slow-dependency load test in CI; caught 2 similar cases since", hint: "Anyone can fix it once. This is the part that counts." },
    { name: "cost", label: "What it cost to get there", kind: "text", placeholder: "5 weeks, 3 engineers, one rolled-back release" },
    { name: "writeup", label: "Postmortem or writeup", kind: "url", placeholder: "https://" },
  ],

  leadership: [
    { name: "situation", label: "What it looked like when you arrived", kind: "textarea", required: true, placeholder: "Team size, what was broken, what everyone had already tried.", maxLength: 400 },
    { name: "change", label: "What you actually changed", kind: "textarea", placeholder: "Structure, process, hiring, standards - and what you deliberately left alone.", maxLength: 400 },
    { name: "teamOutcome", label: "What the team could do afterwards", kind: "text", proof: true, placeholder: "Shipped weekly instead of quarterly, with no extra headcount", hint: "Leadership is judged on the team's capability, not your output." },
    { name: "peopleMetric", label: "A people number", kind: "text", proof: true, placeholder: "Attrition 24% → 9%; 6 hires, 5 still here after 2 years" },
    { name: "mistake", label: "What you got wrong", kind: "textarea", placeholder: "Any leadership story without one of these is a press release.", maxLength: 300 },
    { name: "scopeOfRole", label: "Scope", kind: "text", placeholder: "3 squads, 21 engineers, 2 managers reporting in" },
  ],
}

export interface WorkTemplate {
  id: string
  archetype: Archetype
  /** What this kind of work is called in this craft. */
  label: string
  blurb: string
  /** Shown at the top of the evidence section in the editor. */
  headline: string
  intro: string
  /** Layered on the archetype base. */
  extraFields?: FieldSpec[]
}

/**
 * Four per craft, in the order a career tends to produce them: the thing you
 * shipped, the thing you built for others, the thing that went wrong, and the
 * team you left behind.
 */
export const WORK_TEMPLATES: Record<RoleId, WorkTemplate[]> = {
  design: [
    { id: "design-case", archetype: "shipped", label: "Case study",
      blurb: "One flow or product, start to finish",
      headline: "Show the decisions, not just the pixels",
      intro: "Anyone can post a shot. Say what you changed and how you knew it worked." },
    { id: "design-system", archetype: "system", label: "Design system",
      blurb: "Components, tokens, patterns other people use",
      headline: "A system is judged on adoption, not on its documentation site",
      intro: "The interesting questions are who adopted it, who refused, and what happens when you leave." },
    { id: "design-craft", archetype: "craft", label: "Craft piece",
      blurb: "Identity, illustration, motion - the making itself",
      headline: "The artefact, and the constraints it was made under",
      intro: "No outcome metric required. The brief, the hard constraint and the decisions you would defend are the evidence.",
      extraFields: [{ name: "medium", label: "Medium and format", kind: "text", placeholder: "Identity system, 14 assets, print and screen" }] },
    { id: "design-leadership", archetype: "leadership", label: "Design leadership",
      blurb: "A team, a practice, a way of working",
      headline: "What the team could do afterwards",
      intro: "Your own output stops being the point somewhere around the second report." },
  ],

  engineering: [
    { id: "eng-shipped", archetype: "shipped", label: "Shipped project",
      blurb: "A feature or service that went live",
      headline: "Ship evidence, not a stack list",
      intro: "Repo, scale, and the number that moved. Reviewers open the code first." },
    { id: "eng-platform", archetype: "system", label: "Platform or library",
      blurb: "Something other engineers build on",
      headline: "Adoption is the only review that counts",
      intro: "A beautiful internal library with two users is a side project with a budget." },
    { id: "eng-incident", archetype: "rescue", label: "Incident or turnaround",
      blurb: "Something was broken and you fixed it",
      headline: "Anyone can fix it once",
      intro: "The diagnosis and what stops it recurring are worth more than the patch.",
      extraFields: [{ name: "blastRadius", label: "Who it affected", kind: "text", placeholder: "90 minutes, all payments, ~40k customers" }] },
    { id: "eng-leadership", archetype: "leadership", label: "Engineering leadership",
      blurb: "Org design, hiring, technical direction",
      headline: "What the team could do afterwards",
      intro: "Architecture decisions count here only if you can say what they cost." },
  ],

  product: [
    { id: "prod-bet", archetype: "shipped", label: "Shipped bet",
      blurb: "A thing you decided to build, and did",
      headline: "Bets, evidence, and what actually shipped",
      intro: "The interesting part is what you chose not to build, and why." },
    { id: "prod-discovery", archetype: "discovery", label: "Discovery or strategy",
      blurb: "Research, positioning, a decision - no launch required",
      headline: "A decision is a deliverable",
      intro: "Work that changed direction counts, including work that stopped something." },
    { id: "prod-rescue", archetype: "rescue", label: "Turnaround",
      blurb: "A product, funnel or line that was failing",
      headline: "What was actually wrong",
      intro: "Most turnarounds are a diagnosis problem wearing a delivery costume." },
    { id: "prod-leadership", archetype: "leadership", label: "Product leadership",
      blurb: "A team, a portfolio, a practice",
      headline: "What the team could do afterwards",
      intro: "Roadmaps are not outcomes. What changed in how the team decides?" },
  ],

  data: [
    { id: "data-shipped", archetype: "shipped", label: "Model or analysis in production",
      blurb: "Something that runs and decides",
      headline: "Baselines, evals, and what shipped to production",
      intro: "A notebook is not a result. Show the baseline you beat and where it runs." },
    { id: "data-platform", archetype: "system", label: "Data platform",
      blurb: "Pipelines, warehouse, tooling others depend on",
      headline: "Judged on what it unblocked",
      intro: "The number is how much faster everyone else got, not how elegant the DAG is." },
    { id: "data-investigation", archetype: "discovery", label: "Investigation",
      blurb: "An analysis whose output was a decision",
      headline: "A decision is a deliverable",
      intro: "The best data work often ends with something being cancelled." },
    { id: "data-leadership", archetype: "leadership", label: "Data leadership",
      blurb: "A team, governance, a practice",
      headline: "What the team could do afterwards",
      intro: "Including the standards you set that slowed people down on purpose." },
  ],

  infra: [
    { id: "infra-platform", archetype: "system", label: "Platform build",
      blurb: "Something every other team runs on",
      headline: "Adoption is the only review that counts",
      intro: "A platform teams route around is a tax, not a platform." },
    { id: "infra-migration", archetype: "shipped", label: "Migration",
      blurb: "Moving something large without breaking it",
      headline: "Before and after, in numbers your on-call feels",
      intro: "Deploy frequency, MTTR, cost. Infra work is invisible until you quantify it." },
    { id: "infra-incident", archetype: "rescue", label: "Incident or reliability",
      blurb: "An outage, a saturation, a recurring failure",
      headline: "Anyone can fix it once",
      intro: "What stops it recurring is the part that earns trust.",
      extraFields: [{ name: "blastRadius", label: "Who it affected", kind: "text", placeholder: "34 services, 6 squads, 3 regions" }] },
    { id: "infra-leadership", archetype: "leadership", label: "Platform leadership",
      blurb: "A team, an on-call culture, a practice",
      headline: "What the team could do afterwards",
      intro: "On-call load is a leadership metric. So is who is willing to join the rota." },
  ],

  quality: [
    { id: "qa-strategy", archetype: "shipped", label: "Test strategy",
      blurb: "A strategy you designed and rolled out",
      headline: "Escape rate beats test count",
      intro: "Show the strategy and what stopped reaching production because of it." },
    { id: "qa-platform", archetype: "system", label: "Automation platform",
      blurb: "A harness or framework other teams use",
      headline: "Adoption is the only review that counts",
      intro: "A suite people re-run until it goes green has stopped being a signal." },
    { id: "qa-escape", archetype: "rescue", label: "Escape or incident",
      blurb: "Something reached production that should not have",
      headline: "What let it through",
      intro: "The honest version of this is one of the most useful things a QA portfolio can contain." },
    { id: "qa-leadership", archetype: "leadership", label: "Quality leadership",
      blurb: "A team, a culture, a definition of done",
      headline: "What the team could do afterwards",
      intro: "Quality owned by a quality team is the problem, not the solution." },
  ],

  growth: [
    { id: "growth-experiment", archetype: "shipped", label: "Experiment or campaign",
      blurb: "A test with a control group",
      headline: "Experiments with a control group",
      intro: "A channel and a hypothesis, not a list of tools you have logins for." },
    { id: "growth-system", archetype: "system", label: "Growth system",
      blurb: "Lifecycle, attribution, an experiment platform",
      headline: "Judged on what it let the team learn",
      intro: "Measurement infrastructure is growth work, and it outlives every campaign." },
    { id: "growth-rescue", archetype: "rescue", label: "Channel turnaround",
      blurb: "A channel or funnel that stopped working",
      headline: "What was actually wrong",
      intro: "Usually the measurement, not the creative." },
    { id: "growth-leadership", archetype: "leadership", label: "Growth leadership",
      blurb: "A team, a budget, an experiment culture",
      headline: "What the team could do afterwards",
      intro: "Including the experiments you killed and the ones you refused to run." },
  ],

  research: [
    { id: "res-study", archetype: "discovery", label: "Study",
      blurb: "A piece of research with a decision attached",
      headline: "Who you talked to, and what changed because of it",
      intro: "Research without a decision attached is a document nobody read." },
    { id: "res-ops", archetype: "system", label: "Research practice",
      blurb: "ResearchOps, a panel, a repository",
      headline: "Judged on what it let others do",
      intro: "A repository nobody searches is a folder." },
    { id: "res-foundational", archetype: "shipped", label: "Foundational or strategic",
      blurb: "Long-running work that reframed something",
      headline: "What the organisation believed afterwards",
      intro: "The slowest research to justify and often the most valuable.",
      extraFields: [{ name: "horizon", label: "Time horizon", kind: "text", placeholder: "9 months, 4 phases, 60 participants" }] },
    { id: "res-leadership", archetype: "leadership", label: "Research leadership",
      blurb: "A team, a practice, research literacy",
      headline: "What the team could do afterwards",
      intro: "Including teams that started doing their own research without you." },
  ],
}

/** Flat lookup by id, since a draft only stores the id. */
const BY_ID = new Map<string, { role: RoleId; template: WorkTemplate }>(
  (Object.entries(WORK_TEMPLATES) as Array<[RoleId, WorkTemplate[]]>).flatMap(([role, list]) =>
    list.map((template) => [template.id, { role, template }] as const),
  ),
)

export function templatesFor(role: RoleId): WorkTemplate[] {
  return WORK_TEMPLATES[role]
}

/** The default for a role - the first, which is always its most common shape. */
export function defaultTemplateId(role: RoleId): string {
  return WORK_TEMPLATES[role][0]!.id
}

export function templateById(id: string | undefined): WorkTemplate | undefined {
  return id ? BY_ID.get(id)?.template : undefined
}

/**
 * The evidence questions for a template.
 *
 * `shipped` falls back to the craft's own schema, which is already specific.
 * Everything else is the archetype base plus whatever the craft adds.
 */
export function fieldsForTemplate(role: RoleId, templateId: string | undefined): FieldSpec[] {
  const template = templateById(templateId) ?? WORK_TEMPLATES[role][0]!
  const base =
    template.archetype === "shipped"
      ? ROLE_SCHEMAS[role].fields
      : ARCHETYPE_FIELDS[template.archetype]
  return [...base, ...(template.extraFields ?? [])]
}

export function templateHeadline(role: RoleId, templateId: string | undefined) {
  const template = templateById(templateId) ?? WORK_TEMPLATES[role][0]!
  return { headline: template.headline, intro: template.intro, label: template.label }
}
