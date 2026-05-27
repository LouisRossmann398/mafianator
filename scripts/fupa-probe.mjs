/**
 * Schnelltest: Findet FuPa Spiele für SVP-Ligen?
 * Ausführen: npx tsx scripts/fupa-probe.mjs
 */
const SEASON = "2025-26";
const COMPETITIONS = [
  { key: "kreisklasse", slug: "muenchen-kreisklasse-1" },
  { key: "c-klasse", slug: "muenchen-c-klasse-1" },
];

async function main() {
  const t0 = Date.now();
  let total = 0;
  for (const { key, slug } of COMPETITIONS) {
    const compUrl = `https://api.fupa.net/v1/competitions/${slug}/seasons/${SEASON}/matches?flavor=past`;
    const compRes = await fetch(compUrl, { headers: { "User-Agent": "Mafianator-probe" } });
    if (!compRes.ok) {
      console.error(key, "competition API", compRes.status);
      continue;
    }
    const compMatches = await compRes.json();
    const teams = new Set();
    for (const m of compMatches) {
      teams.add(m.homeTeam.slug);
      teams.add(m.awayTeam.slug);
    }
    const byId = new Map();
    await Promise.all(
      [...teams].map(async (teamSlug) => {
        const url = `https://api.fupa.net/v1/teams/${teamSlug}/matches?flavor=past`;
        const r = await fetch(url, { headers: { "User-Agent": "Mafianator-probe" } });
        if (!r.ok) return;
        const data = await r.json();
        for (const m of data) {
          if (m.competition?.slug !== slug) continue;
          byId.set(m.slug, m);
        }
      }),
    );
    console.log(`${key}: ${byId.size} Spiele, ${teams.size} Teams`);
    total += byId.size;
  }
  console.log(`Gesamt: ${total} Spiele in ${Date.now() - t0} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
