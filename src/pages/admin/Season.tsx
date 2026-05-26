import { useState } from "react";
import { Calendar, Archive, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useSeasons, useStartNewSeason } from "@/api/seasons";
import { formatDate, formatEuro } from "@/lib/format";

export function AdminSeason() {
  const { data, isLoading } = useSeasons();
  const start = useStartNewSeason();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState("Saison " + new Date().getFullYear() + "/" + ((new Date().getFullYear() + 1) % 100));
  const [startBalance, setStartBalance] = useState(-100);

  const onStart = async () => {
    try {
      const res = await start.mutateAsync({ name, startBalance });
      toast({
        title: "Neue Saison gestartet",
        description: `${res.archived} Datensätze archiviert.`,
        variant: "success",
      });
      setConfirm(false);
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Calendar size={16} /> Aktuelle Saison
          </div>
          {data?.current && (
            <div className="space-y-0.5">
              <div className="text-xl font-bold">{data.current.name}</div>
              <div className="text-xs text-muted-foreground">
                Start: {formatDate(data.current.startedAt)} · Start-Balance{" "}
                {formatEuro(data.current.startBalance)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Archive size={16} /> Neue Saison starten
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
            <AlertTriangle size={14} />
            <span>
              Achtung: Alle Strafen, gute Taten, Tipps und Achievements werden archiviert und die Balances
              zurückgesetzt. Spielerstammdaten und Strafenkatalog bleiben erhalten.
            </span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name der neuen Saison</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startBalance">Start-Balance (EUR)</Label>
            <Input
              id="startBalance"
              type="number"
              step="10"
              value={startBalance}
              onChange={(e) => setStartBalance(Number(e.target.value))}
            />
            <div className="text-xs text-muted-foreground">
              Standard ist -100 EUR. Jeder Spieler beginnt bei diesem Betrag.
            </div>
          </div>
          {confirm ? (
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={onStart} loading={start.isPending}>
                Endgültig starten
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button variant="destructive" className="w-full" onClick={() => setConfirm(true)}>
              Neue Saison starten
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm font-semibold">Saison-Verlauf</div>
          {isLoading && <div className="text-xs text-muted-foreground">Lade...</div>}
          <ul className="space-y-2">
            {data?.seasons.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <Badge variant={s.active ? "success" : "outline"} className="text-[10px]">
                  {s.active ? "aktiv" : "archiviert"}
                </Badge>
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(s.startedAt)}
                  {s.endedAt && ` - ${formatDate(s.endedAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
