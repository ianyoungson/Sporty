// Runs the app in a headless phone browser with fake ESPN responses.
// Usage: node tests/mock-test.mjs <outdir>
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2] || '/tmp';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'text/plain' }); res.end(d); });
}).listen(8765);

const now = Date.now();
const iso = h => new Date(now + h * 36e5).toISOString();
const team = (id, name, short) => ({ id, displayName: name, shortDisplayName: short || name, name: short || name, abbreviation: (short || name).slice(0, 3).toUpperCase() });
const status = (state, detail) => ({ displayClock: "67'", type: { state, shortDetail: detail, detail, completed: state === 'post' } });
const ev = (id, h, home, away, st, hs, as, extra = {}) => ({ id, date: iso(h), competitions: [{ status: st, venue: { fullName: 'Stadium' },
  competitors: [{ homeAway: 'home', team: home, score: hs, winner: +hs > +as }, { homeAway: 'away', team: away, score: as, winner: +as > +hs }], ...extra }] });
const spurs = team('367', 'Tottenham Hotspur', 'Tottenham'), hull = team('306', 'Hull City', 'Hull'), ars = team('359', 'Arsenal');
const boards = {
  'soccer/eng.1': { events: [
    ev('1001', -0.8, spurs, hull, status('in', "67'"), '2', '1', { broadcasts: [{ market: 'national', names: ['Peacock'] }] }),
    ev('1002', 50, ars, spurs, status('pre', 'Sat'), '0', '0'),
    ev('1003', -96, hull, ars, status('post', 'FT'), '0', '3') ] },
  'soccer/aus.1': { events: [ ev('2001', 30, team('1', 'Brisbane Roar'), team('2', 'Sydney FC'), status('pre', ''), '0', '0') ] },
  'rugby/242041': { events: [] },
};
const summary = {
  header: { competitions: [{ date: iso(-0.8), status: status('in', "67'"), competitors: [
    { homeAway: 'home', team: { ...spurs, logos: [] }, score: '2' }, { homeAway: 'away', team: { ...hull, logos: [] }, score: '1' }] }] },
  boxscore: { teams: [
    { team: spurs, statistics: [{ name: 'possessionPct', label: 'Possession', displayValue: '58.2' }, { name: 'totalShots', label: 'Shots', displayValue: '14' }, { name: 'shotsOnTarget', label: 'On Target', displayValue: '6' }, { name: 'wonCorners', label: 'Corners', displayValue: '5' }, { name: 'foulsCommitted', label: 'Fouls', displayValue: '9' }] },
    { team: hull, statistics: [{ name: 'possessionPct', label: 'Possession', displayValue: '41.8' }, { name: 'totalShots', label: 'Shots', displayValue: '7' }, { name: 'shotsOnTarget', label: 'On Target', displayValue: '3' }, { name: 'wonCorners', label: 'Corners', displayValue: '2' }, { name: 'foulsCommitted', label: 'Fouls', displayValue: '12' }] } ] },
  keyEvents: [
    { type: { text: 'Kickoff' }, clock: { displayValue: "0'" }, text: 'First half begins.' },
    { type: { text: 'Goal' }, scoringPlay: true, clock: { displayValue: "12'" }, team: { id: '367' }, participants: [{ athlete: { displayName: 'Son Heung-min' } }], text: 'Goal! Tottenham 1, Hull 0.' },
    { type: { text: 'Yellow Card' }, clock: { displayValue: "30'" }, team: { id: '306' }, text: 'Booked for a late tackle.' },
    { type: { text: 'Goal' }, scoringPlay: true, clock: { displayValue: "44'" }, team: { id: '306' }, participants: [{ athlete: { displayName: 'L. Herrington' } }], text: 'Goal! Tottenham 1, Hull 1.' },
    { type: { text: 'Goal' }, scoringPlay: true, clock: { displayValue: "61'" }, team: { id: '367' }, participants: [{ athlete: { displayName: 'J. Maddison' } }], text: 'Goal! Tottenham 2, Hull 1.' } ],
  rosters: [{ team: spurs, formation: '4-3-3', roster: [{ starter: true, jersey: '1', athlete: { displayName: 'G. Vicario' }, position: { abbreviation: 'G' } }, { starter: false, jersey: '20', athlete: { displayName: 'Sub Player' }, subbedIn: true }] },
            { team: hull, formation: '4-2-3-1', roster: [{ starter: true, jersey: '1', athlete: { displayName: 'Keeper' }, position: { abbreviation: 'G' } }] }],
  gameInfo: { venue: { fullName: 'Tottenham Hotspur Stadium', address: { city: 'London' } }, attendance: 61203, officials: [{ displayName: 'M. Oliver' }] },
  broadcasts: [{ media: { shortName: 'Peacock' } }],
};
const news = { articles: [
  { id: 1, headline: 'Tottenham beat Hull in thriller', description: 'Spurs edge it.', published: iso(-2), images: [{ url: 'http://localhost:8765/icon-512.png' }], links: { web: { href: 'https://espn.com' } }, categories: [{ type: 'team', teamId: 367 }] },
  { id: 2, headline: 'Arsenal injury news', description: 'Unrelated.', published: iso(-5), links: { web: { href: 'https://espn.com' } } } ] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && !m.text().includes('Failed to load resource') && errors.push(m.text()));
