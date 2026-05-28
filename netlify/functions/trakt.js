const cache = {};
const TTL = 30 * 60 * 1000;

exports.handler = async (event) => {
  const { path = '', ...params } = event.queryStringParameters || {};
  const qs = new URLSearchParams(params).toString();
  const cacheKey = `${path}?${qs}`;

  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.t < TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
      body: hit.body
    };
  }

  const url = `https://api.trakt.tv/${path}${qs ? '?' + qs : ''}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_KEY,
        'User-Agent': 'Mozilla/5.0 (compatible; EphixPulse/1.0; +https://ephix.net)'
      }
    });
    const data = await res.text();
    if (res.ok) cache[cacheKey] = { t: Date.now(), body: data };
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800',
        'X-Cache': 'MISS'
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
