# Changelog

Project history for whoareyou, written for an engineer or an AI agent picking
the repo up cold. It records **what changed and why the decision was made that
way** — the reasoning is the part that does not survive in a diff.

**How this relates to the other docs**

| Doc | Answers |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Where do I start? |
| [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) | What is the system, end to end? |
| [`docs/ENGINEERING.md`](docs/ENGINEERING.md) | How is it built, and what breaks if I touch it? |
| [`docs/BUSINESS.md`](docs/BUSINESS.md) | Why does it work this way? |
| **This file** | **How did it get here, and what has already been tried?** |

There is also a user-facing changelog at `#/changelog`
(`src/pages/ChangelogPage.tsx`). That one is written for readers of the product
and is deliberately shorter. **If you ship something user-visible, update both.**

Newest first.

---

## 24 September 2026 — react-router-dom, and a frontend doctrine from the dev

A dev (Rendy Dendimara) picked the project up, audited it, and landed a change
of their own: the hand-rolled `pushState` router is now `react-router-dom` v7,
and a new `docs/FRONTEND_RULES.md` sets an approved stack for everything that
comes after. Brought in here after building and driving it in a real browser —
the dev's own checkout had never been `npm install`ed.

### The router migration

`src/lib/router.ts` — `useRoute`, `navigate`, `interceptLinkClicks`,
`pageRootOf` — is gone. `src/routes.tsx` now holds one `createBrowserRouter`
tree, `src/context/BrowseContext.tsx` carries the filter/work/people/modal
state that used to live in `App.tsx`'s `Shell`, and every page reads it via
`useBrowse()` plus `useParams()` instead of receiving it as props. `App.tsx`
is six lines.

This is rule 1 changing for a stated reason, which is the bar the rule itself
sets. `react-router-dom` is the first runtime dependency beyond `react` and
`react-dom` the SPA has ever carried. What it buys: `<Link>`, `useNavigate()`,
`<ScrollRestoration>`, nested layouts and lazy route boundaries — all things
the hand-rolled router either didn't have or reimplemented by hand. What it
does not touch: the per-route `applyMeta()` call and the funnel `track()`
calls were not centralised casualties of the rewrite — they now live in each
page component, which is arguably where they belonged all along, and every
one of them still fires. Verified by walking every route in a real browser: no
console errors, no horizontal overflow at 360, and every page's title and
meta description update on client-side navigation, not just on a hard load.

### `docs/FRONTEND_RULES.md`

A stack doctrine for whatever gets built against the API next: Axios, TanStack
Query, Zustand, React Hook Form + Zod, react-hot-toast, shadcn/ui copied in
rather than installed. `CLAUDE.md` rule 1 now points here instead of stating
zero-dependencies outright — the rule became "stay on the approved list," not
"stay on nothing."

**None of this is wired up yet.** The five packages this doc names besides
`react-router-dom` are in `package.json` and nowhere else — no `src/api/`,
no `src/store/`, no `src/lib/api.ts`. Read the rules file before starting on
the API-wiring gap in `docs/PROJECT_CONTEXT.md` §12; it is now the intended
shape of that work, not a menu.

### A stale audit came along too

`docs/AUDIT.md`, dated 17 September, is the dev's read of the codebase before
they touched it. Two of its claims are wrong as of the day it was written —
it lists Content Moderation and the Admin Interface as entirely missing, and
both already existed by then. Kept as the dev's own document rather than
edited, but flagged here so nobody treats it as a current state of the world.

---

## 18 September 2026 — The API catches up with the SPA

The previous rounds built four things in the SPA that the API had no answer
for. Left alone, wiring the two together would have knocked all four out at
the moment of connection, and the failures would have looked like integration
bugs rather than missing features. So the API was brought to parity first.

### Notices and appeals — the gap that mattered most

The SPA told authors why a decision was taken about their work and let them
contest it. The API had **no trace of either**: `notice` and `appeal` did not
appear anywhere in `server/src`. A moderation flow running through the API
would have unpublished people's work and told them nothing.

