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
  // ── SaaS ────────────────────────────────────────────────────────────
  ["Rani Ardhana", "Senior Product Designer", "Notionary", "design", ["saas"], "Jakarta, ID", ["Design systems", "Figma", "Prototyping"], 7, true, "women/11"],
  ["Elias Kovač", "Staff Frontend Engineer", "Loopbase", "engineering", ["saas"], "Berlin, DE", ["React", "TypeScript", "Performance"], 9, false, "men/3"],
  ["Maya Tanuwijaya", "Group Product Manager", "Stackline", "product", ["saas", "leadership"], "Singapore, SG", ["PLG", "Pricing", "Roadmapping"], 11, true, "women/18"],
  ["Tobi Adeyemi", "Platform Engineer", "Rundeck Cloud", "infra", ["saas"], "Lagos, NG", ["Kubernetes", "Terraform", "Go"], 6, true, "men/10"],
  ["Hana Sugiarto", "Lifecycle Marketing Lead", "Fieldnote", "growth", ["saas"], "Bandung, ID", ["Retention", "SQL", "Email"], 8, false, "women/25"],
  ["Dmitri Volkov", "QA Automation Engineer", "Loopbase", "quality", ["saas"], "Tbilisi, GE", ["Playwright", "CI/CD", "Load testing"], 5, true, "men/17"],

  // ── AI ──────────────────────────────────────────────────────────────
  ["Priya Raghunathan", "ML Research Engineer", "Verity Labs", "data", ["ai"], "Bengaluru, IN", ["PyTorch", "Evals", "RAG"], 8, true, "women/32"],
  ["Noah Lindqvist", "AI Product Designer", "Verity Labs", "design", ["ai"], "Stockholm, SE", ["Conversational UI", "Prompt design"], 5, true, "men/24"],
  ["Sasha Meier", "Head of Applied AI", "Northsight", "product", ["ai", "leadership"], "Zurich, CH", ["Model strategy", "Team building"], 13, false, "women/39"],
  ["Kenji Watanabe", "MLOps Engineer", "Tensorfield", "infra", ["ai"], "Tokyo, JP", ["Ray", "Feature stores", "GPU scheduling"], 7, true, "men/31"],
  ["Amara Diallo", "AI Safety Researcher", "Northsight", "research", ["ai"], "Paris, FR", ["Red-teaming", "Alignment", "Policy"], 6, true, "women/46"],
  ["Bima Prakoso", "Backend Engineer, Inference", "Tensorfield", "engineering", ["ai"], "Yogyakarta, ID", ["Rust", "gRPC", "Vector DB"], 6, false, "men/38"],

  // ── Leadership ──────────────────────────────────────────────────────
  ["Clara Whitfield", "VP of Engineering", "Meridian Pay", "engineering", ["leadership", "banking"], "London, UK", ["Org design", "Hiring", "Architecture"], 16, false, "women/53"],
  ["Yusuf Rahman", "Chief Product Officer", "Kargo Nusantara", "product", ["leadership", "mobility"], "Jakarta, ID", ["Zero-to-one", "Marketplaces"], 15, true, "men/45"],
  ["Ingrid Salvesen", "Head of Design", "Fjordline Energy", "design", ["leadership", "energy"], "Oslo, NO", ["Design ops", "Brand", "Mentoring"], 14, false, "women/60"],
  ["Marcus Bell", "Director of Data", "Ledgerworks", "data", ["leadership", "finance"], "New York, US", ["Data strategy", "Governance"], 12, true, "men/52"],
  ["Fatima Al-Nasr", "Engineering Manager", "Orbit ERP", "engineering", ["leadership", "erp"], "Dubai, AE", ["Delivery", "Coaching", "Systems"], 10, true, "women/67"],

  // ── Banking ─────────────────────────────────────────────────────────
  ["Andrés Ferrer", "Core Banking Engineer", "Meridian Pay", "engineering", ["banking"], "Madrid, ES", ["Java", "ISO 20022", "Kafka"], 11, false, "men/59"],
  ["Lily Chen", "Product Designer, Payments", "Bluecrest Bank", "design", ["banking"], "Hong Kong, HK", ["Trust UX", "Accessibility"], 6, true, "women/74"],
  ["Ravi Menon", "Risk Data Analyst", "Bluecrest Bank", "data", ["banking", "finance"], "Mumbai, IN", ["Credit models", "Python", "dbt"], 9, true, "men/66"],
  ["Sofia Ricci", "Compliance Product Manager", "Meridian Pay", "product", ["banking"], "Milan, IT", ["KYC", "Regulatory", "Discovery"], 8, false, "women/81"],
  ["Kwame Boateng", "Security Engineer", "Bluecrest Bank", "infra", ["banking", "security"], "Accra, GH", ["Threat modeling", "IAM"], 7, true, "men/73"],

  // ── Finance ─────────────────────────────────────────────────────────
  ["Julia Sørensen", "Quant Developer", "Ledgerworks", "engineering", ["finance"], "Copenhagen, DK", ["C++", "Low latency", "Pricing"], 10, true, "women/88"],
  ["Ethan Park", "Fintech Product Manager", "Ledgerworks", "product", ["finance"], "Seoul, KR", ["Investing UX", "Compliance"], 7, true, "men/80"],
  ["Nadia Haryanto", "Data Scientist, Fraud", "Sigma Capital", "data", ["finance"], "Jakarta, ID", ["Anomaly detection", "Graph ML"], 6, false, "women/95"],
  ["Oliver Grant", "Brand Designer", "Sigma Capital", "design", ["finance"], "Toronto, CA", ["Identity", "Motion", "Editorial"], 9, true, "men/87"],
  ["Zainab Okoye", "Growth Lead", "Sigma Capital", "growth", ["finance"], "Abuja, NG", ["Paid social", "Attribution"], 5, true, "women/2"],

  // ── ERP ─────────────────────────────────────────────────────────────
  ["Hendrik Vos", "SAP Solution Architect", "Orbit ERP", "engineering", ["erp"], "Rotterdam, NL", ["S/4HANA", "ABAP", "Integrations"], 15, false, "men/94"],
  ["Ayu Kusuma", "Business Analyst", "Orbit ERP", "product", ["erp"], "Surabaya, ID", ["Process mapping", "Requirements"], 8, true, "women/9"],
  ["Tomasz Nowak", "UX Designer, Enterprise", "Beltway Systems", "design", ["erp"], "Kraków, PL", ["Complex tables", "Workflow UX"], 10, true, "men/1"],
  ["Grace Mutua", "QA Lead", "Beltway Systems", "quality", ["erp"], "Nairobi, KE", ["Test strategy", "Selenium"], 9, false, "women/16"],
  ["Victor Almeida", "Integration Engineer", "Beltway Systems", "infra", ["erp"], "São Paulo, BR", ["MuleSoft", "APIs", "ETL"], 7, true, "men/8"],

  // ── Gas & Oil ───────────────────────────────────────────────────────
  ["Ingvild Haugen", "Industrial IoT Engineer", "Fjordline Energy", "engineering", ["energy"], "Stavanger, NO", ["Edge", "SCADA", "Python"], 12, false, "women/23"],
  ["Omar Siddiqui", "Reservoir Data Scientist", "Delta Petro", "data", ["energy"], "Doha, QA", ["Geostatistics", "Simulation"], 11, true, "men/15"],
  ["Rosa Delgado", "HSE Product Manager", "Delta Petro", "product", ["energy"], "Houston, US", ["Field ops", "Safety systems"], 9, true, "women/30"],
  ["Arif Maulana", "Field Systems Designer", "Fjordline Energy", "design", ["energy"], "Balikpapan, ID", ["Rugged UI", "Offline-first"], 6, true, "men/22"],
  ["Peter Lindgren", "Site Reliability Engineer", "Delta Petro", "infra", ["energy"], "Aberdeen, UK", ["Observability", "Incident response"], 8, false, "men/29"],

  // ── Transportation ──────────────────────────────────────────────────
  ["Sinta Wijaya", "Product Designer, Rider", "Kargo Nusantara", "design", ["mobility"], "Jakarta, ID", ["Maps UX", "Onboarding"], 5, true, "women/37"],
  ["Luca Bianchi", "Routing Engineer", "Transitly", "engineering", ["mobility"], "Turin, IT", ["Graph algorithms", "Go", "Geo"], 8, true, "men/36"],
  ["Mei Lin Tan", "Operations Data Lead", "Transitly", "data", ["mobility"], "Kuala Lumpur, MY", ["Forecasting", "Pricing", "SQL"], 10, false, "women/44"],
  ["Daniel Osei", "Mobile Engineer", "Kargo Nusantara", "engineering", ["mobility"], "Bali, ID", ["React Native", "Offline sync"], 6, true, "men/43"],
  ["Elena Petrova", "UX Researcher", "Transitly", "research", ["mobility"], "Lisbon, PT", ["Field studies", "Diary studies"], 7, true, "women/51"],

  // ── Health Tech ─────────────────────────────────────────────────────
  ["Aisha Karim", "Clinical Product Manager", "Caretrail", "product", ["healthtech"], "Amsterdam, NL", ["HL7/FHIR", "Care pathways"], 9, true, "women/58"],
  ["Jonas Weber", "Full-stack Engineer", "Caretrail", "engineering", ["healthtech"], "Munich, DE", ["Next.js", "Postgres", "HIPAA"], 6, false, "men/50"],
  ["Nurul Hidayah", "Accessibility Designer", "Caretrail", "design", ["healthtech"], "Jakarta, ID", ["WCAG", "Inclusive design"], 7, true, "women/65"],

  // ── Gaming ──────────────────────────────────────────────────────────
  ["Kai Nakamura", "Gameplay Engineer", "Pixelburn", "engineering", ["gaming"], "Osaka, JP", ["Unity", "C#", "Netcode"], 8, true, "men/57"],
  ["Bella Rossi", "Technical Artist", "Pixelburn", "design", ["gaming"], "Vancouver, CA", ["Shaders", "Rigging", "VFX"], 6, true, "women/72"],
  ["Samuel Adeniyi", "Live Ops Analyst", "Pixelburn", "data", ["gaming"], "Manchester, UK", ["Cohorts", "Economy design"], 5, false, "men/64"],

  // ── Climate ─────────────────────────────────────────────────────────
  ["Freya Lund", "Carbon Data Engineer", "Terravolt", "data", ["climate"], "Reykjavík, IS", ["LCA", "Airflow", "Spark"], 7, true, "women/79"],
  ["Miguel Santos", "Hardware-Software Engineer", "Terravolt", "engineering", ["climate"], "Barcelona, ES", ["Embedded", "MQTT", "Rust"], 9, true, "men/71"],

  // ── Cybersecurity ───────────────────────────────────────────────────
  ["Hannah Fischer", "Application Security Engineer", "Ironvault", "infra", ["security"], "Vienna, AT", ["SAST", "Threat modeling"], 8, true, "women/86"],
  ["Rizky Pratama", "Detection Engineer", "Ironvault", "engineering", ["security"], "Jakarta, ID", ["SIEM", "Sigma rules", "Python"], 6, false, "men/78"],
  ["Chloe Dubois", "Security Product Designer", "Ironvault", "design", ["security"], "Montreal, CA", ["Zero-trust UX", "Alert design"], 5, true, "women/93"],
  // ── Deeper bench for the smaller crafts ─────────────────────────────
  ["Leo Fitriadi", "QA Engineer, Mobile", "Kargo Nusantara", "quality", ["mobility"], "Jakarta, ID", ["Appium", "Device labs", "Regression"], 6, true, "men/87"],
  ["Marta Nowicka", "Test Architect", "Meridian Pay", "quality", ["banking"], "Warsaw, PL", ["Contract testing", "Pact", "CI/CD"], 12, false, "women/88"],
  ["Ryan Cole", "QA Lead, Live Services", "Pixelburn", "quality", ["gaming"], "Austin, US", ["Soak testing", "Telemetry"], 9, true, "men/94"],
  ["Dewi Anggraini", "Growth Product Manager", "Verity Labs", "growth", ["ai"], "Jakarta, ID", ["Activation", "Experimentation"], 7, true, "women/95"],
  ["Felix Braun", "Performance Marketing Lead", "Transitly", "growth", ["mobility"], "Hamburg, DE", ["CAC", "Creative testing", "SEO"], 10, false, "men/8"],
  ["Aicha Bensalem", "Community & Growth", "Terravolt", "growth", ["climate"], "Casablanca, MA", ["Community", "Content", "Partnerships"], 5, true, "women/2"],
  ["Tomás Ibarra", "Senior UX Researcher", "Orbit ERP", "research", ["erp"], "Santiago, CL", ["Ethnography", "Usability", "Synthesis"], 11, true, "men/15"],
  ["Saoirse Byrne", "Design Researcher", "Caretrail", "research", ["healthtech"], "Dublin, IE", ["Clinical research", "Co-design"], 8, false, "women/9"],
  ["Marco Lombardi", "Research Ops", "Ironvault", "research", ["security"], "Rome, IT", ["Panel management", "Repository"], 6, true, "men/22"],
]


