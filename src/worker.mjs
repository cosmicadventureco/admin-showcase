/**
 * Root Cause Clinic showcase - the Worker in front of the static demo.
 *
 * Everything is served from ./public as before. The one thing this adds is
 * POST /api/nda: when a visitor signs the confidential demo agreement, the
 * signature is emailed to the owner with the agreement text, the time, and
 * where the request came from, so there is a dated record of every signer.
 *
 * Email goes out through Resend, the same provider the intake app uses.
 * Needs one secret: npx wrangler secret put RESEND_API_KEY
 *
 * With a KV namespace bound as NDA_KV, each signature is also kept against
 * the signer's IP address, and GET /api/nda tells the page whether this IP
 * has signed, so the agreement is asked once per IP as well as per device.
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* The agreement as signed. Kept here too, so the email records the exact
   words even if someone changes the page in their browser. */
const TERMS = {
  '2026-10-22': [
    '1. Confidential and owned by Tyler Webb. This demo of the Wellness Admin Dashboard, shown here as the Root Cause Clinic app, is confidential and is the intellectual property of Tyler Webb. The software, source code, screen designs and layouts, report and protocol templates, written content and the guided tour are © 2026 Tyler Webb. All rights reserved.',
    '2. Keep it confidential. You will keep the demo and what you learn from it confidential, including its design, features, workflows, written content and any pricing. You may share it only with people in your own organization who need to see it to evaluate working with Tyler Webb, and only if they agree to these same terms.',
    '3. No copying or reuse. You will not copy, download, save, record, scrape, screenshot for distribution or otherwise reproduce the demo or its source code. You will not use the demo, in whole or in part, as a model, template or framework for any other app, product or project, whether you build it yourself or have someone else build it.',
    '4. No license. Viewing the demo gives you no ownership and no license. Any right to use the software comes only from a separate agreement signed by Tyler Webb.',
    '5. If the agreement is broken, and how long it lasts. If these terms are broken, Tyler Webb may ask a court to order the copying or use to stop, and may use any other remedy the law allows. This agreement is governed by the laws of the State of Utah. It lasts three years from the date you sign, except that the source code stays confidential indefinitely. It does not cover information that was already public, or that you already knew or developed independently without using the demo.'
  ]
};

async function signNda(request, env) {
  let b;
  try { b = await request.json(); } catch (e) { return json({ ok: false, error: 'Could not read the signature.' }, 400); }
  const name = clean(b.name, 120), email = clean(b.email, 200), org = clean(b.org, 160);
  const version = clean(b.version, 20), terms = TERMS[version];
  if (!terms) return json({ ok: false, error: 'Unknown agreement version.' }, 400);
  if (name.split(/\s+/).length < 2) return json({ ok: false, error: 'A full name is needed.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'That email address looks incomplete.' }, 400);
  if (b.agreed !== true) return json({ ok: false, error: 'The agreement was not accepted.' }, 400);
  const cf = request.cf || {};
  const received = new Date().toISOString();
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.NDA_KV && ip) await env.NDA_KV.put('ip:' + ip, JSON.stringify({ name, email, org, version, received }));
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'Email is not set up yet.' }, 503);

  const rows = [
    ['Name (signature)', name],
    ['Email', email],
    ['Organization', org || '(none given)'],
    ['Signed (visitor clock)', clean(b.signedAt, 40)],
    ['Received (server, UTC)', received],
    ['Agreement version', version],
    ['Page', clean(b.page, 300)],
    ['IP address', ip],
    ['Location', [cf.city, cf.region, cf.country].filter(Boolean).join(', ')],
    ['Browser', clean(request.headers.get('User-Agent'), 300)]
  ];
  const text = 'New signature: Confidential Demo Agreement\n\n' + rows.map((r) => r[0] + ': ' + r[1]).join('\n') +
    '\n\nThe agreement they accepted:\n\n' + terms.join('\n\n') + '\n';
  const html = '<h2 style="font-family:sans-serif">New signature: Confidential Demo Agreement</h2>' +
    '<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">' +
    rows.map((r) => '<tr><td style="padding:4px 12px 4px 0;color:#666">' + escHtml(r[0]) + '</td><td style="padding:4px 0"><b>' + escHtml(String(r[1])) + '</b></td></tr>').join('') +
    '</table><h3 style="font-family:sans-serif">The agreement they accepted</h3>' +
    terms.map((t) => '<p style="font-family:sans-serif;font-size:13px;line-height:1.5">' + escHtml(t) + '</p>').join('');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Wellness Admin Dashboard <' + (env.FROM_EMAIL || 'hello@cosmicadventureco.net') + '>',
      to: [env.NDA_NOTIFY || 'cosmicadventureco@gmail.com'],
      reply_to: email,
      subject: 'Demo agreement signed: ' + name + (org ? ' (' + org + ')' : ''),
      text, html
    })
  });
  if (!res.ok) {
    console.error('NDA email failed', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return json({ ok: false, error: 'The signature could not be emailed.' }, 502);
  }
  console.log('NDA signed', JSON.stringify({ name, email, org, version, received }));
  return json({ ok: true });
}

/* Has someone at this IP already signed this version? */
async function signedHere(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!env.NDA_KV || !ip) return json({ signed: false });
  const rec = await env.NDA_KV.get('ip:' + ip, 'json');
  return json({ signed: !!(rec && TERMS[rec.version]) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/nda') {
      if (request.method === 'GET') return signedHere(request, env);
      if (request.method !== 'POST') return json({ ok: false, error: 'Use POST or GET.' }, 405);
      return signNda(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
