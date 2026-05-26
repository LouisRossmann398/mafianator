import { useState } from "react";
import { Plus, Trash2, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from "@/api/users";
import { usePlayers } from "@/api/players";
import { useAuth } from "@/api/auth";
import type { Role, UserPublic } from "@shared/types";

export function AdminUsers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: users } = useUsers();
  const { data: players } = usePlayers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const remove = useDeleteUser();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; user: UserPublic } | { mode: "pw"; user: UserPublic }
  >(null);

  const submit = async (form: FormData) => {
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const role = String(form.get("role") ?? "player") as Role;
    const displayName = String(form.get("displayName") ?? "");
    const playerId = String(form.get("playerId") ?? "") || undefined;
    try {
      if (dialog?.mode === "create") {
        if (!username || !password || !displayName) {
          toast({ title: "Pflichtfelder fehlen", variant: "destructive" });
          return;
        }
        await create.mutateAsync({ username, password, role, displayName, playerId });
        toast({ title: "User angelegt", variant: "success" });
      } else if (dialog?.mode === "edit") {
        await update.mutateAsync({
          username: dialog.user.username,
          data: { displayName, role, playerId },
        });
        toast({ title: "Aktualisiert", variant: "success" });
      } else if (dialog?.mode === "pw") {
        if (password.length < 6) {
          toast({ title: "Passwort min. 6 Zeichen", variant: "destructive" });
          return;
        }
        await update.mutateAsync({ username: dialog.user.username, data: { password } });
        toast({ title: "Passwort gesetzt", variant: "success" });
      }
      setDialog(null);
    } catch (e) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  const onDelete = async (username: string) => {
    if (!confirm("User wirklich loeschen?")) return;
    await remove.mutateAsync(username);
    toast({ title: "Geloescht", variant: "success" });
  };

  return (
    <div className="space-y-3">
      {isAdmin && (
        <Button onClick={() => setDialog({ mode: "create" })} className="w-full">
          <Plus size={16} /> User hinzufuegen
        </Button>
      )}
      <ul className="space-y-2">
        {users?.map((u) => (
          <li key={u.username}>
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-bold text-sm">
                  {u.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {u.displayName}
                    <Badge
                      variant={
                        u.role === "admin"
                          ? "destructive"
                          : u.role === "treasurer"
                            ? "warning"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {u.role}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{u.username} · Spieler: {u.playerId}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDialog({ mode: "edit", user: u })}
                      aria-label="Edit"
                    >
                      <Plus size={14} className="rotate-45" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDialog({ mode: "pw", user: u })}
                      aria-label="Passwort"
                    >
                      <Key size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(u.username)}
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
          dialog?.mode === "create"
            ? "Neuer User"
            : dialog?.mode === "pw"
              ? `Passwort setzen für ${dialog.user.displayName}`
              : `User bearbeiten: ${dialog?.mode === "edit" ? dialog.user.displayName : ""}`
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          {dialog?.mode === "create" && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Benutzername</Label>
              <Input id="username" name="username" required autoCapitalize="none" />
            </div>
          )}
          {(dialog?.mode === "create" || dialog?.mode === "edit") && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Anzeigename</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={dialog.mode === "edit" ? dialog.user.displayName : ""}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Rolle</Label>
                <Select
                  id="role"
                  name="role"
                  defaultValue={dialog.mode === "edit" ? dialog.user.role : "player"}
                >
                  <option value="player">player</option>
                  <option value="treasurer">treasurer</option>
                  <option value="admin">admin</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="playerId">Spieler-ID</Label>
                <Select
                  id="playerId"
                  name="playerId"
                  defaultValue={dialog.mode === "edit" ? dialog.user.playerId : ""}
                >
                  <option value="">— Standard (= username) —</option>
                  {players?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
          {(dialog?.mode === "create" || dialog?.mode === "pw") && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
                placeholder="min. 6 Zeichen"
              />
            </div>
          )}
          <Button type="submit" className="w-full" loading={create.isPending || update.isPending}>
            Speichern
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
