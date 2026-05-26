import { Sparkles, Skull } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePenalties } from "@/api/penalties";
import { usePlayers } from "@/api/players";
import { formatDateTime, formatEuro } from "@/lib/format";

export function WheelHistoryPage() {
  const { data: penalties } = usePenalties();
  const { data: players } = usePlayers();

  const gambles = (penalties ?? [])
    .filter((p) => p.gambledAt)
    .sort((a, b) => (b.gambledAt ?? "").localeCompare(a.gambledAt ?? ""));

  const won = gambles.filter((p) => p.gambleResult === "won").length;
  const lost = gambles.filter((p) => p.gambleResult === "lost").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Glücksrad-Historie</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-success" />
            <div className="text-2xl font-bold text-success">{won}</div>
            <div className="text-xs text-muted-foreground">Gewonnen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Skull className="mx-auto h-6 w-6 text-destructive" />
            <div className="text-2xl font-bold text-destructive">{lost}</div>
            <div className="text-xs text-muted-foreground">Verdoppelt</div>
          </CardContent>
        </Card>
      </div>

      <ul className="space-y-2">
        {gambles.map((g) => {
          const p = players?.find((pl) => pl.id === g.playerId);
          const won = g.gambleResult === "won";
          return (
            <li key={g.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {won ? <Sparkles size={18} /> : <Skull size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {p?.name ?? g.playerId}
                      <Badge variant={won ? "success" : "destructive"} className="text-[10px]">
                        {won ? "WIN" : "LOSE"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{g.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {g.gambledAt ? formatDateTime(g.gambledAt) : ""}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground line-through tabular-nums">
                      {formatEuro(g.originalAmount ?? g.amount)}
                    </div>
                    <div
                      className={`font-bold tabular-nums ${won ? "text-success" : "text-destructive"}`}
                    >
                      {won ? "0 €" : formatEuro(g.amount)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
        {gambles.length === 0 && (
          <Card>
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              Noch keiner hat sich getraut. Sei der erste!
            </CardContent>
          </Card>
        )}
      </ul>
    </div>
  );
}
