# whoareyou

> **Working on this with an AI agent?** Point it at [`AGENTS.md`](AGENTS.md)
> first - it orients in two minutes and routes to the deeper docs.

A front-end-only SaaS directory for people who build technology. One profile,
segmented by the craft and the industry someone actually works in — plus real
case studies rather than screenshots.

No backend and no API. Browsing state lives in React; the account and its
portfolio entries live in `localStorage`, which is the seam a real API would
slot into later.

## Documentation

Hand [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) to anyone — human or
AI — starting with no context. It is self-contained and covers the whole system.

| Doc | Covers |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | What changed, when, and why. Every bug found and the invariant it became. |
| [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) | **Complete handover.** Product, front end, back end, database, invariants, gaps. |
| [`docs/ENGINEERING.md`](docs/ENGINEERING.md) | Front-end deep dive and the invariants that break non-obviously. |
| [`docs/BUSINESS.md`](docs/BUSINESS.md) | Thesis, taxonomy, load-bearing rules, metrics, non-goals. |
| [`docs/TEMPLATES_AND_MOTION.md`](docs/TEMPLATES_AND_MOTION.md) | Work templates (archetypes × craft) and case-study motion. |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Collections, validators, indexes and every query the API runs. |
| [`server/README.md`](server/README.md) | API surface, decisions, how to run it. |
| [`CLAUDE.md`](CLAUDE.md) | The short version plus non-negotiable rules. |

## Backend

`server/` holds a Node + Express + MongoDB API covering auth, the directory,
portfolio CRUD with the topic quota enforced atomically, similarity scoring,
traffic and thumbnail uploads. `cd server && npm run test:smoke` runs 47
assertions against an ephemeral replica set.

The SPA still runs standalone against static fixtures and `localStorage`;
wiring it to the API is the next piece of work (`docs/PROJECT_CONTEXT.md` §12).

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 (`@theme` design tokens, no config file) |
| Runtime deps | React + React DOM only |

Icons, the dialog, the focus trap and the stepper are all hand-rolled so the
shipped bundle carries no UI library.

## Getting started

```bash
npm install
npm run dev
```

Other scripts: `npm run build` (type-check + production bundle), `npm run preview`,
`npm run lint` (types only).

## Design system

Editorial minimalism with pop-culture accents — ink on warm paper, one loud accent,
four supporting pops. Tokens live in [`src/index.css`](src/index.css) under `@theme`,
so every colour, font, radius and easing is one place.

- **Type** — Space Grotesk (display, tight tracking) + DM Sans (body)
- **Neutrals** — `ink #0B0B0F` on `paper #F5F4EF`
- **Pops** — lime `#D6FF4F`, pink `#FF4F87`, violet `#6C4CF1`, sky `#4FD1FF`, tangerine `#FF8A3D`
- **Motion** — 200–300ms, `--ease-pop`; the whole system stops under `prefers-reduced-motion`

Decorative portraits (the hero orbit) get a duotone treatment so mismatched source
photos read as one art direction. Directory cards stay full colour — that's
information, not decoration.

## Structure

```
src/
  components/
    ui/        Button, Badge, Avatar, Modal, Field, Icon — the primitives
    layout/    Navbar, Footer, Container, Wordmark
    home/      Hero, OrbitRing, Marquee, RoleGrid, FilterBar, WorkBrowser, Directory, JoinCta
    work/      WorkCard + the generated WorkCover
    panel/     PanelShell, WorkStarter, SchemaForm, WorkEditor, SkillPicker,
               ThumbnailPicker, ListEditors, TrafficPanel
    join/      JoinModal + its pure validation model
  pages/       HomePage, WorkIndexPage, WorkPage (case study), PanelPage
  data/        taxonomy, people, skills, seeded case studies, per-role schemas, traffic
  hooks/       useAccount (localStorage-backed), useLockBodyScroll
  lib/         router, storage, filtering, draft→work mapper, image downscaling
  App.tsx      routes, and owns all browse state
```

## Routes

Hash routing, hand-rolled (`src/lib/router.ts`) so the build deploys anywhere
static. In-page anchors like `#work` parse to a route nothing matches and fall
through to the home page, so jump links keep working.

| Route | View |
|---|---|
| `#/` | Home |
| `#/work` | Every portfolio — filters, sort, grid/list |
| `#/work/:id` | Case study — story, results, more from the author, similar work |
| `#/panel` | Panel overview — profile strength, portfolio and traffic stats |
| `#/panel/profile` | Profile form |
| `#/panel/portfolio` | Entry list with completeness |
| `#/panel/portfolio/new` | Format + craft, then the form |
| `#/panel/portfolio/:id` | Edit an entry |
| `#/panel/traffic` | Profile views and portfolio opens |

## Authoring an entry

Adding work asks two questions before anything is typed.

