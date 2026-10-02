/**
 * How the thing you worked on made (or did not make) money.
 *
 * It is a third axis alongside craft and topic because the shape of the work
 * changes completely with it: shipping to twelve enterprise tenants on-prem is
 * a different job from shipping to two million consumers, even when the craft
 * and the industry match exactly.
 */
export const BUSINESS_MODELS = [
  { id: "b2b-saas", label: "B2B SaaS", blurb: "Subscription software sold to companies" },
  { id: "consumer", label: "Consumer", blurb: "Sold to, or used directly by, individuals" },
  { id: "marketplace", label: "Marketplace", blurb: "Two-sided supply and demand" },
  {
    id: "enterprise",
    label: "Enterprise / on-prem",
    blurb: "Licensed, long cycles, deployed per client",
  },
  { id: "platform", label: "Internal platform", blurb: "Built for other teams inside the company" },
  { id: "ecommerce", label: "E-commerce", blurb: "Direct sale of goods" },
  { id: "agency", label: "Agency / client work", blurb: "Delivered for an external client" },
  { id: "open-source", label: "Open source", blurb: "Public code, community governance" },
  { id: "deep-tech", label: "Deep tech / R&D", blurb: "Research-led, long horizon" },
  { id: "public", label: "Public sector / non-profit", blurb: "Funded by mandate, not margin" },
] as const

export type BusinessModelId = (typeof BUSINESS_MODELS)[number]["id"]

export function businessModelById(id: BusinessModelId | undefined) {
  return BUSINESS_MODELS.find((model) => model.id === id)
}

export const BUSINESS_MODEL_OPTIONS = BUSINESS_MODELS.map((model) => ({
  value: model.id,
  label: model.label,
}))
