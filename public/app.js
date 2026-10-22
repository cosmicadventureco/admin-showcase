/* Root Cause Clinic showcase - the console.
 *
 * One page, nine views. Every view reads and writes the same small store, kept
 * in this browser's localStorage, so a booking made on one screen shows up on
 * the calendar, a submitted intake shows up in Clients, and so on. Nothing is
 * sent anywhere: emails and orders are simulated and logged on screen.
 */
(function () {
  'use strict';

  var KEY = 'rootcause-showcase-v20';
  var S = load();
  var ui = {
    view: 'dashboard', recordsTab: 'clients', q: '', schedTab: 'list', shopTab: 'pipeline',
    store: { line: 'all', as: 'c1', cart: {} }, progTab: 'sales', enrollDone: null, progStudent: 'c1', confirming: null,
    calMonth: null, quoteId: 'q1', drawer: null, intakeDone: null, simulating: false, log: []
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 12) return s; }
    } catch (e) { /* storage blocked: fall through to fresh sample data */ }
    return EG.seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* keep in memory */ } }

  /* ---------------------------------------------------------------- helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n, cents) {
    var v = Math.round(Number(n || 0) * 100) / 100;
    if (v < 0) return '\u2212' + money(-v, cents);
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: cents === false ? 0 : 2, maximumFractionDigits: cents === false ? 0 : 2 });
  }
  function d(isoStr) { return new Date(isoStr + 'T12:00:00'); }
  function fmtDate(isoStr, opts) {
    return d(isoStr).toLocaleDateString('en-US', opts || { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtTime(t) {
    var p = t.split(':'), h = +p[0];
    return ((h % 12) || 12) + ':' + p[1] + (h < 12 ? 'am' : 'pm');
  }
  function initials(name) { return name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function client(id) { for (var i = 0; i < S.clients.length; i++) if (S.clients[i].id === id) return S.clients[i]; return null; }
  function service(id) { for (var i = 0; i < EG.SERVICES.length; i++) if (EG.SERVICES[i].id === id) return EG.SERVICES[i]; return EG.SERVICES[0]; }
  function first(name) { return String(name || '').split(' ')[0]; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function today() { return EG.iso(0); }
  /* Everything the system does on its own is written here, for the Work queue. */
  function activity(text) {
    var n = new Date();
    S.activity.unshift({ at: today(), time: String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'), text: text });
    S.activity = S.activity.slice(0, 80);
    save();
  }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function goalPills(goals) {
    return '<span class="pills">' + goals.map(function (g) { return '<span class="pill">' + esc(EG.goalLabel(g)) + '</span>'; }).join('') + '</span>';
  }
  function intakePill(c) {
    if (!c.consent) return '<span class="pill bad">No consent yet</span>';
    if (!c.intake) return '<span class="pill warn">Consent signed, no intake</span>';
    return '<span class="pill ok">Intake complete</span>';
  }
  function orderTotal(o) {
    return o.items.reduce(function (t, it) { return t + EG.product(it[0]).price * it[1]; }, 0) * (1 - (o.discount || 0));
  }
  function orderCost(o) {
    return o.items.reduce(function (t, it) { return t + EG.product(it[0]).cost * it[1]; }, 0);
  }
  function lineTotal(l) { return (Number(l[1]) || 1) * (Number(l[2]) || 0); }
  function pitch(kind, text) {
    /* The build-status banners are switched off: the screens speak for themselves. */
    return '';
  }
  function head(eyebrow, title, lede) {
    return '<p class="eyebrow">' + eyebrow + '</p><h1 class="h1">' + title + '</h1><p class="lede">' + lede + '</p>';
  }

  /* ---------------------------------------------------------------- views */
  var VIEWS = {};

  /* Dashboard ---------------------------------------------------------- */
  VIEWS.dashboard = function () {
    var t = today();
    var week = EG.iso(7);
    var upcoming = S.bookings.filter(function (b) { return b.date >= t && b.date <= week; });
    var todays = S.bookings.filter(function (b) { return b.date === t; }).sort(function (a, b) { return a.time < b.time ? -1 : 1; });
    var active = S.clients.filter(function (c) { return c.plan !== 'newsletter'; }).length;
    var members = S.enrollments.length;
    var rev = S.revenue.reduce(function (a, b) { return a + b; }, 0);
    var last = S.revenue[S.revenue.length - 1], prev = S.revenue[S.revenue.length - 2];

    var todos = [];
    S.bookings.filter(function (b) { return b.date >= t; }).forEach(function (b) {
      b.guests.forEach(function (g) {
        var c = client(g);
        if (c && (!c.consent || !c.intake)) {
          todos.push({ kind: c.consent ? 'warn' : 'bad', text: '<b>' + esc(c.name) + '</b> ' + (c.consent ? 'has not finished the intake questionnaire' : 'has not signed consent') + ' for ' + esc(service(b.service).label) + ' on ' + fmtDate(b.date), go: 'schedule' });
        }
      });
    });
    var seen = {};
    todos = todos.filter(function (x) { if (seen[x.text.split('</b>')[0]]) return false; seen[x.text.split('</b>')[0]] = 1; return true; }).slice(0, 4);
    S.clients.forEach(function (c) {
      var r = EG.recommend(c);
      if (r.needsReview && r.flags.length) todos.push({ kind: 'warn', text: '<b>' + esc(c.name) + '</b> needs practitioner review before their plan ships (' + r.flags.map(function (f) { return { bloodthinner: 'blood thinner', pregnant: 'pregnancy', thyroid: 'thyroid' }[f]; }).join(', ') + ')', go: 'clients' });
    });
    S.agreements.forEach(function (a) {
      if (a.status !== 'Signed') todos.push({ kind: 'warn', text: '<b>' + esc(a.client) + '</b> has ' + a.status.toLowerCase() + ' the ' + esc(a.title) + ' quote but not signed', go: 'agreements' });
    });
    var waiting = S.orders.filter(function (o) { return o.stage === 0 && !o.held && !o.batched; }).length;
    if (waiting) todos.unshift({ kind: 'bad', text: '<b>' + waiting + ' order' + (waiting > 1 ? 's' : '') + ' waiting for your approval.</b> Nothing goes to a supplier until someone approves it.', go: 'queue' });

    return head('Good morning, ' + first(EG.BRAND.owner), 'Today at Root Cause',
      'Everything that needs you, in one place: consultations, intake paperwork, orders on their way and quotes waiting on a signature.') +
      '<div class="grid g4" data-tour="stats">' +
      stat(active, 'Coaching clients', '+3 this month') +
      stat(upcoming.length, 'Sessions in the next 7 days', '') +
      stat(money(rev, false), 'Revenue, last 8 weeks', '+' + Math.round((last - prev) / prev * 100) + '% vs last week') +
      stat(members, 'In the Premium Course', money(members * EG.PROGRAM.price, false) + ' enrolled') +
      '</div>' +
      '<div class="split" style="margin-top:1rem">' +
      '<div class="card" data-tour="todo"><h3 class="h3">Needs attention</h3><div>' +
      todos.map(function (x) { return '<div class="todo"><span class="dotmark ' + x.kind + '"></span><span class="grow">' + x.text + '</span><button class="btn ghost small" data-go="' + x.go + '"' + (x.tab ? ' data-tab="' + x.tab + '"' : '') + '>Open</button></div>'; }).join('') +
      '</div></div>' +
      '<div class="card chart"><h3 class="h3">Weekly revenue</h3><p class="small muted" style="margin:0 0 .6rem">Coaching, products and workshops combined</p>' + revenueChart() + '</div>' +
      '</div>' +
      '<h2 class="h2">Today</h2><div class="card"><div class="list">' +
      (todays.length ? todays.map(function (b) {
        var sv = service(b.service);
        return '<div class="li"><span class="pill honey num">' + fmtTime(b.time) + '</span><div class="grow"><div class="title">' + esc(b.name || sv.label) + (b.with ? ' with ' + esc(b.with) : '') + '</div><div class="meta">' +
          esc(b.guests.map(function (g) { return client(g).name; }).join(', ')) + ' &middot; ' + esc(b.where) + '</div></div>' +
          '<button class="btn ghost small" data-go="schedule">Roster</button></div>';
      }).join('') : '<p class="muted" style="margin:0">Nothing booked today.</p>') +
      '</div></div>';
  };
  function stat(v, label, delta) {
    return '<div class="card stat"><b>' + v + '</b><span>' + label + '</span>' + (delta ? '<i>' + delta + '</i>' : '<i>&nbsp;</i>') + '</div>';
  }
  function revenueChart() {
    var data = S.revenue, W = 460, H = 190, pl = 40, pb = 24, pt = 10, max = 6000;
    var bw = (W - pl - 10) / data.length;
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Weekly revenue, last 8 weeks">';
    [0, 2000, 4000, 6000].forEach(function (v) {
      out += '<line x1="' + pl + '" x2="' + (W - 6) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-width="1"/>' +
        '<text x="' + (pl - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">$' + (v / 1000) + 'k</text>';
    });
    data.forEach(function (v, i) {
      var x = pl + i * bw + bw * 0.18, w = bw * 0.64, isLast = i === data.length - 1;
      out += '<rect x="' + x + '" y="' + y(v) + '" width="' + w + '" height="' + (y(0) - y(v)) + '" rx="3" fill="' + (isLast ? 'var(--honey)' : 'var(--sage)') + '" opacity="' + (isLast ? 1 : .55) + '"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + (isLast ? 'This wk' : 'W' + (i + 1)) + '</text>';
      if (isLast) out += '<text x="' + (x + w / 2) + '" y="' + (y(v) - 5) + '" text-anchor="middle" style="fill:var(--ink);font-weight:600">' + money(v, false) + '</text>';
    });
    return out + '</svg>';
  }

  /* Messages (crossover of "Send an email") ------------------------------ */
  var KINDS = [
    { id: 'intake', label: 'Intake link: consent + wellness questionnaire' },
    { id: 'reminder', label: 'Intake reminder' },
    { id: 'plan', label: 'Personalised plan + product picks' },
    { id: 'refill', label: 'Refill reminder' },
    { id: 'review', label: 'Review request after a session' }
  ];
  function template(kind, name, svc, date) {
    var n = first(name) || 'there';
    var when = date ? ' on ' + fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
    var sv = service(svc).label;
    switch (kind) {
      case 'reminder': return { subject: 'A quick reminder before your ' + sv, body: 'Hi ' + n + ',\n\nWe are looking forward to your ' + sv + when + '. Your intake questionnaire is still open. It takes about four minutes and lets Maya prepare a plan before you arrive.\n\n[Finish my intake]\n\nWarmly,\nThe Root Cause team' };
      case 'plan': return { subject: 'Your personalised wellness plan', body: 'Hi ' + n + ',\n\nThank you for sharing your goals with us. Based on your intake, here is the plan Maya put together, with the three products and videos we think will help most.\n\n[See my plan]\n\nTurn on auto-ship and your refills arrive every 30 days, before you run out. Each one adds credit toward a session or short course.\n\nWarmly,\nMaya' };
      case 'refill': return { subject: 'Running low? Your refill ships in 5 days', body: 'Hi ' + n + ',\n\nYour next auto-ship leaves our partner warehouse in 5 days. Need to skip, swap or pause? One tap below.\n\n[Manage my refill]\n\nThe Root Cause team' };
      case 'review': return { subject: 'How did your session feel?', body: 'Hi ' + n + ',\n\nThank you for joining us for ' + sv + '. If it helped, a short review means a lot to a small studio like ours.\n\n[Leave a review]\n\nWith gratitude,\nMaya' };
      default: return { subject: 'Before your ' + sv + ' with Maya', body: 'Hi ' + n + ',\n\nWe are so glad you booked your ' + sv + when + '. Before we meet, please complete two quick steps:\n\n1. Sign the wellness consent\n2. Tell us about your goals (about 4 minutes)\n\n[Start my intake]\n\nYour answers shape the personalised supplement and video plan you will receive afterwards.\n\nWarmly,\nMaya Brooks\nRoot Cause Clinic' };
    }
  }
  VIEWS.messages = function () {
    var t = template('intake', '', 'initial', '');
    return head('Client messaging', 'Send a message',
      'Pick what to send and who it is for. The wording fills itself in from the template and the booking, and you can change anything before it goes.') +
      pitch('proven', 'This is the same composer the current app uses every day to send waivers, questionnaires, reminders and review requests. Here it is retemplated for consultations, plans and refills.') +
      '<div class="split">' +
      '<div class="card"><div class="fields">' +
      '<div class="wide"><label for="mKind">What to send</label><select id="mKind">' + KINDS.map(function (k) { return '<option value="' + k.id + '">' + esc(k.label) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="mTo">To</label><input id="mTo" type="text" list="mList" placeholder="Start typing a client"><datalist id="mList">' + S.clients.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('') + '</datalist></div>' +
      '<div><label for="mSvc">Service</label><select id="mSvc">' + EG.SERVICES.map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="mDate">Date</label><input id="mDate" type="date" value="' + EG.iso(3) + '"></div>' +
      '<div><label for="mWho">Address</label><input id="mWho" type="email" placeholder="filled in for you" readonly></div>' +
      '<div class="wide"><label for="mSubject">Subject</label><input id="mSubject" type="text" value="' + esc(t.subject) + '"></div>' +
      '<div class="wide"><label for="mBody">Message</label><textarea id="mBody" rows="12">' + esc(t.body) + '</textarea></div>' +
      '</div><div class="row" style="margin-top:1rem"><button class="btn" id="mSend">Send it</button><button class="btn ghost" id="mSelf">Send to myself</button><span class="small muted">Showcase: nothing leaves this browser.</span></div></div>' +
      '<div><p class="label">Preview</p><div id="mPreview"></div></div>' +
      '</div>' +
      '<h2 class="h2">Recently sent</h2><div class="card"><div class="list" id="mSent">' + sentList(6) + '</div></div>';
  };
  function sentList(n) {
    return S.emails.slice(0, n).map(function (e) {
      var c = client(e.to);
      return '<div class="li"><div class="av">' + initials(c ? c.name : '?') + '</div><div class="grow"><div class="title">' + esc(e.subject) + '</div><div class="meta">' + esc(c ? c.name : e.to) + ' &middot; ' + fmtDate(e.at) + '</div></div><span class="pill">' + esc(e.kind) + '</span><span class="pill ok">Delivered</span></div>';
    }).join('');
  }
  function mailPreview(from, to, subject, body) {
    var html = esc(body).replace(/\[([^\]]+)\]/g, '<a class="cta" href="#intake">$1</a>').replace(/\n/g, '<br>');
    return '<div class="mail"><div class="hd"><span><b>From</b> Maya at Root Cause &lt;' + esc(from) + '&gt;</span><span><b>To</b> ' + esc(to || 'client@example.com') + '</span><span><b>Subject</b> ' + esc(subject) + '</span></div>' +
      '<div class="bd"><h3>Root Cause Clinic</h3>' + html + '</div></div>';
  }
  function bindMessages() {
    var kind = $('#mKind'), to = $('#mTo'), svc = $('#mSvc'), date = $('#mDate'), who = $('#mWho'), subj = $('#mSubject'), body = $('#mBody');
    function who_() { for (var i = 0; i < S.clients.length; i++) if (S.clients[i].name.toLowerCase() === to.value.trim().toLowerCase()) return S.clients[i]; return null; }
    function refill() {
      var c = who_();
      var t = template(kind.value, c ? c.name : to.value, svc.value, date.value);
      subj.value = t.subject; body.value = t.body; who.value = c ? c.email : '';
      paint();
    }
    function paint() { $('#mPreview').innerHTML = mailPreview(EG.BRAND.email, who.value || to.value, subj.value, body.value); }
    [kind, svc, date].forEach(function (el) { el.addEventListener('change', refill); });
    to.addEventListener('input', function () { if (who_()) refill(); else paint(); });
    subj.addEventListener('input', paint); body.addEventListener('input', paint);
    $('#mSend').addEventListener('click', function () {
      var c = who_();
      if (!c) { toast('Choose a client from the list first.'); to.focus(); return; }
      S.emails.unshift({ at: today(), to: c.id, kind: KINDS.filter(function (k) { return k.id === kind.value; })[0].label.split(':')[0], subject: subj.value });
      save(); $('#mSent').innerHTML = sentList(6);
      toast('Sent to ' + c.name + ' (simulated)');
    });
    $('#mSelf').addEventListener('click', function () { toast('Preview sent to ' + EG.BRAND.email + ' (simulated)'); });
    paint();
  }

  /* Guest intake form --------------------------------------------------- */
  VIEWS.intake = function () {
    if (ui.intakeDone) return intakeResult(ui.intakeDone);
    return head('What your client sees', 'Wellness intake',
      'Consent, health screening and goals in one short form that works on a phone, even offline. The moment it is submitted, the client gets a personalised plan.') +
      pitch('proven', 'The current app runs this flow for every guest: signed consent with a drawn signature, a tailored questionnaire, a PDF copy, and offline saving for weak signal. The personalised plan at the end is the new part.') +
      '<div class="guestframe"><div class="guestbar"><span>Guest link</span><code>rootcause.example/intake?consult=initial</code><span class="pill ok">Works offline</span></div>' +
      '<form class="guest" id="iForm" novalidate>' +
      '<p class="eyebrow">Before your consultation</p><h2 class="h1">Let&rsquo;s get to know you</h2><p class="muted" style="margin:0 0 1.2rem">About four minutes. Your answers are private and only seen by your practitioner.</p>' +
      '<div class="steps" id="iSteps"><span class="is-on"></span><span></span><span></span><span></span></div>' +
      '<section class="block"><h3 class="h3">About you</h3><div class="fields">' +
      '<div><label for="iName">Full name</label><input id="iName" type="text" autocomplete="off"></div>' +
      '<div><label for="iEmail">Email</label><input id="iEmail" type="email" autocomplete="off"></div>' +
      '<div><label for="iPhone">Phone</label><input id="iPhone" type="tel" autocomplete="off"></div>' +
      '<div><label for="iDob">Date of birth</label><input id="iDob" type="text" placeholder="MM/DD/YYYY" autocomplete="off"></div>' +
      '</div></section>' +
      '<section class="block"><h3 class="h3">What would you like help with?</h3><p class="small muted" style="margin:-.2rem 0 .7rem">Choose up to three.</p><div class="chips" id="iGoals">' +
      EG.GOALS.map(function (g) { return '<button type="button" class="chip" data-goal="' + g.id + '">' + esc(g.label) + '</button>'; }).join('') + '</div></section>' +
      '<section class="block"><h3 class="h3">Lifestyle</h3><div class="fields">' +
      '<div><label for="iDiet">How do you eat?</label><select id="iDiet"><option value="omnivore">Everything</option><option value="pescatarian">Pescatarian</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option></select></div>' +
      '<div><label for="iSleep">Hours of sleep, most nights</label><select id="iSleep"><option>Under 5</option><option>5-6</option><option selected>6-7</option><option>7-8</option><option>8+</option></select></div>' +
      '<div class="wide"><label>Allergies</label><div class="chips" id="iAllergy">' + ['fish', 'shellfish', 'soy', 'gluten', 'dairy'].map(function (a) { return '<button type="button" class="chip" data-allergy="' + a + '">' + a[0].toUpperCase() + a.slice(1) + '</button>'; }).join('') + '</div></div>' +
      '</div></section>' +
      '<section class="block"><h3 class="h3">Health screening</h3><div class="grid" style="gap:.55rem">' +
      '<label class="check"><input type="checkbox" id="iPreg"> I am pregnant, breastfeeding or trying to conceive</label>' +
      '<label class="check"><input type="checkbox" id="iBlood"> I take a blood thinner (for example warfarin)</label>' +
      '<label class="check"><input type="checkbox" id="iThy"> I have a thyroid condition or take thyroid medication</label>' +
      '</div></section>' +
      '<section class="block"><h3 class="h3">Consent</h3><div class="consent">Root Cause Clinic provides education, coaching and dietary supplements. Our guidance does not replace care from your physician. You agree to tell your practitioner about medications and conditions, and to stop any supplement and contact your doctor if you notice an adverse reaction. Your information is stored securely and never sold. You may request a copy or deletion at any time. Sessions cancelled with less than 24 hours notice may be charged at 50%.</div>' +
      '<label class="check" style="margin-bottom:.8rem"><input type="checkbox" id="iAgree"> I have read and agree to the wellness consent</label>' +
      '<div class="row" style="justify-content:space-between"><span class="label" style="margin:0">Sign here</span><button type="button" class="linkish" id="iClear">Clear</button></div>' +
      '<canvas class="sig" id="iSig"></canvas>' +
      '</section>' +
      '<p class="small" id="iErr" style="color:var(--bad);min-height:1.2em"></p>' +
      '<button class="btn" id="iSubmit" type="submit" style="width:100%;padding:.9rem">Submit and see my plan</button>' +
      '</form></div>';
  };
  function bindIntake() {
    if (ui.intakeDone) {
      $$('[data-open-client]').forEach(function (b) { b.addEventListener('click', function () { openClient(b.getAttribute('data-open-client')); }); });
      var again = $('#iAgain'); if (again) again.addEventListener('click', function () { ui.intakeDone = null; render(); });
      return;
    }
    var goals = [], allergies = [], signed = false;
    $$('#iGoals .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-goal'), i = goals.indexOf(g);
        if (i >= 0) goals.splice(i, 1); else if (goals.length < 3) goals.push(g); else { toast('Choose up to three goals.'); return; }
        b.classList.toggle('is-on', goals.indexOf(g) >= 0); progress();
      });
    });
    $$('#iAllergy .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-allergy'), i = allergies.indexOf(a);
        if (i >= 0) allergies.splice(i, 1); else allergies.push(a);
        b.classList.toggle('is-on', i < 0);
      });
    });
    function progress() {
      var n = 0;
      if ($('#iName').value && $('#iEmail').value) n++;
      if (goals.length) n++;
      if ($('#iAgree').checked) n++;
      if (signed) n++;
      $$('#iSteps span').forEach(function (s, i) { s.classList.toggle('is-on', i <= Math.max(0, n - 1) || (i === 0)); });
    }
    ['#iName', '#iEmail'].forEach(function (s) { $(s).addEventListener('input', progress); });
    $('#iAgree').addEventListener('change', progress);

    var cv = $('#iSig'), ctx = setupCanvas(cv);
    var drawing = false;
    function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) { drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); signed = true; });
    cv.addEventListener('pointerup', function () { drawing = false; progress(); });
    cv.addEventListener('sig', function () { signed = true; progress(); });
    $('#iClear').addEventListener('click', function () { ctx.clearRect(0, 0, cv.width, cv.height); signed = false; progress(); });

    $('#iForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#iErr');
      var name = $('#iName').value.trim(), email = $('#iEmail').value.trim();
      if (!name || !email) { err.textContent = 'Please add your name and email so we can send your plan.'; return; }
      if (!goals.length) { err.textContent = 'Choose at least one goal.'; return; }
      if (!$('#iAgree').checked || !signed) { err.textContent = 'Please tick the consent box and sign.'; return; }
      err.textContent = '';
      var c = {
        id: 'c' + (S.nextClient++), name: name, email: email, phone: $('#iPhone').value.trim(), goals: goals.slice(),
        diet: $('#iDiet').value, plan: 'newsletter', joined: today(), ltv: 0, autoship: false, allergies: allergies.slice(),
        pregnant: $('#iPreg').checked, bloodthinner: $('#iBlood').checked, thyroid: $('#iThy').checked,
        consent: true, intake: true, videos: {}, notes: [], fresh: true
      };
      var r = EG.recommend(c);
      c.plan_items = r.picks.map(function (x) { return x.product.sku; });
      r.videos.forEach(function (v) { c.videos[v.id] = 0; });
      S.clients.unshift(c);
      S.emails.unshift({ at: today(), to: c.id, kind: 'Recommendations', subject: 'Your personalised wellness plan' });
      save();
      ui.intakeDone = c.id;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  function setupCanvas(cv) {
    var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#233027';
    return ctx;
  }
  function planHtml(c, r) {
    return '<div class="plan" data-tour="picks">' + r.picks.map(function (x) {
      var p = x.product;
      return '<div class="pick">' + bottle(p) + '<div class="grow"><div class="title">' + esc(p.name) + ' <span class="muted small">' + esc(EG.LINES[p.line].label) + ' &middot; ' + esc(p.dose) + '</span></div><div class="why">' + esc(x.why.join(' · ')) + (p.supplier === 'physica' ? ' · Physica Energetics' : '') + '</div>' +
        (x.review ? '<span class="pill warn" style="margin-top:.3rem">Practitioner reviews first</span>' : '') + '</div><span class="price">' + money(p.price) + '</span></div>';
    }).join('') + '</div>';
  }
  function bottle(p, small) {
    return '<div class="bottle' + (p.line !== 'nutri' ? ' tincture' : '') + '" style="--h:' + p.hue + (small ? ';width:1.4rem;height:1.9rem' : '') + '"></div>';
  }
  function intakeResult(id) {
    var c = client(id), r = EG.recommend(c);
    return '<div class="guestframe"><div class="guestbar"><span>Guest view</span><code>rootcause.example/plan/' + esc(c.id) + '</code></div>' +
      '<div class="guest" data-tour="result"><div class="result-hero"><div class="check-badge"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg></div>' +
      '<div><p class="eyebrow" style="margin:0">All set, ' + esc(first(c.name)) + '</p><h2 class="h1" style="margin:0">Your personalised plan</h2></div></div>' +
      '<p class="muted">Built from your goals: ' + c.goals.map(function (g) { return esc(EG.goalLabel(g).toLowerCase()); }).join(', ') + '. ' + (r.needsReview ? 'Because of your health screening, Maya will review these picks before anything ships.' : 'Everything below is safe to start today.') + '</p>' +
      '<h3 class="h2" style="margin-top:1.2rem">Supplements</h3>' + planHtml(c, r) +
      '<div class="row" style="justify-content:space-between;margin:1rem 0 0;padding:.9rem 1rem;background:var(--ok-soft);border-radius:10px"><span><b>Auto-ship: never run out</b><br><span class="small muted">Refills every 30 days, skip or pause any time. Each refill adds $' + (window.EGAuto ? EGAuto.setting('refills', 'credit') : 5) + ' credit toward a session or short course.</span></span><span class="price num">' + money(r.monthly) + ' a refill</span></div>' +
      '<h3 class="h2">Videos picked for you</h3><div class="grid g3">' + r.videos.map(function (v) {
        return '<div class="vcard"><div class="thumb" style="--h:' + v.hue + '"><span class="play"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#233027"/></svg></span><span class="dur">' + v.mins + ':00</span></div><span class="title">' + esc(v.title) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="upsell"><div><p class="eyebrow" style="margin:0">Want the full picture?</p><b>' + EG.PROGRAM.name + ': ' + EG.PROGRAM.sub + '</b><br><span class="small muted">Energetics assessment, testing, a course built around you and weekly live Zoom. ' + money(EG.PROGRAM.price, false) + '</span></div><button type="button" class="btn honey small" data-go="program">See the program</button></div>' +
      '<h3 class="h2">Recommended next step</h3><div class="pick"><div class="grow"><div class="title">' + esc(r.service.label) + '</div><div class="why">' + r.service.mins + ' minutes with Maya &middot; ' + (r.service.price ? money(r.service.price, false) : 'included') + '</div></div><button type="button" class="btn small">Book a time</button></div>' +
      '</div></div>' +
      '<h2 class="h2">Behind the scenes, automatically</h2><div class="card" data-tour="behind"><div class="list">' +
      [['ok', 'Client record created and added to Clients'], ['ok', 'Signed consent saved as a PDF with time, IP and signature'], ['ok', 'Plan email queued: "Your personalised wellness plan"'],
        ['ok', 'Added to newsletter segments: ' + c.goals.map(EG.goalLabel).join(', ')], [r.needsReview ? 'warn' : 'ok', r.needsReview ? 'Practitioner alert raised: review before shipping' : 'No screening flags, plan approved automatically']]
        .map(function (x) { return '<div class="todo"><span class="dotmark ' + x[0] + '"></span><span class="grow">' + esc(x[1]) + '</span></div>'; }).join('') +
      '</div><div class="row" style="margin-top:1rem"><button class="btn" data-open-client="' + c.id + '" id="iOpen">Open client record</button><button class="btn ghost" id="iAgain">Start another intake</button></div></div>';
  }

  /* Clients (crossover of Records) -------------------------------------- */
  VIEWS.clients = function () {
    return head('Records', 'Clients',
      'Every client with their goals, paperwork, plan, orders and video progress. Search by name, email or goal.') +
      pitch('proven', 'Today this is the Records page: every signed waiver, questionnaire and sent email, searchable on a phone. Here each record also carries the plan, orders and videos.') +
      '<div class="row" style="margin-bottom:1rem"><div class="tabs" style="margin:0">' +
      [['clients', 'Clients'], ['consents', 'Consents & intakes'], ['emails', 'Sent emails']].map(function (t) { return '<button class="tab' + (ui.recordsTab === t[0] ? ' is-on' : '') + '" data-rtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') +
      '</div><input type="search" id="rQ" placeholder="Search clients" style="flex:1;min-width:10rem" value="' + esc(ui.q) + '"></div>' +
      '<div class="card" id="rBody">' + recordsBody() + '</div>';
  };
  function recordsBody() {
    var q = ui.q.trim().toLowerCase();
    var list = S.clients.filter(function (c) {
      if (!q) return true;
      return (c.name + ' ' + c.email + ' ' + c.goals.map(EG.goalLabel).join(' ') + ' ' + EG.PLANS[c.plan]).toLowerCase().indexOf(q) >= 0;
    });
    if (ui.recordsTab === 'emails') {
      return '<div class="list">' + sentList(50) + '</div>';
    }
    if (ui.recordsTab === 'consents') {
      return '<div class="tablewrap"><table><thead><tr><th>Client</th><th>Consent</th><th>Intake</th><th>Screening</th><th>Signed</th></tr></thead><tbody>' +
        list.map(function (c) {
          var r = EG.recommend(c);
          return '<tr class="clickable" data-client="' + c.id + '"><td><b>' + esc(c.name) + '</b></td><td>' + (c.consent ? '<span class="pill ok">Signed PDF</span>' : '<span class="pill bad">Missing</span>') + '</td><td>' + (c.intake ? '<span class="pill ok">Complete</span>' : '<span class="pill warn">Not started</span>') + '</td><td>' + (r.flags.length ? '<span class="pill warn">Review</span>' : '<span class="pill">Clear</span>') + '</td><td class="num">' + (c.consent ? fmtDate(c.joined) : '&mdash;') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return '<div class="tablewrap"><table><thead><tr><th>Client</th><th>Plan</th><th>Goals</th><th>Paperwork</th><th class="r">Lifetime value</th></tr></thead><tbody>' +
      (list.length ? list.map(function (c) {
        return '<tr class="clickable" data-client="' + c.id + '"><td><div class="row" style="flex-wrap:nowrap"><span class="av">' + initials(c.name) + '</span><span><b>' + esc(c.name) + '</b>' + (c.fresh ? ' <span class="pill honey">New</span>' : '') + '<br><span class="small muted">' + esc(c.email) + '</span></span></div></td><td>' + esc(EG.PLANS[c.plan]) + (c.autoship ? '<br><span class="small muted">Auto-ship on</span>' : '') + '</td><td>' + goalPills(c.goals) + '</td><td>' + intakePill(c) + '</td><td class="r">' + money(c.ltv, false) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">No client matches &ldquo;' + esc(ui.q) + '&rdquo;.</td></tr>') + '</tbody></table></div>';
  }
  function bindClients() {
    $$('[data-rtab]').forEach(function (b) { b.addEventListener('click', function () { ui.recordsTab = b.getAttribute('data-rtab'); render(); }); });
    var q = $('#rQ');
    q.addEventListener('input', function () { ui.q = q.value; $('#rBody').innerHTML = recordsBody(); bindRows(); });
    bindRows();
  }
  function bindRows() { $$('[data-client]').forEach(function (r) { r.addEventListener('click', function () { openClient(r.getAttribute('data-client')); }); }); }

  function openClient(id) { if (window.EGPortal) EGPortal.open(id, 'info'); }
  function renderDrawer() {
    var root = $('#drawerRoot');
    if (!ui.drawer) { root.innerHTML = ''; return; }
    var c = client(ui.drawer); if (!c) { ui.drawer = null; root.innerHTML = ''; return; }
    var r = EG.recommend(c);
    var orders = S.orders.filter(function (o) { return o.client === c.id; });
    var books = S.bookings.filter(function (b) { return b.guests.indexOf(c.id) >= 0; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    root.innerHTML = '<div class="drawer-bg" id="dBg"></div><aside class="drawer" role="dialog" aria-label="Client record" data-tour="drawer">' +
      '<div class="row" style="justify-content:space-between;margin-bottom:1rem"><span class="eyebrow" style="margin:0">Client record</span><button class="btn ghost small" id="dClose">Close</button></div>' +
      '<div class="row" style="flex-wrap:nowrap;margin-bottom:1rem"><span class="av" style="width:3rem;height:3rem;font-size:.9rem">' + initials(c.name) + '</span><div><h2 class="h1" style="font-size:1.6rem;margin:0">' + esc(c.name) + '</h2><span class="small muted">' + esc(c.email) + ' &middot; ' + esc(c.phone || 'no phone') + '</span></div></div>' +
      '<div class="pills" style="margin-bottom:1rem"><span class="pill honey">' + esc(EG.PLANS[c.plan]) + '</span>' + (c.member ? '<span class="pill ok">20% member pricing</span>' : '') + intakePill(c) + (c.autoship ? '<span class="pill ok">Auto-ship</span>' : '') + '<span class="pill">' + esc(c.diet) + '</span>' + c.allergies.map(function (a) { return '<span class="pill bad">Allergy: ' + esc(a) + '</span>'; }).join('') + '</div>' +
      '<div class="card" style="margin-bottom:1rem"><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">Personalised plan</h3>' + (r.needsReview ? '<span class="pill warn">Needs review</span>' : '<span class="pill ok">Approved</span>') + '</div><p class="small muted">Goals: ' + c.goals.map(EG.goalLabel).join(', ') + '</p>' + planHtml(c, r) +
      '<div class="row" style="margin-top:.8rem"><button class="btn small" id="dSend">Email this plan</button><button class="btn ghost small" id="dShip">' + (c.autoship ? 'Ship refill now' : 'Start auto-ship') + '</button></div></div>' +
      '<div class="card" style="margin-bottom:1rem"><h3 class="h3">Videos</h3>' + Object.keys(c.videos).map(function (vid) {
        var v = EG.video(vid); var pct = c.videos[vid];
        return '<div style="margin-bottom:.6rem"><div class="row" style="justify-content:space-between"><span class="small">' + esc(v.title) + '</span><span class="small muted num">' + pct + '%</span></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
      }).join('') + '</div>' +
      '<div class="card" style="margin-bottom:1rem"><h3 class="h3">Sessions</h3><div class="list">' + (books.length ? books.map(function (b) { return '<div class="li"><div class="grow"><div class="title">' + esc(b.name || service(b.service).label) + '</div><div class="meta">' + fmtDate(b.date) + ' at ' + fmtTime(b.time) + '</div></div><span class="pill' + (b.date >= today() ? ' honey">Upcoming' : '">Done') + '</span></div>'; }).join('') : '<p class="small muted" style="margin:0">No sessions yet.</p>') + '</div></div>' +
      '<div class="card" style="margin-bottom:1rem"><h3 class="h3">Orders</h3><div class="list">' + (orders.length ? orders.map(function (o) { return '<div class="li"><div class="grow"><div class="title">' + o.id + '</div><div class="meta">' + fmtDate(o.at) + ' &middot; ' + o.items.length + ' item' + (o.items.length > 1 ? 's' : '') + '</div></div><span class="pill' + (o.stage === 0 ? ' warn' : '') + '">' + EG.STAGES[o.stage] + '</span><span class="price">' + money(orderTotal(o)) + '</span></div>'; }).join('') : '<p class="small muted" style="margin:0">No orders yet.</p>') + '</div></div>' +
      '<div class="card"><h3 class="h3">Practitioner notes</h3>' + c.notes.map(function (n) { return '<p class="small" style="margin:0 0 .6rem"><span class="muted">' + fmtDate(n.at) + '</span><br>' + esc(n.text) + '</p>'; }).join('') +
      '<div class="row"><input type="text" id="dNote" placeholder="Add a private note" style="flex:1;min-width:8rem"><button class="btn small" id="dAdd">Save</button></div></div>' +
      '</aside>';
    $('#dBg').addEventListener('click', closeDrawer);
    $('#dClose').addEventListener('click', closeDrawer);
    $('#dSend').addEventListener('click', function () {
      S.emails.unshift({ at: today(), to: c.id, kind: 'Recommendations', subject: 'Your personalised wellness plan' }); save();
      toast('Plan emailed to ' + c.name + ' (simulated)');
    });
    $('#dShip').addEventListener('click', function () {
      if (!c.autoship) { c.autoship = true; save(); renderDrawer(); toast('Auto-ship started: every 30 days'); return; }
      placeOrder(c); toast('Refill order created. It is waiting for approval in Shop.');
    });
    $('#dAdd').addEventListener('click', function () {
      var v = $('#dNote').value.trim(); if (!v) return;
      c.notes.unshift({ at: today(), text: v }); save(); renderDrawer();
    });
  }
  function closeDrawer() { ui.drawer = null; renderDrawer(); }

  /* Schedule (crossover of Upcoming Events + Calendar) ------------------- */
  VIEWS.schedule = function () {
    return head('Upcoming', 'Schedule',
      'Every consultation and workshop with who is coming and whether their paperwork is done. Chase anyone missing in one tap.') +
      pitch('proven', 'Upcoming Events and the Calendar are the pages the current team leaves open all day, with group rosters, missing-paperwork alerts and offline reading.') +
      '<div class="row" style="margin-bottom:1rem;justify-content:space-between"><div class="tabs" style="margin:0"><button class="tab' + (ui.schedTab === 'list' ? ' is-on' : '') + '" data-stab="list">Upcoming</button><button class="tab' + (ui.schedTab === 'cal' ? ' is-on' : '') + '" data-stab="cal" id="sCalTab">Calendar</button></div>' +
      '<button class="btn ghost small" id="sNewBtn">+ New booking</button></div>' +
      '<div class="card" id="sNew" hidden style="margin-bottom:1rem"><div class="fields">' +
      '<div><label for="nSvc">Service</label><select id="nSvc">' + EG.SERVICES.map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="nClient">Client</label><select id="nClient">' + S.clients.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="nDate">Date</label><input id="nDate" type="date" value="' + EG.iso(5) + '"></div>' +
      '<div><label for="nTime">Time</label><select id="nTime">' + ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00'].map(function (t) { return '<option value="' + t + '">' + fmtTime(t) + '</option>'; }).join('') + '</select></div>' +
      '</div><label class="check" style="margin-top:.9rem"><input type="checkbox" id="nSendIntake" checked> Email the intake link now</label><div class="row" style="margin-top:.8rem"><button class="btn" id="nAdd">Create booking</button></div></div>' +
      (ui.schedTab === 'cal' ? calendar() : bookingList());
  };
  function bookingList() {
    var t = today();
    var list = S.bookings.filter(function (b) { return b.date >= t; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
    return '<div class="grid" style="gap:.8rem" data-tour="bookings">' + list.map(function (b) {
      var sv = service(b.service), dt = d(b.date);
      var missing = b.guests.filter(function (g) { var c = client(g); return c && !(c.consent && c.intake); }).length;
      return '<div class="card booking" data-booking="' + b.id + '"><div class="when"><span>' + dt.toLocaleDateString('en-US', { month: 'short' }) + '</span><b>' + dt.getDate() + '</b><span>' + dt.toLocaleDateString('en-US', { weekday: 'short' }) + '</span></div>' +
        '<div style="min-width:0"><div class="row" style="justify-content:space-between"><div><div class="h3" style="margin:0">' + esc(b.name || sv.label) + (b.with ? ' with ' + esc(b.with) : '') + '</div><div class="small muted">' + fmtTime(b.time) + ' &middot; ' + sv.mins + ' min &middot; ' + esc(b.where) + '</div></div>' +
        (missing ? '<span class="pill warn">' + missing + ' missing paperwork</span>' : '<span class="pill ok">All paperwork in</span>') + '</div>' +
        '<div class="roster">' + b.guests.map(function (g) {
          var c = client(g); if (!c) return '';
          var done = c.consent && c.intake;
          return '<div class="p"><span class="av" style="width:1.7rem;height:1.7rem;font-size:.62rem">' + initials(c.name) + '</span><span class="grow">' + esc(c.name) + '</span>' + intakePill(c) +
            (done ? '' : '<button class="btn ghost small" data-remind="' + c.id + '" data-bk="' + b.id + '">Send reminder</button>') + '</div>';
        }).join('') + '</div></div></div>';
    }).join('') + '</div>';
  }
  function calendar() {
    var base = ui.calMonth || today().slice(0, 7);
    var y = +base.slice(0, 4), m = +base.slice(5, 7) - 1;
    var firstDay = new Date(y, m, 1), start = new Date(y, m, 1 - firstDay.getDay());
    var label = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    var out = '<div class="row" style="margin-bottom:.8rem"><button class="btn ghost small" data-cal="-1">&larr;</button><h3 class="h3" style="margin:0;min-width:10rem;text-align:center">' + label + '</h3><button class="btn ghost small" data-cal="1">&rarr;</button></div><div class="cal" data-tour="calendar">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (w) { out += '<div class="dow">' + w + '</div>'; });
    for (var i = 0; i < 42; i++) {
      var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var key = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
      var evs = S.bookings.filter(function (b) { return b.date === key; }).sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      out += '<div class="day' + (day.getMonth() !== m ? ' out' : '') + (key === today() ? ' today' : '') + '"><div class="d">' + day.getDate() + '</div>' +
        evs.map(function (b) { var sv = service(b.service); return '<div class="ev' + (b.guests.length > 1 ? ' group' : '') + '" title="' + esc(sv.label) + '">' + fmtTime(b.time) + ' ' + esc(b.name || sv.label) + '</div>'; }).join('') + '</div>';
      if (i === 34 && day.getMonth() !== m) break;
    }
    return out + '</div>';
  }
  function bindSchedule() {
    $$('[data-stab]').forEach(function (b) { b.addEventListener('click', function () { ui.schedTab = b.getAttribute('data-stab'); render(); }); });
    $$('[data-cal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var base = ui.calMonth || today().slice(0, 7);
        var dt = new Date(+base.slice(0, 4), +base.slice(5, 7) - 1 + (+b.getAttribute('data-cal')), 1);
        ui.calMonth = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); render();
      });
    });
    $$('[data-remind]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = client(b.getAttribute('data-remind'));
        S.emails.unshift({ at: today(), to: c.id, kind: 'Intake reminder', subject: 'A quick reminder before your session' }); save();
        b.outerHTML = '<span class="pill ok">Reminder sent</span>';
        toast('Reminder sent to ' + c.name + ' (simulated)');
      });
    });
    $('#sNewBtn').addEventListener('click', function () { var n = $('#sNew'); n.hidden = !n.hidden; });
    $('#nAdd').addEventListener('click', function () {
      var b = { id: 'b' + Date.now(), service: $('#nSvc').value, date: $('#nDate').value, time: $('#nTime').value, guests: [$('#nClient').value], where: 'Studio' };
      if (!b.date) { toast('Pick a date.'); return; }
      S.bookings.push(b);
      if ($('#nSendIntake').checked) S.emails.unshift({ at: today(), to: b.guests[0], kind: 'Intake link', subject: 'Before your ' + service(b.service).label });
      save(); render(); toast('Booked ' + client(b.guests[0]).name + ' for ' + fmtDate(b.date));
    });
  }

  /* Newsletter ------------------------------------------------------------ */
  var SEGMENTS = [
    { id: 'all', label: 'All subscribers', count: 1248, test: function () { return true; } },
    { id: 'sleep', label: 'Goal: better sleep', count: 312, test: function (c) { return c.goals.indexOf('sleep') >= 0; } },
    { id: 'stress', label: 'Goal: less stress', count: 287, test: function (c) { return c.goals.indexOf('stress') >= 0; } },
    { id: 'coaching', label: 'Coaching clients', count: 64, test: function (c) { return c.plan !== 'newsletter'; } },
    { id: 'lapsed', label: 'Bought once, not in 60 days', count: 90, test: function (c) { return !c.autoship && c.ltv > 0; } }
  ];
  VIEWS.newsletter = function () {
    var body = 'Hi {first_name},\n\nShorter days can throw off your sleep. This week we put together three small evening habits that make a real difference, plus a new 18-minute wind-down class.\n\nBased on your goals, we think you will love {top_pick}.\n\n[Watch the class]\n\nRest well,\nMaya';
    return head('Grow', 'Newsletter',
      'Write once, and every reader gets a version that knows their name, their goals and the product most likely to help them.') +
      pitch('new', 'Builds on the existing email engine. New: audience segments from intake answers, a personal product pick per reader, scheduling and revenue tracking per campaign.') +
      '<div class="split"><div class="card"><div class="fields">' +
      '<div class="wide"><label for="nlSeg">Audience</label><select id="nlSeg">' + SEGMENTS.map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + ' (' + s.count.toLocaleString() + ')</option>'; }).join('') + '</select></div>' +
      '<div class="wide"><label for="nlSubj">Subject</label><input id="nlSubj" type="text" value="Three evening habits for deeper sleep"></div>' +
      '<div class="wide"><label for="nlBody">Message</label><textarea id="nlBody" rows="11">' + esc(body) + '</textarea><p class="small muted" style="margin:.4rem 0 0">Personal fields: <span class="token">{first_name}</span> <span class="token">{top_pick}</span> <span class="token">{goal}</span></p></div>' +
      '<div><label for="nlWhen">Send</label><select id="nlWhen"><option value="now">Now</option><option value="am" selected>Tomorrow, 7:00am</option><option value="best">Each reader&rsquo;s best open time</option></select></div>' +
      '</div><div class="row" style="margin-top:1rem"><button class="btn" id="nlSend">Schedule campaign</button><span class="small muted" id="nlCount"></span></div></div>' +
      '<div><p class="label">Preview as</p><div class="recips" id="nlRecips"></div><div id="nlPreview"></div></div></div>' +
      '<h2 class="h2">Past campaigns</h2><div class="card"><div class="tablewrap"><table data-tour="campaigns"><thead><tr><th>Campaign</th><th>Sent</th><th class="r">Recipients</th><th class="r">Opened</th><th class="r">Clicked</th><th class="r">Revenue</th></tr></thead><tbody id="nlPast">' + pastCampaigns() + '</tbody></table></div></div>';
  };
  function pastCampaigns() {
    return S.campaigns.map(function (c) {
      return '<tr><td><b>' + esc(c.subject) + '</b>' + (c.scheduled ? ' <span class="pill honey">Scheduled</span>' : '') + '</td><td class="num">' + fmtDate(c.sent) + '</td><td class="r">' + c.recipients.toLocaleString() + '</td><td class="r">' + (c.scheduled ? '&mdash;' : Math.round(c.opens * 100) + '%') + '</td><td class="r">' + (c.scheduled ? '&mdash;' : (c.clicks * 100).toFixed(1) + '%') + '</td><td class="r">' + (c.scheduled ? '&mdash;' : money(c.revenue, false)) + '</td></tr>';
    }).join('');
  }
  function bindNewsletter() {
    var seg = $('#nlSeg'), subj = $('#nlSubj'), body = $('#nlBody'), who = null;
    function readers() {
      var s = SEGMENTS.filter(function (x) { return x.id === seg.value; })[0];
      return S.clients.filter(s.test).slice(0, 3);
    }
    function paintRecips() {
      var rs = readers(); if (!who || rs.indexOf(who) < 0) who = rs[0];
      $('#nlRecips').innerHTML = rs.map(function (c, i) { return '<button class="chip' + (c === who ? ' is-on' : '') + '" data-reader="' + i + '">' + esc(c.name) + '</button>'; }).join('');
      $$('[data-reader]').forEach(function (b) { b.addEventListener('click', function () { who = rs[+b.getAttribute('data-reader')]; paintRecips(); }); });
      var s = SEGMENTS.filter(function (x) { return x.id === seg.value; })[0];
      $('#nlCount').textContent = s.count.toLocaleString() + ' readers, each with their own pick';
      paint();
    }
    function paint() {
      if (!who) { $('#nlPreview').innerHTML = ''; return; }
      var r = EG.recommend(who), top = r.picks[0] ? r.picks[0].product : null;
      var fill = function (s) {
        return s.replace(/\{first_name\}/g, first(who.name)).replace(/\{top_pick\}/g, top ? top.name : 'our new collection').replace(/\{goal\}/g, EG.goalLabel(who.goals[0]).toLowerCase());
      };
      var html = mailPreview(EG.BRAND.email, who.email, fill(subj.value), fill(body.value));
      if (top) html = html.replace('</div></div>', '<div class="pick" style="margin-top:.8rem"><div class="bottle" style="--h:' + top.hue + '"></div><div class="grow"><div class="title">' + esc(top.name) + '</div><div class="why">Picked for ' + esc(first(who.name)) + ' from their intake goals</div></div><span class="price">' + money(top.price) + '</span></div></div></div>');
      $('#nlPreview').innerHTML = html;
    }
    seg.addEventListener('change', paintRecips); subj.addEventListener('input', paint); body.addEventListener('input', paint);
    $('#nlSend').addEventListener('click', function () {
      var s = SEGMENTS.filter(function (x) { return x.id === seg.value; })[0];
      S.campaigns.unshift({ id: 'n' + Date.now(), subject: subj.value, segment: s.id, sent: EG.iso(1), recipients: s.count, scheduled: true });
      save(); $('#nlPast').innerHTML = pastCampaigns();
      toast('Scheduled for ' + s.count.toLocaleString() + ' readers (simulated)');
    });
    paintRecips();
  }

  /* Shop & fulfilment ----------------------------------------------------- */
  VIEWS.shop = function () {
    var month = S.orders.reduce(function (t, o) { return t + orderTotal(o); }, 0);
    var cost = S.orders.reduce(function (t, o) { return t + orderCost(o); }, 0);
    var waiting = S.orders.filter(function (o) { return o.stage === 0 && !o.held && !o.batched; }).length;
    return head('Orders, products and suppliers', 'Shop',
      'Orders drop-ship from the supplier, but only after a person on your team approves each one.') +
      pitch('new', 'Proposed drop-ship automation with a human checkpoint: every order, including auto-ship refills, waits in an approval queue. Once approved, routing, tracking emails and refill reminders run on their own.') +
      '<div class="grid g4" style="margin-bottom:1rem">' + stat(waiting, 'Waiting for approval', waiting ? 'needs a person' : 'all clear') + stat(money(month, false), 'Product revenue this week', '') + stat(Math.round((1 - cost / month) * 100) + '%', 'Gross margin after supplier cost', '') + stat('2.6 days', 'Approval to doorstep', '') + '</div>' +
      '<div class="row" style="justify-content:space-between;margin-bottom:1rem"><div class="tabs" style="margin:0">' +
      [['pipeline', 'Orders' + (waiting ? ' (' + waiting + ')' : '')], ['products', 'Products'], ['suppliers', 'Suppliers']].map(function (t) { return '<button class="tab' + (ui.shopTab === t[0] ? ' is-on' : '') + '" data-shtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (ui.shopTab === 'pipeline' ? '<button class="btn ghost" id="shSim">Simulate an incoming order</button>' : '') + '</div>' +
      (ui.shopTab === 'store' ? storefront() : ui.shopTab === 'products' ? productsTable() : ui.shopTab === 'suppliers' ? suppliersView() : ui.shopTab === 'clinic' ? clinicView() : ui.shopTab === 'rules' ? rules() : approvalQueue() + pipeline());
  };

  /* Storefront: what a client sees. Member pricing follows whoever is shopping. */
  function storefront() {
    var st = ui.store, shopper = client(st.as), member = shopper && shopper.member;
    var list = EG.PRODUCTS.filter(function (p) { return st.line === 'all' || p.line === st.line; });
    var cartSkus = Object.keys(st.cart);
    var sub = cartSkus.reduce(function (t, k) { return t + EG.product(k).price * st.cart[k]; }, 0);
    var disc = member ? sub * EG.PROGRAM.discount : 0;
    return '<div class="guestframe"><div class="guestbar"><span>Client view</span><code>rootcause.example/shop</code>' +
      '<label for="stAs" style="margin:0 0 0 auto">Shopping as</label><select id="stAs" style="width:auto">' + S.clients.map(function (c) { return '<option value="' + c.id + '"' + (c.id === st.as ? ' selected' : '') + '>' + esc(c.name) + (c.member ? ' (program member)' : '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="store">' +
      '<div class="storemain"><div class="storehead"><div><p class="eyebrow" style="margin:0">Root Cause apothecary</p><h2 class="h1" style="margin:0">Remedies &amp; supplements</h2><p class="small muted" style="margin:.2rem 0 0">Featuring the Physica Energetics range. Placeholder prices.</p></div>' +
      (member ? '<span class="pill ok" id="stMember">Premium member: 20% off and free shipping</span>' : '<span class="pill">Premium Course members get 20% off and free shipping</span>') + '</div>' +
      '<div class="chips" style="margin:1rem 0">' + [['all', 'All'], ['milieu', 'Milieu'], ['code', 'Codes'], ['tox', 'Tox'], ['desbio', 'DesBio'], ['nutri', 'Nutritionals']].map(function (l) { return '<button class="chip' + (st.line === l[0] ? ' is-on' : '') + '" data-line="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>' +
      '<div class="pgrid">' + list.map(function (p) {
        var price = member ? p.price * (1 - EG.PROGRAM.discount) : p.price;
        return '<div class="pcard">' + bottle(p) + '<div class="pname">' + esc(p.name) + '</div><div class="small muted">' + esc(EG.LINES[p.line].kind) + ' &middot; ' + esc(p.dose) + '</div>' +
          '<div class="row" style="justify-content:space-between;margin-top:auto"><span class="price">' + money(price) + (member ? ' <s class="muted small">' + money(p.price) + '</s>' : '') + '</span><button class="btn small" data-add="' + p.sku + '">' + (st.cart[p.sku] ? 'Added (' + st.cart[p.sku] + ')' : 'Add') + '</button></div></div>';
      }).join('') + '</div></div>' +
      '<aside class="cart" data-tour="cart"><h3 class="h3">Your cart</h3>' +
      (cartSkus.length ? cartSkus.map(function (k) { var p = EG.product(k); return '<div class="row small" style="justify-content:space-between;flex-wrap:nowrap;margin-bottom:.4rem"><span>' + st.cart[k] + ' &times; ' + esc(p.name) + '</span><span class="num">' + money(p.price * st.cart[k]) + '</span></div>'; }).join('') +
        '<div class="carttot"><div class="row" style="justify-content:space-between"><span>Subtotal</span><span class="num">' + money(sub) + '</span></div>' +
        (disc ? '<div class="row" style="justify-content:space-between;color:var(--ok)"><span>Member 20%</span><span class="num">&minus;' + money(disc) + '</span></div>' : '') +
        '<div class="row" style="justify-content:space-between"><span>Shipping</span><span class="num">' + (member || sub - disc >= 75 ? 'Free' : '$6.95') + '</span></div>' +
        '<div class="row" style="justify-content:space-between;font-weight:700"><span>Total</span><span class="num">' + money(sub - disc + (member || sub - disc >= 75 ? 0 : 6.95)) + '</span></div></div>' +
        '<button class="btn" id="stCheckout" style="width:100%;margin-top:.8rem">Place order</button><p class="small muted" style="margin:.5rem 0 0">Showcase: no payment is taken.</p>'
        : '<p class="small muted" style="margin:0">Your cart is empty. Add a remedy to get started.</p>') +
      '</aside></div></div>';
  }

  /* What each supplier charges to ship this order. Physica: $20 flat on US
     orders under $500, drop-ship to the client included; free from $500. */
  function supplierShipping(o) {
    var by = linesBySupplier(o), out = {};
    Object.keys(by).forEach(function (k) {
      var sup = EG.SUPPLIERS[k], cost = by[k].reduce(function (t, x) { return t + x.p.cost * x.n; }, 0);
      out[k] = sup.flat && cost < sup.freeFrom ? sup.flat : 0;
    });
    return out;
  }
  function linesBySupplier(o) {
    var by = {};
    o.items.forEach(function (it) {
      var p = EG.product(it[0]), sup = p.supplier;
      (by[sup] = by[sup] || []).push({ p: p, n: it[1] });
    });
    return by;
  }

  /* The checkpoint. Nothing below this card reaches a supplier until a person
     presses Approve and then confirms. */
  function approvalQueue() {
    var q = S.orders.filter(function (o) { return o.stage === 0 && !o.batched; });
    if (!q.length) return '<div class="card" style="margin-bottom:1rem" data-tour="approvals"><h3 class="h3" style="margin:0">Approval queue</h3><p class="small muted" style="margin:.3rem 0 0">Nothing waiting. New orders and refills will appear here first.</p></div>';
    return '<div class="card" style="margin-bottom:1rem" data-tour="approvals"><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">Approval queue</h3><span class="small muted">Orders wait here until a team member approves them</span></div>' +
      q.map(function (o) {
        var c = client(o.client), r = c ? EG.recommend(c) : { flags: [] };
        var by = linesBySupplier(o), ship = supplierShipping(o), shipTotal = Object.keys(ship).reduce(function (t, k) { return t + ship[k]; }, 0);
        var cost = orderCost(o) + shipTotal, total = orderTotal(o);
        var review = r.flags.length > 0;
        var confirming = ui.confirming === o.id;
        return '<div class="approve' + (o.held ? ' held' : '') + '" id="ap-' + o.id + '">' +
          '<div class="row" style="justify-content:space-between"><div><b>' + o.id + '</b> &middot; ' + esc(c ? c.name : '') + ' &middot; ' + fmtDate(o.at) + (o.sub ? ' &middot; auto-ship refill' : '') + ' <span class="pill">' + esc(o.source || (o.sub ? 'Auto-ship' : 'Client app')) + '</span></div>' +
          (o.held ? '<span class="pill">On hold</span>' : review ? '<span class="pill warn">Screening flag</span>' : '<span class="pill warn">Needs approval</span>') + '</div>' +
          '<div class="tablewrap"><table class="small" style="margin:.6rem 0"><thead><tr><th>Item</th><th>Supplier</th><th class="r">Qty</th><th class="r">Supplier cost</th></tr></thead><tbody>' +
          Object.keys(by).map(function (sup) { return by[sup].map(function (x) { return '<tr><td>' + esc(x.p.name) + '</td><td>' + esc(EG.SUPPLIERS[sup].name) + '</td><td class="r">' + x.n + '</td><td class="r">' + money(x.p.cost * x.n) + '</td></tr>'; }).join(''); }).join('') +
          Object.keys(ship).map(function (k) { return '<tr><td class="muted">Shipping, drop-ship to client</td><td>' + esc(EG.SUPPLIERS[k].name) + '</td><td></td><td class="r">' + (ship[k] ? money(ship[k]) : 'Free') + '</td></tr>'; }).join('') +
          '</tbody></table></div>' +
          '<div class="row small" style="gap:1.2rem"><span>Client pays <b class="num">' + money(total) + '</b>' + (o.discount ? ' (member price)' : '') + '</span><span>Supplier cost incl. shipping <b class="num">' + money(cost) + '</b></span><span>Margin <b class="num">' + money(total - cost) + ' (' + Math.round((1 - cost / total) * 100) + '%)</b>' + (window.EGAuto && (1 - cost / total) * 100 < EGAuto.setting('approval', 'margin') && total - cost >= 0 ? ' <span class="pill warn">Under ' + EGAuto.setting('approval', 'margin') + '%</span>' : '') + '</span><span class="muted">Ship to ' + esc(c ? c.name : '') + ', Salt Lake City, UT</span></div>' +
          (total - cost < 0 ? '<div class="flagbar" style="margin-top:.6rem">This order loses ' + money(cost - total) + ' after Physica&rsquo;s $20 shipping on orders under $500. Consider a minimum order, a shipping charge, or holding it to combine with the client&rsquo;s next refill.</div>' : '') +
          (review ? '<label class="check" style="margin-top:.6rem"><input type="checkbox" data-reviewed="' + o.id + '"> I have reviewed ' + esc(first(c.name)) + '&rsquo;s screening (' + r.flags.map(function (f) { return { bloodthinner: 'blood thinner', pregnant: 'pregnancy', thyroid: 'thyroid' }[f]; }).join(', ') + ') and this order is appropriate</label>' : '') +
          (confirming
            ? '<div class="confirm"><span>' + Object.keys(by).map(function (k) { return '<b>' + esc(EG.SUPPLIERS[k].short) + ':</b> ' + esc(EG.SUPPLIERS[k].pathLabel) + ', ship-to ' + esc(c ? c.name : 'the client'); }).join('<br>') + '<br>Total ' + money(cost) + ' including shipping. You check out in your own supplier tab; the packing slip shows no prices.</span>' + '<div class="row"><button class="btn" data-confirm="' + o.id + '">Fill the cart, I&rsquo;ll check out</button><button class="btn ghost" data-cancel="' + o.id + '">Cancel</button></div></div>'
            : '<div class="row" style="margin-top:.7rem"><button class="btn" data-approve="' + o.id + '"' + (review || o.held ? ' disabled' : '') + '>Approve order</button><button class="btn ghost" data-hold="' + o.id + '">' + (o.held ? 'Release hold' : 'Hold') + '</button>' + (total - cost < 0 ? '<button class="btn ghost" data-batch="' + o.id + '">Add to clinic order instead</button>' : '') + '</div>') +
          '</div>';
      }).join('') + '</div>';
  }

  function pipeline() {
    return '<div class="pipe" data-tour="pipeline">' + EG.STAGES.map(function (st, i) {
      var os = S.orders.filter(function (o) { return o.stage === i; }).slice().reverse();
      return '<div class="lane' + (i === 0 ? ' gate' : '') + '"><h4><span>' + st + '</span><span>' + os.length + '</span></h4>' + os.map(function (o) {
        var c = client(o.client);
        var sups = Object.keys(linesBySupplier(o)).map(function (k) { return EG.SUPPLIERS[k].short; }).join(' + ');
        return '<div class="ticket" id="t-' + o.id + '"><b>' + o.id + ' &middot; ' + money(orderTotal(o)) + '</b>' + esc(c ? c.name : '') + '<br><span class="muted">' + o.items.length + ' item' + (o.items.length > 1 ? 's' : '') + ' &middot; ' + sups + (o.sub ? ' &middot; refill' : '') + '</span>' +
          (o.batched ? '<br><span class="pill">In clinic order</span>' : '') + (o.approvedBy && i >= 1 ? '<br><span class="muted">Approved by ' + esc(first(o.approvedBy)) + '</span>' : '') + (o.tracking && i >= 3 ? '<br><span class="muted num">' + o.tracking + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div><h2 class="h2">Automation log</h2><div class="log" id="shLog">' + (ui.log.length ? ui.log.join('') : '<div><time>--:--</time><span class="muted">Approve an order above to watch it go from supplier to doorstep.</span></div>') + '</div>';
  }
  function productsTable() {
    return '<div class="card"><p class="small muted" style="margin-top:0">Product names from the Physica Energetics catalogue. Their pricing is practitioner-only, so prices and costs shown are placeholders until we load your price list.</p><div class="tablewrap"><table><thead><tr><th>Product</th><th>Line</th><th class="r">Price</th><th class="r">Member</th><th class="r">Supplier cost</th><th class="r">Margin</th><th>Supplier</th></tr></thead><tbody>' +
      EG.PRODUCTS.map(function (p) {
        return '<tr><td><div class="row" style="flex-wrap:nowrap">' + bottle(p, true) + '<span><b>' + esc(p.name) + '</b><br><span class="small muted">' + esc(p.dose) + '</span></span></div></td><td>' + esc(EG.LINES[p.line].label) + '<br><span class="small muted">' + esc(EG.LINES[p.line].kind) + '</span></td><td class="r">' + money(p.price) + '</td><td class="r">' + money(p.price * (1 - EG.PROGRAM.discount)) + '</td><td class="r">' + money(p.cost) + '</td><td class="r">' + Math.round((1 - p.cost / p.price) * 100) + '%</td><td>' + esc(EG.SUPPLIERS[p.supplier].name) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  /* What we know about each supplier, from their public websites (checked
     October 2026). Physica's terms were read in full; the others in part. */
  var SRC = {
    physica: [['https://physicaenergetics.com/shipping-and-returns/', 'Shipping policy'], ['https://physicaenergetics.com/resale-policy/', 'Resale policy'], ['https://physicaenergetics.com/faqs/', 'FAQ'], ['https://physicaenergetics.com/pages/Legal-Statement.html', 'Legal statement']],
    biotics: [['https://www.bioticsresearch.com/internet_resale_policy', 'Internet resale policy'], ['https://info.bioticsresearch.com/estorerx', 'eStoreRx'], ['https://fullscript.com/blog/biotics-now-available-on-fullscript', 'On Fullscript']],
    desbio: [['https://dbscript.com/policies/', 'dbscript policies'], ['https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/desbiodeseret-biologicals-inc-735464-10012026', 'FDA warning letter']]
  };
  function flagPills(f) {
    return '<span class="pills">' + (f.mapEnforced ? '<span class="pill warn">Minimum price enforced</span>' : '') + (!f.pricingPublic ? '<span class="pill">Prices hidden from public</span>' : '') +
      (f.requiresPractitionerLink ? '<span class="pill">Client must be your patient</span>' : '') + '<span class="pill">International: ' + esc(f.shipsInternationally) + '</span></span>';
  }
  function suppliersView() {
    var cards = ['physica', 'biotics', 'desbio'].map(function (k) {
      var s = EG.SUPPLIERS[k], n = EG.PRODUCTS.filter(function (p) { return p.supplier === k; }).length;
      var rows = [['Their store', s.platform + ' (practitioner login)'], ['How orders reach them', s.pathLabel], ['Patient dispensary', s.dispensary], ['Drop-ship', s.dropship], ['Shipping', s.ships], ['Member discounts', s.memberDiscount]];
      return '<div class="card supcard"' + (k === 'physica' ? ' data-tour="supplier"' : '') + '><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">' + esc(s.name) + '</h3><span class="pill ok">' + esc(s.role) + '</span></div>' +
        '<p class="small muted" style="margin:.3rem 0 .6rem">' + n + ' products in this showcase' + (k === 'physica' ? ' (legal entity: Aperture Energetics)' : '') + '.</p>' + flagPills(s.flags) +
        '<table class="small" style="margin-top:.6rem"><tbody>' + rows.map(function (r) { return '<tr><th style="width:8rem;white-space:normal">' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (s.note ? '<div class="flagbar">' + esc(s.note) + '</div>' : '') +
        '<p class="small muted" style="margin:.6rem 0 0">Sources: ' + SRC[k].map(function (x) { return '<a href="' + x[0] + '" target="_blank" rel="noopener">' + x[1] + '</a>'; }).join(' &middot; ') + '</p></div>';
    }).join('');
    return '<div class="card" style="margin-bottom:1rem" data-tour="paths"><h3 class="h3">How an approved order reaches a supplier</h3><p class="small muted" style="margin-top:0">None of the three offers an ordering API to practitioners. Each path below runs inside a session the practitioner opened themselves. Nothing logs in with a stored password, because that breaks their terms and risks the account.</p>' +
      '<div class="paths">' + ['cart', 'link', 'email', 'manual'].map(function (k, i) { var t = EG.PATHS[k].split(': '); return '<div class="pathbox"><b>' + (i + 1) + '. ' + esc(t[0]) + '</b><span class="small muted">' + esc(t[1]) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="policy card" style="margin-bottom:1rem"><h3 class="h3">Policy check: Premium &ldquo;20% off every supplement&rdquo;</h3><p class="small" style="margin:0">Physica enforces a minimum advertised price, and Biotics asks for online prices at or above suggested retail. A blanket 20% member discount on their products could break both policies, and the penalty is losing the account. Options: ask each supplier for written approval, give the Biotics discount as a private patient code, or swap the benefit for free shipping or store credit. Auto-ship already works this way: no product discount, just credit toward sessions and short courses, which are the clinic&rsquo;s own services. Worth confirming with each supplier that this is fine.</p></div>' +
      '<div class="supgrid">' + cards + '</div>' +
      '<div class="split" style="margin-top:1rem"><div class="card"><h3 class="h3">Sales channels</h3><div class="list"><div class="li"><div class="grow"><div class="title">Client app</div><div class="meta">Signed-in clients only, so prices stay private.</div></div><span class="pill ok">Connected</span></div>' +
      '<div class="li"><div class="grow"><div class="title">Shopify store</div><div class="meta">Customer accounts required for these brands. Product pages not indexed; Google, Shop app and social channels off for them.</div></div><span class="pill ok">Connected</span></div></div></div>' +
      '<div class="card"><h3 class="h3">Let the dispensaries ship</h3><p class="small" style="margin-top:0">Biotics&rsquo; eStoreRx and DesBio&rsquo;s dbscript already run patient stores and ship to patients. This platform keeps the one client record and the plan across all brands, then routes each order to whichever channel fits, rather than rebuilding what the suppliers provide.</p></div></div>';
  }
  /* Clinic stock, gathered per supplier and ordered in one go. */
  function batchCost(k) { return (S.batches[k] || []).reduce(function (t, l) { return t + EG.product(l[0]).cost * l[1]; }, 0); }
  function clinicView() {
    return '<div class="card" style="margin-bottom:1rem"><p class="small" style="margin:0">Stock for the clinic collects here per supplier, each unit earmarked for the client it is for. One order goes out when it is worth it: Physica ships free from $500. One order a week instead of one per product is most of the time saved.</p></div>' +
      '<div class="supgrid" data-tour="batches">' + ['physica', 'biotics', 'desbio'].map(function (k) {
        var s = EG.SUPPLIERS[k], lines = S.batches[k] || [], cost = batchCost(k);
        var target = k === 'physica' && window.EGAuto ? EGAuto.setting('batch', 'threshold') : s.freeFrom, pct = target ? Math.min(100, cost / target * 100) : 100;
        return '<div class="card"><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">' + esc(s.short) + '</h3><span class="price">' + money(cost) + '</span></div>' +
          (target ? '<div class="bar" style="margin:.6rem 0 .3rem"><i style="width:' + pct + '%;background:' + (pct >= 100 ? 'var(--ok)' : 'var(--honey)') + '"></i></div><div class="small muted">' + (cost >= target ? 'Ready to order' + (cost >= s.freeFrom ? ', ships free' : '') : money(target - cost) + ' to the $' + target + ' order point' + (target >= s.freeFrom ? ' (free shipping)' : '')) + '</div>' : '<div class="small muted" style="margin-top:.4rem">' + esc(s.pathLabel) + '</div>') +
          '<table class="small" style="margin-top:.6rem"><thead><tr><th>Product</th><th class="r">Qty</th><th>For</th></tr></thead><tbody>' +
          (lines.length ? lines.map(function (l) { var c = client(l[2]); return '<tr><td>' + esc(EG.product(l[0]).name) + '</td><td class="r">' + l[1] + '</td><td>' + (c ? esc(c.name) : '<span class="muted">Clinic shelf</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="muted">Nothing waiting.</td></tr>') + '</tbody></table>' +
          (lines.length ? '<button class="btn small" data-po="' + k + '" style="margin-top:.7rem">Order now: fill the ' + esc(s.short) + ' cart</button>' : '') + '</div>';
      }).join('') + '</div>' +
      (S.pos.length ? '<h2 class="h2">Purchase orders and pick lists</h2>' + S.pos.map(function (po) {
        return '<div class="card" style="margin-bottom:.8rem"><div class="row" style="justify-content:space-between"><b>' + po.id + ' &middot; ' + esc(EG.SUPPLIERS[po.supplier].name) + '</b><span class="small muted">' + fmtDate(po.at) + ' &middot; ' + money(po.total) + (po.ship ? ' + $' + po.ship + ' shipping' : ' &middot; free shipping') + '</span></div>' +
          '<p class="small muted" style="margin:.3rem 0">When the box arrives, set each unit aside for its client.</p><table class="small"><thead><tr><th>Picked</th><th>Product</th><th class="r">Qty</th><th>Set aside for</th></tr></thead><tbody>' +
          po.lines.map(function (l) { var c = client(l[2]); return '<tr><td><input type="checkbox" aria-label="Picked"></td><td>' + esc(EG.product(l[0]).name) + '</td><td class="r">' + l[1] + '</td><td>' + (c ? esc(c.name) : 'Clinic shelf') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).join('') : '');
  }
  function rules() { return window.EGAuto ? EGAuto.html('shop') : ''; }
  function bindShop() {
    $$('[data-shtab]').forEach(function (b) { b.addEventListener('click', function () { ui.shopTab = b.getAttribute('data-shtab'); render(); }); });
    if (ui.shopTab === 'rules' && window.EGAuto) EGAuto.bind(render);
    var sim = $('#shSim'); if (sim) sim.addEventListener('click', function () { simulateOrder(); });
    /* storefront */
    var as = $('#stAs'); if (as) as.addEventListener('change', function () { ui.store.as = as.value; render(); });
    $$('[data-line]').forEach(function (b) { b.addEventListener('click', function () { ui.store.line = b.getAttribute('data-line'); render(); }); });
    $$('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-add'); ui.store.cart[k] = (ui.store.cart[k] || 0) + 1; render(); });
    });
    var co = $('#stCheckout');
    if (co) co.addEventListener('click', function () {
      var c = client(ui.store.as);
      var o = { id: 'EG-' + (S.nextOrder++), client: c.id, at: today(), items: Object.keys(ui.store.cart).map(function (k) { return [k, ui.store.cart[k]]; }), stage: 0, sub: false, discount: c.member ? EG.PROGRAM.discount : 0 };
      S.orders.push(o); save();
      activity(o.id + ' placed by ' + c.name + ' (' + money(orderTotal(o)) + '). Waiting for approval.');
      ui.store.cart = {}; ui.shopTab = 'pipeline';
      logLine('Checkout: <b>' + o.id + '</b> from ' + esc(c.name) + ', ' + money(orderTotal(o)) + '. Payment authorised.');
      logLine('Waiting for approval. Nothing is sent to a supplier until a team member approves.');
      render();
      var card = $('#ap-' + o.id); if (card) { card.classList.add('flash'); card.scrollIntoView({ block: 'center' }); }
      toast('Order placed. It is now in your approval queue.');
    });
    /* approvals */
    $$('[data-reviewed]').forEach(function (cb) {
      cb.addEventListener('change', function () { var b = $('[data-approve="' + cb.getAttribute('data-reviewed') + '"]'); if (b) b.disabled = !cb.checked; });
    });
    $$('[data-approve]').forEach(function (b) { b.addEventListener('click', function () { ui.confirming = b.getAttribute('data-approve'); render(); }); });
    $$('[data-cancel]').forEach(function (b) { b.addEventListener('click', function () { ui.confirming = null; render(); }); });
    $$('[data-confirm]').forEach(function (b) { b.addEventListener('click', function () { approveOrder(b.getAttribute('data-confirm')); }); });
    $$('[data-batch]').forEach(function (b) {
      b.addEventListener('click', function () {
        var o = S.orders.filter(function (x) { return x.id === b.getAttribute('data-batch'); })[0];
        o.items.forEach(function (it) { var k = EG.product(it[0]).supplier; (S.batches[k] = S.batches[k] || []).push([it[0], it[1], o.client]); });
        o.batched = true; save();
        logLine(o.id + ' moved to the clinic order. It ships with the next batch and is set aside for ' + esc(client(o.client).name) + '.');
        activity(o.id + ' moved to the clinic order to avoid a separate shipping charge.');
        render(); toast('Added to the clinic order');
      });
    });
    $$('[data-po]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-po'), s = EG.SUPPLIERS[k], cost = batchCost(k);
        var po = { id: 'PO-' + (2040 + S.pos.length), supplier: k, at: today(), lines: S.batches[k].slice(), total: cost, ship: s.freeFrom && cost < s.freeFrom ? s.flat : 0 };
        S.pos.unshift(po); S.batches[k] = [];
        activity(po.id + ': ' + s.short + ' cart filled with ' + po.lines.length + ' lines for clinic stock and checked out by ' + EG.BRAND.owner + '. Pick list ready.');
        save(); render(); toast(s.short + ' cart filled. Check out in your ' + s.short + ' tab.');
      });
    });
    $$('[data-hold]').forEach(function (b) {
      b.addEventListener('click', function () {
        var o = S.orders.filter(function (x) { return x.id === b.getAttribute('data-hold'); })[0];
        o.held = !o.held; save(); logLine(o.id + (o.held ? ' put on hold.' : ' released from hold.')); render();
      });
    });
  }
  function stamp() { var n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + ':' + String(n.getSeconds()).padStart(2, '0'); }
  function logLine(text, ok) {
    ui.log.unshift('<div><time>' + stamp() + '</time><span' + (ok ? ' class="ok"' : '') + '>' + text + '</span></div>');
    ui.log = ui.log.slice(0, 40);
    var l = $('#shLog'); if (l) l.innerHTML = ui.log.join('');
  }
  function placeOrder(c) {
    var items = (c.plan_items && c.plan_items.length ? c.plan_items : ['PE-ADM']).slice(0, 3).map(function (s) { return [s, 1]; });
    var o = { id: 'EG-' + (S.nextOrder++), client: c.id, at: today(), items: items, stage: 0, sub: !!c.autoship, discount: c.member ? EG.PROGRAM.discount : 0 };
    S.orders.push(o); save(); return o;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* An order arrives and stops at the gate. */
  function simulateOrder() {
    var pool = S.clients.filter(function (c) { return c.plan_items && c.plan_items.length && !EG.recommend(c).needsReview; });
    var c = pool[Math.floor(Math.random() * pool.length)] || S.clients[0];
    var o = placeOrder(c);
    ui.shopTab = 'pipeline';
    logLine('Checkout: <b>' + o.id + '</b> from ' + esc(c.name) + ', ' + money(orderTotal(o)) + '. Payment authorised.');
    logLine('Waiting for approval. Nothing is sent to a supplier until a team member approves.');
    if (ui.view === 'shop') render();
    var card = $('#ap-' + o.id); if (card) card.classList.add('flash');
    return o;
  }

  /* Only reachable through Approve, then "Yes, send to supplier". */
  function approveOrder(id) {
    var o = S.orders.filter(function (x) { return x.id === id; })[0];
    if (!o || o.stage !== 0) return Promise.resolve();
    var c = client(o.client);
    ui.confirming = null; ui.simulating = true;
    o.approvedBy = EG.BRAND.owner;
    var by = linesBySupplier(o);
    var steps = [
      function () {
        logLine('Approved by ' + esc(EG.BRAND.owner) + '.', true);
        activity(o.id + ' approved by ' + EG.BRAND.owner + '. Supplier cart filled and checked out with ' + Object.keys(by).map(function (k) { return EG.SUPPLIERS[k].name; }).join(' and ') + '. Client emailed.');
        Object.keys(by).forEach(function (k) {
          var sup = EG.SUPPLIERS[k], n = by[k].length + ' line' + (by[k].length > 1 ? 's' : '');
          if (sup.path === 'cart') logLine(esc(sup.short) + ': the Root Cause extension filled the cart in ' + esc(EG.BRAND.owner) + '&rsquo;s logged-in tab (' + n + ', ship-to ' + esc(c.name) + ').');
          else if (sup.path === 'link') logLine(esc(sup.short) + ': cart link opened in ' + esc(EG.BRAND.owner) + '&rsquo;s account (' + n + ', ship-to ' + esc(c.name) + ').');
          else logLine(esc(sup.short) + ': purchase order emailed (' + n + ', drop-ship to ' + esc(c.name) + ').');
          if (sup.path !== 'email') logLine(esc(EG.BRAND.owner) + ' checked out on the ' + esc(sup.short) + ' site. Confirmation number saved to the order.', true);
        });
        logLine('Email to ' + esc(c.email) + ': "Your order is confirmed"');
      },
      function () { logLine('Supplier confirmed. Packing slip printed with Root Cause branding.', true); },
      function () {
        o.tracking = '1Z84F2A' + Math.floor(10000 + Math.random() * 89999); logLine('UPS tracking ' + o.tracking + ' read from the supplier\u2019s shipping email.', true);
        if (window.EGAuto && !EGAuto.on('tracking')) { logLine('Tracking emails are switched off, so the client was not emailed.'); return; }
        logLine('Email to ' + esc(c.email) + ': "Your order is on its way"'); S.emails.unshift({ at: today(), to: c.id, kind: 'Order shipped', subject: 'Your Root Cause order is on its way' });
      },
      function () { logLine('Delivered. Refill reminder scheduled for day 25. Review request queued for day 7.', true); activity('Tracking ' + o.tracking + ' emailed to ' + c.name + '. Refill reminder set for day 25.'); }
    ];
    var chain = Promise.resolve();
    steps.forEach(function (fn, i) {
      chain = chain.then(function () {
        o.stage = i + 1; fn(); save();
        if (ui.view === 'shop' && ui.shopTab === 'pipeline') {
          if (i === 0) render();
          else { var pipe = $('.pipe'); if (pipe) { var tmp = document.createElement('div'); tmp.innerHTML = pipeline(); pipe.replaceWith(tmp.firstChild); } }
          var t = $('#t-' + o.id); if (t) t.classList.add('flash');
        }
        return wait(1500);
      });
    });
    return chain.then(function () { ui.simulating = false; toast(o.id + ' delivered. One click from you, the rest was automatic.'); });
  }

  /* Videos ----------------------------------------------------------------- */
  VIEWS.videos = function () {
    var total = EG.VIDEOS.reduce(function (t, v) { return t + v.views; }, 0);
    return head('Grow', 'Video library',
      'Classes and explainers that the intake assigns automatically. See who is watching and what is helping.') +
      pitch('new', 'Proposed: free classes plus paid course videos that program members can stream or download. A members&rsquo; video library tied to each client&rsquo;s goals, with watch progress on the client record and videos recommended in plans and newsletters.') +
      '<div class="grid g4" style="margin-bottom:1rem">' + stat(total.toLocaleString(), 'Views, last 90 days', '+22%') + stat('71%', 'Average completion', '') + stat(EG.VIDEOS.length, 'Videos published', '') + stat('3.4', 'Videos per client plan', '') + '</div>' +
      '<div class="grid g3" data-tour="videos">' + EG.VIDEOS.map(function (v) {
        var assigned = S.clients.filter(function (c) { return v.id in c.videos; }).length;
        return '<div class="card vcard"><div class="thumb" style="--h:' + v.hue + '"><span class="play"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#233027"/></svg></span><span class="dur">' + v.mins + ':00</span></div>' +
          '<span class="title">' + esc(v.title) + '</span><div class="pills">' + (v.access === 'paid' ? '<span class="pill honey">Short course ' + money(v.price, false) + ', included in Premium</span>' : '<span class="pill ok">Free with an account</span>') + '</div>' + goalPills(v.goals) +
          '<div class="row" style="justify-content:space-between"><span class="small muted num">' + v.views.toLocaleString() + ' views &middot; in ' + assigned + ' plans</span><button class="btn ghost small" data-assign="' + v.id + '">Assign</button></div></div>';
      }).join('') + '</div>';
  }
  function bindVideos() {
    $$('[data-assign]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = EG.video(b.getAttribute('data-assign'));
        var n = 0;
        S.clients.forEach(function (c) { if (!(v.id in c.videos) && c.goals.some(function (g) { return v.goals.indexOf(g) >= 0; })) { c.videos[v.id] = 0; n++; } });
        save(); render();
        toast(n ? 'Added to ' + n + ' client plans with matching goals' : 'Already in every matching plan');
      });
    });
  }

  /* Agreements & quotes (crossover of Contracts + Quotes) ------------------- */
  VIEWS.agreements = function () {
    var a = S.agreements.filter(function (x) { return x.id === ui.quoteId; })[0] || S.agreements[0];
    return head('Paperwork', 'Agreements & quotes',
      'Write a quote once. Every line total and the grand total are worked out for you, and the client signs online.') +
      pitch('proven', 'The current app already builds quotes and contracts with itemised, auto-calculated invoices and e-signatures. Here it is set up for partnerships with retreat organisers and for client agreements.') +
      '<div class="tabs">' + S.agreements.map(function (x) { return '<button class="tab' + (x.id === a.id ? ' is-on' : '') + '" data-q="' + x.id + '">' + esc(x.client) + ' <span class="pill ' + (x.status === 'Signed' ? 'ok' : 'warn') + '" style="margin-left:.3rem">' + x.status + '</span></button>'; }).join('') + '</div>' +
      '<div class="split"><div class="card"><div class="fields">' +
      '<div class="wide"><label for="qTitle">Title</label><input id="qTitle" type="text" value="' + esc(a.title) + '"></div>' +
      '<div><label for="qClient">Client</label><input id="qClient" type="text" value="' + esc(a.client) + '"></div>' +
      '<div><label for="qContact">Contact</label><input id="qContact" type="text" value="' + esc(a.contact) + '"></div>' +
      '</div><p class="label" style="margin-top:1rem">Line items</p><div class="lineedit small muted" style="margin-bottom:.2rem"><span>Description</span><span>Qty</span><span>Rate</span><span class="amt">Amount</span></div><div id="qLines">' + lineRows(a) + '</div>' +
      '<button class="linkish" id="qAddLine" style="padding-left:0">+ Add a line</button>' +
      '<div style="margin-top:.8rem"><label for="qTerms">Terms</label><textarea id="qTerms" rows="4">' + esc(a.terms) + '</textarea></div>' +
      '<div class="row" style="margin-top:1rem"><button class="btn" id="qSend">' + (a.status === 'Signed' ? 'Send signed copy' : 'Send for signature') + '</button>' + (a.status !== 'Signed' ? '<button class="btn ghost" id="qSign">Simulate client signing</button>' : '<button class="btn ghost" id="qInv">Create invoice</button>') + '</div></div>' +
      '<div id="qDoc">' + quoteDoc(a) + '</div></div>';
  };
  function lineRows(a) {
    return a.lines.map(function (l, i) {
      return '<div class="lineedit"><input type="text" data-l="' + i + '" data-f="0" value="' + esc(l[0]) + '" aria-label="Description"><input type="number" data-l="' + i + '" data-f="1" value="' + l[1] + '" aria-label="Quantity"><input type="number" data-l="' + i + '" data-f="2" value="' + l[2] + '" aria-label="Rate"><span class="amt" data-amt="' + i + '">' + money(lineTotal(l)) + '</span></div>';
    }).join('');
  }
  function quoteDoc(a) {
    var total = a.lines.reduce(function (t, l) { return t + lineTotal(l); }, 0);
    return '<div class="doc" data-tour="quote"><div class="lh"><div><b>Root Cause Clinic</b><br><span class="small muted">' + esc(EG.BRAND.email) + '</span></div><div style="text-align:right"><span class="eyebrow">Quote</span><br><span class="small muted">Sent ' + fmtDate(a.sent) + '</span></div></div>' +
      '<h3 class="h3" style="font-size:1.5rem">' + esc(a.title) + '</h3><p class="small muted" style="margin-top:0">Prepared for ' + esc(a.client) + ' &middot; ' + esc(a.contact) + '</p>' +
      '<div class="tablewrap"><table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>' +
      a.lines.map(function (l) { return '<tr><td>' + esc(l[0]) + '</td><td class="r">' + (Number(l[1]) || 1) + '</td><td class="r">' + money(l[2]) + '</td><td class="r">' + money(lineTotal(l)) + '</td></tr>'; }).join('') +
      '<tr class="total"><td colspan="3">Total</td><td class="r" id="qTotal">' + money(total) + '</td></tr></tbody></table></div>' +
      '<p class="small muted" style="margin-top:1rem">' + esc(a.terms) + '</p>' +
      '<div class="sigline"><div>' + (a.status === 'Signed' ? '<div class="signed">' + esc(a.contact.split(',')[0].split('@')[0]) + '</div>' : '<div class="signed"></div>') + 'Client signature' + (a.status === 'Signed' ? ' &middot; signed online' : '') + '</div><div><div class="signed">Maya Brooks</div>Root Cause Clinic</div></div></div>';
  }
  function bindAgreements() {
    var a = S.agreements.filter(function (x) { return x.id === ui.quoteId; })[0] || S.agreements[0];
    $$('[data-q]').forEach(function (b) { b.addEventListener('click', function () { ui.quoteId = b.getAttribute('data-q'); render(); }); });
    function repaint() { $('#qDoc').innerHTML = quoteDoc(a); save(); }
    function bindLines() {
      $$('[data-l]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var i = +inp.getAttribute('data-l'), f = +inp.getAttribute('data-f');
          a.lines[i][f] = f === 0 ? inp.value : Number(inp.value);
          var amt = $('[data-amt="' + i + '"]'); if (amt) amt.textContent = money(lineTotal(a.lines[i]));
          repaint();
        });
      });
    }
    bindLines();
    $('#qTitle').addEventListener('input', function (e) { a.title = e.target.value; repaint(); });
    $('#qClient').addEventListener('input', function (e) { a.client = e.target.value; repaint(); });
    $('#qContact').addEventListener('input', function (e) { a.contact = e.target.value; repaint(); });
    $('#qTerms').addEventListener('input', function (e) { a.terms = e.target.value; repaint(); });
    $('#qAddLine').addEventListener('click', function () { a.lines.push(['New item', 1, 0]); $('#qLines').innerHTML = lineRows(a); bindLines(); repaint(); });
    $('#qSend').addEventListener('click', function () { if (a.status === 'Draft') a.status = 'Sent'; save(); toast('Signing link sent to ' + a.client + ' (simulated)'); });
    var sign = $('#qSign'); if (sign) sign.addEventListener('click', function () { a.status = 'Signed'; save(); render(); toast(a.client + ' signed. Signed PDF saved to records.'); });
    var inv = $('#qInv'); if (inv) inv.addEventListener('click', function () { toast('Invoice created from the signed quote: ' + money(a.lines.reduce(function (t, l) { return t + lineTotal(l); }, 0))); });
  }

  /* 3-Month Program -------------------------------------------------------- */
  function nextThursdays(n) {
    var out = [], dt = new Date();
    dt.setDate(dt.getDate() + ((4 - dt.getDay() + 7) % 7));
    for (var i = 0; i < n; i++) {
      var x = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 7 * i);
      out.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'));
    }
    return out;
  }
  function enrollment(id) { for (var i = 0; i < S.enrollments.length; i++) if (S.enrollments[i].client === id) return S.enrollments[i]; return null; }

  VIEWS.program = function () {
    var P = EG.PROGRAM, n = S.enrollments.length;
    if (ui.enrollDone) return enrollResult(ui.enrollDone);
    return head('Grow', P.name + ': ' + P.sub,
      'Sell the all-inclusive program online, then deliver it: assessment and testing, a course customised to each client, weekly live Zoom and member pricing in the shop.') +
      pitch('new', 'Proposed: paid course sales and delivery. Checkout and the signed program agreement reuse the proven e-signature engine. Customised modules, downloads, testing and Zoom scheduling are the new build.') +
      '<div class="grid g4" style="margin-bottom:1rem">' + stat(n, 'Active members', '') + stat(money(n * P.price, false), 'Program revenue booked', '') + stat('92%', 'Weekly Zoom attendance', '') + stat('8.4', 'Modules downloaded per member', '') + '</div>' +
      '<div class="tabs">' + [['sales', 'Sales page'], ['students', 'Members'], ['content', 'Course content'], ['live', 'Live Zoom']].map(function (t) { return '<button class="tab' + (ui.progTab === t[0] ? ' is-on' : '') + '" data-ptab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (ui.progTab === 'students' ? programStudents() : ui.progTab === 'content' ? programContent() : ui.progTab === 'live' ? programLive() : programSales());
  };

  function programSales() {
    var P = EG.PROGRAM;
    return '<div class="guestframe"><div class="guestbar"><span>Client view</span><code>rootcause.example/restore</code></div>' +
      '<div class="guest sales" data-tour="sales"><p class="eyebrow">' + esc(P.sub) + '</p><h2 class="h1" style="font-size:2.3rem">' + esc(P.name) + '</h2>' +
      '<p class="muted" style="margin:0 0 1.2rem">Twelve weeks with our practitioners, built around your assessment, your test results and your goals.</p>' +
      '<div class="pricebox"><div><b class="bigprice">' + money(P.price, false) + '</b><span class="small muted"> all inclusive</span><br><span class="small muted">or ' + P.plan.n + ' monthly payments of ' + money(P.plan.each, false) + '</span></div>' +
      '<button type="button" class="btn honey" id="pEnroll">Enroll now</button></div>' +
      '<div class="includes">' + P.includes.map(function (x) { return '<div class="inc"><span class="tick"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg></span><div><b>' + esc(x[0]) + '</b><br><span class="small muted">' + esc(x[1]) + '</span></div></div>'; }).join('') + '</div>' +
      '<p class="label" style="margin-top:1.2rem">Your practitioners</p><div class="row">' + EG.PRACTITIONERS.map(function (p) { return '<div class="row" style="flex-wrap:nowrap;gap:.5rem;margin-right:1rem"><span class="av">' + initials(p.name.replace('Dr. ', '')) + '</span><span class="small"><b>' + esc(p.name) + '</b><br><span class="muted">' + esc(p.role) + '</span></span></div>'; }).join('') + '</div>' +
      '<form id="pForm" class="checkout" hidden novalidate><h3 class="h3">Enroll in ' + esc(P.name) + '</h3><div class="fields">' +
      '<div><label for="pName">Full name</label><input id="pName" type="text" autocomplete="off"></div>' +
      '<div><label for="pEmail">Email</label><input id="pEmail" type="email" autocomplete="off"></div>' +
      '<div class="wide"><label for="pPlan">Payment</label><select id="pPlan"><option value="full">Pay in full: ' + money(P.price, false) + '</option><option value="plan">' + P.plan.n + ' monthly payments of ' + money(P.plan.each, false) + '</option></select></div>' +
      '<div class="wide"><label for="pCard">Card</label><input id="pCard" type="text" value="Showcase: no card needed" readonly></div>' +
      '</div><label class="check" style="margin-top:.9rem"><input type="checkbox" id="pAgree"> I agree to the program agreement and consent (signed online, copy emailed to me)</label>' +
      '<p class="small" id="pErr" style="color:var(--bad);min-height:1.2em"></p><button class="btn" id="pPay" type="submit" style="width:100%;padding:.85rem">Complete enrollment</button></form>' +
      '</div></div>';
  }

  function enrollResult(id) {
    var c = client(id), P = EG.PROGRAM, mods = EG.MODULES;
    return '<div class="guestframe"><div class="guestbar"><span>Client view</span><code>rootcause.example/restore/welcome</code></div>' +
      '<div class="guest" data-tour="welcome"><div class="result-hero"><div class="check-badge"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg></div>' +
      '<div><p class="eyebrow" style="margin:0">Welcome, ' + esc(first(c.name)) + '</p><h2 class="h1" style="margin:0">You&rsquo;re enrolled</h2></div></div>' +
      '<p class="muted">Your twelve weeks start now. Week 1 is unlocked, and your course will be shaped by your assessment and goals. Your track: <b>' + esc(EG.trackFor(c.goals)) + '</b>.</p>' +
      '<div class="grid g2" style="margin-top:1rem"><div class="pick"><div class="grow"><div class="title">Book your energetics assessment</div><div class="why">75 minutes with Deana</div></div><button type="button" class="btn small">Pick a time</button></div>' +
      '<div class="pick"><div class="grow"><div class="title">Week 1: ' + esc(mods[0].title) + '</div><div class="why">' + mods[0].vids + ' videos &middot; ' + mods[0].mins + ' min &middot; workbook</div></div><button type="button" class="btn ghost small">Watch</button></div></div>' +
      '</div></div>' +
      '<h2 class="h2">Behind the scenes, automatically</h2><div class="card" data-tour="enrollbehind"><div class="list">' +
      [['ok', 'Payment recorded: ' + (c.payPlan ? P.plan.n + ' x ' + money(P.plan.each, false) + ', next charge in 30 days' : money(P.price, false) + ' paid in full')],
        ['ok', 'Program agreement signed and saved as a PDF'], ['ok', 'Welcome email sent with the intake form and the assessment booking link'],
        ['ok', 'Test kit requested from the lab'], ['ok', 'Starter remedy order at member price added to your approval queue'], ['ok', 'Added to the Thursday Zoom series (calendar invites sent)'],
        ['ok', 'Week 1 unlocked. Later weeks unlock every 7 days'], ['ok', '20% member pricing switched on in the shop for 3 months']]
        .map(function (x) { return '<div class="todo"><span class="dotmark ' + x[0] + '"></span><span class="grow">' + esc(x[1]) + '</span></div>'; }).join('') +
      '</div><div class="row" style="margin-top:1rem"><button class="btn" id="pSeeMembers">See all members</button><button class="btn ghost" data-open-client="' + c.id + '">Open client record</button></div></div>';
  }

  function programStudents() {
    return '<div class="card"><div class="tablewrap"><table data-tour="members"><thead><tr><th>Member</th><th>Progress</th><th>Energetics</th><th>Testing</th><th>Custom plan</th><th>Payment</th><th class="r">Zoom</th></tr></thead><tbody>' +
      S.enrollments.map(function (e) {
        var c = client(e.client);
        var pill = function (v, good) { return '<span class="pill' + (good.indexOf(v) >= 0 ? ' ok' : ' warn') + '">' + esc(v) + '</span>'; };
        return '<tr class="clickable" data-client="' + c.id + '"><td><div class="row" style="flex-wrap:nowrap"><span class="av">' + initials(c.name) + '</span><span><b>' + esc(c.name) + '</b><br><span class="small muted">' + esc(EG.trackFor(c.goals)) + '</span></span></div></td>' +
          '<td style="min-width:8rem"><span class="small num">Week ' + e.week + ' of 12</span><div class="bar"><i style="width:' + Math.round(e.week / 12 * 100) + '%"></i></div></td>' +
          '<td>' + pill(e.assess, ['Complete', 'Retest booked']) + '</td><td>' + pill(e.testing, ['Results reviewed', 'Results in']) + '</td><td>' + pill(e.plan, ['Delivered']) + '</td><td>' + pill(e.pay, ['Paid in full']) + '</td><td class="r num">' + e.zoom + '/' + Math.max(1, e.week - 1) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function programContent() {
    var e = enrollment(ui.progStudent) || S.enrollments[0], c = client(e.client);
    return '<div class="row" style="margin-bottom:1rem"><label for="pStudent" style="margin:0">Viewing as</label><select id="pStudent" style="width:auto">' + S.enrollments.map(function (x) { var cc = client(x.client); return '<option value="' + cc.id + '"' + (cc.id === c.id ? ' selected' : '') + '>' + esc(cc.name) + ' (week ' + x.week + ')</option>'; }).join('') + '</select>' +
      '<span class="small muted">Each member sees their own track, protocol and unlock dates.</span></div>' +
      '<div class="card" style="margin-bottom:1rem"><div class="row" style="justify-content:space-between"><div><b>Custom energetics protocol for ' + esc(first(c.name)) + '</b><br><span class="small muted">Written by Deana after the assessment &middot; PDF, 6 pages</span></div><button class="btn small" data-dl="protocol">Download</button></div></div>' +
      '<div class="card"><div class="list" data-tour="modules">' + EG.MODULES.map(function (m) {
        var state = m.w < e.week ? 'done' : m.w === e.week ? 'now' : 'locked';
        var unlock = fmtDate(EG.iso(7 * (m.w - e.week)), { month: 'short', day: 'numeric' });
        var title = m.track ? EG.trackFor(c.goals) : m.title;
        return '<div class="li module ' + state + '"><span class="wk num">W' + m.w + '</span><div class="grow"><div class="title">' + esc(title) + (m.track ? ' <span class="pill honey">Personalised</span>' : '') + '</div><div class="meta">' + m.vids + ' videos &middot; ' + m.mins + ' min &middot; workbook PDF</div></div>' +
          (state === 'done' ? '<span class="pill ok">Completed</span><button class="btn ghost small" data-dl="' + m.w + '">Download</button>'
            : state === 'now' ? '<span class="pill honey">This week</span><button class="btn small" data-dl="' + m.w + '">Download</button>'
              : '<span class="pill">Unlocks ' + unlock + '</span><button class="btn ghost small" disabled>Locked</button>') + '</div>';
      }).join('') + '</div></div>';
  }

  function programLive() {
    var dates = nextThursdays(4), topics = ['Open Q&A and protocol check-ins', 'Drainage week: what to expect', 'Sleep, stress and the nervous system', 'Reading your retest results'];
    return '<div class="grid g2"><div class="card"><h3 class="h3">Upcoming live sessions</h3><div class="list" data-tour="zoom">' + dates.map(function (d0, i) {
      var pr = EG.PRACTITIONERS[i % 3];
      return '<div class="li"><span class="pill honey num">' + fmtDate(d0, { month: 'short', day: 'numeric' }) + '</span><div class="grow"><div class="title">' + esc(topics[i]) + '</div><div class="meta">Thursdays 6:00pm MT &middot; with ' + esc(pr.name) + ' &middot; ' + (S.enrollments.length - (i ? 1 : 0)) + ' members invited</div></div><button class="btn ghost small" data-zoom="' + i + '">Copy Zoom link</button></div>';
    }).join('') + '</div></div>' +
      '<div class="card"><h3 class="h3">Recordings</h3><p class="small muted" style="margin-top:0">Each session is recorded and added to the course automatically, so members who miss a Thursday can catch up or download it.</p><div class="list">' +
      [['Week 10 Q&A', 58], ['Understanding your test kit', 46], ['Emotional energetics live', 62]].map(function (r, i) { return '<div class="li"><div class="grow"><div class="title">' + r[0] + '</div><div class="meta">' + fmtDate(EG.iso(-7 * (i + 1) + 2)) + ' &middot; ' + r[1] + ' min</div></div><button class="btn ghost small" data-dl="rec">Download</button></div>'; }).join('') +
      '</div></div></div>';
  }

  function bindProgram() {
    $$('[data-ptab]').forEach(function (b) { b.addEventListener('click', function () { ui.progTab = b.getAttribute('data-ptab'); render(); }); });
    $$('[data-client]').forEach(function (r) { r.addEventListener('click', function () { openClient(r.getAttribute('data-client')); }); });
    $$('[data-open-client]').forEach(function (b) { b.addEventListener('click', function () { openClient(b.getAttribute('data-open-client')); }); });
    var see = $('#pSeeMembers'); if (see) see.addEventListener('click', function () { ui.enrollDone = null; ui.progTab = 'students'; render(); });
    var st = $('#pStudent'); if (st) st.addEventListener('change', function () { ui.progStudent = st.value; render(); });
    $$('[data-dl]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = client(ui.progStudent) || client(S.enrollments[0].client);
        toast('Download ready for ' + c.name + ': watermarked with their name, link expires in 72 hours (simulated)');
      });
    });
    $$('[data-zoom]').forEach(function (b) {
      b.addEventListener('click', function () {
        var url = 'https://zoom.example/j/8015550' + (140 + (+b.getAttribute('data-zoom')));
        try { navigator.clipboard.writeText(url).catch(function () {}); } catch (e) { /* not allowed here */ }
        toast('Zoom link: ' + url);
      });
    });
    var en = $('#pEnroll');
    if (en) en.addEventListener('click', function () { var f = $('#pForm'); f.hidden = false; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    var form = $('#pForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#pName').value.trim(), email = $('#pEmail').value.trim(), err = $('#pErr');
      if (!name || !email) { err.textContent = 'Add your name and email to enroll.'; return; }
      if (!$('#pAgree').checked) { err.textContent = 'Please agree to the program agreement.'; return; }
      var c = null;
      S.clients.forEach(function (x) { if (x.email.toLowerCase() === email.toLowerCase()) c = x; });
      if (!c) {
        c = { id: 'c' + (S.nextClient++), name: name, email: email, phone: '', goals: ['stress', 'sleep'], diet: 'omnivore', plan: 'program', joined: today(), ltv: 0, autoship: false, allergies: [], pregnant: false, bloodthinner: false, thyroid: false, consent: true, intake: false, videos: {}, notes: [], fresh: true };
        c.plan_items = EG.recommend(c).picks.map(function (x) { return x.product.sku; });
        S.clients.unshift(c);
      }
      c.plan = 'program'; c.member = true; c.consent = true; c.payPlan = $('#pPlan').value === 'plan';
      c.ltv += c.payPlan ? EG.PROGRAM.plan.each : EG.PROGRAM.price;
      if (!enrollment(c.id)) S.enrollments.unshift({ client: c.id, week: 1, assess: 'Booking sent', testing: 'Kit ordered', plan: 'After assessment', pay: c.payPlan ? '1 of 3 paid' : 'Paid in full', zoom: 0, start: today() });
      S.orders.push({ id: 'EG-' + (S.nextOrder++), client: c.id, at: today(), items: [['PE-DRN', 1]], stage: 0, sub: false, discount: EG.PROGRAM.discount });
      S.emails.unshift({ at: today(), to: c.id, kind: 'Program welcome', subject: 'Welcome to WPMP Course' });
      activity(c.name + ' enrolled in WPMP Course. Welcome pack, Zoom invites and week 1 sent.');
      save();
      ui.enrollDone = c.id; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------------- router */
  var BIND = { messages: bindMessages, intake: bindIntake, clients: bindClients, schedule: bindSchedule, newsletter: bindNewsletter, shop: bindShop, videos: bindVideos, agreements: bindAgreements, program: bindProgram };

  function render() {
    var v = VIEWS[ui.view] ? ui.view : 'dashboard';
    $('#view').innerHTML = VIEWS[v]();
    $$('.nav').forEach(function (n) { n.classList.toggle('is-on', n.getAttribute('data-view') === v); });
    document.body.classList.toggle('clientmode', v === 'client');
    document.body.classList.toggle('clientdesk', v === 'client' && !!ui.ca && ui.ca.device === 'desktop');
    $$('[data-mode]').forEach(function (b) { b.classList.toggle('is-on', (b.getAttribute('data-mode') === 'client') === (v === 'client')); });
    $$('#view [data-go]').forEach(function (b) {
      b.addEventListener('click', function () { if (b.getAttribute('data-tab')) ui.shopTab = b.getAttribute('data-tab'); go(b.getAttribute('data-go')); });
    });
    if (BIND[v]) BIND[v]();
    renderDrawer();
  }
  function go(v) {
    if (!VIEWS[v]) v = 'dashboard';
    if (v !== 'intake') ui.intakeDone = null;
    if (v !== 'program') ui.enrollDone = null;
    if (v !== 'client') ui.lastAdmin = v;
    ui.view = v; ui.drawer = null;
    try { if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v); } catch (e) { /* framed: ignore */ }
    render();
    window.scrollTo(0, 0);
  }
  function reset() {
    S = EG.seed(); save();
    ui.intakeDone = null; ui.log = []; ui.q = ''; ui.recordsTab = 'clients'; ui.schedTab = 'list'; ui.shopTab = 'pipeline'; ui.calMonth = null; ui.quoteId = 'q1';
    ui.store = { line: 'all', as: 'c1', cart: {} }; ui.progTab = 'sales'; ui.enrollDone = null; ui.progStudent = 'c1'; ui.confirming = null; ui.simulating = false; ui.ca = null; ui.wq = null; ui.sc = null; ui.au = null; ui.oc = null; ui.cp = null; ui.pc = null;
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $$('.nav').forEach(function (n) { n.addEventListener('click', function () { go(n.getAttribute('data-view')); }); });
    $('#resetBtn').addEventListener('click', function () { reset(); go('dashboard'); toast('Sample data restored'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.drawer && !document.body.classList.contains('touring')) closeDrawer(); });
    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-mode') === 'client' ? 'client' : (ui.lastAdmin || 'dashboard')); });
    });
    var h = location.hash.slice(1);
    ui.view = VIEWS[h] ? h : (/^\/app\b/.test(location.pathname) ? 'client' : 'dashboard');
    render();
  });

  window.App = {
    go: go, reset: reset, render: render, ui: ui, openClient: openClient, closeDrawer: closeDrawer,
    simulateOrder: simulateOrder, approveOrder: approveOrder, state: function () { return S; }, toast: toast,
    /* Put back a saved copy of the data. The tour uses it to rewind. */
    restore: function (data) { S = data; save(); },
    /* For the screens that live in their own files (client.js, queue.js). */
    register: function (name, view, bind) { VIEWS[name] = view; if (bind) BIND[name] = bind; },
    util: {
      esc: esc, money: money, fmtDate: fmtDate, fmtTime: fmtTime, first: first, initials: initials, client: client,
      today: today, save: save, toast: toast, activity: activity, bottle: bottle, orderTotal: orderTotal, orderCost: orderCost,
      head: head, pitch: pitch, stat: stat, enrollment: enrollment, $: $, $$: $$
    }
  };
})();
