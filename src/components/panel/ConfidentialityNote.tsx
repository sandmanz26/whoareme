import { Link } from "react-router-dom"

/**
 * The confidentiality prompt, next to the evidence fields.
 *
 * Every other portfolio site asks for pictures. This one asks for the number
 * that moved, which is frequently the precise thing an employment contract or
 * a client NDA treats as confidential - and a metric is often more sensitive
 * than a screenshot, not less.
 *
 * It offers the way out rather than only the risk: the shape of a result is
 * usually publishable when the raw figure is not, and "four hours to under
 * one" is still evidence.
 */
export function ConfidentialityNote() {
  return (
    <div className="rounded-card border border-ink/15 bg-paper-2/70 p-4">
      <p className="font-display text-sm font-semibold text-ink">
        Is this figure yours to publish?
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Results are the part an NDA or an employment contract usually covers. If you are not sure,
        publish the shape instead of the raw number: <em>a four-hour job down to under one</em>{" "}
        carries the same weight as the exact minutes and gives nothing away. Publishing something
        you were not free to publish is a problem you would own, not us.
      </p>
      <p className="mt-2 text-sm">
        <Link
          to="/terms"
          className="font-display font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-200 hover:decoration-pop-pink"
        >
          What you warrant when you publish
        </Link>
      </p>
    </div>
  )
}
