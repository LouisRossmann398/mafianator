import {
  BFV_COMPOUND_IDS,
  LEAGUE_LABELS,
  SVP_TEAM_IDS,
  TIP_SEASON_ID,
  involvesSvpIds,
  involvesSvpName,
  svpTeamFromLeague,
} from "@shared/leagues";
import type { LeagueKey, LeagueMatch, TeamId } from "@shared/types";

const BFV_BASE = "https://widget-prod.bfv.de/api/service/widget/v1";

interface BfvTeamRow {
  team: { permanentId: string; name: string };
}

interface BfvTableResponse {
  state: number;
  data?: { table: BfvTeamRow[] };
}

interface BfvRawMatch {
  matchId: string;
  compoundId: string;
  competitionName: string;
  kickoffDate: string | null;
  kickoffTime: string | null;
  homeTeamName: string;
  homeTeamPermanentId: string;
  guestTeamName: string;
  guestTeamPermanentId: string;
  result: string;
}

interface BfvMatchesResponse {
  state: number;
  data?: { matches: BfvRawMatch[] };
}

function parseBfvDate(date: string | null, time: string | null): string {
  if (!date) return new Date(0).toISOString();
  const [day, month, year] = date.split(".").map(Number);
  const [hour = 0, minute = 0] = (time ?? "00:00").split(":").map(Number);
  const local = new Date(year, month - 1, day, hour, minute, 0);
  return local.toISOString();
}

function parseResult(raw: string): { homeGoals: number; awayGoals: number } | undefined {
  if (!raw || raw === "-:-" || raw === ":") return undefined;
  const parts = raw.split(":");
  if (parts.length !== 2) return undefined;
  const homeGoals = Number(parts[0]);
  const awayGoals = Number(parts[1]);
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return undefined;
  return { homeGoals, awayGoals };
}

function assignRounds(matches: LeagueMatch[]): void {
  const sorted = [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const rounds: LeagueMatch[][] = [];
  for (const m of sorted) {
    const t = new Date(m.kickoff).getTime();
    const lastRound = rounds[rounds.length - 1];
    if (!lastRound) {
      rounds.push([m]);
      continue;
    }
    const lastDate = Math.max(...lastRound.map((x) => new Date(x.kickoff).getTime()));
    if (t - lastDate > 4 * 24 * 60 * 60 * 1000) {
      rounds.push([m]);
    } else {
      lastRound.push(m);
    }
  }
  rounds.forEach((round, index) => {
    for (const m of round) m.round = index + 1;
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`BFV ${res.status}: ${url}`);
  return (await res.json()) as T;
}

async function fetchTeamIds(compoundId: string): Promise<string[]> {
  const data = await fetchJson<BfvTableResponse>(
    `${BFV_BASE}/competition/${compoundId}/table`,
  );
  if (data.state !== 0 || !data.data?.table?.length) {
    throw new Error(`BFV-Tabelle leer für ${compoundId}`);
  }
  return data.data.table.map((row) => row.team.permanentId);
}

async function fetchTeamMatches(teamId: string): Promise<BfvRawMatch[]> {
  const data = await fetchJson<BfvMatchesResponse>(`${BFV_BASE}/team/${teamId}/matches`);
  if (data.state !== 0 || !data.data?.matches) return [];
  return data.data.matches;
}

function rawToLeagueMatch(raw: BfvRawMatch, leagueKey: LeagueKey): LeagueMatch | null {
  const compoundId = BFV_COMPOUND_IDS[leagueKey];
  if (raw.compoundId !== compoundId) return null;

  const involvesSvp =
    involvesSvpIds(raw.homeTeamPermanentId, raw.guestTeamPermanentId, leagueKey) ||
    involvesSvpName(raw.homeTeamName, raw.guestTeamName);

  let team: TeamId | undefined;
  if (involvesSvp) {
    const svpId = SVP_TEAM_IDS[leagueKey];
    team = svpTeamFromLeague(leagueKey);
    if (raw.homeTeamPermanentId !== svpId && raw.guestTeamPermanentId !== svpId) {
      team = svpTeamFromLeague(leagueKey);
    }
  }

  const now = new Date().toISOString();
  return {
    id: `bfv-${raw.matchId}`,
    seasonId: TIP_SEASON_ID,
    leagueKey,
    round: 0,
    homeTeamName: raw.homeTeamName,
    awayTeamName: raw.guestTeamName,
    involvesSvp,
    tippable: !involvesSvp,
    kickoff: parseBfvDate(raw.kickoffDate, raw.kickoffTime),
    league: raw.competitionName || LEAGUE_LABELS[leagueKey],
    result: parseResult(raw.result),
    bfvMatchId: raw.matchId,
    source: "bfv",
    team,
    scrapedAt: now,
    updatedAt: now,
  };
}

export async function fetchLeagueMatches(leagueKey: LeagueKey): Promise<LeagueMatch[]> {
  const compoundId = BFV_COMPOUND_IDS[leagueKey];
  const teamIds = await fetchTeamIds(compoundId);
  const byId = new Map<string, LeagueMatch>();

  const batchSize = 5;
  for (let i = 0; i < teamIds.length; i += batchSize) {
    const batch = teamIds.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((id) => fetchTeamMatches(id)));
    for (const matches of results) {
      for (const raw of matches) {
        const mapped = rawToLeagueMatch(raw, leagueKey);
        if (mapped) byId.set(mapped.id, mapped);
      }
    }
  }

  const list = [...byId.values()];
  assignRounds(list);
  return list.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export async function syncAllLeagueMatches(): Promise<{
  matches: LeagueMatch[];
  kreisklasse: number;
  cKlasse: number;
}> {
  const [kk, ck] = await Promise.all([
    fetchLeagueMatches("kreisklasse"),
    fetchLeagueMatches("c-klasse"),
  ]);
  return {
    matches: [...kk, ...ck],
    kreisklasse: kk.length,
    cKlasse: ck.length,
  };
}
