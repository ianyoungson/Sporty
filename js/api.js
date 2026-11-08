const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const cache = new Map(); // url -> { at, promise }

async function get(url, ttl = 60_000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.promise;
  const promise = fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  });
  cache.set(url, { at: Date.now(), promise });
  promise.catch(() => cache.delete(url));
  return promise;
}

const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');

export function scoreboard(comp, { back = 7, ahead = 28 } = {}, ttl) {
  const from = new Date(Date.now() - back * 864e5);
  const to = new Date(Date.now() + ahead * 864e5);
  return get(`${BASE}/${comp}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=500`, ttl);
}

export const summary = (comp, eventId, ttl = 20_000) =>
  get(`${BASE}/${comp}/summary?event=${eventId}`, ttl);

export const news = (comp) => get(`${BASE}/${comp}/news?limit=50`, 5 * 60_000);

export const teams = (comp) => get(`${BASE}/${comp}/teams?limit=200`, 60 * 60_000);

export const clearCache = () => cache.clear();
