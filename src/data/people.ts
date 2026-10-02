import { linksFor, type PersonLink } from "./platforms"
import type { CategoryId, RoleId } from "./taxonomy"

export interface Person {
  id: string
  name: string
  title: string
  company: string
  role: RoleId
  categories: CategoryId[]
  location: string
  skills: string[]
  years: number
  /** Open to new work - drives the availability dot on the card. */
  open: boolean
  photo: string
  /** Working languages. Seeded from the country in `location`; see LANGUAGES. */
  languages: string[]
  /** Where else this person can be found. Seeded from the craft; see linksFor. */
  links: PersonLink[]
  /** One or two sentences in their own voice. Empty until someone writes one. */
  bio: string
}

/**
 * Tuple source instead of 48 hand-written object literals: the shape is
 * enforced once, the data stays scannable, and adding a row is one line.
 */
type Row = [
  name: string,
  title: string,
  company: string,
  role: RoleId,
  categories: CategoryId[],
  location: string,
  skills: string[],
  years: number,
  open: boolean,
  portrait: string,
]

const ROWS: Row[] = [
  // ── SaaS & commerce tooling ─────────────────────────────────────────
  [
    "Rangga Mahendra",
    "Staff Backend Engineer",
    "Warungku",
    "engineering",
    ["saas"],
    "Jakarta, ID",
    ["Go", "Postgres", "Distributed systems", "Performance"],
    9,
    false,
    "men/12",
  ],
  [
    "Ayu Pramesti",
    "Senior Product Designer",
    "Warungku",
    "design",
    ["saas", "accessibility"],
    "Jakarta, ID",
    ["Design systems", "Accessibility", "Usability testing"],
    7,
    true,
    "women/14",
  ],
  [
    "Tan Wei Sheng",
    "Group Product Manager",
    "Rantai",
    "product",
    ["erp", "leadership"],
    "Singapore, SG",
    ["Product strategy", "Roadmapping", "Stakeholder management"],
    12,
    true,
    "men/19",
  ],
  [
    "Nurul Aisyah",
    "Lifecycle Marketing Lead",
    "Warungku",
    "growth",
    ["saas"],
    "Bandung, ID",
    ["Lifecycle marketing", "Retention", "Analytics"],
    8,
    true,
    "women/21",
  ],
  [
    "Somchai Wattana",
    "QA Automation Lead",
    "Siam Ledger",
    "quality",
    ["saas", "reliability"],
    "Bangkok, TH",
    ["Playwright", "Test strategy", "CI/CD"],
    10,
    false,
    "men/26",
  ],
  [
    "Chayada Srisuk",
    "Senior UX Researcher",
    "Siam Ledger",
    "research",
    ["saas", "finance"],
    "Bangkok, TH",
    ["Contextual inquiry", "Usability testing", "Synthesis"],
    8,
    true,
    "women/28",
  ],

  // ── Payments, banking & lending ─────────────────────────────────────
  [
    "Bagus Nugraha",
    "Principal Engineer, Payments",
    "Pintar Bayar",
    "engineering",
    ["finance", "banking"],
    "Jakarta, ID",
    ["Java", "Kafka", "Distributed systems", "API design"],
    13,
    false,
    "men/33",
  ],
  [
    "Siti Rahmawati",
    "Product Designer, Payments",
    "Pintar Bayar",
    "design",
    ["finance"],
    "Jakarta, ID",
    ["Interaction design", "Usability testing", "Accessibility"],
    6,
    true,
    "women/35",
  ],
  [
    "Nguyen Thi Mai Anh",
    "Staff Engineer, Core Rails",
    "Saigon Rails",
    "engineering",
    ["finance"],
    "Ho Chi Minh City, VN",
    ["Go", "Postgres", "Event sourcing", "Performance"],
    10,
    true,
    "women/40",
  ],
  [
    "Tran Quoc Bao",
    "Site Reliability Engineer",
    "Saigon Rails",
    "infra",
    ["finance", "reliability"],
    "Ho Chi Minh City, VN",
    ["Kubernetes", "Observability", "Incident response", "SRE"],
    8,
    true,
    "men/41",
  ],
  [
    "Lim Mei Ling",
    "Head of Risk Data",
    "Bank Sahabat",
    "data",
    ["banking", "leadership"],
    "Jakarta, ID",
    ["SQL", "Forecasting", "Causal inference", "Experiment design"],
    14,
    false,
    "women/44",
  ],
  [
    "Ahmad Faizal Hamzah",
    "Engineering Manager",
    "Selat Pay",
    "engineering",
    ["banking", "leadership"],
    "Kuala Lumpur, MY",
    ["Java", "API design", "Distributed systems"],
    12,
    true,
    "men/47",
  ],
  [
    "Priya Naidu",
    "Compliance Product Manager",
    "Selat Pay",
    "product",
    ["banking"],
    "Kuala Lumpur, MY",
    ["Stakeholder management", "Discovery", "Roadmapping"],
    9,
    false,
    "women/49",
  ],
  [
    "Sok Dara",
    "Mobile Engineer",
    "Angkor Pay",
    "engineering",
    ["finance"],
    "Phnom Penh, KH",
    ["React Native", "Performance", "API design"],
    6,
    true,
    "men/51",
  ],
  [
    "Ratna Kusumawati",
    "Credit Data Scientist",
    "Padi Finance",
    "data",
    ["finance"],
    "Yogyakarta, ID",
    ["Python", "SQL", "Forecasting", "Evaluation"],
    7,
    true,
    "women/54",
  ],

  // ── Mobility & logistics ────────────────────────────────────────────
  [
    "Yoga Prasetyo",
    "Principal Engineer, Routing",
    "Jangkar Logistik",
    "engineering",
    ["mobility"],
    "Surabaya, ID",
    ["Go", "Distributed systems", "Performance", "API design"],
    11,
    false,
    "men/56",
  ],
  [
    "Dewi Larasati",
    "Product Designer, Driver",
    "Jangkar Logistik",
    "design",
    ["mobility", "accessibility"],
    "Surabaya, ID",
    ["Interaction design", "Usability testing", "Motion"],
    6,
    true,
    "women/58",
  ],
  [
    "Le Van Hung",
    "Operations Data Lead",
    "Mekong Freight",
    "data",
    ["mobility"],
    "Can Tho, VN",
    ["SQL", "Forecasting", "Analytics", "dbt"],
    9,
    true,
    "men/61",
  ],
  [
    "Maria Consuelo Reyes",
    "Chief Product Officer",
    "Kalesa",
    "product",
    ["mobility", "leadership"],
    "Manila, PH",
    ["Zero-to-one", "Marketplaces", "Product strategy"],
    15,
    true,
    "women/63",
  ],
  [
    "Jomar Dela Cruz",
    "Android Engineer",
    "Kalesa",
    "engineering",
    ["mobility"],
    "Cebu, PH",
    ["React Native", "Performance", "Offline sync"],
    7,
    true,
    "men/65",
  ],
  [
    "Aung Kyaw Moe",
    "QA Engineer, Marketplace",
    "Yangon Commerce",
    "quality",
    ["mobility"],
    "Yangon, MM",
    ["Exploratory testing", "Test strategy", "Playwright"],
    5,
    true,
    "men/68",
  ],

  // ── AI ──────────────────────────────────────────────────────────────
  [
    "Kwok Jia Hui",
    "ML Research Engineer",
    "Tanya AI",
    "data",
    ["ai"],
    "Singapore, SG",
    ["PyTorch", "Evaluation", "Python", "MLOps"],
    8,
    true,
    "women/70",
  ],
  [
    "Farhan Maulana",
    "Backend Engineer, Inference",
    "Tanya AI",
    "engineering",
    ["ai"],
    "Jakarta, ID",
    ["Rust", "Performance", "Distributed systems"],
    6,
    false,
    "men/72",
  ],
  [
    "Intan Permatasari",
    "AI Product Designer",
    "Tanya AI",
    "design",
    ["ai"],
    "Jakarta, ID",
    ["Conversational design", "Prototyping", "Usability testing"],
    5,
    true,
    "women/74",
  ],
  [
    "Rajendran Kumar",
    "AI Research Lead",
    "Tanya AI",
    "research",
    ["ai", "leadership"],
    "Singapore, SG",
    ["Evaluation", "Survey design", "Synthesis"],
    13,
    false,
    "men/76",
  ],

  // ── Health tech ─────────────────────────────────────────────────────
  [
    "Putu Ariani",
    "Clinical Product Manager",
    "Klinika",
    "product",
    ["healthtech"],
    "Denpasar, ID",
    ["Discovery", "Stakeholder management", "Service design"],
    9,
    true,
    "women/78",
  ],
  [
    "Rizki Ramadhan",
    "Full-stack Engineer",
    "Klinika",
    "engineering",
    ["healthtech"],
    "Bandung, ID",
    ["TypeScript", "Postgres", "API design"],
    6,
    true,
    "men/80",
  ],
  [
    "Nadia Roslan",
    "Accessibility Designer",
    "Teratai Health",
    "design",
    ["healthtech", "accessibility"],
    "Kuala Lumpur, MY",
    ["Accessibility", "Design systems", "Usability testing"],
    8,
    true,
    "women/82",
  ],
  [
    "Jose Antonio Villanueva",
    "Health Data Engineer",
    "Barangay Health",
    "data",
    ["healthtech"],
    "Manila, PH",
    ["Python", "Airflow", "SQL", "dbt"],
    7,
    false,
    "men/84",
  ],

  // ── Energy & climate ────────────────────────────────────────────────
  [
    "Hendra Simanjuntak",
    "Industrial Data Scientist",
    "Sawit Analytics",
    "data",
    ["energy", "climate"],
    "Medan, ID",
    ["Python", "Forecasting", "Spark", "Evaluation"],
    11,
    false,
    "men/86",
  ],
  [
    "Wayan Sukerta",
    "Field Systems Designer",
    "Ombak Bahari",
    "design",
    ["climate"],
    "Denpasar, ID",
    ["Service design", "Contextual inquiry", "Data visualisation"],
    7,
    true,
    "men/88",
  ],
  [
    "Ni Luh Gede Savitri",
    "Marine Research Lead",
    "Ombak Bahari",
    "research",
    ["climate"],
    "Denpasar, ID",
    ["Ethnography", "Contextual inquiry", "Synthesis"],
    6,
    true,
    "women/90",
  ],

  // ── Platform, reliability, developer experience & security ──────────
  [
    "Adi Kurniawan",
    "Platform Engineer",
    "Nusantara Cloud",
    "infra",
    ["saas", "devex"],
    "Jakarta, ID",
    ["Kubernetes", "Terraform", "Platform engineering", "Observability"],
    9,
    true,
    "men/92",
  ],
  [
    "Chen Yu Xuan",
    "Staff Site Reliability Engineer",
    "Nusantara Cloud",
    "infra",
    ["reliability", "saas"],
    "Singapore, SG",
    ["SRE", "Observability", "Incident response", "Cost optimisation"],
    12,
    false,
    "men/94",
  ],
  [
    "Sharifah Nadhirah",
    "Application Security Engineer",
    "Bakau Security",
    "infra",
    ["security"],
    "Singapore, SG",
    ["Security", "CI/CD", "Python"],
    8,
    true,
    "women/96",
  ],
  [
    "Pham Minh Tuan",
    "Developer Experience Lead",
    "Titian",
    "engineering",
    ["devex", "leadership"],
    "Hanoi, VN",
    ["TypeScript", "CI/CD", "API design", "Platform engineering"],
    11,
    true,
    "men/98",
  ],

  // ── Gaming, hiring & growth ─────────────────────────────────────────
  [
    "Galih Wicaksono",
    "QA Lead, Live Services",
    "Gunung Games",
    "quality",
    ["gaming", "reliability"],
    "Bandung, ID",
    ["Test strategy", "Automation architecture", "Performance testing"],
    8,
    false,
    "men/5",
  ],
  [
    "Kanya Phuwanat",
    "Live Ops Analyst",
    "Gunung Games",
    "growth",
    ["gaming"],
    "Chiang Mai, TH",
    ["Analytics", "Experimentation", "Retention"],
    5,
    true,
    "women/7",
  ],
  [
    "Farah Zulkifli",
    "Head of Talent",
    "Sirkel",
    "product",
    ["hiring", "leadership"],
    "Singapore, SG",
    ["Hiring", "Stakeholder management", "Discovery"],
    13,
    true,
    "women/16",
  ],
  [
    "Do Thi Kim Ngan",
    "Growth Lead",
    "Mekong Freight",
    "growth",
    ["mobility"],
    "Ho Chi Minh City, VN",
    ["Paid acquisition", "Attribution", "Experimentation", "Onboarding"],
    8,
    true,
    "women/23",
  ],
]

