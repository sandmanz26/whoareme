import { useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Search } from "./Icon"
import { cn } from "@/lib/utils"

export interface ComboOption {
  value: string
  label: string
}

export interface ComboGroup {
  label: string
  options: ReadonlyArray<ComboOption>
}

interface BaseProps {
  /** Ties the external `<label>` to the trigger. */
  id?: string
  options?: ReadonlyArray<ComboOption>
  /** Use instead of `options` when the list mixes kinds a reader would
   *  otherwise conflate. Group headings are not selectable. */
  groups?: ReadonlyArray<ComboGroup>
  /** Label for the empty value, and the trigger text while nothing is picked. */
  emptyLabel: string
  /** Show the in-popover search above this many options. */
  searchThreshold?: number
  invalid?: boolean
  describedBy?: string
  /** Extra classes for the trigger, so callers keep control of their own shape. */
  className?: string
  /** Overrides the chevron's default `text-muted`, for a trigger on a dark surface. */
  chevronClassName?: string
}

/**
 * Single and multi are separate shapes rather than one loose `value` that could
 * be either. A caller cannot accidentally pass an array to a form field that
 * stores one craft, and the compiler says so at the call site.
 */
type ComboboxProps = BaseProps &
  (
    | { multiple?: false; value: string; onChange: (value: string) => void }
    | { multiple: true; values: readonly string[]; onChange: (values: string[]) => void }
  )

interface Row {
  kind: "group" | "option"
  label: string
  value?: string
  /** Index among selectable rows, for keyboard movement. */
  optionIndex?: number
}

/**
 * Listbox with an optional filter, hand-rolled.
 *
 * A native `<select>` renders an OS menu we cannot style, search, or group
 * legibly, and once a list passes a couple of dozen entries (languages, topics)
 * scrolling it is the whole interaction. This replaces it with a real combobox:
 * the trigger owns `role="combobox"`, the popover owns `role="listbox"`, and
 * above `searchThreshold` options a filter input appears so the list is typed
 * at rather than scrolled through.
 *
 * The threshold exists because the filter is not free: it adds a focus stop and
 * a second thing to read. Four experience bands do not need one; twenty-seven
 * languages do.
 *
 * No dependency: rule 1 in CLAUDE.md. Keyboard, focus return and outside-click
 * are handled here rather than imported.
 */