`notices` is a new collection. It holds the same decisions the audit log
holds, read from the other end — addressed to the person, carrying the reason,
with the appeal embedded. Three things are deliberate:

1. **The notice is written in the same operation as the action.** Split into
   two calls, the half that would eventually go missing is always the notice,
   because nothing visibly breaks when an author is not told. Every moderation
   path now goes through `recordAndNotify` rather than `record`.
2. **An appeal is reviewed by somebody other than whoever decided it.**
   Enforced in the service and asserted in the smoke suite, because the UI is
   not the thing that has to hold. The SPA has no such check; that is now a
   thing the API fixes about the SPA rather than the reverse.
3. **Overturning actually reverses**, before the outcome is recorded — it
   republishes the entry or reinstates the person. An appeal marked upheld
   with nothing undone would be worse than having no appeal, because it would
   look like recourse.

### `languages`, and the experience and language filters

`UserDoc` had `years` but no `languages` at all, and neither `/api/work` nor
`/api/people` accepted an `experience` or `language` parameter. The SPA had
both filters. Connecting them would have left two controls that silently
returned everything.

Both are properties of a *person*, and every entry listing matches on the work
document alone — so both are carried on the author snapshot next to
`authorSuspended`, and `updateProfile` fans a change out. That fan-out is the
non-obvious part: a profile edit that skipped it would put someone in the
wrong experience band **on their own case studies**, with nothing erroring and
no way for them to notice.

They OR within themselves and AND across axes, like the rest of the filter bar.
`skills` stays the exception, AND-ed within itself, because "React and Go"
means somebody with both.

`npm run db:backfill` repairs a database seeded before these fields existed,
and is idempotent. The smoke suite strips the fields and runs it, because it is
the only script here that will ever be pointed at real data.

### The launch scope is now a query, not a display rule

`ROLE_STATUS` mirrors the SPA's `live`/`soon`. A craft that is not live is
withheld from every public read — listings, facets, detail pages, similar work,
the people directory — and may not be registered into or filed under. The rows
stay, with their ids, and come back the day it flips.

Applied inside `buildWorkMatch` and a shared `PUBLIC_PERSON` filter rather than
at each route, so a new route cannot forget it. Separate from
`siteSettings.disabledRoles`, which is a moderator turning a craft off in the
browse controls; these are two different questions and were kept two
mechanisms on purpose.

This changed what the smoke suite counts. The seed still writes every fixture
row, so the seed assertions count the files; everything public counts the live
subset. One assertion in the first draft of that work hard-coded Thai as a
sample language — and nobody in the launch scope speaks Thai, so it failed on
the fixtures rather than on the API. That is exactly the mistake the top of
that file already warns about. The sample language is now derived.

### Funnel counters

`POST /api/analytics/funnel` takes a batch of counters and returns 204.
`GET` is moderator-only. One document per day, `$inc` only, so concurrent
writers never race.

The schema is strict on both levels and the `$jsonSchema` validator sets
`additionalProperties: false`. That is the privacy guarantee rather than a
comment about one: the collection **could not** store a visitor id, a path or a
referrer even if a later client started sending them. It answers "do people
finish", which needs counters, not "did this person finish", which would need a
behavioural record.

### Mail, at last

