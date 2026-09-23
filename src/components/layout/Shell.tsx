import { Outlet, ScrollRestoration, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { JoinModal } from "@/components/join/JoinModal"
import { ReportModal } from "@/components/admin/ReportModal"
import { BrowseProvider, useBrowse } from "@/context/BrowseContext"
import { AccountProvider } from "@/hooks/useAccount"
import { AdminProvider } from "@/hooks/useAdmin"

function Layout() {
  const navigate = useNavigate()
  const { joinOpen, closeJoin, reportOf, closeReport, openJoin } = useBrowse()

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <a
        href="#work"
        className="sr-only rounded-pill bg-ink px-4 py-2 text-paper focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to the work
      </a>
      <Navbar onJoin={openJoin} />
      <main>
        <Outlet />
      </main>
      <Footer />
      <JoinModal
        open={joinOpen}
        onClose={closeJoin}
        onOpenPanel={() => navigate("/panel")}
      />
      <ReportModal
        open={reportOf !== null}
        onClose={closeReport}
        target={reportOf?.target ?? null}
        label={reportOf?.label ?? ""}
      />
      <ScrollRestoration />
    </div>
  )
}

export function Shell() {
  return (
    <AccountProvider>
      <AdminProvider>
        <BrowseProvider>
          <Layout />
        </BrowseProvider>
      </AdminProvider>
    </AccountProvider>
  )
}
