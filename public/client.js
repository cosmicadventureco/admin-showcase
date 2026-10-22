/* Evergrove Wellness showcase - the client app.
 *
 * What a client uses, separate from the team's console: a free plan from a
 * short questionnaire, one-tap ordering of what was suggested, free classes,
 * short courses ($59-$119), practitioner sessions, and for Premium members their course, Zoom and member
 * pricing. It reads and writes the same store as the console, so an order
 * placed here appears in the team's approval queue straight away.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  var STAGES = ['Being checked by our team', 'Sent to the pharmacy', 'Being packed', 'On its way', 'Delivered'];
  var PREVIEW = [['', 'New visitor'], ['c10', 'Free account: Grace Whitfield'], ['c1', 'Premium member: Priya Raman'], ['c7', 'Premium member: Aiko Tanaka']];

  function S() { return App.state(); }
  function st() {
    if (!App.ui.ca) App.ui.ca = { device: window.innerWidth >= 1000 ? 'desktop' : 'mobile', rep: null, as: '', tab: 'home', cart: {}, sub: false, step: 1, quiz: { goals: [], allergies: [] }, sheet: null, filter: 'all', line: 'all', book: { who: 'p1', long: false, day: 0, time: '' } };
    return App.ui.ca;
  }
  /* Auto-ship credit per refill, set on the Auto-ship refills automation. */
  function credit() { return window.EGAuto ? EGAuto.setting('refills', 'credit') : 5; }
  function me() { return st().as ? U.client(st().as) : null; }
  function memberPrice(p, c) { return c && c.member ? p.price * (1 - EG.PROGRAM.discount) : p.price; }
  function cartCount() { var c = st().cart; return Object.keys(c).reduce(function (t, k) { return t + c[k]; }, 0); }
  function priceTag(p, c) {
    return '<span class="price">' + money(memberPrice(p, c)) + (c && c.member ? ' <s class="muted small">' + money(p.price) + '</s>' : '') + '</span>';
  }
  function thumb(v, big) {
    return '<div class="thumb' + (big ? ' big' : '') + '" style="--h:' + v.hue + '"><span class="play"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#233027"/></svg></span><span class="dur">' + v.mins + ' min</span></div>';
  }
  /* Free classes and short courses that match this person's goals, best first. */
  function suggested(c) {
    var goals = c ? c.goals : [];
    return EG.VIDEOS.map(function (v) { return { v: v, s: v.goals.filter(function (g) { return goals.indexOf(g) >= 0; }).length + (v.access === 'paid' ? 0.5 : 0) }; })
      .filter(function (x) { return x.s >= 1; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.v; });
  }
  function accessBtn(v, c) {
    var a = EG.videoAccess(v, c);
    if (a === 'locked') return '<button class="btn honey small" data-cbuy="' + v.id + '">' + money(v.price, false) + '</button>';
    return '<button class="btn small" data-cwatch="' + v.id + '">Watch</button>';
  }
  function accessPill(v, c) {
    var a = EG.videoAccess(v, c);
    return a === 'free' ? '<span class="pill ok">Free</span>' : a === 'included' ? '<span class="pill ok">Included</span>' : a === 'owned' ? '<span class="pill ok">Yours</span>' : '<span class="pill honey">Short course</span>';
  }

  /* ------------------------------------------------------------- screens */
  function guestHome() {
    return '<div class="ca-hero"><p class="eyebrow">Evergrove Wellness</p><h2>Feel your best, with practitioners who know you</h2>' +
      '<p class="muted">Answer a few questions for your free wellness snapshot and classes picked for you. It takes about three minutes.</p>' +
      '<button class="btn honey ca-wide" id="caStart">Get my free snapshot</button></div>' +
      '<h3 class="ca-h">How it works</h3><ol class="ca-steps"><li><b>Answer a few questions</b><span>Your goals, how you eat, anything we should know.</span></li><li><b>Get your snapshot</b><span>What we would look at first, and free classes to start with.</span></li><li><b>Go further with us</b><span>Book a session, or join the Premium Course for your personal protocol.</span></li></ol>' +
      '<h3 class="ca-h">Two ways to work with us</h3>' + tiers();
  }
  function tiers() {
    return '<div class="ca-tiers"><div class="ca-tier"><b>Free account</b><span class="ca-tprice">$0</span><ul><li>Wellness snapshot</li><li>Free classes</li><li>Short courses ' + money(59, false) + ' to ' + money(119, false) + '</li><li>Sessions from ' + money(EG.SESSION.base, false) + '</li></ul></div>' +
      '<div class="ca-tier hi"><b>Premium Course</b><span class="ca-tprice">' + money(EG.PROGRAM.price, false) + '</span><ul><li>Your personal protocol</li><li>Energetics scan and report</li><li>12 weeks, built around you</li><li>Weekly live Zoom</li><li>Every short course included</li><li>Remedies from our shop</li></ul></div></div>';
  }

  function quiz() {
    var q = st().quiz, step = st().step;
    var dots = '<div class="ca-dots">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
    if (step === 1) {
      return dots + '<h2 class="ca-title">What would you like help with?</h2><p class="muted small">Choose up to three.</p><div class="chips">' +
        EG.GOALS.map(function (g) { return '<button class="chip' + (q.goals.indexOf(g.id) >= 0 ? ' is-on' : '') + '" data-cgoal="' + g.id + '">' + esc(g.label) + '</button>'; }).join('') +
        '</div><button class="btn ca-wide" id="caNext"' + (q.goals.length ? '' : ' disabled') + '>Next</button>';
    }
    if (step === 2) {
      return dots + '<h2 class="ca-title">A little about you</h2>' +
        '<label for="caDiet">How do you eat?</label><select id="caDiet"><option value="omnivore">Everything</option><option value="pescatarian">Pescatarian</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option></select>' +
        '<label style="margin-top:1rem">Any allergies?</label><div class="chips">' + ['fish', 'shellfish', 'soy', 'gluten', 'dairy'].map(function (a) { return '<button class="chip' + (q.allergies.indexOf(a) >= 0 ? ' is-on' : '') + '" data-callergy="' + a + '">' + a[0].toUpperCase() + a.slice(1) + '</button>'; }).join('') + '</div>' +
        '<label style="margin-top:1rem">Do any of these apply?</label><div class="grid" style="gap:.5rem">' +
        '<label class="check"><input type="checkbox" id="caPreg"> Pregnant, breastfeeding or trying</label><label class="check"><input type="checkbox" id="caBlood"> I take a blood thinner</label><label class="check"><input type="checkbox" id="caThy"> Thyroid condition or medication</label></div>' +
        '<button class="btn ca-wide" id="caNext">Next</button>';
    }
    return dots + '<h2 class="ca-title">Where should we send your snapshot?</h2>' +
      '<label for="caName">Your name</label><input id="caName" type="text" autocomplete="off">' +
      '<label for="caEmail" style="margin-top:.8rem">Email</label><input id="caEmail" type="email" autocomplete="off">' +
      '<label class="check" style="margin-top:1rem"><input type="checkbox" id="caConsent"> I agree to the wellness consent. My answers are private.</label>' +
      '<p class="small" id="caErr" style="color:var(--bad);min-height:1.2em"></p><button class="btn honey ca-wide" id="caFinish">See my snapshot</button>';
  }

  function canShop(c) {
    return c.member || c.plan === 'monthly' || c.plan === 'vip' || S().bookings.some(function (b) { return b.guests.indexOf(c.id) >= 0 && b.date < U.today(); });
  }
  function home(c) {
    var e = U.enrollment(c.id), mod = e ? EG.MODULES[e.week - 1] : null, pr = EGProto.activeFor(c.id), picks = suggested(c).slice(0, 3);
    var head = '<p class="eyebrow" style="margin:0">Good morning</p><h2 class="ca-title" style="margin-top:.1rem">' + esc(U.first(c.name)) + '</h2>' +
      '<div class="pills" style="margin-bottom:1rem">' + (c.member ? '<span class="pill ok">Premium member &middot; week ' + e.week + ' of 12</span>' : '<span class="pill">Free account</span>') + '</div>';
    var due = window.EGForms ? EGForms.outstanding(c) : [], next = upcoming(c)[0];
    head += due.map(function (f) { return '<div class="ca-card ca-due row" style="justify-content:space-between;flex-wrap:nowrap" data-tour="ca-form"><span class="small"><b>' + esc(f.title) + '</b><br><span class="muted">' + esc(f.kind) + ' to sign before your next session</span></span><button class="btn honey small" data-csign="' + f.id + '">Sign</button></div>'; }).join('') +
      (next ? '<div class="ca-card row" style="justify-content:space-between;flex-wrap:nowrap"><span class="small"><b>Next: ' + esc(EGCal.label(next)) + '</b><br><span class="muted">' + U.fmtDate(next.date, { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + U.fmtTime(next.time) + (next.zoom ? ' &middot; Zoom' : ' &middot; ' + esc(next.where)) + '</span></span><button class="btn small" data-ctab="appts">View</button></div>' : '');
    if (c.member) {
      var sc = scanFor(c);
      return head +
        (pr ? '<div class="ca-card" data-tour="ca-today"><div class="row" style="justify-content:space-between"><b>Today&rsquo;s protocol</b><button class="linkish" data-ctab="protocol">Open</button></div>' + todayList(pr, true) + '</div>' : '<div class="ca-card"><b>Your protocol</b><p class="small muted" style="margin:.2rem 0 0">Your practitioner is preparing it' + (sc && sc.status === 'published' ? ' from your scan report' : ' after your scan') + '.</p></div>') +
        (sc && sc.status === 'published' ? '<div class="ca-card ca-scan" data-tour="ca-scan"><span class="grow small"><b>Your scan report</b><br><span class="muted">Resonance Map &middot; ' + U.fmtDate(sc.date, { month: 'short', day: 'numeric' }) + '</span></span><button class="btn small" data-ctab="reports">Open</button></div>' : '') +
        '<div class="ca-card ca-prog" data-tour="ca-week"><div class="row" style="justify-content:space-between"><b>This week</b><span class="small muted num">' + Math.round(e.week / 12 * 100) + '%</span></div><div class="bar" style="margin:.4rem 0 .6rem"><i style="width:' + Math.round(e.week / 12 * 100) + '%"></i></div>' +
        '<div class="small">Week ' + e.week + ': ' + esc(mod.track ? EG.trackFor(c.goals) : mod.title) + '</div><button class="btn small" data-ctab="videos" style="margin-top:.6rem">Continue</button></div>' +
        '<div class="ca-card row" style="justify-content:space-between;flex-wrap:nowrap" data-tour="ca-msgcard"><span class="small"><b>Message ' + esc(U.first(c.practitioner)) + '</b><br><span class="muted">Questions about your protocol, an order or a class</span></span><button class="btn small" data-ctab="msg">Message</button></div>' +
        '<div class="ca-card row" style="justify-content:space-between" data-tour="ca-zoom"><span><b>Live Zoom</b><br><span class="small muted">Thursday 6:00pm &middot; with ' + esc(EG.PRACTITIONERS[1].name) + '</span></span><button class="btn small" id="caZoom">Join</button></div>';
    }
    return head +
      '<div class="ca-card" data-tour="ca-snapshot"><b>Your wellness snapshot</b><p class="small" style="margin:.3rem 0 .5rem">You told us you want help with ' + c.goals.map(function (g) { return esc(EG.goalLabel(g).toLowerCase()); }).join(', ') + '. A practitioner would look at how these connect before suggesting anything to take.</p>' +
      '<p class="small muted" style="margin:0">Remedy and supplement recommendations are made for you in the Premium Course, from your scan and a practitioner&rsquo;s review.</p></div>' +
      '<h3 class="ca-h">Picked for you</h3><div data-tour="ca-picked">' + picks.map(function (v) { return videoRow(v, c); }).join('') + '</div>' +
      '<div class="ca-card row" style="justify-content:space-between;flex-wrap:nowrap;margin-top:.8rem"><span class="small"><b>Talk to a Certified Practitioner</b><br><span class="muted">30 minutes, ' + money(EG.sessionPrice(false, c)) + '</span></span><button class="btn small" data-ctab="book">Book</button></div>' +
      '<div class="ca-card row" style="justify-content:space-between;flex-wrap:nowrap" data-tour="ca-msgcard"><span class="small"><b>Message ' + esc(U.first(c.practitioner)) + '</b><br><span class="muted">Questions about your protocol, an order or a class</span></span><button class="btn small" data-ctab="msg">Message</button></div>' +
      '<div class="ca-card ca-up" data-tour="ca-upsell"><p class="eyebrow" style="margin:0">Premium Course &middot; ' + money(EG.PROGRAM.price, false) + '</p><b>Your personal protocol, built with a practitioner</b><ul class="ca-ben">' + EG.PROGRAM.includes.slice(0, 6).map(function (x) { return '<li>' + esc(x[0]) + '</li>'; }).join('') + '</ul><button class="btn honey small" id="caProgram">See everything included</button></div>';
  }
  /* The thread with their practitioner. Replies come from the Client Portal. */
  function thread(c) { return (S().messages || []).filter(function (m) { return m.client === c.id; }); }
  function unseen(c) { return thread(c).filter(function (m) { return m.from === 'team' && m.seen === false; }).length; }
  function messages(c) {
    var th = thread(c);
    return '<h2 class="ca-title">Messages</h2><p class="small muted" style="margin-top:-.4rem">With ' + esc(c.practitioner) + ' and the Evergrove team. We usually reply within a day.</p>' +
      '<div class="thread" data-tour="ca-thread">' + (th.length ? th.map(function (m) { return '<div class="bub ' + (m.from === 'client' ? 'me' : 'them') + '">' + esc(m.text) + '<span class="bub-m">' + (m.from === 'client' ? 'You' : esc(m.by)) + ' &middot; ' + U.fmtDate(m.at, { month: 'short', day: 'numeric' }) + '</span></div>'; }).join('') : '<p class="small muted">No messages yet. Ask anything about your protocol, an order or a class.</p>') + '</div>' +
      '<div class="msgbox"><textarea id="caMsg" rows="2" placeholder="Write a message"></textarea><button class="btn small" id="caMsgSend">Send</button></div>';
  }
  /* Today's doses from a protocol, grouped by time of day, ticked off as taken. */
  function todayList(pr, short) {
    var taken = st().taken || {};
    return EG.TIMES.map(function (t) {
      var rows = pr.items.filter(function (x) { return x.times.indexOf(t[0]) >= 0; });
      if (!rows.length) return '';
      var done = taken[t[0]];
      return '<div class="ca-slot' + (done ? ' done' : '') + '"><button class="ca-tick" data-ctake="' + t[0] + '" aria-label="Mark ' + t[1] + ' as taken">' + (done ? '&#10003;' : '') + '</button><div class="grow small"><b>' + t[1] + '</b> <span class="muted">' + t[2] + '</span><br>' + rows.map(function (x) { return esc(EG.product(x.sku).name) + ' <span class="muted">' + esc(x.dose) + '</span>'; }).join(short ? ', ' : '<br>') + '</div></div>';
    }).join('');
  }
  /* Appointments: what is coming up, with the Zoom link, then booking. */
  function upcoming(c) { var t = U.today(); return S().bookings.filter(function (b) { return b.guests.indexOf(c.id) >= 0 && b.date >= t; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }); }
  function apptRow(b, past) {
    return '<div class="ca-card ca-appt"><div class="ca-adate"><b>' + U.fmtDate(b.date, { day: 'numeric' }) + '</b>' + U.fmtDate(b.date, { month: 'short' }) + '</div><div class="grow small"><b>' + esc(EGCal.label(b)) + '</b><br><span class="muted">' + U.fmtDate(b.date, { weekday: 'long' }) + ' at ' + U.fmtTime(b.time) + ' &middot; with ' + esc(EGCal.prac(b)) + '</span>' +
      (!past && b.zoom ? '<br><span class="muted">Zoom ' + b.zoom + '</span>' : !past ? '<br><span class="muted">' + esc(b.where) + '</span>' : '') + '</div>' +
      (past ? '<span class="pill">Done</span>' : b.zoom ? '<button class="btn small" data-czoom="' + b.id + '">Join Zoom</button>' : '') + '</div>';
  }
  function apptsScreen(c) {
    var t = U.today(), up = upcoming(c), past = S().bookings.filter(function (b) { return b.guests.indexOf(c.id) >= 0 && b.date < t; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return '<h2 class="ca-title">Appointments</h2><div data-tour="ca-appts">' + (up.length ? up.map(function (b) { return apptRow(b, false); }).join('') : '<p class="small muted">Nothing booked yet.</p>') + '</div>' +
      (past.length ? '<h3 class="ca-h">Past</h3>' + past.slice(0, 3).map(function (b) { return apptRow(b, true); }).join('') : '') +
      '<div class="ca-split">' + book(c) + '</div>';
  }

  /* Billing: every payment, what is due next, and the card on file. */
  function billingScreen(c) {
    var pays = EGPortal.payments(c), paid = pays.filter(function (p) { return p[3] === 'Paid'; }).reduce(function (t, p) { return t + p[2]; }, 0);
    var due = pays.filter(function (p) { return p[3] === 'Scheduled' || p[3] === 'Failed'; }), e = U.enrollment(c.id);
    return '<h2 class="ca-title">Billing &amp; payments</h2><div class="ca-stats" data-tour="ca-billing"><div class="ca-card"><span class="small muted">Paid so far</span><b class="price">' + money(paid, false) + '</b></div><div class="ca-card"><span class="small muted">' + (due.length ? (due[0][3] === 'Failed' ? 'Payment failed' : 'Next payment ' + U.fmtDate(due[0][0], { month: 'short', day: 'numeric' })) : 'Next payment') + '</span><b class="price">' + (due.length ? money(due[0][2], false) : 'None due') + '</b></div></div>' +
      (e && e.payIssue ? '<div class="ca-note">Your last course payment did not go through. Please update your card.</div>' : '') +
      '<div class="ca-card row" style="justify-content:space-between"><span class="small"><b>Card on file</b><br><span class="muted">' + esc(c.card) + '</span></span><button class="btn ghost small" id="caCard">Update</button></div>' +
      (e ? '<div class="ca-card"><b class="small">Premium Course</b><div class="small muted">' + (/Paid in full/.test(e.pay) ? 'Paid in full, ' + money(EG.PROGRAM.price, false) : '3 payments of ' + money(EG.PROGRAM.plan.each, false) + ' &middot; ' + esc(e.pay)) + '</div></div>' : '') +
      '<h3 class="ca-h">History</h3><div class="ca-card ca-ledger">' + (pays.length ? pays.map(function (p) { return '<div class="ca-lrow"><span class="grow small"><b>' + esc(p[1]) + '</b><br><span class="muted">' + U.fmtDate(p[0]) + '</span></span><span class="small" style="text-align:right"><b class="num">' + money(p[2]) + '</b><br>' + (p[3] === 'Paid' ? '<button class="linkish" data-creceipt="1">Receipt</button>' : '<span class="' + (p[3] === 'Failed' ? 'bad' : 'muted') + '">' + p[3] + '</span>') + '</span></div>'; }).join('') : '<p class="small muted" style="margin:0">No payments yet.</p>') + '</div>';
  }

  function protocolScreen(c) {
    var pr = EGProto.activeFor(c.id);
    if (!pr) return '<h2 class="ca-title">Protocols</h2><p class="small muted">Your practitioner is preparing your protocol. It appears here with daily reminders once it is ready.</p>';
    var old = S().protocols.filter(function (p) { return p.client === c.id && p.status !== 'active'; });
    return '<h2 class="ca-title">Protocols</h2><p class="small muted" style="margin-top:-.4rem">Reminders at ' + EG.TIMES.map(function (t) { return t[2]; }).join(', ') + '.</p>' +
      '<div class="ca-card" data-tour="ca-protocol">' + todayList(pr, false) + '</div>' +
      '<button class="btn honey ca-wide" id="caOrderProto">Order my remedies</button>' +
      '<h3 class="ca-h">Your protocol report</h3><div>' + EGProto.doc(pr, true) + '</div>' +
      (old.length ? '<h3 class="ca-h">Earlier protocols</h3>' + old.map(function (p) { return '<div class="ca-card small"><b>Protocol from ' + U.fmtDate(p.start) + '</b><br><span class="muted">' + p.items.length + ' remedies &middot; ' + esc(p.by) + '</span></div>'; }).join('') : '');
  }

  function scanFor(c) {
    return S().scans.filter(function (x) { return x.client === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0] || null;
  }
  function reportsScreen(c) {
    var ca = st(), list = S().scans.filter(function (x) { return x.client === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var pub = list.filter(function (x) { return x.status === 'published'; });
    if (ca.rep && pub.some(function (x) { return x.id === ca.rep; })) return reportScreen(c, ca.rep);
    return '<h2 class="ca-title">Client reports</h2><p class="small muted" style="margin-top:-.4rem">Your energetic scan reports, reviewed and signed off by your practitioner.</p><div data-tour="ca-reports">' +
      (list.length ? list.map(function (x) {
        return '<div class="ca-card row" style="justify-content:space-between;flex-wrap:nowrap"><span class="docicon">RPT</span><span class="grow small"><b>Resonance Map</b><br><span class="muted">' + (x.status === 'published' ? 'Scan of ' + U.fmtDate(x.date, { month: 'short', day: 'numeric', year: 'numeric' }) + ' &middot; signed off by ' + esc(x.by) : x.status === 'booked' ? 'Scan booked for ' + U.fmtDate(x.date) : 'Your practitioner is preparing it') + '</span></span>' + (x.status === 'published' ? '<button class="btn small" data-crep="' + x.id + '">Open</button>' : '<span class="pill">' + (x.status === 'booked' ? 'Booked' : 'In progress') + '</span>') + '</div>';
      }).join('') : '<p class="small muted">Your reports appear here after your energetic scan.</p>') + '</div>';
  }
  function reportScreen(c, id) {
    var sc = id ? S().scans.filter(function (x) { return x.id === id; })[0] : scanFor(c);
    if (!sc || sc.status !== 'published') return '<h2 class="ca-title">Your scan report</h2><p class="small muted">' + (sc && sc.status === 'booked' ? 'Your energetics scan is booked for ' + U.fmtDate(sc.date) + '. Your report appears here once your practitioner has reviewed it.' : 'Your practitioner is reviewing your scan. We will email you as soon as your report is ready.') + '</p>';
    var rem = EGScan.remedies(sc.data).slice(0, sc.data.limit).filter(function (x) { return EGScan.inShop(x.item); });
    return '<button class="linkish" id="caRepBack" style="padding-left:0">&larr; All reports</button>' + EGScan.reportHtml(sc, true) +
      '<div class="ca-card" style="margin-top:1rem"><b>Order your remedies</b><p class="small muted" style="margin:.2rem 0 0">' + rem.length + ' remedies from your report' + (c.member ? ', at your 20% member price with free shipping' : '') + '. Your practitioner checks every order before it ships.</p><button class="btn honey ca-wide" id="caAddRem">Add my remedies to cart</button></div>';
  }

  function videoRow(v, c) {
    return '<div class="ca-vrow" data-vid="' + v.id + '">' + thumb(v) + '<div class="grow"><b class="small">' + esc(v.title) + '</b><div class="small muted">' + (v.lessons ? v.lessons + ' lessons &middot; ' : '') + v.mins + ' min</div>' + accessPill(v, c) + '</div>' + accessBtn(v, c) + '</div>';
  }
  function videos(c) {
    var f = st().filter;
    var list = EG.VIDEOS.filter(function (v) { return f === 'all' || (f === 'free' ? v.access === 'free' : v.access === 'paid'); });
    return '<h2 class="ca-title">Courses</h2>' +
      (c.member ? '<div class="ca-note ok">Every short course is included in your Premium Course, and you can download them.</div>' : '<div class="ca-note">Free classes are yours to watch. Short courses are ' + money(59, false) + ' to ' + money(119, false) + ', yours to keep, with downloads and workbooks.</div>') +
      '<h3 class="ca-h">Picked for you</h3><div data-tour="ca-picked">' + suggested(c).slice(0, 3).map(function (v) { return videoRow(v, c); }).join('') + '</div>' +
      '<h3 class="ca-h">All courses and classes</h3><div class="chips" style="margin-bottom:.6rem">' + [['all', 'All'], ['free', 'Free classes'], ['paid', 'Short courses']].map(function (x) { return '<button class="chip' + (f === x[0] ? ' is-on' : '') + '" data-cfilter="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      list.map(function (v) { return videoRow(v, c); }).join('');
  }

  /* Next five weekdays, as ISO dates. */
  function weekdays() {
    var out = [], d = new Date();
    while (out.length < 5) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); if (d.getDay() % 6) out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); }
    return out;
  }
  var SLOTS = ['09:00', '10:30', '13:00', '15:30', '17:00'];
  function book(c) {
    var b = st().book, days = weekdays(), pr = EG.CERTIFIED.filter(function (p) { return p.id === b.who; })[0];
    var full = EG.sessionPrice(b.long, c), used = Math.min(c.credit || 0, full), price = full - used;
    return '<h2 class="ca-title">Book a session</h2><p class="small muted" style="margin-top:-.4rem">One-to-one with a Certified Practitioner, by video call.</p>' +
      '<h3 class="ca-h">Who</h3><div data-tour="ca-who">' + EG.CERTIFIED.map(function (p) {
        return '<button class="ca-pract' + (p.id === b.who ? ' is-on' : '') + '" data-cwho="' + p.id + '"><span class="av" style="background:hsl(' + p.hue + ' 35% 85%);color:#233027">' + U.initials(p.name.replace('Dr. ', '')) + '</span><span class="small"><b>' + esc(p.name) + '</b><br><span class="muted">' + esc(p.role) + '</span></span></button>';
      }).join('') + '</div>' +
      '<h3 class="ca-h">How long</h3><div class="ca-len" data-tour="ca-len"><button class="' + (!b.long ? 'is-on' : '') + '" data-clong="0"><b>30 minutes</b><span>' + money(EG.sessionPrice(false, c)) + '</span></button><button class="' + (b.long ? 'is-on' : '') + '" data-clong="1"><b>1 hour</b><span>+' + money(c.member ? EG.SESSION.upgrade * (1 - EG.SESSION.premiumOff) : EG.SESSION.upgrade) + ' upgrade</span></button></div>' +
      '<h3 class="ca-h">When</h3><div class="chips" style="margin-bottom:.5rem">' + days.map(function (d, i) { return '<button class="chip' + (b.day === i ? ' is-on' : '') + '" data-cday="' + i + '">' + U.fmtDate(d, { weekday: 'short', day: 'numeric' }) + '</button>'; }).join('') + '</div>' +
      '<div class="chips">' + SLOTS.map(function (t) { return '<button class="chip' + (b.time === t ? ' is-on' : '') + '" data-ctime="' + t + '">' + U.fmtTime(t) + '</button>'; }).join('') + '</div>' +
      '<div class="ca-card" style="margin-top:1rem" data-tour="ca-booksum"><div class="small"><b>' + (b.long ? '1 hour' : '30 minutes') + ' with ' + esc(pr.name) + '</b><br><span class="muted">' + (b.time ? U.fmtDate(days[b.day], { weekday: 'long', month: 'short', day: 'numeric' }) + ' at ' + U.fmtTime(b.time) : 'Pick a time') + '</span></div>' +
      (c.member ? '<div class="small" style="color:var(--ok);margin-top:.3rem">Premium discount: 25% off</div>' : '') +
      (used ? '<div class="small" style="color:var(--ok);margin-top:.3rem">Auto-ship credit: &minus;' + money(used) + '</div>' : '') +
      '<button class="btn paybtn ca-wide" id="caBookPay"' + (b.time ? '' : ' disabled') + '>Pay ' + money(price) + ' and book</button></div>';
  }

  function shop(c) {
    var l = st().line;
    if (!canShop(c)) return '<h2 class="ca-title">Shop</h2><div class="ca-card" data-tour="ca-shoplock"><b>Remedies are chosen with a practitioner</b><p class="small muted" style="margin:.3rem 0 .7rem">Our remedies are available once you have had a consultation, or as part of the Premium Course. That way what you take is chosen for you, not guessed.</p><button class="btn small" data-ctab="book">Book a session</button> <button class="btn honey small" id="caProgram2">Premium Course</button></div>';
    return '<h2 class="ca-title">Shop</h2>' + (c.member ? '<div class="ca-note ok">Member pricing: 20% off everything.</div>' : '') +
      '<div class="chips" style="margin-bottom:.6rem">' + [['all', 'All'], ['milieu', 'Milieu'], ['code', 'Codes'], ['tox', 'Tox'], ['desbio', 'DesBio'], ['nutri', 'Nutritionals']].map(function (x) { return '<button class="chip' + (l === x[0] ? ' is-on' : '') + '" data-cline="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      EG.PRODUCTS.filter(function (p) { return l === 'all' || p.line === l; }).map(function (p) {
        return '<div class="ca-mini">' + U.bottle(p, true) + '<span class="grow small"><b>' + esc(p.name) + '</b><br><span class="muted">' + esc(EG.LINES[p.line].kind) + '</span></span>' + priceTag(p, c) + '<button class="btn ghost small" data-cadd="' + p.sku + '">' + (st().cart[p.sku] ? 'Added' : 'Add') + '</button></div>';
      }).join('');
  }

  function account(c) {
    var orders = S().orders.filter(function (o) { return o.client === c.id; }).slice().reverse();
    var owned = EG.VIDEOS.filter(function (v) { var a = EG.videoAccess(v, c); return a === 'owned' || a === 'included'; });
    return '<h2 class="ca-title">' + esc(c.name) + '</h2><p class="small muted" style="margin-top:-.4rem">' + esc(c.email) + ' &middot; ' + (c.member ? 'Premium member' : 'Free account') + '</p>' +
      (c.autoship || c.credit ? '<div class="ca-card row" style="justify-content:space-between"><span class="small"><b>Auto-ship credit</b><br><span class="muted">$' + credit() + ' added with each refill. Use it on a session or short course.</span></span><span class="price">' + money(c.credit || 0) + '</span></div>' : '') +
      '<h3 class="ca-h">Orders</h3><div data-tour="ca-orders">' + (orders.length ? orders.map(function (o) {
        return '<div class="ca-card"><div class="row" style="justify-content:space-between"><b class="small">' + o.id + '</b><span class="price small">' + money(U.orderTotal(o)) + '</span></div><div class="small muted">' + o.items.map(function (it) { return EG.product(it[0]).name; }).join(', ') + '</div>' +
          '<div class="ca-track">' + STAGES.map(function (s, i) { return '<span class="' + (i <= o.stage ? 'on' : '') + '"></span>'; }).join('') + '</div><div class="small"><b>' + STAGES[o.stage] + '</b>' + (o.tracking && o.stage >= 3 ? ' &middot; <span class="num">' + o.tracking + '</span>' : '') + '</div></div>';
      }).join('') : '<p class="small muted">No orders yet.</p>') + '</div>' +
      (c.autoship ? '<h3 class="ca-h">Refills</h3><div class="ca-card row" style="justify-content:space-between"><span class="small"><b>Next refill in 9 days</b><br><span class="muted">' + (c.plan_items || []).length + ' items, every 30 days</span></span><span class="row"><button class="btn ghost small" data-crefill="skip">Skip</button><button class="btn ghost small" data-crefill="pause">Pause</button></span></div>' : '') +
      '<h3 class="ca-h">My classes</h3>' + (owned.length ? owned.slice(0, 4).map(function (v) { return videoRow(v, c); }).join('') : '<p class="small muted">Classes you buy appear here, yours to keep.</p>') +
      '<h3 class="ca-h">Questions?</h3><div class="ca-card row" style="justify-content:space-between"><span class="small">Message ' + esc(c.practitioner) + '</span><button class="btn small" data-ctab="msg">Messages</button></div>' +
      '<button class="linkish" id="caSignOut" style="margin-top:1rem">Sign out</button>';
  }

  /* ------------------------------------------------------------- sheets */
  function sheet() {
    var sh = st().sheet, c = me();
    if (!sh) return '';
    var body = '';
    if (sh.type === 'cart') {
      var cart = st().cart, keys = Object.keys(cart);
      var sub = keys.reduce(function (t, k) { return t + EG.product(k).price * cart[k]; }, 0);
      var mem = c && c.member ? sub * EG.PROGRAM.discount : 0;
      var net = sub - mem, ship = (c && c.member) || net >= 75 || !keys.length ? 0 : 6.95;
      body = '<h3 class="ca-title">Your cart</h3>' + (keys.length ? keys.map(function (k) { var p = EG.product(k); return '<div class="ca-mini">' + U.bottle(p, true) + '<span class="grow small"><b>' + esc(p.name) + '</b></span><span class="row" style="flex-wrap:nowrap;gap:.3rem"><button class="qty" data-cqty="' + k + '" data-d="-1" aria-label="Remove one">&minus;</button><span class="num small">' + cart[k] + '</span><button class="qty" data-cqty="' + k + '" data-d="1" aria-label="Add one">+</button></span></div>'; }).join('') +
        '<div class="carttot"><div class="row" style="justify-content:space-between"><span>Subtotal</span><span class="num">' + money(sub) + '</span></div>' +
        (mem ? '<div class="row" style="justify-content:space-between;color:var(--ok)"><span>Member 20%</span><span class="num">&minus;' + money(mem) + '</span></div>' : '') +
        (st().sub ? '<div class="row small" style="justify-content:space-between;color:var(--ok)"><span>Auto-ship on: $' + credit() + ' credit per refill</span><span>toward sessions</span></div>' : '') +
        '<div class="row" style="justify-content:space-between"><span>Shipping</span><span class="num">' + (ship ? money(ship) : 'Free') + '</span></div>' +
        '<div class="row" style="justify-content:space-between;font-weight:700"><span>Total</span><span class="num">' + money(net + ship) + '</span></div></div>' +
        '<button class="btn paybtn ca-wide" id="caPay">Pay ' + money(net + ship) + '</button><p class="small muted" style="text-align:center;margin:.4rem 0 0">Showcase: no payment is taken.</p>'
        : '<p class="small muted">Nothing here yet.</p>');
    } else if (sh.type === 'placed') {
      body = '<div class="check-badge" style="margin:0 auto .6rem"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg></div><h3 class="ca-title" style="text-align:center">Order placed</h3>' +
        '<p class="small muted" style="text-align:center">' + esc(sh.id) + '. A receipt is on its way to your inbox.</p><ol class="ca-steps"><li><b>Our team checks it</b><span>Usually within a few hours.</span></li><li><b>It ships from our pharmacy partner</b><span>Packed with Evergrove branding.</span></li><li><b>Tracking by email</b><span>Follow it any time under Me.</span></li></ol><button class="btn ca-wide" id="caTrack">Track my order</button>';
    } else if (sh.type === 'booked') {
      body = '<div class="check-badge" style="margin:0 auto .6rem"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg></div><h3 class="ca-title" style="text-align:center">You&rsquo;re booked</h3>' +
        '<p class="small" style="text-align:center">' + (sh.long ? '1 hour' : '30 minutes') + ' with <b>' + esc(sh.who) + '</b><br>' + U.fmtDate(sh.date, { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + U.fmtTime(sh.time) + '</p>' +
        '<p class="small muted" style="text-align:center">Paid ' + money(sh.price) + '. The calendar invite and Zoom link are in your inbox. Reschedule free up to 24 hours before.</p><button class="btn ca-wide" id="caClose2">Done</button>';
    } else if (sh.type === 'buy') {
      var v = EG.video(sh.id);
      var vUsed = Math.min((c && c.credit) || 0, v.price);
      body = thumb(v, true) + '<p class="eyebrow" style="margin:.8rem 0 0">Short course</p><h3 class="ca-title">' + esc(v.title) + '</h3><p class="small muted">' + v.lessons + ' video lessons, ' + v.mins + ' minutes in all. Yours to keep, with downloads and a workbook.</p>' +
        (vUsed ? '<p class="small" style="color:var(--ok);margin:0">Auto-ship credit: &minus;' + money(vUsed) + '</p>' : '') + '<button class="btn paybtn ca-wide" id="caPayVideo">Pay ' + money(v.price - vUsed) + '</button><p class="small muted" style="text-align:center;margin:.5rem 0 0">Every short course is included in the Premium Course.</p>';
    } else if (sh.type === 'watch') {
      var w = EG.video(sh.id), a = EG.videoAccess(w, c);
      body = '<div class="player">' + thumb(w, true) + '<div class="bar"><i id="caProg" style="width:4%"></i></div></div><h3 class="ca-title" style="margin-top:.8rem">' + esc(w.title) + '</h3><p class="small muted">Playing (showcase preview) &middot; ' + w.mins + ' min</p>' +
        (a === 'owned' || a === 'included' ? '<button class="btn ghost ca-wide" id="caDownload">Download</button>' : '');
    } else if (sh.type === 'form') {
      body = EGForms.render(EGForms.form(sh.id), true) + '<button class="btn honey ca-wide" id="caSignForm" style="margin-top:1rem">Sign and send</button>';
    } else if (sh.type === 'program') {
      body = '<p class="eyebrow">Premium Course</p><h3 class="ca-title">' + esc(EG.PROGRAM.name) + '</h3><p class="small muted">' + money(EG.PROGRAM.price, false) + ' or ' + EG.PROGRAM.plan.n + ' payments of ' + money(EG.PROGRAM.plan.each, false) + '</p>' +
        EG.PROGRAM.includes.map(function (x) { return '<div class="inc small" style="margin-bottom:.6rem"><span class="tick"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg></span><div><b>' + esc(x[0]) + '</b><br><span class="muted">' + esc(x[1]) + '</span></div></div>'; }).join('') +
        '<button class="btn honey ca-wide" id="caCall">Book a free 15-minute call</button>';
    }
    return '<div class="ca-sheet-bg" id="caSheetBg"></div><div class="ca-sheet" role="dialog"><button class="ca-x" id="caClose" aria-label="Close">&times;</button>' + body + '</div>';
  }

  /* ------------------------------------------------------------- frame */
  var ICON = {
    home: '<path d="M4 11l8-7 8 7v9H4z"/>',
    reports: '<circle cx="12" cy="12" r="8"/><path d="M4 12h3l2-4 3 8 2-4h6"/>',
    protocol: '<path d="M7 3h10v18H7z"/><path d="M10 8h4M10 12h4"/>',
    appts: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    billing: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    videos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
    shop: '<path d="M4 7h16l-1.5 12h-13z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'
  };
  function svg(k, n) { return '<svg width="' + (n || 20) + '" height="' + (n || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }
  /* The four main sections, plus Home. Courses and the shop sit under More. */
  function navFor(c) {
    var main = c.member ? [['home', 'Home'], ['reports', 'Client Reports'], ['protocol', 'Protocols'], ['appts', 'Appointments'], ['billing', 'Billing']] : [['home', 'Home'], ['videos', 'Courses'], ['appts', 'Appointments'], ['billing', 'Billing'], ['shop', 'Shop']];
    var more = c.member ? [['videos', 'Courses'], ['shop', 'Shop'], ['msg', 'Messages'], ['me', 'Account']] : [['msg', 'Messages'], ['me', 'Account']];
    return { main: main, more: more };
  }
  var SHORT = { 'Client Reports': 'Reports', Appointments: 'Appts', Protocols: 'Protocol' };

  function view() {
    var ca = st(), c0 = me();
    if (ca.tab === 'report') { ca.tab = 'reports'; }
    if (ca.tab === 'book') ca.tab = 'appts';
    if (c0 && ca.tab === 'msg') thread(c0).forEach(function (m) { if (m.from === 'team') m.seen = true; });
    var c = me(), tab = c ? ca.tab : (ca.tab === 'quiz' ? 'quiz' : 'home'), desk = ca.device === 'desktop';
    var screen = !c ? (tab === 'quiz' ? quiz() : guestHome()) : tab === 'protocol' ? protocolScreen(c) : tab === 'videos' ? videos(c) : tab === 'appts' ? apptsScreen(c) : tab === 'reports' ? reportsScreen(c) : tab === 'billing' ? billingScreen(c) : tab === 'shop' ? shop(c) : tab === 'me' ? account(c) : tab === 'msg' ? messages(c) : home(c);
    var n = cartCount(), nav = c ? navFor(c) : null;
    var brand = '<span class="brand-s"><svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="var(--deep)"/><path d="M16 7c5 3 7 8 5 13-1.5 3.5-5 5-5 5s-3.5-1.5-5-5C9 15 11 10 16 7z" fill="var(--bg)"/></svg>Evergrove</span>';
    var icons = c ? '<span class="row" style="gap:.2rem;flex-wrap:nowrap"><button class="ca-cartbtn" data-ctab="msg" id="caMsgs" aria-label="Messages">' + svg('msg') + (unseen(c) ? '<span class="ca-badge">' + unseen(c) + '</span>' : '') + '</button><button class="ca-cartbtn" data-ctab="me" id="caMe" aria-label="My account">' + svg('me') + '</button><button class="ca-cartbtn" id="caCart" aria-label="Cart">' + svg('shop') + (n ? '<span class="ca-badge">' + n + '</span>' : '') + '</button></span>' : '';
    var picker = '<label for="caAs">Preview as</label><select id="caAs">' + PREVIEW.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === ca.as ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + (ca.as && PREVIEW.every(function (p) { return p[0] !== ca.as; }) ? '<option value="' + ca.as + '" selected>' + esc(c.name) + (c.fresh ? ' (just signed up)' : (c.member ? ' (Premium member)' : '')) + '</option>' : '') + '</select>';
    var device = '<div class="seg" data-tour="device" role="group" aria-label="Device"><button class="' + (desk ? 'is-on' : '') + '" data-cdev="desktop">Desktop</button><button class="' + (!desk ? 'is-on' : '') + '" data-cdev="mobile">Mobile</button></div>';
    if (desk) {
      return '<div class="cdesk"><div class="cdesk-bar"><div><p class="eyebrow" style="margin:0">Client view</p><b>The client portal, on a computer</b></div><div class="row">' + device + '<div class="row" style="flex-wrap:nowrap">' + picker + '</div></div></div>' +
        '<div class="browser" data-tour="phone"><div class="br-chrome"><span class="br-dots"><i></i><i></i><i></i></span><span class="br-url">evergrove.example/portal</span></div>' +
        '<div class="br-top">' + brand + icons + '</div><div class="br-main">' +
        (c ? '<nav class="br-nav" data-tour="ca-nav">' + nav.main.map(function (t) { return '<button class="' + (tab === t[0] ? 'is-on' : '') + '" data-ctab="' + t[0] + '">' + svg(t[0], 18) + t[1] + '</button>'; }).join('') + '<div class="br-sep">More</div>' + nav.more.map(function (t) { return '<button class="' + (tab === t[0] ? 'is-on' : '') + '" data-ctab="' + t[0] + '">' + svg(t[0], 18) + t[1] + '</button>'; }).join('') + '</nav>' : '') +
        '<div class="br-body ph-body" id="caBody"><div class="br-inner">' + screen + '</div></div></div>' + sheet() + '</div></div>';
    }
    return '<div class="cmode"><div class="phone" data-tour="phone"><div class="ph-top">' + brand + icons + '</div>' +
      '<div class="ph-body" id="caBody">' + screen + '</div>' +
      (c ? '<nav class="ph-tabs">' + nav.main.map(function (t) { return '<button class="' + (tab === t[0] ? 'is-on' : '') + '" data-ctab="' + t[0] + '">' + svg(t[0]) + (SHORT[t[1]] || t[1]) + '</button>'; }).join('') + '</nav>' : '') +
      sheet() + '</div>' +
      '<aside class="cside"><p class="eyebrow">Client view</p><h1 class="h1">The client portal</h1><p class="lede" style="margin-bottom:1rem">What clients use, on their phone or computer, at <code>evergrove.example/portal</code>. Everything they do here shows up on your side straight away.</p>' +
      device + picker +
      '<ul class="cfeat"><li><b>Client Reports</b> Their energetic scan reports, once a practitioner has signed off.</li><li><b>Protocols</b> What to take and when, with tick-offs, reminders and the protocol report.</li><li><b>Appointments</b> Upcoming sessions with the Zoom link, and booking.</li><li><b>Billing</b> Every payment, what is due next, receipts and the card on file.</li><li><b>Free accounts</b> A wellness snapshot, free classes, short courses and booking. No product suggestions.</li></ul></aside></div>';
  }

  function bind() {
    var ca = st(), $ = U.$, $$ = U.$$;
    function rerender() { var b = $('#caBody'), top = b ? b.scrollTop : 0; App.render(); var nb = $('#caBody'); if (nb) nb.scrollTop = top; }
    function open(sh) { ca.sheet = sh; rerender(); }
    $('#caAs').addEventListener('change', function (e) { ca.as = e.target.value; ca.tab = 'home'; ca.step = 1; ca.cart = {}; ca.sheet = null; App.render(); });
    $$('[data-ctab]').forEach(function (b) { b.addEventListener('click', function () { ca.tab = b.getAttribute('data-ctab'); ca.sheet = null; ca.rep = null; App.render(); var bd = $('#caBody'); if (bd) bd.scrollTop = 0; }); });
    document.body.classList.toggle('clientdesk', ca.device === 'desktop');
    $$('[data-cdev]').forEach(function (b) { b.addEventListener('click', function () { ca.device = b.getAttribute('data-cdev'); App.render(); }); });
    $$('[data-crep]').forEach(function (b) { b.addEventListener('click', function () { ca.rep = b.getAttribute('data-crep'); rerender(); var bd = $('#caBody'); if (bd) bd.scrollTop = 0; }); });
    var rb = $('#caRepBack'); if (rb) rb.addEventListener('click', function () { ca.rep = null; rerender(); });
    $$('[data-czoom]').forEach(function (b) { b.addEventListener('click', function () { U.toast('Opening Zoom (simulated)'); }); });
    $$('[data-creceipt]').forEach(function (b) { b.addEventListener('click', function () { U.toast('Receipt emailed (simulated)'); }); });
    var cc = $('#caCard'); if (cc) cc.addEventListener('click', function () { U.toast('Opens a secure card form (simulated)'); });
    $$('[data-csign]').forEach(function (b) { b.addEventListener('click', function () { open({ type: 'form', id: b.getAttribute('data-csign') }); }); });
    var sf = $('#caSignForm');
    if (sf) sf.addEventListener('click', function () {
      var c = me(), f = EGForms.form(ca.sheet.id), name = $('.ca-sheet [data-ffsign]');
      if (name && !name.value.trim()) { U.toast('Type your name to sign.'); name.focus(); return; }
      c.forms = c.forms || {}; c.forms[f.id] = U.today();
      if (f.id === 'f1') c.consent = true; if (f.id === 'f2') c.intake = true;
      U.activity(c.name + ' signed "' + f.title + '" in the client portal. Saved to their documents.');
      U.save(); ca.sheet = null; rerender(); U.toast('Signed. A copy is in your email.');
    });
    var start = $('#caStart'); if (start) start.addEventListener('click', function () { ca.tab = 'quiz'; ca.step = 1; ca.quiz = { goals: [], allergies: [] }; App.render(); });
    /* questionnaire */
    $$('[data-cgoal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-cgoal'), q = ca.quiz.goals, i = q.indexOf(g);
        if (i >= 0) q.splice(i, 1); else if (q.length < 3) q.push(g); else { U.toast('Choose up to three.'); return; }
        rerender();
      });
    });
    $$('[data-callergy]').forEach(function (b) {
      b.addEventListener('click', function () { var a = b.getAttribute('data-callergy'), q = ca.quiz.allergies, i = q.indexOf(a); if (i >= 0) q.splice(i, 1); else q.push(a); b.classList.toggle('is-on', i < 0); });
    });
    var next = $('#caNext');
    if (next) next.addEventListener('click', function () {
      if (ca.step === 2) {
        ca.quiz.diet = $('#caDiet').value; ca.quiz.pregnant = $('#caPreg').checked; ca.quiz.bloodthinner = $('#caBlood').checked; ca.quiz.thyroid = $('#caThy').checked;
      }
      ca.step++; App.render();
    });
    var fin = $('#caFinish');
    if (fin) fin.addEventListener('click', function () {
      var name = $('#caName').value.trim(), email = $('#caEmail').value.trim();
      if (!name || !email) { $('#caErr').textContent = 'Add your name and email so we can send your plan.'; return; }
      if (!$('#caConsent').checked) { $('#caErr').textContent = 'Please agree to the wellness consent.'; return; }
      var q = ca.quiz, D = S();
      var c = { id: 'c' + (D.nextClient++), name: name, email: email, phone: '', goals: q.goals.slice(), diet: q.diet || 'omnivore', plan: 'free', joined: U.today(), ltv: 0, autoship: false,
        allergies: q.allergies.slice(), pregnant: !!q.pregnant, bloodthinner: !!q.bloodthinner, thyroid: !!q.thyroid, consent: true, intake: true, videos: {}, notes: [], fresh: true, videosOwned: [] };
      c.plan_items = EG.recommend(c).picks.map(function (x) { return x.product.sku; });
      D.clients.unshift(c);
      D.emails.unshift({ at: U.today(), to: c.id, kind: 'Snapshot', subject: 'Your free wellness snapshot' });
      U.activity(name + ' finished the free questionnaire in the client app. ' + (EGAuto.on('plan') ? 'Snapshot and suggested classes emailed' + (EGAuto.setting('plan', 'segments') ? ', added to the ' + c.goals.map(EG.goalLabel).join(', ') + ' newsletters.' : '.') : 'Plan saved; the plan email is switched off.'));
      ca.as = c.id; ca.tab = 'home'; App.render();
      U.toast('Your snapshot is ready');
    });
    /* cart */
    function add(sku) { ca.cart[sku] = (ca.cart[sku] || 0) + 1; }
    $$('[data-cadd]').forEach(function (b) { b.addEventListener('click', function () { add(b.getAttribute('data-cadd')); rerender(); }); });
    var all = $('#caAddAll');
    if (all) all.addEventListener('click', function () { var r = EG.recommend(me()); r.picks.slice(0, ca.tab === 'plan' ? 4 : 3).forEach(function (x) { if (!ca.cart[x.product.sku]) add(x.product.sku); }); open({ type: 'cart' }); });
    var sub = $('#caSub'); if (sub) sub.addEventListener('change', function () { ca.sub = sub.checked; });
    var cartBtn = $('#caCart'); if (cartBtn) cartBtn.addEventListener('click', function () { open({ type: 'cart' }); });
    $$('[data-cqty]').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-cqty'); ca.cart[k] += +b.getAttribute('data-d'); if (ca.cart[k] <= 0) delete ca.cart[k]; rerender(); });
    });
    var pay = $('#caPay');
    if (pay) pay.addEventListener('click', function () {
      var c = me(), D = S();
      var disc = c.member ? EG.PROGRAM.discount : 0;
      var o = { id: 'EG-' + (D.nextOrder++), client: c.id, at: U.today(), items: Object.keys(ca.cart).map(function (k) { return [k, ca.cart[k]]; }), stage: 0, sub: ca.sub, discount: disc, fromApp: true };
      D.orders.push(o);
      if (ca.sub) { c.autoship = true; c.credit = (c.credit || 0) + credit(); }
      c.ltv += U.orderTotal(o);
      U.activity(o.id + ' placed in the client app by ' + c.name + ' (' + money(U.orderTotal(o)) + (ca.sub ? ', auto-ship on, $' + credit() + ' credit added' : '') + '). Waiting for approval.');
      U.save(); ca.cart = {}; open({ type: 'placed', id: o.id });
    });
    var track = $('#caTrack'); if (track) track.addEventListener('click', function () { ca.sheet = null; ca.tab = 'me'; App.render(); });
    /* classes */
    $$('[data-cfilter]').forEach(function (b) { b.addEventListener('click', function () { ca.filter = b.getAttribute('data-cfilter'); rerender(); }); });
    $$('[data-cline]').forEach(function (b) { b.addEventListener('click', function () { ca.line = b.getAttribute('data-cline'); rerender(); }); });
    $$('[data-cbuy]').forEach(function (b) { b.addEventListener('click', function () { open({ type: 'buy', id: b.getAttribute('data-cbuy') }); }); });
    $$('[data-cwatch]').forEach(function (b) { b.addEventListener('click', function () { open({ type: 'watch', id: b.getAttribute('data-cwatch') }); }); });
    var pv = $('#caPayVideo');
    if (pv) pv.addEventListener('click', function () {
      var c = me(), v = EG.video(ca.sheet.id);
      var used = Math.min(c.credit || 0, v.price); c.credit = (c.credit || 0) - used;
      c.videosOwned.push(v.id); c.ltv += v.price - used;
      S().emails.unshift({ at: U.today(), to: c.id, kind: 'Class receipt', subject: 'Your class: ' + v.title });
      U.activity(c.name + ' bought the ' + v.title + ' short course (' + money(v.price - used) + (used ? ', ' + money(used) + ' auto-ship credit used' : '') + ') in the client app. Access granted, receipt sent.');
      U.save(); U.toast('Unlocked. It is yours to keep.');
      open({ type: 'watch', id: v.id });
    });
    var prog = $('#caProg');
    if (prog) { var w = 4; clearInterval(bind.t); bind.t = setInterval(function () { var p = U.$('#caProg'); if (!p) { clearInterval(bind.t); return; } w = Math.min(100, w + 1.5); p.style.width = w + '%'; }, 200); }
    var dl = $('#caDownload'); if (dl) dl.addEventListener('click', function () { U.toast('Download started (simulated). Watermarked with your name.'); });
    /* account */
    $$('[data-crefill]').forEach(function (b) {
      b.addEventListener('click', function () { var c = me(), k = b.getAttribute('data-crefill'); U.activity(c.name + (k === 'skip' ? ' skipped their next refill' : ' paused refills') + ' in the client app. Schedule updated.'); U.toast(k === 'skip' ? 'Next refill skipped' : 'Refills paused'); });
    });
    var ms = $('#caMsgSend');
    if (ms) ms.addEventListener('click', function () {
      var t = $('#caMsg').value.trim(), c = me(), now = new Date(); if (!t) return;
      S().messages.push({ id: 'msg' + Date.now(), client: c.id, from: 'client', by: c.name, at: U.today(), time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), text: t, read: false });
      U.activity('New message from ' + c.name + ' in the client app, for ' + c.practitioner + '.');
      U.save(); rerender(); U.toast('Sent to ' + U.first(c.practitioner));
    });
    $$('[data-cwho]').forEach(function (b) { b.addEventListener('click', function () { ca.book.who = b.getAttribute('data-cwho'); rerender(); }); });
    $$('[data-clong]').forEach(function (b) { b.addEventListener('click', function () { ca.book.long = b.getAttribute('data-clong') === '1'; rerender(); }); });
    $$('[data-cday]').forEach(function (b) { b.addEventListener('click', function () { ca.book.day = +b.getAttribute('data-cday'); rerender(); }); });
    $$('[data-ctime]').forEach(function (b) { b.addEventListener('click', function () { ca.book.time = b.getAttribute('data-ctime'); rerender(); }); });
    var bp = $('#caBookPay');
    if (bp) bp.addEventListener('click', function () {
      var c = me(), bk = ca.book, pr = EG.CERTIFIED.filter(function (p) { return p.id === bk.who; })[0], date = weekdays()[bk.day], full = EG.sessionPrice(bk.long, c), used = Math.min(c.credit || 0, full), price = full - used;
      c.credit = (c.credit || 0) - used;
      EGCal.book({ client: c.id, service: bk.long ? 'session60' : 'session30', date: date, time: bk.time, with: pr.name, paid: price });
      c.ltv += price;
      S().emails.unshift({ at: U.today(), to: c.id, kind: 'Session booked', subject: 'Your session with ' + pr.name });
      U.save(); ca.book = { who: bk.who, long: false, day: 0, time: '' };
      open({ type: 'booked', who: pr.name, date: date, time: bk.time, long: bk.long, price: price });
    });
    var so = $('#caSignOut'); if (so) so.addEventListener('click', function () { ca.as = ''; ca.tab = 'home'; App.render(); });
    var zoom = $('#caZoom'); if (zoom) zoom.addEventListener('click', function () { U.toast('Opening Zoom (simulated)'); });
    var ar = $('#caAddRem');
    if (ar) ar.addEventListener('click', function () {
      var sc = scanFor(me());
      EGScan.remedies(sc.data).slice(0, sc.data.limit).forEach(function (x) { var p = EGScan.inShop(x.item); if (p && !ca.cart[p.sku]) add(p.sku); });
      open({ type: 'cart' });
    });
    var op = $('#caOrderProto');
    if (op) op.addEventListener('click', function () { var p = EGProto.activeFor(me().id); p.items.forEach(function (x) { if (!ca.cart[x.sku]) add(x.sku); }); open({ type: 'cart' }); });
    $$('[data-ctake]').forEach(function (b) { b.addEventListener('click', function () { ca.taken = ca.taken || {}; var k = b.getAttribute('data-ctake'); ca.taken[k] = !ca.taken[k]; rerender(); }); });
    var p2 = $('#caProgram2'); if (p2) p2.addEventListener('click', function () { open({ type: 'program' }); });
    var pr = $('#caProgram'); if (pr) pr.addEventListener('click', function () { open({ type: 'program' }); });
    var call = $('#caCall');
    if (call) call.addEventListener('click', function () {
      var c = me();
      S().inbox.unshift({ id: 'm' + Date.now(), from: c.id, at: U.today(), text: 'I would like a free 15-minute call about the Premium Course.', done: false, lead: true });
      U.activity(c.name + ' asked for a call about the Premium Course. Added to the inbox as a sales lead.');
      U.save(); ca.sheet = null; App.render(); U.toast('Request sent. We will be in touch to book a time.');
    });
    var x = $('#caClose'), bg = $('#caSheetBg'), x2 = $('#caClose2');
    [x, bg, x2].forEach(function (el) { if (el) el.addEventListener('click', function () { clearInterval(bind.t); ca.sheet = null; rerender(); }); });
  }

  App.register('client', view, bind);
})();
