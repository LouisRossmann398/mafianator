import { fetchAllMatches, fetchUpcomingMatches } from "../netlify/functions/_lib/scrapers/fupa.ts";

const matches = await fetchAllMatches();
const upcomingOnly = await fetchUpcomingMatches();
const now = Date.now();
const upcoming = matches.filter((m) => !m.result && new Date(m.kickoff).getTime() > now);
const roehrmoos = matches.filter((m) =>
  m.opponent.toLowerCase().includes("röhr") || m.opponent.toLowerCase().includes("roehr"),
);

console.log("Total:", matches.length);
console.log("Upcoming (no result, future):", upcoming.length);
console.log("Upcoming from JSON-LD only:", upcomingOnly.length);
console.log("\nUpcoming list:");
for (const m of upcoming) {
  console.log(`  T${m.team} ${m.homeAway} vs ${m.opponent} @ ${m.kickoff}`);
}
console.log("\nRoehrmoos matches:");
for (const m of roehrmoos) {
  console.log(`  T${m.team} ${m.homeAway} vs ${m.opponent} @ ${m.kickoff} result=${JSON.stringify(m.result)}`);
}
