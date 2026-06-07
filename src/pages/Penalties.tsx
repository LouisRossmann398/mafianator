import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trophy, CircleDot, Coins, AlertTriangle, Check, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/api/auth";
import { usePlayers } from "@/api/players";
import {
  useBalances,
  usePenalties,
  usePatchPenalty,
  useGoodDeeds,
} from "@/api/penalties";
import { BalanceBreakdown } from "@/components/BalanceBreakdown";
import { PenaltyAdd } from "@/components/PenaltyAdd";
import { formatDateTime, formatEuro } from "@/lib/format";
import type { Penalty } from "@shared/types";
import { guthabenTone } from "@shared/balance";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function PenaltiesPage() {
  const { user } = useAuth();
  const isTreasurer = user?.role === "admin" || user?.role === "treasurer";
  const [dialog, setDialog] = useState<null | "penalty" | "good-deed">(null);
  const [tab, setTab] = useState<"meine" | "alle">("meine");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mannschaftskasse</h1>
        {isTreasurer && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDialog("good-deed")}>
              <Plus size={14} /> Gute Tat
            </Button>
            <Button size="sm" onClick={() => setDialog("penalty")}>
              <Plus size={14} /> Strafe
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("meine")}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
            tab === "meine"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Meine Strafen
        </button>
        <button
          onClick={() => setTab("alle")}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
            tab === "alle"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Mannschaft
        </button>
      </div>

      {tab === "meine" ? <MeineSection /> : <MannschaftSection isTreasurer={isTreasurer} />}

      <PenaltyAdd open={!!dialog} onClose={() => setDialog(null)} mode={dialog ?? "penalty"} />
    </div>
  );
}

