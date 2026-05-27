import { Trophy, Medal, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLeaderboard } from "@/api/bets";
import { useAuth } from "@/api/auth";
import { cn } from "@/lib/cn";

export function TabellePage() {
  const { user } = useAuth();
  const { data: rows } = useLeaderboard();
  const filtered = rows?.filter((r) => r.betsTotal > 0 || r.userId === user?.username) ?? [];

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted-foreground">
          Kreisklasse + C-Klasse zusammen
        </div>
        <h1 className="text-2xl font-bold">Tipp-Tabelle</h1>
      </div>

      <Link to="/tippen" className="text-sm text-primary">
        ← zurück zur Tipprunde
      </Link>

      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {top3.map((r, i) => {
            const icons = [
              <Crown key="c" size={28} className="text-yellow-400" />,
              <Trophy key="t" size={24} className="text-gray-300" />,
              <Medal key="m" size={24} className="text-amber-600" />,
            ];
            return (
              <Card key={r.userId} className={i === 0 ? "border-primary" : ""}>
                <CardContent className="p-3 text-center space-y-1">
                  <div className="flex justify-center">{icons[i]}</div>
                  <div className="text-xs font-semibold uppercase">Platz {i + 1}</div>
                  <div className="text-sm font-bold truncate">{r.displayName}</div>
                  <div className="text-2xl font-black tabular-nums">{r.points}</div>
                  <div className="text-[10px] text-muted-foreground">{r.betsEvaluated} Tipps</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Tipper</th>
                <th className="px-3 py-2 text-right">Pkt</th>
                <th className="px-3 py-2 text-right">3</th>
                <th className="px-3 py-2 text-right">2</th>
                <th className="px-3 py-2 text-right">1</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((r, i) => (
                <tr
                  key={r.userId}
                  className={cn(
                    "border-b border-border last:border-0",
                    r.userId === user?.username && "bg-primary/5",
                  )}
                >
                  <td className="px-3 py-2 text-muted-foreground">{i + 4}</td>
                  <td className="px-3 py-2 font-medium truncate max-w-[120px]">{r.displayName}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{r.points}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.exact}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.goalDiff}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.tendency}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-sm text-muted-foreground">
                    Noch keine Tipps. Sei der Erste in der Tipprunde!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
