// Netlify Function: dynamic OG image for share previews
// @vercel/og is ESM-only, so we use dynamic import inside the handler
const React = require('react');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

// jsDelivr mirror — reliable for server-side font fetching
const BEBAS_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.ttf';

let cache = null;
let cacheTime = 0;
let bebasFont = null;
const CACHE_TTL = 60 * 60 * 1000;

async function fetchTopTitles() {
  const key = process.env.TMDB_KEY;
  if (!key) throw new Error('TMDB_KEY not set');
  const res = await fetch(`${TMDB_BASE}/trending/all/day?api_key=${key}&page=1`);
  const data = await res.json();
  return (data.results || []).slice(0, 3);
}

async function loadBebas() {
  if (bebasFont) return bebasFont;
  try {
    const res = await fetch(BEBAS_URL);
    if (!res.ok) return null;
    bebasFont = await res.arrayBuffer();
    return bebasFont;
  } catch (_) {
    return null;
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

    // Dynamic ESM import — @vercel/og is ESM-only
    const { ImageResponse } = await import('@vercel/og');

    const [titles, bebas] = await Promise.all([fetchTopTitles(), loadBebas()]);
    const top1 = titles[0] || {};
    const headline = truncate(top1.title || top1.name || 'EPHIX PULSE', 26);
    const year = (top1.release_date || top1.first_air_date || '').slice(0, 4);

    const h = React.createElement;

    const poster = (item, rank) => h('div', {
      style: {
        position: 'relative',
        width: '200px',
        height: '300px',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#13182a',
        display: 'flex',
        border: '1px solid rgba(255,255,255,0.08)'
      }
    }, [
      item.poster_path ? h('img', {
        key: 'img',
        src: `${POSTER_BASE}${item.poster_path}`,
        width: 200,
        height: 300,
        style: { objectFit: 'cover' }
      }) : null,
      h('div', {
        key: 'rank',
        style: {
          position: 'absolute',
          top: '10px',
          left: '10px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(8,10,15,0.85)',
          border: '1.5px solid rgba(33,150,243,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2196F3',
          fontSize: '18px',
          fontWeight: 700
        }
      }, String(rank))
    ]);

    const root = h('div', {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        backgroundColor: '#080a0f',
        backgroundImage: 'linear-gradient(135deg, #080a0f 0%, #0a1424 100%)',
        fontFamily: 'sans-serif',
        padding: '60px',
        color: '#ffffff'
      }
    }, [
      h('div', {
        key: 'left',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'center'
        }
      }, titles.slice(0, 3).map((t, i) => poster(t, i + 1))),

      h('div', {
        key: 'divider',
        style: {
          display: 'flex',
          width: '1px',
          backgroundColor: 'rgba(33,150,243,0.2)',
          margin: '40px 50px'
        }
      }),

      h('div', {
        key: 'right',
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          paddingTop: '40px',
          paddingBottom: '20px'
        }
      }, [
        h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column' } }, [
          h('div', {
            key: 'label',
            style: {
              fontSize: '20px',
              fontWeight: 500,
              color: '#2196F3',
              letterSpacing: '6px',
              marginBottom: '24px'
            }
          }, 'LIVE TOP 100 · WORLDWIDE'),
          h('div', {
            key: 'h1',
            style: {
              fontFamily: 'sans-serif',
              fontSize: '64px',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-1px',
              marginBottom: '40px',
              display: 'flex',
              flexDirection: 'column'
            }
          }, [
            h('span', { key: 'l1' }, 'What the World'),
            h('span', { key: 'l2' }, 'is Watching')
          ])
        ]),
        h('div', { key: 'mid', style: { display: 'flex', flexDirection: 'column' } }, [
          h('div', {
            key: 'subtle',
            style: {
              fontSize: '18px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '4px',
              marginBottom: '16px'
            }
          }, 'TRENDING #1'),
          h('div', {
            key: 'title',
            style: {
              fontFamily: 'Bebas Neue',
              fontSize: '56px',
              letterSpacing: '2px',
              lineHeight: 1.05
            }
          }, headline),
          year ? h('div', {
            key: 'year',
            style: {
              fontSize: '22px',
              color: 'rgba(255,255,255,0.45)',
              marginTop: '10px'
            }
          }, year) : null
        ]),
        h('div', { key: 'bottom', style: { display: 'flex', flexDirection: 'column' } }, [
          h('div', {
            key: 'logo',
            style: {
              fontFamily: 'Bebas Neue',
              fontSize: '54px',
              color: '#2196F3',
              letterSpacing: '8px',
              lineHeight: 1
            }
          }, 'EPHIX PULSE'),
          h('div', {
            key: 'tagline',
            style: {
              fontSize: '15px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '2px',
              marginTop: '10px'
            }
          }, 'ephix.net · live tv & movie trending')
        ])
      ])
    ]);

    const response = new ImageResponse(root, {
      width: 1200,
      height: 630,
      fonts: bebas ? [
        {
          name: 'Bebas Neue',
          data: bebas,
          style: 'normal',
          weight: 400
        }
      ] : []
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
