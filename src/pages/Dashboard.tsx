import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Coins,
  Calendar,
  Cake,
  Target,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/api/auth";
import { useBalances, useFeed, usePenalties } from "@/api/penalties";
import { formatDate, formatDateTime, formatEuro, relativeDays } from "@/lib/format";
import { useUpcomingMatches } from "@/api/matches";
import { useBirthdays } from "@/api/birthdays";
import { usePlayers } from "@/api/players";
import { cn } from "@/lib/cn";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: balanceData } = useBalances();
  const balance = balanceData?.balances?.[user?.playerId ?? ""];
  const season = balanceData?.season;
  const { data: penalties } = usePenalties(user?.playerId);
  const { data: feed } = useFeed({ limit: 5 });
  const { data: matches } = useUpcomingMatches();
  const { data: birthdays } = useBirthdays();
  const { data: players } = usePlayers();

  const openPenalties = (penalties ?? []).filter((p) => p.status === "open");
  const nextMatch = matches?.[0];
  const nextBirthday = (birthdays ?? [])
    .map((b) => {
      const today = new Date();
      const next = nextBirthdayDate(b.date, today);
      return { ...b, nextDate: next };
    })
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())[0];
  const nextBirthdayPlayer = nextBirthday
    ? players?.find((p) => p.id === nextBirthday.playerId)
    : null;

  const balanceColor =
    (balance?.balance ?? -100) >= 0
      ? "text-success"
      : (balance?.balance ?? -100) < -100
        ? "text-destructive"
        : "text-foreground";

  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      (((balance?.balance ?? season?.startBalance ?? -100) - (season?.startBalance ?? -100)) /
        Math.abs(season?.startBalance ?? -100)) *
        100,
    ),
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted-foreground">Servus {user?.displayName}.</div>
        <h1 className="text-2xl font-bold">Dein Stand</h1>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Wallet size={14} /> Saldo {season?.name && `· ${season.name}`}
          </div>
          <div className={cn("text-5xl font-black tabular-nums", balanceColor)}>
            {formatEuro(balance?.balance ?? season?.startBalance ?? -100)}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Start: {formatEuro(season?.startBalance ?? -100)}</span>
              <span>0 €</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown size={12} /> Strafen
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {formatEuro(balance?.penaltiesSum ?? 0)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp size={12} /> Gute Taten
              </div>
              <div className="text-lg font-semibold tabular-nums text-success">
                +{formatEuro(balance?.goodDeedsSum ?? 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {openPenalties.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins size={16} /> Offene Strafen
            </CardTitle>
            <Link to="/strafen" className="text-xs text-primary">
              alle
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {openPenalties.slice(0, 3).map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                  <div className="font-bold tabular-nums text-destructive">
                    -{formatEuro(p.amount)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {nextMatch && (
          <Link to="/kalender">
            <Card className="h-full">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar size={12} /> Nächstes Spiel
                </div>
                <div className="text-sm font-semibold leading-tight">
                  {nextMatch.homeAway === "home" ? "SVP" : nextMatch.opponent}
                  {" vs "}
                  {nextMatch.homeAway === "home" ? nextMatch.opponent : "SVP"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(nextMatch.kickoff)} · Team {nextMatch.team}
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
        {nextBirthdayPlayer && nextBirthday && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cake size={12} /> Nächster Geburtstag
              </div>
              <div className="text-sm font-semibold leading-tight">{nextBirthdayPlayer.name}</div>
              <div className="text-xs text-muted-foreground">
                in {relativeDays(nextBirthday.nextDate)} Tagen
              </div>
            </CardContent>
          </Card>
        )}
        <Link to="/tippen">
          <Card className="h-full">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Target size={12} /> Tipprunde
              </div>
              <div className="text-sm font-semibold leading-tight">Jetzt tippen</div>
              <div className="text-xs text-muted-foreground">Spiele 1. + 2. Mannschaft</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tippen/tabelle">
          <Card className="h-full">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy size={12} /> Tabelle
              </div>
              <div className="text-sm font-semibold leading-tight">Tipper-Rangliste</div>
              <div className="text-xs text-muted-foreground">Wer wird Meister?</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {feed && feed.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {feed.map((item) => {
                const p = players?.find((x) => x.id === item.playerId);
                return (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                        item.amount > 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {p?.jerseyNumber ?? p?.name.charAt(0) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        <span className="font-medium">{p?.name ?? item.playerId}</span> · {item.reason}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-semibold tabular-nums text-sm",
                        item.amount > 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {item.amount > 0 ? "+" : ""}
                      {formatEuro(item.amount)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function nextBirthdayDate(birthdate: string, today: Date): Date {
  const d = new Date(birthdate);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next;
}
