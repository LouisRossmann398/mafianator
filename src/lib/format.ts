export function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("de-DE", opts ?? { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(value: string | Date): string {
  return formatDate(value, { timeStyle: "short" });
}

export function relativeDays(target: string | Date): number {
  const t = typeof target === "string" ? new Date(target) : target;
  const ms = t.getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