await page.route('https://site.api.espn.com/**', r => {
  const u = new URL(r.request().url());
  const comp = (u.pathname.split('/sports/')[1] || '').split('/').slice(0, 2).join('/');
  let body = { events: [] };
  if (u.pathname.endsWith('/scoreboard/header')) body = { sports: [{ leagues: [{ slug: '9001', shortName: 'AUS v IND', events: [
    { id: '777', date: iso(-3), fullStatus: { type: { state: 'in' } }, summary: 'Day 2 - IND trail by 120 runs',
      competitors: [{ homeAway: 'home', displayName: 'Australia', score: '345/6' }, { homeAway: 'away', displayName: 'India', score: '225' }] }] }] }] };
  else if (u.pathname.endsWith('/scoreboard')) body = boards[comp] || { events: [] };
  else if (u.pathname.endsWith('/summary')) body = summary;
  else if (u.pathname.endsWith('/news')) body = comp === 'soccer/eng.1' ? news : { articles: [] };
  else if (u.pathname.endsWith('/teams')) body = { sports: [{ leagues: [{ teams: [{ team: spurs }, { team: ars }, { team: hull }] }] }] };
  r.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
});
const shot = async (name, hash, wait) => {
  await page.goto('http://localhost:8765/' + hash); await page.waitForSelector(wait, { timeout: 8000 });
  await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
};
await shot('games', '#/games', '.game');
const liveCount = await page.locator('.game.is-live').count();
await shot('game', '#/game/soccer%2Feng.1/1001', '.stat');
const statRows = await page.locator('.stat').count();
await page.click('[data-t="Timeline"]'); await page.screenshot({ path: `${out}/timeline.png`, fullPage: true });
await page.click('[data-t="Lineups"]');
await shot('news', '#/news', '.news');
const newsCount = await page.locator('.news').count();
await shot('teams', '#/teams', '.trow-team');
await shot('team', '#/team/spurs', '.team-hero');
await shot('add', '#/add', '.star');
await shot('linkonly', '#/team/lions-w', '.team-hero');
const fsHref = await page.locator('a.btn').first().getAttribute('href');
await shot('cricket', '#/game/cricket%2F9001/777', '.empty, .scorebox');
const cricketGameShown = await page.locator('.links a').count();
await page.goto('http://localhost:8765/#/games'); await page.waitForSelector('.game');
const cricketCard = await page.locator('.game', { hasText: 'India' }).count();
console.log(JSON.stringify({ liveCount, statRows, newsCount, fsHref, cricketCard, cricketGameShown, errors }));
await browser.close(); server.close();
