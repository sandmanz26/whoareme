import { createBrowserRouter } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";
import { HomePage } from "@/pages/HomePage";
import { WorkIndexPage } from "@/pages/WorkIndexPage";
import { WorkPage } from "@/pages/WorkPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { PanelPage } from "@/pages/PanelPage";
import { AdminPage } from "@/pages/AdminPage";
import { SignInPage } from "@/pages/SignInPage"
import { GuestRoute } from "@/components/layout/GuestRoute";
import { AboutPage } from "@/pages/AboutPage";
import { ChangelogPage } from "@/pages/ChangelogPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { ContentPolicyPage } from "@/pages/ContentPolicyPage";
import { AccessibilityPage } from "@/pages/AccessibilityPage";
import { VerifyPage } from "@/pages/VerifyPage"
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <Shell />,
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
      { path: "signin", element: <GuestRoute><SignInPage /></GuestRoute> },
      { path: "reset", element: <GuestRoute><SignInPage /></GuestRoute> },
      { path: "panel", element: <PanelPage /> },
      { path: "panel/:section", element: <PanelPage /> },
      { path: "panel/:section/:entry", element: <PanelPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "admin/:tab", element: <AdminPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
