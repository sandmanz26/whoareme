# Engineering context — whoareyou

Written for an AI agent or engineer picking this repo up cold. It describes how
the system is put together, the invariants that hold it together, and the
places where a naive change will break something non-obvious.

---

## 1. What this is, and the one constraint that shapes everything

A front-end-only directory of tech people and their real work. **There is no
backend, no API and no server.** That is a product constraint, not a stage of
development — every feature has to be reachable in a browser with no network
beyond fonts and portrait images.

Consequences you must respect:

- Browse data is static TypeScript in `src/data/`.
- Anything user-created lives in `localStorage` behind `useAccount`.
- Nothing may be added that requires a request to an origin we control.
- Anything that *looks* like server data (traffic history) must be labelled as
  generated in the UI. See §9.

## 2. Stack and commands

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 — tokens in `@theme`, no `tailwind.config.js` |
| Runtime deps | `react`, `react-dom`. Nothing else. |

```bash
npm install
npm run dev      # vite, port from .claude/launch.json (9800)
npm run build    # tsc -b && vite build
npm run lint     # types only
```

Icons, the dialog, the focus trap, the router, the stepper and the image
downscaler are all hand-rolled. **Do not add a UI library, an icon package, a
router or a state manager** without a stated reason — the zero-dependency
surface is deliberate and currently costs ~127 kB gzipped in total.

## 3. Directory map

```
src/
  components/
    ui/        Button, Badge, Avatar, Modal, Field, Icon  — primitives
    layout/    Navbar, Footer, Container, Wordmark
    home/      Hero, OrbitRing, Marquee, RoleGrid, FilterBar, WorkBrowser,
               Directory, TalentCard, SectionHeading, JoinCta
    work/      WorkCard, WorkCover
    panel/     PanelShell, WorkStarter, SchemaForm, WorkEditor, SkillPicker,
               ThumbnailPicker, ListEditors, TrafficPanel
    join/      JoinModal + joinForm (pure validation model)
  pages/       HomePage, WorkIndexPage, WorkPage, PanelPage
  data/        taxonomy, businessModels, skills, people, portfolios,
               portfolioSchemas, work, account, traffic, trafficSeed
  hooks/       useAccount (context + localStorage), useLockBodyScroll
  lib/         router, storage, filter, workFilter, similar, workMapper,
               authors, image, css, utils
  App.tsx      route switch + all browse state
```

## 4. Routing

Hand-rolled hash router (`src/lib/router.ts`) so the static build deploys
anywhere. `useRoute()` parses `location.hash` into `{ path, segments }`.

**Non-obvious detail:** in-page anchors (`#work`, `#roles`, `#directory`) parse
to routes that match nothing and fall through to `HomePage`, so jump links keep
working alongside real routes. `pageRootOf()` returns `"home" | "work" |
"panel"`; if you add a page, add its root to `PAGE_ROUTES` or it will silently
render the home page.

| Route | View |
|---|---|
| `#/` | Home |
| `#/work` | Full portfolio index |
| `#/work/:id` | Case study detail |
| `#/panel`, `/profile`, `/portfolio`, `/portfolio/new`, `/portfolio/:id`, `/traffic` | Panel |

`App.tsx` scrolls to top on page-root change only, so anchors are not hijacked.

## 5. State ownership

- **Browse state** (`role`, `topic`, `model`, `skills`, `query`) lives in
  `App.tsx` as a single `Filters` object. Every surface reads it, so selecting a
  craft in the role grid, the home dropdown or the index dropdown produces one
  consistent answer everywhere. Do not add a second copy.
- **Account and portfolio entries** live in `useAccount` (React context over
  `localStorage`). This is the seam a real API would slot into — components
  never touch `localStorage` directly, they call the hook.
- **Component-local** state is used for pagination, editor buffers and view
  toggles. Pagination resets via the derive-state-during-render pattern (compare
  a signature string against the previous one), not `useEffect`.

