/* Evergrove Wellness showcase - the "Play Showcase" player.
 *
 * Drives the real console with a visible, obviously simulated cursor: it moves,
 * clicks, types and signs exactly as a person would, so every screen it shows
 * is the working app rather than a recording. About six minutes at normal
 * speed, three at 2x.
 *
 * Controls while playing: Space pauses, Left arrow or the << button goes back
 * about 10 seconds, F or the >> button speeds up (1x, 2x, 4x), Right arrow
 * skips a chapter, Esc stops.
 *
 * Going back works by putting the app's data back the way it was when the
 * chapter began, then replaying the chapter instantly, with no waits, up to
 * the caption that was showing ten seconds ago.
 */
(function () {
  'use strict';

  var playing = false, paused = false, stopped = false, skip = false;
  /* Every wait, cursor move and keystroke runs on this clock. Normal speed is
     half the original pace; the >> button steps through 2x and 4x. */
  var SPEEDS = [0.5, 1, 2], speedIdx = 0;
  function rate() { return SPEEDS[speedIdx]; }
  var cur = { x: 0, y: 0 };
  var els = {};
  var STOP = { stop: true }, SKIP = { skip: true }, REWIND = { rewind: true };
  /* Rewind bookkeeping: every caption shown, with when it appeared on the
     play clock; a saved copy of the data at the start of each chapter. */
  var marks = [], snaps = [], sayIdx = -1, instant = false, fastUntil = -1, rewindTo = null, replaying = false;
  var clockStart = 0, pausedTotal = 0, pausedAt = 0;
  function clock() { var n = performance.now(); return n - clockStart - pausedTotal - (paused ? n - pausedAt : 0); }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel) { return document.querySelector(sel); }
  function guard() { if (stopped) throw STOP; if (rewindTo) throw REWIND; if (skip) throw SKIP; }

  function sleep(ms) {
    return new Promise(function (resolve, reject) {
      var left = ms, last = performance.now();
      (function tick() {
        if (stopped) return reject(STOP);
        if (rewindTo) return reject(REWIND);
        if (skip) return reject(SKIP);
        if (instant) return resolve();
        var now = performance.now();
        if (!paused) left -= (now - last) * rate();
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
    if (reduce || instant) { cur.x = x; cur.y = y; place(); return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      var done = 0, last = performance.now();
      (function frame(now) {
        if (stopped) return reject(STOP);
        if (rewindTo) return reject(REWIND);
        if (skip) return reject(SKIP);
        if (!paused) done += (now - last) * rate();
        last = now;
        var t = Math.min(1, done / ms), k = ease(t);
        /* A slight arc reads as a hand, a straight line reads as a robot. */
        var arc = Math.sin(Math.PI * t) * Math.min(40, dist * .08);
        cur.x = sx + (x - sx) * k; cur.y = sy + (y - sy) * k - arc;
        place();
        if (t < 1) requestAnimationFrame(frame); else resolve();
      })(last);
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
      el.scrollIntoView({ behavior: reduce || instant ? 'auto' : 'smooth', block: 'center' });
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
    if (!instant) ripple();
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
    sayIdx++;
    if (instant && sayIdx >= fastUntil) {
      /* Caught up with the moment we rewound to: play normally from here. */
      instant = false; els.cursor.style.opacity = 1; els.cap.classList.remove('rewinding');
    } else if (!instant) {
      marks.push({ chapter: chapterIndex, idx: sayIdx, t: clock() });
    }
    els.cTitle.textContent = title;
    els.cText.textContent = text;
  }
  /* Waits for something the app does on its own timer, in real time even
     while replaying, because the app does not know the tour is replaying. */
  function until(cond, max) {
    return new Promise(function (resolve, reject) {
      var t0 = performance.now();
      (function tick() {
        if (stopped) return reject(STOP);
        if (rewindTo) return reject(REWIND);
        if (cond() || performance.now() - t0 > max) return resolve();
        setTimeout(tick, 100);
      })();
    });
  }
  function rewind() {
    if (!playing || !marks.length || rewindTo) return;
    var target = clock() - 10000, pick = marks[0];
    marks.forEach(function (m) { if (m.t <= target) pick = m; });
    rewindTo = pick;
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
      say('Free classes, plus short courses from $59 to $119', 'Free accounts watch the free classes and can buy any short course to keep.');
      await spot('[data-tour="ca-picked"]', 3200);
      var buys = document.querySelectorAll('[data-tour="ca-picked"] [data-cbuy]');
      await click(buys[buys.length - 1], { after: 1200 });
      await click('#caPayVideo', { after: 500 });
      say('Bought and unlocked in seconds', 'Access, receipt and download are handled automatically. Nobody on the team sends a link.');
      await sleep(3200);
      await click('#caClose', { after: 400 });
      await click('[data-ctab="book"]', { after: 700 });
      say('Book a Certified Practitioner', '$99 for 30 minutes, or add $49 for a full hour. Pick who, how long and when.');
      await click('[data-cwho="p3"]', { after: 500 });
      await click('[data-clong="1"]', { after: 900 });
      await click('[data-cday="1"]', { after: 300 });
      await click('[data-ctime="10:30"]', { after: 700 });
      await spot('[data-tour="ca-booksum"]', 1800);
      await click('#caBookPay', { after: 600 });
      say('Booked and paid in one step', 'The calendar invite and Zoom link go out on their own, and the session appears on the team’s schedule.');
      await sleep(3000);
      await click('#caClose2', { after: 400 });
      await click('[data-ctab="home"]', { after: 600 });
      say('Premium Course: $2,995', 'The upgrade is always one tap away, with every benefit spelled out: product discounts, free shipping, every short course and more.');
      await spot('[data-tour="ca-upsell"]', 2400);
      await click('#caProgram', { after: 600 });
      await sleep(3600);
      await click('#caClose', { after: 400 });
    } },
    { name: 'Client app: Premium member', run: async function () {
      App.ui.ca = null; App.go('client'); await sleep(300);
      await choose('#caAs', 'c1');
      say('Premium members use the same app', 'Their week of the course, Thursday’s live Zoom, 20% off and free shipping, on one screen.');
      await spot('[data-tour="ca-week"]', 2400);
      await spot('[data-tour="ca-zoom"]', 1800);
      say('Reordering is one tap at member prices', 'Their plan is always on the home screen, with the discount already applied.');
      await spot('[data-tour="ca-plan"]', 3200);
      await click('[data-ctab="videos"]', { after: 600 });
      say('Every short course included', 'Premium members can watch and download the whole library at no extra cost.');
      await sleep(2400);
    } },
    { name: 'Work queue', run: async function () {
      App.go('queue'); await sleep(600);
      say('Meanwhile, the team sees it all here', 'Sofia’s order, questions from clients and anything else that needs a person, in one shared list.');
      await spot('[data-tour="tasks"]', 4400);
      var orders = App.state().orders, id = orders[orders.length - 1].id;
      say('Approve, then check out in one go', 'Any teammate can approve. The Physica cart fills in their own logged-in tab, they check out, and tracking follows on its own.');
      await click('#w-' + id + ' [data-wapprove]', { after: 800 });
      await click('#w-' + id + ' [data-wconfirm]', { after: 1400 });
      await click('[data-wtab="auto"]', { after: 700 });
      say('Automations you can see and adjust', 'Each one has an on/off switch, its own settings and a log. Here: when clinic stock gets ordered.');
      await spot('[data-tour="automations"]', 2400);
      await click('[data-aupanel="batch"][data-p="settings"]', { after: 900 });
      await spot('#au-batch', 2600);
      await click('[data-aurun="tracking"]', { after: 900 });
      say('Every run is logged', 'Run one by hand and it shows up in its log straight away, alongside what it did on its own.');
      await spot('#au-tracking', 2800);
      await click('[data-wtab="log"]', { after: 700 });
      say('A record of everything it did', 'Including Sofia’s questionnaire, her order and her class purchase from a minute ago.');
      await spot('[data-tour="activity"]', 4000);
      await click('[data-wtab="team"]', { after: 700 });
      say('Clear roles for whoever takes over', 'Owner, practitioners and assistants each see what they need, with a checklist for handing the work over.');
      await spot('[data-tour="roles"]', 3600);
    } },
    { name: 'Energetic scans', run: async function () {
      App.ui.sc = null; App.go('scans'); await sleep(600);
      say('The in-house energetic scan, turned into a report', 'Scanner exports become a client report and a remedy plan the same day, without retyping anything.');
      await spot('[data-tour="scanlist"]', 2600);
      await click('[data-scopen="s2"]', { after: 600 });
      say('Add the four scan exports', 'Resonance, root cause, symptom support and imbalance. Each has its own slot and rules.');
      await click('#scAll', { after: 700 });
      await click('#scExtract', { after: 300 });
      await until(function () { return App.ui.sc.step === 'review'; }, 6000);
      await sleep(400);
      say('Readings and findings, pulled out and ranked', 'Organ dials, dilution notes and remedies in priority order. The practitioner can change anything.');
      await spot('[data-tour="organs"]', 2400);
      await spot('[data-tour="remedies"]', 2800);
      say('Supplier wording is checked', 'Claim language like \u201celiminate\u201d is flagged so it gets reworded before a client ever sees it.');
      await click('[data-edit]', { after: 500 });
      await type('[data-desc]', 'Chosen to support a calmer inflammatory pattern.', 22);
      await click('#scBuild', { after: 900 });
      say('A practitioner signs off, then it is published', 'Nothing reaches the client until a practitioner has reviewed it.');
      await spot('[data-tour="report"] .rr-banner', 2200);
      await click('#scSign', { after: 400 });
      await click('#scPublish', { after: 1400 });
      await click('#scSeeApp', { after: 900 });
      say('The client sees it in their app', 'Their report, with every recommended remedy one tap from the cart at member price.');
      await sleep(2600);
      await click('#caAddRem', { after: 2400 });
      await click('#caClose', { after: 400 });
    } },
    { name: 'Premium Course', run: async function () {
      App.ui.progTab = 'sales'; App.go('program'); await sleep(500);
      say('Sell the $2,995 Premium Course', 'Energetics work, testing, a customised course, weekly live Zoom, 20% off products and free shipping, sold from one page.');
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
    { name: 'Shop & drop-ship', run: async function () {
      App.ui.shopTab = 'pipeline'; App.go('shop'); await sleep(500);
      say('After checkout, the rest runs itself', 'Confirmation saved, tracking emailed to the client, refill reminder set. Nobody copies anything between systems.');
      await spot('[data-tour="pipeline"]', 2800, 6);
      await click('[data-shtab="clinic"]', { after: 700 });
      say('Clinic stock goes out as one order', 'Units collect per supplier, each earmarked for a client, until Physica\u2019s $500 free-shipping line. One order a week instead of one per product.');
      await spot('[data-tour="batches"]', 3600);
      await click('[data-shtab="rules"]', { after: 700 });
      say('The approval rule cannot be switched off', 'Nothing reaches a supplier without a person. Everything around it is automatic.');
      await spot('.rule', 2600);
      await click('[data-shtab="suppliers"]', { after: 700 });
      say('Physica, Biotics and DesBio in one place', 'How orders reach each one, their patient dispensaries, drop-ship terms and the pricing rules the platform enforces.');
      await spot('[data-tour="supplier"]', 3400);
    } },
    { name: 'Outcome', run: async function () {
      App.go('outcome'); await sleep(600);
      say('What it all adds up to', 'Sell more with less effort, deliver the Premium Course, stay safe with suppliers, and hand off the admin.');
      await spot('[data-tour="purposes"]', 3200);
      say('Time back, job by job', 'About 28 hours a week of manual admin becomes about 4. These are estimates to confirm with the team.');
      await spot('[data-tour="jobs"]', 3600);
      say('The client journey it runs', 'From a free questionnaire to the Premium Course and refills, with what runs itself and where a person steps in.');
      await spot('[data-tour="journey"]', 3600);
      say('Growth that fits the supplier rules', 'Advertise the free questionnaire and classes, never product prices. Then a calculator to try your own numbers.');
      await spot('[data-tour="ads"]', 3000);
      await spot('[data-tour="calc"]', 3000);
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
      '<div class="ctl"><button type="button" id="cBack" class="ff" title="Back 10 seconds (Left arrow)" aria-label="Back 10 seconds">&laquo; 10s</button><button type="button" id="cPause">Pause</button><button type="button" id="cSkip">Next &rarr;</button><button type="button" id="cFF" class="ff" title="Speed up (F)" aria-label="Speed: normal. Click to speed up">&raquo; 1&times;</button><div class="prog"><i id="cProg"></i></div><button type="button" id="cStop">Exit</button></div>';
    [els.shield, els.spot, els.cursor, els.cap].forEach(function (e) { document.body.appendChild(e); });
    els.cTitle = $('#cTitle'); els.cText = $('#cText');
    $('#cPause').addEventListener('click', togglePause);
    $('#cFF').addEventListener('click', fastForward);
    $('#cBack').addEventListener('click', rewind);
    paintSpeed();
    $('#cSkip').addEventListener('click', function () { skip = true; });
    $('#cStop').addEventListener('click', stop);
  }
  function teardown() {
    ['shield', 'cursor', 'spot', 'cap'].forEach(function (k) { if (els[k]) els[k].remove(); els[k] = null; });
    document.body.classList.remove('touring');
  }
  function togglePause() {
    if (paused) pausedTotal += performance.now() - pausedAt; else pausedAt = performance.now();
    paused = !paused;
    var b = $('#cPause'); if (b) b.textContent = paused ? 'Resume' : 'Pause';
  }
  function stop() { stopped = true; }
  function paintSpeed() {
    var b = $('#cFF'); if (!b) return;
    var x = rate() * 2;
    b.innerHTML = '&raquo; ' + x + '&times;';
    b.classList.toggle('on', x > 1);
    b.setAttribute('aria-label', 'Speed: ' + (x === 1 ? 'normal' : x + ' times') + '. Click to change');
  }
  function fastForward() { speedIdx = (speedIdx + 1) % SPEEDS.length; paintSpeed(); }
  function onKey(e) {
    if (!playing) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); skip = true; }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); rewind(); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fastForward(); }
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
    marks = []; snaps = []; instant = false; fastUntil = -1; rewindTo = null;
    App.reset(); App.go('dashboard');
    document.body.classList.add('touring');
    build();
    cur.x = window.innerWidth * 0.6; cur.y = window.innerHeight * 0.45; place();
    els.cap.hidden = true; els.cursor.style.opacity = 0;
    try {
      await card('<p class="k">Platform showcase &middot; sample data</p><h2>Evergrove Wellness</h2><p>A simple app for clients, and a console that runs the admin side: free plans, one-tap ordering, short courses, practitioner sessions, the $2,995 Premium Course, energetic scan reports, and drop-shipping that always waits for a person.</p>', 2800);
    } catch (e) { if (e === STOP) return finish(false); skip = false; }
    els.cap.hidden = false; els.cursor.style.opacity = 1;
    clockStart = performance.now(); pausedTotal = 0;
    for (chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex++) {
      var ch = CHAPTERS[chapterIndex];
      skip = false; sayIdx = -1;
      /* A replay that ended early (a step could not run) must not carry on
         invisibly into the next chapter. */
      if (instant && !replaying) { instant = false; els.cursor.style.opacity = 1; els.cap.classList.remove('rewinding'); }
      replaying = false;
      if (!snaps[chapterIndex]) snaps[chapterIndex] = { data: JSON.stringify(App.state()), ui: JSON.stringify(App.ui) };
      $('#cChap').textContent = ch.name;
      $('#cCount').textContent = (chapterIndex + 1) + ' of ' + CHAPTERS.length;
      $('#cProg').style.width = ((chapterIndex + 1) / CHAPTERS.length * 100) + '%';
      try { await ch.run(); }
      catch (e) {
        unspot();
        if (e === STOP) return finish(false);
        if (e === REWIND) {
          var to = rewindTo;
          snaps.length = to.chapter + 1;
          marks = marks.filter(function (m) { return m.chapter < to.chapter || (m.chapter === to.chapter && m.idx <= to.idx); });
          /* The clock goes back to when that caption appeared. */
          clockStart = performance.now() - pausedTotal - (paused ? performance.now() - pausedAt : 0) - to.t;
          App.closeDrawer();
          App.restore(JSON.parse(snaps[to.chapter].data));
          var ui = JSON.parse(snaps[to.chapter].ui);
          Object.keys(App.ui).forEach(function (k) { delete App.ui[k]; });
          Object.keys(ui).forEach(function (k) { App.ui[k] = ui[k]; });
          App.render(); window.scrollTo(0, 0);
          instant = true; replaying = true; fastUntil = to.idx; rewindTo = null; skip = false;
          els.cursor.style.opacity = 0; els.cap.classList.add('rewinding');
          chapterIndex = to.chapter - 1;
          continue;
        }
        if (e !== SKIP) { console.warn('Showcase chapter failed:', e); }
      }
      unspot();
      App.closeDrawer();
    }
    finish(true);
  }

  function finish(completed) {
    playing = false; paused = false; skip = false; instant = false; rewindTo = null;
    teardown();
    window.scrollTo(0, 0);
    if (!completed) { stopped = false; return; }
    stopped = false;
    card('<p class="k">Showcase complete</p><h2>Sales that run, admin that does not depend on one person</h2>' +
      '<p>The intake, records, scheduling, email and e-signature engine already runs a real business every day. The client app, program, shop and work queue are what we would build for you on top of it.</p>' +
      '<ul><li>Client app</li><li>Free plan from a questionnaire</li><li>One-tap ordering</li><li>Short courses $59 to $119</li><li>Practitioner booking</li><li>$2,995 Premium Course</li><li>Energetic scan reports</li><li>Course videos &amp; live Zoom</li><li>Physica Energetics shop</li><li>Approved drop-shipping</li><li>Shared work queue</li><li>Roles &amp; handoff</li></ul>' +
      '<div class="row" style="justify-content:center;gap:.6rem"><button class="btn" id="endOutcome">See the outcome</button><button class="btn ghost" id="endExplore">Explore it yourself</button><button class="btn ghost" id="endReplay">Replay</button></div>', 0)
      .then(function (c) {
        c.querySelector('#endExplore').addEventListener('click', function () { c.remove(); App.go('dashboard'); });
        c.querySelector('#endOutcome').addEventListener('click', function () { c.remove(); App.go('outcome'); });
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
