import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Check, Clock, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatches } from "@/api/matches";
import { useMyBets, useSubmitBet } from "@/api/bets";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatTime } from "@/lib/format";
import type { Match, Bet } from "@shared/types";

export function TippenPage() {
  const { data: matches } = useMatches();
  const { data: bets } = useMyBets();

  const groups = useMemo(() => {
    const now = Date.now();
    const upcoming = (matches ?? [])
      .filter((m) => new Date(m.kickoff).getTime() > now)
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    const finished = (matches ?? [])
      .filter((m) => m.result)
      .sort((a, b) => b.kickoff.localeCompare(a.kickoff));
    return { upcoming, finished };
  }, [matches]);

  const betFor = (matchId: string) => bets?.find((b) => b.matchId === matchId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tipprunde</h1>
        <Link to="/tippen/tabelle">
          <Button size="sm" variant="outline">
            <Trophy size={14} /> Tabelle
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 text-xs space-y-1">
          <div className="font-semibold text-sm">Punktesystem</div>
          <div className="text-muted-foreground">
            3 Punkte = exaktes Ergebnis · 2 = richtige Tordifferenz · 1 = richtige Tendenz · 0 = falsch
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipps abgeben
        </h2>
        {groups.upcoming.length === 0 && (
          <Card>
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              Keine kommenden Spiele bekannt. FuPa wird automatisch synchronisiert.
            </CardContent>
          </Card>
        )}
        {groups.upcoming.map((m) => (
          <BetCard key={m.id} match={m} bet={betFor(m.id)} />
        ))}
      </section>

      {groups.finished.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vergangene Tipps
          </h2>
          {groups.finished.slice(0, 10).map((m) => (
            <ResultCard key={m.id} match={m} bet={betFor(m.id)} />
          ))}
        </section>
      )}
    </div>
  );
}

function BetCard({ match, bet }: { match: Match; bet?: Bet }) {
  const submit = useSubmitBet();
  const { toast } = useToast();
  const [home, setHome] = useState<string>(bet ? String(bet.homeGoals) : "");
  const [away, setAway] = useState<string>(bet ? String(bet.awayGoals) : "");
  const [saved, setSaved] = useState(!!bet);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(home);
    const a = Number(away);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) {
      toast({ title: "Ungueltige Zahlen", variant: "destructive" });
      return;
    }
    try {
      await submit.mutateAsync({ matchId: match.id, homeGoals: h, awayGoals: a });
      setSaved(true);
      toast({ title: "Tipp gespeichert", variant: "success" });
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{formatDate(match.kickoff)} {formatTime(match.kickoff)}</span>
          <Badge variant="outline" className="text-[10px]">
            T{match.team}
          </Badge>
          <span className="truncate">{match.league}</span>
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <div className="flex-1 text-right text-sm font-medium">
            {match.homeAway === "home" ? "SVP" : match.opponent}
          </div>
          <input
            type="number"
            min="0"
            max="20"
            value={home}
            onChange={(e) => {
              setHome(e.target.value);
              setSaved(false);
            }}
            className="h-11 w-14 rounded-lg border border-input bg-background px-2 text-center text-lg font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground">:</span>
          <input
            type="number"
            min="0"
            max="20"
            value={away}
            onChange={(e) => {
              setAway(e.target.value);
              setSaved(false);
            }}
            className="h-11 w-14 rounded-lg border border-input bg-background px-2 text-center text-lg font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex-1 text-left text-sm font-medium">
            {match.homeAway === "home" ? match.opponent : "SVP"}
          </div>
        </form>
        <div className="flex items-center gap-2">
          {saved && bet && (
            <Badge variant="success" className="text-[10px]">
              <Check size={10} className="mr-1" /> Gespeichert
            </Badge>
          )}
          <div className="flex-1" />
          <Button size="sm" type="button" loading={submit.isPending} onClick={onSubmit}>
            Tipp speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultCard({ match, bet }: { match: Match; bet?: Bet }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Target size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {match.homeAway === "home" ? "SVP" : match.opponent} vs{" "}
            {match.homeAway === "home" ? match.opponent : "SVP"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(match.kickoff)} · T{match.team}
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="font-mono text-sm">
            {match.result ? `${match.result.homeGoals}:${match.result.awayGoals}` : "?"}
          </div>
          {bet ? (
            <div className="text-[10px] text-muted-foreground">
              Tipp {bet.homeGoals}:{bet.awayGoals}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground">kein Tipp</div>
          )}
          {bet?.points !== undefined && (
            <Badge
              variant={bet.points === 3 ? "success" : bet.points > 0 ? "warning" : "outline"}
              className="text-[10px]"
            >
              {bet.points} Pkt
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
