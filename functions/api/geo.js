// Cloudflare Pages Function — returns visitor's country from CF's own edge data.
// No third-party IP lookup, no extra round-trip cost, no client IP leaves Cloudflare.
export async function onRequest(context) {
  const country = context.request.cf?.country || '';
  return new Response(JSON.stringify({ country }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
