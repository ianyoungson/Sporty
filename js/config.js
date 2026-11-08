// Competitions the app knows how to load from ESPN's public API.
// key = "<sport path>/<league slug>"
export const COMPETITIONS = {
  'soccer/eng.1':            { name: 'Premier League',         group: 'Football' },
  'soccer/eng.2':            { name: 'EFL Championship',       group: 'Football' },
  'soccer/eng.fa':           { name: 'FA Cup',                 group: 'Football' },
  'soccer/eng.league_cup':   { name: 'EFL Cup',                group: 'Football' },
  'soccer/uefa.champions':   { name: 'Champions League',       group: 'Football' },
  'soccer/uefa.europa':      { name: 'Europa League',          group: 'Football' },
  'soccer/uefa.europa.conf': { name: 'Conference League',      group: 'Football' },
  'soccer/por.1':            { name: 'Liga Portugal',          group: 'Football' },
  'soccer/por.taca.portugal':{ name: 'Taça de Portugal',       group: 'Football' },
  'soccer/ksa.1':            { name: 'Saudi Pro League',       group: 'Football' },
  'soccer/afc.champions':    { name: 'AFC Champions League',   group: 'Football' },
  'soccer/aus.1':            { name: 'A-League Men',           group: 'Football' },
  'soccer/aus.w.1':          { name: 'A-League Women',         group: 'Football' },
  'soccer/fifa.friendly':    { name: 'International Friendly', group: 'Football' },
  'soccer/fifa.worldq.afc':  { name: 'World Cup Qualifying',   group: 'Football' },
  'soccer/afc.asian.cup':    { name: 'AFC Asian Cup',          group: 'Football' },
  'soccer/fifa.friendly.w':  { name: "Women's Friendly",       group: 'Football' },
  'soccer/fifa.wwc':         { name: "Women's World Cup",      group: 'Football' },
  'australian-football/afl': { name: 'AFL',                    group: 'AFL' },
  'rugby-league/3':          { name: 'NRL',                    group: 'League' },
  'rugby/242041':            { name: 'Super Rugby Pacific',    group: 'Rugby' },
  'rugby/244293':            { name: 'Rugby Championship',     group: 'Rugby' },
  'rugby/289234':            { name: 'Test Match',             group: 'Rugby' },
  'basketball/nbl':          { name: 'NBL',                    group: 'Basketball' },
  'cricket':                 { name: 'Cricket',                group: 'Cricket' },
};

const CLUB_EU = ['soccer/uefa.champions', 'soccer/uefa.europa', 'soccer/uefa.europa.conf'];
const ENGLAND = ['soccer/eng.1', 'soccer/eng.2', 'soccer/eng.fa', 'soccer/eng.league_cup', ...CLUB_EU];

