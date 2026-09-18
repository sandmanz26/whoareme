import { useId } from "react"
import type { ReactElement, SVGProps } from "react"
import type { PlatformId } from "@/data/platforms"

type Props = SVGProps<SVGSVGElement> & { size?: number }

/**
 * Brand marks, drawn rather than pulled from an icon package.
 *
 * Two of these are filled paths because that is what the mark is - GitHub and
 * LinkedIn are not recognisable as outlines. The rest are drawn in the same
 * 1.75 stroke as the rest of the icon set so a row of them reads as one row
 * and not as a sticker sheet.
 */
function Filled({ size = 18, children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

function Stroked({ size = 18, children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

const GitHub = (p: Props) => (
  <Filled {...p}>
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2a4.6 4.6 0 0 1 1.2 3.2c0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
  </Filled>
)

const LinkedIn = (p: Props) => (
  <Filled {...p}>
    <path d="M20.4 20.5h-3.6V15c0-1.4 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.6H9.4V9h3.4v1.6h.04c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3ZM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1Zm1.8 13.1H3.6V9h3.5v11.5ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.5C0 23.2.8 24 1.8 24h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z" />
  </Filled>
)

const Instagram = (p: Props) => (
  <Stroked {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </Stroked>
)

const X = (p: Props) => (
  <Stroked {...p}>
    <path d="M4 4l16 16M20 4 4 20" />
  </Stroked>
)

/**
 * The ball: a circle crossed by the three arcs the mark is made of. The arcs
 * are clipped to the ball - unclipped they poke past the edge and the whole
 * thing reads as a beach ball rather than as Dribbble.
 */
const Dribbble = ({ size = 18, ...rest }: Props) => {
  // A fixed id would repeat once a page lists more than one designer.
  const clipId = useId()
  return (
    <Stroked size={size} {...rest}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="9" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="9" />
      <g clipPath={`url(#${clipId})`}>
        <path d="M5.1 5.2c4.2 4.2 7 9.6 8 16.2" />
        <path d="M2.4 14.3c5.4-1.4 11.6-.7 17 2.3" />
        <path d="M7.6 2.6c3.9 3.8 9.1 5.8 14.2 5.4" />
      </g>
    </Stroked>
  )
}

const Website = (p: Props) => (
  <Stroked {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.4 2.5 3.6 5.6 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.6-3.6-9S9.6 5.5 12 3Z" />
  </Stroked>
)

const MARKS: Record<PlatformId, (props: Props) => ReactElement> = {
  github: GitHub,
  linkedin: LinkedIn,
  instagram: Instagram,
  x: X,
  dribbble: Dribbble,
  website: Website,
}

export function BrandIcon({ platform, ...rest }: Props & { platform: PlatformId }) {
  const Mark = MARKS[platform]
  return <Mark {...rest} />
}
