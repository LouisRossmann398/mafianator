# Mafianator – SV Petershausen

Mobile-first PWA für die Mannschaftskasse, Strafen, Tipprunde, Kalender und Glücksrad-Minispiel
der 1. und 2. Herren beim SV Petershausen.

## Was die App kann

- **Mannschaftskasse**: Jeder Spieler startet bei -100 €. Strafen senken den Saldo, gute Taten heben
  ihn. Am Saisonende wird ausbezahlt, falls > -100 € (also wenn weniger Strafen kassiert).
- **Strafenkatalog**: Vordefinierte Strafen (Gelbe Karte, Verspätung, Eigentor, …) mit
  Standard-Beträgen, editierbar durch Admin und Mannschaftskasseninhaber.
- **Glücksrad „Doppelt oder Nichts“**: Für Strafen unter 10 € kannst du am Glücksrad drehen. 50/50
  Chance, server-seitig kryptografisch gewürfelt – entweder die Strafe verschwindet oder sie
  verdoppelt sich.
- **Tipprunde (Kicktipp-Style)**: Tippe alle Spiele der 1. und 2. Mannschaft. 3/2/1/0 Punkte je nach
  Treffer. Live-Tabelle mit Trefferquoten.
- **Kalender**: Spiele beider Mannschaften (automatisch von FuPa synchronisiert) plus Geburtstage
  (manuell gepflegt). Monatsansicht, Listenansicht, ICS-Export.
- **Achievements**: 8 Badges (Erster Strafzettel, Heiliger, Zocker-König, Pechvogel, Hellseher,
  Putzteufel, Im Plus, Doppelt-Verlierer).
- **Drei Rollen**: `player` (Standard), `treasurer` (Johannes & Alessandro – können Strafen
  anlegen/abhaken), `admin` (alles + Spieler, Katalog, Saison-Reset, User-Management).

## Tech-Stack

| Bereich | Tech |
| --- | --- |
| Frontend | Vite + React 18 + TypeScript + TailwindCSS + Framer Motion |
| Backend | Netlify Functions (TypeScript, Web-Standard Request/Response) |
| Persistenz | Netlify Blobs (Key-Value Stores) |
| Auth | JWT (HS256) in HttpOnly-Cookie, bcrypt-Hashes |
| Scraping | Scheduled Function (hourly) → FuPa API + JSON-LD aus HTML |
| PWA | vite-plugin-pwa, installierbar als App |

## Lokale Entwicklung

```bash
# Einmalig
npm install
cp .env.example .env
# JWT_SECRET in .env auf zufälligen langen String setzen (z.B. `openssl rand -hex 48`)

# Dev-Server starten (Vite + Netlify Functions + Blobs Emulation)
npm run dev
```

Die App läuft dann unter <http://localhost:8888> (Netlify Dev) bzw. <http://localhost:5173> (pure
Vite, ohne Functions).

### Erste Logins

Diese Standard-User werden beim ersten Start automatisch in die Blobs geseedet (Quelldatei:
[seed/users.json](seed/users.json)):

| Benutzername | Passwort | Rolle |
| --- | --- | --- |
| `admin` | `admin123` | admin |
| `johannes.bauer` | `kasse123` | treasurer |
| `alessandro.micieli` | `kasse123` | treasurer |
| `demo.spieler` | `spieler123` | player |

**WICHTIG: Diese Passwörter sofort nach dem ersten Login ändern (Profil → Passwort ändern)** oder
durch eigene bcrypt-Hashes ersetzen.

### Passwort-Hash erzeugen

```bash
npm run seed:hash -- "geheim123"
# Gibt einen bcrypt-Hash aus, der dann in seed/users.json eingefügt werden kann.
```

Du kannst auch direkt im Adminbereich (`/admin/users`) neue Logins inkl. Passwort anlegen – das
ist der bevorzugte Weg für neue Spieler.

## Deployment auf Netlify

1. **Repo zu Netlify verbinden** – Build-Command `npm run build`, Publish-Dir `dist`. Netlify
   erkennt das automatisch dank `netlify.toml`.
2. **Env Variables setzen** (Netlify UI → Site Settings → Build & deploy → Environment):
   - `JWT_SECRET` = ein langer zufälliger String (mind. 32 Zeichen). Niemals committen.
3. **Netlify Blobs** ist auf modernen Sites automatisch verfügbar – keine extra Konfiguration
   nötig.
