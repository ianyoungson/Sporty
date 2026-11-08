# Sporty

A phone-first web app for following your teams: live games, where to watch them in Australia, detailed match stats, and news.

## Features
- **Games**: live now, upcoming (next 4 weeks) and recent results (last 7 days) for your favourites. Live games refresh every 30 seconds.
- **Where to watch**: Australian TV and streaming services for each competition (Stan Sport, Kayo, Fox, Paramount+, beIN, 9Now, 7plus and others), plus the US channel ESPN reports.
- **Match centre**: score, scorers, team stats with comparison bars, timeline (goals, cards, subs, tries), lineups, player stats, period scores, venue, officials and match news. Updates every 20 seconds while a game is live.
- **News**: stories about your teams, or everything from your leagues.
- **Teams**: your favourites grouped by sport. Tap ＋ to follow any team from the Premier League, Championship, Liga Portugal, Saudi Pro League, A-League, AFL, NRL, Super Rugby, NBL, internationals and more.

Data comes from ESPN's public site API, fetched directly by your browser. Favourites are saved on your device.

## Limits
- Cricket has no open ESPN feed, so cricket teams link to ESPNcricinfo.
- AFLW, local clubs (e.g. Sherwood) and youth national teams aren't in ESPN's feed.
- Broadcaster guide reflects rights as of Nov 2026. Rights change, so check with the broadcaster. Edit `AU_WATCH` in `js/config.js` to update.

## Run it
It's a static site with no build step. Any static host works (GitHub Pages, Netlify, Vercel). Locally:

```
python3 -m http.server 8000
```

On iPhone, open the site in Safari, tap Share → Add to Home Screen to use it like an app.

## Test
`node tests/mock-test.mjs /tmp` runs the app in a headless phone browser against mocked ESPN data and saves screenshots.
