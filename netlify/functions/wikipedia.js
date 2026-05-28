const cache = {};
const TTL = 12 * 60 * 60 * 1000; // 12 hours

exports.handler = async (event) => {
  const { article, range } = event.queryStringParameters || {};
  if (!article || !range) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing article or range' }) };
  }

  const cacheKey = `${article}/${range}`;
  const hit = cache[cacheKey];
  if (hit && Date.now() - hit.t < TTL) {
    return {
      statusCode: hit.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
      body: hit.body
    };
  }

  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${article}/daily/${range}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EphixPulse/1.0 (https://ephix.net)' }
    });
    const data = await res.text();
    // Cache both hits AND 404s (so we don't re-query titles with no article)
    cache[cacheKey] = { t: Date.now(), status: res.status, body: data };
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=43200',
        'X-Cache': 'MISS'
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
