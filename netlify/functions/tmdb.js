const cache = {};
const TTL = 30 * 60 * 1000; // 30 min — trending barely changes

exports.handler = async (event) => {
  const { path = '', ...params } = event.queryStringParameters || {};
  const qs = new URLSearchParams({ ...params, api_key: process.env.TMDB_KEY }).toString();
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;

  // Serve from warm-instance cache if fresh
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.t < TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
      body: hit.body
    };
  }

  const url = `https://api.themoviedb.org/3/${path}?${qs}`;
  try {
    const res = await fetch(url);
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
