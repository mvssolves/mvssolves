/* POST /api/contact -- contact-form handler.
 *
 * Sends the submission straight to Martin via Resend. Nothing is stored and no third-party
 * form service sits in the middle; the only external call is the mail send itself.
 *
 * Requires a Cloudflare Pages environment variable:
 *   RESEND_API_KEY   -- from resend.com, with mvssolves.com verified as a sending domain.
 */

const TO = 'martin@mvssolves.com';
const FROM = 'MVS Solves <site@mvssolves.com>';

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  // Honeypot: a real browser never fills this, so treat it as success and drop it silently
  // rather than telling the bot it was caught.
  if (data.website) return json({ ok: true }, 200);

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const message = String(data.message || '').trim();
  const company = String(data.company || '').trim();
  const need = String(data.need || '').trim();

  if (!name || !email || !message) return json({ error: 'Missing fields' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Bad email' }, 400);
  if (message.length > 5000) return json({ error: 'Too long' }, 400);

  if (!env.RESEND_API_KEY) return json({ error: 'Mail not configured' }, 500);

  const country = request.headers.get('cf-ipcountry') || '—';

  const html = `
    <h2 style="margin:0 0 12px">New enquiry from mvssolves.com</h2>
    <p style="margin:0 0 4px"><strong>Name:</strong> ${esc(name)}</p>
    <p style="margin:0 0 4px"><strong>Email:</strong> ${esc(email)}</p>
    <p style="margin:0 0 4px"><strong>Business:</strong> ${esc(company) || '—'}</p>
    <p style="margin:0 0 4px"><strong>Needs:</strong> ${esc(need) || '—'}</p>
    <p style="margin:0 0 12px"><strong>Country:</strong> ${esc(country)}</p>
    <hr style="border:none;border-top:1px solid #ddd;margin:16px 0">
    <p style="white-space:pre-wrap;margin:0">${esc(message)}</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      // so hitting reply in the inbox goes to the prospect, not to the site
      reply_to: email,
      subject: `New enquiry — ${name}${company ? ` (${company})` : ''}`,
      html,
    }),
  });

  if (!res.ok) return json({ error: 'Send failed' }, 502);
  return json({ ok: true }, 200);
}
