import type { Work } from "./work"
import { EXTRA_WORK } from "./portfoliosExtra"

/**
 * Seed case studies. Each one is written the way the product asks people to
 * write: a problem someone actually had, what the author decided, and a number
 * that says whether it worked.
 */
const CORE_WORK: Work[] = [
  {
    id: "checkout-throughput",
    model: "b2b-saas",
    skills: ["TypeScript", "Distributed systems", "Postgres", "Kafka", "Performance"],
    authorId: "elias-kovac",
    role: "engineering",
    topics: ["saas"],
    title: "Rebuilding checkout for 18k req/s",
    summary: "Split a monolith's hottest read path so Black Friday stopped being a war room.",
    year: 2025,
    duration: "5 months",
    scope: "Team of 6 · I owned the projection service",
    problem:
      "Checkout p95 sat at 840ms and degraded past 4k req/s. Every peak needed three engineers watching dashboards, and two of the last four sales had partial outages.",
    approach:
      "Moved the read path behind a CQRS projection fed by the existing event stream, so pricing reads stopped hitting the write database. Shipped it behind a percentage rollout and kept the old path warm for six weeks. The first projection design was wrong - it recomputed on read - and we threw it away after load testing.",
    outcome:
      "Peak day ran unattended. The write database dropped from 78% to 22% CPU at peak, which bought us roughly a year before the next sharding conversation.",
    stack: ["TypeScript", "Postgres", "Kafka", "Redis", "k6"],
    links: [
      { label: "Projection service", href: "https://github.com/loopbase/checkout-projection" },
      { label: "Load test writeup", href: "https://github.com/loopbase/checkout-loadtest" },
    ],
    details: [
      { label: "Performance", value: "p95 840ms → 120ms", proof: true },
      { label: "Scale", value: "18k req/s sustained, 40M events/day", proof: true },
      { label: "Ownership", value: "Designed and owned the projection service end to end" },
      { label: "Reliability", value: "Zero P1s across two peak seasons" },
    ],
  },
  {
    id: "approval-flow-redesign",
    model: "b2b-saas",
    skills: ["Design systems", "Usability testing", "Figma", "Information architecture"],
    authorId: "rani-ardhana",
    role: "design",
    topics: ["saas", "erp"],
    title: "The approval flow people stopped abandoning",
    summary: "Three-step approvals were losing 4 in 10 users at the confirmation screen.",
    year: 2025,
    duration: "3 months",
    scope: "Solo designer with 2 engineers",
    problem:
      "Finance approvers dropped out at step 3. Support assumed it was a bug. Session replays showed people could not tell what they were approving because the line items collapsed behind a summary.",
    approach:
      "Ran eight moderated sessions with actual approvers, then rebuilt the screen around the thing they kept asking for: the full line items, visible, with the delta from last month called out. Killed the multi-step wizard entirely - it existed for our data model, not for them.",
    outcome:
      "Task success climbed and support tickets tagged 'approval' fell off a cliff. The wizard pattern was retired across two other flows afterwards.",
    stack: ["Figma", "Maze", "Dovetail"],
    links: [{ label: "Case study", href: "https://example.com" }],
    details: [
      { label: "Task success", value: "61% → 92%", proof: true },
      { label: "Support load", value: "Approval tickets down 34% in a quarter", proof: true },
      { label: "Process", value: "Discovery · Moderated testing · Service blueprint" },
      { label: "System impact", value: "9 components contributed back, adopted by 4 squads" },
    ],
  },
  {
    id: "selfserve-trials",
    model: "b2b-saas",
    skills: ["PLG", "Discovery", "Pricing", "Experimentation", "Analytics"],
    authorId: "maya-tanuwijaya",
    role: "product",
    topics: ["saas", "leadership"],
    title: "Turning self-serve trials into a real channel",
    summary: "Self-serve converted at 2.1% while sales-led sat at 19%. We found out why.",
    year: 2024,
    duration: "2 quarters",
    scope: "GPM · 3 squads, 14 people",
    problem:
      "Leadership wanted to kill self-serve. The funnel looked broken, but nobody had segmented it: trials that connected a data source converted at 11%, and trials that did not converted at 0.4%. Connection needed a developer.",
    approach:
      "Reframed the bet from 'improve conversion' to 'remove the developer from day one'. Ran two painted-door tests to size demand for a no-code connector before writing any of it, then cut the workspace migration work entirely to ship a quarter earlier.",
    outcome:
      "Self-serve stopped being a rounding error. The bigger win was internal: segmentation-before-conclusion became how the team reviewed every funnel afterwards.",
    stack: ["Amplitude", "Metabase", "Linear"],
    links: [{ label: "Strategy doc", href: "https://example.com" }],
    details: [
      { label: "Primary metric", value: "Trial-to-paid 2.1% → 6.4%", proof: true },
      { label: "Business impact", value: "$1.2M net-new ARR in two quarters", proof: true },
      { label: "Deliberately cut", value: "Dropped workspace migration to ship a quarter earlier" },
      { label: "Validation", value: "28 customer calls, 2 painted-door tests" },
    ],
  },
  {
    id: "merchant-fraud-graph",
    model: "b2b-saas",
    skills: ["Graph ML", "PyTorch", "Evaluation", "Feature engineering", "Airflow"],
    authorId: "priya-raghunathan",
    role: "data",
    topics: ["ai", "finance"],
    title: "Catching merchant fraud rings in 60 seconds",
    summary: "Rules caught individuals. The money was leaving through networks.",
    year: 2025,
    duration: "7 months",
    scope: "2 ML engineers, 1 analyst",
    problem:
      "The rules engine scored merchants independently, so coordinated rings passed every individual check. 0.3% positive rate meant naive accuracy was useless as a signal.",
    approach:
      "Built a gradient-boosted baseline first so there was something honest to beat, then added a graph model over shared devices, payout accounts and onboarding fingerprints. Held out three months chronologically rather than randomly - the random split was leaking future information and flattering the model by ~9 points.",
    outcome:
      "Shipped behind a human review queue above 0.7 confidence. Weekly drift checks catch the seasonal shift that used to silently degrade the rules.",
    stack: ["PyTorch", "DGL", "Feast", "Airflow", "BigQuery"],
    links: [
      { label: "Model card", href: "https://example.com/verity/merchant-graph" },
      { label: "Eval notebook", href: "https://github.com/verity/merchant-graph-evals" },
    ],
    details: [
      { label: "Eval vs baseline", value: "PR-AUC 0.61 → 0.83", proof: true },
      { label: "Production", value: "900 req/s, ~$40k/month prevented", proof: true },
      { label: "Data", value: "42M transactions, 0.3% positive class" },
      { label: "Guardrails", value: "Weekly drift checks, human review above 0.7" },
    ],
  },
  {
    id: "deploy-pipeline",
    model: "platform",
    skills: ["Terraform", "Kubernetes", "CI/CD", "Platform engineering", "Observability"],
    authorId: "tobi-adeyemi",
    role: "infra",
    topics: ["saas"],
    title: "From 55-minute deploys to 9",
    summary: "Every release needed a human at four separate gates. Nobody deployed on Fridays.",
    year: 2024,
    duration: "6 months",
    scope: "Platform team of 3 · 34 services",
    problem:
      "Lead time from merge to production was 55 minutes with four manual approvals. Teams batched changes to avoid the tax, which made every release riskier and every rollback bigger.",
    approach:
      "Replaced the approval gates with progressive delivery: automated canary analysis on error rate and latency, automatic rollback, and a break-glass path that pages instead of blocking. Migrated services in waves and published each wave's numbers internally so the sceptical teams could see it working before they opted in.",
    outcome:
      "Friday deploys are unremarkable now. The cost drop was a side effect of right-sizing during the migration, not the goal.",
    stack: ["Terraform", "ArgoCD", "Kubernetes", "Grafana", "Flagger"],
    links: [{ label: "Terraform modules", href: "https://github.com" }],
    details: [
      { label: "Delivery", value: "3 deploys/week → 40/day, lead time 55min → 9min", proof: true },
      { label: "Reliability", value: "MTTR 4h → 18min, 99.97% availability", proof: true },
      { label: "Cost", value: "Compute spend down 38% (~$21k/month)" },
      { label: "Scope", value: "34 services, 6 squads, 3 regions" },
    ],
  },
  {
    id: "regression-pyramid",
    model: "b2b-saas",
    skills: ["Playwright", "Contract testing", "Test strategy", "CI/CD"],
    authorId: "dmitri-volkov",
    role: "quality",
    topics: ["saas"],
    title: "Killing the four-day regression pass",
    summary: "780 end-to-end tests, four days to run, and payment bugs still escaped.",
    year: 2025,
    duration: "4 months",
    scope: "Solo, embedded across 3 squads",
    problem:
      "The suite was an inverted pyramid: almost everything was end-to-end, flaky, and slow. Teams re-ran red builds until they went green, which meant the suite had stopped being a signal.",
    approach:
      "Measured which tests had ever caught a real defect - a third of them never had. Deleted those, pushed the contracts down to Pact tests between services, and kept 40 hand-picked E2E journeys as a release gate. Quarantined flaky tests automatically instead of letting people re-run.",
    outcome:
      "Fewer tests, better signal. The escape rate is the number I care about, and it moved.",
    stack: ["Playwright", "Pact", "k6", "GitHub Actions"],
    links: [{ label: "Test strategy writeup", href: "https://example.com" }],
    details: [
      { label: "Escape rate", value: "23 escaped defects/release → 3", proof: true },
      { label: "Cycle time", value: "Full regression 4 days → 35 minutes", proof: true },
      { label: "Automation", value: "780 cases → 310 cases, 12min CI gate" },
      { label: "Frameworks", value: "Playwright · Pact · k6" },
    ],
  },
  {
    id: "activation-connector",
    model: "b2b-saas",
    skills: ["Experimentation", "Lifecycle marketing", "Onboarding", "Analytics"],
    authorId: "hana-sugiarto",
    role: "growth",
    topics: ["saas"],
    title: "The activation experiment that actually held",
    summary: "Activation sat at 21% because setup required someone technical on day one.",
    year: 2025,
    duration: "6 weeks",
    scope: "Lifecycle lead · 1 engineer, 1 designer",
    problem:
      "Every previous activation win decayed within a month, which usually means the experiment moved a proxy rather than the behaviour. Setup needed a developer, so non-technical buyers stalled and churned quietly.",
    approach:
      "Ran a clean 50/50 over six weeks rather than shipping to everyone and eyeballing the chart. Paired the no-code connector with a lifecycle sequence keyed to the setup step people were stuck on, not to days-since-signup.",
    outcome:
      "The lift survived eight weeks, which is the part most activation cases skip. Week-8 retention was flat between arms, so the extra activations were not lower-quality users.",
    stack: ["Braze", "Amplitude", "Statsig"],
    links: [{ label: "Experiment readout", href: "https://example.com" }],
    details: [
      { label: "Result vs control", value: "Activation 21% → 34% (p < 0.01, n = 18k)", proof: true },
      { label: "Efficiency", value: "CAC $410 → $260, payback 14mo → 8mo", proof: true },
      { label: "Held up?", value: "Week-8 retention flat between arms" },
      { label: "Channels", value: "Lifecycle email · In-product · Paid social" },
    ],
  },
  {
    id: "offline-field-sync",
    model: "enterprise",
    skills: ["Contextual inquiry", "Diary studies", "Synthesis", "ResearchOps"],
    authorId: "elena-petrova",
    role: "research",
    topics: ["mobility", "energy"],
    title: "Why field engineers kept a paper backup",
    summary: "A redesign was scoped and funded. The research killed it.",
    year: 2024,
    duration: "6 weeks",
    scope: "Lead researcher · 3 sites",
    problem:
      "Duplicate data entry was blamed on a confusing form, and a redesign was already scheduled. Nobody had watched anyone actually use it in a depot with no signal.",
    approach:
      "Fourteen contextual inquiries across three sites, plus two diary studies. The form was fine. Sync failed silently, so people learned to write everything on paper first and re-key it later - rational behaviour that looked like user error in the analytics.",
    outcome:
      "The redesign was cancelled the week the readout landed. Offline-first sync shipped instead, and the metric the redesign was supposed to move improved anyway.",
    stack: ["Dovetail", "Miro", "Otter"],
    links: [{ label: "Research repository", href: "https://example.com" }],
    details: [
      { label: "Decision changed", value: "Cancelled a funded redesign, shipped offline-first sync", proof: true },
      { label: "Downstream", value: "Duplicate entries down 71% in two releases", proof: true },
      { label: "Method", value: "14 contextual inquiries, 3 sites, 2 diary studies" },
      { label: "Artefacts", value: "Journey map · Opportunity tree · Research repo" },
    ],
  },
  {
    id: "iso20022-migration",
    model: "enterprise",
    skills: ["Java", "Kafka", "Distributed systems", "API design", "Postgres"],
    authorId: "andres-ferrer",
    role: "engineering",
    topics: ["banking"],
    title: "Migrating a core ledger to ISO 20022",
    summary: "A regulatory deadline, a 20-year-old message format, and no downtime budget.",
    year: 2024,
    duration: "14 months",
    scope: "Team of 9 · I owned translation and reconciliation",
    problem:
      "Legacy MT messages had to move to ISO 20022 before the network cutover, across a ledger processing 2.4M payments a day, with zero tolerance for a lost or duplicated payment.",
    approach:
      "Ran both formats in parallel for five months with a continuous reconciliation job comparing every translated message against the legacy path. Any mismatch paged. That parallel run was the whole project - the translation code was the easy part.",
    outcome:
      "Cutover was a config change. The reconciliation harness stayed and now catches upstream partner regressions we would previously have found from a customer complaint.",
    stack: ["Java", "Kafka", "Postgres", "Kubernetes"],
    links: [{ label: "Architecture note", href: "https://example.com" }],
    details: [
      { label: "Correctness", value: "0 mismatches across 340M reconciled payments", proof: true },
      { label: "Scale", value: "2.4M payments/day, zero-downtime cutover", proof: true },
      { label: "Ownership", value: "Translation layer and reconciliation harness" },
      { label: "Testing", value: "5-month dual-run, property-based tests on every message type" },
    ],
  },
  {
    id: "payment-trust-ui",
    model: "consumer",
    skills: ["Interaction design", "Usability testing", "Accessibility", "Figma"],
    authorId: "lily-chen",
    role: "design",
    topics: ["banking"],
    title: "Designing for the moment people hesitate",
    summary: "First-time transfers were abandoned at the confirm screen by a third of users.",
    year: 2025,
    duration: "10 weeks",
    scope: "Solo designer, 1 researcher",
    problem:
      "Abandonment spiked on first transfers to a new recipient. The screen was clean and fast - that was the problem. It gave no signal that the money was about to be irreversible.",
    approach:
      "Deliberately added friction where it earns trust: a recipient echo, the exact arrival window, and what happens if it goes wrong. Tested three levels of friction; the middle one converted best, the lightest felt unsafe and the heaviest felt like an error state.",
    outcome:
      "Slower screen, more completions. Misdirected-payment reports dropped too, which was not the goal but is the better outcome.",
    stack: ["Figma", "Maze", "Axe"],
    links: [{ label: "Case study", href: "https://example.com" }],
    details: [
      { label: "Task success", value: "First-transfer completion 68% → 89%", proof: true },
      { label: "Adoption", value: "Misdirected-payment reports down 41%", proof: true },
      { label: "Process", value: "Comparative usability testing across 3 friction levels" },
      { label: "Accessibility", value: "WCAG AA verified with screen-reader users" },
    ],
  },
  {
    id: "contract-testing-bank",
    model: "enterprise",
    skills: ["Contract testing", "Test strategy", "CI/CD", "Automation architecture"],
    authorId: "marta-nowicka",
    role: "quality",
    topics: ["banking"],
    title: "Contract tests across 40 payment services",
    summary: "Integration breakages were found in staging, three weeks after the change.",
    year: 2024,
    duration: "8 months",
    scope: "Test architect · 40 services",
    problem:
      "Services were tested in isolation and integrated late. A breaking change to a shared schema could sit undetected for weeks, and the team that broke it had usually moved on by the time it surfaced.",
    approach:
      "Introduced consumer-driven contracts with a broker, and - the part that mattered - made the contract check a required status on the provider's pull request. Technology was two weeks; the negotiation with eight teams was seven months.",
    outcome:
      "Integration defects now fail on the PR that causes them, with the author still holding context.",
    stack: ["Pact", "Pact Broker", "Jenkins", "Java"],
    links: [{ label: "Rollout playbook", href: "https://example.com" }],
    details: [
      { label: "Escape rate", value: "Integration defects in staging 31/quarter → 4", proof: true },
      { label: "Feedback loop", value: "3 weeks → 6 minutes to detect a breaking change", proof: true },
      { label: "Coverage", value: "40 services, 212 verified contracts" },
      { label: "Frameworks", value: "Pact · Pact Broker" },
    ],
  },
  {
    id: "erp-workflow-tables",
    model: "enterprise",
    skills: ["Design systems", "Information architecture", "Usability testing", "Accessibility"],
    authorId: "tomasz-nowak",
    role: "design",
    topics: ["erp"],
    title: "Making a 90-column table usable",
    summary: "Planners exported everything to Excel because our tables could not be trusted.",
    year: 2024,
    duration: "5 months",
    scope: "Solo designer, 4 engineers",
    problem:
      "The production planning grid had 90 columns and no memory. Every planner exported to Excel, worked there, and pasted back - which meant our audit trail was fiction.",
    approach:
      "Shadowed six planners for a week each. Built saved views with per-role defaults, inline editing with optimistic writes, and keyboard navigation that matches Excel's, because that is the muscle memory they already have. Did not try to talk them out of Excel; tried to make leaving it unnecessary.",
    outcome:
      "Exports fell by two thirds, which restored the audit trail the compliance team thought they already had.",
    stack: ["Figma", "TanStack Table", "Storybook"],
    links: [{ label: "Pattern documentation", href: "https://example.com" }],
    details: [
      { label: "Adoption", value: "Excel exports down 67%, in-app edits up 5x", proof: true },
      { label: "Task success", value: "Weekly plan build 3.5h → 50min", proof: true },
      { label: "Process", value: "Contextual shadowing · 6 planners · 6 weeks" },
      { label: "System impact", value: "Data grid pattern adopted by 3 product lines" },
    ],
  },
  {
    id: "scada-edge-pipeline",
    model: "enterprise",
    skills: ["Rust", "Distributed systems", "Performance", "Networking"],
    authorId: "ingvild-haugen",
    role: "engineering",
    topics: ["energy"],
    title: "Telemetry from platforms with 200ms of satellite lag",
    summary: "Offshore sensors produced more data than the uplink could carry.",
    year: 2025,
    duration: "9 months",
    scope: "Team of 4 · I owned the edge runtime",
    problem:
      "Twelve offshore platforms generated 4TB/day of sensor data against an uplink that could carry a fraction of it. Engineers onshore were making decisions on 40-minute-old aggregates.",
    approach:
      "Moved anomaly detection to the edge so the platform ships events and exceptions rather than raw series, with full-fidelity data batched during low-traffic windows. Designed for the uplink dropping entirely: 72 hours of local buffering, with ordering guaranteed on reconnect.",
    outcome:
      "Onshore decisions run on near-live exceptions. The buffering design earned its keep during a nine-hour outage with no data loss.",
    stack: ["Rust", "MQTT", "TimescaleDB", "Docker"],
    links: [{ label: "Edge runtime", href: "https://github.com" }],
    details: [
      { label: "Performance", value: "Decision latency 40min → 900ms", proof: true },
      { label: "Scale", value: "12 platforms, 4TB/day reduced to 60GB uplink", proof: true },
      { label: "Reliability", value: "72h local buffer, zero loss across a 9h outage" },
      { label: "Ownership", value: "Edge runtime and the reconnect ordering protocol" },
    ],
  },
  {
    id: "reservoir-forecast",
    model: "deep-tech",
    skills: ["Python", "Forecasting", "Causal inference", "Experiment design", "Spark"],
    authorId: "omar-siddiqui",
    role: "data",
    topics: ["energy"],
    title: "Forecasting well decline without the wishful thinking",
    summary: "The existing model was tuned on survivors, so it over-forecast every new field.",
    year: 2024,
    duration: "8 months",
    scope: "2 data scientists, 1 reservoir engineer",
    problem:
      "Production forecasts consistently ran 15-20% optimistic on new fields. The training set only contained wells that had survived long enough to be interesting - textbook survivorship bias, baked into a capital allocation model.",
    approach:
      "Rebuilt the dataset to include abandoned and underperforming wells, then compared a physics-informed model against the statistical baseline on a chronological hold-out. Reported prediction intervals rather than point estimates, because the intervals were the actually useful output for a capital decision.",
    outcome:
      "Forecast bias is now within a few points, and the intervals changed how two field investments were sized.",
    stack: ["Python", "PyMC", "scikit-learn", "Databricks"],
    links: [{ label: "Method writeup", href: "https://example.com" }],
    details: [
      { label: "Eval vs baseline", value: "Forecast bias +18% → +3%, MAPE 24% → 11%", proof: true },
      { label: "Production", value: "Used in capital allocation for 2 field developments", proof: true },
      { label: "Data", value: "1,900 wells including abandoned - the ones the old set skipped" },
      { label: "Guardrails", value: "Chronological hold-out, 80% prediction intervals reported" },
    ],
  },
  {
    id: "rider-maps-onboarding",
    model: "marketplace",
    skills: ["Interaction design", "Accessibility", "Usability testing", "Motion"],
    authorId: "sinta-wijaya",
    role: "design",
    topics: ["mobility"],
    title: "Onboarding drivers who have never used a map app",
    summary: "First-week driver churn was 44%, and it was not about pay.",
    year: 2025,
    duration: "4 months",
    scope: "Solo designer, 1 researcher, 3 engineers",
    problem:
      "New drivers quit in week one. Exit interviews blamed earnings; ride-level data said otherwise - they were losing money on navigation mistakes in the first ten trips.",
    approach:
      "Designed for the first ten trips specifically rather than for the steady state: bigger targets for one-handed use on a motorcycle mount, voice-first turn prompts in Bahasa Indonesia and Javanese, and a practice mode with no real passenger. Tested outdoors, in daylight glare, because that is where it gets used.",
    outcome:
      "First-week churn dropped by nearly half. Practice mode had the highest voluntary usage of anything in the app that quarter.",
    stack: ["Figma", "Mapbox", "Lottie"],
    links: [{ label: "Case study", href: "https://example.com" }],
    details: [
      { label: "Adoption", value: "First-week churn 44% → 23%", proof: true },
      { label: "Task success", value: "Navigation errors in trips 1-10 down 58%", proof: true },
      { label: "Process", value: "Field testing in daylight glare with 22 drivers" },
      { label: "Accessibility", value: "One-handed reach, voice-first, 2 local languages" },
    ],
  },
  {
    id: "routing-engine",
    model: "marketplace",
    skills: ["Go", "Distributed systems", "API design", "Performance"],
    authorId: "luca-bianchi",
    role: "engineering",
    topics: ["mobility"],
    title: "A routing engine that respects reality",
    summary: "Shortest-path routes were technically optimal and practically useless.",
    year: 2024,
    duration: "7 months",
    scope: "Team of 3 · I owned the cost model",
    problem:
      "Drivers ignored 30% of suggested routes. The engine optimised distance while drivers optimised for turns they could actually make on a loaded van in a medieval city centre.",
    approach:
      "Learned a cost model from historical driver deviations instead of hand-tuning penalties, then constrained it with hard rules for vehicle class and time-window restrictions. Kept the whole thing explainable - dispatchers must be able to see why a route was chosen or they override it on principle.",
    outcome:
      "Route acceptance is the metric that matters, and it moved more than travel time did. Dispatchers stopped rewriting plans by hand.",
    stack: ["Go", "OSRM", "PostGIS", "Redis"],
    links: [{ label: "Cost model notes", href: "https://github.com" }],
    details: [
      { label: "Adoption", value: "Route acceptance 70% → 94%", proof: true },
      { label: "Performance", value: "Plan generation for 1,200 stops in 2.1s", proof: true },
      { label: "Ownership", value: "Learned cost model and the explainability layer" },
      { label: "Impact", value: "Travel time down 11%, dispatcher overrides down 80%" },
    ],
  },
  {
    id: "ai-eval-harness",
    model: "consumer",
    skills: ["Evaluation", "Concept testing", "Synthesis", "Survey design"],
    authorId: "amara-diallo",
    role: "research",
    topics: ["ai"],
    title: "The eval set that stopped a launch",
    summary: "The model passed every benchmark and failed the users we had not tested with.",
    year: 2025,
    duration: "5 months",
    scope: "Lead researcher · cross-functional",
    problem:
      "An assistant was cleared for launch on aggregate benchmarks. Nobody had evaluated it on the long tail of non-native English phrasing, which was 40% of the actual user base.",
    approach:
      "Built a red-team set from real transcripts with 30 participants across six language backgrounds, scored by two independent raters. Reported per-cohort rather than aggregate - the aggregate was fine, which is exactly how the problem stayed invisible.",
    outcome:
      "Launch slipped a quarter. The per-cohort reporting format became a release requirement, which is a bigger outcome than the individual fix.",
    stack: ["Python", "Label Studio", "Inspect"],
    links: [{ label: "Eval methodology", href: "https://example.com" }],
    details: [
      { label: "Decision changed", value: "Delayed launch a quarter, fixed a 40% cohort", proof: true },
      { label: "Downstream", value: "Per-cohort reporting now required before any model ships", proof: true },
      { label: "Method", value: "30 participants, 6 language backgrounds, dual-rated" },
      { label: "Artefacts", value: "Red-team set · Rater guide · Cohort scorecard" },
    ],
  },
  {
    id: "gpu-scheduling",
    model: "platform",
    skills: ["Kubernetes", "Platform engineering", "Cost optimisation", "Observability"],
    authorId: "kenji-watanabe",
    role: "infra",
    topics: ["ai"],
    title: "Getting 3x the training runs out of the same GPUs",
    summary: "Researchers waited days for capacity while half the fleet sat idle.",
    year: 2025,
    duration: "6 months",
    scope: "Platform team of 2 · 240 GPUs",
    problem:
      "GPUs were statically assigned per team. Average utilisation was 31% while the queue was days deep, because the teams with spare capacity had no reason to give it up.",
    approach:
      "Moved to a shared pool with gang scheduling, preemption for low-priority jobs, and automatic checkpointing so preemption is cheap. Gave every team a guaranteed floor so surrendering their reserved cards was not a loss - the incentive design mattered more than the scheduler.",
    outcome:
      "Queue times collapsed and nobody had to buy hardware that year.",
    stack: ["Kubernetes", "Ray", "Volcano", "Prometheus"],
    links: [{ label: "Scheduler config", href: "https://github.com" }],
    details: [
      { label: "Delivery", value: "Queue wait 2.5 days → 40 minutes", proof: true },
      { label: "Reliability", value: "GPU utilisation 31% → 82%", proof: true },
      { label: "Cost", value: "Deferred ~$1.8M of hardware purchase" },
      { label: "Scope", value: "240 GPUs, 9 research teams" },
    ],
  },
  {
    id: "care-pathway-fhir",
    model: "public",
    skills: ["Discovery", "Product strategy", "Stakeholder management", "Roadmapping"],
    authorId: "aisha-karim",
    role: "product",
    topics: ["healthtech"],
    title: "Care pathways that clinicians did not have to fight",
    summary: "A compliant product that nurses routed around is a failed product.",
    year: 2024,
    duration: "3 quarters",
    scope: "PM · 2 squads, clinical advisory board",
    problem:
      "Our pathway tool was fully FHIR-compliant and widely ignored. Nurses kept a parallel whiteboard because the digital version demanded structured data at the exact moment they had least time to enter it.",
    approach:
      "Moved structure to the end of the shift instead of the point of care: free-text capture in the moment, structured reconciliation later, with the mapping suggested rather than mandatory. Took it through the clinical safety case rather than around it, which is slower and the only defensible route.",
    outcome:
      "The whiteboard came down on two wards. Compliance did not change - the data was always required, just no longer at the worst possible moment.",
    stack: ["FHIR", "Linear", "Metabase"],
    links: [{ label: "Clinical safety case", href: "https://example.com" }],
    details: [
      { label: "Primary metric", value: "Pathway adherence recorded 38% → 81%", proof: true },
      { label: "Business impact", value: "2 wards retired their parallel paper process", proof: true },
      { label: "Deliberately cut", value: "Dropped point-of-care structured entry entirely" },
      { label: "Validation", value: "Clinical advisory board, 3 rounds of safety review" },
    ],
  },
  {
    id: "appsec-shift-left",
    model: "platform",
    skills: ["Security", "CI/CD", "Python", "Platform engineering"],
    authorId: "hannah-fischer",
    role: "infra",
    topics: ["security"],
    title: "Security findings developers actually fix",
    summary: "The scanner produced 4,000 findings a week. Nobody read them.",
    year: 2025,
    duration: "5 months",
    scope: "AppSec of 2 · 60 repos",
    problem:
      "Volume had destroyed the signal. A backlog of 4,000 weekly findings with no reachability context meant every alert was equally ignorable, including the handful that mattered.",
    approach:
      "Filtered to reachable-and-exploitable using call-graph analysis, then delivered the survivors as pull-request comments with a suggested patch rather than as a dashboard nobody opens. Ruthlessly tuned false positives first - credibility once lost is very expensive to rebuild.",
    outcome:
      "Two orders of magnitude fewer findings, and the ones that appear get fixed within days instead of never.",
    stack: ["Semgrep", "CodeQL", "GitHub Actions", "Python"],
    links: [{ label: "Rule set", href: "https://github.com" }],
    details: [
      { label: "Reliability", value: "4,000 findings/week → 30, false positives under 5%", proof: true },
      { label: "Delivery", value: "Median time-to-fix 'never' → 4 days", proof: true },
      { label: "Scope", value: "60 repositories, 9 languages" },
      { label: "Cost", value: "Removed a planned third headcount" },
    ],
  },
  {
    id: "carbon-ledger",
    model: "b2b-saas",
    skills: ["dbt", "Airflow", "SQL", "MLOps"],
    authorId: "freya-lund",
    role: "data",
    topics: ["climate"],
    title: "A carbon ledger that survives an audit",
    summary: "Spreadsheet-based reporting could not answer 'where did this number come from'.",
    year: 2025,
    duration: "10 months",
    scope: "2 engineers, 1 LCA specialist",
    problem:
      "Emissions reporting was assembled by hand each quarter from 40 supplier spreadsheets. Every figure was defensible in isolation and none of it was traceable, which is a problem when assurance arrives.",
    approach:
      "Built a lineage-first pipeline where every emitted figure carries its source rows, emission factor version and transformation history. Modelled uncertainty explicitly instead of collapsing to a single number, because pretending to precision we did not have was the actual reporting risk.",
    outcome:
      "Quarterly close dropped from three weeks to two days, and the assurance provider signed off without a manual sample this year.",
    stack: ["dbt", "Airflow", "DuckDB", "Great Expectations"],
    links: [{ label: "Lineage model", href: "https://github.com" }],
    details: [
      { label: "Production", value: "Quarterly close 3 weeks → 2 days", proof: true },
      { label: "Eval vs baseline", value: "100% of figures traceable to source rows (was ~20%)", proof: true },
      { label: "Data", value: "40 supplier feeds, 6 emission factor versions tracked" },
      { label: "Guardrails", value: "Uncertainty ranges reported, not point estimates" },
    ],
  },
  {
    id: "netcode-rollback",
    model: "consumer",
    skills: ["C++", "Distributed systems", "Performance", "Networking"],
    authorId: "kai-nakamura",
    role: "engineering",
    topics: ["gaming"],
    title: "Rollback netcode for a 6-player brawler",
    summary: "Cross-region matches were unplayable and the community said so, loudly.",
    year: 2024,
    duration: "11 months",
    scope: "Team of 5 · I owned prediction and rollback",
    problem:
      "Delay-based netcode meant any match above 80ms felt like input lag. Our players were spread across regions with no way to avoid it, and matchmaking was quietly narrowing pools to hide the problem.",
    approach:
      "Rewrote the simulation to be fully deterministic - the actual work, and about seven months of it - then layered prediction and rollback on top. Built a desync detector that captures state hashes so we could find determinism bugs from production rather than guessing.",
    outcome:
      "Cross-region play became viable, so matchmaking pools widened and queue times fell as a side effect.",
    stack: ["C++", "Unity", "GGPO-style rollback", "Protobuf"],
    links: [{ label: "Technical writeup", href: "https://example.com" }],
    details: [
      { label: "Performance", value: "Playable up to 140ms RTT (was 80ms)", proof: true },
      { label: "Adoption", value: "Cross-region matches 4% → 38% of games", proof: true },
      { label: "Ownership", value: "Deterministic simulation, prediction and rollback" },
      { label: "Testing", value: "Desync detector with state hashing, 0.02% desync rate" },
    ],
  },

  // ── Free-form entries: authors who brought their own structure ──────
  {
    id: "kargo-driver-supply",
    model: "marketplace",
    authorId: "yusuf-rahman",
    role: "product",
    skills: ["Marketplaces", "Zero-to-one", "Product strategy", "Stakeholder management"],
    topics: ["mobility", "leadership"],
    title: "Standing up a truck marketplace in a cash economy",
    summary: "Shippers wanted invoices. Drivers wanted cash the same day. Both were right.",
    year: 2023,
    duration: "18 months",
    scope: "CPO · 40 people across product, ops and credit",
    problem: "",
    approach: "",
    outcome: "",
    stack: ["Marketplace design", "Unit economics", "Field ops"],
    links: [{ label: "Launch retrospective", href: "https://example.com/kargo/retro" }],
    sections: [
      {
        heading: "Why this was hard",
        body: "Indonesian freight runs on 60-day shipper payment terms and same-day driver cash. Every marketplace before us tried to fix that with a better app. The app was never the problem - the float was.",
      },
      {
        heading: "The bet we made",
        body: "We funded the gap ourselves and treated it as a credit product with an interface, not a logistics app with a payment feature. That meant hiring a credit lead before a second designer, which was not a popular sequencing decision internally.",
      },
      {
        heading: "What went wrong first",
        body: "Our first underwriting model was based on shipper size. Default risk turned out to correlate with route, not customer - long-haul Sumatra routes defaulted at 9x the Java average. We rebuilt scoring around route and driver history and paused two regions for a quarter.",
      },
      {
        heading: "Where it landed",
        body: "Same-day payout became the reason drivers stayed, and the float cost less than the acquisition spend it replaced. I would still sequence the credit hire first.",
      },
    ],
    details: [
      { label: "Driver retention", value: "90-day retention 31% → 68%", proof: true },
      { label: "Volume", value: "12k trucks, 380k trips in year two", proof: true },
      { label: "Honest bit", value: "First underwriting model was wrong; cost us a quarter in two regions" },
      { label: "Team", value: "40 across product, ops and credit" },
    ],
  },
  {
    id: "fraud-ops-console",
    model: "b2b-saas",
    authorId: "nadia-haryanto",
    role: "data",
    skills: ["Python", "SQL", "Evaluation", "Experiment design", "Causal inference"],
    topics: ["finance", "banking"],
    title: "The model was fine. The review queue was the bottleneck.",
    summary: "Analysts were the rate limit, so we optimised the analyst, not the model.",
    year: 2025,
    duration: "5 months",
    scope: "Solo DS with 2 engineers and the fraud ops team",
    problem: "",
    approach: "",
    outcome: "",
    stack: ["Python", "Streamlit", "Snowflake"],
    links: [{ label: "Queue design notes", href: "https://example.com/sigma/queue" }],
    sections: [
      {
        heading: "The thing everyone missed",
        body: "Precision was 0.91 and the team still wanted a better model. I sat with the ops floor for two days: median review took 6 minutes, of which 4.5 were spent gathering context across five tabs.",
      },
      {
        heading: "What I built instead",
        body: "A single review view that pre-assembles the evidence the analysts were fetching by hand, ordered by the features that actually drove each score. No model change at all in the first release.",
      },
      {
        heading: "Result",
        body: "Throughput roughly tripled without touching precision. The model work we had queued turned out to be worth far less than the six minutes.",
      },
    ],
    details: [
      { label: "Throughput", value: "Reviews/analyst/hour 9 → 26", proof: true },
      { label: "Quality held", value: "Precision unchanged at 0.91, appeals down 12%", proof: true },
      { label: "Model changes", value: "None in v1 - the bottleneck was never the model" },
    ],
  },
  {
    id: "transitly-paid-rebuild",
    model: "marketplace",
    authorId: "felix-braun",
    role: "growth",
    skills: ["Paid acquisition", "Attribution", "Experimentation", "Analytics"],
    topics: ["mobility"],
    title: "Cutting paid spend 40% without losing volume",
    summary: "Last-click was funding channels that would have converted anyway.",
    year: 2024,
    duration: "7 months",
    scope: "Growth lead · €4.2M annual budget",
    problem:
      "Paid was reported on last-click, so branded search looked like our best channel. It was mostly intercepting demand we had already created elsewhere.",
    approach:
      "Ran geo holdouts rather than arguing about attribution models - eight matched regions dark for six weeks. Branded search incrementality came back at 0.21; two display partners came back at roughly zero. Reallocated to the channels that survived the holdout and kept a permanent 5% holdout running.",
    outcome:
      "Spend dropped by about 40% with volume roughly flat, which is a strange win to present because the dashboard gets worse before anyone believes it.",
    stack: ["Google Ads", "Meta", "GeoLift", "BigQuery"],
    links: [{ label: "Holdout methodology", href: "https://example.com/transitly/geolift" }],
    details: [
      { label: "Efficiency", value: "Spend €4.2M → €2.5M, signups flat", proof: true },
      { label: "Incrementality", value: "Branded search measured at 0.21 incremental", proof: true },
      { label: "Method", value: "8 matched geo holdouts, 6 weeks, permanent 5% holdout since" },
      { label: "Channels", value: "Paid search · Display · Paid social" },
    ],
  },
  {
    id: "erp-rollout-research",
    model: "enterprise",
    authorId: "tomas-ibarra",
    role: "research",
    skills: ["Ethnography", "Synthesis", "Survey design", "ResearchOps"],
    topics: ["erp"],
    title: "Why a $4M ERP rollout stalled on one shift",
    summary: "Adoption was 80% on days and 11% on nights. Nobody had asked the night shift.",
    year: 2025,
    duration: "9 weeks",
    scope: "Lead researcher · 2 plants, 3 shifts",
    problem:
      "Six months after go-live, night-shift adoption was 11% against 80% on days. The programme assumed a training gap and had budgeted another round of sessions.",
    approach:
      "Worked two full night shifts rather than interviewing people about them. The terminals were in a lit office 200m from the line; on days a supervisor did the entry, and at night there was no supervisor. It was a staffing model problem wearing a software costume.",
    outcome:
      "Training budget was redirected to twelve ruggedised line-side terminals. Adoption on nights reached 74% within two months, and the extra training round was cancelled.",
    stack: ["Contextual inquiry", "Shift shadowing", "Dovetail"],
    links: [{ label: "Readout deck", href: "https://example.com/orbit/nights" }],
    details: [
      { label: "Decision changed", value: "Cancelled a training round, funded 12 line-side terminals", proof: true },
      { label: "Downstream", value: "Night-shift adoption 11% → 74% in two months", proof: true },
      { label: "Method", value: "2 full night shifts worked, 2 plants, 19 informal interviews" },
      { label: "Artefacts", value: "Shift journey map · Terminal siting brief" },
    ],
  },
  {
    id: "eng-org-split",
    model: "enterprise",
    authorId: "clara-whitfield",
    role: "engineering",
    skills: ["Distributed systems", "API design", "Platform engineering", "Java"],
    topics: ["banking", "leadership"],
    title: "Splitting one deploy train into nine",
    summary: "120 engineers shared a release. Coordination cost more than the code.",
    year: 2025,
    duration: "12 months",
    scope: "VP Eng · 120 engineers, 9 teams",
    problem:
      "Everything shipped together every two weeks. One failing team blocked eight others, and release-coordination meetings consumed about a day per engineer per cycle.",
    approach:
      "Drew the service boundaries along team boundaries rather than along the domain model, which is technically the wrong answer and organisationally the right one. Paid down the shared-database coupling per boundary before splitting, so nothing shipped as a distributed monolith. Two teams stayed merged because splitting them would have created a chatty boundary nobody wanted to own.",
    outcome:
      "Nine independent trains. The honest caveat: total infra cost went up about 18%, and we decided that was worth it.",
    stack: ["Java", "Kafka", "Kubernetes", "Postgres"],
    links: [{ label: "Boundary decision record", href: "https://example.com/meridian/adr-41" }],
    details: [
      { label: "Delivery", value: "Releases 26/year → 1,100/year", proof: true },
      { label: "Coordination", value: "~1 engineer-day per cycle recovered, 120 engineers", proof: true },
      { label: "Trade-off", value: "Infra cost up ~18% - accepted deliberately" },
      { label: "Ownership", value: "Boundary design and the migration sequencing" },
    ],
  },
  {
    id: "driver-earnings-clarity",
    model: "marketplace",
    authorId: "sinta-wijaya",
    role: "design",
    skills: ["Interaction design", "Usability testing", "Accessibility", "Data visualisation"],
    topics: ["mobility", "finance"],
    title: "Making driver earnings legible",
    summary: "Drivers did not distrust the pay. They could not reconstruct it.",
    year: 2024,
    duration: "3 months",
    scope: "Designer · 1 researcher, 2 engineers",
    problem:
      "Earnings support contacts spiked every Monday. The payouts were correct - the statement showed a single net figure covering seven different fee and bonus rules.",
    approach:
      "Rebuilt the statement as a per-trip ledger people could add up themselves, in the order they earned it, with each adjustment named in plain Bahasa Indonesia. Tested by asking drivers to predict their own payout before opening the app; the old design had a 34% match rate, the new one 91%.",
    outcome:
      "Support contacts on earnings fell by more than half. Nothing about the actual pay calculation changed.",
    stack: ["Figma", "Maze"],
    links: [{ label: "Case study", href: "https://example.com/kargo/earnings" }],
    details: [
      { label: "Task success", value: "Drivers predicting own payout 34% → 91%", proof: true },
      { label: "Support load", value: "Earnings contacts down 58%", proof: true },
      { label: "Process", value: "Prediction testing with 24 drivers before and after" },
      { label: "Scope", value: "Payout logic unchanged - this was purely legibility" },
    ],
  },

  // ── Second entries, so a reviewer can see a body of work ────────────
  {
    id: "feature-flag-cleanup",
    authorId: "elias-kovac",
    role: "engineering",
    model: "b2b-saas",
    skills: ["TypeScript", "React", "Performance", "API design"],
    topics: ["saas"],
    title: "Deleting 1,400 dead feature flags",
    summary: "Flags outlived their experiments and quietly became the architecture.",
    year: 2023,
    duration: "4 months",
    scope: "Solo, with a rota of one reviewer per squad",
    problem:
      "1,400 flags were live, 900 of them permanently on for over a year. Every branch was a code path someone still had to reason about, and two incidents that quarter traced back to a flag nobody knew was still evaluated.",
    approach:
      "Instrumented evaluation first so the argument was data rather than opinion, then automated the removal: a codemod per flag, one PR per owning squad, and a hard expiry date on every new flag going forward. The expiry policy was the actual fix - the cleanup would have regrown within a year without it.",
    outcome:
      "Bundle and branch count both dropped, but the durable result is that flag count has stayed flat for two years since.",
    stack: ["TypeScript", "jscodeshift", "LaunchDarkly"],
    links: [{ label: "Codemod", href: "https://github.com/loopbase/flag-codemod" }],
    details: [
      { label: "Cleanup", value: "1,400 flags → 180, flat for 2 years since", proof: true },
      { label: "Bundle", value: "Client bundle down 14% (312KB → 268KB gzip)", proof: true },
      { label: "Ownership", value: "Instrumentation, codemod and the expiry policy" },
      { label: "Testing", value: "Every removal behind a per-squad PR with owner review" },
    ],
  },
  {
    id: "empty-states-system",
    authorId: "rani-ardhana",
    role: "design",
    model: "b2b-saas",
    skills: ["Design systems", "Figma", "Information architecture", "Accessibility"],
    topics: ["saas"],
    title: "Treating empty states as onboarding",
    summary: "Forty screens said 'No data' and taught new teams nothing.",
    year: 2024,
    duration: "10 weeks",
    scope: "Designer · 3 squads adopting",
    problem:
      "New workspaces opened onto a grid of empty tables. Analytics showed day-one drop-off concentrated on exactly those screens, and sales was compensating with a manual setup call for every account.",
    approach:
      "Rebuilt empty states as the first lesson of each feature: one sentence on what the screen is for, a sample row people could edit rather than admire, and a single action. Shipped as a component with slots so squads could adopt it without a design review each time.",
    outcome:
      "The manual setup call is now optional rather than standard. The pattern spread further than I could have driven by hand because adopting it was cheaper than writing a bespoke empty state.",
    stack: ["Figma", "Storybook"],
    links: [{ label: "Pattern docs", href: "https://example.com/notionary/empty-states" }],
    details: [
      { label: "Activation", value: "Day-one drop-off 38% → 21%", proof: true },
      { label: "Adoption", value: "Pattern used on 34 screens across 3 squads", proof: true },
      { label: "Process", value: "Content design first, component second" },
      { label: "System impact", value: "One slotted component replaced 40 bespoke states" },
    ],
  },
  {
    id: "pricing-migration",
    authorId: "maya-tanuwijaya",
    role: "product",
    model: "b2b-saas",
    skills: ["Pricing", "Product strategy", "Analytics", "Stakeholder management"],
    topics: ["saas", "finance"],
    title: "Repricing without churning the base",
    summary: "Seat pricing punished exactly the customers we wanted to grow.",
    year: 2023,
    duration: "2 quarters",
    scope: "GPM · with finance, sales and legal",
    problem:
      "Per-seat pricing meant our best customers rationed access, which capped usage and made expansion revenue look like a product problem. Any change risked a churn event across 1,100 contracts.",
    approach:
      "Modelled every existing account against the new metric before proposing it, then grandfathered anyone who would pay more - permanently, not for a year. That single decision cost projected revenue and bought the migration its credibility. Migrated in three cohorts, smallest first, with a stop condition we actually honoured after cohort one came in soft.",
    outcome:
      "Net revenue retention improved because expansion stopped being a negotiation. Churn attributable to the change came in below the 2% we had budgeted for.",
    stack: ["Metabase", "Looker", "Notion"],
    links: [{ label: "Migration plan", href: "https://example.com/stackline/pricing" }],
    details: [
      { label: "Primary metric", value: "NRR 104% → 121%", proof: true },
      { label: "Churn cost", value: "0.8% against a 2% budget", proof: true },
      { label: "Deliberately cut", value: "Permanent grandfathering - cost revenue, bought trust" },
      { label: "Validation", value: "All 1,100 accounts modelled before the proposal" },
    ],
  },
  {
    id: "rag-retrieval-eval",
    authorId: "priya-raghunathan",
    role: "data",
    model: "b2b-saas",
    skills: ["Evaluation", "Python", "PyTorch", "Experiment design"],
    topics: ["ai", "saas"],
    title: "Why our RAG system looked better than it was",
    summary: "Retrieval scored 0.88 on our eval set and users kept getting the wrong document.",
    year: 2025,
    duration: "4 months",
    scope: "2 engineers",
    problem:
      "Offline retrieval metrics were strong and support tickets said otherwise. The eval set had been written by the team that built the system, from questions we already knew the corpus answered.",
    approach:
      "Rebuilt the eval from real user queries, including the 30% the system had failed - which is the half everyone drops because labelling failures is slow. Split by query type and found the aggregate was hiding near-total failure on multi-hop questions.",
    outcome:
      "Honest score came in far lower, which was the point. Fixing multi-hop specifically moved the real number more than six weeks of embedding tuning had.",
    stack: ["Python", "Ragas", "Weaviate", "Label Studio"],
    links: [{ label: "Eval harness", href: "https://github.com/verity/rag-eval" }],
    details: [
      { label: "Eval vs baseline", value: "Honest recall@5 0.88 → 0.61 measured, then → 0.79 fixed", proof: true },
      { label: "Production", value: "Wrong-document tickets down 64%", proof: true },
      { label: "Data", value: "1,200 real queries including 360 known failures" },
      { label: "Guardrails", value: "Reported by query type - the aggregate was the problem" },
    ],
  },
  {
    id: "multi-tenant-noisy-neighbour",
    authorId: "tobi-adeyemi",
    role: "infra",
    model: "b2b-saas",
    skills: ["Kubernetes", "Observability", "Cost optimisation", "SRE"],
    topics: ["saas"],
    title: "One tenant, everyone's outage",
    summary: "A single customer's bulk import could degrade the platform for all of them.",
    year: 2025,
    duration: "5 months",
    scope: "Platform team of 3",
    problem:
      "No per-tenant isolation on the shared worker pool. Twice that year one customer's overnight import saturated the queue and every other tenant's jobs sat behind it, which is an availability problem wearing a performance costume.",
    approach:
      "Fair-share scheduling with per-tenant concurrency ceilings and a burst allowance, plus per-tenant queue-depth metrics so support could see it happening instead of inferring it. Resisted the obvious answer of a dedicated pool per tenant - the cost curve on that was untenable at our account count.",
    outcome:
      "Cross-tenant incidents stopped. The per-tenant metrics turned out to be the more valuable half, because support now sees saturation before customers report it.",
    stack: ["Kubernetes", "Temporal", "Prometheus", "Go"],
    links: [{ label: "Scheduler notes", href: "https://example.com/rundeck/fair-share" }],
    details: [
      { label: "Reliability", value: "Cross-tenant incidents 2/year → 0 in 14 months", proof: true },
      { label: "Delivery", value: "P99 job wait 42min → 3min under peak import", proof: true },
      { label: "Cost", value: "Avoided per-tenant pools - would have been ~3x infra spend" },
      { label: "Scope", value: "1,900 tenants on one shared pool" },
    ],
  },
  {
    id: "ledger-reconciliation-ui",
    authorId: "lily-chen",
    role: "design",
    model: "enterprise",
    skills: ["Information architecture", "Data visualisation", "Usability testing", "Accessibility"],
    topics: ["banking", "finance"],
    title: "Designing for people who have to be certain",
    summary: "Reconciliation analysts trusted a spreadsheet more than our product, correctly.",
    year: 2023,
    duration: "6 months",
    scope: "Designer · 1 researcher, 5 engineers",
    problem:
      "Our reconciliation view showed matches as a clean list. Analysts exported to Excel because they needed to see what had *not* matched and why, and the product treated exceptions as an edge case rather than the job.",
    approach:
      "Inverted the screen: exceptions first, matches collapsed. Every automated match shows the rule that produced it, because an analyst signing off needs to be able to disagree with the machine. Tested with people who would be personally accountable if a number was wrong - a very different session from a usability lab.",
    outcome:
      "Exports dropped sharply and sign-off time halved. The rule-provenance detail was the thing analysts named unprompted in every follow-up.",
    stack: ["Figma", "Storybook", "Axe"],
    links: [{ label: "Case study", href: "https://example.com/bluecrest/reconciliation" }],
    details: [
      { label: "Task success", value: "Daily sign-off 2.5h → 70min", proof: true },
      { label: "Adoption", value: "Excel exports down 71%", proof: true },
      { label: "Process", value: "Tested with accountable analysts, not proxies" },
      { label: "Accessibility", value: "WCAG AA, full keyboard reconciliation flow" },
    ],
  },
  {
    id: "eta-confidence",
    authorId: "luca-bianchi",
    role: "engineering",
    model: "marketplace",
    skills: ["Go", "Forecasting", "API design", "Performance"],
    topics: ["mobility"],
    title: "Shipping an ETA people could plan around",
    summary: "Our ETAs were accurate on average and useless individually.",
    year: 2025,
    duration: "6 months",
    scope: "Team of 3 · I owned the serving path",
    problem:
      "Mean absolute error looked respectable, but the tail was brutal: one delivery in nine missed its window by over 40 minutes, and those were the only ones anyone remembered.",
    approach:
      "Optimised the 90th percentile instead of the mean, and shipped a window rather than a single time - a range is honest about uncertainty in a way a fake-precise timestamp is not. Ops pushed back hard on showing ranges; a two-week A/B on complaint rate settled it.",
    outcome:
      "Tail misses fell by more than half and complaint volume dropped, even though the displayed number became less precise.",
    stack: ["Go", "PostGIS", "Redis", "Grafana"],
    links: [{ label: "Serving path", href: "https://github.com/transitly/eta-serving" }],
    details: [
      { label: "Performance", value: "p90 ETA error 23min → 9min", proof: true },
      { label: "Adoption", value: "ETA complaints down 44% despite less precise display", proof: true },
      { label: "Ownership", value: "Serving path and the confidence-window API" },
      { label: "Trade-off", value: "Gave up displayed precision to gain trust - settled by A/B" },
    ],
  },
  {
    id: "sepa-instant-rollout",
    authorId: "andres-ferrer",
    role: "engineering",
    model: "enterprise",
    skills: ["Java", "Kafka", "Distributed systems", "Performance"],
    topics: ["banking"],
    title: "Ten-second payments on a batch-era core",
    summary: "Instant payments needed a synchronous answer from a system built for overnight runs.",
    year: 2025,
    duration: "10 months",
    scope: "Team of 7 · I owned the liquidity check",
    problem:
      "SEPA Instant requires a final answer in ten seconds, around the clock. Our balance check was a batch read that could be minutes stale, and being wrong means either rejecting good payments or authorising ones the customer cannot fund.",
    approach:
      "Built a real-time liquidity view as an in-memory projection with a strict staleness budget, and - more importantly - a defined behaviour for when that budget is blown: reject rather than guess. Argued for that default against a strong preference for availability, on the grounds that a wrong authorisation is unrecoverable and a rejection is not.",
    outcome:
      "Live across the retail base. The rejection default has triggered a handful of times and been correct every time.",
    stack: ["Java", "Kafka", "Hazelcast", "Kubernetes"],
    links: [{ label: "Design record", href: "https://example.com/meridian/adr-77" }],
    details: [
      { label: "Performance", value: "p99 authorisation 1.4s against a 10s SLA", proof: true },
      { label: "Correctness", value: "Zero incorrect authorisations in 11 months live", proof: true },
      { label: "Ownership", value: "Liquidity projection and the staleness-budget policy" },
      { label: "Trade-off", value: "Rejects rather than guesses when the budget is blown" },
    ],
  },
]

/**
 * The directory reads one list. `CORE_WORK` is the original breadth across many
 * people; `EXTRA_WORK` is depth for a smaller set, so profile pages have
 * something to group by topic.
 */
export const SEED_WORK: Work[] = [...CORE_WORK, ...EXTRA_WORK]