Storage keys, all prefixed `whoareyou:` — `account`, `drafts`, `traffic`.
`signOut()` clears all three.

## 6. Data models

### `Person` (`data/people.ts`)
Seeded directory rows, built from a tuple table so adding one is a single line.
`id` comes from `slugify(name)`, which transliterates `ø æ œ ł đ ð þ ß` before
NFD — without that, ids like `julia-s-rensen` appear.

### `Work` (`data/work.ts`) — the central display model
Everything renders from this shape: seeded case studies *and* entries the user
authors. Key fields: `role`, `topics[]`, `model`, `skills[]`, `details[]`
(`proof: true` marks the numbers shown on cards), `sections[]` (free-form
entries only), `thumbnail` (data URL, optional).

### `WorkDraft` (`data/account.ts`) — the stored form state
`values` is a flat `Record<string, string>` keyed by schema field name. Flat is
deliberate: adding a field to a schema needs no migration. `mode` is
`"template" | "custom"`.

**`workFromDraft()` in `lib/workMapper.ts` is the only bridge** between the two.
Both authoring modes converge there. If you add a field to a schema and it does
not appear on a card, that function is where to look.

### `TrafficStore` (`data/traffic.ts`)
`{ days: Record<ISODate, { profile: number; work: Record<workId, number> }> }`.
Pure functions only — the hook owns persistence.

## 7. Schema-driven portfolio forms

Each craft proves itself differently, so the evidence half of the form is
generated from `ROLE_SCHEMAS` in `data/portfolioSchemas.ts`. One renderer
(`SchemaField`) and one validator (`validateFields`) serve all eight roles.

**To add a field to a craft:** add a `FieldSpec` to that role's `fields`. Done —
no component, no validator change, no migration. Mark it `proof: true` only if
it is a metric worth putting on the card.

**To add a whole craft:** add it to `ROLES` in `data/taxonomy.ts`, add a schema
under the same id, add suggestions to `SKILL_SUGGESTIONS`, and add a motif case
to `Motif` in `WorkCover.tsx`. TypeScript will point at all four — `RoleId` is
derived from the `ROLES` literal, and the records are exhaustive by type.

`FieldKind` is `text | textarea | url | number | tags | select`. `select`
requires `options`.

## 8. Similarity (`lib/similar.ts`)

"Similar" means *comparable to a reviewer*, not visually alike. Three axes:

```
score = min(sharedSkills, 3) × 2   // the language/skills axis
      + sharedTopics × 3
      + (sameBusinessModel ? 3 : 0)
      + (sameRole ? 1 : 0)
```

The skill cap exists because uncapped skill overlap swamps the other two axes
and every result becomes "the same craft again" — the least useful thing to
show someone already reading that craft. Results are de-duplicated by author
(one entry per person), because the author's own other work has its own section
directly above. Every match carries `reasons[]`, rendered on the card, so a
match never looks arbitrary.

## 9. Traffic honesty

`trafficSeed.ts` generates a deterministic 30-day history from the account id at
registration, with weekends quieter. Real opens and profile views in the browser
are counted on top.

**The panel states this in plain language.** If you change the traffic feature,
keep that disclosure. Presenting simulated numbers as measurements would make
the one screen meant to be factual the least trustworthy thing in the product.

Opens are only recorded for the signed-in person's own entries — this is their
analytics, not a global counter.

## 10. Design system and conventions

Tokens live in `src/index.css` under `@theme`: `--color-ink`, `--color-paper`,
five `--color-pop-*`, `--font-display` (Space Grotesk) / `--font-sans` (DM Sans),
`--radius-card`, `--radius-pill`, `--ease-pop`. **Never hard-code a hex in a
component.**

- `.display` = tight tracking, 0.92 line-height, for headings.
- `.eyebrow` = uppercase label above a section.
- Motion 200–300 ms with `ease-pop`; the whole system stops under
  `prefers-reduced-motion` (one global block in `index.css`).
