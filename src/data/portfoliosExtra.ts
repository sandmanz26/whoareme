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
  {
    id: "warung-stock-forecast-cancelled",
    template: "eng-shipped",
    model: "b2b-saas",
    skills: ["Go", "Postgres", "Performance"],
    authorId: "rangga-mahendra",
    role: "engineering",
    topics: ["saas"],
    title: "The stock forecasting service we switched off",
    summary: "Technically fine, genuinely useless, and we killed it after four months live.",
    year: 2024,
    duration: "7 months, then 4 months live",
    scope: "Team of 3 · I led it",
    problem:
      "Sellers ran out of fast-moving stock and we assumed a forecasting problem. I built a per-SKU demand service with seasonality, promotions and a warm cache, and it was accurate - MAPE around 14% on top-50 SKUs, which is respectable.",
    approach:
      "Shipped it as a reorder suggestion on the stock screen. Instrumented acceptance. Over four months, 6% of suggestions were acted on. Sat with fourteen sellers and found the constraint was never knowing what to reorder - it was cash on the day the supplier's truck arrives. A perfect forecast does not help someone who cannot pay for the stock this week.",
    outcome:
      "We switched it off and put the team on supplier credit terms instead, which is now a real product line. The forecasting code is deleted; I would rather that than leave it running to protect the decision to build it.",
    stack: ["Go", "Postgres", "Redis"],
    links: [{ label: "Decision record", href: "https://example.com/warungku/adr-forecast" }],
    details: [
      { label: "Accuracy", value: "MAPE 14% on top-50 SKUs - the model was fine", proof: true },
      { label: "Adoption", value: "6% of suggestions acted on over 4 months", proof: true },
      { label: "Outcome", value: "Switched off and deleted; team moved to supplier credit" },
      { label: "Lesson", value: "We validated the model and never validated the constraint" },
    ],
  },
  {
    id: "seller-design-ops",
    template: "design-system",
    model: "b2b-saas",
    skills: ["Design ops", "Design systems", "Accessibility"],
    authorId: "ayu-pramesti",
    role: "design",
    topics: ["design-ops", "accessibility"],
    title: "Making the accessible component the easy one",
    summary: "Four designers, three codebases and a contrast ratio nobody was checking.",
    year: 2024,
    duration: "5 months",
    scope: "Design ops · 4 designers, 12 engineers",
    problem:
      "We had an accessibility standard written down and roughly a third of shipped screens met it. Not because anyone disagreed with it - because meeting it meant remembering a rule while doing something else, and the default component did not.",
    approach:
      "Stopped writing guidance and changed the defaults. Rebuilt the component library so the accessible version is the one you get by typing the obvious name, moved contrast and target-size checks into the PR pipeline as a failing check rather than a warning, and deleted the variants that let you build an inaccessible screen without meaning to.",
    outcome:
      "Compliance became a non-event because the easy path is now the compliant one. The deletions caused a fortnight of friction and were the load-bearing part.",
    stack: ["Figma", "Storybook", "Axe", "GitHub Actions"],
    links: [{ label: "Library docs", href: "https://example.com/warungku/design-system" }],
    details: [
      { label: "Compliance", value: "Screens meeting AA 34% → 96%", proof: true },
      { label: "Adoption", value: "Library coverage 41% → 88% of shipped UI", proof: true },
      { label: "Method", value: "Changed defaults and deleted variants, not more guidance" },
      { label: "Friction", value: "A fortnight of complaints about the deletions - worth it" },
    ],
  },
  {
    id: "payments-incident-review",
    template: "eng-incident",
    model: "b2b-saas",
    skills: ["Java", "Incident response", "Observability"],
    authorId: "bagus-nugraha",
    role: "engineering",
    topics: ["reliability"],
    title: "The outage that was a retry storm we built ourselves",
    summary: "Ninety minutes of failed payments, caused by our own resilience logic.",
    year: 2024,
    duration: "Incident plus 3 months of follow-up",
    scope: "Incident commander · 40-person engineering org",
    problem:
      "A 400ms latency bump in an upstream acquirer turned into a 90-minute total payment outage. Every service had a sensible-looking retry policy, and stacked together they multiplied the load on a degraded dependency by roughly 27x. Each individual policy had passed review.",
    approach:
      "Ran the postmortem without naming the team whose config was the proximate trigger, because the configuration was reasonable in isolation and the failure was in the absence of a global view. Added budgeted retries with jitter and a circuit breaker at the boundary, and - the durable change - a load test that specifically simulates a slow dependency rather than a dead one.",
    outcome:
      "The same upstream degraded twice since with no customer impact. The slow-dependency test has caught two similar patterns before release.",
    stack: ["Java", "Resilience4j", "Grafana", "k6"],
    links: [{ label: "Public postmortem", href: "https://example.com/pintar-bayar/pm-2024-11" }],
    details: [
      { label: "Reliability", value: "2 subsequent upstream degradations, zero customer impact", proof: true },
      { label: "Root cause", value: "Stacked retries multiplied load on a degraded dependency 27x", proof: true },
      { label: "Durable change", value: "Load test for a slow dependency, not just a dead one" },
      { label: "Culture", value: "Postmortem named no team - the gap was the global view" },
    ],
  },
  {
    id: "merchant-refund-flow",
    template: "design-case",
    model: "b2b-saas",
    skills: ["Interaction design", "Service design", "Usability testing"],
    authorId: "siti-rahmawati",
    role: "design",
    topics: ["finance"],
    title: "Refunds a merchant can issue without calling support",
    summary: "Every refund went through a support agent, and most of them did not need to.",
    year: 2024,
    duration: "4 months",
    scope: "Designer · 1 researcher, 3 engineers",
    problem:
      "Merchants had no way to refund a customer themselves, so 3,400 support tickets a month were someone reading a transaction ID over the phone. Support was the bottleneck and merchants looked unreliable to their own customers while they waited.",
    approach:
      "Designed self-service refunds with the risky cases still routed to a human: partial refunds over a threshold, anything past 30 days, and any merchant under 60 days old. The hard part was the confirmation - a refund is irreversible and the previous design of an irreversible action in this product had a 12% mis-tap rate, so we used an explicit amount re-entry rather than a checkbox.",
    outcome:
      "Most refunds now never touch support, and merchant-side resolution time went from hours to under a minute. Mis-taps did not materialise.",
    stack: ["Figma", "Maze"],
    links: [{ label: "Case study", href: "https://example.com/pintar-bayar/refunds" }],
    details: [
      { label: "Support load", value: "Refund tickets 3,400/month → 410/month", proof: true },
      { label: "Task success", value: "Merchant resolution time 4.2h → 48s median", proof: true },
      { label: "Safety", value: "Amount re-entry, not a checkbox; mis-taps under 0.3%" },
      { label: "Deliberately kept", value: "High-value, aged and new-merchant refunds stay human" },
    ],
  },
  {
    id: "warehouse-slotting",
    template: "eng-shipped",
    model: "marketplace",
    skills: ["Go", "Forecasting", "API design"],
    authorId: "yoga-prasetyo",
    role: "engineering",
    topics: ["mobility"],
    title: "Rearranging a warehouse with a solver and a tape measure",
    summary: "Pickers were walking 14km a shift because the layout was five years stale.",
    year: 2024,
    duration: "5 months",
    scope: "Engineer · with the Surabaya warehouse team",
    problem:
      "Pick times had crept up 40% over two years as the product mix changed and the slotting never did. Fast-movers were at the back because that is where they were when the warehouse opened.",
    approach:
      "Built a re-slotting solver on pick-frequency and affinity, then did the unglamorous half: walked the floor with the supervisors and let them veto anything that broke how they actually work. They vetoed about a fifth of the suggestions - heavy items away from the ramp, chilled goods kept together - and every veto was right for a reason the model had no way to know.",
    outcome:
      "Walking distance and pick times both fell hard. I would not run this again without the veto pass; the solver alone would have produced a layout the team could not use.",
    stack: ["Go", "OR-Tools", "Postgres"],
    links: [{ label: "Solver notes", href: "https://example.com/jangkar/slotting" }],
    details: [
      { label: "Performance", value: "Picker walking distance 14km → 6.2km per shift", proof: true },
      { label: "Throughput", value: "Picks per hour 62 → 104", proof: true },
      { label: "Method", value: "Supervisors vetoed ~20% of suggestions, all correctly" },
      { label: "Lesson", value: "The solver was half the work; the floor walk was the other half" },
    ],
  },
  {
    id: "transaction-fraud-graph",
    template: "data-shipped",
    model: "consumer",
    skills: ["Graph ML", "Python", "Evaluation", "Experiment design"],
    authorId: "lim-mei-ling",
    role: "data",
    topics: ["ai"],
    title: "Catching mule account networks",
    summary: "Rules caught individuals. The money moved through networks of them.",
    year: 2025,
    duration: "8 months",
    scope: "Head of risk data · 3 analysts",
    problem:
      "Scam proceeds were being layered through rings of mule accounts, each of which looked ordinary in isolation. Our rules scored accounts independently and were structurally incapable of seeing a ring. Reported losses were climbing and the recovery window is measured in hours.",
    approach:
      "Built a graph over transfer patterns, shared devices and registration fingerprints, scoring communities rather than accounts. Held out chronologically, not randomly - a random split leaked future structure and flattered the model by about eight points. Kept a human in the loop before any freeze, because freezing a legitimate account is a serious harm and false positives here are not symmetrical with false negatives.",
    outcome:
      "Ring detection went from effectively nothing to usable within the recovery window. Roughly one in nine flagged communities is cleared by review, which is the cost of not freezing people automatically.",
    stack: ["Python", "PyTorch Geometric", "Neo4j", "Airflow"],
    links: [{ label: "Model card", href: "https://example.com/bank-sahabat/mule-graph" }],
    details: [
      { label: "Eval vs baseline", value: "Ring recall 0.08 → 0.63 at fixed precision", proof: true },
      { label: "Production", value: "~Rp 31B of layered funds held within the recovery window", proof: true },
      { label: "Guardrail", value: "Human review before any freeze; 11% of flags cleared" },
      { label: "Method", value: "Chronological hold-out - random split leaked ~8 points" },
    ],
  },
  {
    id: "rag-retrieval-honesty",
    template: "data-investigation",
    model: "b2b-saas",
    skills: ["Evaluation", "Python", "MLOps"],
    authorId: "kwok-jia-hui",
    role: "data",
    topics: ["ai"],
    title: "Our retrieval scored 0.88 and returned the wrong document",
    summary: "The eval set was written by the people who built the system.",
    year: 2024,
    duration: "4 months",
    scope: "2 engineers",
    problem:
      "Offline retrieval metrics were strong and support tickets said otherwise. The eval set had been assembled from questions we already knew the corpus answered, which measures the corpus rather than the system.",
    approach:
      "Rebuilt the eval from real user queries including the third we had failed - the half everyone skips, because labelling failures is slow and unrewarding. Split by query type and found the aggregate was hiding near-total failure on multi-hop questions.",
    outcome:
      "The honest score came in far lower, which was the point. Fixing multi-hop specifically moved the real number more than six weeks of embedding tuning had.",
    stack: ["Python", "Ragas", "Weaviate", "Label Studio"],
    links: [{ label: "Eval harness", href: "https://example.com/tanya-ai/rag-eval" }],
    details: [
      { label: "Eval vs baseline", value: "Honest recall@5 0.88 claimed → 0.61 measured → 0.79 fixed", proof: true },
      { label: "Production", value: "Wrong-document tickets down 64%", proof: true },
      { label: "Data", value: "1,200 real queries including 360 known failures" },
      { label: "Method", value: "Reported by query type - the aggregate was the problem" },
    ],
  },
  {
    id: "driver-hiring-pipeline",
    template: "prod-leadership",
    model: "marketplace",
    skills: ["Hiring", "Discovery", "Stakeholder management"],
    authorId: "maria-consuelo-reyes",
    role: "product",
    topics: ["hiring"],
    title: "Onboarding 6,000 drivers without a background-check bottleneck",
    summary: "Compliance took nine days and we were losing half our applicants inside it.",
    year: 2024,
    duration: "2 quarters",
    scope: "CPO · with legal, ops and 1 squad",
    problem:
      "NBI clearance, LTO licence verification and our own checks ran sequentially and took nine days. 54% of applicants dropped out during the wait, usually to a competitor who had started them on a provisional basis.",
    approach:
      "Parallelised every check that could legally run concurrently and introduced a provisional status with a restricted job set - shorter trips, cash-free only - for the window where the slow checks are still pending. Legal was, correctly, the hardest conversation; the restriction set is what made it defensible.",
    outcome:
      "Drop-out during onboarding fell by most of what it was. Two provisional drivers failed a later check in the first year and were removed within a day, which is the residual risk we accepted in writing.",
    stack: ["Ashby", "Metabase", "Retool"],
    links: [{ label: "Onboarding policy", href: "https://example.com/kalesa/onboarding" }],
    details: [
      { label: "Hiring", value: "Applicant drop-out during checks 54% → 12%", proof: true },
      { label: "Speed", value: "Time to first job 9 days → 26 hours", proof: true },
      { label: "Residual risk", value: "2 provisional drivers failed later checks, removed in <24h" },
      { label: "Design", value: "Restricted job set is what made provisional status defensible" },
    ],
  },
  {
    id: "internal-dev-portal",
    template: "infra-platform",
    model: "platform",
    skills: ["Platform engineering", "Kubernetes", "API design"],
    authorId: "adi-kurniawan",
    role: "infra",
    topics: ["devex"],
    title: "A service catalogue people actually update",
    summary: "Our previous catalogue was accurate for about six weeks.",
    year: 2024,
    duration: "6 months",
    scope: "Platform team of 4 · 29 services",
    problem:
      "Nobody could answer who owns a service, what it depends on, or whether it is in the on-call rotation, without asking in Slack. A wiki catalogue had been tried and rotted, as wiki catalogues do, because updating it was a separate act of goodwill.",
    approach:
      "Generated the catalogue from things teams already maintain - the deploy manifest, the on-call schedule, the repo - so it cannot drift without something else breaking first. Added exactly one required field they did not already keep, data classification, and accepted that one field's worth of friction. Refused the temptation to add the other twelve fields people asked for.",
    outcome:
      "Still accurate two years on, which is the only metric that matters for a catalogue. The restraint about extra fields is the reason.",
    stack: ["Backstage", "Kubernetes", "Terraform", "Go"],
    links: [{ label: "Catalogue design", href: "https://example.com/nusantara/catalogue" }],
    details: [
      { label: "Accuracy", value: "Still accurate at 24 months; the wiki version lasted 6 weeks", proof: true },
      { label: "Delivery", value: "'Who owns this?' from a Slack thread to a lookup", proof: true },
      { label: "Restraint", value: "One new required field. Twelve were requested." },
      { label: "Design", value: "Generated from artefacts teams already maintain" },
    ],
  },
  {
    id: "oncall-load-rebalance",
    template: "infra-leadership",
    model: "platform",
    skills: ["SRE", "Incident response", "Observability"],
    authorId: "chen-yu-xuan",
    role: "infra",
    topics: ["reliability"],
    title: "Cutting pages by 80% by deleting alerts",
    summary: "On-call was waking up nine times a week and fixing almost nothing.",
    year: 2024,
    duration: "4 months",
    scope: "Staff SRE · 6 teams in rotation",
    problem:
      "Median 9.2 pages per on-call week, of which about 15% led to any action. Two engineers had left citing on-call. Every alert had been added by someone reasonable after some incident, and nobody had ever been given permission to remove one.",
    approach:
      "Audited every alert against a single question - if this fires at 3am, is there something a human must do right now? Anything that failed went to a dashboard or a ticket. Deleted 140 of 190 alerts. Got explicit written sign-off from each service owner beforehand, because deleting alerts is a trust exercise long before it is a technical one.",
    outcome:
      "Pages dropped hard and actionability went up, which is the pairing that matters. Time to acknowledge halved, because a page now means something.",
    stack: ["Prometheus", "PagerDuty", "Grafana"],
    links: [{ label: "Alert audit", href: "https://example.com/nusantara/alert-audit" }],
    details: [
      { label: "On-call load", value: "9.2 pages/week → 1.8", proof: true },
      { label: "Actionability", value: "Pages requiring human action 15% → 71%", proof: true },
      { label: "Response", value: "Median time to acknowledge 11min → 5min" },
      { label: "Method", value: "Deleted 140 of 190 alerts, with written owner sign-off" },
    ],
  },
  {
    id: "puskesmas-queue",
    template: "prod-rescue",
    model: "public",
    skills: ["Service design", "Discovery", "Stakeholder management"],
    authorId: "putu-ariani",
    role: "product",
    topics: ["healthtech"],
    title: "Queue numbers for a clinic that opens at 5am",
    summary: "Patients queued from before dawn for a number, then waited all day anyway.",
    year: 2024,
    duration: "2 quarters",
    scope: "PM · 6 puskesmas, 1 designer, 2 engineers",
    problem:
      "Patients arrived at 5am to queue for a paper number for a consultation that might happen at 2pm. Our booking feature had been live for a year with 4% uptake. The assumption was low digital literacy; the reality was that a booked slot was not honoured, so the queue was still the only thing that worked.",
    approach:
      "Fixed the operational side before touching the app: worked with clinic staff to reserve a genuine share of slots for bookings and to hold them. Only then did the booking feature mean anything. Kept the paper queue running in parallel and did not try to retire it, because a system that excludes people without a phone is not a health system.",
    outcome:
      "Uptake rose once bookings were real. Average wait fell by hours. The paper queue is still there and should be.",
    stack: ["Figma", "Metabase", "Odoo"],
    links: [{ label: "Service blueprint", href: "https://example.com/klinika/queue" }],
    details: [
      { label: "Adoption", value: "Booking uptake 4% → 47% across 6 puskesmas", proof: true },
      { label: "Patient impact", value: "Median wait 6.1h → 1.4h", proof: true },
      { label: "Sequencing", value: "Fixed slot-holding operationally before touching the app" },
      { label: "Deliberately kept", value: "Paper queue retained - excluding the phone-less is not an option" },
    ],
  },
  {
    id: "erp-halal-traceability",
    template: "prod-bet",
    model: "enterprise",
    skills: ["Product strategy", "Discovery", "Stakeholder management"],
    authorId: "tan-wei-sheng",
    role: "product",
    topics: ["erp"],
    title: "Halal traceability as a first-class feature",
    summary: "A compliance checkbox for us; a market-access requirement for our customers.",
    year: 2025,
    duration: "2 quarters",
    scope: "GPM · 2 squads, 5 customer design partners",
    problem:
      "Indonesian and Malaysian food manufacturers need auditable halal chain-of-custody, and Indonesia's mandatory certification deadlines were approaching. We had a certificate-upload field. Customers were maintaining the real record in parallel spreadsheets, which meant our ERP was not the system of record for the thing that decides whether they can sell.",
    approach:
      "Modelled halal status as a property of a batch that propagates through production, so a non-halal input contaminates its outputs automatically rather than relying on someone remembering. Ran it with five design partners including two who failed an audit during the project - those two taught us more than the three who passed.",
    outcome:
      "The parallel spreadsheets went away for the design partners. Audit preparation went from weeks to days, which is the number the customers quote back to us.",
    stack: ["Rules engine", "Postgres", "Metabase"],
    links: [{ label: "Traceability model", href: "https://example.com/rantai/halal" }],
    details: [
      { label: "Business impact", value: "Audit prep 3 weeks → 2 days for design partners", proof: true },
      { label: "Adoption", value: "Parallel spreadsheets retired at 5 of 5 partners", proof: true },
      { label: "Method", value: "Propagating batch property, not a certificate field" },
      { label: "Learning", value: "The 2 partners who failed an audit taught us most" },
    ],
  },
  {
    id: "ledger-migration-rollback",
    template: "eng-incident",
    model: "platform",
    skills: ["Go", "Event sourcing", "Incident response"],
    authorId: "nguyen-thi-mai-anh",
    role: "engineering",
    topics: ["reliability"],
    title: "The migration we rolled back at 60%",
    summary: "Nine months of work, stopped four weeks in, and it was the right call.",
    year: 2024,
    duration: "9 months build, 4 weeks live, 1 day to roll back",
    scope: "Team of 5 · I owned the cutover plan",
    problem:
      "We were moving the ledger from a row-per-balance model to event sourcing for auditability. Built well, tested hard, dual-ran for six weeks with reconciliation. At 60% of traffic, month-end close took 9 hours instead of 40 minutes - replaying a month of events at our volume was a workload nobody had load-tested because we had only ever tested the write path.",
    approach:
      "Rolled back inside a day, which only worked because we had kept the old path warm and had not yet migrated historical data. Wrote it up internally with the specific gap named: we tested the thing we were building and not the thing the finance team does once a month. Rebuilt with periodic snapshots and re-ran the whole dual-run before trying again.",
    outcome:
      "Second attempt shipped six months later and close runs in 22 minutes. I would do the rollback the same way; the mistake was four weeks earlier, in what we chose to load-test.",
    stack: ["Go", "Postgres", "Kafka", "k6"],
    links: [{ label: "Rollback postmortem", href: "https://example.com/saigon-rails/ledger-pm" }],
    details: [
      { label: "Rollback", value: "60% of traffic reverted in under a day, zero data loss", proof: true },
      { label: "Second attempt", value: "Shipped 6 months later; close 9h → 22min", proof: true },
      { label: "Root cause", value: "Load-tested the write path, never the monthly close" },
      { label: "What saved it", value: "Old path kept warm; historical data not yet migrated" },
    ],
  },
  {
    id: "driver-design-ops",
    template: "design-system",
    model: "marketplace",
    skills: ["Design ops", "Design systems", "Motion"],
    authorId: "dewi-larasati",
    role: "design",
    topics: ["design-ops"],
    title: "One component library for a phone on a handlebar",
    summary: "Driver and shipper apps had drifted into two different products.",
    year: 2024,
    duration: "4 months",
    scope: "Designer · with 2 designers and 8 engineers",
    problem:
      "Two apps, two teams, two sets of components that looked similar and behaved differently. A driver switching between our apps got different gesture meanings for the same swipe, which in a moving-vehicle context is not a consistency nicety.",
    approach:
      "Built one library with explicit context variants - 'in-motion' components have larger targets, higher contrast and no destructive actions, and that is enforced by the component rather than by a guideline. Motion tokens were the surprise: the same 300ms transition that reads as polished on a desk reads as sluggish when you are waiting at a junction, so in-motion variants run faster.",
    outcome:
      "Gesture inconsistencies across the apps went to zero and shipping a driver-facing screen got noticeably faster. The in-motion variant idea has outlived the project.",
    stack: ["Figma", "Storybook", "Lottie"],
    links: [{ label: "Library", href: "https://example.com/jangkar/design-system" }],
    details: [
      { label: "Consistency", value: "Cross-app gesture conflicts 14 → 0", proof: true },
      { label: "Delivery", value: "Driver-facing screen build time down 45%", proof: true },
      { label: "Idea that lasted", value: "In-motion variants: bigger targets, faster motion, no destructive actions" },
      { label: "Enforcement", value: "In the component, not in a guideline" },
    ],
  },
]
