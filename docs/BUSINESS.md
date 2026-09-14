# Business context — whoareyou

Written for an AI agent or collaborator who needs to make product decisions in
this repo without re-deriving the thesis. It explains what the product is for,
which rules are load-bearing, and which things are deliberately not built.

---

## 1. The problem

Hiring in tech is decided on evidence that mostly does not exist in a portable
form.

- **A CV** compresses three years into six bullet points and a job title. The
  title is an artefact of one company's levelling, not a description of what
  the person can do.
- **LinkedIn** optimises for network and keywords, so everyone converges on the
  same vocabulary and nothing distinguishes them.
- **Dribbble and Behance** show what work *looked like*. A reviewer cannot tell
  whether the screen shipped, what it changed, or whether the designer chose
  anything at all.
- **GitHub** is real evidence but only for one craft, and only for public code.

Meanwhile the person doing the reviewing wants three facts within ten seconds:
what was the problem, what did this person decide, and what changed. Almost no
portfolio surface makes those three facts easy to state, so people fall back on
prose that hides them.

## 2. The thesis

**A portfolio should be segmented by craft and evidenced by outcome, and the
product should make it hard to publish anything else.**

Two consequences run through the whole build:

1. **The form is the product.** What you ask determines what you get. Asking a
   developer for p95 and a repo, and a researcher for who they interviewed and
   what the team decided afterwards, produces different and better entries than
   one generic "description" box. The forms are generated per craft for exactly
   this reason.
2. **Nobody wins on presentation.** Covers are generated from the craft and the
   headline number, not uploaded. Uploads are allowed but still carry the metric
   on top. A prettier mockup must not out-rank a better result.

## 3. Who it is for

**Supply — people who build technology.** Designers, engineers, product, data,
platform, QA, growth, research. They have done substantial work they cannot
show: it is internal, under NDA, or it is a 40-column table that looks like
nothing in a screenshot. The promise is: *get found for what you actually did,
including the work you cannot screenshot.*

**Demand — people who hire or commission them.** Hiring managers, founders,
agency leads. They are scanning, not browsing. The promise is: *filter to the
craft and the world you need, and read the outcome before the prose.*

The directory is the shared surface. It is one-sided today (there is no
messaging, shortlisting or job posting) and that is deliberate — see §8.

## 4. What makes it different

| | Dribbble / Behance | LinkedIn | whoareyou |
|---|---|---|---|
| Unit | A picture | A job title | A piece of work with a result |
| Ranks on | Visual appeal | Network | Evidence |
| Craft coverage | Design | All, shallowly | Eight crafts, each with its own evidence model |
| Confidential work | Invisible | A bullet point | First-class — generated covers, no screenshot required |

The sentence that captures it: **"like Dribbble, but the thing you are looking
at is the real work, not a picture of it."**

## 5. The taxonomy — three axes, on purpose

- **Craft** (role) — what the person does. Eight values. Per *entry*, not per
  person: a designer who shipped a routing engine files it as developer work.
- **Topic** (industry / track) — where it shipped. SaaS, AI, Leadership,
  Banking, Finance, ERP, Gas & Oil, Transportation, plus Health Tech, Gaming,
  Climate, Cybersecurity behind "See more".
- **Business model** — how the thing made money. B2B SaaS, Consumer,
  Marketplace, Enterprise/on-prem, Internal platform, E-commerce, Agency, Open
  source, Deep tech, Public sector.

The third axis exists because craft + topic is not enough to tell whether two
projects are comparable. A payments feature for twelve on-prem bank tenants and
a payments feature for two million consumers share a craft and a topic and
almost nothing else. Business model is what separates them, which is why it is
weighted equally with topic in the similarity score.

**Skills** sit underneath as a refinement rather than a fourth primary filter.
They are free text with per-craft suggestions: the suggestions exist to keep
strings consistent so the filter can group on them.

## 6. Product rules that are load-bearing

These look like constraints and are actually the value proposition. Do not
relax them without replacing the thing they protect.

**Two published entries per topic, per person.** Forces people to lead with
their best two rather than dumping twelve. It keeps a topic page readable for
the reviewer, and it makes the directory's density a feature instead of a
problem. Drafts are unlimited; unpublishing frees a slot. The cap is visible in
the topic chips as `1/2` so nobody writes a third case study before finding out.

**Every entry states problem, decisions, outcome.** Required in the guided
template. Free-form entries can use their own headings but still have to supply
result rows. "It never shipped" is an acceptable outcome — the seeded data
includes cancelled projects, wrong models and accepted cost increases, because
a portfolio where everything succeeded is not credible.

**Proof points are labelled claims, not verified facts.** The case-study panel
is headed "Results claimed". We are not in a position to verify a number, and
pretending otherwise would be the single most damaging thing this product could
do. Verification is a plausible future feature; overstating it today is not.

**Generated covers by default.** Protects confidential work from being
second-class, and stops the grid becoming a visual-design competition for
people who are not visual designers.

**Traffic history is disclosed as generated.** The prototype has no server, so
the 30-day history is simulated and the panel says so. The one screen whose
entire job is to be factual must not be the one that lies.

## 7. What success looks like

Leading indicators, roughly in the order they would matter:

1. **Completion rate of a first entry** — do people finish the form, or does
   the evidence requirement scare them off? This is the core tension in the
   product: the forms are demanding on purpose, and too demanding kills supply.
2. **Entries per active person** (target: 2–4, capped by topic quota).
3. **Proof-point fill rate** — what share of published entries carry a real
   number. If this drops, the differentiator is gone.
4. **Portfolio opens per profile view** — does the evidence-first card actually
   earn a click?
5. **Demand-side return rate** — do reviewers come back and filter again?

Vanity metrics to avoid optimising: total profiles, total entries, page views.
A directory of thin profiles is worth less than a small directory of
substantial ones, and the topic quota is a bet on exactly that.

## 8. Deliberately not built

- **Messaging, shortlists, job posts, applications.** A two-sided hiring flow is
  a different product with different obligations. The bet is that the directory
  has to be worth reading before any of that is worth building.
- **Likes, follows, feeds.** Popularity ranking would reintroduce exactly the
  dynamic the product exists to avoid.
- **Verification badges.** Attractive and hard. Doing it badly is worse than not
  doing it, hence "Results claimed".
- **AI-written case studies.** The form's value is that the person had to
  answer the questions. Generating the answers destroys the signal.
- **Payments and tiers.** Monetisation hypotheses below are unvalidated and
  nothing is priced.

## 9. Monetisation hypotheses (unvalidated)

1. **Demand-side subscription** — free to be listed, paid to search, shortlist
   and contact. Standard directory economics; keeps supply frictionless.
2. **Team pages** — companies publish their own work and hire from the same
   surface. Aligns with the product because it is more evidence, not more ads.
3. **Talent-collective / agency layer** — curated pools by craft and topic,
   commission on placement. Highest revenue per transaction, highest operational
   cost, and the largest risk to the neutrality of the directory.

Option 1 is the default. Option 3 is worth naming because it would change what
the product is, and that should be a deliberate decision rather than a drift.

## 10. Open questions

- Does the topic quota help or frustrate power users with a genuinely broad
  body of work? It is currently a flat 2 with no appeal path.
- Is "business model" a vocabulary real users share, or an internal convenience?
  It is the newest axis and the least validated.
- Where is the honest line on verification — self-reported, reference-backed, or
  employer-confirmed — and what does each cost?
- Do the guided templates raise quality enough to justify the completion cost,
  or does the free-form escape hatch quietly become the default?
