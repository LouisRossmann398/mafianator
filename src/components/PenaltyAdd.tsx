import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useCatalog } from "@/api/catalog";
import { usePlayers } from "@/api/players";
import { useCreatePenalty, useCreateGoodDeed } from "@/api/penalties";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "penalty" | "good-deed";
  defaultPlayerId?: string;
}

export function PenaltyAdd({ open, onClose, mode, defaultPlayerId }: Props) {
  const { toast } = useToast();
  const { data: catalog } = useCatalog();
  const { data: players } = usePlayers();
  const createPenalty = useCreatePenalty();
  const createGoodDeed = useCreateGoodDeed();
  const [catalogId, setCatalogId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [playerId, setPlayerId] = useState(defaultPlayerId ?? "");
  const [canGamble, setCanGamble] = useState(true);

  const selectedCatalog = catalog?.find((c) => c.id === catalogId);

  const handleCatalogSelect = (id: string) => {
    setCatalogId(id);
    const entry = catalog?.find((c) => c.id === id);
    if (entry) {
      setAmount(String(entry.defaultAmount));
      setReason(entry.label);
      setCanGamble(entry.canGamble && entry.defaultAmount < 10);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!playerId) {
      toast({ title: "Spieler waehlen", variant: "destructive" });
      return;
    }
    if (!reason || Number.isNaN(amt) || amt <= 0) {
      toast({ title: "Betrag und Grund pruefen", variant: "destructive" });
      return;
    }
    try {
      if (mode === "penalty") {
        await createPenalty.mutateAsync({
          playerId,
          amount: amt,
          reason,
          catalogId: catalogId || undefined,
          canGamble: canGamble && amt < 10,
        });
        toast({ title: "Strafe angelegt", variant: "success" });
      } else {
        await createGoodDeed.mutateAsync({
          playerId,
          amount: amt,
          reason,
        });
        toast({ title: "Gute Tat angelegt", variant: "success" });
      }
      setCatalogId("");
      setAmount("");
      setReason("");
      onClose();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Unbekannt",
        variant: "destructive",
      });
    }
  };

  const title = mode === "penalty" ? "Strafe anlegen" : "Gute Tat anlegen";
  const submitting = createPenalty.isPending || createGoodDeed.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="player">Spieler</Label>
          <Select
            id="player"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            required
          >
            <option value="">— wählen —</option>
            {players
              ?.filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Team {p.team})
                </option>
              ))}
          </Select>
        </div>

        {mode === "penalty" && (
          <div className="space-y-1.5">
            <Label htmlFor="catalog">Katalog</Label>
            <Select id="catalog" value={catalogId} onChange={(e) => handleCatalogSelect(e.target.value)}>
              <option value="">— eigener Eintrag —</option>
              {catalog?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.defaultAmount} €)
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Betrag (EUR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.5"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          {mode === "penalty" && (
            <div className="space-y-1.5">
              <Label>Zockbar?</Label>
              <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
                <input
                  type="checkbox"
                  checked={canGamble && Number(amount) < 10}
                  onChange={(e) => setCanGamble(e.target.checked)}
                  disabled={Number(amount) >= 10}
                />
                <span>{Number(amount) >= 10 ? "Pflicht (>= 10 €)" : "Glücksrad ok"}</span>
              </label>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reason">Grund</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={selectedCatalog?.label ?? (mode === "penalty" ? "z.B. Gelbe Karte" : "z.B. Trikots gewaschen")}
            required
          />
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Speichern
        </Button>
      </form>
    </Dialog>
  );
}
