import { COMPETITIONS, DEFAULT_TEAMS, GROUP_ORDER, GROUP_ICON, AU_WATCH } from './config.js';
import * as api from './api.js';

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').replace(/\b(fc|afc)\b/g, ' ').replace(/\s+/g, ' ').trim();
const store = {
  get(k, d) { try { const v = localStorage.getItem('sporty.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sporty.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const fmtDay = d => new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
const fmtTime = d => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
const sameDay = (a, b) => a.toDateString() === b.toDateString();
function dayLabel(d) {
  const t = new Date();
  if (sameDay(d, t)) return 'Today';
  if (sameDay(d, new Date(Date.now() + 864e5))) return 'Tomorrow';
  if (sameDay(d, new Date(Date.now() - 864e5))) return 'Yesterday';
  return fmtDay(d);
}
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return fmtDay(new Date(iso));
}
const initials = n => esc(String(n).split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase());
const logoImg = (url, name, cls = 'logo') => url
  ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} ph',textContent:'${initials(name)}'}))">`
  : `<span class="${cls} ph">${initials(name)}</span>`;

// ---------- state ----------
let favs = store.get('teams', null) || structuredClone(DEFAULT_TEAMS);
const logos = store.get('logos', {});   // fav id -> logo url
const espnIds = store.get('ids', {});   // fav id -> { compKey: espn team id }
const saveFavs = () => store.set('teams', favs);
let games = [];        // flattened games involving favourites
let loadErrors = [];
let lastLoad = 0;
let refreshTimer = null;
let gameFilter = 'All';
let newsFilter = 'mine';

function favMatches(fav, compKey, team) {
  if (!team) return false;
  if (fav.espnId) return String(team.id) === String(fav.espnId) && fav.comps.includes(compKey);
  if (!fav.comps?.includes(compKey)) return false;
  const cands = [team.displayName, team.shortDisplayName, team.name, team.location].map(norm);
  return fav.names.some(n => cands.includes(norm(n)));
}

function broadcastNames(comp) {
  const out = new Set();
  for (const b of comp.broadcasts || []) {
    for (const n of b.names || []) out.add(n);
    if (b.media?.shortName) out.add(b.media.shortName);
  }
  for (const g of comp.geoBroadcasts || []) if (g.media?.shortName) out.add(g.media.shortName);
  return [...out];
}

function toGame(compKey, ev, leagueName) {
  const c = ev.competitions?.[0];
  if (!c) return null;
  const side = ha => {
    const x = c.competitors.find(t => t.homeAway === ha) || c.competitors[ha === 'home' ? 0 : 1];
    return x && { id: x.team?.id, name: x.team?.shortDisplayName || x.team?.displayName, full: x.team?.displayName,
      logo: x.team?.logo || x.team?.logos?.[0]?.href, score: x.score?.displayValue ?? x.score, winner: x.winner, team: x.team };
  };
  const st = c.status || ev.status || {};
  return {
    key: compKey, id: ev.id, date: new Date(ev.date || c.date), league: leagueName,
    state: st.type?.state, detail: st.type?.shortDetail || st.type?.detail, completed: st.type?.completed,
    clock: st.displayClock, home: side('home'), away: side('away'),
    venue: c.venue?.fullName, usTv: broadcastNames(c), favs: [],
  };
}

async function loadGames(force = false) {
  if (!force && Date.now() - lastLoad < 25_000 && games.length) return;
  const comps = [...new Set(favs.flatMap(f => f.comps || []))];
  const errs = [];
  const results = await Promise.all(comps.map(async key => {
    try {
      const d = await api.scoreboard(key, undefined, force ? 0 : 25_000);
      const league = COMPETITIONS[key]?.name || d.leagues?.[0]?.name || key;
      return (d.events || []).map(ev => {
        const g = toGame(key, ev, league);
        if (!g) return null;
        for (const f of favs) {
          for (const side of [g.home, g.away]) {
            if (side && favMatches(f, key, side.team)) {
              g.favs.push(f.id);
              if (side.logo) logos[f.id] = side.logo;
              (espnIds[f.id] ||= {})[key] = side.id;
            }
          }
        }
        return g.favs.length ? g : null;
      }).filter(Boolean);
    } catch (e) { errs.push(COMPETITIONS[key]?.name || key); return []; }
  }));
  const seen = new Set();
  games = results.flat().filter(g => !seen.has(g.key + g.id) && seen.add(g.key + g.id));
  games.sort((a, b) => a.date - b.date);
  loadErrors = errs;
  lastLoad = Date.now();
  store.set('logos', logos); store.set('ids', espnIds);
  updateLiveBadge();
}

function updateLiveBadge() {
  const n = games.filter(g => g.state === 'in').length;
  const b = $('#live-badge');
  b.textContent = n; b.hidden = !n;
}

function schedule(fn, ms) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(fn, ms);
}

// ---------- shared bits ----------
function watchChips(key, usTv = []) {
  const au = AU_WATCH[key] || [];
  if (!au.length && !usTv.length) return '';
  return `<div class="watch">📺 ${au.map(n => `<span class="chip tv">${esc(n)}</span>`).join('')}
    ${usTv.length ? `<span class="chip us" title="US broadcast (from ESPN)">US: ${esc(usTv.join(', '))}</span>` : ''}</div>`;
}

function gameCard(g) {
  const live = g.state === 'in';
  const pre = g.state === 'pre';
  const row = s => `<div class="trow ${s?.winner ? 'win' : ''}">${logoImg(s?.logo, s?.name || '?', 'tlogo')}
    <span class="tname">${esc(s?.name || 'TBD')}</span><span class="score">${pre ? '' : esc(s?.score ?? '')}</span></div>`;
  const status = live ? `<span class="live-dot"></span>${esc(g.detail || g.clock || 'LIVE')}`
    : pre ? esc(fmtTime(g.date)) : esc(g.detail || 'FT');
  return `<a class="card game ${live ? 'is-live' : ''}" href="#/game/${encodeURIComponent(g.key)}/${g.id}">
    <div class="ghead"><span class="league">${esc(g.league)}</span><span class="status ${live ? 'live' : ''}">${status}</span></div>
    ${row(g.home)}${row(g.away)}
    ${pre || live ? watchChips(g.key, g.usTv) : ''}
  </a>`;
}

function groupByDay(list) {
  const out = [];
  for (const g of list) {
    const label = dayLabel(g.date);
    if (!out.length || out.at(-1).label !== label) out.push({ label, items: [] });
    out.at(-1).items.push(g);
  }
  return out;
}

const loading = (msg = 'Loading…') => `<div class="empty"><div class="spinner"></div>${esc(msg)}</div>`;

// ---------- views ----------
async function viewGames(root) {
  setHeader('Games');
  if (!games.length) root.innerHTML = loading('Loading your games…');
  await loadGames();
  const groups = ['All', ...GROUP_ORDER.filter(gp => games.some(g => favs.find(f => g.favs.includes(f.id) && f.group === gp)))];
  if (!groups.includes(gameFilter)) gameFilter = 'All';
  const list = gameFilter === 'All' ? games : games.filter(g => favs.some(f => g.favs.includes(f.id) && f.group === gameFilter));
  const live = list.filter(g => g.state === 'in');
  const next = list.filter(g => g.state === 'pre');
  const done = list.filter(g => g.state === 'post').reverse();
  const section = (title, arr, byDay = true) => arr.length ? `<h2 class="sec">${title}</h2>` +
    (byDay ? groupByDay(arr).map(d => `<h3 class="day">${esc(d.label)}</h3>${d.items.map(gameCard).join('')}`).join('') : arr.map(gameCard).join('')) : '';
  root.innerHTML = `
    <div class="chips filter">${groups.map(gp => `<button class="chip ${gp === gameFilter ? 'on' : ''}" data-f="${esc(gp)}">${gp === 'All' ? 'All' : GROUP_ICON[gp] + ' ' + esc(gp)}</button>`).join('')}</div>
    ${section('<span class="live-dot"></span> Live now', live, false)}
    ${section('Upcoming', next)}
    ${section('Recent results', done)}
    ${!list.length ? `<div class="empty">No games in the last week or next 4 weeks for your teams.</div>` : ''}
    ${loadErrors.length ? `<p class="note">Couldn't load: ${esc(loadErrors.join(', '))}</p>` : ''}
    <p class="note">Times shown in your local time. Tap Games in the bar below to refresh.</p>`;
  root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { gameFilter = b.dataset.f; viewGames(root); });
  if (live.length) schedule(() => route(), 30_000);
}

async function viewGame(root, key, id) {
  const comp = COMPETITIONS[key];
  setHeader(comp?.name || 'Match', true);
  if (!root.dataset.game || root.dataset.game !== key + id) {
    root.innerHTML = loading('Loading match…');
    root.dataset.game = key + id;
    root.dataset.tab = '';
  }
  let d;
  try { d = await api.summary(key, id); }
  catch { root.innerHTML = `<div class="empty">Couldn't load this match. Check your connection and try again.</div>`; return; }
  if (location.hash !== `#/game/${encodeURIComponent(key)}/${id}`) return;

  const hc = d.header?.competitions?.[0] || {};
  const cs = hc.competitors || [];
  const home = cs.find(c => c.homeAway === 'home') || cs[0] || {};
  const away = cs.find(c => c.homeAway === 'away') || cs[1] || {};
  const st = hc.status || {};
  const state = st.type?.state;
  const date = new Date(hc.date);
  const teamLogo = c => c.team?.logos?.[0]?.href || c.team?.logo;
  const teamName = c => c.team?.displayName || c.team?.name || 'TBD';
  const bc = broadcastNames(hc).concat(broadcastNames({ broadcasts: d.broadcasts || [] }));

  const statusText = state === 'in' ? `<span class="live-dot"></span>${esc(st.type?.shortDetail || st.displayClock || 'LIVE')}`
    : state === 'pre' ? `${esc(fmtDay(date))} · ${esc(fmtTime(date))}` : esc(st.type?.detail || 'Full time');

  const tabs = [];
  const statsHtml = renderTeamStats(d, home, away);
  const lineHtml = renderLinescore(home, away);
  if (statsHtml || lineHtml) tabs.push(['Stats', lineHtml + statsHtml]);
  const tl = renderTimeline(d, home, away);
  if (tl) tabs.push(['Timeline', tl]);
  const lu = renderLineups(d, home, away);
  if (lu) tabs.push(['Lineups', lu]);
  const pl = renderPlayers(d);
  if (pl) tabs.push(['Players', pl]);
  tabs.push(['Info', renderInfo(d, hc)]);
  let active = root.dataset.tab && tabs.find(t => t[0] === root.dataset.tab) ? root.dataset.tab : tabs[0][0];

  const scoreShown = state !== 'pre';
  root.innerHTML = `
    <section class="scorebox">
      <div class="sb-league">${esc(comp?.name || d.header?.league?.name || '')}</div>
      <div class="sb-main">
        <div class="sb-team">${logoImg(teamLogo(home), teamName(home), 'blogo')}<div>${esc(teamName(home))}</div></div>
        <div class="sb-score">${scoreShown ? `${esc(home.score ?? '')}<span>–</span>${esc(away.score ?? '')}` : '<span class="vs">vs</span>'}
          <div class="sb-status ${state === 'in' ? 'live' : ''}">${statusText}</div></div>
        <div class="sb-team">${logoImg(teamLogo(away), teamName(away), 'blogo')}<div>${esc(teamName(away))}</div></div>
      </div>
      ${renderScorers(d, home, away)}
      ${watchChips(key, [...new Set(bc)])}
    </section>
    <div class="tabs">${tabs.map(([t]) => `<button class="tab ${t === active ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div>
    <div class="tabbody">${tabs.find(t => t[0] === active)[1]}</div>
    ${state === 'in' ? '<p class="note">Live — updates every 20 seconds.</p>' : ''}`;
  root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    root.dataset.tab = b.dataset.t;
    root.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b));
    $('.tabbody', root).innerHTML = tabs.find(t => t[0] === b.dataset.t)[1];
  });
  if (state === 'in') schedule(() => viewGame(root, key, id), 20_000);
}

function flatStats(team) {
  const out = [];
  for (const s of team?.statistics || []) {
    if (Array.isArray(s.stats)) out.push(...s.stats); else out.push(s);
  }
  return out.filter(s => s && (s.label || s.displayName || s.name) && s.displayValue !== undefined);
}

function renderTeamStats(d, home, away) {
  const bt = d.boxscore?.teams || [];
  if (bt.length < 2) return '';
  const h = bt.find(t => t.team?.id === home.team?.id) || bt.find(t => t.homeAway === 'home') || bt[1];
  const a = bt.find(t => t !== h) || bt[0];
  const hs = flatStats(h), as = flatStats(a);
  if (!hs.length) return '';
  const amap = new Map(as.map(s => [s.name || s.label, s]));
  const rows = hs.map(s => {
    const o = amap.get(s.name || s.label);
    if (!o) return '';
    const hv = parseFloat(String(s.displayValue).replace(/[^0-9.\-]/g, '')) || 0;
    const av = parseFloat(String(o.displayValue).replace(/[^0-9.\-]/g, '')) || 0;
    const tot = Math.abs(hv) + Math.abs(av);
    const hp = tot ? (Math.abs(hv) / tot) * 100 : 50;
    const label = s.label || s.displayName || s.name;
    return `<div class="stat">
      <div class="stat-top"><b class="${hv > av ? 'lead' : ''}">${esc(s.displayValue)}</b><span>${esc(label)}</span><b class="${av > hv ? 'lead' : ''}">${esc(o.displayValue)}</b></div>
      <div class="bar"><i class="h ${hv >= av ? 'lead' : ''}" style="width:${hp}%"></i><i class="a ${av >= hv ? 'lead' : ''}" style="width:${100 - hp}%"></i></div>
    </div>`;
  }).join('');
  return `<div class="card pad"><div class="stat-heads"><span>${esc(home.team?.abbreviation || home.team?.shortDisplayName || 'Home')}</span><span>Team stats</span><span>${esc(away.team?.abbreviation || away.team?.shortDisplayName || 'Away')}</span></div>${rows}</div>`;
}

function renderLinescore(home, away) {
  const hl = home.linescores || [], al = away.linescores || [];
  if (hl.length < 2) return '';
  const n = Math.max(hl.length, al.length);
  const cells = (c, ls) => `<tr><th>${esc(c.team?.abbreviation || c.team?.shortDisplayName || '')}</th>${Array.from({ length: n }, (_, i) => `<td>${esc(ls[i]?.displayValue ?? ls[i]?.value ?? '-')}</td>`).join('')}<td class="tot">${esc(c.score ?? '')}</td></tr>`;
  return `<div class="card pad scroll-x"><table class="tbl line"><tr><th></th>${Array.from({ length: n }, (_, i) => `<th>${i + 1}</th>`).join('')}<th>T</th></tr>${cells(home, hl)}${cells(away, al)}</table></div>`;
}

const EVENT_ICON = [[/own goal/i, '⚽'], [/penalty.*(miss|saved)/i, '❌'], [/goal|try|touchdown/i, '⚽'], [/yellow/i, '🟨'], [/red/i, '🟥'],
  [/substitution/i, '🔁'], [/conversion/i, '🎯'], [/penalty/i, '🎯'], [/var/i, '📺'], [/half|kick ?off|end|start/i, '⏱']];
const iconFor = t => (EVENT_ICON.find(([r]) => r.test(t || '')) || [0, '•'])[1];

function renderScorers(d, home, away) {
  const ke = (d.keyEvents || []).filter(e => e.scoringPlay);
  if (!ke.length) return '';
  const list = id => ke.filter(e => e.team?.id === id).map(e =>
    `${esc(e.participants?.[0]?.athlete?.displayName || e.shortText || 'Goal')} ${esc(e.clock?.displayValue || '')}`).join('<br>');
  return `<div class="scorers"><div>${list(home.team?.id)}</div><div class="ball">⚽</div><div>${list(away.team?.id)}</div></div>`;
}

function renderTimeline(d, home) {
  let ev = (d.keyEvents || []).map(e => ({ t: e.type?.text || '', clock: e.clock?.displayValue, text: e.text || e.shortText, team: e.team?.id }));
  if (!ev.length) ev = (d.scoringPlays || []).map(e => ({ t: e.type?.text || 'Score', clock: [e.period?.number ? `P${e.period.number}` : '', e.clock?.displayValue].filter(Boolean).join(' '), text: e.text + (e.homeScore !== undefined ? ` (${e.homeScore}–${e.awayScore})` : ''), team: e.team?.id }));
  if (!ev.length && d.plays) ev = d.plays.filter(p => p.scoringPlay).map(e => ({ t: e.type?.text || 'Score', clock: e.clock?.displayValue, text: e.text, team: e.team?.id }));
  if (!ev.length) return '';
  return `<div class="card timeline">${ev.slice().reverse().map(e => `
    <div class="tl ${e.team ? (e.team === home.team?.id ? 'home' : 'away') : 'neutral'}">
      <span class="tl-clock">${esc(e.clock || '')}</span><span class="tl-icon">${iconFor(e.t)}</span>
      <div><div class="tl-type">${esc(e.t)}</div><div class="tl-text">${esc(e.text || '')}</div></div>
    </div>`).join('')}</div>`;
}

function renderLineups(d) {
  const rs = d.rosters || [];
  if (!rs.length || !rs.some(r => r.roster?.length)) return '';
  return rs.map(r => {
    const players = r.roster || [];
    const starters = players.filter(p => p.starter);
    const subs = players.filter(p => !p.starter);
    const li = p => `<li><span class="num">${esc(p.jersey ?? '')}</span>${esc(p.athlete?.displayName || '')}
      <span class="pos">${esc(p.position?.abbreviation || '')}</span>${p.subbedIn ? ' <span title="Subbed on">🔼</span>' : ''}${p.subbedOut ? ' <span title="Subbed off">🔽</span>' : ''}</li>`;
    return `<div class="card pad"><h3 class="lu-head">${logoImg(r.team?.logo || r.team?.logos?.[0]?.href, r.team?.displayName || '', 'tlogo')} ${esc(r.team?.displayName || '')}
      ${r.formation ? `<span class="chip">${esc(r.formation)}</span>` : ''}</h3>
      ${starters.length ? `<h4>Starting</h4><ul class="lu">${starters.map(li).join('')}</ul>` : ''}
      ${subs.length ? `<h4>Bench</h4><ul class="lu">${subs.map(li).join('')}</ul>` : ''}</div>`;
  }).join('');
}

function renderPlayers(d) {
  let html = '';
  for (const t of d.leaders || []) {
    const cats = (t.leaders || []).filter(c => c.leaders?.length);
    if (!cats.length) continue;
    html += `<div class="card pad"><h3 class="lu-head">${esc(t.team?.displayName || '')} leaders</h3>${cats.map(c => `
      <div class="leader"><span class="lcat">${esc(c.displayName || c.name)}</span><span>${esc(c.leaders[0].athlete?.displayName || '')}</span><b>${esc(c.leaders[0].displayValue || '')}</b></div>`).join('')}</div>`;
  }
  for (const t of d.boxscore?.players || []) {
    for (const s of t.statistics || []) {
      if (!s.athletes?.length || !(s.labels || s.names)?.length) continue;
      const labels = s.labels || s.names;
      html += `<div class="card pad"><h3 class="lu-head">${logoImg(t.team?.logo, t.team?.displayName || '', 'tlogo')} ${esc(t.team?.displayName || '')}${s.name ? ` · ${esc(s.name)}` : ''}</h3>
        <div class="scroll-x"><table class="tbl players"><tr><th>Player</th>${labels.map(l => `<th>${esc(l)}</th>`).join('')}</tr>
        ${s.athletes.map(a => `<tr><th>${esc(a.athlete?.shortName || a.athlete?.displayName || '')}</th>${(a.stats || []).map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
    }
  }
  return html;
}

function renderInfo(d, hc) {
  const gi = d.gameInfo || {};
  const rows = [
    ['Kick-off', hc.date && `${fmtDay(new Date(hc.date))} · ${fmtTime(new Date(hc.date))}`],
    ['Venue', [gi.venue?.fullName, gi.venue?.address?.city, gi.venue?.address?.country].filter(Boolean).join(', ')],
    ['Attendance', gi.attendance && Number(gi.attendance).toLocaleString()],
    ['Officials', (gi.officials || []).map(o => o.displayName || o.fullName).filter(Boolean).join(', ')],
  ].filter(r => r[1]);
  const art = (d.news?.articles || []).slice(0, 5);
  const standings = d.standings?.groups?.[0]?.standings?.entries;
  return `<div class="card pad">${rows.map(([k, v]) => `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`).join('') || '<p class="note">No match info yet.</p>'}</div>
    ${standings?.length ? `<div class="card pad scroll-x"><h3 class="lu-head">Table</h3><table class="tbl"><tr><th>#</th><th>Team</th>${standings[0].stats.slice(0, 6).map(s => `<th>${esc(s.abbreviation || s.shortDisplayName || '')}</th>`).join('')}</tr>
      ${standings.map((e, i) => `<tr><td>${i + 1}</td><th>${esc(e.team?.displayName || e.team)}</th>${e.stats.slice(0, 6).map(s => `<td>${esc(s.displayValue)}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}
    ${art.length ? `<h2 class="sec">Match news</h2>${art.map(newsCard).join('')}` : ''}`;
}

function newsCard(a) {
  const img = a.images?.[0]?.url;
  const href = a.links?.web?.href || a.links?.mobile?.href || '#';
  return `<a class="card news" href="${esc(href)}" target="_blank" rel="noopener">
    ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}
    <div class="nbody">${a._tag ? `<span class="chip tag">${esc(a._tag)}</span>` : ''}
      <h3>${esc(a.headline)}</h3>${a.description ? `<p>${esc(a.description)}</p>` : ''}
      <span class="meta">${esc(a.published ? ago(a.published) : '')}${a.byline ? ' · ' + esc(a.byline) : ''}</span></div></a>`;
}

function articleFor(a, fav) {
  const ids = Object.values(espnIds[fav.id] || {}).map(String);
  if ((a.categories || []).some(c => c.type === 'team' && ids.includes(String(c.teamId ?? c.team?.id)))) return true;
  const text = ' ' + norm(`${a.headline} ${a.description}`) + ' ';
  return (fav.names || [fav.name]).some(n => norm(n).length > 3 && text.includes(' ' + norm(n) + ' '));
}

async function collectNews(onlyFav) {
  const list = onlyFav ? [onlyFav] : favs;
  const comps = [...new Set(list.flatMap(f => f.comps || []))];
  const res = await Promise.all(comps.map(k => api.news(k).then(d => (d.articles || []).map(a => ({ ...a, _comp: k }))).catch(() => [])));
  const seen = new Set();
  const all = res.flat().filter(a => a.headline && !seen.has(a.id ?? a.headline) && seen.add(a.id ?? a.headline));
  all.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
  const mine = [];
  for (const a of all) {
    const f = list.find(f => f.comps?.includes(a._comp) && articleFor(a, f));
    if (f) mine.push({ ...a, _tag: f.name });
  }
  return { all, mine };
}

async function viewNews(root) {
  setHeader('News');
  root.innerHTML = loading('Loading news…');
  if (!lastLoad) await loadGames().catch(() => {}); // learns ESPN team ids for better matching
  const { all, mine } = await collectNews();
  if (location.hash !== '#/news') return;
  const list = newsFilter === 'mine' ? mine : all.map(a => ({ ...a, _tag: COMPETITIONS[a._comp]?.name }));
  root.innerHTML = `<div class="chips filter">
      <button class="chip ${newsFilter === 'mine' ? 'on' : ''}" data-n="mine">⭐ My teams</button>
      <button class="chip ${newsFilter === 'all' ? 'on' : ''}" data-n="all">All my leagues</button></div>
    ${list.length ? list.slice(0, 60).map(newsCard).join('') : `<div class="empty">No recent stories${newsFilter === 'mine' ? ' about your teams — try “All my leagues”' : ''}.</div>`}`;
  root.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { newsFilter = b.dataset.n; viewNews(root); });
}

function teamRow(f) {
  return `<div class="trow-team">
    <a href="#/team/${esc(f.id)}" class="tlink">${logoImg(logos[f.id] || f.logo, f.name, 'tile')}
      <span class="tn">${esc(f.name)}</span><span class="flag">${esc(f.flag || '')}</span></a>
    <button class="star" data-unfollow="${esc(f.id)}" aria-label="Unfollow ${esc(f.name)}">★</button></div>`;
}

function viewTeams(root) {
  setHeader('Favourites', false, true);
  const groups = GROUP_ORDER.filter(g => favs.some(f => f.group === g)).concat([...new Set(favs.map(f => f.group))].filter(g => !GROUP_ORDER.includes(g)));
  root.innerHTML = groups.map(g => `<div class="ghd">${GROUP_ICON[g] || '🏆'} ${esc(g.toUpperCase())}</div>${favs.filter(f => f.group === g).map(teamRow).join('')}`).join('')
    + `<div class="actions"><a class="btn" href="#/add">＋ Add a team</a><button class="btn ghost" id="reset">Reset to my original list</button></div>`;
  root.querySelectorAll('[data-unfollow]').forEach(b => b.onclick = () => {
    const f = favs.find(x => x.id === b.dataset.unfollow);
    if (f && confirm(`Remove ${f.name} from favourites?`)) { favs = favs.filter(x => x !== f); saveFavs(); lastLoad = 0; viewTeams(root); }
  });
  $('#reset', root).onclick = () => { if (confirm('Reset favourites to the original list?')) { favs = structuredClone(DEFAULT_TEAMS); saveFavs(); lastLoad = 0; viewTeams(root); } };
}

async function viewTeam(root, id) {
  const f = favs.find(x => x.id === id);
  if (!f) { location.hash = '#/teams'; return; }
  setHeader(f.name, true);
  if (f.cricinfo) {
    root.innerHTML = `<div class="team-hero">${logoImg(f.logo, f.name, 'blogo')}<h2>${esc(f.name)} ${esc(f.flag || '')}</h2><p>${esc(f.group)}</p></div>
      <div class="card pad"><p>Live cricket scores aren't in ESPN's open feed, so this team opens on ESPNcricinfo.</p>
      <a class="btn" href="${esc(f.cricinfo)}" target="_blank" rel="noopener">Open on ESPNcricinfo</a>
      <p class="note">Usually on: Fox Cricket / Kayo, Seven / 7plus (home internationals).</p></div>`;
    return;
  }
  root.innerHTML = loading();
  await loadGames();
  const mine = games.filter(g => g.favs.includes(f.id));
  const live = mine.filter(g => g.state === 'in');
  const next = mine.filter(g => g.state === 'pre').slice(0, 5);
  const done = mine.filter(g => g.state === 'post').reverse().slice(0, 5);
  root.innerHTML = `<div class="team-hero">${logoImg(logos[f.id] || f.logo, f.name, 'blogo')}<h2>${esc(f.name)} ${esc(f.flag || '')}</h2>
      <p>${esc((f.comps || []).map(k => COMPETITIONS[k]?.name).filter(Boolean).join(' · '))}</p></div>
    ${live.length ? `<h2 class="sec"><span class="live-dot"></span> Live</h2>${live.map(gameCard).join('')}` : ''}
    ${next.length ? `<h2 class="sec">Next up</h2>${next.map(g => `<h3 class="day">${esc(dayLabel(g.date))}</h3>${gameCard(g)}`).join('')}` : ''}
    ${done.length ? `<h2 class="sec">Results</h2>${done.map(gameCard).join('')}` : ''}
    ${!mine.length ? '<div class="empty">No games found in the last week or next 4 weeks.</div>' : ''}
    <h2 class="sec">News</h2><div id="tnews">${loading('Loading news…')}</div>`;
  const { mine: n } = await collectNews(f);
  const box = $('#tnews', root);
  if (box) box.innerHTML = n.length ? n.slice(0, 15).map(newsCard).join('') : '<div class="empty">No recent stories.</div>';
}

async function viewAdd(root) {
  setHeader('Add a team', true);
  const opts = Object.entries(COMPETITIONS).map(([k, c]) => `<option value="${esc(k)}">${esc(c.group)} — ${esc(c.name)}</option>`).join('');
  root.innerHTML = `<div class="card pad form">
      <label>Competition<select id="comp">${opts}</select></label>
      <label>Search<input id="q" type="search" placeholder="Team name"></label></div>
    <div id="tlist">${loading()}</div>`;
  const sel = $('#comp', root), q = $('#q', root), box = $('#tlist', root);
  sel.value = store.get('lastComp', 'soccer/eng.1');
  let teams = [];
  const draw = () => {
    const term = norm(q.value);
    const key = sel.value;
    const list = teams.filter(t => !term || norm(t.displayName).includes(term));
    box.innerHTML = list.map(t => {
      const followed = favs.some(f => (f.espnId && String(f.espnId) === String(t.id) && f.comps.includes(key)) || favMatches(f, key, t));
      return `<div class="trow-team"><span class="tlink">${logoImg(t.logos?.[0]?.href, t.displayName, 'tile')}<span class="tn">${esc(t.displayName)}</span></span>
        <button class="star ${followed ? '' : 'off'}" data-tid="${esc(t.id)}" ${followed ? 'disabled' : ''} aria-label="Follow">${followed ? '★' : '☆'}</button></div>`;
    }).join('') || '<div class="empty">No teams found.</div>';
    box.querySelectorAll('[data-tid]:not([disabled])').forEach(b => b.onclick = () => {
      const t = teams.find(x => String(x.id) === b.dataset.tid);
      favs.push({ id: `x-${key}-${t.id}`, name: t.shortDisplayName || t.displayName, group: COMPETITIONS[key].group, espnId: t.id, comps: [key], logo: t.logos?.[0]?.href, names: [t.displayName] });
      saveFavs(); lastLoad = 0; draw();
    });
  };
  const load = async () => {
    store.set('lastComp', sel.value);
    box.innerHTML = loading();
    try {
      const d = await api.teams(sel.value);
      teams = (d.sports?.[0]?.leagues?.[0]?.teams || []).map(x => x.team).sort((a, b) => a.displayName.localeCompare(b.displayName));
      draw();
    } catch { box.innerHTML = '<div class="empty">Couldn’t load teams for this competition.</div>'; }
  };
  sel.onchange = load; q.oninput = draw;
  load();
}

// ---------- shell / router ----------
function setHeader(title, back = false, add = false) {
  $('#title').textContent = title;
  $('#back').hidden = !back;
  $('#add').hidden = !add;
}

async function route() {
  clearTimeout(refreshTimer);
  const root = $('#view');
  const [, page = 'games', a, b] = location.hash.split('/');
  if (page !== 'game') delete root.dataset.game;
  document.querySelectorAll('.nav a').forEach(x => x.classList.toggle('on', x.dataset.page === (page === 'game' ? 'games' : page === 'team' || page === 'add' ? 'teams' : page)));
  try {
    if (page === 'game') await viewGame(root, decodeURIComponent(a), b);
    else if (page === 'news') await viewNews(root);
    else if (page === 'teams') viewTeams(root);
    else if (page === 'team') await viewTeam(root, decodeURIComponent(a));
    else if (page === 'add') await viewAdd(root);
    else await viewGames(root);
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="empty">Something went wrong loading this page.<br><small>${esc(e.message)}</small></div>`;
  }
}

window.addEventListener('hashchange', () => { window.scrollTo(0, 0); route(); });
$('#back').onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/games'));
document.querySelector('.nav a[data-page="games"]').addEventListener('click', () => { if (location.hash === '#/games') { lastLoad = 0; api.clearCache(); route(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) route(); });
route();