4. **Scheduled Functions** sind in `netlify.toml` deklariert und laufen nach dem ersten Deploy
   automatisch:
   - `scrape-matches` – stündlich (Spielplan + Ergebnisse von FuPa)
   - `evaluate-bets` – alle 2 Stunden (Tipp-Auswertung)
5. **Manueller Trigger**: Im Adminbereich → „Spiele" → „Jetzt scrapen".

### Schedule-Frequenz anpassen

In [`netlify.toml`](netlify.toml) die `schedule`-Strings ändern (siehe Cron-Syntax). Empfehlung:

```toml
[functions."scrape-matches"]
  schedule = "@hourly"

[functions."evaluate-bets"]
  schedule = "0 */2 * * *"
```

## Datenmodell (Netlify Blobs Stores)

Alle Daten in JSON-Dokumenten, ein Store pro Entität. Stores werden mit Präfix
`mafianator-*` versioniert (z.B. `mafianator-penalties`):

- `users/{username}` – Login + Rolle + Player-Zuordnung
- `players/{id}` – Stammdaten
- `penalties/{id}` – Strafen (inkl. Glücksrad-Status)
- `goodDeeds/{id}` – Gute Taten
- `catalog/{id}` – Strafenkatalog
- `matches/{id}` – Spielplan (von FuPa + manuell ergänzbar)
- `bets/{userId__matchId}` – Tipps
- `seasons/{id}` – Saisons (eine aktiv)
- `birthdays/{playerId}` – Geburtstage
- `achievements/{userId}` – Freigeschaltete Badges
- `meta/*` – Scrape-Status, Seed-Version etc.

### Saison-Reset

Adminbereich → „Saison" → „Neue Saison starten". Archiviert alle Strafen, gute Taten, Tipps und
Achievements unter `archive-{seasonId}-{store}/*`. Spieler, Katalog und Login-Daten bleiben
erhalten.

## FuPa-Scraping

Da FuPa keine offizielle API hat, lesen wir aus zwei Quellen:

1. **Vergangene Spiele mit Ergebnissen**: `https://api.fupa.net/v1/teams/sv-petershausen-m{1|2}-2025-26/matches?flavor=past`
2. **Kommende Spiele**: JSON-LD im HTML von `https://www.fupa.net/club/sv-petershausen/matches`

Beides zusammengeführt im Store `matches`. Manuell vom Admin gepflegte Spiele mit Ergebnis werden
nie überschrieben (Source `manual` gewinnt).

Wenn FuPa irgendwann das Format ändert: Parser-Code liegt isoliert in
[`netlify/functions/_lib/scrapers/fupa.ts`](netlify/functions/_lib/scrapers/fupa.ts).

## Punktevergabe Tipprunde

| Treffer | Punkte |
| --- | --- |
| Exaktes Ergebnis | 3 |
| Richtige Tordifferenz (außer 0:0) | 2 |
| Richtige Tendenz (Sieg/Niederlage/Unentschieden) | 1 |
| Falsch | 0 |

Auswertung läuft automatisch alle 2 Stunden bzw. wenn jemand die Tabelle aufruft (Live-Refresh).

## Sicherheit / Hinweise

- Passwörter werden mit bcrypt (cost 12) gehasht; Klartext-Passwörter NIE committen.
- JWT-Secret nur als Env-Variable, nie ins Repo.
- Strafen-Beträge, Tipps und Glücksrad-Ergebnisse werden **alle server-seitig validiert**. Das
  Glücksrad nutzt `crypto.randomInt` und vergibt das Ergebnis BEVOR die Animation startet.
- Repo MUSS privat bleiben, auch wenn nur Hashes drin sind (Defense-in-depth).

## Scripts

- `npm run dev` – Netlify Dev (Functions + Blobs + Vite)
- `npm run dev:vite` – nur Vite (für UI-Hacking ohne Functions)
- `npm run build` – Production Build
- `npm run preview` – Production Preview lokal
- `npm run typecheck` – TypeScript checken
- `npm run seed:hash -- <password>` – bcrypt-Hash erzeugen

## Mannschaft hinzufügen

1. Admin geht in `/admin/players` → „Spieler hinzufügen". Trikotnummer, Team (1 oder 2),
   Geburtsdatum.
2. Anschließend in `/admin/users` Login anlegen und Spieler-ID auf den eben angelegten Spieler
   setzen.
3. Optional in `/admin/birthdays` ein Geburtsdatum hinterlegen.

Fertig – der Spieler kann sich einloggen und Strafen sehen / Tipps abgeben / am Glücksrad drehen.

## Lizenz

Privates Projekt, intern für die Mannschaft.
