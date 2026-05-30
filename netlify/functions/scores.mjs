// netlify/functions/scores.mjs
// On-demand function. Fetches FIFA World Cup 2026 matches + standings from
// football-data.org, computes group tables and knockout slots, returns JSON.
// The API key lives in the Netlify env var FOOTBALL_DATA_TOKEN — never in client code.

const API = "https://api.football-data.org/v4";
const COMP = "WC"; // football-data.org code for the FIFA World Cup

// Cache at the CDN edge so football-data.org is hit only a few times a day.
// max-age=0 forces revalidation by the browser; s-maxage controls the edge cache.
const CACHE_SECONDS = 3 * 60 * 60; // 3 hours

async function fdFetch(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!res.ok) {
    throw new Error(`football-data ${path} -> ${res.status}`);
  }
  return res.json();
}

// Build group standings from finished/in-play matches.
// We compute ourselves rather than trust the standings endpoint, because the
// free tier's standings for cups can lag; match results are the source of truth.
function computeGroups(matches) {
  const groups = {}; // letter -> { teamName -> stats }

  function ensure(letter, name) {
    if (!groups[letter]) groups[letter] = {};
    if (!groups[letter][name]) {
      groups[letter][name] = {
        team: name, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
      };
    }
    return groups[letter][name];
  }

  for (const m of matches) {
    // football-data tags group-stage matches with stage "GROUP_STAGE" and a group like "GROUP_A"
    if (m.stage !== "GROUP_STAGE" || !m.group) continue;
    const letter = m.group.replace("GROUP_", "");
    const home = m.homeTeam?.name;
    const away = m.awayTeam?.name;
    if (!home || !away) continue;

    const h = ensure(letter, home);
    const a = ensure(letter, away);

    const fin = m.status === "FINISHED";
    if (!fin) continue;

    const hs = m.score?.fullTime?.home;
    const as = m.score?.fullTime?.away;
    if (hs == null || as == null) continue;

    h.P++; a.P++;
    h.GF += hs; h.GA += as;
    a.GF += as; a.GA += hs;

    if (hs > as) { h.W++; h.Pts += 3; a.L++; }
    else if (hs < as) { a.W++; a.Pts += 3; h.L++; }
    else { h.D++; a.D++; h.Pts++; a.Pts++; }
  }

  // finalize GD + sort each group
  const out = {};
  for (const letter of Object.keys(groups)) {
    const rows = Object.values(groups[letter]);
    rows.forEach((r) => { r.GD = r.GF - r.GA; });
    rows.sort((x, y) =>
      y.Pts - x.Pts || y.GD - x.GD || y.GF - x.GF || x.team.localeCompare(y.team)
    );
    out[letter] = rows;
  }
  return out;
}

// Map finished knockout results into a flat object the page can read.
// Keyed by football-data match id; the page maps its own slots by stage+order.
function computeKnockouts(matches) {
  const ko = [];
  const KO_STAGES = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
  for (const m of matches) {
    if (!KO_STAGES.includes(m.stage)) continue;
    ko.push({
      id: m.id,
      stage: m.stage,
      utcDate: m.utcDate,
      home: m.homeTeam?.name || null,
      away: m.awayTeam?.name || null,
      status: m.status,
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      winner: m.score?.winner || null, // HOME_TEAM | AWAY_TEAM | DRAW | null
    });
  }
  ko.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  return ko;
}

export default async (req) => {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    // Safe diagnostic: report which env var NAMES exist (never values),
    // so we can tell "not deployed" from "wrong name / wrong scope".
    const allNames = Object.keys(process.env);
    const relevant = allNames.filter((n) =>
      /TOKEN|FOOTBALL|DATA|KEY|API/i.test(n)
    );
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Missing FOOTBALL_DATA_TOKEN env var",
        diagnostic: {
          totalEnvVars: allNames.length,
          matchingNames: relevant, // names only, no values
          sawExactName: allNames.includes("FOOTBALL_DATA_TOKEN"),
          context: process.env.CONTEXT || null, // production / deploy-preview / branch-deploy
          branch: process.env.BRANCH || null,
        },
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  try {
    // One call returns every match for the competition's current season.
    const data = await fdFetch(`/competitions/${COMP}/matches`, token);
    const matches = data.matches || [];

    const payload = {
      ok: true,
      updated: new Date().toISOString(),
      season: data.competition?.id || null,
      totalMatches: matches.length,
      groups: computeGroups(matches),
      knockouts: computeKnockouts(matches),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // browser revalidates; CDN serves cached copy for CACHE_SECONDS,
        // then serves stale up to a day while it refetches in the background
        "cache-control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err) }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=0, s-maxage=300", // retry sooner on error
        },
      }
    );
  }
};
