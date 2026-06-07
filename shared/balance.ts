import type { BalanceSummary } from "./types";

/** Standard-Einzahlung pro Spieler zu Saisonbeginn. */
export const DEFAULT_SEASON_DEPOSIT = 100;

/** Einzahlungsbetrag (Legacy-Saisons hatten negative Werte). */
export function seasonDeposit(startBalance: number): number {
  return Math.abs(startBalance);
}

export function guthabenTone(
  balance: number,
  deposit: number,
): "success" | "destructive" | "default" {
  if (balance < 0) return "destructive";
  if (balance >= deposit) return "success";
  return "default";
}

/** 0–100 % der Einzahlung noch als Guthaben (kann visuell bei >100 % voll laufen). */
export function guthabenProgressPercent(balance: number, deposit: number): number {
  if (deposit <= 0) return 0;
  return Math.min(100, Math.max(0, (balance / deposit) * 100));
}

export function guthabenVsDeposit(balance: number, deposit: number): number {
  return balance - deposit;
}

export function totalNachzahlungen(balances: Record<string, BalanceSummary>): number {
  return Object.values(balances).reduce((sum, b) => sum + Math.max(0, -b.balance), 0);
}

export function totalAuszahlung(balances: Record<string, BalanceSummary>): number {
  return Object.values(balances).reduce((sum, b) => sum + Math.max(0, b.balance), 0);
}
