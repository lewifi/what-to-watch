const cache = {};
const TTL = 6 * 60 * 60 * 1000; // 6 hours — saves quota heavily

exports.handler = async (event) => {
  const { path = 'videos', ...params } = event.queryStringParameters || {};
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_KEY }).toString();
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;

  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.t < TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
      body: hit.body
    };
  }

  const url = `https://www.googleapis.com/youtube/v3/${path}?${qs}`;
  try {
    const res = await fetch(url);
    const data = await res.text();
    if (res.ok) cache[cacheKey] = { t: Date.now(), body: data };
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=21600',
        'X-Cache': 'MISS'
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
