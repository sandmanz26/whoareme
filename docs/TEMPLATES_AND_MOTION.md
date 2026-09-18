# Work templates and case-study motion

Two features, documented together because they both landed in the same pass and
both change how a case study is produced and read. Written to be handed to an
agent with no other context; [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) is the
full system overview.

Last verified: 16 September 2026, against a running dev server, a clean
`tsc -b --noEmit`, and a responsive sweep across 360 / 390 / 768 / 1024 / 1440.

---

## Part 1 — Work templates

### The problem

Adding work used to ask two questions: **how** do you want to write it (guided
or free-form) and **which craft** is it. The craft picked the evidence
questions — latency and a repo for a developer, task success for a designer.

That is still right and it is not enough. A role tells you the *vocabulary*. It
does not tell you the *shape* of the work, and the shape is what decides which
questions are worth asking.

A designer's flagship case study and their design-system contribution are both
design. Almost nothing they should be asked about is the same:

| | Case study | Design system |
|---|---|---|
| Judged on | A decision and a task-success number | Adoption across teams, over years |
| Key risk | Did it actually ship? | Did anyone use it? Does it survive you? |
| Useless question | "What is the governance model?" | "What was the task success rate?" |

Asking one set of questions for both produces a bad form for at least one of
them. So there is now a third step.

### The model

Five **archetypes** describe the shapes work actually comes in. They are
craft-neutral — the same shape means something specific in every role.

| Archetype | What it is | Judged on |
|---|---|---|
| `shipped` | A bounded thing that launched | Problem, decisions, outcome |
| `system` | Reusable, serves other teams | Adoption, not launch |
| `craft` | The artefact itself | Constraints and decisions |
| `discovery` | The deliverable is a decision | What changed because of it |
| `rescue` | Something was failing | Recurrence, not the fix |
| `leadership` | The team and the practice | What the team could do afterwards |

Each role gets **exactly four**, never all six. Four covers a real career and is
few enough to pick from without deliberating — a chooser with eight options
stops being help and becomes another form.

| Role | Templates |
|---|---|
| Designer | Case study · Design system · Craft piece · Design leadership |
| Developer | Shipped project · Platform or library · Incident or turnaround · Engineering leadership |
| Product | Shipped bet · Discovery or strategy · Turnaround · Product leadership |
| Data & AI | Model or analysis in production · Data platform · Investigation · Data leadership |
| DevOps | Platform build · Migration · Incident or reliability · Platform leadership |
| QA | Test strategy · Automation platform · Escape or incident · Quality leadership |
| Growth | Experiment or campaign · Growth system · Channel turnaround · Growth leadership |
| Research | Study · Research practice · Foundational or strategic · Research leadership |

Every role has a leadership template and a system template. That is deliberate:
those two shapes are where senior work lives, and they were the two most badly
served by a single per-role schema.

### Where the fields come from

`src/data/workTemplates.ts`:

```
fieldsForTemplate(role, templateId)
  = archetype === "shipped"
      ? ROLE_SCHEMAS[role].fields        // the craft's own schema, already specific
      : ARCHETYPE_FIELDS[archetype]      // the shape's questions
    + template.extraFields               // craft-specific additions
```

So `shipped` reuses the existing per-role evidence schema unchanged — it was
already good and there was no reason to rewrite it. The other five archetypes
define their own base questions, and a template adds craft vocabulary on top
(`design-craft` adds "Medium and format"; `eng-incident` adds "Who it affected").

**To add a template:** add an entry to `WORK_TEMPLATES[role]` with an
`archetype`, a `label`, a `blurb`, a `headline`, an `intro`, and optionally
`extraFields`. Nothing else changes — the editor, the readiness check, the
mapper and the case-study badge all read from the same function.

**To add an archetype:** add it to `ARCHETYPES` and give it a field set in
`ARCHETYPE_FIELDS`. TypeScript will not let you forget the field set.

### The flow

`#/panel/portfolio/new` now has three steps, revealed progressively — the
template section only appears once a craft is chosen, so the page never presents
two unanswered questions at once.

1. **Format** — guided template or your own structure
2. **Craft** — per entry, not per person; it need not match the profile
3. **Template** — four options, only for guided entries

Free-form entries skip step 3 entirely and store the role's default template id
so the record shape stays uniform.

