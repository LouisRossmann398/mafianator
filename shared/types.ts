export type Role = "player" | "treasurer" | "admin";

export interface UserRecord {
  username: string;
  passwordHash: string;
  role: Role;
  playerId: string;
  displayName: string;
}

export type UserPublic = Omit<UserRecord, "passwordHash">;

export type TeamId = 1 | 2;

export interface Player {
  id: string;
  name: string;
  team: TeamId;
  birthdate?: string;
  avatarSeed?: string;
  jerseyNumber?: number;
  active: boolean;
}

export type PenaltyStatus =
  | "open"
  | "paid"
  | "gambled-won"
  | "gambled-lost"
  | "doubled";

export interface Penalty {
  id: string;
  playerId: string;
  amount: number;
  reason: string;
  catalogId?: string;
  canGamble: boolean;
  createdBy: string;
  createdAt: string;
  status: PenaltyStatus;
  paidAt?: string;
  gambledAt?: string;
  gambleResult?: "won" | "lost";
  originalAmount?: number;
}

export interface GoodDeed {
  id: string;
  playerId: string;
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface CatalogEntry {
  id: string;
  label: string;
  defaultAmount: number;
  category: string;
  canGamble: boolean;
}

export interface Match {
  id: string;
  team: TeamId;
  opponent: string;
  homeAway: "home" | "away";
  kickoff: string;
  location?: string;
  league: string;
  result?: {
    homeGoals: number;
    awayGoals: number;
  };
  source: "fupa" | "manual" | "bfv";
  scrapedAt?: string;
  updatedAt: string;
}

export interface Bet {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  submittedAt: string;
  points?: number;
  evaluatedAt?: string;
}

export interface Season {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  startBalance: number;
  active: boolean;
}

export interface Birthday {
  playerId: string;
  date: string;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface AchievementsRecord {
  userId: string;
  badges: Achievement[];
  stats: {
    penaltiesTotal: number;
    penaltiesAmount: number;
    goodDeedsTotal: number;
    goodDeedsAmount: number;
    gamblesWon: number;
    gamblesLost: number;
    betsCorrectInARow: number;
    longestStreakPenaltyFreeDays: number;
  };
}

export interface BalanceSummary {
  playerId: string;
  startBalance: number;
  penaltiesSum: number;
  goodDeedsSum: number;
  balance: number;
}

export interface AuthResponse {
  user: UserPublic;
}