export function Combobox(props: ComboboxProps) {
  const {
    id,
    options,
    groups,
    emptyLabel,
    searchThreshold = 6,
    invalid = false,
    describedBy,
    className,
    chevronClassName,
  } = props

  const multiple = props.multiple === true
  const selectedValues: readonly string[] = multiple
    ? props.values
    : props.value
      ? [props.value]
      : []
  const isSelected = (candidate: string) => selectedValues.includes(candidate)
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const listId = `${triggerId}-listbox`

  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [placement, setPlacement] = useState<{
    left: number
    width: number
    top?: number
    bottom?: number
    listMax: number
  }>({ left: 0, width: 0, listMax: 256 })

  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const flat = useMemo<ComboOption[]>(
    () => (groups ? groups.flatMap((group) => [...group.options]) : [...(options ?? [])]),
    [groups, options],
  )

  const searchable = flat.length > searchThreshold
  const chosen = flat.filter((option) => isSelected(option.value))

  /**
   * One name reads better than a count; four names do not fit. Past two the
   * trigger names the first and counts the rest, which keeps the control the
   * same width whether one thing is picked or nine.
   */
  const triggerLabel =
    chosen.length === 0
      ? emptyLabel
      : chosen.length <= 2
        ? chosen.map((option) => option.label).join(", ")
        : `${chosen[0].label} +${chosen.length - 1}`

  // Rows are built once per query so the keyboard index and the rendered list
  // can never disagree about what is on screen.
  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase()
    const keep = (option: ComboOption) =>
      needle === "" || option.label.toLowerCase().includes(needle)

    const built: Row[] = []
    let optionIndex = 0
    const pushOption = (option: ComboOption) => {
      built.push({ kind: "option", label: option.label, value: option.value, optionIndex })
      optionIndex += 1
    }

    // The empty choice is only offered unfiltered: "Any topic" is a command,
    // not a search result, and matching it against the query reads as a bug.
    if (needle === "") pushOption({ value: "", label: emptyLabel })

    if (groups) {
      for (const group of groups) {
        const kept = group.options.filter(keep)
        if (kept.length === 0) continue
        built.push({ kind: "group", label: group.label })
        kept.forEach(pushOption)
      }
    } else {
      ;(options ?? []).filter(keep).forEach(pushOption)
    }
    return built
  }, [emptyLabel, groups, options, query])

  const selectable = rows.filter((row) => row.kind === "option")

  /**
   * Position the popover against the viewport, not the parent.
   *
   * An absolutely positioned menu is clipped by any scrolling ancestor. Inside
   * the join modal that meant a dropdown cut in half with no indication that
   * more options existed. Fixed positioning measured from the trigger escapes
   * every clipper, so the list is bounded by the window and nothing else.
   */
  function measure() {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const GUTTER = 12
    const searchHeight = searchable ? 44 : 0

    const below = window.innerHeight - rect.bottom - GUTTER - searchHeight
    const above = rect.top - GUTTER - searchHeight
    const dropDown = below >= 176 || below >= above

    setPlacement({
      left: rect.left,
      width: rect.width,
      ...(dropDown ? { top: rect.bottom + 8 } : { bottom: window.innerHeight - rect.top + 8 }),
      listMax: Math.max(96, Math.min(256, dropDown ? below : above)),
    })
  }

  // Opening lands on the current value so the first arrow key moves from where
  // the reader already is, not from the top of a list of twenty-seven.
  function openList() {
    measure()
    setQuery("")
    const at = selectable.findIndex((row) => row.value && isSelected(row.value))
    setActiveIndex(at >= 0 ? at : 0)
    setOpen(true)
  }

  function close({ focusTrigger = true }: { focusTrigger?: boolean } = {}) {
    setOpen(false)
    setQuery("")
    if (focusTrigger) triggerRef.current?.focus()
  }

  /**
   * Multi-select keeps the list open. Picking three languages should be three
   * clicks, not three rounds of reopening the same menu; the reader closes it
   * when they are done, by clicking away or pressing Escape.
   */
  function commit(next: string) {
    if (!multiple) {
      props.onChange(next)
      close()
      return
    }
    if (next === "") {
      props.onChange([])
      return
    }
    props.onChange(
      selectedValues.includes(next)
        ? selectedValues.filter((item) => item !== next)
        : [...selectedValues, next],
    )
  }

  useEffect(() => {
    if (!open) return
    if (searchable) searchRef.current?.focus()

    /**
     * The list is positioned in viewport coordinates, so an ancestor scrolling
     * makes that measurement stale. Re-measure rather than dismiss.
     *
     * Dismissing was the original behaviour and it made the control unusable
     * inside a scrollable container: opening moves focus, focus scrolls the
     * container to reveal it, and that scroll closed the list in the same tick
     * it opened. Repositioning is also just better - a list that vanishes
     * because the page moved a pixel is not what anyone wants.
     *
     * Capture phase catches ancestor scrolls, which do not bubble; scrolling
     * the option list itself is ignored.
     */
    let frame = 0
    const inside = (node: Node) =>
      Boolean(wrapRef.current?.contains(node) || popRef.current?.contains(node))

    function onViewportChange(event: Event) {
      if (event.target instanceof Node && inside(event.target)) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onViewportChange, true)

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!inside(event.target as Node)) close({ focusTrigger: false })
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onViewportChange, true)
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable])

  // Filtering can shorten the list under the cursor.
  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(selectable.length - 1, 0)))
  }, [selectable.length])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open, rows])

  function onKeyDown(event: React.KeyboardEvent) {
    const last = selectable.length - 1

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        setActiveIndex((current) => (current >= last ? 0 : current + 1))
        break
      case "ArrowUp":
        event.preventDefault()
        setActiveIndex((current) => (current <= 0 ? last : current - 1))
        break
      case "Home":
        event.preventDefault()
        setActiveIndex(0)
        break
      case "End":
        event.preventDefault()
        setActiveIndex(last)
        break
      case "Enter":
        event.preventDefault()
        if (selectable[activeIndex]) commit(selectable[activeIndex].value ?? "")
        break
      case "Escape":
        event.preventDefault()
        // Escape dismisses the topmost layer only. Without this the event
        // reaches the dialog's document listener and closes the whole modal,
        // taking a half-filled form with it.
        event.stopPropagation()
        close()
        break
      case "Tab":
        close({ focusTrigger: false })
        break
    }
  }

  const activeId = open && selectable[activeIndex] ? `${listId}-${activeIndex}` : undefined

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-activedescendant={searchable ? undefined : activeId}
        onClick={() => (open ? close() : openList())}
        onKeyDown={searchable && open ? undefined : onKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 text-left",
          "font-display text-sm font-medium transition-colors duration-200",
          "focus:border-ink focus:outline-none",
          className,
        )}
      >
        <span className={cn("truncate", chosen.length === 0 && "text-muted")}>{triggerLabel}</span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 transition-transform duration-200",
            chevronClassName ?? "text-muted",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        /**
         * Portalled to the body on purpose.
         *
         * The popup is `position: fixed` and placed in viewport coordinates,
         * but a fixed element is positioned against the nearest ancestor with
         * a transform rather than the viewport. Our own entrance animations
         * use `animation-fill-mode: both`, so an element that has finished
         * animating still carries `transform: scale(1)` - an identity
         * transform, and enough to become that containing block. Inside the
         * join modal the list landed a few hundred pixels off. Leaving the
         * subtree removes the whole class of problem.
         */
        createPortal(
          <div
            ref={popRef}
            style={{
              left: placement.left,
              width: Math.max(placement.width, 224),
              ...(placement.top !== undefined
                ? { top: placement.top }
                : { bottom: placement.bottom }),
            }}
            className={cn(
              "fixed z-50 overflow-hidden rounded-card",
              "border border-ink/15 bg-card shadow-[0_24px_60px_-28px_rgba(11,11,15,0.45)]",
            )}
          >
            {searchable && (
              <div className="relative border-b border-line">
                <Search
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
                />
                <input
                  ref={searchRef}
                  type="text"
                  role="searchbox"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActiveIndex(0)
                  }}
                  onKeyDown={onKeyDown}
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  aria-label="Filter the options"
                  placeholder="Type to filter"
                  className="h-11 w-full bg-transparent pr-3 pl-9 text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
            )}

            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              style={{ maxHeight: placement.listMax }}
              className="overflow-y-auto py-1.5"
            >
              {selectable.length === 0 && (
                <li className="px-3.5 py-3 text-sm text-muted">No match for “{query.trim()}”</li>
              )}

              {rows.map((row, index) =>
                row.kind === "group" ? (
                  <li
                    key={`group-${row.label}-${index}`}
                    role="presentation"
                    className="mt-1.5 px-3.5 pt-2 pb-1 font-display text-[0.6875rem] font-medium tracking-[0.12em] text-muted uppercase first:mt-0 first:pt-0"
                  >
                    {row.label}
                  </li>
                ) : (
                  <li key={`option-${row.value}-${index}`}>
                    <button
                      type="button"
                      id={`${listId}-${row.optionIndex}`}
                      role="option"
                      aria-selected={row.value !== undefined && isSelected(row.value)}
                      data-option-index={row.optionIndex}
                      onClick={() => commit(row.value ?? "")}
                      onMouseMove={() => setActiveIndex(row.optionIndex ?? 0)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-left",
                        "font-display text-sm transition-colors duration-150",
                        row.optionIndex === activeIndex ? "bg-paper-2 text-ink" : "text-ink-2",
                        row.value !== undefined &&
                          isSelected(row.value) &&
                          "font-semibold text-ink",
                      )}
                    >
                      <span className="truncate">{row.label}</span>
                      {row.value !== undefined && isSelected(row.value) && (
                        <Check size={15} className="shrink-0" />
                      )}
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}
