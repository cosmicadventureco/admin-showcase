/* Evergrove Wellness showcase - the "Play Showcase" player.
 *
 * Drives the real console with a visible, obviously simulated cursor: it moves,
 * clicks, types and signs exactly as a person would, so every screen it shows
 * is the working app rather than a recording. About three minutes at normal
 * speed.
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
  function inView(r) { var side = document.body.classList.contains('clientmode') && !document.body.classList.contains('clientdesk'); return r.top >= 70 && r.bottom <= window.innerHeight - (side ? 16 : 170); }
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
  /* The client the tour adds in step 1 and follows to the end. */
  var NEW_NAME = 'Olivia Bennett';
  function newId() { var c = App.state().clients.filter(function (x) { return x.name === NEW_NAME; })[0]; return c ? c.id : 'c1'; }

  var CHAPTERS = [
    { name: 'Provider 1/7 · Add a client', run: async function () {
      App.ui.cp = null; App.go('clients'); await sleep(500);
      say('Add a client to the portal', 'Name, email, their practitioner and, if they have bought one, a package.');
      await click('#cpAdd', { after: 500 });
      await type('#ncName', NEW_NAME, 45);
      await type('#ncEmail', 'olivia.bennett@example.com', 22);
      await choose('#ncPkg', 'scan');
      await click('#ncSave', { after: 900 });
      say('Her portal invite goes out on its own', 'Olivia’s page opens, ready for the next steps.');
      await spot('[data-tour="clienthead"]', 2200);
    } },
    { name: 'Provider 2/7 · Create a package', run: async function () {
      App.ui.pk = null; App.go('packages'); await sleep(500);
      say('Create a package', 'Name it, price it, and choose which appointments come with it.');
      await click('#pkNew', { after: 600 });
      await type('#pkName', 'Follow-up Review', 40);
      await type('#pkPrice', '165', 80);
      await type('#pkDesc', 'A one-hour review of your progress and protocol.', 16);
      await type('[data-pkcred="review60"]', '1', 80);
      await click('#pkSave', { after: 700 });
      var p = App.state().packages[App.state().packages.length - 1];
      await click('[data-pkon="' + p.id + '"]', { after: 700 });
      say('Saved and on sale', 'It now shows in every client’s portal under Packages.');
      await sleep(1600);
    } },
    { name: 'Provider 3/7 · Send forms & waivers', run: async function () {
      EGPortal.open(newId(), 'forms'); await sleep(500);
      say('Send forms and waivers', 'Her page lists what she needs to sign. One click sends them to her portal.');
      await spot('[data-tour="forms"]', 2200);
      await click('#cpSendAll', { after: 900 });
    } },
    { name: 'Provider 4/7 · Book an appointment', run: async function () {
      App.ui.cal = null; App.go('calendar'); await sleep(500);
      say('Book an appointment', 'Click an open time, then pick the client and the appointment type.');
      var t = App.util.today(), pick = function () { return Array.prototype.filter.call(document.querySelectorAll('[data-cslot]'), function (e) { var p = e.getAttribute('data-cslot').split('|'); return p[0] > t && p[1] === '14:00'; })[0]; };
      if (!pick()) { await click('#calNext', { after: 600 }); }
      await click(pick(), { after: 600 });
      await choose('#calClient', newId());
      await choose('#calType', 'review60');
      await click('#calSave', { after: 900 });
      say('Zoom link and invite, automatically', 'Olivia is asked to confirm it in her portal.');
      await spot('[data-tour="caldetail"]', 2600);
    } },
    { name: 'Provider 5/7 · Create a client report', run: async function () {
      App.ui.sc = null; App.go('scans'); await sleep(500);
      say('Create a client report', 'Pick the client and upload the four scan files from the scanner.');
      await choose('#scClient', newId());
      await click('#scAll', { after: 500 });
      await click('#scExtract', { after: 300 });
      await until(function () { return App.ui.sc.step === 'review'; }, 6000);
      await sleep(300);
      say('Check it, then sign off', 'Readings and remedies are pulled out and ranked. Flagged supplier wording is reworded before it goes out.');
      await spot('[data-tour="remedies"]', 2000);
      if (document.querySelector('[data-edit]')) { await click('[data-edit]', { after: 400 }); await type('[data-desc]', 'Chosen to support a calmer inflammatory pattern.', 14); }
      await click('#scBuild', { after: 700 });
      await click('#scSign', { after: 300 });
      await click('#scPublish', { after: 1000 });
    } },
    { name: 'Provider 6/7 · Create a protocol', run: async function () {
      if (document.querySelector('#scProto')) await click('#scProto', { after: 800 });
      else { App.ui.pc = { client: newId(), draft: null, mode: 'edit' }; App.go('protocols'); await sleep(500); }
      say('Create a protocol', 'Suggestions come from her report. Add them, set the times of day, and publish.');
      for (var i = 0; i < 2; i++) { var a = document.querySelector('[data-padd]'); if (a) await click(a, { after: 500 }); }
      await spot('[data-tour="builder"]', 1600);
      await click('#pcPublish', { after: 900 });
      say('Order her remedies in one click', 'The order goes to the Shop to be approved.');
      await click('#pcOrder', { after: 1000 });
    } },
    { name: 'Provider 7/7 · Approve the order', run: async function () {
      App.ui.shopTab = 'pipeline'; App.go('shop'); await sleep(500);
      say('Approve the order in the Shop', 'Nothing reaches a supplier until someone approves it.');
      var mine = App.state().orders.filter(function (o) { return o.source === 'Protocol'; }).pop();
      var b = mine && document.querySelector('[data-approve="' + mine.id + '"]:not([disabled])');
      if (b) {
        await click(b, { after: 700 });
        say('Approved, then checked out in one go', 'The supplier cart fills in your own logged-in tab. Tracking goes to Olivia when it ships.');
        await click('[data-confirm="' + mine.id + '"]', { after: 1400 });
      }
    } },
    { name: 'Client 1/6 · Health questionnaire', run: async function () {
      App.ui.ca = null; App.go('client'); App.ui.ca.as = newId(); App.ui.ca.device = window.innerWidth >= 1000 ? 'desktop' : 'mobile'; App.render(); await sleep(600);
      say('Now Olivia’s side', 'She signs in to her portal. What she needs to do is at the top.');
      await sleep(1800);
      await click('[data-csign="f2"]', { after: 700 });
      say('Basic health questions', 'Her intake questionnaire: goals, medications, allergies and a few yes/no questions.');
      var chips = document.querySelectorAll('.ca-sheet [data-fchip]');
      if (chips[0]) await click(chips[0], { after: 250 });
      if (chips[1]) await click(chips[1], { after: 250 });
      var qs = document.querySelectorAll('.ca-sheet .fd-q');
      for (var i = 0; i < qs.length; i++) { var r = qs[i].querySelectorAll('input[type=radio]'); if (r[1]) await click(r[1], { after: 200 }); }
      await type('.ca-sheet [data-ff="b3"]', 'None', 60);
      await click('#caSignForm', { after: 900 });
    } },
    { name: 'Client 2/6 · Sign a waiver', run: async function () {
      await click('[data-csign="f1"]', { after: 700 });
      say('Sign a waiver', 'She reads it, ticks to agree and types her name to sign. The signed copy is filed on her page.');
      await type('.ca-sheet [data-ff="a1"]', NEW_NAME, 40);
      await click('.ca-sheet [data-ff="a3"]', { after: 300 });
      await type('.ca-sheet [data-ffsign]', NEW_NAME, 45);
      await click('#caSignForm', { after: 900 });
    } },
    { name: 'Client 3/6 · Confirm appointment', run: async function () {
      say('Confirm the appointment', 'The session booked for her is waiting for her to confirm. The Zoom link is in her portal and her email.');
      await spot('[data-tour="ca-confirm"]', 1800);
      await click('[data-cconfirm]', { after: 900 });
    } },
    { name: 'Client 4/6 · Client reports', run: async function () {
      await click('.ca-tile[data-ctab="reports"]', { after: 700 });
      say('Her client report', 'Published by her practitioner a moment ago, with her readings and remedies.');
      var rp = document.querySelector('[data-crep]');
      if (rp) await click(rp, { after: 800 });
      await spot('#caBody [data-tour="report"] .rr-banner', 2400);
    } },
    { name: 'Client 5/6 · Protocol', run: async function () {
      await click('[data-ctab="protocol"]', { after: 700 });
      say('Her protocol', 'What to take and when, with reminders. She ticks each dose off as she goes.');
      var t = document.querySelector('[data-ctake]');
      if (t) await click(t, { after: 700 });
      await spot('[data-tour="ca-protocol"]', 2000);
    } },
    { name: 'Client 6/6 · Shop', run: async function () {
      await click('[data-ctab="shop"]', { after: 700 });
      say('The shop', 'Her remedies, ready to reorder. Every order is checked by her practitioner before it ships.');
      var a = document.querySelector('[data-cadd]');
      if (a) await click(a, { after: 700 });
      await sleep(1600);
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
      await card('<p class="k">Platform showcase &middot; sample data</p><h2>Evergrove Wellness</h2><p>A quick look at the basics: seven steps on the provider side, then the same client&rsquo;s view of her portal.</p></p>', 2800);
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
    card('<p class="k">Showcase complete</p><h2>From new client to first order</h2>' +
      '<p>Everything shown is working in this prototype, with sample data. Explore any screen yourself, or replay.</p>' +
      '<ul><li>Add a client</li><li>Packages</li><li>Forms &amp; waivers</li><li>Booking with Zoom</li><li>Client reports</li><li>Protocols</li><li>Approved orders</li><li>Client portal</li></ul>' +
      '<div class="row" style="justify-content:center;gap:.6rem"><button class="btn" id="endOutcome">See The Outcome</button><button class="btn ghost" id="endExplore">Explore it yourself</button><button class="btn ghost" id="endReplay">Replay</button></div>', 0)
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
