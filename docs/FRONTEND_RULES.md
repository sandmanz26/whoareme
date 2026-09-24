# Frontend Engineering Rules

This document is the source of truth for all frontend engineering decisions in this project.
It is read by both human engineers and AI coding assistants (Claude, Codex).
**Rules here override general best practices.** If you are an AI assistant, follow these rules exactly unless a clear technical reason requires deviation — and state that reason explicitly before deviating.

---

## Approved Stack

| Category | Library | Version |
|---|---|---|
| Framework | React | 19 |
| Language | TypeScript | strict mode |
| Build | Vite | 7 |
| Styling | Tailwind CSS | v4 |
| Routing | React Router | v7 |
| HTTP client | Axios | latest |
| Server state | TanStack Query | v5 |
| Global client state | Zustand | latest |
| Forms | React Hook Form + Zod | latest |
| Complex UI primitives | shadcn/ui | (copy-paste, not installed as package) |
| Notifications | react-hot-toast | latest |

Do not introduce libraries outside this list without an explicit decision. If you think a library is needed, state the reason and wait for confirmation.

---

## Project Structure

```
src/
  api/              # Axios functions — one file per API resource
  components/
    ui/             # Base UI: native HTML components and shadcn copies
    layout/         # Shell, Navbar, Footer, Container, PageIntro
    [feature]/      # Feature-specific components (home/, panel/, work/, etc.)
  hooks/            # Custom React hooks (one concern per file)
  pages/            # Route-level components — orchestrate only, no direct API calls
  routes.tsx        # All route definitions (createBrowserRouter)
  context/          # React Context — only for app-wide state with no better home
  store/            # Zustand stores (one per domain)
  lib/              # Pure utility functions — no React, no JSX, no hooks
  types/            # Shared TypeScript types and interfaces
  index.css         # Design tokens + base styles (source of truth for colors)
```

### Structure rules
- Never invent new top-level directories without a stated reason.
- A page component only orchestrates layout and hooks — no `useQuery`/`useMutation` calls directly in the page body; those belong in a custom hook.
- `src/lib/` is pure functions only — no React imports allowed.
- `src/api/` functions are plain `async` functions — no hooks, no state, no side effects.

---

## TypeScript

- `strict: true` is mandatory. Never disable strict mode or individual strict checks.
- **No `any`.** Use `unknown` if the type is uncertain, then narrow it with a type guard or Zod parse.
- Always type component props explicitly with an `interface`. Never rely on inference from default values.
- Use `interface` for component props. Use `type` for unions, intersections, and types derived from Zod schemas.
- Derive types from Zod schemas with `z.infer<typeof Schema>` — do not duplicate type definitions.
- Export types alongside the components or hooks that own them.

```tsx
// Correct
interface ProfileCardProps {
  userId: string;
  showActions?: boolean;
}
export function ProfileCard({ userId, showActions = false }: ProfileCardProps) { ... }

// Wrong — no explicit prop type
export function ProfileCard({ userId, showActions = false }) { ... }
```

---

## Routing (React Router v7)

- All routes are defined in `src/routes.tsx` using `createBrowserRouter`.
- Lazy-load page components that are not in the critical render path (panel, admin, profile pages).
- Protected routes use a wrapper component that reads auth state from Zustand.
- Always wrap lazy routes in `<Suspense>` with a loading fallback.

```tsx
// src/routes.tsx
import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Shell } from "@/components/layout/Shell";
import { HomePage } from "@/pages/HomePage";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

const PanelPage = lazy(() => import("@/pages/PanelPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "panel",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <PanelPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
```

Navigation rules:
- Use `<Link>` for all internal navigation. Never `<a href="...">` for internal links.
- Use `useNavigate()` for programmatic navigation. Never `window.location.href`.
- Use `useParams`, `useSearchParams`, `useLocation`. Never parse `window.location` manually.

---

## API Layer (Axios)

### Single centralized instance

All HTTP calls go through the axios instance at `src/lib/api.ts`. Never call `axios.get()` / `axios.post()` directly outside that file.

```typescript
// src/lib/api.ts
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize all errors to a plain Error with a message string
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.replace("/signin");
    }
    const message =
      error.response?.data?.message ?? error.message ?? "Something went wrong";
    return Promise.reject(new Error(message));
  }
);
```

### API function files

Group API calls by resource. Each file in `src/api/` exports plain async functions.

```typescript
// src/api/people.ts
import { api } from "@/lib/api";
import type { Person, PersonUpdatePayload } from "@/types/api";

export async function fetchPerson(id: string): Promise<Person> {
  const { data } = await api.get<Person>(`/people/${id}`);
  return data;
}

export async function updatePerson(id: string, payload: PersonUpdatePayload): Promise<Person> {
  const { data } = await api.patch<Person>(`/people/${id}`, payload);
  return data;
}
```

Rules:
- One file per API resource: `people.ts`, `works.ts`, `auth.ts`
- Functions are plain `async` — no hooks, no state management, no side effects
- Always type the return value of every function
- Never put business logic in API functions — only HTTP calls

---

## Data Fetching (TanStack Query v5)

