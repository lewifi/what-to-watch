exports.handler = async (event) => {
  const { path = 'videos', ...params } = event.queryStringParameters || {};
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_KEY }).toString();
  const url = `https://www.googleapis.com/youtube/v3/${path}?${qs}`;

  try {
    const res = await fetch(url);
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
