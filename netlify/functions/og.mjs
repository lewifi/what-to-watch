// og.mjs
import React from 'react';
import { ImageResponse } from '@vercel/og';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

// Switch to a fixed, immutable unpkg link to prevent font fallback breaks
const BEBAS_URL = 'https://unpkg.com/@fontsource/bebas-neue@5.0.3/files/bebas-neue-latin-400-normal.woff';
const DMSANS_REGULAR_URL = 'https://unpkg.com/@fontsource/dm-sans@5.0.7/files/dm-sans-latin-400-normal.woff';
const DMSANS_BOLD_URL    = 'https://unpkg.com/@fontsource/dm-sans@5.0.7/files/dm-sans-latin-700-normal.woff';

let fontCache = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  try {
    const [bebas, dmRegular, dmBold] = await Promise.all([
      fetch(BEBAS_URL).then(r => r.arrayBuffer()),
      fetch(DMSANS_REGULAR_URL).then(r => r.arrayBuffer()),
      fetch(DMSANS_BOLD_URL).then(r => r.arrayBuffer())
    ]);
    fontCache = { bebas, dmRegular, dmBold };
    return fontCache;
  } catch (e) {
    console.error("Font loading failed:", e);
    return { bebas: null, dmRegular: null, dmBold: null };
  }
}

// ... Keep your fetchTopTitles, fetchTitleById, and renderSiteCard functions identical ...

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const type = (params.type === 'movie' || params.type === 'tv') ? params.type : null;
    const id = params.id && /^\d+$/.test(params.id) ? params.id : null;
    const mode = type && id ? 'title' : 'site';

    const fonts = await loadFonts();
    const h = React.createElement;

    let root;
    if (mode === 'title') {
      const detail = await fetchTitleById(type, id);
      root = detail ? renderTitleCard(h, detail, type) : renderSiteCard(h, await fetchTopTitles());
    } else {
      root = renderSiteCard(h, await fetchTopTitles());
    }

    // Standard native instantiation
    const response = new ImageResponse(root, {
      width: 1200,
      height: 630,
      fonts: buildFontsArray(fonts)
    });

    // Extracting the binary data cleanly from the response body stream
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        // Tell Facebook/Discord CDN to cache it, but revalidate with Netlify after 1 hour
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Length': String(buffer.length)
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('OG image generator failed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