Inside the editor the template can be changed from a select in the header
without losing anything already typed — the fields are re-derived, and values
for fields the new template does not have are simply not rendered (they stay in
`draft.values` in case the author switches back).

### Data shape

- `WorkDraft.template: string` — the template id. Required; `emptyDraft` takes it.
- `Work.template?: string` — carried through by `workFromDraft` so the case
  study can show a "Design system" badge next to the craft badge.
- All 54 seeded case studies carry a template id.

### Files

| File | Role |
|---|---|
| `src/data/workTemplates.ts` | Archetypes, per-role templates, field resolution |
| `src/data/portfolioSchemas.ts` | The `shipped` field sets, unchanged |
| `src/components/panel/WorkStarter.tsx` | Steps 1–3 |
| `src/components/panel/WorkEditor.tsx` | Renders template fields, in-place switcher |
| `src/lib/readiness.ts` | Publish check reads the same fields |
| `src/lib/workMapper.ts` | Draft → `Work`, carries the template id |

---

## Part 2 — Case-study motion

### Constraints applied

From the motion research, plus this codebase's own rules:

- **200–300 ms** for interface motion; entrances may run to ~320 ms
- **Transform and opacity only**, so animation stays on the compositor thread —
  never `top`/`left`/`width`
- **Exit faster than entrance**, so back/forward feels snappy
- **No split-text on paragraphs** — headline-length copy only, and we do none
- **No GSAP.** The SPA has zero runtime dependencies beyond React and that rule
  stands. IntersectionObserver plus CSS transitions covers everything here.

### What was added

**Staggered chapter entrance.** Each chapter of a case study fades and rises
3px as it enters the viewport, 320 ms, 60 ms apart, capped at four steps so the
last one never feels late. Chapters arriving in order reads as the page
settling; all-at-once reads as an effect.

**Reading progress bar.** A 2px sticky bar under the navbar, driven by a
`scaleX` transform. Case studies run long on purpose, and this is the cheapest
way to say how much is left. It is the only motion on the page that is not an
entrance.

### The failure mode this avoids

`useReveal` **defaults to revealed** and only hides content once it knows an
`IntersectionObserver` exists. Content that depends on JavaScript to become
visible is a bug waiting for a bad network — the default has to be visible.

The observer disconnects after firing, so scrolling a long case study does no
ongoing work. The progress bar reads layout inside `requestAnimationFrame`, so
it measures at most once a frame.

### Reduced motion

The global `prefers-reduced-motion` block in `src/index.css` neutralises
durations across the whole app. Verified: with reduced motion emulated, chapter
opacity is `1` at load — nothing is hidden, nothing animates.

### Files

| File | Role |
|---|---|
| `src/hooks/useReveal.ts` | `useReveal`, `useReadingProgress` |
| `src/components/work/Reveal.tsx` | The entrance wrapper |
| `src/pages/WorkPage.tsx` | Chapters wrapped, progress bar, template badge |

---

## Verification performed

```
tsc -b --noEmit                         clean
vite build                              clean
templates per role                      design:4 engineering:4 product:4 data:4
                                        infra:4 quality:4 growth:4 research:4
template step hidden before craft       yes
design-system fields                    What it covers / Adoption / How changes get
                                        decided / How it survives you / ...
craft-piece fields                      The brief / Decisions you would defend /
                                        The hardest constraint / ... / Medium and format
in-place template switch                re-derives fields, keeps typed values
every seeded entry has a template       yes (54/54)
chapter reveal above the fold           opacity 1 at load
chapter reveal below the fold           0 → 1 on scroll
progress bar                            scaleX(0) → scaleX(0.84)
prefers-reduced-motion                  opacity 1, no animation
responsive sweep 360–1440, 7 routes     no overflow, no console errors
```

## Open questions

- Four templates per role is a judgement call, not a measured one. If the
  completion-rate instrumentation ever exists, the thing to check is whether
  the template step costs more drop-off than the better-fitting form recovers.
- `craft` is only offered to designers today. Engineers writing a pure
  algorithm, or researchers writing a method, arguably want it too — it was
  held back because "here is a thing I made, no outcome metric" is easiest to
  abuse, and the product's whole position is that outcomes are required.
- The template is currently invisible on cards and in the index filters. If
  people start using it meaningfully, "show me design systems" is an obvious
  next filter — but adding a fourth filter axis needs the same scrutiny the
  business-model axis got.