function MeineSection() {
  const { user } = useAuth();
  const { data: penalties } = usePenalties(user?.playerId);
  const { data: goodDeeds } = useGoodDeeds(user?.playerId);
  const { data: balanceData } = useBalances();
  const balance = balanceData?.balances?.[user?.playerId ?? ""];
  const season = balanceData?.season;

  const open = (penalties ?? []).filter((p) => p.status === "open");
  const accepted = (penalties ?? []).filter((p) => p.status === "accepted");
  const closed = (penalties ?? []).filter(
    (p) => p.status !== "open" && p.status !== "accepted",
  );

  return (
    <div className="space-y-4">
      <BalanceBreakdown balance={balance} seasonName={season?.name} compact />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Offene Strafen</h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              Keine offenen Strafen. Saubere Sache!
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {open.map((p) => (
              <PenaltyOpenCard key={p.id} penalty={p} />
            ))}
          </ul>
        )}
      </div>

      {accepted.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Akzeptiert – Zahlung ausstehend
          </h2>
          <ul className="space-y-2">
            {accepted.map((p) => (
              <PenaltyAcceptedCard key={p.id} penalty={p} />
            ))}
          </ul>
        </div>
      )}

      {(closed.length > 0 || (goodDeeds && goodDeeds.length > 0)) && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Verlauf</h2>
          <ul className="space-y-2">
            {closed.map((p) => (
              <PenaltyHistoryCard key={p.id} penalty={p} />
            ))}
            {goodDeeds?.map((g) => (
              <Card key={g.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
                    <Trophy size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{g.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(g.createdAt)}
                    </div>
                  </div>
                  <div className="text-success font-semibold">+{formatEuro(g.amount)}</div>
                </CardContent>
              </Card>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MannschaftSection({ isTreasurer }: { isTreasurer: boolean }) {
  const { data: balanceData, isLoading } = useBalances();
  const { data: players } = usePlayers();
  const { data: allPenalties } = usePenalties();

  const rows = useMemo(() => {
    if (!balanceData || !players) return [];
    return players
      .filter((p) => p.active)
      .map((p) => ({
        player: p,
        balance: balanceData.balances[p.id],
      }))
      .filter((r) => r.balance)
      .sort((a, b) => b.balance.balance - a.balance.balance);
  }, [balanceData, players]);

  const pendingPayment = useMemo(() => {
    if (!allPenalties || !players) return [];
    return allPenalties
      .filter((p) => p.status === "open" || p.status === "accepted")
      .map((p) => ({
        penalty: p,
        player: players.find((pl) => pl.id === p.playerId),
      }))
      .sort((a, b) => b.penalty.createdAt.localeCompare(a.penalty.createdAt));
  }, [allPenalties, players]);

  return (
    <div className="space-y-3">
      {isTreasurer && pendingPayment.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet size={16} /> Zahlungen bestätigen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {pendingPayment.map(({ penalty, player }) => (
                <TreasurerPenaltyRow
                  key={penalty.id}
                  penalty={penalty}
                  playerName={player?.name ?? penalty.playerId}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Lade...</div>}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Guthaben aller Spieler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map(({ player, balance }) => (
              <li key={player.id} className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                  {player.jerseyNumber ?? player.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{player.name}</div>
                  <div className="text-xs text-muted-foreground">Team {player.team}</div>
                </div>
                <div
                  className={cn(
                    "tabular-nums font-semibold",
                    guthabenTone(balance.balance, balance.startBalance) === "success"
                      ? "text-success"
                      : guthabenTone(balance.balance, balance.startBalance) === "destructive"
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {formatEuro(balance.balance)}
                </div>
              </li>
            ))}
            {rows.length === 0 && !isLoading && (
              <li className="p-5 text-center text-sm text-muted-foreground">
                Noch keine Spieler angelegt. Admin: Lege im Adminbereich Spieler an.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function PenaltyOpenCard({ penalty }: { penalty: Penalty }) {
  const { toast } = useToast();
  const patch = usePatchPenalty();
  const canGamble = penalty.canGamble && penalty.amount < 10;

  const accept = async () => {
    if (!confirm(`Strafe über ${formatEuro(penalty.amount)} akzeptieren?`)) return;
    try {
      await patch.mutateAsync({ id: penalty.id, action: "accept" });
      toast({ title: "Strafe akzeptiert", variant: "success" });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <PenaltyRowHeader penalty={penalty} />
        <div className="flex gap-2">
          {canGamble ? (
            <Link to={`/strafen/${penalty.id}/zocken`} className="flex-1">
              <Button variant="default" size="sm" className="w-full">
                <Coins size={14} /> Zocken (Doppelt o. Nichts)
              </Button>
            </Link>
          ) : null}
          <Button
            onClick={accept}
            variant={canGamble ? "outline" : "default"}
            size="sm"
            className="flex-1"
            loading={patch.isPending}
          >
            <Check size={14} /> Akzeptieren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PenaltyAcceptedCard({ penalty }: { penalty: Penalty }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3">
        <PenaltyRowHeader penalty={penalty} />
        <p className="mt-2 text-xs text-muted-foreground">
          Du hast die Strafe akzeptiert. Der Kassenwart markiert sie als bezahlt, sobald du
          eingezahlt hast.
        </p>
      </CardContent>
    </Card>
  );
}

function TreasurerPenaltyRow({
  penalty,
  playerName,
}: {
  penalty: Penalty;
  playerName: string;
}) {
  const { toast } = useToast();
  const patch = usePatchPenalty();

  const markPaid = async () => {
    if (!confirm(`${playerName}: ${formatEuro(penalty.amount)} als bezahlt markieren?`)) return;
    try {
      await patch.mutateAsync({ id: penalty.id, action: "mark-paid" });
      toast({ title: "Als bezahlt markiert", variant: "success" });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  return (
    <li className="flex items-center gap-3 p-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{playerName}</div>
        <div className="text-sm text-muted-foreground truncate">{penalty.reason}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px]">
            {penalty.status === "open" ? "offen" : "akzeptiert"}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(penalty.createdAt)}
          </span>
        </div>
      </div>
      <div className="text-right space-y-1">
        <div className="font-bold tabular-nums text-destructive">
          −{formatEuro(penalty.amount)}
        </div>
        <Button size="sm" variant="secondary" loading={patch.isPending} onClick={markPaid}>
          Bezahlt
        </Button>
      </div>
    </li>
  );
}

function PenaltyRowHeader({ penalty }: { penalty: Penalty }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <CircleDot size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{penalty.reason}</div>
        <div className="text-xs text-muted-foreground">{formatDateTime(penalty.createdAt)}</div>
      </div>
      <div className="text-right">
        <div className="font-bold tabular-nums text-destructive">
          −{formatEuro(penalty.amount)}
        </div>
        {penalty.canGamble && penalty.status === "open" && (
          <Badge variant="success" className="text-[10px]">
            zockbar
          </Badge>
        )}
      </div>
    </div>
  );
}

function PenaltyHistoryCard({ penalty }: { penalty: Penalty }) {
  const statusBadge = () => {
    switch (penalty.status) {
      case "paid":
        return <Badge variant="outline">bezahlt</Badge>;
      case "gambled-won":
        return <Badge variant="success">Glücksrad gewonnen</Badge>;
      case "gambled-lost":
      case "doubled":
        return <Badge variant="destructive">Glücksrad verloren (x2)</Badge>;
      default:
        return null;
    }
  };

  const amount = penalty.status === "gambled-won" ? 0 : penalty.amount;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <AlertTriangle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {penalty.reason} {statusBadge()}
          </div>
          <div className="text-xs text-muted-foreground">{formatDateTime(penalty.createdAt)}</div>
        </div>
        <div className="text-sm font-semibold tabular-nums">
          {amount > 0 ? `−${formatEuro(amount)}` : "0 €"}
        </div>
      </CardContent>
    </Card>
  );
}