/**
 * Working languages per country, for the seeded directory.
 *
 * Derived from the country code already in `location` rather than typed into
 * all 62 rows: the tuple source stays scannable, and the values cannot drift
 * out of sync with where a person actually is. A real signup would state their
 * own languages; this is fixture data and behaves like fixture data.
 *
 * English is on every row because this is a directory of people who work in
 * tech internationally. That makes the English filter near-useless and every
 * other language genuinely useful, which is the honest trade.
 */
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  AE: ["Arabic"],
  AT: ["German"],
  BR: ["Portuguese"],
  CA: ["French"],
  CH: ["German", "French"],
  CL: ["Spanish"],
  DE: ["German"],
  DK: ["Danish"],
  ES: ["Spanish"],
  FR: ["French"],
  GE: ["Georgian", "Russian"],
  GH: ["Twi"],
  HK: ["Cantonese", "Mandarin"],
  ID: ["Bahasa Indonesia"],
  IE: ["Irish"],
  IN: ["Hindi", "Tamil"],
  IS: ["Icelandic"],
  IT: ["Italian"],
  JP: ["Japanese"],
  KE: ["Swahili"],
  KR: ["Korean"],
  MA: ["Arabic", "French"],
  MY: ["Bahasa Malaysia", "Mandarin"],
  NG: ["Yoruba"],
  NL: ["Dutch"],
  NO: ["Norwegian"],
  PL: ["Polish"],
  PT: ["Portuguese"],
  QA: ["Arabic"],
  SE: ["Swedish"],
  SG: ["Mandarin", "Bahasa Malaysia"],
  UK: [],
  US: [],
}

/** Every language present in the directory, alphabetical, for the filter. */
export const LANGUAGES: string[] = [
  "English",
  ...new Set(Object.values(COUNTRY_LANGUAGES).flat()),
].filter((value, index, all) => all.indexOf(value) === index)
  .sort((a, b) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)))

export function languagesFor(location: string): string[] {
  const country = location.slice(-2).toUpperCase()
  return ["English", ...(COUNTRY_LANGUAGES[country] ?? [])]
}

/** Letters NFD cannot decompose still need a Latin equivalent, or ids rot. */
const TRANSLITERATIONS: Record<string, string> = {
  ø: "o", æ: "ae", œ: "oe", ł: "l", đ: "d", ð: "d", þ: "th", ß: "ss",
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
  }),
)

export const TOTAL_PEOPLE = PEOPLE.length
