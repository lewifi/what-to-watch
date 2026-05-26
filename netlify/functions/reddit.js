exports.handler = async (event) => {
  const sub = (event.queryStringParameters || {}).sub || 'movies';
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=100&raw_json=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EphixPulse/1.0; +https://ephix.net)',
        'Accept': 'application/json'
      }
    });
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600'
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
