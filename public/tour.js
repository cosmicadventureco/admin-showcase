/* Evergrove Wellness showcase - the "Play Showcase" player.
 *
 * Drives the real console with a visible, obviously simulated cursor: it moves,
 * clicks, types and signs exactly as a person would, so every screen it shows
 * is the working app rather than a recording. About two and a half minutes.
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
  /* The caption sits beside the phone in the client app, under everything else. */
  function inView(r) { return r.top >= 70 && r.bottom <= window.innerHeight - (document.body.classList.contains('clientmode') ? 16 : 170); }
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
    { name: 'Client app: free account', run: async function () {
      App.ui.ca = null; App.go('client'); await sleep(600);
      say('A simple app for your clients', 'Separate from the team console. Clients get a free plan, order in one tap and watch classes.');
      await spot('[data-tour="phone"]', 2600, 4);
      await click('#caStart', { after: 600 });
      say('A free plan from a short questionnaire', 'Three quick steps on any phone: goals, a little about them, and where to send the plan.');
      await click('[data-cgoal="sleep"]', { after: 250 });
      await click('[data-cgoal="stress"]', { after: 400 });
      await click('#caNext', { after: 500 });
      await choose('#caDiet', 'vegetarian');
      await click('#caNext', { after: 500 });
      await type('#caName', 'Sofia Martinez', 45);
      await type('#caEmail', 'sofia.martinez@example.com', 25);
      await click('#caConsent', { after: 250 });
      await click('#caFinish', { after: 900 });
      say('Suggestions she can act on', 'Physica Energetics remedies matched to her goals, each with the reason it was picked.');
      await spot('[data-tour="ca-picks"]', 4200);
      say('One tap to order the whole plan', 'Subscribe and save 15%, then pay. No back-and-forth emails.');
      await click('#caSub', { after: 400 });
      await click('#caAddAll', { after: 2400 });
      await click('#caPay', { after: 600 });
      say('Clear about what happens next', 'Every order is checked by the team before it ships, and the client can track it in plain language.');
      await sleep(3600);
      await click('#caClose', { after: 400 });
      await click('[data-ctab="videos"]', { after: 600 });
      say('Free classes, plus $59 masterclasses', 'Free accounts watch the free classes and can buy any masterclass to keep.');
      await spot('[data-tour="ca-picked"]', 3200);
      await click('[data-tour="ca-picked"] [data-cbuy]', { after: 900 });
      await click('#caPayVideo', { after: 500 });
      say('Bought and unlocked in seconds', 'Access, receipt and download are handled automatically. Nobody on the team sends a link.');
      await sleep(3600);
      await click('#caClose', { after: 400 });
    } },
    { name: 'Client app: program member', run: async function () {
      App.ui.ca = null; App.go('client'); await sleep(300);
      await choose('#caAs', 'c1');
      say('Program members use the same app', 'Their week of the course, Thursday’s live Zoom and 20% off everything, on one screen.');
      await spot('[data-tour="ca-week"]', 2400);
      await spot('[data-tour="ca-zoom"]', 1800);
      say('Reordering is one tap at member prices', 'Their plan is always on the home screen, with the discount already applied.');
      await spot('[data-tour="ca-plan"]', 3200);
      await click('[data-ctab="videos"]', { after: 600 });
      say('Every class included', 'Members can watch and download the whole library, including masterclasses.');
      await sleep(2400);
    } },
    { name: 'Work queue', run: async function () {
      App.go('queue'); await sleep(600);
      say('Meanwhile, the team sees it all here', 'Sofia’s order, questions from clients and anything else that needs a person, in one shared list.');
      await spot('[data-tour="tasks"]', 4400);
      var orders = App.state().orders, id = orders[orders.length - 1].id;
      say('Approve, confirm, done', 'Any teammate can do it. The system sends it to Physica Energetics and emails tracking on its own.');
      await click('#w-' + id + ' [data-wapprove]', { after: 800 });
      await click('#w-' + id + ' [data-wconfirm]', { after: 1400 });
      await click('[data-wtab="auto"]', { after: 700 });
      say('The admin job, mostly automated', 'About 22 hours a week of manual admin becomes about 3.5 (our estimate), and none of it depends on one person.');
      await spot('[data-tour="jobs"]', 4600);
      await click('[data-wtab="log"]', { after: 700 });
      say('A record of everything it did', 'Including Sofia’s questionnaire, her order and her class purchase from a minute ago.');
      await spot('[data-tour="activity"]', 4000);
      await click('[data-wtab="team"]', { after: 700 });
      say('Clear roles for whoever takes over', 'Owner, practitioners and assistants each see what they need, with a checklist for handing the work over.');
      await spot('[data-tour="roles"]', 3600);
    } },
    { name: 'Dashboard', run: async function () {
      App.go('dashboard'); await sleep(500);
      say('The owner’s view of the business', 'Program members, sessions, revenue and anything waiting, built from live records.');
      await spot('[data-tour="stats"]', 2600);
      await spot('[data-tour="todo"]', 2600);
    } },
    { name: '3-Month Program', run: async function () {
      App.ui.progTab = 'sales'; App.go('program'); await sleep(500);
      say('Sell the $2,995 all-inclusive program', 'Energetics work, testing, a customised course, weekly live Zoom and member pricing, sold from one page.');
      await spot('[data-tour="sales"] .pricebox', 2400);
      await click('#pEnroll', { after: 700 });
      say('Enrollment and agreement in one step', 'Pay in full or in three payments. The program agreement is signed in the same form.');
      await type('#pName', 'Jordan Okafor', 40);
      await type('#pEmail', 'jordan.okafor@example.com', 22);
      await choose('#pPlan', 'plan');
      await click('#pAgree', { after: 250 });
      await click('#pPay', { after: 1000 });
      say('Then delivery runs itself', 'Payment plan, signed agreement, assessment booking, test kit, Zoom invites, week 1 and member pricing.');
      await spot('[data-tour="enrollbehind"]', 3400);
      await click('#pSeeMembers', { after: 800 });
      say('Every member at a glance', 'Course week, energetics assessment, testing, custom plan, payments and Zoom attendance.');
      await spot('[data-tour="members"]', 3000);
    } },
    { name: 'Schedule', run: async function () {
      App.ui.schedTab = 'list'; App.go('schedule'); await sleep(500);
      say('Consultations with their paperwork status', 'Each session shows who is coming and who still owes forms. Reminders go out in one tap.');
      await spot('[data-tour="bookings"] .card', 3000);
      var btn = document.querySelector('[data-remind]');
      if (btn) await click(btn, { after: 1400 });
      await click('#sCalTab', { after: 900 });
      say('The month at a glance', 'One-to-one sessions in green, group workshops in gold.');
      await spot('[data-tour="calendar"]', 2800);
    } },
    { name: 'Shop & drop-ship', run: async function () {
      App.ui.shopTab = 'pipeline'; App.go('shop'); await sleep(500);
      say('After approval, orders run on their own', 'Sent to the supplier, confirmed, shipped with tracking emailed, refill reminder set.');
      await spot('[data-tour="pipeline"]', 2800, 6);
      await click('[data-shtab="rules"]', { after: 700 });
      say('The approval rule cannot be switched off', 'Nothing reaches a supplier without a person. Everything around it is automatic.');
      await spot('.rule', 2600);
      await click('[data-shtab="products"]', { after: 700 });
      say('Built on the Physica Energetics catalogue', 'Member prices and margins for every product. Prices here are placeholders until we load your price list.');
      await sleep(2800);
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
      await card('<p class="k">Platform showcase &middot; sample data</p><h2>Evergrove Wellness</h2><p>A simple app for clients, and a console that runs the admin side: free plans, one-tap ordering, $59 classes, the $2,995 program, and drop-shipping that always waits for a person.</p>', 4200);
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
    card('<p class="k">Showcase complete</p><h2>Sales that run, admin that does not depend on one person</h2>' +
      '<p>The intake, records, scheduling, email and e-signature engine already runs a real business every day. The client app, program, shop and work queue are what we would build for you on top of it.</p>' +
      '<ul><li>Client app</li><li>Free plan from a questionnaire</li><li>One-tap ordering</li><li>$59 masterclasses</li><li>3-Month Program</li><li>Course videos &amp; live Zoom</li><li>Physica Energetics shop</li><li>Approved drop-shipping</li><li>Shared work queue</li><li>Roles &amp; handoff</li></ul>' +
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