/**
 * Working languages per country, for the seeded directory.
 *
 * Derived from the country code already in `location` rather than typed into
 * all 40 rows: the tuple source stays scannable, and the values cannot drift
 * out of sync with where a person actually is. A real signup would state their
 * own languages; this is fixture data and behaves like fixture data.
 *
 * English is on every row because this is a directory of people who work in
 * tech internationally. That makes the English filter near-useless and every
 * other language genuinely useful, which is the honest trade.
 */
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  BN: ["Malay"],
  ID: ["Bahasa Indonesia"],
  KH: ["Khmer"],
  LA: ["Lao"],
  MM: ["Burmese"],
  MY: ["Malay", "Mandarin", "Tamil"],
  PH: ["Filipino"],
  SG: ["Mandarin", "Malay", "Tamil"],
  TH: ["Thai"],
  VN: ["Vietnamese"],
}

/** Every language present in the directory, alphabetical, for the filter. */
export const LANGUAGES: string[] = ["English", ...new Set(Object.values(COUNTRY_LANGUAGES).flat())]
  .filter((value, index, all) => all.indexOf(value) === index)
  .sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)))

export function languagesFor(location: string): string[] {
  const country = location.slice(-2).toUpperCase()
  return ["English", ...(COUNTRY_LANGUAGES[country] ?? [])]
}

