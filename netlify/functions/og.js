// Netlify Function: dynamic OG image for share previews
// First working Bebas Neue version — single font loaded from jsDelivr.
// Supports two modes:
//   /api/og                        → site card (today's top 3)
//   /api/og?type=movie&id=12345    → per-title card (single big poster + details)

const React = require('react');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

// jsDelivr mirror — reliable for server-side font fetching
const BEBAS_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.ttf';

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
let bebasFont = null;

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

async function fetchTopTitles() {
  const key = process.env.TMDB_KEY;
  if (!key) throw new Error('TMDB_KEY not set');
  const res = await fetch(`${TMDB_BASE}/trending/all/day?api_key=${key}&page=1`);
  const data = await res.json();
  return (data.results || []).slice(0, 3);
}

async function fetchTitleById(type, id) {
  const key = process.env.TMDB_KEY;
  if (!key) throw new Error('TMDB_KEY not set');
  const res = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${key}`);
  if (!res.ok) return null;
  return res.json();
}

function truncate(s, n) {
  s = s || '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ─── SITE CARD ──────────────────────────────────────────────
function renderSiteCard(h, titles) {
  const top1 = titles[0] || {};
  const headline = truncate(top1.title || top1.name || 'EPHIX PULSE', 26);
  const year = (top1.release_date || top1.first_air_date || '').slice(0, 4);

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

  return h('div', {
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
      style: { display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }
    }, (() => {
      // #2 top, #1 middle (anchor), #3 bottom
      const ordered = [];
      if (titles[1]) ordered.push({ item: titles[1], rank: 2 });
      if (titles[0]) ordered.push({ item: titles[0], rank: 1 });
      if (titles[2]) ordered.push({ item: titles[2], rank: 3 });
      return ordered.map(({ item, rank }) => poster(item, rank));
    })()),

    h('div', {
      key: 'divider',
      style: { display: 'flex', width: '1px', backgroundColor: 'rgba(33,150,243,0.2)', margin: '40px 50px' }
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
            fontSize: '44px',
            fontWeight: 700,
            lineHeight: 1.1
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
}

// ─── PER-TITLE CARD ──────────────────────────────────────────
function renderTitleCard(h, detail, mediaType) {
  const title = truncate(detail.title || detail.name || 'Untitled', 38);
  const year = (detail.release_date || detail.first_air_date || '').slice(0, 4);
  const rating = detail.vote_average ? detail.vote_average.toFixed(1) : null;
  const tagline = truncate(detail.tagline || '', 70);
  const overview = truncate(detail.overview || '', 180);
  const genres = (detail.genres || []).slice(0, 3).map(g => g.name).join(' · ');
  const typeLabel = mediaType === 'movie' ? 'FILM' : 'TV SERIES';
  const posterUrl = detail.poster_path ? `${POSTER_BASE}${detail.poster_path}` : null;

  return h('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      backgroundColor: '#080a0f',
      backgroundImage: 'linear-gradient(135deg, #080a0f 0%, #0a1424 100%)',
      fontFamily: 'sans-serif',
      padding: '50px',
      color: '#ffffff'
    }
  }, [
    h('div', {
      key: 'poster',
      style: {
        width: '350px',
        height: '530px',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#13182a',
        display: 'flex',
        border: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0
      }
    }, posterUrl ? [h('img', {
      key: 'img',
      src: posterUrl,
      width: 350,
      height: 530,
      style: { objectFit: 'cover' }
    })] : []),

    h('div', {
      key: 'divider',
      style: { display: 'flex', width: '1px', backgroundColor: 'rgba(33,150,243,0.2)', margin: '20px 40px' }
    }),

    h('div', {
      key: 'right',
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        paddingTop: '20px',
        paddingBottom: '10px',
        justifyContent: 'space-between'
      }
    }, [
      h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column' } }, [
        h('div', {
          key: 'label',
          style: {
            fontSize: '16px',
            fontWeight: 500,
            color: '#2196F3',
            letterSpacing: '5px',
            marginBottom: '16px'
          }
        }, `TRENDING · ${typeLabel}`),
        h('div', {
          key: 'title',
          style: {
            fontFamily: 'Bebas Neue',
            fontSize: title.length > 22 ? '64px' : '78px',
            letterSpacing: '2px',
            lineHeight: 1,
            marginBottom: '14px'
          }
        }, title),
        h('div', {
          key: 'meta',
          style: {
            fontSize: '17px',
            color: 'rgba(255,255,255,0.55)',
            display: 'flex',
            gap: '14px',
            marginBottom: '18px'
          }
        }, [
          year ? h('span', { key: 'y' }, year) : null,
          rating ? h('span', { key: 'r', style: { color: '#c9a548' } }, `★ ${rating}`) : null,
          genres ? h('span', { key: 'g' }, genres) : null
        ].filter(Boolean)),
        tagline ? h('div', {
          key: 'tagline',
          style: {
            fontSize: '17px',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.4,
            marginBottom: '16px'
          }
        }, `"${tagline}"`) : null,
        overview ? h('div', {
          key: 'overview',
          style: {
            fontSize: '15px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
            display: 'flex'
          }
        }, overview) : null
      ]),

      h('div', { key: 'bottom', style: { display: 'flex', flexDirection: 'column' } }, [
        h('div', {
          key: 'logo',
          style: {
            fontFamily: 'Bebas Neue',
            fontSize: '44px',
            color: '#2196F3',
            letterSpacing: '7px',
            lineHeight: 1
          }
        }, 'EPHIX PULSE'),
        h('div', {
          key: 'tag',
          style: {
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '2px',
            marginTop: '8px'
          }
        }, 'ephix.net · what the world is watching')
      ])
    ])
  ]);
}

// ─── HANDLER ─────────────────────────────────────────────────
exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const type = (params.type === 'movie' || params.type === 'tv') ? params.type : null;
    const id = params.id && /^\d+$/.test(params.id) ? params.id : null;
    const mode = type && id ? 'title' : 'site';
    const cacheKey = mode === 'title' ? `title-${type}-${id}` : 'site';

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        },
        body: cached.body.toString('base64'),
        isBase64Encoded: true
      };
    }

    const { ImageResponse } = await import('@vercel/og');
    const bebas = await loadBebas();
    const h = React.createElement;

    let root;
    if (mode === 'title') {
      const detail = await fetchTitleById(type, id);
      if (!detail) {
        const titles = await fetchTopTitles();
        root = renderSiteCard(h, titles);
      } else {
        root = renderTitleCard(h, detail, type);
      }
    } else {
      const titles = await fetchTopTitles();
      root = renderSiteCard(h, titles);
    }

    const response = new ImageResponse(root, {
      width: 1200,
      height: 630,
      fonts: bebas ? [
        { name: 'Bebas Neue', data: bebas, style: 'normal', weight: 400 }
      ] : []
    });

    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    cache.set(cacheKey, { t: Date.now(), body });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS'
      },
      body: body.toString('base64'),
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
