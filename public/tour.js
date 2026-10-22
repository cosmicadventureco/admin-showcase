/* Evergrove Wellness showcase - the "Play Showcase" player.
 *
 * Drives the real console with a visible, obviously simulated cursor: it moves,
 * clicks, types and signs exactly as a person would, so every screen it shows
 * is the working app rather than a recording. About five minutes at normal
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
  var CHAPTERS = [
    { name: 'Home', run: async function () {
      App.go('dashboard'); await sleep(600);
      say('Six places run the practice', 'Client Portal, Shop, Client Report Creator, Protocol Creator, Booking Calendar and Waivers & Forms. Everything else can be added later.');
      await spot('[data-tour="doors"]', 4200, 6);
      say('Checklist', 'Messages to answer, orders to approve, scan files to upload. One list, so nothing depends on one person remembering.');
      await spot('[data-tour="today"]', 3400);
      say('Upcoming Appointments', 'The week ahead at a glance, each one a click from the client’s page.');
      await spot('[data-tour="appts"]', 3000);
    } },
    { name: 'Client Portal', run: async function () {
      App.ui.cp = null; App.go('clients'); await sleep(600);
      say('Client Portal: every client in one place', 'Search by name or email, and see each client’s tier at a glance.');
      await spot('[data-tour="clientlist"]', 2600);
      await click('[data-cp="c1"]', { after: 700 });
      say('One page per client', 'Basic information first, with their practitioner, the app and their protocol one click away.');
      await spot('[data-tour="clienthead"]', 2600);
      await spot('[data-tour="clienttabs"]', 2200, 4);
      await click('[data-cptab="bookings"]', { after: 700 });
      say('Bookings and packages', 'Sessions booked, the Premium Course and what is left in each package.');
      await sleep(2600);
      await click('[data-cptab="billing"]', { after: 700 });
      say('Billing and payments', 'Every charge, payment plan and refund, with a payment link one click away.');
      await spot('[data-tour="billing"]', 3000);
      await click('[data-cptab="protocols"]', { after: 800 });
      say('Protocols', 'The polished PDF of what they take and when, ready to print or send.');
      await spot('[data-tour="protodoc"]', 3200);
      await click('[data-cptab="messages"]', { after: 700 });
      say('Messages', 'Clients write to their practitioner from the app. The reply goes from here, straight back to their phone.');
      await spot('[data-tour="messages"] .thread', 2400);
      await type('#cpReply', 'Yes, keep the bedtime dose the same for now. We will review it at your next session.', 18);
      await click('#cpSend', { after: 900 });
      await click('[data-cptab="forms"]', { after: 700 });
      say('Forms and waivers', 'Intake, consent and the program agreement, signed online. Anything missing can be sent in one click.');
      await spot('[data-tour="forms"]', 3000);
      await click('[data-cptab="docs"]', { after: 700 });
      say('Documents', 'Scan reports, protocols and anything uploaded, kept together.');
      await spot('[data-tour="docs"]', 2800);
    } },
    { name: 'Booking Calendar', run: async function () {
      App.ui.cal = null; App.go('calendar'); await sleep(600);
      say('Booking Calendar', 'Every practitioner’s week in one place, colour-coded. Clients book open times from their portal.');
      await spot('[data-tour="calweek"]', 3200, 4);
      var zb = App.state().bookings.filter(function (b) { return b.zoom && document.querySelector('[data-cev="' + b.id + '"]'); })[0];
      if (zb) {
        await click('[data-cev="' + zb.id + '"]', { after: 800 });
        say('Zoom links make themselves', 'Each video session gets its own Zoom meeting. The invite, reminders and calendar sync all go out automatically.');
        await spot('[data-tour="caldetail"]', 3600);
      }
      await click('[data-caltab="settings"]', { after: 800 });
      say('The rules it books by', 'Which sessions clients can book, when each practitioner is free, gaps between sessions and minimum notice.');
      await spot('[data-tour="bookauto"]', 2800);
      await spot('[data-tour="avail"]', 2600);
    } },
    { name: 'Waivers & Forms', run: async function () {
      App.ui.fm = null; App.go('forms'); await sleep(600);
      say('Waivers & Forms', 'Each template knows who has to sign it, and shows how many have.');
      await spot('[data-tour="formlist"]', 2600);
      await click('#fmNewW', { after: 700 });
      say('Write a new waiver in a minute', 'The wording, the questions, and who signs it. The preview shows exactly what the client sees.');
      await type('#fmTitle', 'Retreat liability waiver', 40);
      await type('#fmBody', 'I take part in retreat activities at my own risk and will tell the team about any injury or condition.', 14);
      await click('[data-fadd="yesno"]', { after: 500 });
      var lab = document.querySelectorAll('[data-flabel]');
      if (lab.length) await type(lab[lab.length - 1], 'Do you have any injuries we should know about?', 22);
      await spot('[data-tour="formpreview"]', 3000);
      await click('#fmSave', { after: 1200 });
    } },
    { name: 'Client Report Creator', run: async function () {
      App.ui.sc = null; App.go('scans'); await sleep(600);
      say('Client Report Creator: step 1', 'Pick the client and upload the four scan files: resonance, root cause, symptom support and imbalance. Each has its own slot.');
      await spot('[data-tour="newreport"]', 3000);
      await choose('#scClient', 'c7');
      await click('#scAll', { after: 700 });
      await spot('[data-tour="slots"]', 1600);
      await click('#scExtract', { after: 300 });
      await until(function () { return App.ui.sc.step === 'review'; }, 6000);
      await sleep(400);
      say('Readings and findings, pulled out and ranked', 'Organ dials and remedies in priority order. The practitioner can change anything.');
      await spot('[data-tour="organs"]', 2400);
      await spot('[data-tour="remedies"]', 2600);
      say('Supplier wording is checked', 'Claim language like “eliminate” is flagged so it gets reworded before a client sees it.');
      await click('[data-edit]', { after: 500 });
      await type('[data-desc]', 'Chosen to support a calmer inflammatory pattern.', 22);
      await click('#scBuild', { after: 900 });
      say('A practitioner signs off, then it is published', 'Nothing reaches the client until a practitioner has reviewed it. The report is saved to her documents.');
      await spot('[data-tour="report"] .rr-banner', 2200);
      await click('#scSign', { after: 400 });
      await click('#scPublish', { after: 1400 });
      say('Straight on to the protocol', 'The report feeds the protocol creator, so nothing is copied across by hand.');
      await click('#scProto', { after: 900 });
    } },
    { name: 'Protocol Creator', run: async function () {
      if (App.ui.view !== 'protocols') { App.ui.pc = { client: 'c7', draft: null, mode: 'edit' }; App.go('protocols'); await sleep(600); }
      say('Protocol Creator', 'Suggestions come from Aiko’s report first, then from her goals. The practitioner decides what goes in.');
      await spot('[data-tour="suggestions"]', 3000);
      var adds = document.querySelectorAll('[data-padd]');
      for (var i = 0; i < Math.min(2, adds.length); i++) await click(document.querySelectorAll('[data-padd]')[0], { after: 600 });
      say('What, how much and when', 'Dose, how long, and the times of day. The client gets a daily schedule with reminders.');
      await spot('[data-tour="builder"]', 2400);
      var chip = document.querySelector('[data-tour="builder"] [data-pt="bedtime"]:not(.is-on)');
      if (chip) await click(chip, { after: 600 });
      say('A protocol document they will actually read', 'Day by day, with every remedy explained. It is saved to her documents as a PDF.');
      await spot('[data-tour="protodoc"]', 3200);
      await click('#pcPublish', { after: 1200 });
      say('Publish, then order in one click', 'The remedies go to the Shop as one order, sized for the length of the protocol. A person still approves it.');
      await click('#pcOrder', { after: 1400 });
      await click('#pcBack', { after: 700 });
      say('Every protocol, with its report', 'Any protocol report can be opened, printed or downloaded. It is also on the client’s page under Protocols and Documents.');
      await spot('[data-tour="protolist"]', 2400);
      var act = App.state().protocols.filter(function (p) { return p.client === 'c7' && p.status === 'active'; })[0];
      if (act) { await click('[data-pview="' + act.id + '"]', { after: 900 }); await spot('#pcReport [data-tour="protodoc"]', 2800); }
    } },
    { name: 'The client portal', run: async function () {
      App.ui.ca = null; App.go('client'); App.ui.ca.device = 'desktop'; App.render(); await sleep(500);
      await choose('#caAs', 'c7');
      say('The client portal, on a computer', 'Aiko signs in and sees the four things that matter: Client Reports, Protocols, Appointments and Billing.');
      await spot('[data-tour="ca-nav"]', 2600);
      var sg = document.querySelector('[data-csign]');
      if (sg) {
        say('Forms are signed right here', 'A waiver she still needs to sign comes first. The signed copy goes to her documents.');
        await click(sg, { after: 700 });
        await type('.ca-sheet [data-ffsign]', 'Aiko Tanaka', 50);
        await click('#caSignForm', { after: 900 });
      }
      await click('[data-ctab="reports"]', { after: 700 });
      say('Client Reports', 'Every scan report once a practitioner has signed it off, including the one published a minute ago.');
      var rp = document.querySelector('[data-crep]');
      if (rp) { await click(rp, { after: 900 }); await spot('#caBody [data-tour="report"] .rr-banner', 2200); }
      await click('[data-ctab="protocol"]', { after: 700 });
      say('Protocols', 'Today’s doses to tick off, with reminders, and the full protocol report.');
      await spot('[data-tour="ca-protocol"]', 2800);
      await click('[data-ctab="appts"]', { after: 700 });
      say('Appointments', 'Her sessions with the Zoom link to join, and booking an open time with her practitioner.');
      await spot('[data-tour="ca-appts"]', 2800);
      await click('[data-ctab="billing"]', { after: 700 });
      say('Billing', 'What she has paid, what is due next, receipts and her card on file.');
      await spot('[data-tour="ca-billing"]', 2800);
      await click('[data-cdev="mobile"]', { after: 900 });
      await click('[data-ctab="home"]', { after: 600 });
      say('The same portal on her phone', 'Today’s protocol on the home screen. She ticks things off as she goes.');
      var t = document.querySelector('[data-ctake]');
      if (t) await click(t, { after: 600 });
      await click('#caMsgs', { after: 700 });
      say('A direct line to her practitioner', 'She asks a question. It lands on her page in the Client Portal and on the Checklist.');
      await type('#caMsg', 'Can I take the evening drops with dinner?', 30);
      await click('#caMsgSend', { after: 1200 });
    } },
    { name: 'Free accounts', run: async function () {
      App.ui.ca = null; App.go('client'); App.ui.ca.device = 'mobile'; App.render(); await sleep(600);
      say('Anyone can start free', 'A short questionnaire gives a wellness snapshot, free classes, short courses and session booking.');
      await click('#caStart', { after: 600 });
      await click('[data-cgoal="sleep"]', { after: 250 });
      await click('[data-cgoal="stress"]', { after: 400 });
      await click('#caNext', { after: 500 });
      await click('#caNext', { after: 500 });
      await type('#caName', 'Sofia Martinez', 45);
      await type('#caEmail', 'sofia.martinez@example.com', 25);
      await click('#caConsent', { after: 250 });
      await click('#caFinish', { after: 900 });
      say('A snapshot, not product picks', 'Remedy recommendations are what the Premium Course is for, so free accounts get guidance and classes instead.');
      await spot('[data-tour="ca-snapshot"]', 3400);
      await spot('[data-tour="ca-picked"]', 2400);
      say('The Premium Course: $6,995', 'A personal protocol built with a practitioner, the energetic scan, the course and weekly Zoom.');
      await spot('[data-tour="ca-upsell"]', 2600);
      await click('#caProgram', { after: 700 });
      await sleep(3200);
      await click('#caClose', { after: 400 });
    } },
    { name: 'Shop', run: async function () {
      App.ui.shopTab = 'pipeline'; App.go('shop'); await sleep(600);
      say('Shop: every order waits for a person', 'Aiko’s protocol order is here. Nothing reaches a supplier without approval.');
      await spot('[data-tour="approvals"]', 2800);
      var mine = App.state().orders.filter(function (o) { return o.source === 'Protocol'; }).pop();
      var b = mine && document.querySelector('[data-approve="' + mine.id + '"]:not([disabled])');
      if (b) {
        var id = b.getAttribute('data-approve');
        await click(b, { after: 800 });
        say('Approve, then check out in one go', 'The Physica cart fills in the practitioner’s own logged-in tab. They check out, and tracking follows.');
        await click('[data-confirm="' + id + '"]', { after: 1600 });
      }
      await spot('[data-tour="pipeline"]', 2600, 6);
      await click('[data-shtab="suppliers"]', { after: 700 });
      say('Physica, Biotics and DesBio', 'How orders reach each one and the pricing rules the platform keeps to. Physica prices stay behind login.');
      await spot('[data-tour="supplier"]', 3400);
    } },
    { name: 'The Outcome', run: async function () {
      App.go('outcome'); await sleep(600);
      say('Six tools as the backbone', 'Enough to run the practice day to day, without the admin resting on one person.');
      await spot('[data-tour="purposes"]', 3200);
      say('Time back, job by job', 'About 22 hours a week of admin becomes about 3. Estimates to confirm with the team.');
      await spot('[data-tour="jobs"]', 3600);
      say('The rest, when you want it', 'Newsletters, a video library, a Shopify store and more are already sketched, and switched off for now.');
      await spot('[data-tour="later"]', 3200);
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
      await card('<p class="k">Platform showcase &middot; sample data</p><h2>Evergrove Wellness</h2><p>Six tools that carry the practice: the Client Portal, Shop, Client Report Creator, Protocol Creator, Booking Calendar and Waivers &amp; Forms. Plus a simple app for clients and the $6,995 Premium Course.</p>', 2800);
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
    card('<p class="k">Showcase complete</p><h2>The backbone of the practice</h2>' +
      '<p>Six tools to start with. Everything else is added when the business needs it.</p>' +
      '<ul><li>Client Portal</li><li>Shop with approved drop-shipping</li><li>Client Report Creator</li><li>Protocol Creator &amp; schedules</li><li>Booking Calendar with Zoom</li><li>Waivers &amp; Forms</li><li>Client portal, desktop &amp; mobile</li><li>Client app</li><li>$6,995 Premium Course</li></ul>' +
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
