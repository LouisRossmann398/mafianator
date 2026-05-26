export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-penalty",
    title: "Erster Strafzettel",
    description: "Die erste Strafe der Saison kassiert.",
    emoji: "🥲",
  },
  {
    id: "saint",
    title: "Heiliger",
    description: "30 Tage am Stück strafenfrei.",
    emoji: "😇",
  },
  {
    id: "wheel-master",
    title: "Zocker-König",
    description: "5 Mal am Glücksrad gewonnen.",
    emoji: "🎰",
  },
  {
    id: "wheel-loser",
    title: "Pechvogel",
    description: "3 Mal in Folge am Glücksrad verloren.",
    emoji: "💀",
  },
  {
    id: "tipp-prophet",
    title: "Hellseher",
    description: "5 Tipps in Folge richtig.",
    emoji: "🔮",
  },
  {
    id: "good-samaritan",
    title: "Putzteufel",
    description: "3 Gute-Tat-Boni in einem Monat.",
    emoji: "🧹",
  },
  {
    id: "first-cash",
    title: "Im Plus!",
    description: "Du stehst über -100 EUR. Saubere Sache.",
    emoji: "💰",
  },
  {
    id: "doubled-up",
    title: "Doppelt-Verlierer",
    description: "Strafe verdoppelt - die App lacht.",
    emoji: "🎲",
  },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
