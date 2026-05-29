// Netlify Function: dynamic OG image
// Uses @vercel/og (Satori) — requires explicit fonts and strict display:flex
// Layout: top 3 posters stacked left, headline + #1 title + logo on right

const { ImageResponse } = require('@vercel/og');
const React = require('react');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

let cache = null;
let cacheTime = 0;
let fontCache = null;
const CACHE_TTL = 60 * 60 * 1000;

async function fetchTopTitles() {
  const key = process.env.TMDB_KEY;
  if (!key) throw new Error('TMDB_KEY not set');
  const res = await fetch(`${TMDB_BASE}/trending/all/day?api_key=${key}&page=1`);
  const data = await res.json();
  return (data.results || []).slice(0, 3);
}

async function fetchPosterDataUri(posterPath) {
  if (!posterPath) return null;
  try {
    const res = await fetch(`${POSTER_BASE}${posterPath}`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (_) { return null; }
}

// Load Inter font — Satori needs explicit font data
async function loadFonts() {
  if (fontCache) return fontCache;
  try {
    const url = 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bslnt%2Cwght%5D.ttf';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.arrayBuffer();
    fontCache = [
      { name: 'Inter', data, weight: 400, style: 'normal' },
      { name: 'Inter', data, weight: 700, style: 'normal' },
      { name: 'Inter', data, weight: 900, style: 'normal' }
    ];
    return fontCache;
  } catch (_) {
    return [];
  }
}

function truncate(s, n) {
  s = s || '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

exports.handler = async () => {
  try {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        },
        body: cache.toString('base64'),
        isBase64Encoded: true
      };
    }

    const [titles, fonts] = await Promise.all([fetchTopTitles(), loadFonts()]);
    const posterUris = await Promise.all(
      titles.slice(0, 3).map(t => fetchPosterDataUri(t.poster_path))
    );

    const top1 = titles[0] || {};
    const headline = truncate(top1.title || top1.name || 'EPHIX PULSE', 26);
    const year = (top1.release_date || top1.first_air_date || '').slice(0, 4);

    const h = React.createElement;

    const poster = (uri, rank) => h('div', {
      style: {
        position: 'relative',
        display: 'flex',
        width: 200,
        height: 300,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#13182a'
      }
    },
      uri && h('img', {
        src: uri,
        width: 200,
        height: 300,
        style: { width: 200, height: 300, objectFit: 'cover' }
      }),
      h('div', {
        style: {
          position: 'absolute',
          top: 10,
          left: 10,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(8,10,15,0.88)',
          border: '1.5px solid rgba(33,150,243,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2196F3',
          fontSize: 20,
          fontWeight: 700
        }
      }, String(rank))
    );

    const root = h('div', {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        backgroundColor: '#080a0f',
        backgroundImage: 'linear-gradient(135deg, #080a0f 0%, #0a1424 100%)',
        padding: 60,
        color: '#ffffff',
        fontFamily: 'Inter'
      }
    },
      h('div', {
        style: { display: 'flex', flexDirection: 'column' }
      },
        posterUris.map((uri, i) =>
          h('div', {
            key: 'p' + i,
            style: { display: 'flex', marginBottom: i < 2 ? 10 : 0 }
          }, poster(uri, i + 1))
        )
      ),

      h('div', {
        style: {
          width: 1,
          backgroundColor: 'rgba(33,150,243,0.2)',
          margin: '40px 50px',
          display: 'flex'
        }
      }),

      h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          paddingTop: 30
        }
      },
        h('div', { style: { display: 'flex', flexDirection: 'column' } },
          h('div', {
            style: {
              fontSize: 20,
              fontWeight: 400,
              color: '#2196F3',
              letterSpacing: 6,
              marginBottom: 22,
              display: 'flex'
            }
          }, 'LIVE · WORLDWIDE'),
          h('div', {
            style: {
              fontSize: 62,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1,
              display: 'flex'
            }
          }, 'What the World'),
          h('div', {
            style: {
              fontSize: 62,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1,
              display: 'flex'
            }
          }, 'is Watching')
        ),

        h('div', { style: { display: 'flex', flexDirection: 'column' } },
          h('div', {
            style: {
              fontSize: 18,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 4,
              marginBottom: 14,
              display: 'flex'
            }
          }, 'TRENDING #1'),
          h('div', {
            style: {
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.1,
              display: 'flex'
            }
          }, headline),
          year && h('div', {
            style: {
              fontSize: 20,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 8,
              display: 'flex'
            }
          }, year)
        ),

        h('div', { style: { display: 'flex', flexDirection: 'column' } },
          h('div', {
            style: {
              fontSize: 34,
              fontWeight: 900,
              color: '#2196F3',
              letterSpacing: 6,
              display: 'flex'
            }
          }, 'EPHIX PULSE'),
          h('div', {
            style: {
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: 2,
              marginTop: 6,
              display: 'flex'
            }
          }, 'ephix.net · live tv & movie trending')
        )
      )
    );

    const response = new ImageResponse(root, {
      width: 1200,
      height: 630,
      fonts: fonts.length > 0 ? fonts : undefined
    });

    const arrayBuffer = await response.arrayBuffer();
    cache = Buffer.from(arrayBuffer);
    cacheTime = Date.now();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS'
      },
      body: cache.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('OG image error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack })
    };
  }
};
