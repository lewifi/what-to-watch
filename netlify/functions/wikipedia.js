exports.handler = async (event) => {
  const { article, range } = event.queryStringParameters || {};
  if (!article || !range) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing article or range' }) };
  }

  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${article}/daily/${range}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EphixPulse/1.0 (https://ephix.net)' }
    });
    const data = await res.text();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=21600'
      },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
