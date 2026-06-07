import { Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { BalanceSummary } from "@shared/types";
import {
  DEFAULT_SEASON_DEPOSIT,
  guthabenProgressPercent,
  guthabenTone,
  guthabenVsDeposit,
} from "@shared/balance";

interface BalanceBreakdownProps {
  balance?: BalanceSummary;
  seasonName?: string;
  compact?: boolean;
}

export function BalanceBreakdown({ balance, seasonName, compact }: BalanceBreakdownProps) {
  const deposit = balance?.startBalance ?? DEFAULT_SEASON_DEPOSIT;
  const guthaben = balance?.balance ?? deposit;
  const penalties = balance?.penaltiesSum ?? 0;
  const goodDeeds = balance?.goodDeedsSum ?? 0;
  const tone = guthabenTone(guthaben, deposit);
  const progress = guthabenProgressPercent(guthaben, deposit);
  const vsDeposit = guthabenVsDeposit(guthaben, deposit);

  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";

  const progressHint =
    guthaben < 0
      ? "Nachzahlung an die Mannschaftskasse nötig"
      : vsDeposit > 0
        ? `${formatEuro(vsDeposit)} über deiner Einzahlung`
        : guthaben === deposit
          ? "Unverändert seit Saisonstart"
          : `Noch ${formatEuro(guthaben)} von ${formatEuro(deposit)} Einzahlung`;

  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("space-y-3", compact ? "p-4" : "p-5")}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Wallet size={14} />
          Kassen-Guthaben {seasonName && `· ${seasonName}`}
        </div>

        <div className={cn("font-black tabular-nums", compact ? "text-4xl" : "text-5xl", toneClass)}>
          {formatEuro(guthaben)}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Jeder Spieler zahlt {formatEuro(deposit)} zu Saisonbeginn ein. Strafen senken dein Guthaben,
          Gute Taten erhöhen es. Am Saisonende erhältst du den Rest zurück.
        </p>

        <div className="rounded-lg border border-border bg-background/40 divide-y divide-border text-sm">
          <Row label="Saison-Einzahlung" value={formatEuro(deposit)} />
          <Row label="Strafen" value={`−${formatEuro(penalties)}`} negative={penalties > 0} />
          <Row label="Gute Taten" value={`+${formatEuro(goodDeeds)}`} positive={goodDeeds > 0} />
          <Row label="Dein Guthaben" value={formatEuro(guthaben)} bold />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressHint}</span>
            <span>{Math.round(progress)} %</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                tone === "destructive"
                  ? "bg-destructive"
                  : tone === "success"
                    ? "bg-gradient-to-r from-primary to-success"
                    : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown size={12} /> Strafen gesamt
              </div>
              <div className="text-lg font-semibold tabular-nums text-destructive">
                −{formatEuro(penalties)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp size={12} /> Gute Taten gesamt
              </div>
              <div className="text-lg font-semibold tabular-nums text-success">
                +{formatEuro(goodDeeds)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  negative,
  positive,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className={cn("text-muted-foreground", bold && "font-medium text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          bold && "font-bold",
          negative && "text-destructive",
          positive && "text-success",
        )}
      >
        {value}
      </span>
    </div>
  );
}
