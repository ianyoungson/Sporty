# Sporty

A phone-first web app for following your teams: live games, where to watch them in Australia, detailed match stats, and news.

## Features
- **Games**: live now, upcoming (next 4 weeks) and recent results (last 7 days) for your favourites. Live games refresh every 30 seconds.
- **Where to watch**: Australian TV and streaming services for each competition (Stan Sport, Kayo, Fox, Paramount+, beIN, 9Now, 7plus and others), plus the US channel ESPN reports.
- **Match centre**: score, scorers, team stats with comparison bars, timeline (goals, cards, subs, tries), lineups, player stats, period scores, venue, officials and match news. Updates every 20 seconds while a game is live.
- **News**: stories about your teams, or everything from your leagues.
- **Teams**: your favourites grouped by sport. Tap ＋ to follow any team from the Premier League, Championship, Liga Portugal, Saudi Pro League, A-League, AFL, NRL, Super Rugby, NBL, internationals and more.

Favourites are saved on your device.

## Data sources
- **ESPN public API** (fetched by your browser): scores, fixtures, match stats, lineups and news for football, AFL, NRL, rugby union and NBL; live cricket from ESPN's cricket scoreboard feed.
- **Flashscore**: every team links to its Flashscore page (live, fixtures, results, news). Teams that no open feed covers (Australia U23/U20, Brisbane Lions W, Sherwood) open straight on Flashscore. Flashscore has no public API, so the app links to it and doesn't pull data from it.
- **ESPNcricinfo**: links for cricket teams.

Sources checked and not used: Squiggle (AFL) doesn't allow websites to fetch from it in visitors' browsers; TheSportsDB's free key only returns home games and limits team search.

## Limits
- No cricket news feed; cricket shows only current and recent matches.
- AFLW, local clubs and youth national teams have no open data feed, so they link out to Flashscore.
- Broadcaster guide reflects rights as of Nov 2026. Rights change, so check with the broadcaster. Edit `AU_WATCH` in `js/config.js` to update.

## Run it
It's a static site with no build step. Any static host works (GitHub Pages, Netlify, Vercel). Locally:

```
python3 -m http.server 8000
```

On iPhone, open the site in Safari, tap Share → Add to Home Screen to use it like an app.

## Test
`node tests/mock-test.mjs /tmp` runs the app in a headless phone browser against mocked ESPN data and saves screenshots.
