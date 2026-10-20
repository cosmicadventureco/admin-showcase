/* Evergrove Wellness showcase - the "Play Showcase" player.
 *
 * Drives the real console with a visible, obviously simulated cursor: it moves,
 * clicks, types and signs exactly as a person would, so every screen it shows
 * is the working app rather than a recording. About three minutes.
 *
 * Controls while playing: Space pauses, Right arrow skips a chapter, Esc stops.
 */
(function () {
  'use strict';

  var playing = false, paused = false, stopped = false, skip = false;
  var cur = { x: 0, y: 0 };
  var els = {};
  var STOP = { stop: true }, SKIP = { skip: true };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel) { return document.querySelector(sel); }
  function guard() { if (stopped) throw STOP; if (skip) throw SKIP; }

  function sleep(ms) {
    return new Promise(function (resolve, reject) {
      var left = ms, last = performance.now();
      (function tick() {
        if (stopped) return reject(STOP);
        if (skip) return reject(SKIP);
        var now = performance.now();
        if (!paused) left -= now - last;
        last = now;
        if (left <= 0) return resolve();
        setTimeout(tick, Math.min(50, Math.max(10, left)));
      })();
    });
  }

  /* ------------------------------------------------------------- cursor */
  function place() { els.cursor.style.transform = 'translate(' + cur.x + 'px,' + cur.y + 'px)'; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function moveTo(x, y, ms) {
    var sx = cur.x, sy = cur.y;
    var dist = Math.hypot(x - sx, y - sy);
    ms = ms || Math.min(1100, Math.max(380, dist * 1.1));
    if (reduce) ms = 1;
    return new Promise(function (resolve, reject) {
      var t0 = performance.now(), pausedFor = 0, pauseAt = 0;
      (function frame(now) {
        if (stopped) return reject(STOP);
        if (skip) return reject(SKIP);
        if (paused) { if (!pauseAt) pauseAt = now; return requestAnimationFrame(frame); }
        if (pauseAt) { pausedFor += now - pauseAt; pauseAt = 0; }
        var t = Math.min(1, (now - t0 - pausedFor) / ms), k = ease(t);
        /* A slight arc reads as a hand, a straight line reads as a robot. */
        var arc = Math.sin(Math.PI * t) * Math.min(40, dist * .08);
        cur.x = sx + (x - sx) * k; cur.y = sy + (y - sy) * k - arc;
        place();
        if (t < 1) requestAnimationFrame(frame); else resolve();
      })(t0);
    });
  }

  function find(sel) {
    var el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) throw SKIP; // the screen is not what the script expects: move on rather than hang
    return el;
  }
  function inView(r) { return r.top >= 70 && r.bottom <= window.innerHeight - 170; }
  async function reveal(el) {
    var r = el.getBoundingClientRect();
    if (!inView(r)) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      await sleep(650);
    }
    return el.getBoundingClientRect();
  }
  async function point(sel, dx, dy) {
    var el = find(sel);
    var r = await reveal(el);
    await moveTo(r.left + (dx == null ? r.width / 2 : dx), r.top + (dy == null ? r.height / 2 : dy));
    return el;
  }
  function ripple() {
    var rp = document.createElement('div');
    rp.className = 'ripple'; rp.style.left = cur.x + 'px'; rp.style.top = cur.y + 'px';
    document.body.appendChild(rp);
    setTimeout(function () { rp.remove(); }, 600);
  }
  async function click(sel, opts) {
    var el = await point(sel, opts && opts.dx, opts && opts.dy);
    guard();
    ripple();
    await sleep(140);
    el.click();
    await sleep(opts && opts.after != null ? opts.after : 450);
    return el;
  }
  async function type(sel, text, speed) {
    var el = await click(sel, { after: 150 });
    el.focus();
    el.value = '';
    for (var i = 0; i < text.length; i++) {
      guard();
      el.value += text[i];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep((speed || 55) + Math.random() * 35);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(250);
  }
  async function choose(sel, value) {
    var el = await click(sel, { after: 250 });
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
    await sleep(450);
  }
  async function sign(sel) {
    var cv = find(sel);
    var r = await reveal(cv);
    var ctx = cv.getContext('2d');
    var pts = [];
    /* A loose cursive scrawl: a run of loops that drifts right, then a flourish. */
    for (var t = 0; t <= 1; t += 0.012) {
      var x = r.width * (0.1 + 0.62 * t) + Math.cos(t * 26) * 12;
      var y = r.height * 0.55 - Math.sin(t * 26) * r.height * 0.18 - Math.sin(t * 3.1) * 8;
      pts.push([x, y]);
    }
    for (var u = 0; u <= 1; u += 0.05) pts.push([r.width * (0.72 + 0.16 * u), r.height * (0.62 - 0.2 * u * u)]);
    await moveTo(r.left + pts[0][0], r.top + pts[0][1]);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      guard();
      ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]);
      cur.x = r.left + pts[i][0]; cur.y = r.top + pts[i][1]; place();
      await sleep(14);
    }
    cv.dispatchEvent(new Event('sig'));
    await sleep(400);
  }

  /* ---------------------------------------------------------- spotlight */
  async function spot(sel, ms, pad) {
    var el = find(sel);
    var r = await reveal(el);
    pad = pad == null ? 8 : pad;
    var s = els.spot;
    s.style.left = (r.left - pad) + 'px'; s.style.top = (r.top - pad) + 'px';
    s.style.width = (r.width + pad * 2) + 'px'; s.style.height = (r.height + pad * 2) + 'px';
    s.hidden = false;
    await sleep(ms || 2200);
    s.hidden = true;
  }
  function unspot() { if (els.spot) els.spot.hidden = true; }

  /* ------------------------------------------------------------ caption */
  var chapterIndex = 0;
  function say(title, text) {
    els.cTitle.textContent = title;
    els.cText.textContent = text;
  }

  /* ------------------------------------------------------------- script */
  var CHAPTERS = [
    { name: 'Dashboard', run: async function () {
      App.go('dashboard'); await sleep(500);
      say('One screen for the whole day', 'Program members, sessions, revenue and orders at a glance, built from live records.');
      await spot('[data-tour="stats"]', 3000);
      say('It tells you what needs attention', 'Orders waiting for approval, missing consent forms, plans needing practitioner review and unsigned quotes.');
      await spot('[data-tour="todo"]', 4000);
    } },
    { name: 'Client messaging', run: async function () {
      App.go('messages'); await sleep(500);
      say('Send the right message in seconds', 'Pick a template and a client. The wording, links and booking details fill themselves in.');
      await choose('#mKind', 'intake');
      await type('#mTo', 'Dev Malhotra', 45);
      await choose('#mSvc', 'initial');
      say('A live preview of exactly what they receive', 'Every message is branded, personal and editable before it goes.');
      await point('#mPreview', null, 120);
      await sleep(1800);
      await click('#mSend', { after: 1300 });
    } },
    { name: 'Wellness intake', run: async function () {
      App.go('intake'); await sleep(500);
      say('The client fills in one short form', 'Consent, health screening and goals, on any phone. It even saves offline and uploads later.');
      await type('#iName', 'Sofia Martinez', 45);
      await type('#iEmail', 'sofia.martinez@example.com', 28);
      await type('#iPhone', '(801) 555-0199', 35);
      await type('#iDob', '04/12/1988', 50);
      say('Goals drive everything that follows', 'Sleep, stress and focus for Sofia. These answers shape her plan, her course track and her newsletter.');
      await click('[data-goal="sleep"]', { after: 250 });
      await click('[data-goal="stress"]', { after: 250 });
      await click('[data-goal="focus"]', { after: 350 });
      await choose('#iDiet', 'vegetarian');
      say('Diet and allergies filter the products', 'She eats vegetarian and is allergic to fish, so fish oil is ruled out automatically.');
      await click('[data-allergy="fish"]', { after: 2200 });
      say('Signed consent, legally recorded', 'A drawn signature, saved as a PDF with the date, time and device.');
      await click('#iAgree', { after: 350 });
      await sign('#iSig');
      await click('#iSubmit', { after: 1100 });
      say('An instant, personalised plan', 'Remedies from the Physica Energetics range and supplements matched to her goals, with the reason for each.');
      await spot('[data-tour="picks"]', 4000);
      say('Every plan points to the 3-Month Program', 'Subscribe-and-save refills, videos picked for her, and the full program one click away.');
      await spot('.upsell', 2600);
      say('And the busywork does itself', 'A client record, the consent PDF, the follow-up email and newsletter segments, all done automatically.');
      await spot('[data-tour="behind"]', 3200);
      await click('#iOpen', { after: 900 });
      say('Everything about Sofia in one record', 'Her plan, video progress, sessions, orders and private practitioner notes.');
      await sleep(1400);
      var drawer = document.querySelector('.drawer');
      for (var i = 0; i < 3 && drawer; i++) { guard(); drawer.scrollBy({ top: 280, behavior: reduce ? 'auto' : 'smooth' }); await sleep(850); }
      await click('#dClose', { after: 400 });
    } },
    { name: 'Clients', run: async function () {
      App.go('clients'); await sleep(500);
      say('Every client, searchable from a phone', 'Plans, goals, paperwork status and lifetime value in one list.');
      await sleep(1200);
      await type('#rQ', 'sleep', 90);
      say('Find people by what they need', 'Searching "sleep" finds every client working on sleep, ready for a targeted offer.');
      await sleep(2400);
    } },
    { name: 'Schedule', run: async function () {
      App.go('schedule'); await sleep(500);
      say('Sessions with their paperwork status', 'Each consultation and workshop shows who is coming and who still owes forms.');
      await spot('[data-tour="bookings"] .card', 2800);
      var btn = document.querySelector('[data-remind]');
      if (btn) {
        say('Chase missing forms in one tap', 'A branded reminder with their personal intake link goes straight out.');
        await click(btn, { after: 1300 });
      }
      await click('#sCalTab', { after: 900 });
      say('The month at a glance', 'One-to-one sessions in green, group workshops in gold.');
      await spot('[data-tour="calendar"]', 2800);
    } },
    { name: '3-Month Program', run: async function () {
      App.go('program'); await sleep(500);
      say('Sell the $2,995 all-inclusive program', 'Energetics work, testing, a customised course, weekly live Zoom and member pricing, sold from one page.');
      await spot('[data-tour="sales"] .pricebox', 2600);
      await point('.includes .inc:nth-child(3)');
      await sleep(2200);
      await click('#pEnroll', { after: 800 });
      say('Enrollment and agreement in one step', 'Pay in full or in three payments. The program agreement is signed in the same form.');
      await type('#pName', 'Jordan Okafor', 45);
      await type('#pEmail', 'jordan.okafor@example.com', 25);
      await choose('#pPlan', 'plan');
      await click('#pAgree', { after: 300 });
      await click('#pPay', { after: 1100 });
      say('Then delivery runs itself', 'Payment, signed agreement, assessment booking, test kit, Zoom invites, week 1 unlocked and member pricing on.');
      await spot('[data-tour="enrollbehind"]', 3800);
      await click('#pSeeMembers', { after: 900 });
      say('Every member at a glance', 'Course week, energetics assessment, testing, custom plan, payments and Zoom attendance.');
      await spot('[data-tour="members"]', 3200);
      await click('[data-ptab="content"]', { after: 900 });
      say('A course customised to each member', 'Modules unlock weekly, week 5 is their personal track, and videos and protocols are downloadable.');
      await spot('[data-tour="modules"]', 2400);
      await click('[data-tour="modules"] .module.now [data-dl]', { after: 2000 });
      await click('[data-ptab="live"]', { after: 900 });
      say('Weekly live Zoom with practitioners', 'Sessions, invites and recordings are scheduled and added to the course automatically.');
      await spot('[data-tour="zoom"]', 2800);
    } },
    { name: 'Shop & drop-ship', run: async function () {
      App.ui.shopTab = 'store'; App.go('shop'); await sleep(500);
      say('A storefront for the Physica Energetics range', 'Clients shop remedies and supplements. Program members see 20% off automatically.');
      await spot('#stMember', 2000, 6);
      await click('[data-line="milieu"]', { after: 700 });
      await click('[data-add="PE-RLX"]', { after: 500 });
      await click('[data-line="all"]', { after: 600 });
      await click('[data-add="EG-MAG"]', { after: 700 });
      say('Member pricing at checkout', 'The 20% discount is applied for program members, with no codes to remember.');
      await spot('[data-tour="cart"]', 2200);
      await click('#stCheckout', { after: 1200 });
      var orders = App.state().orders, id = orders[orders.length - 1].id;
      say('Nothing ships without a person', 'Every order, including refills, waits here with the supplier, cost and margin laid out. Flagged clients need a review tick too.');
      await spot('[data-tour="approvals"]', 3600);
      await click('#ap-' + id + ' [data-approve]', { after: 700 });
      say('Approve, then confirm', 'A second step shows exactly what goes to which supplier, for how much, before anything is sent.');
      await spot('#ap-' + id + ' .confirm', 3000);
      await click('#ap-' + id + ' [data-confirm]', { after: 300 });
      say('After approval, it runs on its own', 'Sent to Physica Energetics, confirmed, tracking emailed to the client, delivered, refill reminder set.');
      await spot('[data-tour="pipeline"]', 1200, 6);
      var waited = 0;
      while (App.ui.simulating && waited < 9000) { await sleep(250); waited += 250; }
      await point('#shLog', 40, 20);
      await sleep(1400);
      await click('[data-shtab="rules"]', { after: 900 });
      say('The approval rule cannot be switched off', 'Routing, tracking emails, refills, member pricing and margin alerts run in the background.');
      await spot('.rule', 2600);
    } },
    { name: 'Newsletter', run: async function () {
      App.go('newsletter'); await sleep(500);
      say('Newsletters that know each reader', 'Write once. Every subscriber gets their own name, goal and product pick.');
      await choose('#nlSeg', 'sleep');
      await point('#nlPreview', null, 160);
      await sleep(1600);
      var chips = document.querySelectorAll('[data-reader]');
      if (chips[1]) {
        say('Same email, a different pick per person', 'Switch readers and the recommended product changes with their intake answers.');
        await click(chips[1], { after: 1800 });
      }
      await click('#nlSend', { after: 900 });
    } },
    { name: 'Quotes & agreements', run: async function () {
      App.go('agreements'); await sleep(500);
      say('Quotes for corporate wellness', 'Every line and the total are calculated for you, so the numbers always agree.');
      await sleep(1300);
      await type('[data-l="0"][data-f="1"]', '12', 160);
      say('Change a number, the quote updates', 'Doubling the sessions updates the line and the total instantly.');
      await spot('#qTotal', 1800, 10);
      await click('#qSign', { after: 1100 });
      say('Signed online, filed automatically', 'The client signs from their phone and the signed PDF lands in your records.');
      await spot('.sigline', 2400);
    } }
  ];

  /* ------------------------------------------------------------ chrome */
  function build() {
    els.shield = document.createElement('div'); els.shield.className = 'shield';
    els.cursor = document.createElement('div'); els.cursor.className = 'cursor';
    els.cursor.innerHTML = '<svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true"><path d="M3 2 L3 27 L9.5 21 L14 31 L18.5 29 L14 19.5 L23 19.5 Z" fill="var(--cursor-fill)" stroke="var(--cursor-edge)" stroke-width="2" stroke-linejoin="round"/></svg><span class="tag">Demo</span>';
    els.spot = document.createElement('div'); els.spot.className = 'spot'; els.spot.hidden = true;
    els.cap = document.createElement('div'); els.cap.className = 'caption'; els.cap.setAttribute('role', 'status'); els.cap.setAttribute('aria-live', 'polite');
    els.cap.innerHTML = '<div class="k"><span id="cChap"></span><span id="cCount"></span></div><h4 id="cTitle"></h4><p id="cText"></p>' +
      '<div class="ctl"><button type="button" id="cPause">Pause</button><button type="button" id="cSkip">Next &rarr;</button><div class="prog"><i id="cProg"></i></div><button type="button" id="cStop">Exit</button></div>';
    [els.shield, els.spot, els.cursor, els.cap].forEach(function (e) { document.body.appendChild(e); });
    els.cTitle = $('#cTitle'); els.cText = $('#cText');
    $('#cPause').addEventListener('click', togglePause);
    $('#cSkip').addEventListener('click', function () { skip = true; });
    $('#cStop').addEventListener('click', stop);
  }
  function teardown() {
    ['shield', 'cursor', 'spot', 'cap'].forEach(function (k) { if (els[k]) els[k].remove(); els[k] = null; });
    document.body.classList.remove('touring');
  }
  function togglePause() {
    paused = !paused;
    var b = $('#cPause'); if (b) b.textContent = paused ? 'Resume' : 'Pause';
  }
  function stop() { stopped = true; }
  function onKey(e) {
    if (!playing) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); skip = true; }
  }

  function card(html, ms) {
    return new Promise(function (resolve, reject) {
      var c = document.createElement('div'); c.className = 'titlecard'; c.innerHTML = '<div class="in">' + html + '</div>';
      document.body.appendChild(c);
      var done = function () { c.remove(); resolve(); };
      if (!ms) { resolve(c); return; }
      sleep(ms).then(done, function (e) { c.remove(); reject(e); });
    });
  }

  async function play() {
    if (playing) return;
    playing = true; paused = false; stopped = false; skip = false;
    App.reset(); App.go('dashboard');
    document.body.classList.add('touring');
    build();
    cur.x = window.innerWidth * 0.6; cur.y = window.innerHeight * 0.45; place();
    els.cap.hidden = true; els.cursor.style.opacity = 0;
    try {
      await card('<p class="k">Platform showcase &middot; sample data</p><h2>Evergrove Wellness</h2><p>Intake, personalised plans, a $2,995 three-month program with course delivery, a Physica Energetics storefront with approved drop-shipping, newsletters and e-signed quotes, in one web app.</p>', 4200);
    } catch (e) { if (e === STOP) return finish(false); skip = false; }
    els.cap.hidden = false; els.cursor.style.opacity = 1;
    for (chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex++) {
      var ch = CHAPTERS[chapterIndex];
      skip = false;
      $('#cChap').textContent = ch.name;
      $('#cCount').textContent = (chapterIndex + 1) + ' of ' + CHAPTERS.length;
      $('#cProg').style.width = ((chapterIndex + 1) / CHAPTERS.length * 100) + '%';
      try { await ch.run(); }
      catch (e) {
        unspot();
        if (e === STOP) return finish(false);
        if (e !== SKIP) { console.warn('Showcase chapter failed:', e); }
      }
      unspot();
      App.closeDrawer();
    }
    finish(true);
  }

  function finish(completed) {
    playing = false; paused = false; skip = false;
    teardown();
    window.scrollTo(0, 0);
    if (!completed) { stopped = false; return; }
    stopped = false;
    card('<p class="k">Showcase complete</p><h2>Built on a platform already in daily use</h2>' +
      '<p>The intake, records, scheduling, email and e-signature engine runs a real booking business today. The wellness pieces are what we would build for you on top of it.</p>' +
      '<ul><li>Wellness intake &amp; consent</li><li>Personalised plans</li><li>3-Month Program sales</li><li>Course videos &amp; downloads</li><li>Weekly live Zoom</li><li>Physica Energetics storefront</li><li>Approved drop-shipping</li><li>Client records</li><li>Scheduling</li><li>Smart newsletters</li><li>Quotes &amp; e-sign</li></ul>' +
      '<div class="row" style="justify-content:center;gap:.6rem"><button class="btn" id="endExplore">Explore it yourself</button><button class="btn ghost" id="endReplay">Replay</button></div>', 0)
      .then(function (c) {
        c.querySelector('#endExplore').addEventListener('click', function () { c.remove(); App.go('dashboard'); });
        c.querySelector('#endReplay').addEventListener('click', function () { c.remove(); play(); });
      });
  }

  document.addEventListener('keydown', onKey);
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('playBtn');
    if (b) b.addEventListener('click', play);
    /* ?play or #play starts it straight away: handy for a kiosk or a recording. */
    if (/[?&]play\b/.test(location.search) || location.hash === '#play') setTimeout(play, 600);
  });
  window.Showcase = { play: play, stop: stop };
})();
