import type { RoleId } from "@/data/taxonomy"
import { cn, pickBy } from "@/lib/utils"

/**
 * Washed pops rather than full-strength ones: a grid of six saturated tiles
 * reads as noise, and the metric has to stay the loudest thing on the cover.
 * One ink tile per rotation keeps the set from going soft.
 */
const TINTS = [
  { bg: "bg-pop-lime/38", ink: "text-ink", line: "rgba(11,11,15,0.20)" },
  { bg: "bg-pop-pink/22", ink: "text-ink", line: "rgba(11,11,15,0.18)" },
  { bg: "bg-ink", ink: "text-paper", line: "rgba(255,255,255,0.26)" },
  { bg: "bg-pop-sky/28", ink: "text-ink", line: "rgba(11,11,15,0.18)" },
  { bg: "bg-pop-violet/16", ink: "text-ink", line: "rgba(11,11,15,0.18)" },
  { bg: "bg-pop-tangerine/22", ink: "text-ink", line: "rgba(11,11,15,0.18)" },
] as const

/**
 * Covers are drawn, not uploaded.
 *
 * A screenshot of an internal tool is usually confidential and always
 * unreadable at card size, so each craft gets a line motif and the cover
 * carries the one number the author is claiming. It keeps the grid honest:
 * you scan results, not thumbnails.
 */
function Motif({ role, stroke }: { role: RoleId; stroke: string }) {
  const common = { fill: "none", stroke, strokeWidth: 1.5, strokeLinecap: "round" as const }

  switch (role) {
    case "engineering":
      return (
        <g {...common}>
          <path d="M0 96 L40 96 L52 62 L68 128 L84 78 L96 96 L200 96" />
          <path d="M0 130 L200 130" strokeDasharray="3 7" />
          <circle cx="68" cy="128" r="5" />
        </g>
      )
    case "design":
      return (
        <g {...common}>
          <circle cx="70" cy="96" r="44" />
          <circle cx="118" cy="96" r="44" />
          <rect x="26" y="52" width="88" height="88" rx="10" strokeDasharray="4 6" />
        </g>
      )
    case "product":
      return (
        <g {...common}>
          <path d="M18 138 L58 138 L58 112 L98 112 L98 84 L138 84 L138 54 L182 54" />
          <path d="M18 158 L182 158" strokeDasharray="3 7" />
        </g>
      )
    case "data":
      return (
        <g {...common}>
          <path d="M14 140 C 60 138, 82 120, 104 88 S 150 42, 186 40" />
          <path d="M14 140 C 70 136, 96 124, 120 108 S 160 88, 186 86" strokeDasharray="4 6" />
          {[30, 66, 102, 138, 172].map((x, i) => (
            <circle key={x} cx={x} cy={132 - i * 20} r="3.5" />
          ))}
        </g>
      )
    case "infra":
      return (
        <g {...common}>
          <circle cx="100" cy="96" r="26" />
          <circle cx="100" cy="96" r="50" strokeDasharray="5 7" />
          <circle cx="100" cy="96" r="74" strokeDasharray="2 9" />
          {[0, 90, 180, 270].map((angle) => (
            <circle
              key={angle}
              cx={100 + 50 * Math.cos((angle * Math.PI) / 180)}
              cy={96 + 50 * Math.sin((angle * Math.PI) / 180)}
              r="5"
            />
          ))}
        </g>
      )
    case "quality":
      return (
        <g {...common}>
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect key={`${row}-${col}`} x={38 + col * 34} y={54 + row * 34} width="24" height="24" rx="6" />
            )),
          )}
          <path d="M92 106 l12 12 24 -30" strokeWidth={2.5} />
        </g>
      )
    case "growth":
      return (
        <g {...common}>
          <path d="M16 148 C 62 148, 96 130, 122 96 S 164 44, 188 36" strokeWidth={2} />
          <path d="M164 38 L188 36 L184 60" />
          {[46, 82, 118, 154].map((x, i) => (
            <rect key={x} x={x} y={150 - (i + 1) * 22} width="14" height={(i + 1) * 22} rx="4" strokeDasharray="3 5" />
          ))}
        </g>
      )
    case "research":
      return (
        <g {...common}>
          <circle cx="62" cy="66" r="7" />
          <circle cx="140" cy="58" r="7" />
          <circle cx="100" cy="112" r="7" />
          <circle cx="46" cy="136" r="7" />
          <circle cx="156" cy="130" r="7" />
          <path d="M62 66 L100 112 L140 58 M100 112 L46 136 M100 112 L156 130" strokeDasharray="4 5" />
        </g>
      )
  }
}

/**
 * Two entries in the same craft share a motif, so each cover also gets a
 * deterministic mirror/offset - the grid stays varied without the drawing
 * stopping meaning anything.
 */
const VARIANTS = [
  "translate(0 0)",
  "translate(-200 0) scale(-1 1)",
  "translate(12 -14) scale(1.12)",
  "translate(-14 12) scale(0.94)",
] as const

interface WorkCoverProps {
  seed: string
  role: RoleId
  /** The single claim the card leads with. */
  metric?: string
  metricLabel?: string
  className?: string
}

export function WorkCover({ seed, role, metric, metricLabel, className }: WorkCoverProps) {
  const tint = pickBy(TINTS, seed)

  return (
    <div className={cn("relative isolate overflow-hidden", tint.bg, tint.ink, className)}>
      <svg
        viewBox="0 0 200 192"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full opacity-90"
        aria-hidden="true"
      >
        <g transform={pickBy(VARIANTS, `${seed}-motif`)}>
          <Motif role={role} stroke={tint.line} />
        </g>
      </svg>

      {metric && (
        <div className="relative flex h-full flex-col justify-end p-5">
          <p className="display text-[clamp(1.25rem,3.2vw,1.75rem)] leading-[1.05]">{metric}</p>
          {metricLabel && (
            <p className="mt-1.5 font-display text-[0.6875rem] font-medium tracking-[0.16em] uppercase opacity-70">
              {metricLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
