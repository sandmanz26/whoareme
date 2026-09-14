import type { Work } from "./work"

/**
 * Depth for the seeded directory.
 *
 * `portfolios.ts` holds the original breadth - one or two entries across many
 * people. This file gives a smaller set of people a real body of work, so the
 * profile page has something to group and the per-topic split is worth looking
 * at.
 *
 * Two rules were followed writing these, because the product enforces them on
 * everyone else:
 *
 * 1. **Two entries per topic, per person, maximum.** Seed data that quietly
 *    breaks the quota would make the rule look negotiable.
 * 2. **Not everything succeeded.** Cancelled projects, accepted regressions and
 *    migrations that were called off are in here on purpose. A directory where
 *    every outcome is a win reads as marketing.
 */
export const EXTRA_WORK: Work[] = [
  // ── Rani Ardhana · design ───────────────────────────────────────────
  {
    id: "ds-contribution-model",
    authorId: "rani-ardhana",
    role: "design",
    topics: ["design-ops"],
    model: "platform",
    skills: ["Design systems", "Governance", "Figma", "Documentation"],
    title: "A design system people contributed back to",
    summary: "Four squads were forking components instead of fixing them. The system had no way in.",
    year: 2025,
    duration: "6 months",
    scope: "Solo systems designer · 4 consuming squads",
    problem:
      "The library had 74 components and a 31% adoption rate. Squads were copying components into their own files and editing them there, which meant every accessibility fix had to be made five times. Nobody was being lazy - there was simply no route from 'this component is wrong' to 'this component is fixed' that took less than three weeks.",
    approach:
      "Wrote a contribution path with a hard promise attached: a proposal gets a yes or a no within five working days, and a no comes with the reason and an alternative. Cut the component count to 41 first, because a library nobody trusts is not made trustworthy by growing. The five-day promise was the entire mechanism; the documentation site was secondary and I would build it later next time.",
    outcome:
      "Adoption reached 82% in two quarters and 23 changes came from outside the systems team. The fork count went from 19 to 3, and the remaining three are deliberate.",
    stack: ["Figma", "Storybook", "GitHub"],
    links: [{ label: "Contribution guide", href: "https://example.com/notionary/ds-contrib" }],
    details: [
      { label: "Adoption", value: "31% → 82% across 4 squads", proof: true },
      { label: "Contribution", value: "23 external changes merged in 2 quarters", proof: true },
      { label: "Scope", value: "74 components reduced to 41 before growing again" },
      { label: "Mechanism", value: "Five-working-day answer promise on every proposal" },
    ],
  },
  {
    id: "ds-token-migration",
    authorId: "rani-ardhana",
    role: "design",
    topics: ["design-ops"],
    model: "b2b-saas",
    skills: ["Design systems", "Design tokens", "Figma"],
    title: "The token migration we stopped halfway",
    summary: "We were six weeks into a three-tier token rename when I argued to abandon it.",
    year: 2024,
    duration: "6 weeks, then cancelled",
    scope: "Me plus one engineer",
    problem:
      "Our colour tokens were named for their value (`blue-600`) rather than their job (`action-primary`). The industry consensus says fix that, so we started a rename across 41 components and two codebases.",
    approach:
      "Six weeks in, I counted what had actually improved: nothing a user or a designer could name. The rename was generating merge conflicts for four engineers and had not prevented a single wrong-colour bug, because wrong-colour bugs were not a problem we had. I wrote the case for stopping and took it to the design lead myself.",
    outcome:
      "We stopped and reverted the incomplete half. Roughly 200 hours went in with nothing shipped. I keep it here because the useful part is the counting, and because the same proposal came back a year later with an actual problem attached - theming for a white-label client - and that time it was right.",
    stack: ["Figma", "Style Dictionary"],
    links: [],
    details: [
      { label: "Outcome", value: "Cancelled at 6 weeks; ~200 hours written off", proof: true },
      { label: "Judgement", value: "Argued to stop my own project" },
      { label: "Follow-on", value: "Revived a year later with a real driver (white-label theming)" },
    ],
  },
  {
    id: "erp-bulk-edit",
    authorId: "rani-ardhana",
    role: "design",
    topics: ["erp"],
    model: "enterprise",
    skills: ["Information architecture", "Usability testing", "Figma"],
    title: "Bulk edit for people who edit 400 rows a day",
    summary: "Power users had built a shadow workflow in Excel because our UI assumed one row at a time.",
    year: 2024,
    duration: "4 months",
    scope: "Solo designer with 3 engineers",
    problem:
      "Procurement clerks edited 300-500 line items a day through a UI designed for editing one. They had responded by exporting to Excel, editing there, and re-importing - which broke the audit trail the product legally had to maintain.",
    approach:
      "Sat with four clerks for a day each before drawing anything. The pattern was not 'edit many rows'; it was 'apply one decision to a filtered set'. Designed around filter-then-act rather than a spreadsheet grid, which is what everyone had assumed we would build. Kept an undo window of 30 seconds because the first prototype made people visibly nervous.",
    outcome:
      "Excel round-trips dropped 71% within a quarter. The audit gap closed as a side effect, which was the thing legal cared about and the thing clerks had never once mentioned.",
    stack: ["Figma", "Dovetail"],
    links: [],
    details: [
      { label: "Workflow", value: "Excel round-trips down 71%", proof: true },
      { label: "Time on task", value: "Batch of 200 rows: 38min → 4min", proof: true },
      { label: "Compliance", value: "Closed the audit-trail gap legal had flagged twice" },
      { label: "Research", value: "4 full-day contextual sessions before the first sketch" },
    ],
  },
  {
    id: "contrast-debt",
    authorId: "rani-ardhana",
    role: "design",
    topics: ["accessibility"],
    model: "b2b-saas",
    skills: ["Accessibility", "Design systems", "Figma"],
    title: "Paying down contrast debt without a redesign",
    summary: "Eleven per cent of our text failed WCAG AA. Nobody wanted a rebrand to fix it.",
    year: 2025,
    duration: "2 months",
    scope: "Solo · audit, fix and guard",
    problem:
      "An enterprise procurement review flagged contrast failures across the product. The honest count was 11% of text styles and 40% of disabled states. The instinct in the room was a palette overhaul, which would have taken a year and re-litigated the brand.",
    approach:
      "Fixed the ramp instead of the palette: kept every hue, adjusted lightness steps until each pairing we actually used cleared AA, and deleted the four steps nobody should have been using. Then added a CI check so the count cannot climb back, which is the part that made it stick.",
    outcome:
      "Zero AA failures in shipped surfaces, achieved without changing a single hue. The procurement review passed. The CI guard has blocked 14 regressions since.",
    stack: ["Figma", "axe", "GitHub Actions"],
    links: [{ label: "Contrast audit", href: "https://example.com/notionary/contrast" }],
    details: [
      { label: "Compliance", value: "11% of text failing AA → 0%", proof: true },
      { label: "Prevention", value: "14 regressions blocked in CI since launch", proof: true },
      { label: "Constraint", value: "No hue changed - brand untouched" },
    ],
  },

  // ── Elias Kovač · engineering ───────────────────────────────────────
  {
    id: "build-time-halved",
    authorId: "elias-kovac",
    role: "engineering",
    topics: ["devex"],
    model: "b2b-saas",
    skills: ["TypeScript", "Build systems", "Performance", "CI/CD"],
    title: "Cutting a 14-minute build to 4",
    summary: "Every engineer was losing about 40 minutes a day to CI, and had stopped noticing.",
    year: 2025,
    duration: "7 weeks",
    scope: "Solo, with review from the platform team",
    problem:
      "A full CI run took 14 minutes and ran on every push. Twenty-two engineers pushed roughly six times a day. The cost was invisible because it was spread thin, so it had never made a roadmap.",
    approach:
      "Measured before touching anything: 61% of the time was type-checking a monolithic tsconfig, not tests. Split into project references, turned on incremental builds and cached correctly on the CI side. Deliberately did not parallelise the test suite - that was the obvious move and would have hidden the real problem behind more machines.",
    outcome:
      "Median run went to 4 minutes 10 seconds. About 130 engineer-hours a month came back. Nobody thanked me for it, which is roughly what success looks like in this kind of work.",
    stack: ["TypeScript", "Turborepo", "GitHub Actions"],
    links: [{ label: "Build RFC", href: "https://example.com/loopbase/rfc-build" }],
    details: [
      { label: "Build time", value: "14min → 4min 10s median", proof: true },
      { label: "Recovered", value: "~130 engineer-hours per month", proof: true },
      { label: "Diagnosis", value: "61% of runtime was type-checking, not tests" },
      { label: "Rejected", value: "Parallelising the suite - would have masked the cause" },
    ],
  },
  {
    id: "flaky-test-quarantine",
    authorId: "elias-kovac",
    role: "engineering",
    topics: ["reliability"],
    model: "b2b-saas",
    skills: ["Testing", "CI/CD", "TypeScript"],
    title: "Killing the retry button",
    summary: "The team's reflex for a red build was to click retry. That reflex was the bug.",
    year: 2024,
    duration: "3 months",
    scope: "Me plus a rotating volunteer each sprint",
    problem:
      "About 9% of CI runs failed for reasons unrelated to the change. Engineers had learned to hit retry, which meant genuine failures got retried too - twice we shipped a real regression that a first run had caught.",
    approach:
      "Quarantined flaky tests into a non-blocking lane rather than deleting or fixing them immediately, so the main signal became trustworthy the same week. Then set a budget: the quarantine could hold at most 15 tests, and adding the sixteenth meant fixing one first. The budget did more than the tooling.",
    outcome:
      "Main-lane false failures fell to under 0.5%. The quarantine drained to four tests over five months without anyone being assigned to it.",
    stack: ["Vitest", "Playwright", "GitHub Actions"],
    links: [],
    details: [
      { label: "Signal", value: "9% false failures → under 0.5%", proof: true },
      { label: "Debt", value: "Quarantine drained 31 → 4 tests in 5 months", proof: true },
      { label: "Mechanism", value: "A hard cap of 15, not a cleanup sprint" },
    ],
  },
  {
    id: "rum-budget-enforcement",
    authorId: "elias-kovac",
    role: "engineering",
    topics: ["devex"],
    model: "b2b-saas",
    skills: ["Performance", "React", "TypeScript"],
    title: "Performance budgets that could actually block a merge",
    summary: "We had a performance dashboard nobody opened and a bundle that grew 4% a month.",
    year: 2024,
    duration: "2 months",
    scope: "Solo",
    problem:
      "Main bundle had grown from 380 kB to 620 kB in a year, one reasonable-looking PR at a time. The dashboard showed it. No mechanism connected the dashboard to the decision.",
    approach:
      "Put a byte budget in CI that fails the build, with a documented override that requires naming who approved the increase. The override mattered more than the limit - a budget with no escape hatch gets deleted the first time it blocks something urgent.",
    outcome:
      "Bundle came back to 410 kB over four months and has stayed flat since. The override has been used nine times, all of them legitimate, all of them recorded.",
    stack: ["Vite", "TypeScript", "GitHub Actions"],
    links: [],
    details: [
      { label: "Bundle", value: "620 kB → 410 kB, flat for 8 months", proof: true },
      { label: "Enforcement", value: "9 recorded overrides, all justified" },
      { label: "Design", value: "Escape hatch on purpose, so the budget survives urgency" },
    ],
  },

  // ── Ingrid Salvesen · design leadership ─────────────────────────────
  {
    id: "design-ops-from-zero",
    authorId: "ingrid-salvesen",
    role: "design",
    topics: ["design-ops", "leadership"],
    model: "enterprise",
    skills: ["Design ops", "Mentoring", "Process", "Hiring"],
    title: "Standing up design ops for eleven designers",
    summary: "Eleven designers, four countries, no shared file structure and no way to see load.",
    year: 2025,
    duration: "9 months",
    scope: "Head of Design · 11 designers across 4 sites",
    problem:
      "Designers were spending an estimated day a week on coordination overhead: finding the current file, chasing which engineer owned a spec, re-doing research someone in Stavanger had already done. Two people resigned within a month of each other and both cited it.",
    approach:
      "Resisted buying a tool first. Spent six weeks logging where the time actually went, which produced three problems, not ten: file discovery, research duplication, and invisible workload. Fixed them in that order with the smallest thing that worked - a naming convention, a research repository, and a shared capacity board that I kept manually for two months before automating anything.",
    outcome:
      "Coordination overhead measured down to roughly half a day a week. Research repository has 140 entries and gets hit before new studies about a third of the time. No further resignations citing process in the 14 months since.",
    stack: ["Figma", "Notion", "Dovetail"],
    links: [],
    details: [
      { label: "Overhead", value: "~1 day/week → ~0.5 day/week per designer", proof: true },
      { label: "Reuse", value: "Research repo consulted before ~1 in 3 new studies", proof: true },
      { label: "Retention", value: "No process-related resignations in 14 months" },
      { label: "Sequence", value: "Six weeks measuring before buying or building anything" },
    ],
  },
  {
    id: "design-hiring-loop",
    authorId: "ingrid-salvesen",
    role: "design",
    topics: ["hiring", "leadership"],
    model: "enterprise",
    skills: ["Hiring", "Mentoring", "Design ops"],
    title: "A portfolio review that stopped rewarding presentation",
    summary: "Our loop kept hiring people who presented well and struggled with ambiguity.",
    year: 2024,
    duration: "5 months",
    scope: "Head of Design · redesigned the loop with 3 interviewers",
    problem:
      "Three of our last six design hires were not working out, all in the same way: strong portfolio, strong presentation, then visibly lost when a brief was underspecified. The loop was measuring rehearsal quality.",
    approach:
      "Replaced the portfolio presentation with a 45-minute working session on a real, deliberately under-specified problem from our backlog - candidates could ask anything, and what we scored was the questions, not the output. Kept the portfolio as pre-read only. Published the scoring rubric to candidates beforehand, which cost us nothing and improved the sessions noticeably.",
    outcome:
      "Eight hires through the new loop, seven still in role at 18 months. Candidate feedback scores went up, not down, despite the format being harder. One senior candidate withdrew saying it was the most respectful process they had been through, which is not a metric but stayed with me.",
    stack: ["Miro", "Notion"],
    links: [],
    details: [
      { label: "Retention", value: "7 of 8 hires still in role at 18 months", proof: true },
      { label: "Candidate experience", value: "Rating up despite a harder format", proof: true },
      { label: "Change", value: "Portfolio demoted to pre-read; scored the questions asked" },
    ],
  },
  {
    id: "energy-control-room",
    authorId: "ingrid-salvesen",
    role: "design",
    topics: ["energy"],
    model: "enterprise",
    skills: ["Information architecture", "Safety-critical UX", "Figma"],
    title: "A control-room screen operators would look away from",
    summary: "The alarm panel was so noisy operators had learned to ignore the colour red.",
    year: 2023,
    duration: "8 months",
    scope: "Lead designer · 2 designers, 5 engineers, 9 operators consulted",
    problem:
      "A platform control room generated about 900 alarms per 12-hour shift, of which operators judged fewer than 20 actionable. Alarm fatigue is a known killer in this industry and we were a textbook case.",
    approach:
      "Did not redesign the panel first. Worked with process engineers to cut the alarms themselves - suppression on known cascades, removal of alarms with no operator action attached. Roughly 60% of them failed the 'what would you do about this' test. Only then redesigned what was left, with a hard rule that anything red required a documented response.",
    outcome:
      "Alarms per shift fell to about 120. Operator acknowledgement time on genuine criticals improved from 41 seconds to 9. An external safety audit cited the suppression logic specifically.",
    stack: ["Figma", "OSIsoft PI"],
    links: [],
    details: [
      { label: "Alarm load", value: "~900 → ~120 per 12-hour shift", proof: true },
      { label: "Response", value: "Critical acknowledgement 41s → 9s", proof: true },
      { label: "Approach", value: "Cut the alarms before redesigning the panel" },
      { label: "External", value: "Suppression logic cited in a safety audit" },
    ],
  },
  {
    id: "brand-refresh-deferred",
    authorId: "ingrid-salvesen",
    role: "design",
    topics: ["energy"],
    model: "enterprise",
    skills: ["Brand", "Design ops", "Mentoring"],
    title: "The brand refresh I talked the board out of",
    summary: "A new CEO wanted a refresh. The evidence said our problem was elsewhere.",
    year: 2024,
    duration: "6 weeks of analysis",
    scope: "Head of Design · presented to the executive team",
    problem:
      "A new CEO arrived and asked for a brand refresh, budgeted at roughly €400k. The stated goal was improving recruitment of engineers, who were choosing competitors.",
    approach:
      "Asked for six weeks to test the premise before spending. Interviewed 22 engineers who had turned us down. Brand came up twice, both times in passing; the recurring reasons were a three-week interview process and no remote policy. Presented that, with the transcripts, and recommended spending a fraction of the budget on the hiring loop instead.",
    outcome:
      "The refresh was shelved. Offer-accept rate went from 54% to 78% after the process changes, at about 4% of the proposed budget. The refresh happened two years later for real reasons, and I led it.",
    stack: ["Dovetail"],
    links: [],
    details: [
      { label: "Recruitment", value: "Offer-accept 54% → 78%", proof: true },
      { label: "Budget", value: "Solved at ~4% of the €400k proposed", proof: true },
      { label: "Method", value: "22 interviews with candidates who declined us" },
      { label: "Trade-off", value: "Argued against my own department's largest budget line" },
    ],
  },

  // ── Clara Whitfield · engineering leadership ────────────────────────
  {
    id: "oncall-that-people-survive",
    authorId: "clara-whitfield",
    role: "engineering",
    topics: ["reliability", "leadership"],
    model: "enterprise",
    skills: ["Org design", "Incident response", "Coaching"],
    title: "Making on-call something people would volunteer for",
    summary: "Two of six on-call engineers had asked to come off the rota in the same quarter.",
    year: 2025,
    duration: "2 quarters",
    scope: "VP Engineering · 6 rotas, 34 engineers",
    problem:
      "Median 4.1 pages per night shift, most of them not actionable. On-call had become the thing people negotiated out of at offer stage, which meant it concentrated on the newest and least able to refuse.",
    approach:
      "Made the page count a team metric owned by the team that generated it, and gave every team the right to delete their own alerts without asking. That was the uncomfortable part - several people expected it to be abused. It was not. Paired it with a rule that any page firing more than twice in a month with no action taken gets auto-suspended.",
    outcome:
      "Median pages per night shift went to 0.4. Time to acknowledge on real incidents halved, because the pages meant something again. Four engineers asked to join rotas they were not on.",
    stack: ["PagerDuty", "Datadog"],
    links: [],
    details: [
      { label: "Load", value: "4.1 → 0.4 pages per night shift", proof: true },
      { label: "Response", value: "Time to acknowledge halved on real incidents", proof: true },
      { label: "Culture", value: "4 engineers volunteered onto rotas" },
      { label: "Decision", value: "Gave teams unilateral authority to delete their own alerts" },
    ],
  },
  {
    id: "levelling-rewrite",
    authorId: "clara-whitfield",
    role: "engineering",
    topics: ["hiring"],
    model: "enterprise",
    skills: ["Org design", "Hiring", "Coaching"],
    title: "Rewriting a levelling ladder that rewarded visibility",
    summary: "Promotions were correlating with proximity to leadership, and the data said so.",
    year: 2024,
    duration: "3 quarters",
    scope: "VP Engineering · 34 engineers, with HR and 4 managers",
    problem:
      "I pulled three years of promotions against team and found engineers on platform and internal-tools teams were promoted at roughly half the rate of product teams at the same level. The ladder rewarded demos, and platform work does not demo.",
    approach:
      "Rewrote the senior-and-above criteria around evidence of leverage rather than visible delivery, and - the harder part - required every promotion case to cite at least one source from outside the candidate's own chain. Ran the old and new rubrics in parallel for two cycles so we could see the delta before committing.",
    outcome:
      "The gap closed to within a point over four cycles. Two promotions that would have passed under the old rubric did not pass under the new one, which was the evidence that it had teeth.",
    stack: ["Notion"],
    links: [],
    details: [
      { label: "Equity", value: "Platform vs product promotion gap effectively closed", proof: true },
      { label: "Rigour", value: "2 cases failed the new rubric that passed the old one", proof: true },
      { label: "Method", value: "Ran both rubrics in parallel for two cycles" },
    ],
  },
  {
    id: "payments-migration-rollback",
    authorId: "clara-whitfield",
    role: "engineering",
    topics: ["banking"],
    model: "enterprise",
    skills: ["Architecture", "Distributed systems", "Org design"],
    title: "Calling off a platform migration at 60%",
    summary: "Eighteen months in, I recommended we stop and keep the system we were replacing.",
    year: 2023,
    duration: "18 months, then stopped",
    scope: "VP Engineering · 14 engineers on the programme",
    problem:
      "We were migrating the payments ledger to a new platform on a business case built on maintenance savings. At 60% done, the remaining 40% was the part with the regulatory reporting in it, and our estimate for it had tripled.",
    approach:
      "Re-ran the business case with the new estimate instead of defending the original. It no longer cleared the bar, and would not have even if the estimate were half as bad. Recommended we stop, keep the migrated read paths, and leave the ledger where it was - which meant living with two systems, the outcome everyone had spent eighteen months trying to avoid.",
    outcome:
      "Stopped. Roughly €2.1m spent for partial benefit. The dual-run cost about €90k a year to maintain and is still running four years later, which was the right trade. I was wrong about the original estimate and said so in the write-up.",
    stack: ["Java", "Kafka", "Oracle"],
    links: [],
    details: [
      { label: "Outcome", value: "Cancelled at 60%; ~€2.1m spent", proof: true },
      { label: "Ongoing cost", value: "Dual-run ~€90k/year, accepted deliberately" },
      { label: "Judgement", value: "Re-ran the business case rather than defending it" },
    ],
  },

  // ── Tobi Adeyemi · infra ────────────────────────────────────────────
  {
    id: "golden-path-templates",
    authorId: "tobi-adeyemi",
    role: "infra",
    topics: ["devex"],
    model: "platform",
    skills: ["Kubernetes", "Terraform", "Go", "Developer experience"],
    title: "From eleven days to ninety minutes for a new service",
    summary: "Standing up a service meant copying someone else's repo and hoping it was current.",
    year: 2025,
    duration: "4 months",
    scope: "Platform team of 3 · I owned the templates",
    problem:
      "New services took a median of eleven days to reach production, almost all of it waiting: a ticket for a namespace, another for secrets, another for DNS. Teams had started copying an old repo and editing it, so half our services carried a 2022 base image.",
    approach:
      "Built a templated path that provisions the whole set in one command, and made a deliberate choice to support exactly three service shapes rather than a general-purpose generator. Anything outside the three still goes the manual route. That constraint is why it shipped in four months and why it stayed maintainable.",
    outcome:
      "Median time to production for a new service is now about 90 minutes. Thirty-one services on the path. Base-image drift went from 14 distinct versions to 2.",
    stack: ["Go", "Terraform", "Kubernetes", "Backstage"],
    links: [{ label: "Template repo", href: "https://github.com/rundeck-cloud/golden-path" }],
    details: [
      { label: "Lead time", value: "11 days → ~90 minutes", proof: true },
      { label: "Adoption", value: "31 services on the path", proof: true },
      { label: "Drift", value: "14 base-image versions → 2" },
      { label: "Constraint", value: "Three supported shapes, not a general generator" },
    ],
  },
  {
    id: "cost-per-tenant",
    authorId: "tobi-adeyemi",
    role: "infra",
    topics: ["reliability"],
    model: "b2b-saas",
    skills: ["Kubernetes", "Observability", "FinOps"],
    title: "Finding out which customers we lose money on",
    summary: "We knew the total cloud bill. We could not attribute a euro of it to a customer.",
    year: 2024,
    duration: "3 months",
    scope: "Solo, with finance",
    problem:
      "Infrastructure spend was growing faster than revenue and nobody could say where. Sales was discounting on gut feel because unit economics per tenant did not exist.",
    approach:
      "Tagged everything at the namespace level and built the attribution from the cluster's own accounting rather than the cloud bill, which is lower-fidelity and arrives a month late. Accepted an 8% unattributed bucket instead of chasing precision - the decisions this informs do not need three decimal places.",
    outcome:
      "Found that our four largest tenants by revenue included the two least profitable, one of them materially negative. Two contracts were repriced at renewal. Total spend fell 19% once teams could see their own line.",
    stack: ["Kubernetes", "Prometheus", "OpenCost", "BigQuery"],
    links: [],
    details: [
      { label: "Spend", value: "Total cloud cost down 19%", proof: true },
      { label: "Visibility", value: "92% of spend attributed to a tenant", proof: true },
      { label: "Commercial", value: "2 contracts repriced at renewal on this data" },
      { label: "Trade-off", value: "Accepted an 8% unattributed bucket over chasing precision" },
    ],
  },

  // ── Priya Raghunathan · data ────────────────────────────────────────
  {
    id: "eval-harness",
    authorId: "priya-raghunathan",
    role: "data",
    topics: ["devex", "reliability"],
    model: "b2b-saas",
    skills: ["Evals", "PyTorch", "RAG", "Python"],
    title: "An eval set that could actually fail a release",
    summary: "Every model change was argued from vibes and a handful of cherry-picked prompts.",
    year: 2025,
    duration: "5 months",
    scope: "Solo, then handed to a team of 4",
    problem:
      "We shipped model and prompt changes weekly with no regression signal. Twice we shipped something that improved the demo case and quietly degraded a customer's most common query type. Both times we found out from support.",
    approach:
      "Built the eval set from production traffic rather than invented examples, stratified by query type and weighted by actual frequency. The important decision was refusing to include a metric we could not tie to a user-visible failure - three proposed metrics were dropped for that reason, over objections.",
    outcome:
      "Runs on every change and has blocked eleven releases, three of which were regressions we would certainly have shipped. Two of the eleven were the harness being wrong, which is a cost worth naming.",
    stack: ["Python", "PyTorch", "Weights & Biases"],
    links: [{ label: "Harness", href: "https://github.com/verity-labs/evals" }],
    details: [
      { label: "Prevention", value: "11 releases blocked; 3 were genuine regressions", proof: true },
      { label: "Honesty", value: "2 of the 11 blocks were false positives", proof: true },
      { label: "Design", value: "Built from production traffic, weighted by real frequency" },
      { label: "Discipline", value: "Dropped 3 proposed metrics with no user-visible failure mode" },
    ],
  },
  {
    id: "retrieval-quality-ceiling",
    authorId: "priya-raghunathan",
    role: "data",
    topics: ["devex"],
    model: "b2b-saas",
    skills: ["RAG", "Python", "Evals"],
    title: "The retrieval problem that was a documentation problem",
    summary: "Six weeks of retrieval tuning moved nothing. The corpus was the ceiling.",
    year: 2024,
    duration: "6 weeks tuning, 4 months fixing the real thing",
    scope: "Me plus a technical writer",
    problem:
      "Answer quality had plateaued. The assumption - mine included - was that retrieval needed better embeddings or reranking. I spent six weeks on that and moved the metric by under two points.",
    approach:
      "Sampled 200 failures by hand. In 140 of them the correct answer was not in the corpus at all, or was in a three-year-old page contradicted by a newer one. The fix was not a model; it was deprecating 1,100 stale documents and giving the writer a freshness dashboard. I had to go back to my manager and say the last six weeks were spent on the wrong layer.",
    outcome:
      "Answer accuracy went from 68% to 89% on the eval set, almost entirely from corpus work. Retrieval tuning contributed about two of those points.",
    stack: ["Python", "pgvector", "LangChain"],
    links: [],
    details: [
      { label: "Accuracy", value: "68% → 89% on the eval set", proof: true },
      { label: "Attribution", value: "~2 of 21 points came from model work; the rest was corpus", proof: true },
      { label: "Method", value: "Hand-labelled 200 failures instead of tuning further" },
      { label: "Correction", value: "Six weeks spent on the wrong layer, reported as such" },
    ],
  },

  // ── Lily Chen · design, payments ────────────────────────────────────
  {
    id: "failed-payment-recovery",
    authorId: "lily-chen",
    role: "design",
    topics: ["finance"],
    model: "consumer",
    skills: ["Product design", "Usability testing", "Content design"],
    title: "The error message worth £1.2m",
    summary: "A declined card showed a code from the acquirer. People assumed fraud and left.",
    year: 2025,
    duration: "6 weeks",
    scope: "Solo designer with a content designer and 2 engineers",
    problem:
      "Declined payments showed the raw acquirer reason - 'do not honour', 'issuer unavailable'. Session replay showed people reading it, stopping, and not retrying. Support calls after a decline were 40% 'has my card been stolen'.",
    approach:
      "Mapped every decline code we actually received to one of four things the customer can do, and wrote for those four rather than the eighty codes. Where we genuinely do not know, the message says so - an early version guessed, and testing showed guessing wrong is much worse than admitting ignorance.",
    outcome:
      "Retry rate after a decline went from 31% to 58%, worth about £1.2m in recovered annual volume. Fraud-worry calls dropped by roughly two-thirds.",
    stack: ["Figma", "FullStory"],
    links: [],
    details: [
      { label: "Recovery", value: "Retry after decline 31% → 58%", proof: true },
      { label: "Revenue", value: "~£1.2m recovered annual volume", proof: true },
      { label: "Support", value: "Fraud-worry calls down ~66%" },
      { label: "Principle", value: "Says 'we don't know' rather than guessing a reason" },
    ],
  },
  {
    id: "payments-accessibility",
    authorId: "lily-chen",
    role: "design",
    topics: ["accessibility"],
    model: "consumer",
    skills: ["Accessibility", "Product design", "Usability testing"],
    title: "Testing checkout with people who use it differently",
    summary: "Our checkout passed automated accessibility checks and was still unusable with a screen reader.",
    year: 2024,
    duration: "4 months",
    scope: "Solo designer · 9 participants, 3 engineers",
    problem:
      "We had a clean axe report and a support thread from a blind customer who had given up paying us. Automated checks verify markup, not whether a flow makes sense when read aloud one element at a time.",
    approach:
      "Ran moderated sessions with nine people using screen readers, switch control and magnification - paid, and paid properly. The largest issues were nothing an automated tool looks for: an error summary that appeared visually above the form but after it in the DOM, and a timeout nobody using a screen reader could finish inside. Doubled the timeout rather than adding a warning, because a warning would have solved our problem and not theirs.",
    outcome:
      "Completion rate for screen-reader users went from 22% to 81%. The original customer completed a payment and wrote back. Three of the fixes turned out to help everyone and shipped to all users.",
    stack: ["Figma", "NVDA", "VoiceOver"],
    links: [],
    details: [
      { label: "Completion", value: "Screen-reader checkout 22% → 81%", proof: true },
      { label: "Research", value: "9 paid participants across 3 assistive technologies", proof: true },
      { label: "Finding", value: "Automated checks had passed the broken version" },
      { label: "Decision", value: "Extended the timeout rather than warning about it" },
    ],
  },

  // ── Andrés Ferrer · engineering, banking ────────────────────────────
  {
    id: "ledger-reconciliation",
    authorId: "andres-ferrer",
    role: "engineering",
    topics: ["reliability"],
    model: "enterprise",
    skills: ["Java", "Postgres", "Distributed systems"],
    title: "Reconciliation that finishes before the branches open",
    summary: "The overnight run had grown to 6h40m against a 7h window. Nobody had slept well in months.",
    year: 2024,
    duration: "5 months",
    scope: "Team of 4 · I owned the matching engine",
    problem:
      "End-of-day reconciliation ran 6h40m inside a seven-hour window and grew about 4% a month with volume. Two overruns had already delayed branch opening. The obvious fix - more hardware - had been applied twice and bought three months each time.",
    approach:
      "Profiled rather than scaled. Eighty per cent of the time was in a matching step doing a full comparison for every unmatched item, including items that could not possibly match by date. Added the cheap exclusions first, then parallelised what was left by account partition. Did not touch the matching logic itself, because it was correct and heavily audited.",
    outcome:
      "Run time is 41 minutes and grows with volume roughly linearly now instead of quadratically. No overruns in two years.",
    stack: ["Java", "Postgres", "Kubernetes"],
    links: [],
    details: [
      { label: "Runtime", value: "6h40m → 41min", proof: true },
      { label: "Headroom", value: "Growth is linear, not quadratic, with volume", proof: true },
      { label: "Constraint", value: "Matching logic untouched - audited and correct" },
    ],
  },
  {
    id: "iso-migration-runbook",
    authorId: "andres-ferrer",
    role: "engineering",
    topics: ["reliability"],
    model: "enterprise",
    skills: ["Java", "ISO 20022", "Incident response"],
    title: "A cutover we could reverse at any point",
    summary: "A regulatory-deadline migration with no option to fail, and no appetite for a big bang.",
    year: 2025,
    duration: "7 months",
    scope: "Team of 5 · I wrote the cutover design and ran the night",
    problem:
      "ISO 20022 migration with an immovable regulatory date. The default plan was a weekend big bang with a rollback that, read carefully, was not actually a rollback - once messages were translated, going back meant data loss.",
    approach:
      "Designed a dual-format period where both wire formats were accepted and the old one remained authoritative until a single flag flipped. That meant building translation both ways, which was about 30% more work and was the entire point: every step had a genuine reverse. Rehearsed the cutover four times against production-shaped data.",
    outcome:
      "Cut over in 20 minutes with no rollback needed, three weeks before the deadline. The reverse path was never used, which is the outcome you pay 30% for and hope to waste.",
    stack: ["Java", "Kafka", "Kubernetes"],
    links: [{ label: "Cutover runbook", href: "https://example.com/meridian/iso-runbook" }],
    details: [
      { label: "Cutover", value: "20 minutes, zero rollback, 3 weeks early", proof: true },
      { label: "Cost", value: "~30% extra build for a genuinely reversible path", proof: true },
      { label: "Rehearsal", value: "4 full dress runs against production-shaped data" },
    ],
  },

  // ── Luca Bianchi · engineering, mobility ────────────────────────────
  {
    id: "routing-cold-start",
    authorId: "luca-bianchi",
    role: "engineering",
    topics: ["reliability"],
    model: "marketplace",
    skills: ["Go", "Algorithms", "Performance"],
    title: "Routing that survives a new city with no data",
    summary: "Our ETAs were good in Milan and embarrassing anywhere we had just launched.",
    year: 2025,
    duration: "6 months",
    scope: "Team of 4 · I owned the model fallback",
    problem:
      "ETA accuracy depended on historical trip data. In a city with three weeks of history, the model was worse than the naive distance-over-speed estimate it replaced, and launch cities are exactly where a bad ETA costs you riders permanently.",
    approach:
      "Built an explicit confidence measure and had the system fall back to a physics-and-map estimate below a threshold, rather than blending. Blending was the elegant option and it produced estimates that were wrong in an unpredictable direction, which is worse for a rider than being consistently conservative.",
    outcome:
      "New-city ETA error dropped from ±38% to ±14% in the first month. Mature cities were unaffected. Two launches since have not needed the manual padding we used to apply.",
    stack: ["Go", "PostGIS", "Redis"],
    links: [],
    details: [
      { label: "Accuracy", value: "New-city ETA error ±38% → ±14%", proof: true },
      { label: "Scope", value: "No regression in mature markets", proof: true },
      { label: "Decision", value: "Hard fallback rather than blending, for predictability" },
    ],
  },
  {
    id: "dispatch-fairness",
    authorId: "luca-bianchi",
    role: "engineering",
    topics: ["reliability"],
    model: "marketplace",
    skills: ["Go", "Algorithms", "Distributed systems"],
    title: "When the efficient dispatch was the unfair one",
    summary: "Optimising total pickup time was quietly concentrating good trips on a few drivers.",
    year: 2024,
    duration: "4 months",
    scope: "Team of 4 · I owned the allocation change",
    problem:
      "Dispatch minimised aggregate pickup time, which is defensible until you look at the distribution: the top decile of drivers were earning 2.8× the median, largely from being in the right place when the algorithm was written. Driver churn in the bottom half was 3× the top.",
    approach:
      "Added a fairness term with a cap on how much aggregate efficiency it could cost, set at 5% and argued for explicitly rather than tuned quietly. Published the change to drivers before shipping it, including the fact that some would earn less.",
    outcome:
      "Earnings ratio narrowed from 2.8× to 1.9×. Aggregate pickup time rose 3.1%, inside the budget. Bottom-half churn fell by about a third. A vocal minority of high earners were unhappy and said so publicly, which was predictable and correct of them.",
    stack: ["Go", "Kafka", "Redis"],
    links: [],
    details: [
      { label: "Distribution", value: "Top-to-median earnings 2.8× → 1.9×", proof: true },
      { label: "Cost", value: "Aggregate pickup time +3.1%, inside a 5% budget", proof: true },
      { label: "Retention", value: "Bottom-half driver churn down ~33%" },
      { label: "Trade-off", value: "Announced to drivers before shipping, including who loses" },
    ],
  },

  // ── Sinta Wijaya · design, mobility ─────────────────────────────────
  {
    id: "driver-app-low-end",
    authorId: "sinta-wijaya",
    role: "design",
    topics: ["accessibility"],
    model: "marketplace",
    skills: ["Mobile design", "Usability testing", "Performance"],
    title: "Designing for the phone our drivers actually have",
    summary: "We designed on an iPhone 15. The median driver was on a four-year-old Android with 2 GB of RAM.",
    year: 2025,
    duration: "5 months",
    scope: "Solo designer · 4 engineers, 12 drivers in testing",
    problem:
      "Driver app complaints clustered on the accept screen. On our devices it was instant. On the median driver device it took 2-4 seconds to become interactive, which in a competitive dispatch window is the difference between earning and not.",
    approach:
      "Bought eight of the actual handsets and put them in the team room - the change that did the most work. Redesigned the accept flow to render a usable state before data arrives, and cut the animation budget hard. Argued down a proposed illustration set on the grounds that it cost 400 kB on a metered connection.",
    outcome:
      "Time to interactive on the reference device went from 3.4s to 0.8s. Accept rate rose 12 points. Support tickets about 'missed the job' fell by half.",
    stack: ["Figma", "Android", "Firebase"],
    links: [],
    details: [
      { label: "Performance", value: "Time to interactive 3.4s → 0.8s on the median device", proof: true },
      { label: "Outcome", value: "Accept rate +12 points", proof: true },
      { label: "Method", value: "Eight real low-end handsets kept in the team room" },
    ],
  },
  {
    id: "rider-safety-flow",
    authorId: "sinta-wijaya",
    role: "design",
    topics: ["accessibility"],
    model: "marketplace",
    skills: ["Product design", "Safety-critical UX", "Usability testing"],
    title: "An emergency button people could find without looking",
    summary: "The safety feature tested well seated and calm, which is not when it gets used.",
    year: 2024,
    duration: "3 months",
    scope: "Solo designer with 2 engineers and a safety advisor",
    problem:
      "Usage of the in-trip safety button was near zero, and the two incidents we reviewed both involved riders who knew it existed and did not find it. It was three taps deep and required reading.",
    approach:
      "Tested under conditions closer to real: dark, one-handed, phone at an angle, participant asked to do something else simultaneously. The button needed to be reachable by thumb without visual search, so it went to a fixed position with a distinct shape. Rejected the version that put it behind a confirmation - the confirm existed to protect our ops load, not the rider.",
    outcome:
      "Time to reach the safety flow went from a median of 11 seconds to 2. False activations rose, as expected, and ops absorbed them; that was the trade we chose deliberately.",
    stack: ["Figma", "Maze"],
    links: [],
    details: [
      { label: "Access", value: "Time to reach safety flow 11s → 2s", proof: true },
      { label: "Accepted cost", value: "False activations up; absorbed by ops on purpose", proof: true },
      { label: "Method", value: "Tested one-handed, in the dark, while distracted" },
      { label: "Rejected", value: "A confirmation step that served our ops load, not the rider" },
    ],
  },

  // ── Nurul Hidayah · accessibility ───────────────────────────────────
  {
    id: "clinical-forms-a11y",
    authorId: "nurul-hidayah",
    role: "design",
    topics: ["accessibility", "healthtech"],
    model: "enterprise",
    skills: ["Accessibility", "Forms", "Usability testing"],
    title: "Clinical forms that a tired nurse can finish",
    summary: "A 62-field intake form with a 14% error rate at 3am and a 2% error rate at 10am.",
    year: 2025,
    duration: "6 months",
    scope: "Solo accessibility designer · 3 wards observed",
    problem:
      "Intake errors were tracked and blamed on individuals. Plotting them against shift time showed the obvious: the form was fine when you were rested and hostile when you were not. Low contrast, no autosave, and a validation summary that cleared what you had typed.",
    approach:
      "Treated fatigue as an accessibility requirement rather than a training issue, which was the argument that had to be won first. Autosave per field, errors that never discard input, and a contrast floor set for a dimmed ward screen rather than an office monitor.",
    outcome:
      "Night-shift error rate fell from 14% to 3.5%, nearly matching day shift. Median completion time dropped 40%. The hospital stopped reporting intake errors as an individual performance measure.",
    stack: ["Figma", "NVDA", "axe"],
    links: [],
    details: [
      { label: "Errors", value: "Night-shift intake errors 14% → 3.5%", proof: true },
      { label: "Speed", value: "Median completion time down 40%", proof: true },
      { label: "Framing", value: "Argued fatigue as an accessibility requirement, not training" },
    ],
  },
  {
    id: "a11y-in-definition-of-done",
    authorId: "nurul-hidayah",
    role: "design",
    topics: ["accessibility", "design-ops"],
    model: "enterprise",
    skills: ["Accessibility", "Process", "Design ops"],
    title: "Getting accessibility out of the audit and into the sprint",
    summary: "We found the same issues every audit because audits are the wrong instrument.",
    year: 2024,
    duration: "2 quarters",
    scope: "Solo · 6 squads",
    problem:
      "An annual external audit produced a 90-page report, a remediation sprint, and a return to baseline within about five months. The cycle had run three times. Nothing about it was designed to prevent anything.",
    approach:
      "Moved a short check into the definition of done - six items, all things a developer can verify in under two minutes - and killed the remediation sprint entirely. Six items rather than thirty was contentious; thirty would have been more complete and would have been skipped.",
    outcome:
      "Issues found by the next external audit fell 74%. More usefully, the ones that remained were novel rather than the same list. Two squads extended the checklist themselves.",
    stack: ["axe", "Notion", "GitHub"],
    links: [],
    details: [
      { label: "Findings", value: "External audit findings down 74%", proof: true },
      { label: "Quality", value: "Remaining findings were new, not repeats", proof: true },
      { label: "Design", value: "Six checks, deliberately, over a complete list nobody runs" },
    ],
  },
  {
    id: "screenreader-datatable",
    authorId: "nurul-hidayah",
    role: "design",
    topics: ["design-ops"],
    model: "enterprise",
    skills: ["Accessibility", "Design systems", "Documentation"],
    title: "The data table pattern, written down properly",
    summary: "Every team built their own table and every one of them was inaccessible differently.",
    year: 2023,
    duration: "3 months",
    scope: "Solo, with two engineers reviewing",
    problem:
      "Nine tables across the product, nine implementations, none navigable by keyboard in a way that made sense. Each team had solved sorting, selection and pagination independently and none had tested with a screen reader.",
    approach:
      "Wrote one pattern with the reasoning visible - not just 'use aria-sort' but what a user hears and why the alternative is worse. Included the three approaches we rejected, because the rejected options are what teams reinvent otherwise.",
    outcome:
      "Seven of nine tables migrated within two quarters. The remaining two are legacy and scheduled. Keyboard task completion on the migrated tables went from 34% to 96%.",
    stack: ["Figma", "Storybook", "NVDA"],
    links: [],
    details: [
      { label: "Adoption", value: "7 of 9 tables migrated in 2 quarters", proof: true },
      { label: "Usability", value: "Keyboard task completion 34% → 96%", proof: true },
      { label: "Documentation", value: "Rejected approaches written down alongside the chosen one" },
    ],
  },

  // ── Marco Lombardi · research ops ───────────────────────────────────
  {
    id: "research-repository",
    authorId: "marco-lombardi",
    role: "research",
    topics: ["design-ops"],
    model: "enterprise",
    skills: ["Research ops", "Repository", "Synthesis"],
    title: "A research repository people searched before starting",
    summary: "We had 300 studies in a folder structure and a team that re-ran research quarterly.",
    year: 2025,
    duration: "7 months",
    scope: "Research ops · 9 researchers, 3 product teams",
    problem:
      "Studies were stored by project and date, which is how they are created and not how anyone looks for them. Two teams ran nearly identical onboarding studies four months apart, at a cost of about €40k and six weeks.",
    approach:
      "Re-indexed by the question answered rather than the project that answered it, and enforced a one-paragraph finding on every study before it could be filed. The paragraph was the hard part politically - researchers felt it flattened nuance - and it is the only reason search results are useful.",
    outcome:
      "About a third of new studies now start with a repository hit that changes their scope. Two studies in a year were cancelled outright because the answer already existed.",
    stack: ["Dovetail", "Notion"],
    links: [],
    details: [
      { label: "Reuse", value: "~1 in 3 new studies starts from an existing finding", proof: true },
      { label: "Avoided", value: "2 studies cancelled as already answered", proof: true },
      { label: "Mechanism", value: "A mandatory one-paragraph finding on every entry" },
    ],
  },
  {
    id: "participant-panel",
    authorId: "marco-lombardi",
    role: "research",
    topics: ["design-ops", "security"],
    model: "enterprise",
    skills: ["Research ops", "Panel management", "Recruitment"],
    title: "Recruiting security professionals who do not answer surveys",
    summary: "Our participants were whoever replied to a mass email, which meant the same eleven people.",
    year: 2024,
    duration: "5 months",
    scope: "Research ops · built the panel, handed it over",
    problem:
      "Security research kept reaching the same small group of enthusiastic customers, who were unrepresentative in a specific and damaging way: they were the ones with time. Our findings skewed towards mature security teams and away from the one-person-does-everything reality of most of our customers.",
    approach:
      "Built a panel with a quota on team size and made scheduling asynchronous, since the people we were missing could not commit to a 60-minute slot. Paid properly and said so up front. Set a hard rule that nobody appears in more than two studies a year, which cost us convenience and bought representativeness.",
    outcome:
      "Panel of 140 with roughly half from teams of three or fewer, up from about 10%. Three product decisions reversed within a year on findings that the old panel would not have surfaced.",
    stack: ["Notion", "Calendly", "Dovetail"],
    links: [],
    details: [
      { label: "Representation", value: "Small-team participants ~10% → ~50%", proof: true },
      { label: "Impact", value: "3 product decisions reversed on new findings", proof: true },
      { label: "Rule", value: "Maximum two studies per person per year" },
    ],
  },

  // ── Marcus Bell · data leadership ───────────────────────────────────
  {
    id: "metric-definitions",
    authorId: "marcus-bell",
    role: "data",
    topics: ["finance", "leadership"],
    model: "b2b-saas",
    skills: ["Data strategy", "Governance", "SQL"],
    title: "One definition of 'active customer'",
    summary: "Three teams reported active customers. Three numbers. All of them defensible.",
    year: 2025,
    duration: "2 quarters",
    scope: "Director of Data · 4 analysts, 3 stakeholder teams",
    problem:
      "Finance, sales and product each reported an active-customer count, differing by up to 18%. Every board meeting spent time reconciling rather than deciding. Each definition was correct for its own purpose, which is why three years of 'just align on one' had failed.",
    approach:
      "Stopped trying to produce one number. Defined three named metrics with explicit purposes, put them in one place with the differences stated, and made the rule that any deck citing 'active customers' unqualified is wrong. Governance by naming rather than by consolidation.",
    outcome:
      "Board reconciliation time went to effectively zero. The three numbers still differ; everyone now knows why and which one their question needs.",
    stack: ["dbt", "Snowflake", "Looker"],
    links: [],
    details: [
      { label: "Decision time", value: "Board reconciliation effectively eliminated", proof: true },
      { label: "Approach", value: "Three named metrics, not one forced definition" },
      { label: "History", value: "Three prior attempts at consolidation had failed" },
    ],
  },
  {
    id: "data-team-split",
    authorId: "marcus-bell",
    role: "data",
    topics: ["hiring", "leadership"],
    model: "b2b-saas",
    skills: ["Org design", "Hiring", "Data strategy"],
    title: "Splitting one data team into two, badly, then correctly",
    summary: "My first reorg made things worse for a quarter. The second one worked.",
    year: 2024,
    duration: "3 quarters including the failed attempt",
    scope: "Director of Data · 11 people",
    problem:
      "One team served every request, so long-horizon platform work never happened - urgent analysis always won. The standard answer is to split platform from analytics.",
    approach:
      "Split by technology first: platform engineers on one side, analysts on the other. Within a quarter, requests queued at the boundary and the analysts had no way to change the pipelines they depended on. I reversed it and split by domain instead - each team owning pipelines and analysis for its own area - which is less tidy on an org chart and matched how the work actually flowed.",
    outcome:
      "Platform work finally shipped: two long-standing pipeline rewrites completed in the following two quarters. One person left during the churn, which I attribute to my first attempt.",
    stack: ["dbt", "Airflow", "Snowflake"],
    links: [],
    details: [
      { label: "Outcome", value: "2 long-deferred pipeline rewrites shipped", proof: true },
      { label: "Cost", value: "One quarter lost and one resignation during the reversal", proof: true },
      { label: "Lesson", value: "Split by domain, not by technology" },
    ],
  },

  // ── Fatima Al-Nasr · engineering management ─────────────────────────
  {
    id: "erp-delivery-predictability",
    authorId: "fatima-al-nasr",
    role: "engineering",
    topics: ["erp"],
    model: "enterprise",
    skills: ["Delivery", "Coaching", "Systems"],
    title: "Making delivery dates mean something",
    summary: "We hit about 40% of committed dates and had stopped believing our own roadmap.",
    year: 2025,
    duration: "3 quarters",
    scope: "Engineering Manager · 12 engineers, 3 squads",
    problem:
      "Commitments were made from estimates and missed routinely. The response had been more detailed estimation, which consumed more time and did not improve accuracy - the variance was not in the estimating, it was in the interruptions nobody was counting.",
    approach:
      "Measured interruption load for six weeks before proposing anything. It was 38% of capacity, almost entirely unplanned support. Made it visible, staffed it explicitly with a rotating support engineer, and committed to a smaller amount of work with the interruption budget subtracted up front.",
    outcome:
      "Commitment hit rate went to 87%. We commit to roughly 30% less per quarter and deliver more of it, which took some explaining to stakeholders and no explaining at all after the first quarter.",
    stack: ["Jira", "Linear"],
    links: [],
    details: [
      { label: "Predictability", value: "Committed dates hit 40% → 87%", proof: true },
      { label: "Discovery", value: "38% of capacity was unplanned support", proof: true },
      { label: "Trade-off", value: "Commit to ~30% less, deliver more of it" },
    ],
  },
  {
    id: "onboarding-to-first-commit",
    authorId: "fatima-al-nasr",
    role: "engineering",
    topics: ["hiring", "devex"],
    model: "enterprise",
    skills: ["Coaching", "Hiring", "Developer experience"],
    title: "Six weeks to first production commit, down to five days",
    summary: "New engineers were productive eventually. 'Eventually' was costing us a hire's first quarter.",
    year: 2024,
    duration: "4 months",
    scope: "Engineering Manager · measured across 9 hires",
    problem:
      "Median time from start date to a merged production change was 31 working days. The causes were unglamorous: environment setup was a 40-step document that was wrong in four places, and nobody owned it because everyone already had a working environment.",
    approach:
      "Made every new hire's first task fixing the onboarding document they had just used, and made their buddy the owner of anything they could not fix. Self-repairing, and it meant the document was corrected by exactly the people who could see the errors.",
    outcome:
      "Median time to first production commit is five days across the last six hires. The setup document is now nine steps and scripted.",
    stack: ["Docker", "Notion"],
    links: [],
    details: [
      { label: "Ramp", value: "First production commit: 31 days → 5 days", proof: true },
      { label: "Mechanism", value: "Every new hire's first task is fixing their own onboarding doc" },
      { label: "Result", value: "Setup went from a wrong 40-step doc to 9 scripted steps" },
    ],
  },

  // ── Sasha Meier · applied AI leadership ─────────────────────────────
  {
    id: "ai-feature-kill-criteria",
    authorId: "sasha-meier",
    role: "product",
    topics: ["ai"],
    model: "b2b-saas",
    skills: ["Model strategy", "Product strategy", "Evals"],
    title: "Kill criteria, written before we started",
    summary: "Every AI project we ran reached 80% quality and then ran forever. This one had an exit.",
    year: 2025,
    duration: "2 quarters",
    scope: "Head of Applied AI · 6 people",
    problem:
      "Three previous AI features had each consumed a year. None shipped and none was ever formally stopped, because 'nearly good enough' is an indefinitely sustainable state and nobody wants to be the one who calls it.",
    approach:
      "Wrote the kill criteria into the project brief before any work started: a specific accuracy figure on a held-out set by a specific date, agreed by the sponsor. Made the criteria public to the team on day one, which changed what people worked on - nobody polished a demo that quarter.",
    outcome:
      "We missed the threshold by four points and stopped, on schedule, in one meeting that took fifteen minutes. Two of the six moved onto a project that shipped. I count this as the most useful thing I did that year.",
    stack: ["Python", "Weights & Biases"],
    links: [],
    details: [
      { label: "Outcome", value: "Stopped on schedule, four points short of the agreed bar", proof: true },
      { label: "Precedent", value: "Three prior AI projects had never been formally stopped", proof: true },
      { label: "Effect", value: "Public criteria changed what the team worked on from day one" },
    ],
  },
  {
    id: "model-vendor-exit",
    authorId: "sasha-meier",
    role: "product",
    topics: ["ai", "leadership"],
    model: "b2b-saas",
    skills: ["Model strategy", "Vendor management", "Team building"],
    title: "Keeping a model vendor replaceable",
    summary: "Our whole product ran on one provider's API and we had never tested leaving.",
    year: 2024,
    duration: "5 months",
    scope: "Head of Applied AI · with 2 engineers and legal",
    problem:
      "Single-provider dependency with prompts tuned to one model's quirks. A pricing change or a deprecation would have been an emergency, and our largest customer had begun asking about it in security review.",
    approach:
      "Built an abstraction, which is the easy half, and then actually ran a full week in production on the alternative provider - the half that usually does not happen. It surfaced eleven places where behaviour differed enough to matter, none of which the abstraction had predicted.",
    outcome:
      "Provider switch is now a config change with a known quality delta of about two points. We used it once, for nine days, during an outage. The exercise cost roughly five weeks and has paid for itself once already.",
    stack: ["Python", "TypeScript"],
    links: [],
    details: [
      { label: "Portability", value: "Provider switch is a config change, ~2 point quality delta", proof: true },
      { label: "Proven", value: "Used in anger for 9 days during a provider outage", proof: true },
      { label: "Method", value: "Ran a full week in production on the alternative, not just a test" },
    ],
  },

  // ── Peter Lindgren · SRE ────────────────────────────────────────────
  {
    id: "slo-negotiation",
    authorId: "peter-lindgren",
    role: "infra",
    topics: ["reliability"],
    model: "enterprise",
    skills: ["SRE", "Observability", "Incident response"],
    title: "Agreeing what 'up' means before the next incident",
    summary: "We reported 99.95% availability while a customer was measuring 97% and both were right.",
    year: 2025,
    duration: "4 months",
    scope: "SRE · with 3 product teams and account management",
    problem:
      "Availability was measured at the load balancer - did we return a response - while customers measured whether a specific workflow completed. A partial outage of one dependency read as fully available on our dashboard and as broken on theirs. Every incident review started with an argument about whether there had been an incident.",
    approach:
      "Rebuilt the SLO around four user journeys with synthetic probes running them end to end, and deliberately set the initial targets at what we were already achieving rather than what we wanted. A target you are already missing on day one gets ignored by the second week.",
    outcome:
      "Reported and perceived availability now agree within about 0.2 points. Incident reviews start from the journey that broke. Two dependencies turned out to be responsible for most of the gap and were given explicit budgets.",
    stack: ["Prometheus", "Grafana", "Datadog"],
    links: [],
    details: [
      { label: "Alignment", value: "Reported vs customer-perceived availability within ~0.2 points", proof: true },
      { label: "Design", value: "Four journey-level SLOs with end-to-end synthetic probes" },
      { label: "Decision", value: "Set initial targets at current performance, not aspiration" },
    ],
  },
  {
    id: "incident-review-blameless",
    authorId: "peter-lindgren",
    role: "infra",
    topics: ["reliability", "energy"],
    model: "enterprise",
    skills: ["Incident response", "Coaching", "SRE"],
    title: "Incident reviews that produced fewer actions on purpose",
    summary: "Every review generated fifteen action items and we completed about three.",
    year: 2024,
    duration: "2 quarters",
    scope: "SRE · facilitated 20+ reviews",
    problem:
      "Reviews ended with long action lists that nobody owned past the meeting. Completion ran around 20%, so the same contributing factors recurred and the reviews had quietly become theatre.",
    approach:
      "Capped actions at three per incident, each with a named owner and a date, and everything else went into a written 'known and accepted' section. Making the acceptance explicit was the uncomfortable part - it meant writing down risks we had decided to live with, in a regulated industry, where that document is discoverable. We decided that was correct anyway.",
    outcome:
      "Action completion went to 91%. Repeat contributing factors fell by about half over a year. The accepted-risk list has been raised in two planning cycles and funded once.",
    stack: ["Confluence", "Jira"],
    links: [],
    details: [
      { label: "Follow-through", value: "Action completion 20% → 91%", proof: true },
      { label: "Recurrence", value: "Repeat contributing factors down ~50% over a year", proof: true },
      { label: "Decision", value: "Wrote down accepted risks explicitly, in a regulated industry" },
    ],
  },

  // ── Hannah Fischer · appsec ─────────────────────────────────────────
  {
    id: "threat-model-in-design",
    authorId: "hannah-fischer",
    role: "infra",
    topics: ["security", "devex"],
    model: "b2b-saas",
    skills: ["Threat modeling", "SAST", "Developer experience"],
    title: "Threat modelling that fits in a design review",
    summary: "Our threat modelling process was four hours long, so it was used twice a year.",
    year: 2025,
    duration: "3 months",
    scope: "AppSec · rolled out to 7 teams",
    problem:
      "The official process was a four-hour workshop with a security engineer present. There were two of us and about forty projects a year. Teams did the sensible thing and skipped it.",
    approach:
      "Cut it to four questions that a team answers without us, on the design document, in about twenty minutes. We review the answers asynchronously and only join the ones that need us - about one in six. Less thorough per project and applied to roughly twenty times as many projects, which is the trade that matters.",
    outcome:
      "Coverage went from about 5% of projects to 78%. We found three design-stage issues in the first quarter that would previously have surfaced in a penetration test, where they cost about ten times more to fix.",
    stack: ["Notion", "Semgrep"],
    links: [],
    details: [
      { label: "Coverage", value: "5% → 78% of projects threat-modelled", proof: true },
      { label: "Shift left", value: "3 design-stage findings in Q1 that pentest would have caught later", proof: true },
      { label: "Trade-off", value: "Shallower per project, ~20× more projects" },
    ],
  },
  {
    id: "dependency-noise",
    authorId: "hannah-fischer",
    role: "infra",
    topics: ["devex"],
    model: "b2b-saas",
    skills: ["SAST", "Supply chain", "Developer experience"],
    title: "Turning 3,400 vulnerability alerts into 40",
    summary: "The scanner was technically correct and completely useless.",
    year: 2024,
    duration: "3 months",
    scope: "Solo",
    problem:
      "Dependency scanning produced about 3,400 open findings. Teams had stopped reading them, which meant a genuine critical would have been invisible. A backlog that large is functionally the same as no scanning at all.",
    approach:
      "Filtered by reachability - whether the vulnerable function is actually called - rather than by severity score, which had been the previous attempt. Reachability analysis is imperfect and I documented the false-negative risk explicitly rather than presenting it as complete coverage.",
    outcome:
      "Actionable findings dropped to about 40, and median time to remediate went from never to nine days. One finding was missed by the reachability filter over eighteen months; it was low severity and we caught it in the quarterly full sweep we kept for exactly that reason.",
    stack: ["Snyk", "Semgrep", "GitHub Actions"],
    links: [],
    details: [
      { label: "Signal", value: "3,400 findings → ~40 actionable", proof: true },
      { label: "Remediation", value: "Median time to fix: never → 9 days", proof: true },
      { label: "Known gap", value: "1 finding missed in 18 months, caught by the quarterly sweep" },
    ],
  },

  // ── Tomás Ibarra · research ─────────────────────────────────────────
  {
    id: "erp-field-study",
    authorId: "tomas-ibarra",
    role: "research",
    topics: ["erp"],
    model: "enterprise",
    skills: ["Ethnography", "Synthesis", "Usability"],
    title: "Two weeks in a warehouse changed the roadmap",
    summary: "Our top-requested feature turned out to be a workaround for a different problem.",
    year: 2025,
    duration: "10 weeks",
    scope: "Senior researcher · 2 sites, 6 roles shadowed",
    problem:
      "The most-requested feature for three years running was a custom report builder. It was expensive, it had been repeatedly deferred, and nobody had asked why people wanted it.",
    approach:
      "Spent two weeks on site shadowing rather than interviewing, because the people asking for reports could not describe what they did with them. They were exporting to reconcile our stock figures against a physical count that disagreed - the reports were a symptom of a data-accuracy problem we did not know we had.",
    outcome:
      "The report builder was dropped. We fixed the stock-count reconciliation instead, at about a fifth of the cost, and requests for the report builder stopped arriving within two quarters.",
    stack: ["Dovetail", "Miro"],
    links: [],
    details: [
      { label: "Redirect", value: "Three-year top request dropped; real cause fixed at ~20% of cost", proof: true },
      { label: "Signal", value: "Report-builder requests stopped within 2 quarters", proof: true },
      { label: "Method", value: "Two weeks shadowing, not interviewing" },
    ],
  },
  {
    id: "research-that-changed-nothing",
    authorId: "tomas-ibarra",
    role: "research",
    topics: ["design-ops"],
    model: "enterprise",
    skills: ["Synthesis", "Research ops", "Usability"],
    title: "A study nobody acted on, and what I changed after",
    summary: "Twelve weeks of good research, a well-received readout, and zero product change.",
    year: 2023,
    duration: "12 weeks",
    scope: "Senior researcher · solo",
    problem:
      "I ran a thorough study on approval workflows. The findings were solid and the presentation went well - people said it was the best readout they had seen that year. Nothing shipped from it. Twelve months later the same problems were live.",
    approach:
      "Rather than blame the organisation, I looked at what I had produced: a 40-slide deck delivered once to a room, with no owner attached to any finding and no decision requested. I had optimised for being convincing rather than for being actionable.",
    outcome:
      "Nothing shipped. Since then I have not delivered a readout without a named decision-maker per finding and a specific decision requested, and my last four studies have each changed something. Including this here because the failure taught more than the successes.",
    stack: ["Dovetail"],
    links: [],
    details: [
      { label: "Outcome", value: "Zero product change from 12 weeks of work", proof: true },
      { label: "Cause", value: "No named owner or requested decision on any finding" },
      { label: "Since", value: "Last 4 studies each produced a shipped change" },
    ],
  },

  // ── Elena Petrova · research, health ────────────────────────────────
  {
    id: "consent-comprehension",
    authorId: "elena-petrova",
    role: "research",
    topics: ["healthtech", "accessibility"],
    model: "public",
    skills: ["Clinical research", "Co-design", "Usability"],
    title: "Consent forms patients could actually explain back",
    summary: "Ninety-four per cent signed. Thirty-one per cent could say what they had agreed to.",
    year: 2025,
    duration: "6 months",
    scope: "Researcher · 40 patients, with legal and two clinicians",
    problem:
      "Digital consent had a high completion rate, which everyone read as success. We tested comprehension instead: asked patients, immediately after signing, to explain what data would be shared and with whom. Under a third could.",
    approach:
      "Co-designed with patients rather than for them, including four who had previously withdrawn consent. The hard constraint was legal: the text was not ours to simplify freely. We restructured around a plain-language summary carrying the legal text underneath, and got legal into the sessions so they heard the confusion directly rather than reading about it.",
    outcome:
      "Comprehension went from 31% to 78%. Completion dropped about four points, which we accepted - people declining because they finally understood is the system working.",
    stack: ["Dovetail", "Figma"],
    links: [],
    details: [
      { label: "Comprehension", value: "31% → 78% could explain what they signed", proof: true },
      { label: "Accepted cost", value: "Completion down ~4 points, deliberately", proof: true },
      { label: "Method", value: "Co-designed with patients who had previously withdrawn consent" },
    ],
  },
  {
    id: "clinician-burnout-study",
    authorId: "elena-petrova",
    role: "research",
    topics: ["healthtech"],
    model: "public",
    skills: ["Clinical research", "Ethnography", "Synthesis"],
    title: "Counting clicks in a twelve-hour shift",
    summary: "Clinicians said the software was 'fine'. Observation said 1,100 clicks per shift.",
    year: 2024,
    duration: "4 months",
    scope: "Researcher · 11 clinicians observed across 3 departments",
    problem:
      "Satisfaction surveys came back neutral-to-positive while turnover cited documentation burden. Self-report was not reaching it - clinicians had normalised the workload and compared us favourably to the previous system, which was worse.",
    approach:
      "Instrumented and observed rather than asked. Counted interactions per documented encounter and timed them. The headline was that 40% of clicks were navigation between screens for a single patient encounter, not data entry - which nobody, including me, had predicted.",
    outcome:
      "Produced the evidence that funded a navigation rework the following year. I did not run that project; the study's contribution was establishing that the problem was real and where it was.",
    stack: ["Dovetail", "Excel"],
    links: [],
    details: [
      { label: "Finding", value: "~1,100 clicks per 12-hour shift; 40% pure navigation", proof: true },
      { label: "Gap", value: "Surveys read neutral; observation did not", proof: true },
      { label: "Outcome", value: "Funded a navigation rework the following year" },
    ],
  },

  // ── Kenji Watanabe · MLOps ──────────────────────────────────────────
  {
    id: "gpu-scheduling-fairness",
    authorId: "kenji-watanabe",
    role: "infra",
    topics: ["ai", "reliability"],
    model: "deep-tech",
    skills: ["Ray", "GPU scheduling", "Kubernetes"],
    title: "Sharing 40 GPUs between teams that all had deadlines",
    summary: "Utilisation was 34% and every team believed they were being starved. Both were true.",
    year: 2025,
    duration: "5 months",
    scope: "MLOps · serving 5 research teams",
    problem:
      "Static allocation gave each team a fixed slice. Utilisation across the fleet sat at 34% because slices idled while other teams queued. Every proposal to pool them had failed on trust - nobody would give up a guaranteed slice.",
    approach:
      "Preemptible pooling with a guaranteed floor: each team keeps a small reserved allocation that cannot be taken, and everything above it is shared and preemptible. The floor was the concession that made pooling acceptable, and it is technically inefficient. It was worth it.",
    outcome:
      "Utilisation reached 71%. Median queue wait fell from 4.2 hours to 25 minutes. No team has asked to return to static allocation, including the one that lobbied hardest against the change.",
    stack: ["Ray", "Kubernetes", "Prometheus"],
    links: [],
    details: [
      { label: "Utilisation", value: "34% → 71% fleet-wide", proof: true },
      { label: "Wait", value: "Median queue 4.2h → 25min", proof: true },
      { label: "Concession", value: "A guaranteed inefficient floor per team, to make pooling possible" },
    ],
  },
  {
    id: "feature-store-rollback",
    authorId: "kenji-watanabe",
    role: "infra",
    topics: ["reliability"],
    model: "deep-tech",
    skills: ["Feature stores", "Ray", "Observability"],
    title: "Training-serving skew we could finally see",
    summary: "A model performed well offline and badly in production for three months before we found why.",
    year: 2024,
    duration: "4 months",
    scope: "MLOps · with 2 research engineers",
    problem:
      "Offline evaluation and production behaviour disagreed persistently. The suspicion was data drift. It was not - a feature was computed with a different time window in the serving path than in training, and nothing in our stack could have surfaced that.",
    approach:
      "Added logging of the actual feature vectors served, sampled, and compared them against training-time values for the same entities. Unglamorous and it found the discrepancy in about a day. Then made the comparison a standing check rather than a one-off investigation, because this class of bug recurs.",
    outcome:
      "Found and fixed a 12-point gap between offline and online performance. The standing check has caught two more skew bugs since, both within days rather than months.",
    stack: ["Ray", "Feast", "BigQuery"],
    links: [],
    details: [
      { label: "Gap closed", value: "12-point offline/online performance gap resolved", proof: true },
      { label: "Recurrence", value: "2 further skew bugs caught in days, not months", proof: true },
      { label: "Cause", value: "Different time window in serving vs training, invisible to the stack" },
    ],
  },

  // ── Amara Diallo · AI safety research ───────────────────────────────
  {
    id: "redteam-programme",
    authorId: "amara-diallo",
    role: "research",
    topics: ["ai", "security"],
    model: "deep-tech",
    skills: ["Red-teaming", "Alignment", "Policy"],
    title: "A red-team programme that outsiders could join",
    summary: "Internal red-teaming kept finding the failures internal people think of.",
    year: 2025,
    duration: "7 months",
    scope: "Researcher · ran the programme, 24 external participants",
    problem:
      "Our red-teaming was done by the team that built the system. The findings clustered around the failure modes we had already imagined, which is a known and predictable blind spot, and our deployment reviews were treating that coverage as broader than it was.",
    approach:
      "Opened the programme to external participants with domain expertise we lacked - two clinicians, a benefits caseworker, three teachers. Paid them as consultants. The operational cost was legal and access review; the scientific value was that their first session found a failure class we had no name for.",
    outcome:
      "Nineteen novel failure classes in the first two rounds, eleven of which we judged we would not have found internally. Four were serious enough to delay a release by six weeks.",
    stack: ["Python", "Notion"],
    links: [],
    details: [
      { label: "Findings", value: "19 novel failure classes; 11 unreachable internally", proof: true },
      { label: "Consequence", value: "4 findings delayed a release by 6 weeks", proof: true },
      { label: "Design", value: "External domain experts, paid as consultants" },
    ],
  },
  {
    id: "eval-transparency-report",
    authorId: "amara-diallo",
    role: "research",
    topics: ["leadership"],
    model: "deep-tech",
    skills: ["Policy", "Alignment", "Evals"],
    title: "Publishing the evaluation we did worst on",
    summary: "We wanted to publish our safety evals. The argument was about which ones.",
    year: 2024,
    duration: "5 months",
    scope: "Researcher · with policy, legal and comms",
    problem:
      "The proposed transparency report covered the evaluations where we performed well. That is not transparency, and a reader who knew the field would recognise the omissions immediately - which is worse than publishing nothing.",
    approach:
      "Argued for including the two evaluations where we were behind, with our reasoning about why and what we were doing about it. Lost the argument initially and brought it back with three external researchers' written views on what omission would signal. The second attempt succeeded.",
    outcome:
      "Published with the weak results included. Coverage was mixed and one competitor cited our own numbers against us, which we had predicted. Two external researchers we had wanted to hire cited the report as the reason they took our call.",
    stack: ["Python"],
    links: [{ label: "Transparency report", href: "https://example.com/northsight/transparency" }],
    details: [
      { label: "Published", value: "Included the 2 evaluations we performed worst on", proof: true },
      { label: "Cost", value: "Competitor cited our weak numbers, as expected", proof: true },
      { label: "Benefit", value: "2 senior research hires cited the report as their reason for engaging" },
      { label: "Process", value: "Lost the internal argument once, re-made it with external input" },
    ],
  },

  // ── Dewi Anggraini · growth ─────────────────────────────────────────
  {
    id: "activation-not-signup",
    authorId: "dewi-anggraini",
    role: "growth",
    topics: ["ai"],
    model: "b2b-saas",
    skills: ["Activation", "Experimentation", "Analytics"],
    title: "We were optimising the wrong end of the funnel",
    summary: "Signups were up 40% year on year and revenue was flat. The gap was the whole story.",
    year: 2025,
    duration: "2 quarters",
    scope: "Growth PM · with 2 engineers and an analyst",
    problem:
      "Growth was measured on signups and had improved them substantially. Retention at 30 days had fallen from 34% to 21% over the same period. We were buying people who were never going to stay, and the dashboard called it success.",
    approach:
      "Changed the team's primary metric to activated-and-retained users, over some objection, and accepted a 25% drop in reported signups by cutting the two acquisition channels that produced the worst retention. Ran it as a reversible three-month trial with the old metric still reported alongside.",
    outcome:
      "Signups fell 25% as expected. Thirty-day retention went to 39% and revenue per cohort rose 31%. The two cut channels were not restored.",
    stack: ["Amplitude", "SQL", "Braze"],
    links: [],
    details: [
      { label: "Retention", value: "30-day retention 21% → 39%", proof: true },
      { label: "Revenue", value: "Revenue per cohort +31%", proof: true },
      { label: "Accepted cost", value: "Reported signups down 25%, deliberately" },
      { label: "Method", value: "Reversible 3-month trial, both metrics reported" },
    ],
  },
  {
    id: "onboarding-email-cull",
    authorId: "dewi-anggraini",
    role: "growth",
    topics: ["ai", "devex"],
    model: "b2b-saas",
    skills: ["Lifecycle", "Experimentation", "Content"],
    title: "Deleting eleven of fourteen onboarding emails",
    summary: "Our onboarding sequence had grown by accretion. Nobody had ever removed one.",
    year: 2024,
    duration: "3 months",
    scope: "Growth PM · solo with a content designer",
    problem:
      "Fourteen emails over three weeks, each added by someone with a reasonable case and none ever removed. Unsubscribe rate during onboarding was 9%, and unsubscribing meant losing the channel for everything afterwards.",
    approach:
      "Tested removal rather than optimisation: held out a cohort receiving only three emails, chosen by which correlated with activation rather than which had the best open rate. Open rate is a measure of subject lines, not of value.",
    outcome:
      "The three-email cohort activated 8% better and unsubscribed at 2%. We shipped it to everyone. A later attempt to add a fourth email measurably hurt, which settled several long-running arguments.",
    stack: ["Braze", "Amplitude"],
    links: [],
    details: [
      { label: "Activation", value: "+8% on a sequence with 11 fewer emails", proof: true },
      { label: "Channel health", value: "Onboarding unsubscribe 9% → 2%", proof: true },
      { label: "Method", value: "Selected by correlation with activation, not open rate" },
    ],
  },

  // ── Noah Lindqvist · design, AI ─────────────────────────────────────
  {
    id: "ai-uncertainty-ui",
    authorId: "noah-lindqvist",
    role: "design",
    topics: ["ai"],
    model: "b2b-saas",
    skills: ["Conversational UI", "Prompt design", "Usability testing"],
    title: "Showing users when the model is guessing",
    summary: "A confident wrong answer costs more trust than three honest 'I don't knows'.",
    year: 2025,
    duration: "4 months",
    scope: "Solo designer · 3 engineers, 14 participants",
    problem:
      "The assistant answered everything in the same confident register. When it was wrong - around 12% of the time on ambiguous queries - users did not detect it, and the ones who got burned stopped using the feature entirely rather than using it more carefully.",
    approach:
      "Surfaced a confidence signal, then spent most of the project discovering that percentages were counter-productive: people either ignored them or over-trusted anything above 80%. Landed on three states with different visual and linguistic treatment, and a low-confidence state that leads with the source rather than the answer.",
    outcome:
      "Users correctly identified 71% of wrong answers, up from 19%. Overall usage dropped about 6% and the abandonment-after-a-bad-answer rate fell by two-thirds, which we judged the better trade.",
    stack: ["Figma", "Maze"],
    links: [],
    details: [
      { label: "Detection", value: "Users spotted 71% of wrong answers, up from 19%", proof: true },
      { label: "Retention", value: "Abandonment after a bad answer down ~66%", proof: true },
      { label: "Accepted cost", value: "Overall usage down ~6%" },
      { label: "Rejected", value: "Percentage confidence scores - ignored or over-trusted" },
    ],
  },
  {
    id: "prompt-library-handoff",
    authorId: "noah-lindqvist",
    role: "design",
    topics: ["ai", "design-ops"],
    model: "b2b-saas",
    skills: ["Prompt design", "Documentation", "Design ops"],
    title: "Prompts as a design artefact, with version history",
    summary: "System prompts lived in three engineers' heads and one very long Slack thread.",
    year: 2024,
    duration: "3 months",
    scope: "Solo designer with 2 engineers",
    problem:
      "The system prompt shaped the product's voice more than any component did, and it was edited by whoever was nearest, with no record of why. A tone change that broke an enterprise customer's expectations took two days to trace.",
    approach:
      "Moved prompts into version control with a required rationale on every change, and wrote the voice guidelines as tests against the prompt rather than as a document nobody rereads. Being the designer who asked for a pull-request workflow was not a natural fit and it was the right shape for the problem.",
    outcome:
      "Voice regressions became traceable in minutes. Twenty-one changes in the first quarter, each with a stated reason. Two were reverted using the history, which had previously been impossible.",
    stack: ["Git", "TypeScript", "Figma"],
    links: [],
    details: [
      { label: "Traceability", value: "Voice regressions traceable in minutes, not days", proof: true },
      { label: "Discipline", value: "21 prompt changes in a quarter, each with a stated rationale" },
      { label: "Recovery", value: "2 changes reverted using history - previously impossible" },
    ],
  },

  // ── Yusuf Rahman · product leadership ───────────────────────────────
  {
    id: "marketplace-supply-first",
    authorId: "yusuf-rahman",
    role: "product",
    topics: ["mobility"],
    model: "marketplace",
    skills: ["Zero-to-one", "Marketplaces", "Strategy"],
    title: "Launching a city with no demand spend",
    summary: "Every previous launch bought riders first. This one refused to.",
    year: 2025,
    duration: "5 months",
    scope: "CPO · launch team of 9",
    problem:
      "Our launch playbook was demand-led: heavy rider promotion, drivers follow. It produced a spike and a collapse in three of four cities, because drivers arrived, found inconsistent work and left, and the riders we had paid for churned when wait times rose.",
    approach:
      "Inverted it for one city as a controlled test: recruited drivers to a guaranteed-earnings floor for eight weeks with almost no rider marketing, and accepted looking flat on the dashboard for two months. Holding that line internally was most of the work.",
    outcome:
      "Month-six retained riders were 2.3× the best previous launch at about 60% of the total spend. The guarantee cost more up front than rider promotion would have. The playbook changed for subsequent cities.",
    stack: ["Amplitude", "SQL"],
    links: [],
    details: [
      { label: "Retention", value: "2.3× month-six retained riders vs best prior launch", proof: true },
      { label: "Efficiency", value: "~60% of the usual launch spend", proof: true },
      { label: "Difficulty", value: "Two months of deliberately flat headline numbers" },
    ],
  },
  {
    id: "pricing-transparency",
    authorId: "yusuf-rahman",
    role: "product",
    topics: ["leadership"],
    model: "marketplace",
    skills: ["Pricing", "Strategy", "Marketplaces"],
    title: "Telling drivers exactly how the fare is split",
    summary: "We published the commission formula. Legal, finance and half the exec team were against it.",
    year: 2024,
    duration: "2 quarters",
    scope: "CPO · with legal, finance and driver ops",
    problem:
      "Drivers did not trust the earnings breakdown, and they were right not to - it was accurate but omitted a dynamic component, so the arithmetic did not reconcile. Driver forums had reverse-engineered it approximately and unfavourably.",
    approach:
      "Published the full formula, including the dynamic component, with worked examples. The objection was that competitors would copy it and that drivers would optimise against it. Both happened. The argument for doing it anyway was that the alternative was a permanent trust deficit and a forum narrative worse than the truth.",
    outcome:
      "Driver trust score rose from 4.1 to 6.8 out of ten. Some drivers did optimise against the formula, costing about 1.5% in matching efficiency. Two competitors published something similar within a year.",
    stack: ["Looker"],
    links: [],
    details: [
      { label: "Trust", value: "Driver trust score 4.1 → 6.8 / 10", proof: true },
      { label: "Accepted cost", value: "~1.5% matching efficiency lost to gaming", proof: true },
      { label: "Opposition", value: "Shipped over objections from legal, finance and part of exec" },
    ],
  },

  // ── Maya Tanuwijaya · product ───────────────────────────────────────
  {
    id: "feature-sunset",
    authorId: "maya-tanuwijaya",
    role: "product",
    topics: ["leadership"],
    model: "b2b-saas",
    skills: ["Roadmapping", "Strategy", "Communication"],
    title: "Sunsetting a feature 400 customers used",
    summary: "It served 6% of accounts and consumed about 20% of support and engineering time.",
    year: 2024,
    duration: "3 quarters",
    scope: "GPM · with support, sales and 1 squad",
    problem:
      "A legacy integration had 400 active accounts and a maintenance burden wildly out of proportion - roughly a fifth of two teams' time. Every previous attempt to kill it had stopped at the first angry customer call.",
    approach:
      "Gave twelve months rather than the standard three, built a migration path for the two most common use cases, and personally called the twenty largest affected accounts before any announcement. The calls were the part that worked; four of those accounts became references for the replacement.",
    outcome:
      "Eleven accounts churned, against a forecast of forty. The freed capacity went into the replacement, which now serves about 1,100 accounts. Two customers told us the twelve-month notice was why they stayed.",
    stack: ["Zendesk", "Looker"],
    links: [],
    details: [
      { label: "Churn", value: "11 accounts lost against a 40-account forecast", proof: true },
      { label: "Capacity", value: "~20% of two teams' time recovered", proof: true },
      { label: "Method", value: "Twelve months' notice and 20 personal calls before announcing" },
    ],
  },
]