**Format.** *Guided template* renders the role's evidence schema. *Your own
structure* gives a section builder — the author's headings, in their order,
plus their own result rows. Some work does not fit a template (a multi-year
programme, a body of research), and forcing it to produces worse writing than
letting someone structure it themselves.

**Craft.** Per entry, not per person. A designer who shipped a routing engine
files it as developer work; the starter says so explicitly. The craft sets the
evidence questions, the cover motif and the role filter.

Both modes converge on one `Work` model in
[`workMapper.ts`](src/lib/workMapper.ts), so the card, the preview, the index
and the case study render from a single shape.

### Thumbnails, links and skills

- **Thumbnail** is optional. Uploads are downscaled to 960px and stored as a
  data URL; without one the cover is generated. Much real work is under NDA or
  unreadable at card size, so an entry is never penalised for having no image.
  When there is an upload, the headline metric still sits on it.
- **Portfolio links** are a repeatable label + URL list — repo, live, deck, doc.
- **Skills** are free text with per-craft suggestions. The home page and the
  index filter on them, so the suggestions exist to keep strings consistent.

### Two entries per topic

`TOPIC_QUOTA` in [`account.ts`](src/data/account.ts) caps published entries at
two per topic, per person. The cap is visible in the topic chips as `1/2` and
the chip disables at the limit, rather than surfacing as an error after the
case study is written. Drafts are unlimited; unpublishing frees a slot.

## Traffic

`#/panel/traffic` shows profile views and portfolio opens over 30 days, plus
opens per entry. Views are recorded when someone opens the signed-in person's
card in the directory or their case study — which is why registering also puts
you in the people directory.

There is no server, so the 30-day history is generated deterministically from
the account id at registration. The panel says so in plain language rather than
presenting simulated numbers as measurements; real events in the browser are
counted on top.

## Role-specific portfolio forms

Every craft proves itself differently: a developer's evidence is p95 and a repo;
a researcher's is who they interviewed and what the team decided afterwards.
Forcing both through one generic description box is what makes portfolio sites
useless for hiring.

So adding work is two steps. Step one picks the role. Step two renders a form
generated from that role's schema in
[`src/data/portfolioSchemas.ts`](src/data/portfolioSchemas.ts) — common fields
and the three story fields are shared, and the evidence section is per-role.
One renderer (`SchemaForm`) and one validator serve all eight, so adding a field
to a craft is a one-line change with no new component and no migration: entries
store a flat `Record<string, string>` keyed by field name.

Fields marked `proof: true` become the metric on the card cover and the
"results claimed" panel on the case study.

## Browse by portfolio

The home page filters on two axes — **role** and **topic** — from one
`FilterBar`, and that single filter state drives the portfolio grid, the people
directory and the full index, so a choice made in any of them holds everywhere.
Skills refine underneath as chips, drawn from the visible results so the row
never offers a filter that returns nothing.

### Similar work

A case study ends with two related sections: everything else by the same
person, and comparable work scored on three axes — shared skills (the language
axis), shared topics, and the same business model. Skill overlap is capped so a
long skill list cannot swamp the other two, results are de-duplicated by author,
and every match shows *why* it surfaced. See `src/lib/similar.ts`.

Covers are generated, never uploaded: each craft has a line motif (with a
deterministic mirror so two entries in the same craft still differ), and the
cover carries the headline number rather than a thumbnail. Internal work is
usually confidential and unreadable at card size anyway — and it keeps the grid
honest, because nobody wins it with a prettier mockup.

### The hero orbit

`OrbitRing` rotates a ring element while every portrait counter-rotates at the same
rate, so faces stay upright while travelling the circle. Radius and portrait size are
fractions of a single `--stage` custom property, so the whole composition scales from
390px to 1440px without a breakpoint. It is pure CSS transforms — no per-frame
JavaScript.

### State

`App.tsx` holds `category`, `role` and `query` as the single source of truth. The hero
search, the craft grid and the directory all read from it, which is why selecting a
craft scrolls to and filters the directory in one move.

## Accessibility

- Visible labels on every control, errors inline and wired through `aria-describedby`
- Dialog is labelled, scroll-locked, Escape-dismissible, focus-trapped, and restores focus
- One consistent `:focus-visible` ring across the product; skip link to the directory
- All controls clear a 44px touch target; `aria-pressed` on every toggle
- Full `prefers-reduced-motion` support
- Verified with no horizontal overflow and no console errors at 390 / 768 / 1440 across all routes

## Notes

Portraits load from `randomuser.me`. Offline, the `Avatar` component falls back to a
deterministic pop-tinted monogram rather than a broken image.

Registration writes an account to `localStorage` under the `whoareyou:` prefix and
opens the panel. Published entries are merged ahead of the seeded case studies on
the home grid, so your own work shows up in the directory immediately. "Sign out"
clears both keys.