**All server data goes through TanStack Query.** Never `useState` + `useEffect` to fetch data.

### Setup

Wrap the app in `QueryClientProvider` in `src/main.tsx`.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
```

### Custom hooks pattern

Wrap every `useQuery` and `useMutation` in a custom hook. Never call them directly in a component.

```typescript
// src/hooks/usePerson.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPerson, updatePerson } from "@/api/people";
import type { PersonUpdatePayload } from "@/types/api";
import toast from "react-hot-toast";

export const PEOPLE_KEYS = {
  all: ["people"] as const,
  detail: (id: string) => ["people", id] as const,
};

export function usePerson(id: string) {
  return useQuery({
    queryKey: PEOPLE_KEYS.detail(id),
    queryFn: () => fetchPerson(id),
    enabled: !!id,
  });
}

export function useUpdatePerson(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PersonUpdatePayload) => updatePerson(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEYS.detail(id) });
      toast.success("Profile updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

Component usage:
```tsx
function ProfilePage() {
  const { id } = useParams();
  const { data: person, isLoading, isError } = usePerson(id!);

  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState />;

  return <ProfileView person={person} />;
}
```

### Loading and error state rules
- Always render a loading state. Never let the UI silently show nothing or stale data.
- Always render an error state. Never swallow a query error silently.
- For mutations, use `isPending` (not `isLoading`).
- Disable submit buttons while a mutation is `isPending`.

---

## State Management

### Decision tree — use this before reaching for any state tool

```
Where does this state live?
├── Local UI (open/close, hover, active tab)   → useState
├── Shared UI state that crosses routes         → Zustand
├── Data that comes from the API               → TanStack Query
└── Form state                                 → React Hook Form
```

**Never put server data in Zustand.** TanStack Query owns all server state: caching, loading, revalidation, background refetch.

**Never `useState` + `useEffect` for API data.** This pattern produces race conditions, stale data, and missing error states.

### Zustand — when to use

Use Zustand for:
- Auth state (token, current user ID, role)
- App-wide UI preferences (sidebar open/close, active modal)
- Multi-step wizard state that must survive navigation

```typescript
// src/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  userId: string | null;
  setAuth: (token: string, userId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      setAuth: (token, userId) => set({ token, userId }),
      clearAuth: () => set({ token: null, userId: null }),
    }),
    { name: "auth" }
  )
);
```

Store rules:
- One store per domain (`authStore.ts`, `uiStore.ts`)
- Keep stores small. If a store exceeds ~6 fields, split it.
- Use `persist` middleware only for state that must survive a page refresh.
- Access store state outside React with `useAuthStore.getState()` (axios interceptor).

---

## Forms (React Hook Form + Zod)

### Pattern: Zod schema first, always

Define the schema before the component. Derive the TypeScript type from it.

```tsx
// src/components/panel/ProfileForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdatePerson } from "@/hooks/usePerson";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().max(500, "Bio is too long").optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm({ userId }: { userId: string }) {
  const { mutate, isPending } = useUpdatePerson(userId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  return (
    <form onSubmit={handleSubmit((values) => mutate(values))}>
      <label>
        Name
        <input {...register("name")} />
        {errors.name && <span role="alert">{errors.name.message}</span>}
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
```

Rules:
- Zod schema is always defined outside the component (at module level)
- `zodResolver` is always used — never manual validation logic
- Show field-level errors below each input, not in a toast
- Disable the submit button while `isPending`
- Keep form-specific schemas co-located with their form component file

---

## UI & Styling

### Native HTML first — shadcn/ui only for complexity

The default is native HTML elements styled with Tailwind. Reach for shadcn/ui only when the component requires:
- Complex keyboard navigation (menus, comboboxes, dialogs)
- Non-trivial ARIA implementation (tooltips, popovers)
- Many interaction states that are error-prone to implement manually

```
Simple: button, input, label, select, textarea  → native HTML + Tailwind
Complex: Modal, Dropdown, Combobox, Tooltip      → shadcn/ui
```

When adding a shadcn component: `npx shadcn@latest add <component>`. The files are copied into `src/components/ui/` — they belong to this codebase, not a package.

### Color tokens — no hardcoded hex values

All colors come from design tokens in `src/index.css`. Never use hardcoded hex, rgb, or color names.

```tsx
// Correct
<div className="bg-paper text-ink border border-line rounded-card" />

// Wrong — never do this
<div style={{ backgroundColor: "#f5f4ef" }} />
<div className="bg-[#f5f4ef]" />
```

Available color tokens:
| Token | Role |
|---|---|
| `ink` | Primary text |
| `ink-2` | Secondary text |
| `muted` | Placeholder, disabled text |
| `paper` | Page background |
| `paper-2` | Subtle surface |
| `card` | Card background (white) |
| `line` | Borders, dividers |
| `line-strong` | Strong borders |
| `pop-pink` | Accent — use sparingly |
| `pop-lime` | Accent — use sparingly |
| `pop-violet` | Accent, focus ring |
| `pop-sky` | Accent — use sparingly |
| `pop-tangerine` | Accent — use sparingly |

Border radius tokens: `rounded-card` (1.25rem), `rounded-pill` (999px).

Animation easing: `ease-[var(--ease-pop)]` for UI transitions.

### Typography
- Headings: `font-display` (Space Grotesk)
- Body: `font-sans` (DM Sans)
- Never use system fonts directly.

### Responsive breakpoints

Test at: **360px, 390px, 768px, 1024px, 1440px**. No horizontal overflow at any breakpoint.

---

## Notifications (react-hot-toast)

Setup in `src/main.tsx` or the root layout:

```tsx
import { Toaster } from "react-hot-toast";
// Inside JSX:
<Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
```

Usage:
```typescript
import toast from "react-hot-toast";

toast.success("Profile saved");
toast.error(error.message);

// For long operations:
const id = toast.loading("Uploading…");
// later:
toast.dismiss(id);
toast.success("Done");
```

Rules:
- Show a success toast after every completed mutation.
- Show an error toast in every mutation `onError` — use `error.message` (already normalized by the axios interceptor).
- Use a loading toast only for operations that visibly take more than 1 second.
- Never toast for field validation errors — show those inline next to the input.
- Never use `alert()`.

---

## Error Handling

### Error Boundaries

Wrap route-level rendering in an error boundary so a crash in one route doesn't kill the whole app.

```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<PageLoader />}>
    <Outlet />
  </Suspense>
</ErrorBoundary>
```

### API errors

Errors from the API are normalized in the axios interceptor. By the time an error reaches a mutation's `onError` or a component, it is always a plain `Error` with a `.message` string. Do not check `error.response?.data?.message` in components or hooks — that is handled at the interceptor level.

### Rules
- Never silently swallow errors. Either show them to the user or re-throw.
- Never show raw error objects to users — always `.message`.
- 401 from the interceptor clears auth state and redirects to `/signin` automatically.
- 422 / validation errors from the API: show field-level messages if the API returns them; otherwise show the error message in a toast.

---

## Component Conventions

### File naming
| Thing | Convention | Example |
|---|---|---|
| Component | `PascalCase.tsx` | `ProfileCard.tsx` |
| Custom hook | `use` + camelCase + `.ts` | `usePerson.ts` |
| Utility function | `camelCase.ts` | `formatDate.ts` |
| Zustand store | `camelCase` + `Store.ts` | `authStore.ts` |
| API file | `camelCase.ts` (resource name) | `people.ts` |
| Type file | `camelCase.ts` | `api.ts` inside `types/` |

### Naming conventions
- Event handlers: prefix with `handle` → `handleSubmit`, `handleDelete`, `handleToggle`
- Boolean props: prefix with `is` or `has` → `isLoading`, `isDisabled`, `hasError`
- Async functions: use verb that describes the action → `fetchPerson`, `updateWork`, `deleteProfile`

### Component file structure
```
1. Imports (React, libraries, internal — separated by blank lines)
2. Zod schemas (if this file owns a form)
3. TypeScript types and interfaces
4. Component function
5. Tightly-coupled sub-components (if any)
```

### Comments
Write a comment only when the **why** is non-obvious: a hidden constraint, a workaround for a specific bug, a subtle invariant. Never comment what the code obviously does. No multi-line comment blocks.

### Component size
If a component exceeds ~150 lines, split it. Components that do data fetching + logic + rendering are a code smell — extract the logic into a hook.

---

## Performance

### Lazy loading

Lazy-load page components outside the critical path:
```tsx
const PanelPage = lazy(() => import("@/pages/PanelPage"));
```

### Memoization

Profile before optimizing. Add `useMemo`, `useCallback`, or `React.memo` only when:
- Profiling confirms a real performance problem
- A component renders very frequently with identical props (long lists)
- A computation is provably expensive

Adding them "just in case" adds overhead and cognitive cost without benefit.

### Long lists

For lists exceeding 50+ items rendered simultaneously, use `@tanstack/react-virtual`. Never render 200+ DOM nodes for a list.

---

## Anti-patterns — Never Do These

| Pattern | Why it's wrong | What to do instead |
|---|---|---|
| `useState` + `useEffect` for API data | Race conditions, stale data, no caching | TanStack Query |
| Server data in Zustand | Duplicates TanStack Query's cache | TanStack Query |
| `async` directly in `useEffect` | Memory leaks, missing cleanup | Custom hook or `useQuery` |
| Array index as `key` in mutable lists | Wrong component reuse on reorder/filter | Use stable ID from data |
| Hardcoded colors (`#hex`, `rgb()`) | Breaks the design system | Use token classes |
| `window.location.href` for internal nav | Full page reload, loses state | `useNavigate()` |
| `axios.get()` outside `src/lib/api.ts` | Bypasses auth and error interceptors | Use `api` instance |
| `any` type | Defeats TypeScript | Use `unknown`, then narrow |
| Silent errors (`catch(e) {}`) | User has no feedback | Toast or re-throw |
| `alert()` or raw `console.log` for UX | Not user-friendly | react-hot-toast |
| God component (fetch + logic + render) | Hard to test and maintain | Extract hook, split component |
| Import from `src/data/` for API data | Static fixtures, not real data | `src/api/` + TanStack Query |
