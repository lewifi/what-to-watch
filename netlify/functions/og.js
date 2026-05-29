// Netlify Function: dynamic OG image for share previews
// Returns a 1200x630 PNG showing today's top 3 trending titles
//
// Layout (Hybrid C):
//  - Left side: stacked top 3 posters with rank badges
//  - Right side: big headline + #1 title + Pulse score + tagline + logo
//  - Dark background (#080a0f) with subtle blue accent

const { Resvg } = require('@resvg/resvg-js');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

// Cache the generated image for 1 hour so we don't re-render on every share view
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

async function fetchTopTitles() {
  const key = process.env.TMDB_KEY;
  if (!key) throw new Error('TMDB_KEY not set');
  const res = await fetch(`${TMDB_BASE}/trending/all/day?api_key=${key}&page=1`);
  const data = await res.json();
  return (data.results || []).slice(0, 3);
}

async function fetchPosterAsDataUri(posterPath) {
  if (!posterPath) return null;
  try {
    const res = await fetch(`${POSTER_BASE}${posterPath}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (_) { return null; }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSvg(titles, posters) {
  const W = 1200, H = 630;
  const top1 = titles[0] || {};
  const top1Title = esc(top1.title || top1.name || 'EPHIX PULSE');
  // Truncate long titles for layout
  const headline = top1Title.length > 28 ? top1Title.slice(0, 27) + '…' : top1Title;
  const year = (top1.release_date || top1.first_air_date || '').slice(0, 4);

  // Three poster slots on the left (each 220 wide x 330 tall, gaps between)
  const posterW = 200, posterH = 300, gap = 18;
  const totalH = 3 * posterH + 2 * gap;
  const startY = (H - totalH) / 2;
  const posterX = 60;

  const posterEls = posters.map((p, i) => {
    const y = startY + i * (posterH + gap);
    const rank = i + 1;
    if (!p) {
      return `<rect x="${posterX}" y="${y}" width="${posterW}" height="${posterH}" rx="8" fill="#13182a"/>`;
    }
    return `
      <image href="${p}" x="${posterX}" y="${y}" width="${posterW}" height="${posterH}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 8px)"/>
      <rect x="${posterX}" y="${y}" width="${posterW}" height="${posterH}" rx="8" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <circle cx="${posterX + 28}" cy="${y + 28}" r="22" fill="rgba(8,10,15,0.85)" stroke="rgba(33,150,243,0.5)" stroke-width="1.5"/>
      <text x="${posterX + 28}" y="${y + 36}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#2196F3">${rank}</text>
    `;
  }).join('');

  // Right side text
  const rightX = posterX + posterW + 60;
  const pulse = top1._pulseScore ? top1._pulseScore.toFixed(1) : null;

  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#080a0f"/>
      <stop offset="100%" stop-color="#0a1424"/>
    </linearGradient>
    <linearGradient id="blue-accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2196F3" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#2196F3" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg-grad)"/>
  <rect width="${W}" height="${H}" fill="url(#blue-accent)"/>

  <!-- Subtle grid line accent -->
  <line x1="${posterX + posterW + 30}" y1="80" x2="${posterX + posterW + 30}" y2="${H - 80}" stroke="rgba(33,150,243,0.18)" stroke-width="1"/>

  ${posterEls}

  <!-- Top label -->
  <text x="${rightX}" y="150" font-family="Arial, sans-serif" font-size="22" font-weight="500" fill="#2196F3" letter-spacing="6">LIVE · WORLDWIDE</text>

  <!-- Section heading -->
  <text x="${rightX}" y="220" font-family="Impact, Arial Black, sans-serif" font-size="68" font-weight="900" fill="#ffffff" letter-spacing="2">What the World</text>
  <text x="${rightX}" y="290" font-family="Impact, Arial Black, sans-serif" font-size="68" font-weight="900" fill="#ffffff" letter-spacing="2">is Watching</text>

  <!-- Today's #1 -->
  <text x="${rightX}" y="370" font-family="Arial, sans-serif" font-size="20" font-weight="500" fill="rgba(255,255,255,0.55)" letter-spacing="4">TRENDING #1</text>
  <text x="${rightX}" y="425" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${headline}</text>
  ${year ? `<text x="${rightX}" y="465" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.45)">${year}</text>` : ''}

  <!-- Logo -->
  <text x="${rightX}" y="${H - 80}" font-family="Impact, Arial Black, sans-serif" font-size="38" font-weight="900" fill="#2196F3" letter-spacing="6">EPHIX PULSE</text>
  <text x="${rightX}" y="${H - 50}" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.4)" letter-spacing="2">ephix.net · live tv &amp; movie trending</text>
</svg>
  `;
}

exports.handler = async () => {
  try {
    // Cached?
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'HIT' },
        body: cache.toString('base64'),
        isBase64Encoded: true
      };
    }

    const titles = await fetchTopTitles();
    const posters = await Promise.all(titles.slice(0, 3).map(t => fetchPosterAsDataUri(t.poster_path)));
    const svg = buildSvg(titles, posters);

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    const png = resvg.render().asPng();

    cache = Buffer.from(png);
    cacheTime = Date.now();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'MISS' },
      body: cache.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('OG image error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
