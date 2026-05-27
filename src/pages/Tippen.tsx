import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Shield,
  History,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatches, useTriggerScrape } from "@/api/matches";
import { useMyBets, useSubmitBet, useSubmitBetsBulk } from "@/api/bets";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { LeagueKey, Match, Bet } from "@shared/types";
import {
  defaultRoundIndex,
  groupMatchesByRound,
  isMatchFinished,
  isMatchOpenForTips,
  pointsForBet,
  sortedRounds,
  statsForRound,
} from "@shared/betting";
import { LEAGUE_LABELS } from "@shared/leagues";
import { randomRealisticScore } from "@shared/random-scores";

const LEAGUE_TABS: { key: LeagueKey; label: string; short: string }[] = [
  { key: "kreisklasse", label: "Kreisklasse", short: "KK" },
  { key: "c-klasse", label: "C-Klasse", short: "CK" },
];

function pointsBadgeVariant(points: number): "success" | "warning" | "outline" {
  if (points === 3) return "success";
  if (points > 0) return "warning";
  return "outline";
}

export function TippenPage() {
  const { data, isLoading, isFetching, refetch } = useMatches();
  const matches = data?.matches;
  const scrapeStatus = data?.scrapeStatus;
  const triggerScrape = useTriggerScrape();
  const { data: bets } = useMyBets();
  const [leagueKey, setLeagueKey] = useState<LeagueKey>("kreisklasse");
  const [roundIdx, setRoundIdx] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});

  const rounds = useMemo(
    () => sortedRounds(matches ?? [], leagueKey),
    [matches, leagueKey],
  );

  useEffect(() => {
    if (!matches?.length) return;
    setRoundIdx(defaultRoundIndex(rounds, matches, leagueKey));
  }, [leagueKey, matches, rounds]);

  const currentRound = rounds[roundIdx];
  const roundMatches = useMemo(() => {
    if (currentRound == null) return [];
    return groupMatchesByRound(matches ?? [], leagueKey).get(currentRound) ?? [];
  }, [matches, leagueKey, currentRound]);

  const betFor = (matchId: string) => bets?.find((b) => b.matchId === matchId);
  const roundStats = useMemo(
    () => statsForRound(roundMatches, betFor),
    [roundMatches, bets],
  );

  const svpMatches = roundMatches.filter((m) => m.involvesSvp);
  const tippableMatches = roundMatches.filter((m) => m.tippable);
  const openTippable = tippableMatches.filter(isMatchOpenForTips);
  const finishedTippable = tippableMatches.filter(
    (m) => !isMatchOpenForTips(m) && isMatchFinished(m),
  );

  const bulk = useSubmitBetsBulk();
  const { toast } = useToast();

  const onKiTipps = async () => {
    if (openTippable.length === 0) {
      toast({ title: "Keine offenen Spiele in diesem Spieltag", variant: "destructive" });
      return;
    }
    const payload = openTippable.map((m) => {
      const score = randomRealisticScore();
      return { matchId: m.id, homeGoals: score.homeGoals, awayGoals: score.awayGoals };
    });
    const nextDrafts = { ...drafts };
    for (const p of payload) {
      nextDrafts[p.matchId] = { home: String(p.homeGoals), away: String(p.awayGoals) };
    }
    setDrafts(nextDrafts);
    try {
      const res = await bulk.mutateAsync(payload);
      toast({
        title: "KI-Tipps gespeichert",
        description: `${res.bets.length} Tipps${res.errors?.length ? `, ${res.errors.length} übersprungen` : ""}`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Tipprunde</h1>
        <Link to="/tippen/tabelle">
          <Button size="sm" variant="outline">
            <Trophy size={14} /> Gesamttabelle
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold text-sm">So funktioniert&apos;s</div>
          <p className="text-muted-foreground leading-relaxed">
            Mit <strong>← →</strong> alle Spieltage durchblättern – auch vergangene mit Ergebnis
            und deinen Punkten. Tippe nur Spiele ohne SV Petershausen.
          </p>
          <div className="text-muted-foreground">
            3 Pkt = exakt · 2 = Tordifferenz · 1 = Tendenz · 0 = falsch
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {LEAGUE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setLeagueKey(tab.key)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
              leagueKey === tab.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <div>{tab.label}</div>
            <div className="text-[10px] font-normal opacity-80">{LEAGUE_LABELS[tab.key]}</div>
          </button>
        ))}
      </div>

      {rounds.length > 0 && currentRound != null && (
        <>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={roundIdx <= 0}
              onClick={() => setRoundIdx((i) => Math.max(0, i - 1))}
              aria-label="Vorheriger Spieltag"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="flex-1 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Spieltag</div>
              <div className="text-lg font-bold">{currentRound}</div>
              <div className="text-[10px] text-muted-foreground">
                {roundIdx + 1} / {rounds.length}
              </div>
            </div>
            <Button
              size="icon"
              variant="outline"
              disabled={roundIdx >= rounds.length - 1}
              onClick={() => setRoundIdx((i) => Math.min(rounds.length - 1, i + 1))}
              aria-label="Nächster Spieltag"
            >
              <ChevronRight size={18} />
            </Button>
          </div>

          <Card
            className={cn(
              roundStats.finished ? "border-muted-foreground/30" : "border-primary/40",
            )}
          >
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                {roundStats.finished ? (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <History size={10} /> Beendet
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px]">
                    Offen / laufend
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  {roundStats.totalGames} tippbare Spiele
                </span>
              </div>
              {roundStats.tipped > 0 && (
                <div className="font-semibold tabular-nums">
                  Deine Punkte:{" "}
                  <span className="text-primary">{roundStats.points}</span>
                  <span className="text-muted-foreground font-normal text-xs">
                    {" "}
                    ({roundStats.evaluated}/{roundStats.tipped} ausgewertet)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {openTippable.length > 0 && (
        <Button
          className="w-full"
          variant="secondary"
          loading={bulk.isPending}
          onClick={onKiTipps}
        >
          <Sparkles size={16} className="mr-2" />
          KI Tipps ({openTippable.length} Spiele)
        </Button>
      )}

      {(isLoading || isFetching) && !matches?.length && (
        <Card>
          <CardContent className="p-5 text-center text-sm text-muted-foreground space-y-2">
            <p>Spiele werden von FuPa geladen…</p>
            <p className="text-xs">Beim ersten Mal kann das bis zu einer Minute dauern.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isFetching && rounds.length === 0 && (
        <Card>
          <CardContent className="p-5 text-center text-sm text-muted-foreground space-y-3">
            <p>Noch keine Ligaspiele für {LEAGUE_LABELS[leagueKey]}.</p>
            {scrapeStatus?.lastError && (
              <p className="text-xs text-destructive/90">FuPa: {scrapeStatus.lastError}</p>
            )}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={triggerScrape.isPending}
                onClick={() => triggerScrape.mutate()}
              >
                Spiele von FuPa laden
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {svpMatches.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield size={12} /> SV Petershausen (nur Anzeige)
          </h2>
          {svpMatches.map((m) => (
            <SvpMatchCard key={m.id} match={m} />
          ))}
        </section>
      )}

      {finishedTippable.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History size={12} /> Ergebnisse ({finishedTippable.length})
          </h2>
          {finishedTippable.map((m) => (
            <FinishedBetCard key={m.id} match={m} bet={betFor(m.id)} />
          ))}
        </section>
      )}

      {openTippable.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tipps abgeben ({openTippable.length})
          </h2>
          {openTippable.map((m) => (
            <BetCard
              key={m.id}
              match={m}
              bet={betFor(m.id)}
              draft={drafts[m.id]}
              onDraftChange={(d) => setDrafts((prev) => ({ ...prev, [m.id]: d }))}
            />
          ))}
        </section>
      )}

      {tippableMatches.length === 0 && rounds.length > 0 && (
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            In diesem Spieltag keine tippbaren Begegnungen (nur SVP-Spiele).
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SvpMatchCard({ match }: { match: Match }) {
  const finished = !!match.result;
  const open = !finished && new Date(match.kickoff).getTime() > Date.now();

  return (
    <Card className="border-dashed opacity-90">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Clock size={12} />
          <span>
            {formatDate(match.kickoff)} {formatTime(match.kickoff)}
          </span>
          {match.team && (
            <Badge variant="outline" className="text-[10px]">
              {match.team === 1 ? "1. Mannschaft" : "2. Mannschaft"}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] gap-1">
            <Lock size={10} /> nicht tippbar
          </Badge>
        </div>
        <MatchTeams match={match} />
        {finished && match.result && (
          <div className="text-center font-mono text-lg font-semibold">
            Ergebnis {match.result.homeGoals}:{match.result.awayGoals}
          </div>
        )}
        {open && (
          <p className="text-center text-[11px] text-muted-foreground">Noch nicht gespielt</p>
        )}
      </CardContent>
    </Card>
  );
}

function MatchTeams({ match }: { match: Match }) {
  return (
    <div className="text-sm font-medium text-center leading-snug">
      {match.homeTeamName}{" "}
      <span className="text-muted-foreground font-normal">vs</span> {match.awayTeamName}
    </div>
  );
}

function FinishedBetCard({ match, bet }: { match: Match; bet?: Bet }) {
  const points = pointsForBet(bet, match);

  return (
    <Card className="bg-secondary/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>
            {formatDate(match.kickoff)} {formatTime(match.kickoff)}
          </span>
          <Badge variant="outline" className="text-[10px]">
            Beendet
          </Badge>
        </div>
        <MatchTeams match={match} />
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-background/60 p-2">
            <div className="text-muted-foreground mb-1">Dein Tipp</div>
            {bet ? (
              <div className="font-mono text-base font-bold">
                {bet.homeGoals}:{bet.awayGoals}
              </div>
            ) : (
              <div className="text-muted-foreground">—</div>
            )}
          </div>
          <div className="rounded-lg bg-background/60 p-2">
            <div className="text-muted-foreground mb-1">Ergebnis</div>
            {match.result && (
              <div className="font-mono text-base font-bold">
                {match.result.homeGoals}:{match.result.awayGoals}
              </div>
            )}
          </div>
          <div className="rounded-lg bg-background/60 p-2">
            <div className="text-muted-foreground mb-1">Punkte</div>
            {bet ? (
              points !== undefined ? (
                <Badge variant={pointsBadgeVariant(points)} className="font-mono text-base px-2">
                  {points}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-[10px]">offen</span>
              )
            ) : (
              <span className="text-muted-foreground text-[10px]">kein Tipp</span>
            )}
          </div>
        </div>
        {!bet && (
          <p className="text-center text-[10px] text-muted-foreground">Du hast nicht getippt.</p>
        )}
      </CardContent>
    </Card>
  );
}

function BetCard({
  match,
  bet,
  draft,
  onDraftChange,
}: {
  match: Match;
  bet?: Bet;
  draft?: { home: string; away: string };
  onDraftChange: (d: { home: string; away: string }) => void;
}) {
  const submit = useSubmitBet();
  const { toast } = useToast();
  const [home, setHome] = useState(draft?.home ?? (bet ? String(bet.homeGoals) : ""));
  const [away, setAway] = useState(draft?.away ?? (bet ? String(bet.awayGoals) : ""));
  const [saved, setSaved] = useState(!!bet);

  useEffect(() => {
    if (draft) {
      setHome(draft.home);
      setAway(draft.away);
      setSaved(false);
    }
  }, [draft]);

  useEffect(() => {
    if (bet && !draft) {
      setHome(String(bet.homeGoals));
      setAway(String(bet.awayGoals));
      setSaved(true);
    }
  }, [bet, draft]);

  const updateHome = (v: string) => {
    setHome(v);
    setSaved(false);
    onDraftChange({ home: v, away });
  };
  const updateAway = (v: string) => {
    setAway(v);
    setSaved(false);
    onDraftChange({ home, away: v });
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const h = Number(home);
    const a = Number(away);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) {
      toast({ title: "Ungültige Zahlen", variant: "destructive" });
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
          <span>
            {formatDate(match.kickoff)} {formatTime(match.kickoff)}
          </span>
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <div className="flex-1 text-right text-xs sm:text-sm font-medium leading-tight">
            {match.homeTeamName}
          </div>
          <input
            type="number"
            min="0"
            max="20"
            value={home}
            onChange={(e) => updateHome(e.target.value)}
            className="h-11 w-14 rounded-lg border border-input bg-background px-2 text-center text-lg font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground">:</span>
          <input
            type="number"
            min="0"
            max="20"
            value={away}
            onChange={(e) => updateAway(e.target.value)}
            className="h-11 w-14 rounded-lg border border-input bg-background px-2 text-center text-lg font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex-1 text-left text-xs sm:text-sm font-medium leading-tight">
            {match.awayTeamName}
          </div>
        </form>
        <div className="flex items-center gap-2">
          {saved && bet && (
            <Badge variant="success" className="text-[10px]">
              <Check size={10} className="mr-1" /> Gespeichert
            </Badge>
          )}
          <div className="flex-1" />
          <Button size="sm" type="button" loading={submit.isPending} onClick={() => onSubmit()}>
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
