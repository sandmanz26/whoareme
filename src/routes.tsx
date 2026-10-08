/* eslint-disable react-refresh/only-export-components -- this is a route table, not a component module */
import { lazy } from "react"
import { createBrowserRouter } from "react-router-dom"
import { Shell } from "@/components/layout/Shell"
import { GuestRoute } from "@/components/layout/GuestRoute"
import { AuthRoute } from "@/components/layout/AuthRoute"
import { ModRoute } from "@/components/layout/ModRoute"
import { RouteError } from "@/components/layout/RouteError"

/**
 * Pages load on demand, so the first paint is not carrying the whole app. Each
 * import is a static string, so Vite resolves it at build time and a missing
 * file fails the build rather than the navigation.
 */
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })))
const WorkIndexPage = lazy(() =>
  import("@/pages/WorkIndexPage").then((m) => ({ default: m.WorkIndexPage })),
)
const WorkPage = lazy(() => import("@/pages/WorkPage").then((m) => ({ default: m.WorkPage })))
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
)
const PanelPage = lazy(() => import("@/pages/PanelPage").then((m) => ({ default: m.PanelPage })))
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })))
const SignInPage = lazy(() => import("@/pages/SignInPage").then((m) => ({ default: m.SignInPage })))
const AboutPage = lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })))
const ChangelogPage = lazy(() =>
  import("@/pages/ChangelogPage").then((m) => ({ default: m.ChangelogPage })),
)
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
)
const TermsPage = lazy(() => import("@/pages/TermsPage").then((m) => ({ default: m.TermsPage })))
const ContentPolicyPage = lazy(() =>
  import("@/pages/ContentPolicyPage").then((m) => ({ default: m.ContentPolicyPage })),
)
const AccessibilityPage = lazy(() =>
  import("@/pages/AccessibilityPage").then((m) => ({ default: m.AccessibilityPage })),
)
const VerifyPage = lazy(() => import("@/pages/VerifyPage").then((m) => ({ default: m.VerifyPage })))
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
)

export const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "work", element: <WorkIndexPage /> },
      { path: "work/:id", element: <WorkPage /> },
      { path: "people/:id", element: <ProfilePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "changelog", element: <ChangelogPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "content-policy", element: <ContentPolicyPage /> },
      { path: "accessibility", element: <AccessibilityPage /> },
      { path: "verify", element: <VerifyPage /> },
      {
        path: "signin",
        element: (
          <GuestRoute>
            <SignInPage />
          </GuestRoute>
        ),
      },
      {
        path: "reset",
        element: (
          <GuestRoute>
            <SignInPage />
          </GuestRoute>
        ),
      },
      {
        path: "panel",
        element: (
          <AuthRoute>
            <PanelPage />
          </AuthRoute>
        ),
      },
      {
        path: "panel/:section",
        element: (
          <AuthRoute>
            <PanelPage />
          </AuthRoute>
        ),
      },
      {
        path: "panel/:section/:entry",
        element: (
          <AuthRoute>
            <PanelPage />
          </AuthRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ModRoute>
            <AdminPage />
          </ModRoute>
        ),
      },
      {
        path: "admin/:tab",
        element: (
          <ModRoute>
            <AdminPage />
          </ModRoute>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