// Your favourites from the Sporty screenshots. Edit in the app (Teams > +).
// `names` are matched against ESPN team names; `cricinfo` teams have no ESPN feed.
export const DEFAULT_TEAMS = [
  { id: 'aus-w-soc',  name: 'Australia W', group: 'Football', flag: '🇦🇺', names: ['Australia'], comps: ['soccer/fifa.friendly.w', 'soccer/fifa.wwc'] },
  { id: 'aus-soc',    name: 'Australia', group: 'Football', flag: '🇦🇺', names: ['Australia'], comps: ['soccer/fifa.friendly', 'soccer/fifa.worldq.afc', 'soccer/afc.asian.cup'] },
  { id: 'roar', fs: 'brisbane-roar/SSr7kDGC',       name: 'Brisbane Roar', group: 'Football', flag: '🇦🇺', names: ['Brisbane Roar'], comps: ['soccer/aus.1'] },
  { id: 'hull', fs: 'hull/S66R0t75',       name: 'Hull', group: 'Football', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', names: ['Hull City', 'Hull'], comps: ENGLAND },
  { id: 'sporting', fs: 'sporting/tljXuHBC',   name: 'Sporting', group: 'Football', flag: '🇵🇹', names: ['Sporting CP', 'Sporting Lisbon', 'Sporting'], comps: ['soccer/por.1', 'soccer/por.taca.portugal', ...CLUB_EU] },
  { id: 'spurs', fs: 'tottenham/UDg08Ohm',      name: 'Tottenham', group: 'Football', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', names: ['Tottenham Hotspur', 'Tottenham', 'Spurs'], comps: ENGLAND },
  { id: 'wrexham', fs: 'wrexham/IgO7K1ZA',    name: 'Wrexham', group: 'Football', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', names: ['Wrexham'], comps: ENGLAND },
  { id: 'nassr', fs: 'al-nassr/h4I89ZuE',      name: 'Al Nassr', group: 'Football', flag: '🇸🇦', names: ['Al Nassr', 'Al Nassr Riyadh'], comps: ['soccer/ksa.1', 'soccer/afc.champions'] },
  { id: 'broncos', fs: 'brisbane-broncos/8llKIOZC',    name: 'Brisbane Broncos', group: 'League', flag: '🇦🇺', names: ['Brisbane Broncos', 'Broncos'], comps: ['rugby-league/3'] },
  { id: 'wallabies',  name: 'Australia', group: 'Rugby', flag: '🇦🇺', names: ['Australia'], comps: ['rugby/244293', 'rugby/289234'] },
  { id: 'reds', fs: 'queensland-reds/bR4aayse',       name: 'Reds', group: 'Rugby', flag: '🇦🇺', names: ['Reds', 'Queensland Reds'], comps: ['rugby/242041'] },
  { id: 'lions', fs: 'brisbane-lions/dbrzcXC5',      name: 'Brisbane Lions', group: 'AFL', flag: '🇦🇺', names: ['Brisbane Lions', 'Brisbane'], comps: ['australian-football/afl'] },
  { id: 'geelong', fs: 'geelong-cats/hCAS2n4i',    name: 'Geelong Cats', group: 'AFL', flag: '🇦🇺', names: ['Geelong Cats', 'Geelong'], comps: ['australian-football/afl'] },
  { id: 'aus-cricket',     name: 'Australia', group: 'Cricket', flag: '🇦🇺', names: ['Australia'], comps: ['cricket'], cricinfo: 'https://www.espncricinfo.com/team/australia-2' },
  { id: 'aus-u19-cricket', name: 'Australia U19', group: 'Cricket', flag: '🇦🇺', names: ['Australia Under-19s', 'Australia U19'], comps: ['cricket'], cricinfo: 'https://www.espncricinfo.com/team/australia-under-19s-2' },
  // Not in any open data feed: scores and fixtures open on Flashscore.
  { id: 'aus-u23',    name: 'Australia U23', group: 'Football', flag: '🇦🇺', fs: 'australia/ShrE7HEq', linkOnly: true },
  { id: 'aus-u20',    name: 'Australia U20', group: 'Football', flag: '🇦🇺', fs: 'australia/UVx0PfYB', linkOnly: true },
  { id: 'lions-w',    name: 'Brisbane Lions W', group: 'AFL', flag: '🇦🇺', fs: 'brisbane-lions/K0GiYEba', linkOnly: true },
  { id: 'sherwood',   name: 'Sherwood', group: 'AFL', flag: '🇦🇺', fsSearch: 'Sherwood Magpies AFL', linkOnly: true },
];

export const GROUP_ORDER = ['Football', 'AFL', 'League', 'Rugby', 'Basketball', 'Cricket'];
export const GROUP_ICON = { Football: '⚽', AFL: '🏉', League: '🏉', Rugby: '🏉', Basketball: '🏀', Cricket: '🏏' };

// Where to watch in Australia (checked Nov 2026). ESPN's own broadcast data is US-only,
// so this guide is shown first. Rights change — confirm with the broadcaster.
export const AU_WATCH = {
  'soccer/eng.1':            ['Stan Sport', '9Now (select games)'],
  'soccer/eng.fa':           ['Stan Sport'],
  'soccer/uefa.champions':   ['Stan Sport'],
  'soccer/uefa.europa':      ['Stan Sport'],
  'soccer/uefa.europa.conf': ['Stan Sport'],
  'soccer/eng.2':            ['beIN Sports'],
  'soccer/eng.league_cup':   ['beIN Sports'],
  'soccer/por.1':            ['beIN Sports'],
  'soccer/ksa.1':            ['beIN Sports'],
  'soccer/afc.champions':    ['Paramount+'],
  'soccer/aus.1':            ['Paramount+', '10 (select games)'],
  'soccer/aus.w.1':          ['Paramount+'],
  'soccer/fifa.friendly':    ['Paramount+', 'Network 10'],
  'soccer/fifa.worldq.afc':  ['Paramount+', 'Network 10'],
  'soccer/afc.asian.cup':    ['Paramount+', 'Network 10'],
  'soccer/fifa.friendly.w':  ['Paramount+', 'Network 10'],
  'australian-football/afl': ['Kayo', 'Fox Footy', 'Seven / 7plus'],
  'rugby-league/3':          ['Kayo', 'Fox League', 'Nine / 9Now'],
  'rugby/242041':            ['Stan Sport', 'Nine / 9Now'],
  'rugby/244293':            ['Stan Sport', 'Nine / 9Now'],
  'rugby/289234':            ['Stan Sport', 'Nine / 9Now'],
  'basketball/nbl':          ['ESPN (Foxtel)', 'Kayo', 'Disney+'],
  'cricket':                 ['Kayo / Fox Cricket', '7plus (home Tests)'],
};

const FS = 'https://www.flashscore.com.au';
// Flashscore link for a team (page = '', 'fixtures', 'results', 'news').
export function flashscoreUrl(team, page = '') {
  if (team.fs) return `${FS}/team/${team.fs}/${page ? page + '/' : ''}`;
  const q = team.fsSearch || `${team.name} ${team.group}`;
  return `https://www.google.com/search?q=${encodeURIComponent('site:flashscore.com.au ' + q)}`;
}
