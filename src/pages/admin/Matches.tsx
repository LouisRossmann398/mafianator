import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw, Plus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/api/auth";
import {
  useCreateMatch,
  useDeleteMatch,
  useMatches,
  useTriggerScrape,
  useUpdateMatch,
} from "@/api/matches";
import { formatDateTime } from "@/lib/format";
import type { Match, TeamId } from "@shared/types";

interface ScrapeStatus {
  lastRun: string;
  matchesTotal: number;
  matchesCreated: number;
  matchesUpdated: number;
  lastError?: string;
}

export function AdminMatches() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data } = useMatches();
  const matches = data?.matches;
  const trigger = useTriggerScrape();
  const remove = useDeleteMatch();
  const update = useUpdateMatch();
  const create = useCreateMatch();
  const { toast } = useToast();
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["scrape-status"],
    queryFn: () => apiFetch<{ status: ScrapeStatus | null }>("/scrape-trigger").then((d) => d.status),
  });
  const [dialog, setDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; match: Match } | { mode: "result"; match: Match }
  >(null);

  const onScrape = async () => {
    try {
      await trigger.mutateAsync();
      await qc.invalidateQueries({ queryKey: ["scrape-status"] });
      toast({ title: "Scrape erfolgreich", variant: "success" });
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Spiel loeschen?")) return;
    await remove.mutateAsync(id);
    toast({ title: "Geloescht", variant: "success" });
  };

  const submitMatch = async (form: FormData) => {
    const opponent = String(form.get("opponent") ?? "");
    const kickoff = String(form.get("kickoff") ?? "");
    const team = Number(form.get("team")) as TeamId;
    const homeAway = String(form.get("homeAway")) as "home" | "away";
    const location = String(form.get("location") ?? "") || undefined;
    const resultHome = form.get("homeGoals");
    const resultAway = form.get("awayGoals");
    const hasResult = resultHome !== "" && resultAway !== "" && resultHome !== null && resultAway !== null;
    const result = hasResult
      ? { homeGoals: Number(resultHome), awayGoals: Number(resultAway) }
      : undefined;
    try {
      if (dialog?.mode === "edit" || dialog?.mode === "result") {
        await update.mutateAsync({
          id: dialog.match.id,
          data: { opponent, kickoff, team, homeAway, location, result },
        });
      } else {
        await create.mutateAsync({ opponent, kickoff, team, homeAway, location, result });
      }
      toast({ title: "Gespeichert", variant: "success" });
      setDialog(null);
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
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Scraper</div>
              <div className="text-sm font-medium">FuPa-Synchronisation</div>
            </div>
            {isAdmin && (
              <Button onClick={onScrape} loading={trigger.isPending} size="sm">
                <RefreshCcw size={14} /> Jetzt scrapen
              </Button>
            )}
          </div>
          {status.data ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>
                Letzter Lauf: {formatDateTime(status.data.lastRun)} ·{" "}
                {status.data.matchesTotal} Spiele · {status.data.matchesCreated} neu ·{" "}
                {status.data.matchesUpdated} aktualisiert
              </div>
              {status.data.lastError && (
                <div className="text-destructive">Fehler: {status.data.lastError}</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Noch nicht gelaufen.</div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Button onClick={() => setDialog({ mode: "create" })} className="w-full">
          <Plus size={16} /> Spiel manuell anlegen
        </Button>
      )}

      <ul className="space-y-2">
        {matches?.map((m) => (
          <li key={m.id}>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-bold text-sm">
                  T{m.team}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.homeAway === "home" ? "SVP" : m.opponent} vs{" "}
                    {m.homeAway === "home" ? m.opponent : "SVP"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(m.kickoff)} · {m.league}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {m.result ? (
                    <div className="font-mono font-bold">
                      {m.result.homeGoals}:{m.result.awayGoals}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      kommend
                    </Badge>
                  )}
                  <div className="text-[10px] text-muted-foreground">{m.source}</div>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDialog({ mode: "result", match: m })}
                      aria-label="Ergebnis"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(m.id)}
                      aria-label="Loeschen"
                    >
                      <Trash2 size={14} />
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
        title={
          dialog?.mode === "result"
            ? "Ergebnis eintragen"
            : dialog?.mode === "edit"
              ? "Spiel bearbeiten"
              : "Neues Spiel"
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMatch(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          {(dialog?.mode === "create" || dialog?.mode === "edit") && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="opponent">Gegner</Label>
                <Input
                  id="opponent"
                  name="opponent"
                  defaultValue={dialog?.mode === "edit" ? dialog.match.opponent : ""}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="team">Team</Label>
                  <Select
                    id="team"
                    name="team"
                    defaultValue={dialog?.mode === "edit" ? String(dialog.match.team) : "1"}
                  >
                    <option value="1">1. Mannschaft</option>
                    <option value="2">2. Mannschaft</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="homeAway">Heim/Auswärts</Label>
                  <Select
                    id="homeAway"
                    name="homeAway"
                    defaultValue={dialog?.mode === "edit" ? dialog.match.homeAway : "home"}
                  >
                    <option value="home">Heim</option>
                    <option value="away">Auswärts</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kickoff">Anstoss</Label>
                <Input
                  id="kickoff"
                  name="kickoff"
                  type="datetime-local"
                  defaultValue={
                    dialog?.mode === "edit"
                      ? new Date(dialog.match.kickoff).toISOString().slice(0, 16)
                      : ""
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Spielstätte</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={dialog?.mode === "edit" ? dialog.match.location ?? "" : ""}
                />
              </div>
            </>
          )}
          {(dialog?.mode === "result" || dialog?.mode === "edit") && dialog && (
            <>
              <input
                type="hidden"
                name="opponent"
                value={dialog.mode === "result" ? dialog.match.opponent : undefined}
              />
              <input
                type="hidden"
                name="kickoff"
                value={dialog.mode === "result" ? dialog.match.kickoff : undefined}
              />
              <input
                type="hidden"
                name="team"
                value={dialog.mode === "result" ? String(dialog.match.team) : undefined}
              />
              <input
                type="hidden"
                name="homeAway"
                value={dialog.mode === "result" ? dialog.match.homeAway : undefined}
              />
              <input
                type="hidden"
                name="location"
                value={dialog.mode === "result" ? dialog.match.location ?? "" : undefined}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="homeGoals">Heim Tore</Label>
                  <Input
                    id="homeGoals"
                    name="homeGoals"
                    type="number"
                    min="0"
                    defaultValue={dialog.match.result?.homeGoals ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="awayGoals">Auswärts Tore</Label>
                  <Input
                    id="awayGoals"
                    name="awayGoals"
                    type="number"
                    min="0"
                    defaultValue={dialog.match.result?.awayGoals ?? ""}
                  />
                </div>
              </div>
            </>
          )}
          <Button type="submit" className="w-full" loading={create.isPending || update.isPending}>
            Speichern
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