- The hero orbit is pure CSS transforms — a ring rotates, each portrait
  counter-rotates at the same rate. Radius and portrait size are fractions of a
  single `--stage` variable, so it scales from 360 px to 1440 px with no
  breakpoint. No per-frame JavaScript.
- Covers are drawn, not uploaded (`WorkCover`): a line motif per craft plus a
  deterministic mirror, carrying the headline metric. Uploads are optional and
  still render the metric on a scrim.

## 11. Invariants — break these and something regresses

1. **Grid items need `min-w-0`.** A no-wrap badge row widens the grid track and
   clips card content on narrow screens. Cards are `w-full min-w-0`; list items
   wrapping them are `flex min-w-0`.
2. **`<Avatar>` renders a `<span>`,** never a `<div>` — it appears inside `<p>`
   in places, and a div there is invalid HTML that React warns about.
3. **Keys must tolerate duplicates.** Links and stack entries can repeat, so key
   them by `${value}-${index}`, not by value.
4. **`PanelPage`'s portfolio section stays mounted across `/new → /:id`.** New
   entry state is reset by comparing the route target against the previous one
   during render. Remove that and "Add work" reopens the last draft.
5. **`Button` sets its own `display`.** Wrap it in a span to hide it
   responsively; `className="hidden sm:inline-flex"` on the button itself loses
   the specificity battle.
6. **Topic quota** (`TOPIC_QUOTA = 2`) counts *published* entries per topic and
   excludes the entry being edited, or re-publishing trips its own quota.
7. **Thumbnails must go through `lib/image.ts`** (960 px, JPEG q0.72). A raw
   camera JPEG will blow the ~5 MB localStorage budget.
8. All storage access goes through `lib/storage.ts`, which swallows private-mode
   and quota errors.
9. **In-page `<a href="#...">` anchors are a routing hazard.** The router reads
   `location.hash`, so a jump link inside a page route (`#topic-erp` on a
   profile) navigates away from that route entirely. Scroll imperatively with
   `scrollIntoView` instead; only the home page's anchors are safe, and only
   because they fall through to `HomePage` by design.
10. **House style: no em dashes in anything a reader sees.** Headlines,
    labels, buttons, body copy, seed prose, alt text. Use a spaced hyphen or
    restructure the sentence. `grep -r "\u2014" src` must return nothing.
11. **Eyebrows are rationed to roughly one per three sections.** The small
    uppercase label above a heading is what makes a page read as templated
    when every section carries one. `SectionHeading`'s `eyebrow` prop is
    optional for this reason.
12. **A pagination signature must cover every filter.** Leave one out and the
    list keeps its old offset when that filter changes. `Directory` derives its
    signature from the result set rather than from the filter props, because it
    is narrowed by facets it is never passed.
13. **A person's topics are derived, not just declared.** `Person.categories`
    holds industries only; `withDerivedTopics()` unions in the topics of their
    published work. Filter or count people without it and every practice topic
    reports zero people while showing case studies.

## 12. How this is verified

There is no test suite. Changes are verified by driving a real browser
(Playwright over the cached Chrome for Testing) and asserting:

- no console errors and no `pageerror` on every route;
- `document.scrollWidth === clientWidth` — no horizontal overflow — at
  360 / 390 / 768 / 1024 / 1440;
- the full flows still complete: register → panel → starter → publish → the
  entry appears on the home grid and the index.

`playwright-core` is installed temporarily for these runs and uninstalled
afterwards, which is why it is not in `package.json`. If you add a real test
suite, that is an improvement — keep the overflow and console-error assertions,
they have each caught a genuine bug.

## 13. What a real backend would change

- `useAccount` becomes an API client; the component contract does not change.
- `SEED_WORK` and `PEOPLE` become fetched collections; `Work` stays as is.
- Traffic becomes real events, and the disclosure copy in `TrafficPanel` comes
  out.
- Thumbnails move to object storage; `lib/image.ts` stays as a client-side
  pre-upload step.
- Topic quota moves server-side — it is currently trivially bypassable, which is
  acceptable for a prototype and is not a security control.
