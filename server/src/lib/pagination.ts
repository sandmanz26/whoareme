import { z } from "zod"

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

export type Pagination = z.infer<typeof paginationSchema>

export function skipFor({ page, limit }: Pagination): number {
  return (page - 1) * limit
}

export function pageMeta(total: number, { page, limit }: Pagination) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), hasMore: page * limit < total }
}
