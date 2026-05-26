import { useState } from "react";
import { Cake, Save, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useBirthdays, useDeleteBirthday, useUpsertBirthday } from "@/api/birthdays";
import { usePlayers } from "@/api/players";

export function AdminBirthdays() {
  const { data: players } = usePlayers();
  const { data: birthdays } = useBirthdays();
  const upsert = useUpsertBirthday();
  const remove = useDeleteBirthday();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const map = new Map(birthdays?.map((b) => [b.playerId, b.date]) ?? []);

  const save = async (playerId: string) => {
    const date = drafts[playerId] ?? map.get(playerId) ?? "";
    if (!date) {
      toast({ title: "Datum fehlt", variant: "destructive" });
      return;
    }
    await upsert.mutateAsync({ playerId, date });
    toast({ title: "Gespeichert", variant: "success" });
  };

  const onDelete = async (playerId: string) => {
    await remove.mutateAsync(playerId);
    toast({ title: "Geloescht", variant: "success" });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          FuPa zeigt Geburtstage nur wenn der Spieler zugestimmt hat, deshalb mussten wir hier
          manuell pflegen.
        </CardContent>
      </Card>
      <ul className="space-y-2">
        {players
          ?.filter((p) => p.active)
          .map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                    <Cake size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Team {p.team}</div>
                  </div>
                  <Input
                    type="date"
                    className="w-40"
                    defaultValue={map.get(p.id) ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  />
                  <Button size="icon" variant="ghost" onClick={() => save(p.id)}>
                    <Save size={16} />
                  </Button>
                  {map.has(p.id) && (
                    <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
      </ul>
    </div>
  );
}
