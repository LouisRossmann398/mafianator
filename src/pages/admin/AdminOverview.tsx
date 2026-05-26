import { Link } from "react-router-dom";
import { Users, ListChecks, Calendar, Cake, Lock, RotateCcw, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useBalances, usePenalties } from "@/api/penalties";
import { useMatches } from "@/api/matches";
import { useUsers } from "@/api/users";
import { formatEuro } from "@/lib/format";

export function AdminOverview() {
  const { data: balances } = useBalances();
  const { data: penalties } = usePenalties();
  const { data: matches } = useMatches();
  const { data: users } = useUsers();

  const open = (penalties ?? []).filter((p) => p.status === "open").length;
  const collected = (penalties ?? []).filter((p) => p.status === "paid").length;
  const totalDebt = Object.values(balances?.balances ?? {}).reduce(
    (sum, b) => sum + Math.max(0, -b.balance),
    0,
  );

  const tiles = [
    { to: "/admin/players", label: "Spieler", icon: Users, count: balances?.players.length },
    { to: "/admin/catalog", label: "Strafenkatalog", icon: ListChecks },
    { to: "/admin/matches", label: "Spiele", icon: Trophy, count: matches?.length },
    { to: "/admin/birthdays", label: "Geburtstage", icon: Cake },
    { to: "/admin/users", label: "Logins", icon: Lock, count: users?.length },
    { to: "/admin/season", label: "Saison", icon: RotateCcw },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Offene Strafen</div>
            <div className="text-xl font-bold">{open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Bezahlt</div>
            <div className="text-xl font-bold">{collected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Schulden gesamt</div>
            <div className="text-xl font-bold text-destructive">{formatEuro(totalDebt)}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ to, label, icon: Icon, count }) => (
          <Link key={to} to={to}>
            <Card className="h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon size={20} className="text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{label}</div>
                  {typeof count === "number" && (
                    <div className="text-xs text-muted-foreground">{count} Einträge</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground flex items-center gap-2">
          <Calendar size={14} />
          FuPa-Synchronisation läuft stündlich, Tipp-Auswertung alle 2 Stunden. Du kannst beides
          manuell im Bereich „Spiele" anstoßen.
        </CardContent>
      </Card>
    </div>
  );
}
