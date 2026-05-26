import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./api/auth";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { PenaltiesPage } from "./pages/Penalties";
import { TippenPage } from "./pages/Tippen";
import { KalenderPage } from "./pages/Kalender";
import { ProfilPage } from "./pages/Profil";
import { TabellePage } from "./pages/Tabelle";
import { WheelHistoryPage } from "./pages/WheelHistory";
import { GamblePage } from "./pages/Gamble";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminPlayers } from "./pages/admin/Players";
import { AdminCatalog } from "./pages/admin/Catalog";
import { AdminSeason } from "./pages/admin/Season";
import { AdminMatches } from "./pages/admin/Matches";
import { AdminBirthdays } from "./pages/admin/Birthdays";
import { AdminUsers } from "./pages/admin/Users";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: ("admin" | "treasurer")[];
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as "admin" | "treasurer")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="strafen" element={<PenaltiesPage />} />
        <Route path="strafen/:id/zocken" element={<GamblePage />} />
        <Route path="tippen" element={<TippenPage />} />
        <Route path="tippen/tabelle" element={<TabellePage />} />
        <Route path="kalender" element={<KalenderPage />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="gluecksrad/historie" element={<WheelHistoryPage />} />
        <Route
          path="admin"
          element={
            <RequireRole roles={["admin", "treasurer"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="matches" element={<AdminMatches />} />
          <Route path="birthdays" element={<AdminBirthdays />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="season" element={<AdminSeason />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