`lib/mail.ts` with three transports selected by `MAIL_TRANSPORT`: `none`
(development — the token comes back in the response and says so), `log`, and
`http` (a JSON POST with a bearer key, Resend's body shape). No SMTP and no new
dependency: an HTTP API needs nothing but `fetch` and fails with a status code
instead of a socket timeout.

With a transport configured the verification token is **never** returned over
HTTP — handing it back would make the gate decorative, since anyone with a
session could verify an address they do not control. Production refuses to
start with `MAIL_TRANSPORT=none`, and the route refuses to answer as well,
because a config file is easier to get wrong than two checks are.

### Smaller things found on the way

- **No profile-photo endpoint existed** — only work thumbnails. The SPA's
  avatar picker had nowhere to POST to. Added, with the same fan-out, and it
  only deletes an image this route stored: a URL typed in by hand or seeded is
  somebody else's.
- `company` was settable at register (as "Independent") and then permanently
  unchangeable, while appearing on every card.
- `GET /api/taxonomy` returns crafts with their status, topics with their kind,
  models, experience bands, languages and the topic quota. The SPA keeps its
  own copy — rule 2 is not changing — and this is how the two get checked
  against each other instead of drifting.

### Where this leaves the two halves

The API can now answer everything the SPA does. What remains is a provisioned
database and the wiring, which is §12 of `docs/PROJECT_CONTEXT.md` and is the
same gap it was before — it is just no longer hiding four missing features
behind it.

Smoke suite: **73 → 125 assertions, all passing.**

---

## 17 September 2026 — Work templates and case-study motion

### Work templates (archetypes × craft)

Adding work used to ask two questions: format (guided or free-form) and craft.
The craft picked the evidence questions. That was right and incomplete — **a
role tells you the vocabulary, not the shape of the work**, and the shape
decides which questions are worth asking.

A designer's case study and their design system are both design, and almost
nothing they should be asked about overlaps. A system is judged on adoption
over years; a case study on a decision and a task-success number. Asking one
set for both produces a bad form for at least one.

Five archetypes now describe the shapes work comes in — `shipped`, `system`,
`craft`, `discovery`, `rescue`, `leadership` — and **every role gets exactly
four**. Four covers a real career; eight stops being help and becomes another
form. Every role gets a leadership and a system template, because those are
where senior work lives and they were worst served by a single per-role schema.

`shipped` reuses the existing per-role schemas unchanged. The other archetypes
bring their own base questions and a template layers craft vocabulary on top.
One resolver, `fieldsForTemplate(role, templateId)`, is called by the editor,
the readiness check and the mapper, so they cannot disagree.

The template step only appears once a craft is chosen, so the page never poses
two unanswered questions at once. Template can be switched in the editor
without losing typed values.

### Case-study motion

Staggered chapter entrance (320 ms, 60 ms apart, capped at four steps) and a
reading-progress bar driven by `scaleX`. Transform and opacity only, so it
stays on the compositor thread. **No GSAP** — the zero-runtime-dependency rule
stands; IntersectionObserver plus CSS covers it.

`useReveal` **defaults to revealed** and only hides once it knows an observer
exists. Content that needs JavaScript to become visible is a bug waiting for a
bad network.

Full writeup: [`docs/TEMPLATES_AND_MOTION.md`](docs/TEMPLATES_AND_MOTION.md).

---

## 16 September 2026 — Figures, slider, onboarding, and two layering bugs

### Figures in case studies

Images are **evidence, not decoration**, so alt text and a caption are required
fields and publish is blocked without them. Figures sit inside the chapter they
belong to rather than in a gallery, so an image lands next to the sentence it
supports.

**The author picks what to show; the page picks how.** Layout is derived from
the image's intrinsic dimensions, captured at upload so nothing reflows as
images arrive:

| Spec | Layout |
|---|---|
| ratio ≥ 1.6 | Wide, full column |
| ratio ≤ 0.8 | Narrow with the caption alongside |
| between | Inset and capped |
| two in one chapter | Side by side, because two is almost always a before/after |
| three or more | Grid |

A hundred case studies only stay comparable if layout is consistent, which is
why it is not an author preference.

### Slider

Opt-in per chapter; grid stays the default, because a slider hides everything
past slide one — right for a sequence, wrong for evidence meant to be compared.
Native CSS scroll-snap, so swipe, trackpad and keyboard all work and it
degrades to a plain scroller without JS. No autoplay, always-visible controls,
a live position counter.

### Onboarding

Targets the metric `docs/BUSINESS.md` names as make-or-break: **signup → first
published entry**, not "finish your profile".

- **Endowed progress** — signup counts as step one, already ticked. The list
  opens at 1 of 4, never zero.
- **Payoff, not task** — "without them you are unfindable" beats "add 3 skills".
- **One action at a time** — only the next unfinished step gets a button.
- **Live publish readiness** in the editor replaces publish-time failure. Same
  function the publish check runs, so the panel cannot promise something
  publish then refuses.
- **A worked example from the same craft**, collapsed, pulled from the real
  seeded entries. Deliberately *not* prefilled into the form: this product's
  value is that a person answered the questions, and a prefilled case study is
  someone else's words one click from publication.

Dismissible and restorable — a tour you cannot skip is the most complained
about onboarding pattern, and one you can skip but never recover is barely
better.

### Social links and profile

Six hand-drawn brand marks. Which platforms show depends on the craft, because
that is what a reviewer actually opens: GitHub for a developer, Dribbble for a
designer. Seeded hrefs point at `example.com` — pointing a fictional person at
a real `github.com/<handle>` would hang them off whatever real account holds
that name.

Profile pages gained a bio for all 40 people and a languages line.

---

## 15 September 2026 — Southeast Asia

Replaced the global fixture set with **40 people and 54 case studies, all
Southeast Asia**: Indonesia 18, Singapore 6, Vietnam 5, Malaysia 3, Thailand 3,
Philippines 3, Cambodia 1, Myanmar 1.

Companies are invented; the context is real. QRIS settlement and the warung
that cannot trade on T+2 money, Zawgyi versus Unicode producing undeliverable
addresses, ferry-timetabled freight routing across an archipelago, Ramadan
lifecycle sends landing during the busiest weeks of the year, Tết load at 9x,
Thai line-breaking shipping broken invoices, EUDR plot traceability, COD refusal
forecasting, BPJS referral pathways, typhoon-resilient dispatch.

Attaching fabricated metrics to real companies would be making up records about
real organisations, so the companies are fictional and the cities, regulators
and payment rails are not.

Validated automatically: every `authorId` resolves, the two-per-topic quota
holds, every role and topic has coverage, every person has work, everyone is in
Southeast Asia.

---

## 13 September 2026 — Filters, comboboxes, house style

Multi-value filters (OR within a facet, AND across). Practice became its own
control next to Industry while still sharing one field on an entry, so the
quota is untouched. Real listbox comboboxes with type-to-filter past six
options. Experience bands instead of an exact number. Language filter. Whole
portfolio card became the link. Em dashes removed as house style.

---

## 12 September 2026 — Profiles and practice topics

Profile pages, reachable from the directory, a card byline or a case study,
with work grouped by topic. Practice topics (Design Ops, Developer Experience,
Accessibility, Hiring & Teams, Reliability) alongside industries. 56 further
case studies concentrated on fewer people so a profile has enough to group.
About, Changelog and Privacy pages.

---

## 11 September 2026 — Related work, business model, and the API

### Case study detail

Two related sections: everything else by the same person, and comparable work
scored on three axes.

```
score = min(sharedSkills, 3) × 2   // language / skills
      + sharedTopics × 3
      + (sameBusinessModel ? 3 : 0)
      + (sameRole ? 1 : 0)
```

Skill overlap is **capped at three** because uncapped it swamps the other axes
and every result becomes "the same craft again" — the least useful thing to
show someone already reading that craft. Results de-duplicate by author, and
every match shows why it surfaced.

### Business model

A third axis, because craft plus topic cannot tell you whether two projects are
comparable: a payments feature for twelve on-prem bank tenants and one for two
million consumers share both and almost nothing else.

### Backend

Express and MongoDB API covering auth, directory, work CRUD, publish, traffic
and thumbnail uploads. Native driver, not Mongoose, so the queries in
`docs/DATABASE.md` are literally what runs. `node:crypto` scrypt rather than
argon2 to avoid a native build step. GridFS rather than S3 for one dependency
instead of two. Refresh tokens are opaque and rotate on use; only their SHA-256
is stored.

**The quota is a guarded atomic update** — the filter refuses to match if any
target topic is already at the cap, making check-and-increment one operation.
A count-then-write would let two concurrent publishes both pass.

47-assertion smoke test against an ephemeral replica set.

---

## 10 September 2026 — The product

Front-end-only SPA: revolving-portrait hero, craft grid, browse-by-portfolio,
people directory, join flow, authoring panel with role-specific evidence forms,
portfolio index, traffic panel, two-per-topic quota, thumbnails, skills.

Foundational decisions made here and still load-bearing:

- **Zero runtime dependencies beyond React.** Icons, router, dialog, focus
  trap and image downscaling are hand-rolled.
- **Covers are generated, never required.** Much real work is under NDA or
  unreadable at card size; an entry must not be penalised for having no
  screenshot, and nobody should win the grid with a prettier mockup.
- **Proof points are "Results claimed", never verified facts.**
- **Simulated data is labelled.** The local traffic history is generated and
  the panel says so.
- **Two published entries per topic, per person.** Forces people to lead with
  their best two and keeps a topic page readable.

---

## Bugs found, and the invariants they became

Each of these shipped, was caught by browser verification, and is now recorded
in [`docs/ENGINEERING.md`](docs/ENGINEERING.md) §11. **Read that list before
touching cards, grids, popovers, the panel router or the quota.**

| Bug | Cause | Invariant |
|---|---|---|
| Talent cards clipped on mobile | Grid item widened by a no-wrap badge row | Grid items need `min-w-0` |
| Slider scrolled the whole page sideways | `.sr-only` is `position: absolute`; with no positioned ancestor its containing block is the page, so inside a horizontal scroller it landed off-screen and widened the document | An `.sr-only` span needs a positioned ancestor inside any overflow container |
| Combobox list appeared hundreds of pixels off inside the modal | `animation-fill-mode: both` leaves `transform: scale(1)` on the panel forever, and any non-`none` transform makes that element the containing block for `position: fixed` descendants | A fixed popover must be portalled out of the React tree |
| Escape closed the whole dialog from inside a dropdown | `Modal` listens on `document` | Escape must be scoped to the topmost layer |
| Combobox unusable inside the modal (blocked registration entirely) | It closed on *any* ancestor scroll; opening moved focus, focus scrolled the container, that scroll closed it in the same tick | Reposition on ancestor scroll, never dismiss |
| "Add work" reopened the previous draft | `PanelPage`'s portfolio section stays mounted across `/new → /:id` | Reset new-entry state by comparing the route target during render |
| API returned 429 for everything | `limit: 0` does not disable `express-rate-limit` v7, it blocks everything | Use `skip` |
| Duplicate React keys | Links and stack entries can repeat | Key by `${value}-${index}` |
| `<div>` inside `<p>` | `Avatar` rendered a div | `Avatar` renders a `<span>` |

---

## How changes are verified

No test suite on the SPA. Every change is driven through a real browser
(Playwright over the cached Chrome for Testing, installed temporarily and
removed after, which is why it is not in `package.json`) asserting:

- no console errors and no `pageerror` on every route
- `document.scrollWidth === clientWidth` at 360 / 390 / 768 / 1024 / 1440
- register → panel → publish → appears on home still completes

Those three have each caught a real bug. Keep them if you add a test suite.

API: `cd server && npm run test:smoke`.

---

## Not done

- **The SPA still reads `localStorage`, not the API.** `useAccount` is the
  seam; its contract already matches the API's shape, so swapping the bodies
  for fetch calls needs no component changes. See `docs/PROJECT_CONTEXT.md` §12.
- Email verification and password reset — no mail transport is wired up.
- Rate limits are in-process; behind more than one instance they need Redis.
- Seeded portraits come from `randomuser.me` and are predominantly European,
  which reads wrong on a Southeast Asian directory. Options are to leave it or
  drop `photo` and use the pop-tinted monogram fallback.
