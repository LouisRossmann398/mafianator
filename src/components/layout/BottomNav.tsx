import { NavLink } from "react-router-dom";
import { Home, Coins, Target, Calendar, User } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/strafen", label: "Strafen", icon: Coins },
  { to: "/tippen", label: "Tippen", icon: Target },
  { to: "/kalender", label: "Kalender", icon: Calendar },
  { to: "/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
