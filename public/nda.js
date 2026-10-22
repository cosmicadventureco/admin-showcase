/* Root Cause Clinic showcase - the confidential demo agreement.
 *
 * Nobody sees the demo until they agree. The visitor reads a short
 * agreement, types their name as their signature and ticks to agree; the
 * signature goes to /api/nda, which emails it to the owner. The browser
 * remembers the signature for this version of the agreement, and the server
 * remembers the IP it came from, so it is asked once per device or IP. If the email cannot be sent (offline, or a preview with no server),
 * the visitor still gets in and the signature is retried on their next visit.
 */
(function () {
  'use strict';

  var VERSION = '2026-10-22';
  var KEY = 'rcc-nda-' + VERSION, PENDING = 'rcc-nda-pending';
  var OWNER = 'Tyler Webb';

  /* The agreement, as plain paragraphs. The same words go to the server. */
  var TERMS = [
    ['Confidential and owned by ' + OWNER, 'This demo of the Wellness Admin Dashboard, shown here as the Root Cause Clinic app, is confidential and is the intellectual property of ' + OWNER + '. The software, source code, screen designs and layouts, report and protocol templates, written content and the guided tour are © 2026 ' + OWNER + '. All rights reserved.'],
    ['Keep it confidential', 'You will keep the demo and what you learn from it confidential, including its design, features, workflows, written content and any pricing. You may share it only with people in your own organization who need to see it to evaluate working with ' + OWNER + ', and only if they agree to these same terms.'],
    ['No copying or reuse', 'You will not copy, download, save, record, scrape, screenshot for distribution or otherwise reproduce the demo or its source code. You will not use the demo, in whole or in part, as a model, template or framework for any other app, product or project, whether you build it yourself or have someone else build it.'],
    ['No license', 'Viewing the demo gives you no ownership and no license. Any right to use the software comes only from a separate agreement signed by ' + OWNER + '.'],
    ['If the agreement is broken, and how long it lasts', 'If these terms are broken, ' + OWNER + ' may ask a court to order the copying or use to stop, and may use any other remedy the law allows. This agreement is governed by the laws of the State of Utah. It lasts three years from the date you sign, except that the source code stays confidential indefinitely. It does not cover information that was already public, or that you already knew or developed independently without using the demo.']
  ];
  window.RCCNDA = { version: VERSION, terms: TERMS, signed: false };

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private window: ask again next time */ } }

  function send(payload) {
    return fetch('/api/nda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'not sent'); return res; });
  }

  function done() {
    window.RCCNDA.signed = true;
    document.body.classList.remove('nda-open');
    var g = document.getElementById('ndaGate'); if (g) g.remove();
    document.dispatchEvent(new Event('nda-signed'));
  }

  function gate() {
    document.body.classList.add('nda-open');
    var g = document.createElement('div');
    g.id = 'ndaGate'; g.className = 'nda'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'ndaTitle');
    g.innerHTML = '<form class="nda-card" id="ndaForm" novalidate>' +
      '<p class="eyebrow">Before you view</p><h2 class="nda-title" id="ndaTitle">Confidential Demo Agreement</h2>' +
      '<p class="nda-lede">Please read and sign to continue. It takes about a minute.</p>' +
      '<div class="nda-terms" tabindex="0">' + TERMS.map(function (t, i) { return '<p><b>' + (i + 1) + '. ' + t[0] + '.</b> ' + t[1] + '</p>'; }).join('') + '</div>' +
      '<div class="nda-fields"><div><label for="ndaName">Full name (your signature)</label><input id="ndaName" type="text" autocomplete="name" required></div>' +
      '<div><label for="ndaEmail">Email</label><input id="ndaEmail" type="email" autocomplete="email" required></div>' +
      '<div class="wide"><label for="ndaOrg">Organization (optional)</label><input id="ndaOrg" type="text" autocomplete="organization"></div></div>' +
      '<label class="check nda-agree"><input type="checkbox" id="ndaAgree"> I have read and agree to this Confidential Demo Agreement. Typing my name above is my electronic signature.</label>' +
      '<p class="nda-err" id="ndaErr" role="alert"></p>' +
      '<button class="btn" id="ndaGo" type="submit">Sign and view the demo</button>' +
      '<p class="nda-fine">Version ' + VERSION + ' &middot; © 2026 ' + OWNER + '</p></form>';
    document.body.appendChild(g);
    var f = document.getElementById('ndaForm'), err = document.getElementById('ndaErr'), go = document.getElementById('ndaGo');
    setTimeout(function () { var n = document.getElementById('ndaName'); if (n) n.focus(); }, 50);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('ndaName').value.trim(), email = document.getElementById('ndaEmail').value.trim();
      var org = document.getElementById('ndaOrg').value.trim(), agree = document.getElementById('ndaAgree').checked;
      if (name.split(/\s+/).length < 2) { err.textContent = 'Type your full name, first and last, to sign.'; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'That email address looks incomplete.'; return; }
      if (!agree) { err.textContent = 'Tick the box to agree before continuing.'; return; }
      err.textContent = ''; go.disabled = true; go.textContent = 'Signing…';
      var payload = { version: VERSION, name: name, email: email, org: org, agreed: true, signedAt: new Date().toISOString(), page: location.href.split('#')[0] };
      set(KEY, JSON.stringify({ name: name, email: email, at: payload.signedAt }));
      send(payload).then(function () { set(PENDING, null); }, function () { set(PENDING, JSON.stringify(payload)); }).then(done);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (get(KEY)) {
      window.RCCNDA.signed = true;
      /* A signature that could not be sent last time goes now. */
      var p = get(PENDING); if (p) { try { send(JSON.parse(p)).then(function () { set(PENDING, null); }, function () {}); } catch (e) { set(PENDING, null); } }
      return;
    }
    /* Asked once per IP too: if someone at this address has signed, let them in.
       The check gives up after a moment and shows the agreement. */
    document.body.classList.add('nda-open', 'nda-wait');
    var asked = false;
    function ask() { if (!asked) { asked = true; document.body.classList.remove('nda-wait'); gate(); } }
    setTimeout(ask, 1500);
    fetch('/api/nda', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (res) {
      if (asked) return;
      if (res && res.signed) { asked = true; document.body.classList.remove('nda-wait'); set(KEY, JSON.stringify({ byIp: true, at: new Date().toISOString() })); done(); } else ask();
    }, ask);
  });
})();
