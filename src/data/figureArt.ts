/**
 * Figures for the seeded case studies, drawn rather than photographed.
 *
 * Same reasoning as the generated covers: the work these entries describe is
 * internal and mostly unphotographable, and a stock screenshot would be a lie
 * dressed as evidence. A diagram that states the actual numbers is honest and
 * costs a few hundred bytes. A real signup uploads their own.
 *
 * SVG data URIs cannot read the app's CSS variables, so the palette is
 * repeated here as literals. Keep it in step with `@theme` in index.css.
 */
const INK = "#0b0b0f"
const PAPER = "#f5f4ef"
const PAPER_2 = "#ecebe4"
const LINE = "#e2e0d7"
const MUTED = "#6b6b76"
const LIME = "#d6ff4f"
const PINK = "#ff4f87"
const SKY = "#4fd1ff"

const FONT = "Space Grotesk, DM Sans, system-ui, sans-serif"

function dataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`
}

/** Wide: a before/after bar pair with the numbers stated. */
export function barCompare(
  title: string,
  before: { label: string; value: number },
  after: { label: string; value: number },
): string {
  const max = Math.max(before.value, after.value)
  const h = (v: number) => Math.round((v / max) * 300)
  return dataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <rect width="1200" height="675" fill="${PAPER}"/>
      <text x="80" y="90" font-family="${FONT}" font-size="34" font-weight="700" fill="${INK}">${title}</text>
      <line x1="80" y1="540" x2="1120" y2="540" stroke="${LINE}" stroke-width="2"/>
      <rect x="260" y="${540 - h(before.value)}" width="180" height="${h(before.value)}" rx="8" fill="${PAPER_2}" stroke="${LINE}" stroke-width="2"/>
      <text x="350" y="${540 - h(before.value) - 22}" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="700" fill="${MUTED}">${before.value}%</text>
      <text x="350" y="585" text-anchor="middle" font-family="${FONT}" font-size="24" fill="${MUTED}">${before.label}</text>
      <rect x="700" y="${540 - h(after.value)}" width="180" height="${h(after.value)}" rx="8" fill="${LIME}" stroke="${INK}" stroke-width="2"/>
      <text x="790" y="${540 - h(after.value) - 22}" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="700" fill="${INK}">${after.value}%</text>
      <text x="790" y="585" text-anchor="middle" font-family="${FONT}" font-size="24" fill="${INK}">${after.label}</text>
      <path d="M480 420 L660 420 M630 400 L660 420 L630 440" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`)
}

/** Tall: a phone screen wireframe. `rows` are drawn as list items or tiles. */
export function phoneMock(title: string, mode: "list" | "tiles", accent = SKY): string {
  const body =
    mode === "list"
      ? [0, 1, 2, 3, 4, 5]
          .map(
            (i) =>
              `<rect x="70" y="${300 + i * 96}" width="460" height="72" rx="10" fill="${PAPER}" stroke="${LINE}" stroke-width="2"/>
               <rect x="94" y="${326 + i * 96}" width="${260 - i * 18}" height="16" rx="8" fill="${MUTED}" opacity="0.5"/>`,
          )
          .join("")
      : [0, 1, 2, 3, 4, 5]
          .map((i) => {
            const x = 70 + (i % 2) * 240
            const y = 300 + Math.floor(i / 2) * 250
            return `<rect x="${x}" y="${y}" width="220" height="230" rx="14" fill="${PAPER}" stroke="${LINE}" stroke-width="2"/>
                    <rect x="${x + 20}" y="${y + 20}" width="180" height="130" rx="10" fill="${accent}" opacity="0.5"/>
                    <rect x="${x + 20}" y="${y + 168}" width="120" height="20" rx="10" fill="${INK}"/>
                    <rect x="${x + 20}" y="${y + 196}" width="70" height="16" rx="8" fill="${MUTED}" opacity="0.5"/>`
          })
          .join("")

  return dataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="1100" viewBox="0 0 600 1100">
      <rect width="600" height="1100" fill="${PAPER_2}"/>
      <rect x="40" y="40" width="520" height="1020" rx="48" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
      <rect x="230" y="70" width="140" height="18" rx="9" fill="${INK}" opacity="0.15"/>
      <text x="70" y="200" font-family="${FONT}" font-size="38" font-weight="700" fill="${INK}">${title}</text>
      <rect x="70" y="228" width="300" height="16" rx="8" fill="${MUTED}" opacity="0.4"/>
      ${body}
    </svg>`)
}

/** Wide: a left-to-right flow of labelled stages. */
export function flowDiagram(stages: string[], note: string): string {
  const width = 1200
  const boxW = Math.floor((width - 160 - (stages.length - 1) * 40) / stages.length)
  const boxes = stages
    .map((stage, i) => {
      const x = 80 + i * (boxW + 40)
      const last = i === stages.length - 1
      return `<rect x="${x}" y="230" width="${boxW}" height="130" rx="14" fill="${last ? LIME : PAPER}" stroke="${INK}" stroke-width="2"/>
              <text x="${x + boxW / 2}" y="303" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}">${stage}</text>
              ${
                last
                  ? ""
                  : `<path d="M${x + boxW + 8} 295 L${x + boxW + 30} 295 M${x + boxW + 22} 288 L${x + boxW + 30} 295 L${x + boxW + 22} 302" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
              }`
    })
    .join("")

  return dataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
      <rect width="1200" height="600" fill="${PAPER}"/>
      ${boxes}
      <text x="80" y="450" font-family="${FONT}" font-size="24" fill="${MUTED}">${note}</text>
    </svg>`)
}

/** Square: a labelled stat tile, for a single number that carries a chapter. */
export function statTile(value: string, label: string, accent = PINK): string {
  return dataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <rect width="800" height="800" fill="${accent}" opacity="0.22"/>
      <rect x="1" y="1" width="798" height="798" fill="none" stroke="${LINE}" stroke-width="2"/>
      <text x="64" y="420" font-family="${FONT}" font-size="86" font-weight="700" fill="${INK}">${value}</text>
      <text x="64" y="480" font-family="${FONT}" font-size="26" fill="${MUTED}">${label}</text>
    </svg>`)
}
