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
  var PREVIEW = [['', 'New visitor'], ['c10', 'Free account: Grace Whitfield'], ['c1', 'Premium member: Priya Raman']];

  function S() { return App.state(); }
  function st() {
    if (!App.ui.ca) App.ui.ca = { as: '', tab: 'home', cart: {}, sub: false, step: 1, quiz: { goals: [], allergies: [] }, sheet: null, filter: 'all', line: 'all', book: { who: 'p1', long: false, day: 0, time: '' } };
    return App.ui.ca;
  }
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
    return '<div class="ca-hero"><p class="eyebrow">Evergrove Wellness</p><h2>Feel your best, with a plan made for you</h2>' +
      '<p class="muted">Answer a few questions and get a personal supplement and video plan. Free, and it takes about three minutes.</p>' +
      '<button class="btn honey ca-wide" id="caStart">Get my free plan</button></div>' +
      '<h3 class="ca-h">How it works</h3><ol class="ca-steps"><li><b>Answer a few questions</b><span>Your goals, how you eat, anything we should know.</span></li><li><b>Get your plan</b><span>Remedies, supplements and classes picked for you.</span></li><li><b>Order in one tap</b><span>Checked by our team, shipped to your door.</span></li></ol>' +
      '<h3 class="ca-h">Two ways to work with us</h3>' + tiers();
  }
  function tiers() {
    return '<div class="ca-tiers"><div class="ca-tier"><b>Free account</b><span class="ca-tprice">$0</span><ul><li>Personal supplement plan</li><li>Free classes</li><li>Short courses ' + money(59, false) + ' to ' + money(119, false) + '</li><li>Practitioner sessions from ' + money(EG.SESSION.base, false) + '</li><li>Order tracking and refills</li></ul></div>' +
      '<div class="ca-tier hi"><b>Premium Course</b><span class="ca-tprice">' + money(EG.PROGRAM.price, false) + '</span><ul><li>12 weeks, built around you</li><li>Energetics work and testing</li><li>Weekly live Zoom</li><li>20% off all supplements</li><li>Free shipping</li><li>Every short course included</li><li>25% off 1:1 sessions</li></ul></div></div>';
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
    return dots + '<h2 class="ca-title">Where should we send your plan?</h2>' +
      '<label for="caName">Your name</label><input id="caName" type="text" autocomplete="off">' +
      '<label for="caEmail" style="margin-top:.8rem">Email</label><input id="caEmail" type="email" autocomplete="off">' +
      '<label class="check" style="margin-top:1rem"><input type="checkbox" id="caConsent"> I agree to the wellness consent. My answers are private.</label>' +
      '<p class="small" id="caErr" style="color:var(--bad);min-height:1.2em"></p><button class="btn honey ca-wide" id="caFinish">See my free plan</button>';
  }

  function home(c) {
    var r = EG.recommend(c), e = U.enrollment(c.id), v = suggested(c)[0];
    var picks = r.picks.slice(0, 3), total = picks.reduce(function (t, x) { return t + memberPrice(x.product, c); }, 0);
    var mod = e ? EG.MODULES[e.week - 1] : null;
    return '<p class="eyebrow" style="margin:0">Good morning</p><h2 class="ca-title" style="margin-top:.1rem">' + esc(U.first(c.name)) + '</h2>' +
      '<div class="pills" style="margin-bottom:1rem">' + (c.member ? '<span class="pill ok">Premium member &middot; week ' + e.week + ' of 12</span><span class="pill honey">20% off everything</span>' : '<span class="pill">Free account</span>') + '</div>' +
      (function () {
        var sc = scanFor(c);
        if (!sc) return '';
        if (sc.status === 'published') return '<div class="ca-card ca-scan" data-tour="ca-scan"><span class="grow small"><b>Your scan report is ready</b><br><span class="muted">Evergrove Resonance Map &middot; ' + U.fmtDate(sc.date, { month: 'short', day: 'numeric' }) + '</span></span><button class="btn small" data-ctab="report">Open</button></div>';
        return '<div class="ca-card"><span class="small"><b>Energetics scan</b><br><span class="muted">' + (sc.status === 'booked' ? 'Booked for ' + U.fmtDate(sc.date) : 'Your practitioner is reviewing it') + '</span></span></div>';
      })() +
      (e ? '<div class="ca-card ca-prog" data-tour="ca-week"><div class="row" style="justify-content:space-between"><b>This week</b><span class="small muted num">' + Math.round(e.week / 12 * 100) + '%</span></div><div class="bar" style="margin:.4rem 0 .6rem"><i style="width:' + Math.round(e.week / 12 * 100) + '%"></i></div>' +
        '<div class="small">Week ' + e.week + ': ' + esc(mod.track ? EG.trackFor(c.goals) : mod.title) + '</div><div class="small muted">' + mod.vids + ' videos &middot; ' + mod.mins + ' min</div><button class="btn small" data-ctab="videos" style="margin-top:.6rem">Continue</button></div>' +
        '<div class="ca-card row" style="justify-content:space-between" data-tour="ca-zoom"><span><b>Live Zoom</b><br><span class="small muted">Thursday 6:00pm &middot; with ' + esc(EG.PRACTITIONERS[1].name) + '</span></span><button class="btn small" id="caZoom">Join</button></div>' : '') +
      '<div class="ca-card" data-tour="ca-plan"><div class="row" style="justify-content:space-between"><b>Your plan</b><button class="linkish" data-ctab="plan">See all</button></div>' +
      picks.map(function (x) { return '<div class="ca-mini">' + U.bottle(x.product, true) + '<span class="grow small"><b>' + esc(x.product.name) + '</b><br><span class="muted">' + esc(x.why[0] || '') + '</span></span>' + priceTag(x.product, c) + '</div>'; }).join('') +
      '<button class="btn ca-wide" id="caAddAll">Add all to cart &middot; ' + money(total) + '</button></div>' +
      (v ? '<div class="ca-card"><b>Watch next</b><div style="margin-top:.6rem">' + thumb(v) + '</div><div class="row" style="justify-content:space-between;margin-top:.5rem;flex-wrap:nowrap"><span class="small"><b>' + esc(v.title) + '</b><br>' + accessPill(v, c) + '</span>' + accessBtn(v, c) + '</div></div>' : '') +
      '<div class="ca-card row" style="justify-content:space-between;flex-wrap:nowrap"><span class="small"><b>Talk to a Certified Practitioner</b><br><span class="muted">30 minutes, ' + money(EG.sessionPrice(false, c)) + (c.member ? ' with your Premium discount' : '') + '</span></span><button class="btn small" data-ctab="book">Book</button></div>' +
      (!c.member ? '<div class="ca-card ca-up" data-tour="ca-upsell"><p class="eyebrow" style="margin:0">Premium Course &middot; ' + money(EG.PROGRAM.price, false) + '</p><b>Three months with our practitioners</b><ul class="ca-ben">' + EG.PROGRAM.includes.slice(0, 7).map(function (x) { return '<li>' + esc(x[0]) + '</li>'; }).join('') + '</ul><button class="btn honey small" id="caProgram">See everything included</button></div>' : '');
  }

  function scanFor(c) {
    return S().scans.filter(function (x) { return x.client === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0] || null;
  }
  function reportScreen(c) {
    var sc = scanFor(c);
    if (!sc || sc.status !== 'published') return '<h2 class="ca-title">Your scan report</h2><p class="small muted">' + (sc && sc.status === 'booked' ? 'Your energetics scan is booked for ' + U.fmtDate(sc.date) + '. Your report appears here once your practitioner has reviewed it.' : 'Your practitioner is reviewing your scan. We will email you as soon as your report is ready.') + '</p>';
    var rem = EGScan.remedies(sc.data).slice(0, sc.data.limit).filter(function (x) { return EGScan.inShop(x.item); });
    return '<button class="linkish" data-ctab="home" style="padding-left:0">&larr; Home</button>' + EGScan.reportHtml(sc, true) +
      '<div class="ca-card" style="margin-top:1rem"><b>Order your remedies</b><p class="small muted" style="margin:.2rem 0 0">' + rem.length + ' remedies from your report' + (c.member ? ', at your 20% member price with free shipping' : '') + '. Your practitioner checks every order before it ships.</p><button class="btn honey ca-wide" id="caAddRem">Add my remedies to cart</button></div>';
  }

  function plan(c) {
    var r = EG.recommend(c), ca = st();
    return '<h2 class="ca-title">Your plan</h2><p class="small muted" style="margin-top:-.4rem">From your questionnaire. Goals: ' + c.goals.map(function (g) { return esc(EG.goalLabel(g).toLowerCase()); }).join(', ') + '.</p>' +
      (r.needsReview ? '<div class="ca-note">Because of your health answers, a practitioner looks over your plan before anything ships. You can still order now.</div>' : '') +
      '<div class="plan" data-tour="ca-picks">' + r.picks.map(function (x) {
        var p = x.product;
        return '<div class="pick">' + U.bottle(p) + '<div class="grow"><div class="title">' + esc(p.name) + '</div><div class="why">' + esc(x.why.join(' · ')) + '</div>' + priceTag(p, c) + '</div><button class="btn ghost small" data-cadd="' + p.sku + '">' + (ca.cart[p.sku] ? 'Added' : 'Add') + '</button></div>';
      }).join('') + '</div>' +
      '<label class="check ca-card" style="margin-top:.8rem"><input type="checkbox" id="caSub"' + (ca.sub ? ' checked' : '') + '> <span><b>Subscribe &amp; save 15%</b><br><span class="small muted">Refills every 30 days. Skip or pause any time.</span></span></label>' +
      '<button class="btn ca-wide" id="caAddAll">Add all to cart</button>' +
      '<h3 class="ca-h">Classes for your plan</h3>' + suggested(c).slice(0, 3).map(function (v) { return videoRow(v, c); }).join('');
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
    var price = EG.sessionPrice(b.long, c);
    return '<h2 class="ca-title">Book a session</h2><p class="small muted" style="margin-top:-.4rem">One-to-one with a Certified Practitioner, by video call.</p>' +
      '<h3 class="ca-h">Who</h3><div data-tour="ca-who">' + EG.CERTIFIED.map(function (p) {
        return '<button class="ca-pract' + (p.id === b.who ? ' is-on' : '') + '" data-cwho="' + p.id + '"><span class="av" style="background:hsl(' + p.hue + ' 35% 85%);color:#233027">' + U.initials(p.name.replace('Dr. ', '')) + '</span><span class="small"><b>' + esc(p.name) + '</b><br><span class="muted">' + esc(p.role) + '</span></span></button>';
      }).join('') + '</div>' +
      '<h3 class="ca-h">How long</h3><div class="ca-len" data-tour="ca-len"><button class="' + (!b.long ? 'is-on' : '') + '" data-clong="0"><b>30 minutes</b><span>' + money(EG.sessionPrice(false, c)) + '</span></button><button class="' + (b.long ? 'is-on' : '') + '" data-clong="1"><b>1 hour</b><span>+' + money(c.member ? EG.SESSION.upgrade * (1 - EG.SESSION.premiumOff) : EG.SESSION.upgrade) + ' upgrade</span></button></div>' +
      '<h3 class="ca-h">When</h3><div class="chips" style="margin-bottom:.5rem">' + days.map(function (d, i) { return '<button class="chip' + (b.day === i ? ' is-on' : '') + '" data-cday="' + i + '">' + U.fmtDate(d, { weekday: 'short', day: 'numeric' }) + '</button>'; }).join('') + '</div>' +
      '<div class="chips">' + SLOTS.map(function (t) { return '<button class="chip' + (b.time === t ? ' is-on' : '') + '" data-ctime="' + t + '">' + U.fmtTime(t) + '</button>'; }).join('') + '</div>' +
      '<div class="ca-card" style="margin-top:1rem" data-tour="ca-booksum"><div class="small"><b>' + (b.long ? '1 hour' : '30 minutes') + ' with ' + esc(pr.name) + '</b><br><span class="muted">' + (b.time ? U.fmtDate(days[b.day], { weekday: 'long', month: 'short', day: 'numeric' }) + ' at ' + U.fmtTime(b.time) : 'Pick a time') + '</span></div>' +
      (c.member ? '<div class="small" style="color:var(--ok);margin-top:.3rem">Premium discount: 25% off</div>' : '') +
      '<button class="btn paybtn ca-wide" id="caBookPay"' + (b.time ? '' : ' disabled') + '>Pay ' + money(price) + ' and book</button></div>';
  }

  function shop(c) {
    var l = st().line;
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
      '<h3 class="ca-h">Orders</h3><div data-tour="ca-orders">' + (orders.length ? orders.map(function (o) {
        return '<div class="ca-card"><div class="row" style="justify-content:space-between"><b class="small">' + o.id + '</b><span class="price small">' + money(U.orderTotal(o)) + '</span></div><div class="small muted">' + o.items.map(function (it) { return EG.product(it[0]).name; }).join(', ') + '</div>' +
          '<div class="ca-track">' + STAGES.map(function (s, i) { return '<span class="' + (i <= o.stage ? 'on' : '') + '"></span>'; }).join('') + '</div><div class="small"><b>' + STAGES[o.stage] + '</b>' + (o.tracking && o.stage >= 3 ? ' &middot; <span class="num">' + o.tracking + '</span>' : '') + '</div></div>';
      }).join('') : '<p class="small muted">No orders yet.</p>') + '</div>' +
      (c.autoship ? '<h3 class="ca-h">Refills</h3><div class="ca-card row" style="justify-content:space-between"><span class="small"><b>Next refill in 9 days</b><br><span class="muted">' + (c.plan_items || []).length + ' items, every 30 days</span></span><span class="row"><button class="btn ghost small" data-crefill="skip">Skip</button><button class="btn ghost small" data-crefill="pause">Pause</button></span></div>' : '') +
      '<h3 class="ca-h">My classes</h3>' + (owned.length ? owned.slice(0, 4).map(function (v) { return videoRow(v, c); }).join('') : '<p class="small muted">Classes you buy appear here, yours to keep.</p>') +
      '<h3 class="ca-h">Ask our team</h3><div class="ca-card"><textarea id="caAsk" rows="3" placeholder="Questions about your plan, an order or a class"></textarea><button class="btn small" id="caAskSend" style="margin-top:.5rem">Send</button><p class="small muted" style="margin:.4rem 0 0">We usually reply within a day.</p></div>' +
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
      var save = st().sub ? (sub - mem) * 0.15 : 0;
      var net = sub - mem - save, ship = (c && c.member) || net >= 75 || !keys.length ? 0 : 6.95;
      body = '<h3 class="ca-title">Your cart</h3>' + (keys.length ? keys.map(function (k) { var p = EG.product(k); return '<div class="ca-mini">' + U.bottle(p, true) + '<span class="grow small"><b>' + esc(p.name) + '</b></span><span class="row" style="flex-wrap:nowrap;gap:.3rem"><button class="qty" data-cqty="' + k + '" data-d="-1" aria-label="Remove one">&minus;</button><span class="num small">' + cart[k] + '</span><button class="qty" data-cqty="' + k + '" data-d="1" aria-label="Add one">+</button></span></div>'; }).join('') +
        '<div class="carttot"><div class="row" style="justify-content:space-between"><span>Subtotal</span><span class="num">' + money(sub) + '</span></div>' +
        (mem ? '<div class="row" style="justify-content:space-between;color:var(--ok)"><span>Member 20%</span><span class="num">&minus;' + money(mem) + '</span></div>' : '') +
        (save ? '<div class="row" style="justify-content:space-between;color:var(--ok)"><span>Subscribe &amp; save 15%</span><span class="num">&minus;' + money(save) + '</span></div>' : '') +
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
      body = thumb(v, true) + '<p class="eyebrow" style="margin:.8rem 0 0">Short course</p><h3 class="ca-title">' + esc(v.title) + '</h3><p class="small muted">' + v.lessons + ' video lessons, ' + v.mins + ' minutes in all. Yours to keep, with downloads and a workbook.</p>' +
        '<button class="btn paybtn ca-wide" id="caPayVideo">Pay ' + money(v.price) + '</button><p class="small muted" style="text-align:center;margin:.5rem 0 0">Every short course is included in the Premium Course.</p>';
    } else if (sh.type === 'watch') {
      var w = EG.video(sh.id), a = EG.videoAccess(w, c);
      body = '<div class="player">' + thumb(w, true) + '<div class="bar"><i id="caProg" style="width:4%"></i></div></div><h3 class="ca-title" style="margin-top:.8rem">' + esc(w.title) + '</h3><p class="small muted">Playing (showcase preview) &middot; ' + w.mins + ' min</p>' +
        (a === 'owned' || a === 'included' ? '<button class="btn ghost ca-wide" id="caDownload">Download</button>' : '');
    } else if (sh.type === 'program') {
      body = '<p class="eyebrow">Premium Course</p><h3 class="ca-title">' + esc(EG.PROGRAM.name) + '</h3><p class="small muted">' + money(EG.PROGRAM.price, false) + ' or ' + EG.PROGRAM.plan.n + ' payments of ' + money(EG.PROGRAM.plan.each, false) + '</p>' +
        EG.PROGRAM.includes.map(function (x) { return '<div class="inc small" style="margin-bottom:.6rem"><span class="tick"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg></span><div><b>' + esc(x[0]) + '</b><br><span class="muted">' + esc(x[1]) + '</span></div></div>'; }).join('') +
        '<button class="btn honey ca-wide" id="caCall">Book a free 15-minute call</button>';
    }
    return '<div class="ca-sheet-bg" id="caSheetBg"></div><div class="ca-sheet" role="dialog"><button class="ca-x" id="caClose" aria-label="Close">&times;</button>' + body + '</div>';
  }

  /* ------------------------------------------------------------- frame */
  function view() {
    var ca = st(), c = me(), tab = c ? ca.tab : (ca.tab === 'quiz' ? 'quiz' : 'home');
    var screen = !c ? (tab === 'quiz' ? quiz() : guestHome()) : tab === 'plan' ? plan(c) : tab === 'videos' ? videos(c) : tab === 'book' ? book(c) : tab === 'report' ? reportScreen(c) : tab === 'shop' ? shop(c) : tab === 'me' ? account(c) : home(c);
    var n = cartCount();
    var tabs = [['home', 'Home', '<path d="M4 11l8-7 8 7v9H4z"/>'], ['plan', 'My plan', '<path d="M7 3h10v18H7z"/><path d="M10 8h4M10 12h4"/>'], ['videos', 'Courses', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>'], ['book', 'Book', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'], ['shop', 'Shop', '<path d="M4 7h16l-1.5 12h-13z"/><path d="M9 7a3 3 0 0 1 6 0"/>']];
    return '<div class="cmode"><div class="phone" data-tour="phone"><div class="ph-top"><span class="brand-s"><svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="var(--deep)"/><path d="M16 7c5 3 7 8 5 13-1.5 3.5-5 5-5 5s-3.5-1.5-5-5C9 15 11 10 16 7z" fill="var(--bg)"/></svg>Evergrove</span>' +
      (c ? '<span class="row" style="gap:.2rem;flex-wrap:nowrap"><button class="ca-cartbtn" data-ctab="me" id="caMe" aria-label="My account"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></button><button class="ca-cartbtn" id="caCart" aria-label="Cart"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16l-1.5 12h-13z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>' + (n ? '<span class="ca-badge">' + n + '</span>' : '') + '</button></span>' : '') + '</div>' +
      '<div class="ph-body" id="caBody">' + screen + '</div>' +
      (c ? '<nav class="ph-tabs">' + tabs.map(function (t) { return '<button class="' + (tab === t[0] ? 'is-on' : '') + '" data-ctab="' + t[0] + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">' + t[2] + '</svg>' + t[1] + '</button>'; }).join('') + '</nav>' : '') +
      sheet() + '</div>' +
      '<aside class="cside"><p class="eyebrow">Client app</p><h1 class="h1">What your clients use</h1><p class="lede" style="margin-bottom:1rem">A separate, simple app for clients, on their phone or computer. It installs to the home screen and lives at <code>evergrove.example/app</code>.</p>' +
      U.pitch('new', 'Built on the same platform as the console. Everything a client does here, the team sees there: orders land in the approval queue, questions land in the inbox, purchases unlock instantly.') +
      '<label for="caAs">Preview as</label><select id="caAs">' + PREVIEW.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === ca.as ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + (ca.as && PREVIEW.every(function (p) { return p[0] !== ca.as; }) ? '<option value="' + ca.as + '" selected>' + esc(c.name) + (c.fresh ? ' (just signed up)' : (c.member ? ' (Premium member)' : '')) + '</option>' : '') + '</select>' +
      '<ul class="cfeat"><li><b>Free plan from a questionnaire</b> Supplements and classes suggested from their answers.</li><li><b>One-tap ordering</b> Add the whole plan to the cart, subscribe and save.</li><li><b>Courses</b> Free classes, and short courses from ' + money(59, false) + ' to ' + money(119, false) + '. All included for Premium members.</li><li><b>Practitioner sessions</b> Book and pay for 30 minutes (' + money(EG.SESSION.base, false) + ') or an hour (+' + money(EG.SESSION.upgrade, false) + ') in one step.</li><li><b>Premium Course members</b> Course week, live Zoom, 20% off and free shipping, in one place.</li><li><b>Order tracking</b> Plain-language status for every order.</li><li><b>Ask the team</b> Questions go to a shared inbox, not one person.</li></ul></aside></div>';
  }

  function bind() {
    var ca = st(), $ = U.$, $$ = U.$$;
    function rerender() { var b = $('#caBody'), top = b ? b.scrollTop : 0; App.render(); var nb = $('#caBody'); if (nb) nb.scrollTop = top; }
    function open(sh) { ca.sheet = sh; rerender(); }
    $('#caAs').addEventListener('change', function (e) { ca.as = e.target.value; ca.tab = 'home'; ca.step = 1; ca.cart = {}; ca.sheet = null; App.render(); });
    $$('[data-ctab]').forEach(function (b) { b.addEventListener('click', function () { ca.tab = b.getAttribute('data-ctab'); ca.sheet = null; App.render(); }); });
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
      D.emails.unshift({ at: U.today(), to: c.id, kind: 'Recommendations', subject: 'Your free Evergrove plan' });
      U.activity(name + ' finished the free questionnaire in the client app. ' + (EGAuto.on('plan') ? 'Plan emailed' + (EGAuto.setting('plan', 'segments') ? ', added to the ' + c.goals.map(EG.goalLabel).join(', ') + ' newsletters.' : '.') : 'Plan saved; the plan email is switched off.'));
      ca.as = c.id; ca.tab = 'plan'; App.render();
      U.toast('Your free plan is ready');
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
      var disc = 1 - (1 - (c.member ? EG.PROGRAM.discount : 0)) * (1 - (ca.sub ? 0.15 : 0));
      var o = { id: 'EG-' + (D.nextOrder++), client: c.id, at: U.today(), items: Object.keys(ca.cart).map(function (k) { return [k, ca.cart[k]]; }), stage: 0, sub: ca.sub, discount: disc, fromApp: true };
      D.orders.push(o);
      if (ca.sub) c.autoship = true;
      c.ltv += U.orderTotal(o);
      U.activity(o.id + ' placed in the client app by ' + c.name + ' (' + money(U.orderTotal(o)) + (ca.sub ? ', subscribe & save' : '') + '). Waiting for approval.');
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
      c.videosOwned.push(v.id); c.ltv += v.price;
      S().emails.unshift({ at: U.today(), to: c.id, kind: 'Class receipt', subject: 'Your class: ' + v.title });
      U.activity(c.name + ' bought the ' + v.title + ' short course (' + money(v.price, false) + ') in the client app. Access granted, receipt sent.');
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
    var ask = $('#caAskSend');
    if (ask) ask.addEventListener('click', function () {
      var t = $('#caAsk').value.trim(), c = me(); if (!t) return;
      S().inbox.unshift({ id: 'm' + Date.now(), from: c.id, at: U.today(), text: t, done: false });
      U.activity('New question from ' + c.name + ' in the client app. Added to the shared inbox.');
      U.save(); $('#caAsk').value = ''; U.toast('Sent. The team usually replies within a day.');
    });
    $$('[data-cwho]').forEach(function (b) { b.addEventListener('click', function () { ca.book.who = b.getAttribute('data-cwho'); rerender(); }); });
    $$('[data-clong]').forEach(function (b) { b.addEventListener('click', function () { ca.book.long = b.getAttribute('data-clong') === '1'; rerender(); }); });
    $$('[data-cday]').forEach(function (b) { b.addEventListener('click', function () { ca.book.day = +b.getAttribute('data-cday'); rerender(); }); });
    $$('[data-ctime]').forEach(function (b) { b.addEventListener('click', function () { ca.book.time = b.getAttribute('data-ctime'); rerender(); }); });
    var bp = $('#caBookPay');
    if (bp) bp.addEventListener('click', function () {
      var c = me(), bk = ca.book, pr = EG.CERTIFIED.filter(function (p) { return p.id === bk.who; })[0], date = weekdays()[bk.day], price = EG.sessionPrice(bk.long, c);
      S().bookings.push({ id: 'b' + Date.now(), service: bk.long ? 'session60' : 'session30', date: date, time: bk.time, guests: [c.id], where: 'Video call', with: pr.name, paid: price });
      c.ltv += price;
      S().emails.unshift({ at: U.today(), to: c.id, kind: 'Session booked', subject: 'Your session with ' + pr.name });
      U.activity(c.name + ' booked ' + (bk.long ? 'a 1-hour' : 'a 30-minute') + ' session with ' + pr.name + ' (' + money(price) + ') for ' + U.fmtDate(date) + '. Paid, calendar invite and Zoom link sent.');
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