/** Letters NFD cannot decompose still need a Latin equivalent, or ids rot. */
const TRANSLITERATIONS: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ß: "ss",
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[øæœłđðþß]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/**
 * Bios, keyed by slug rather than added to the tuple.
 *
 * A sentence of prose in a positional tuple is unreadable and unreviewable,
 * and this is the one field where the wording matters more than the shape.
 * A missing key is a person with no bio, which the profile page handles.
 */
const BIOS: Record<string, string> = {
  "rangga-mahendra":
    "Backend engineer who has spent most of a decade on systems that have to work when the network does not. Currently on sync and conflict resolution for 61,000 warung.",
  "ayu-pramesti":
    "Product designer working on interfaces for sellers who are serving a customer with one hand. Most of what she knows came from testing in warung rather than in a lab.",
  "tan-wei-sheng":
    "Product lead for enterprise systems across six Southeast Asian tax regimes. Spends more time on jurisdiction rules than he expected to when he started.",
  "nurul-aisyah":
    "Lifecycle marketer who measures with holdouts and is comfortable arguing for sending less. Learned that the hard way across three Ramadans.",
  "somchai-wattana":
    "QA lead who got interested in internationalisation after Thai line-breaking shipped broken invoices to two enterprise accounts.",
  "chayada-srisuk":
    "Researcher working with Thai SMEs. Best known internally for the study that cancelled a funded education programme.",
  "bagus-nugraha":
    "Principal engineer on payment settlement. Thirteen years of ledgers, most of them spent making float positions visible rather than clever.",
  "siti-rahmawati":
    "Designs the moments where people hesitate before sending money to a stranger. Believes risk should be stated, not softened.",
  "nguyen-thi-mai-anh":
    "Staff engineer on transfer rails. Will trade latency for correctness every time and can show you the backfill that explains why.",
  "tran-quoc-bao":
    "SRE who treats Tết as an annual exam. Prefers pre-scaling and load shedding to heroics.",
  "lim-mei-ling":
    "Leads risk data at a digital bank. Works on credit for people a bureau cannot see, and insists on a fairness review before launch.",
  "ahmad-faizal-hamzah":
    "Engineering manager on cross-border payments. Eleven engineers, two regulators, one corridor at a time.",
  "priya-naidu":
    "Compliance product manager who renamed a metric and found a broken control underneath it.",
  "sok-dara":
    "Mobile engineer building a wallet for 1GB Android Go phones. Tests on real hardware every sprint, which is less common than it should be.",
  "ratna-kusumawati":
    "Credit data scientist working on agri lending. Builds products that admit when the harvest forecast is wrong.",
  "yoga-prasetyo":
    "Principal engineer on freight routing across an archipelago, where the road is sometimes a ferry with a timetable.",
  "dewi-larasati":
    "Designs for someone on a motorcycle in the rain wearing gloves. Rode along for two weeks before drawing anything.",
  "le-van-hung":
    "Operations data lead in the Mekong Delta, working on the economics of cash on delivery.",
  "maria-consuelo-reyes":
    "Chief product officer who has stood up a mobility marketplace in a city where two platforms had already burned the supply side.",
  "jomar-dela-cruz":
    "Android engineer building dispatch that keeps working when the cell towers are down. Has field-tested that through two typhoons.",
  "aung-kyaw-moe":
    "QA engineer who found that half of Myanmar types Zawgyi and half types Unicode, and that the test suite could see neither.",
  "kwok-jia-hui":
    "ML research engineer on Southeast Asian language evaluation. Reports per-language, because the aggregate is where the failures hide.",
  "farhan-maulana":
    "Backend engineer on inference serving, working on why the tokenizer makes Indonesian cost three times as much as English.",
  "intan-permatasari":
    "AI product designer working on formality registers, where getting a pronoun wrong in Javanese is not a small mistake.",
  "rajendran-kumar":
    "Research lead who published a Southeast Asian language benchmark that put his own team third.",
  "putu-ariani":
    "Clinical product manager on BPJS referral pathways. Thinks about the ferry ticket a wrong referral costs a family.",
  "rizki-ramadhan":
    "Full-stack engineer making telehealth work at 64kbps, because video-first excluded the patients who needed it most.",
  "nadia-roslan":
    "Accessibility designer on health insurance claims in three languages and two scripts, for a user base whose eyesight is not what it was.",
  "jose-antonio-villanueva":
    "Health data engineer running dengue surveillance over SMS, because a feature phone is the one thing every barangay station has.",
  "hendra-simanjuntak":
    "Industrial data scientist on plantation traceability. Grades confidence rather than issuing a binary compliant flag.",
  "wayan-sukerta":
    "Field systems designer who learned that the best interface for a fishing boat was the one that stayed off the boat.",
  "ni-luh-gede-savitri":
    "Marine researcher across six coastal villages. Spent four months negotiating data terms with village councils and would do it again.",
  "adi-kurniawan":
    "Platform engineer on data residency across three jurisdictions, without three copies of everything.",
  "chen-yu-xuan":
    "Staff SRE who found $380k a year in cross-region traffic and deleted 140 of 190 alerts.",
  "sharifah-nadhirah":
    "Application security engineer. Spent six months making an inventory accurate before writing a single blocking policy.",
  "pham-minh-tuan":
    "Developer experience lead for a team spread across five countries. Made CI run the setup script so it cannot rot quietly.",
  "galih-wicaksono":
    "QA lead for live services, testing on the evening-peak mobile networks players actually have rather than on office fibre.",
  "kanya-phuwanat":
    "Live ops analyst who argued the team out of harder paywalls by changing the denominator from 30-day ARPU to two-year LTV.",
  "farah-zulkifli":
    "Head of talent who published salary bands across six countries and closed the gap upward.",
  "do-thi-kim-ngan":
    "Growth lead who rebuilt acquisition around Zalo after discovering the regional playbook assumed the wrong country.",
}

export const PEOPLE: Person[] = ROWS.map(
  ([name, title, company, role, categories, location, skills, years, open, portrait]) => ({
    id: slugify(name),
    name,
    title,
    company,
    role,
    categories,
    location,
    skills,
    years,
    open,
    // Consistently framed stock headshots; the Avatar falls back to a
    // tinted monogram when the network is unavailable.
    photo: `https://randomuser.me/api/portraits/${portrait}.jpg`,
    languages: languagesFor(location),
    links: linksFor(role, slugify(name)),
    bio: BIOS[slugify(name)] ?? "",
  }),
)

export const TOTAL_PEOPLE = PEOPLE.length
