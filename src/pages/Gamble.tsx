import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Coins, Sparkles, Skull } from "lucide-react";
import confetti from "canvas-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useGamble, usePenalties } from "@/api/penalties";
import { useAuth } from "@/api/auth";
import { Wheel } from "@/components/wheel/Wheel";
import { formatEuro } from "@/lib/format";

export function GamblePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: penalties } = usePenalties(user?.playerId);
  const penalty = penalties?.find((p) => p.id === id);
  const gamble = useGamble();

  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [result, setResult] = useState<{
    outcome: "won" | "lost";
    originalAmount: number;
    newAmount: number;
  } | null>(null);

  useEffect(() => {
    if (!penalty && penalties) {
      navigate("/strafen", { replace: true });
    }
  }, [penalty, penalties, navigate]);

  const spin = async () => {
    if (!penalty) return;
    setPhase("spinning");
    try {
      const res = await gamble.mutateAsync(penalty.id);
      setResult({
        outcome: res.result,
        originalAmount: res.originalAmount,
        newAmount: res.newAmount,
      });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
      setPhase("idle");
    }
  };

  if (!penalty) {
    return null;
  }

  if (penalty.status !== "open") {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <CardContent className="p-5 space-y-3">
            <h1 className="text-xl font-bold">Diese Strafe ist nicht mehr offen.</h1>
            <Link to="/strafen">
              <Button>Zurück zur Übersicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Glücksrad</div>
        <h1 className="text-2xl font-bold">Doppelt oder Nichts</h1>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="text-sm text-muted-foreground">Strafe</div>
          <div className="text-xl font-bold">{penalty.reason}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">Aktuell</div>
              <div className="text-2xl font-bold tabular-nums">{formatEuro(penalty.amount)}</div>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="text-xs text-muted-foreground">Bei Niederlage</div>
              <div className="text-2xl font-bold tabular-nums text-destructive">
                {formatEuro(penalty.amount * 2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="py-2">
        <Wheel
          spinning={phase === "spinning"}
          result={result?.outcome ?? null}
          onSpinComplete={() => {
            setPhase("result");
            if (result?.outcome === "won") {
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ["#dc2626", "#fafafa", "#22c55e"],
              });
            }
          }}
        />
      </div>

      {phase === "idle" && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Drücke unten und es wird gedreht. 50/50 - entweder die Strafe ist weg, oder sie verdoppelt sich.
              Einmal pro Strafe.
            </p>
            <Button size="lg" onClick={spin} className="w-full" loading={gamble.isPending}>
              <Coins size={18} /> Drehen
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "result" && result && (
        <Card>
          <CardContent className="p-5 space-y-3 text-center">
            {result.outcome === "won" ? (
              <>
                <Sparkles className="mx-auto h-12 w-12 text-success" />
                <div className="text-2xl font-black text-success">JACKPOT!</div>
                <p className="text-sm text-muted-foreground">
                  Du musst {formatEuro(result.originalAmount)} nicht zahlen. Strafe weg.
                </p>
              </>
            ) : (
              <>
                <Skull className="mx-auto h-12 w-12 text-destructive" />
                <div className="text-2xl font-black text-destructive">PECH!</div>
                <p className="text-sm text-muted-foreground">
                  Die Strafe ist jetzt {formatEuro(result.newAmount)} (vorher {formatEuro(result.originalAmount)}).
                </p>
              </>
            )}
            <Link to="/strafen">
              <Button className="w-full">Zurück zu den Strafen</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/strafen" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <ArrowLeft size={14} /> Zurück
    </Link>
  );
}
