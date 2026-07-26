/* Retired pages return 410 Gone.
 *
 * 410 tells Google the URL is permanently gone and is dropped from the index
 * faster than a 404. These paths must stay crawlable — blocking them in
 * robots.txt would stop Googlebot ever seeing the 410, and they'd linger in
 * search results instead.
 *
 * Everything else falls straight through, including /api/*.
 */

const GONE = new Set([
  '/acceptable-use-policy',
  '/data-processing-agreement',
  '/security',
  '/accessibility-statement',
  '/faq',
  '/join-the-team',
]);

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Gone — MVS Solves</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;1,300&family=Schibsted+Grotesk:wght@400&display=swap" rel="stylesheet">
<style>
  html{background:#141210}
  body{margin:0;min-height:100svh;display:flex;align-items:center;justify-content:center;
       background:#141210;color:#EEE8E0;font-family:'Spectral',Georgia,serif;font-weight:300;
       -webkit-font-smoothing:antialiased;padding:2rem}
  .in{max-width:44ch;text-align:center}
  h1{margin:0;font-weight:300;font-size:clamp(1.9rem,1.3rem + 2.4vw,3rem);line-height:1.08;letter-spacing:-.014em}
  h1 em{font-style:italic;color:#BDB5AC}
  p{margin:1.4rem 0 0;color:#BDB5AC;line-height:1.7}
  a{display:inline-block;margin-top:2.2rem;color:#EEE8E0;text-decoration:none;
    font-family:'Schibsted Grotesk',system-ui,sans-serif;font-size:.72rem;letter-spacing:.19em;
    text-transform:uppercase;padding-bottom:.5rem;border-bottom:1px solid rgba(238,232,224,.3)}
  a:hover{border-bottom-color:#EEE8E0}
</style>
</head><body>
  <div class="in">
    <h1>This page is<br><em>no longer here.</em></h1>
    <p>It was retired and won't be coming back.</p>
    <a href="/">Back to the site</a>
  </div>
</body></html>`;

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname.replace(/\/+$/, '') || '/';

  if (GONE.has(path)) {
    return new Response(page, {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return context.next();
}
