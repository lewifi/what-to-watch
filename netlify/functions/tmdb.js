exports.handler = async (event) => {
  const { path = '', ...params } = event.queryStringParameters || {};
  const qs = new URLSearchParams({ ...params, api_key: process.env.TMDB_KEY }).toString();
  const url = `https://api.themoviedb.org/3/${path}?${qs}`;

  try {
    const res = await fetch(url);
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
