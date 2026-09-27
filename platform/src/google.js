// Turn a pasted Google Maps link (maps.app.goo.gl/…, google.com/maps/place/…) into the
// business's 5-star review link. Only Google hosts are ever fetched, and only their redirect
// headers are read (no page scraping). With GOOGLE_MAPS_KEY set, links that don't carry the
// place (rare) fall back to a Places search by the name in the link.
import { parseMapsUrl, isGoogleHost, reviewLinkFromPlaceId } from './lib.js';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function expand(link) {
  let cur = link;
  for (let hop = 0; hop < 6; hop++) {
    const u = new URL(cur);
    if (u.protocol !== 'https:' || !isGoogleHost(u.hostname) || parseMapsUrl(cur).placeId) return cur;
    if (u.hostname === 'consent.google.com' && u.searchParams.get('continue')) { cur = u.searchParams.get('continue'); continue; }
    const r = await fetch(cur, { redirect: 'manual', headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    await r.body?.cancel();
    const next = r.status >= 300 && r.status < 400 && r.headers.get('location');
    if (!next) return cur;
    cur = new URL(next, cur).href;
  }
  return cur;
}

async function searchByName(key, name) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
    body: JSON.stringify({ textQuery: name, regionCode: 'PH', pageSize: 1 })
  });
  const data = await r.json().catch(() => ({}));
  return data.places?.[0]?.id || null;
}

/** → { review, name } ; review is null when the link didn't lead to a specific business. */
export async function reviewLinkFromMaps(link, env) {
  const full = await expand(link);
  const { placeId, name } = parseMapsUrl(full);
  const id = placeId || (env.GOOGLE_MAPS_KEY && name ? await searchByName(env.GOOGLE_MAPS_KEY, name).catch(() => null) : null);
  return { review: reviewLinkFromPlaceId(id), name, expanded: full };
}
