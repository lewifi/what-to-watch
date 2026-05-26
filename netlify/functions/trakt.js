exports.handler = async (event) => {
  const { path = '', ...params } = event.queryStringParameters || {};
  const qs = new URLSearchParams(params).toString();
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
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
