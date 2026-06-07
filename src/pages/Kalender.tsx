import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Cake, Trophy, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatches } from "@/api/matches";
import { useBirthdays } from "@/api/birthdays";
import { usePlayers } from "@/api/players";
import type { Match, Birthday, Player } from "@shared/types";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";

type CalendarEntry =
  | { kind: "match"; date: Date; match: Match }
  | { kind: "birthday"; date: Date; birthday: Birthday; player: Player };

export function KalenderPage() {
  const { data: matches } = useMatches();
  const { data: birthdays } = useBirthdays();
  const { data: players } = usePlayers();
  const [mode, setMode] = useState<"month" | "list">("list");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const entries = useMemo<CalendarEntry[]>(() => {
    const list: CalendarEntry[] = [];
    for (const m of matches ?? []) {
      list.push({ kind: "match", date: new Date(m.kickoff), match: m });
    }
    for (const b of birthdays ?? []) {
      const player = players?.find((p) => p.id === b.playerId);
      if (!player) continue;
      const today = new Date();
      const original = new Date(b.date);
      for (const year of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
        list.push({
          kind: "birthday",
          date: new Date(year, original.getMonth(), original.getDate()),
          birthday: b,
          player,
        });
      }
    }
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [matches, birthdays, players]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <Button size="sm" variant="outline" onClick={() => downloadIcs(entries)}>
          <Download size={14} /> ICS
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("list")}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
            mode === "list"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Liste
        </button>
        <button
          onClick={() => setMode("month")}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
            mode === "month"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          Monat
        </button>
      </div>

      {mode === "list" ? (
        <ListView entries={entries} />
      ) : (
        <MonthView entries={entries} cursor={cursor} setCursor={setCursor} />
      )}
    </div>
  );
}

function ListView({ entries }: { entries: CalendarEntry[] }) {
  const now = Date.now();
  const upcoming = entries.filter((e) => e.date.getTime() >= now - 3 * 60 * 60_000);
  const past = entries
    .filter((e) => e.date.getTime() < now - 3 * 60 * 60_000)
    .reverse()
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kommend
        </h2>
        {upcoming.length === 0 && (
          <Card>
            <CardContent className="p-5 text-center text-sm text-muted-foreground">
              Aktuell keine Termine.
            </CardContent>
          </Card>
        )}
        {upcoming.map((e, i) => (
          <EntryCard entry={e} key={`up-${i}`} />
        ))}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Verlauf
          </h2>
          {past.map((e, i) => (
            <EntryCard entry={e} key={`pa-${i}`} />
          ))}
        </section>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: CalendarEntry }) {
  if (entry.kind === "birthday") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/15 text-pink-500">
            <Cake size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{entry.player.name}</div>
            <div className="text-xs text-muted-foreground">Geburtstag</div>
          </div>
          <div className="text-sm text-right">
            <div className="font-semibold">{formatDate(entry.date)}</div>
          </div>
        </CardContent>
      </Card>
    );
  }
  const m = entry.match;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Trophy size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-sm">
            {m.homeAway === "home" ? "SVP" : m.opponent} vs{" "}
            {m.homeAway === "home" ? m.opponent : "SVP"}
          </div>
          <div className="text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-1 text-[10px]">
              T{m.team}
            </Badge>
            {m.league}
            {m.location && ` · ${m.location}`}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">{formatDate(m.kickoff)}</div>
          <div className="text-muted-foreground text-xs">{formatTime(m.kickoff)}</div>
          {m.result && (
            <div className="mt-1 font-mono font-bold">
              {m.result.homeGoals}:{m.result.awayGoals}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthView({
  entries,
  cursor,
  setCursor,
}: {
  entries: CalendarEntry[];
  cursor: Date;
  setCursor: (d: Date) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    if (e.date.getFullYear() !== year || e.date.getMonth() !== month) continue;
    const k = String(e.date.getDate());
    const arr = byDay.get(k) ?? [];
    arr.push(e);
    byDay.set(k, arr);
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="font-semibold">
            {monthStart.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: totalCells }).map((_, i) => {
            const day = i - firstWeekday + 1;
            const inMonth = day >= 1 && day <= daysInMonth;
            const today = new Date();
            const isToday =
              inMonth &&
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            const dayEntries = inMonth ? byDay.get(String(day)) ?? [] : [];
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-md border text-xs p-1 flex flex-col gap-0.5",
                  inMonth ? "bg-background" : "bg-background/30",
                  isToday && "border-primary",
                )}
              >
                <div
                  className={cn(
                    "text-right text-xs",
                    !inMonth && "text-muted-foreground/50",
                    isToday && "font-bold text-primary",
                  )}
                >
                  {inMonth ? day : ""}
                </div>
                <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                  {dayEntries.slice(0, 3).map((e, j) => (
                    <div
                      key={j}
                      className={cn(
                        "h-1.5 w-full rounded-full",
                        e.kind === "birthday" ? "bg-pink-500" : "bg-primary",
                      )}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ul className="space-y-1.5">
          {[...byDay.entries()]
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .flatMap(([_d, list]) => list)
            .map((e, i) => (
              <li key={i} className="text-xs flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    e.kind === "birthday" ? "bg-pink-500" : "bg-primary",
                  )}
                />
                <span className="font-medium">{formatDate(e.date)}</span>
                <span className="text-muted-foreground truncate">
                  {e.kind === "birthday"
                    ? `${e.player.name} hat Geburtstag`
                    : `${e.match.homeAway === "home" ? "SVP" : e.match.opponent} vs ${e.match.homeAway === "home" ? e.match.opponent : "SVP"} (T${e.match.team})`}
                </span>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function downloadIcs(entries: CalendarEntry[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mafianator//SVP//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of entries) {
    if (e.kind === "match") {
      const dt = e.date;
      const end = new Date(dt.getTime() + 2 * 60 * 60_000);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${e.match.id}@mafianator`);
      lines.push(`DTSTAMP:${formatIcs(new Date())}`);
      lines.push(`DTSTART:${formatIcs(dt)}`);
      lines.push(`DTEND:${formatIcs(end)}`);
      const summary = `${e.match.homeAway === "home" ? "SVP" : e.match.opponent} vs ${e.match.homeAway === "home" ? e.match.opponent : "SVP"} (T${e.match.team})`;
      lines.push(`SUMMARY:${escapeIcs(summary)}`);
      if (e.match.location) lines.push(`LOCATION:${escapeIcs(e.match.location)}`);
      lines.push("END:VEVENT");
    } else {
      const dt = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate());
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:bd-${e.player.id}-${e.date.getFullYear()}@mafianator`);
      lines.push(`DTSTAMP:${formatIcs(new Date())}`);
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(dt)}`);
      lines.push(`SUMMARY:🎂 ${escapeIcs(e.player.name)}`);
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mafianator.ics";
  a.click();
  URL.revokeObjectURL(url);
}

function formatIcs(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}00Z`;
}

function formatIcsDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function escapeIcs(s: string): string {
  return s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}
