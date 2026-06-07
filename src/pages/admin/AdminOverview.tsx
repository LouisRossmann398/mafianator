import { Link } from "react-router-dom";
import { Users, ListChecks, Calendar, Cake, Lock, RotateCcw, Trophy, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBalances, usePenalties } from "@/api/penalties";
import { useMatches } from "@/api/matches";
import { useBfvSync, useLeagueMatches } from "@/api/league-matches";
import { useUsers } from "@/api/users";
import { useToast } from "@/components/ui/toast";
import { TIP_SEASON_LABEL } from "@shared/leagues";
import { formatEuro } from "@/lib/format";

export function AdminOverview() {
  const { data: balances } = useBalances();
  const { data: penalties } = usePenalties();
  const { data: matches } = useMatches();
  const { data: leagueData } = useLeagueMatches();
  const bfvSync = useBfvSync();
  const { data: users } = useUsers();
  const { toast } = useToast();

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
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="text-muted-foreground flex items-center gap-2">
            <Calendar size={14} />
            SVP-Spiele für den Kalender werden unter „Spiele" manuell gepflegt.
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-sm text-foreground">Tipprunde {TIP_SEASON_LABEL}</div>
              <div className="text-muted-foreground">
                {leagueData?.matches.length ?? 0} Ligaspiele vom BFV
                {leagueData?.scrapeStatus?.lastRun &&
                  ` · Sync ${new Date(leagueData.scrapeStatus.lastRun).toLocaleString("de-DE")}`}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={bfvSync.isPending}
              onClick={() =>
                bfvSync.mutate(undefined, {
                  onSuccess: (res) =>
                    toast({
                      title: "BFV-Sync OK",
                      description: `${res.matchesTotal} Spiele (${res.withResults} mit Ergebnis)`,
                      variant: "success",
                    }),
                  onError: (e) =>
                    toast({
                      title: "BFV-Sync fehlgeschlagen",
                      description: e instanceof Error ? e.message : "Unbekannt",
                      variant: "destructive",
                    }),
                })
              }
            >
              <RefreshCw size={14} /> BFV laden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
