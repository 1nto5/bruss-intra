## Data Fetching

Never query the database directly from server components. Data reading goes through internal API routes with caching:

1. **API route** - queries MongoDB via `dbc()`, sets `export const revalidate = N` (3600 for config/reference data, 60 for frequently-changing data, 0 for real-time data).
2. **Fetcher function** - calls `fetch(\`${process.env.API}/...\`, { next: { revalidate: N, tags: ['tag-name'] } })`. Tag names follow `app-name-resource` convention (e.g. `competency-matrix-employee-ratings`).
3. **Server components** consume fetcher functions, never `dbc()` directly.

## Data Mutations (Server Actions)

Server actions handle create/update/delete operations:

1. Auth check -> permission check -> Zod validation -> `dbc()` mutation.
2. After successful mutation, call `revalidateTag('tag-name', 'max')` for every affected cache tag.
3. Return `{ success: string }` or `{ error: string, issues?: ZodIssue[] }`.
