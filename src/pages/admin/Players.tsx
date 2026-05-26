import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  useCreatePlayer,
  useDeletePlayer,
  usePlayers,
  useUpdatePlayer,
} from "@/api/players";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/api/auth";
import type { Player, TeamId } from "@shared/types";

export function AdminPlayers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: players, isLoading } = usePlayers();
  const create = useCreatePlayer();
  const update = useUpdatePlayer();
  const remove = useDeletePlayer();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<null | { mode: "create" } | { mode: "edit"; player: Player }>(
    null,
  );

  const onSubmit = async (form: FormData) => {
    const name = String(form.get("name") ?? "").trim();
    const team = Number(form.get("team")) as TeamId;
    const birthdate = String(form.get("birthdate") ?? "") || undefined;
    const jerseyNumber = form.get("jerseyNumber") ? Number(form.get("jerseyNumber")) : undefined;
    const active = form.get("active") === "on";

    if (!name) {
      toast({ title: "Name fehlt", variant: "destructive" });
      return;
    }
    try {
      if (dialog?.mode === "edit") {
        await update.mutateAsync({
          id: dialog.player.id,
          data: { name, team, birthdate, jerseyNumber, active },
        });
        toast({ title: "Spieler aktualisiert", variant: "success" });
      } else {
        await create.mutateAsync({ name, team, birthdate, jerseyNumber, active });
        toast({ title: "Spieler angelegt", variant: "success" });
      }
      setDialog(null);
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Spieler wirklich loeschen? Strafen bleiben erhalten.")) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Geloescht", variant: "success" });
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
      {isAdmin && (
        <Button onClick={() => setDialog({ mode: "create" })} className="w-full">
          <Plus size={16} /> Spieler hinzufuegen
        </Button>
      )}
      {isLoading && <div className="text-sm text-muted-foreground">Lade...</div>}
      <ul className="space-y-2">
        {players?.map((p) => (
          <li key={p.id}>
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                  {p.jerseyNumber ?? p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {p.name}
                    {!p.active && (
                      <Badge variant="outline" className="text-[10px]">
                        inaktiv
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Team {p.team} · {p.id}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDialog({ mode: "edit", player: p })}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "edit" ? "Spieler bearbeiten" : "Neuer Spieler"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={dialog?.mode === "edit" ? dialog.player.name : ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team">Team</Label>
            <Select
              id="team"
              name="team"
              defaultValue={dialog?.mode === "edit" ? String(dialog.player.team) : "1"}
            >
              <option value="1">1. Mannschaft (Kreisklasse 1)</option>
              <option value="2">2. Mannschaft (C-Klasse 1)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jerseyNumber">Trikotnummer</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min="1"
                max="99"
                defaultValue={dialog?.mode === "edit" ? dialog.player.jerseyNumber ?? "" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthdate">Geburtstag</Label>
              <Input
                id="birthdate"
                name="birthdate"
                type="date"
                defaultValue={dialog?.mode === "edit" ? dialog.player.birthdate ?? "" : ""}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={dialog?.mode === "edit" ? dialog.player.active : true}
            />
            Aktiv
          </label>
          <Button type="submit" className="w-full" loading={create.isPending || update.isPending}>
            Speichern
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
