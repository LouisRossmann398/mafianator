import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useCatalog,
  useCreateCatalog,
  useDeleteCatalog,
  useUpdateCatalog,
} from "@/api/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatEuro } from "@/lib/format";
import type { CatalogEntry } from "@shared/types";

export function AdminCatalog() {
  const { data: entries, isLoading } = useCatalog();
  const create = useCreateCatalog();
  const update = useUpdateCatalog();
  const remove = useDeleteCatalog();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<
    null | { mode: "create" } | { mode: "edit"; entry: CatalogEntry }
  >(null);

  const submit = async (form: FormData) => {
    const label = String(form.get("label") ?? "").trim();
    const defaultAmount = Number(form.get("defaultAmount"));
    const category = String(form.get("category") ?? "Sonstige").trim();
    const canGamble = form.get("canGamble") === "on";

    if (!label || Number.isNaN(defaultAmount)) {
      toast({ title: "Pflichtfelder fehlen", variant: "destructive" });
      return;
    }
    try {
      if (dialog?.mode === "edit") {
        await update.mutateAsync({
          id: dialog.entry.id,
          data: { label, defaultAmount, category, canGamble },
        });
      } else {
        await create.mutateAsync({ label, defaultAmount, category, canGamble });
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

  const onDelete = async (id: string) => {
    if (!confirm("Eintrag wirklich loeschen?")) return;
    await remove.mutateAsync(id);
    toast({ title: "Geloescht", variant: "success" });
  };

  const grouped = (entries ?? []).reduce<Record<string, CatalogEntry[]>>((acc, e) => {
    acc[e.category] = acc[e.category] ?? [];
    acc[e.category].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <Button onClick={() => setDialog({ mode: "create" })} className="w-full">
        <Plus size={16} /> Neuer Katalog-Eintrag
      </Button>
      {isLoading && <div className="text-sm text-muted-foreground">Lade...</div>}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {cat}
          </h3>
          {items.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {e.label}
                    {e.canGamble ? (
                      <Badge variant="success" className="text-[10px]">
                        zockbar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        pflicht
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatEuro(e.defaultAmount)}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setDialog({ mode: "edit", entry: e })}>
                  <Pencil size={16} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(e.id)}>
                  <Trash2 size={16} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <Dialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "edit" ? "Eintrag bearbeiten" : "Neuer Eintrag"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="label">Bezeichnung</Label>
            <Input
              id="label"
              name="label"
              defaultValue={dialog?.mode === "edit" ? dialog.entry.label : ""}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="defaultAmount">Betrag (EUR)</Label>
              <Input
                id="defaultAmount"
                name="defaultAmount"
                type="number"
                step="0.5"
                min="0"
                defaultValue={dialog?.mode === "edit" ? dialog.entry.defaultAmount : 1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Kategorie</Label>
              <Input
                id="category"
                name="category"
                defaultValue={dialog?.mode === "edit" ? dialog.entry.category : "Sonstige"}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="canGamble"
              defaultChecked={dialog?.mode === "edit" ? dialog.entry.canGamble : true}
            />
            Glücksrad erlaubt (nur möglich falls Betrag &lt; 10 EUR)
          </label>
          <Button type="submit" className="w-full" loading={create.isPending || update.isPending}>
            Speichern
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
