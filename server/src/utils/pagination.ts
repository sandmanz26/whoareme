export interface Pagination {
  page: number
  limit: number
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export function parsePagination(query: Record<string, unknown>, defaultLimit = 24): Pagination {
  const page  = Math.max(1, Number(query["page"])  || 1)
  const limit = Math.min(100, Math.max(1, Number(query["limit"]) || defaultLimit))
  return { page, limit }
}

export function skipFor(p: Pagination): number {
  return (p.page - 1) * p.limit
}

export function pageMeta(total: number, p: Pagination): PageMeta {
  const totalPages = Math.ceil(total / p.limit) || 1
  return {
    page: p.page,
    limit: p.limit,
    total,
    totalPages,
    hasNext: p.page < totalPages,
    hasPrev: p.page > 1,
  }
}
