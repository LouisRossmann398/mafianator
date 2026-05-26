import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/cn";

const tabs = [
  { to: "/admin", label: "Übersicht", end: true },
  { to: "/admin/players", label: "Spieler" },
  { to: "/admin/catalog", label: "Katalog" },
  { to: "/admin/matches", label: "Spiele" },
  { to: "/admin/birthdays", label: "Geburtstage" },
  { to: "/admin/users", label: "Logins" },
  { to: "/admin/season", label: "Saison" },
];

export function AdminLayout() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Verwaltung</h1>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
}
