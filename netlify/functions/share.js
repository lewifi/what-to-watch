// Netlify Function: per-title share page
// URL: /share/{type}/{id}  → returns HTML with per-title OG meta tags
// Bots/scrapers (Discord, X, Reddit) read the OG tags and show a per-title preview
// Humans get redirected to the main site with the modal pre-opened
//
// Routing via netlify.toml: /share/* → /.netlify/functions/share/:splat

const TMDB_BASE = 'https://api.themoviedb.org/3';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(s, n) {
  s = s || '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

async function fetchTitle(type, id) {
  const key = process.env.TMDB_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${key}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (_) { return null; }
}

// Detect known social scrapers — let bots see the share HTML, redirect humans
function isBot(ua = '') {
  ua = ua.toLowerCase();
  return /(facebookexternalhit|twitterbot|linkedinbot|discordbot|telegrambot|whatsapp|slackbot|redditbot|skypeuripreview|googlebot|bingbot|pinterestbot|embedly|outbrain|nuzzel|vkshare|w3c_validator|qwantify|applebot)/i.test(ua);
}

exports.handler = async (event) => {
  // Path: /share/movie/12345 or /share/tv/12345
  // event.path is the original requested path
  const path = event.path || '';
  const m = path.match(/\/share\/(movie|tv)\/(\d+)/);
  if (!m) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Not Found'
    };
  }
  const [, type, id] = m;

  const detail = await fetchTitle(type, id);

  // If we couldn't fetch the title, fall back gracefully
  const title = detail ? (detail.title || detail.name || 'EPHIX PULSE') : 'EPHIX PULSE';
  const year = detail ? (detail.release_date || detail.first_air_date || '').slice(0, 4) : '';
  const overview = detail ? truncate(detail.overview || '', 200) : '';
  const rating = detail && detail.vote_average ? detail.vote_average.toFixed(1) : null;

  const ogTitle = `${title}${year ? ` (${year})` : ''} — Trending on EPHIX PULSE`;
  const ogDesc = overview || `${title} is currently trending on EPHIX PULSE — see what the world is watching right now.`;
  const ogImage = `https://www.ephix.net/api/og?type=${type}&id=${id}`;
  const shareUrl = `https://www.ephix.net/share/${type}/${id}`;
  const siteUrl = `https://www.ephix.net/?t=${type}-${id}`;

  const ua = event.headers['user-agent'] || event.headers['User-Agent'] || '';

  // Real users: redirect to the site with the modal pre-opened
  // Bots/scrapers: serve the HTML so they can read OG tags
  if (!isBot(ua)) {
    return {
      statusCode: 302,
      headers: { Location: siteUrl },
      body: ''
    };
  }

  // Bot path: serve HTML with full OG tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(ogTitle)}</title>
<meta name="description" content="${esc(ogDesc)}">

<meta property="og:type" content="video.${type === 'movie' ? 'movie' : 'tv_show'}">
<meta property="og:site_name" content="EPHIX PULSE">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(ogDesc)}">
<meta property="og:url" content="${shareUrl}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(ogDesc)}">
<meta name="twitter:image" content="${ogImage}">

<link rel="canonical" href="${siteUrl}">
<meta http-equiv="refresh" content="0; url=${siteUrl}">
</head>
<body>
<p>Redirecting to <a href="${siteUrl}">${esc(title)} on EPHIX PULSE</a>…</p>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
    body: html
  };
};
