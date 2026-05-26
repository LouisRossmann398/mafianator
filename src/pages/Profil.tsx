import { useState } from "react";
import { Lock, Award, Target, TrendingDown, TrendingUp, Coins, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/api/auth";
import { useBalances, usePenalties, useGoodDeeds } from "@/api/penalties";
import { useMyBets, useLeaderboard } from "@/api/bets";
import { useAchievements } from "@/api/achievements";
import { BADGES, BADGE_BY_ID } from "@shared/achievements";
import { apiFetch } from "@/api/client";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ProfilPage() {
  const { user, logout } = useAuth();
  const { data: balances } = useBalances();
  const { data: penalties } = usePenalties(user?.playerId);
  const { data: goodDeeds } = useGoodDeeds(user?.playerId);
  const { data: bets } = useMyBets();
  const { data: leaderboard } = useLeaderboard();
  const { data: achievements } = useAchievements();
  const balance = balances?.balances?.[user?.playerId ?? ""];
  const [pwOpen, setPwOpen] = useState(false);
  const { toast } = useToast();

  const myRank = leaderboard?.findIndex((r) => r.userId === user?.username) ?? -1;
  const evaluatedBets = bets?.filter((b) => typeof b.points === "number") ?? [];
  const totalPoints = evaluatedBets.reduce((sum, b) => sum + (b.points ?? 0), 0);

  const unlockedIds = new Set(achievements?.badges.map((b) => b.id) ?? []);

  const changePw = async (form: FormData) => {
    const oldPassword = String(form.get("oldPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    try {
      await apiFetch("/auth-password", { method: "POST", json: { oldPassword, newPassword } });
      toast({ title: "Passwort geändert", variant: "success" });
      setPwOpen(false);
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{user?.displayName}</h1>
        <p className="text-sm text-muted-foreground">@{user?.username} · Rolle: {user?.role}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          icon={<Coins size={14} />}
          label="Balance"
          value={formatEuro(balance?.balance ?? -100)}
          tone={(balance?.balance ?? -100) >= 0 ? "success" : "default"}
        />
        <Stat
          icon={<Trophy size={14} />}
          label="Tipp-Punkte"
          value={String(totalPoints)}
        />
        <Stat
          icon={<TrendingDown size={14} />}
          label="Strafen"
          value={`${penalties?.length ?? 0}`}
          tone="destructive"
        />
        <Stat
          icon={<TrendingUp size={14} />}
          label="Gute Taten"
          value={`${goodDeeds?.length ?? 0}`}
          tone="success"
        />
        <Stat
          icon={<Target size={14} />}
          label="Tipps gewertet"
          value={`${evaluatedBets.length}`}
        />
        <Stat
          icon={<Award size={14} />}
          label="Platz Tipp"
          value={myRank >= 0 ? `#${myRank + 1}` : "—"}
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Award size={16} /> Achievements
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {BADGES.map((b) => {
              const isUnlocked = unlockedIds.has(b.id);
              return (
                <div
                  key={b.id}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition",
                    isUnlocked
                      ? "border-primary bg-primary/5"
                      : "border-border opacity-40 grayscale",
                  )}
                  title={`${b.title} - ${b.description}`}
                >
                  <div className="text-2xl">{b.emoji}</div>
                  <div className="text-[10px] font-medium leading-tight">{b.title}</div>
                </div>
              );
            })}
          </div>
          {achievements && (
            <div className="text-[10px] text-muted-foreground">
              {achievements.badges.length} / {BADGES.length} freigeschaltet
            </div>
          )}
        </CardContent>
      </Card>

      {achievements?.badges && achievements.badges.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-sm font-semibold">Zuletzt freigeschaltet</h2>
            <ul className="space-y-1.5">
              {achievements.badges
                .slice()
                .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
                .slice(0, 3)
                .map((a) => {
                  const def = BADGE_BY_ID[a.id];
                  if (!def) return null;
                  return (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="text-xl">{def.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{def.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {def.description}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Neu
                      </Badge>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="text-sm font-semibold">Account</h2>
          <Button variant="outline" className="w-full" onClick={() => setPwOpen(true)}>
            <Lock size={14} /> Passwort ändern
          </Button>
          <Button variant="ghost" className="w-full" onClick={logout}>
            Abmelden
          </Button>
        </CardContent>
      </Card>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} title="Passwort ändern">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changePw(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="oldPassword">Aktuelles Passwort</Label>
            <Input id="oldPassword" name="oldPassword" type="password" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Neues Passwort (min. 6 Zeichen)</Label>
            <Input id="newPassword" name="newPassword" type="password" minLength={6} required />
          </div>
          <Button type="submit" className="w-full">
            Speichern
          </Button>
        </form>
      </Dialog>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "destructive" | "default";
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {icon} {label}
        </div>
        <div
          className={cn(
            "text-xl font-bold tabular-nums",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
