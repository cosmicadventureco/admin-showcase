/* Evergrove Wellness showcase - Home and Client Portal.
 *
 * Home is four doors: Client Portal, Shop, Client Report Creator and
 * Protocol Creator, with a checklist and upcoming appointments. Client Portal
 * is every client, and one page per client with everything about them in tabs,
 * including the message thread with their practitioner.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  function S() { return App.state(); }
  function st() { if (!App.ui.cp) App.ui.cp = { id: null, tab: 'info', q: '', booking: false, note: '' }; return App.ui.cp; }
  function unreadBy() { var o = {}; (S().messages || []).forEach(function (m) { if (m.from === 'client' && !m.read) o[m.client] = (o[m.client] || 0) + 1; }); return o; }
  function thread(id) { return (S().messages || []).filter(function (m) { return m.client === id; }); }
  function tier(c) { return c.member ? 'Premium Course' : c.plan === 'free' || c.plan === 'newsletter' ? 'Free account' : EG.PLANS[c.plan]; }
  var ICONS = {
    portal: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.3 3.3 0 0 1 0 6.5M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
    shop: '<path d="M3 7h18l-1.5 12a2 2 0 0 1-2 1.8h-11a2 2 0 0 1-2-1.8z"/><path d="M8.5 7a3.5 3.5 0 0 1 7 0"/>',
    reports: '<circle cx="12" cy="12" r="8"/><path d="M4 12h3l2-4 3 8 2-4h6"/>',
    protocols: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'
  };
  function icon(k, size) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + '</svg>'; }

  /* ------------------------------------------------------------- Home */
  function home() {
    var D = S(), t = U.today();
    var approve = D.orders.filter(function (o) { return o.stage === 0 && !o.held && !o.batched; }).length;
    var review = D.scans.filter(function (x) { return x.data && x.status === 'review'; }).length, files = D.scans.filter(function (x) { return !x.data && x.status === 'uploaded'; }).length;
    var active = D.protocols.filter(function (p) { return p.status === 'active'; }).length;
    var doors = [
      ['clients', 'portal', 'Client Portal', 'Every client: details, bookings, billing, protocols, notes, forms and documents.', D.clients.length + ' clients'],
      ['shop', 'shop', 'Shop', 'Orders, products and suppliers. Every order waits for a person before it ships.', approve ? approve + ' to approve' : 'All clear'],
      ['scans', 'reports', 'Client Report Creator', 'Upload the four scan files and get a finished client report, signed off by a practitioner.', review ? review + ' to review' : files ? files + ' waiting for files' : 'All clear'],
      ['protocols', 'protocols', 'Protocol Creator', 'What each client takes, how much and when, with reminders in their app.', active + ' active']
    ];
    var todo = [], unread = unreadBy();
    Object.keys(unread).forEach(function (id) { todo.push(['msg:' + id, 'Reply to ' + U.client(id).name + ' (' + unread[id] + ' new message' + (unread[id] > 1 ? 's' : '') + ')']); });
    if (approve) todo.push(['shop', approve + ' order' + (approve > 1 ? 's' : '') + ' waiting for approval']);
    D.scans.filter(function (x) { return x.status === 'uploaded' || x.status === 'review'; }).forEach(function (x) { todo.push(['scans', (x.data ? 'Review the report for ' : 'Upload the scan files for ') + U.client(x.client).name]); });
    D.clients.filter(function (c) { return c.member && !EGProto.activeFor(c.id); }).slice(0, 2).forEach(function (c) { todo.push(['protocols:' + c.id, c.name + ' has no protocol yet']); });
    return '<p class="eyebrow">Good morning, ' + esc(U.first(EG.BRAND.owner)) + '</p><h1 class="h1">Evergrove Wellness</h1><p class="lede">Four places to run the practice from.</p>' +
      '<div class="doors" data-tour="doors">' + doors.map(function (d) {
        return '<button class="door" data-door="' + d[0] + '"><span class="door-i">' + icon(d[1], 26) + '</span><b>' + d[2] + '</b><span class="small muted">' + d[3] + '</span><span class="pill' + (/approve|review|waiting/.test(d[4]) ? ' warn' : '') + '">' + d[4] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="homecols"><div><h2 class="h2">Checklist</h2><div class="card" data-tour="today">' + (todo.length ? todo.slice(0, 7).map(function (x) { return '<div class="todo"><span class="dotmark"></span><span class="grow">' + esc(x[1]) + '</span><button class="btn ghost small" data-todo="' + x[0] + '">Open</button></div>'; }).join('') : '<p class="muted" style="margin:0">Nothing needs you right now.</p>') + '</div></div>' +
      '<div><h2 class="h2">Upcoming Appointments</h2><div class="card" data-tour="appts">' + appointments() + '</div></div></div>';
  }
  function svcLabel(b) { var sv = EG.SERVICES.filter(function (x) { return x.id === b.service; })[0]; return b.name || (sv ? sv.label : 'Session'); }
  function appointments() {
    var t = U.today(), end = EG.iso(7), last = '';
    var up = S().bookings.filter(function (b) { return b.date >= t && b.date <= end; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }).slice(0, 7);
    if (!up.length) return '<p class="muted" style="margin:0">Nothing booked this week.</p>';
    return up.map(function (b) {
      var day = b.date === t ? 'Today' : b.date === EG.iso(1) ? 'Tomorrow' : U.fmtDate(b.date, { weekday: 'long', month: 'short', day: 'numeric' });
      var head = day !== last ? '<div class="appt-day">' + day + '</div>' : ''; last = day;
      var who = b.guests.length > 2 ? U.client(b.guests[0]).name + ' + ' + (b.guests.length - 1) + ' more' : b.guests.map(function (g) { return U.client(g).name; }).join(', ');
      return head + '<div class="appt"><div class="appt-d"><b>' + U.fmtTime(b.time) + '</b>' + esc(b.where) + '</div><div class="grow"><div class="small"><b>' + esc(svcLabel(b)) + '</b></div><div class="small muted">' + esc(who) + (b.with ? ' &middot; with ' + esc(b.with) : '') + '</div></div><button class="btn ghost small" data-todo="appt:' + b.guests[0] + '">Client</button></div>';
    }).join('');
  }
  function bindHome() {
    U.$$('[data-door]').forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-door'); if (v === 'clients') st().id = null; App.go(v); }); });
    U.$$('[data-todo]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-todo').split(':');
        if (p[0] === 'clients' || p[0] === 'appt') { st().id = p[1]; st().tab = 'bookings'; p[0] = 'clients'; }
        if (p[0] === 'msg') { st().id = p[1]; st().tab = 'messages'; p[0] = 'clients'; }
        if (p[0] === 'protocols') { App.ui.pc = { client: p[1], draft: null, mode: 'edit' }; }
        if (p[0] === 'shop') App.ui.shopTab = 'pipeline';
        if (p[0] === 'scans') App.ui.sc = null;
        App.go(p[0]);
      });
    });
  }

  /* ------------------------------------------------------ Client list */
  function list() {
    var cp = st(), q = cp.q.trim().toLowerCase(), t = U.today();
    var rows = S().clients.filter(function (c) { return !q || (c.name + ' ' + c.email + ' ' + tier(c)).toLowerCase().indexOf(q) >= 0; });
    return '<p class="eyebrow">Client Portal</p><h1 class="h1">Clients</h1><p class="lede">Open a client to see everything about them in one place.</p>' +
      '<input type="search" id="cpQ" placeholder="Search by name, email or plan" value="' + esc(cp.q) + '" style="max-width:24rem;margin-bottom:1rem">' +
      '<div class="card"><div class="tablewrap"><table data-tour="clientlist"><thead><tr><th>Client</th><th>Plan</th><th>Next booking</th><th>Protocol</th><th>Forms</th></tr></thead><tbody>' +
      rows.map(function (c) {
        var nb = S().bookings.filter(function (b) { return b.guests.indexOf(c.id) >= 0 && b.date >= t; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
        return '<tr class="clickable" data-cp="' + c.id + '"><td><div class="row" style="flex-wrap:nowrap"><span class="av">' + U.initials(c.name) + '</span><span><b>' + esc(c.name) + '</b><br><span class="small muted">' + esc(c.email) + '</span></span></div></td><td>' + esc(tier(c)) + '</td>' +
          '<td class="num">' + (nb ? U.fmtDate(nb.date) : '<span class="muted">&mdash;</span>') + '</td><td>' + (EGProto.activeFor(c.id) ? '<span class="pill ok">Active</span>' : '<span class="muted">&mdash;</span>') + '</td><td>' + (c.consent && c.intake ? '<span class="pill ok">Complete</span>' : '<span class="pill warn">Missing</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ------------------------------------------------------ Client page */
  var TABS = [['info', 'Basic information'], ['bookings', 'Bookings & packages'], ['billing', 'Billing & payments'], ['protocols', 'Protocols'], ['messages', 'Messages'], ['notes', 'Notes'], ['forms', 'Forms & waivers'], ['docs', 'Documents']];

  function payments(c) {
    var D = S(), e = U.enrollment(c.id), out = [];
    if (e) {
      var n = /Paid in full/.test(e.pay) ? 1 : +(e.pay.match(/^(\d)/) || [0, 1])[1];
      if (/Paid in full/.test(e.pay)) out.push([e.start, 'Premium Course, paid in full', EG.PROGRAM.price, 'Paid']);
      else for (var i = 0; i < 3; i++) out.push([EG.iso(-7 * (e.week - 1) + 30 * i), 'Premium Course, payment ' + (i + 1) + ' of 3', EG.PROGRAM.plan.each, i < n ? 'Paid' : e.payIssue && i === n ? 'Failed' : 'Scheduled']);
    }
    D.orders.filter(function (o) { return o.client === c.id; }).forEach(function (o) { out.push([o.at, 'Order ' + o.id + ' (' + o.items.length + ' item' + (o.items.length > 1 ? 's' : '') + ')', U.orderTotal(o), o.stage === 0 ? 'Authorised' : 'Paid']); });
    (c.videosOwned || []).forEach(function (vid) { var v = EG.video(vid); out.push([c.joined, 'Short course: ' + v.title, v.price, 'Paid']); });
    D.bookings.filter(function (b) { return b.guests.indexOf(c.id) >= 0 && b.paid; }).forEach(function (b) { out.push([b.date, 'Session with ' + b.with, b.paid, 'Paid']); });
    (c.packs || []).forEach(function (p) { out.push([p.bought, 'Package: ' + p.name, p.paid, 'Paid']); });
    return out.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
  }

  function tabBody(c, tab) {
    var D = S(), t = U.today(), cp = st();
    if (tab === 'info') {
      var flags = [c.pregnant && 'Pregnant or trying', c.bloodthinner && 'Takes a blood thinner', c.thyroid && 'Thyroid condition'].filter(Boolean);
      return '<div class="split"><div class="card"><h3 class="h3">Contact</h3><div class="fields">' +
        [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['dob', 'Date of birth'], ['address', 'Address']].map(function (f) { return '<div' + (f[0] === 'address' ? ' class="wide"' : '') + '><label for="ci-' + f[0] + '">' + f[1] + '</label><input id="ci-' + f[0] + '" type="text" value="' + esc(c[f[0]] || '') + '" data-ci="' + f[0] + '"></div>'; }).join('') +
        '</div><p class="small muted" style="margin:.6rem 0 0">Changes save as you type.</p></div>' +
        '<div class="card"><h3 class="h3">Health and plan</h3><table class="small"><tbody>' +
        [['Plan', tier(c)], ['Practitioner', c.practitioner], ['Client since', U.fmtDate(c.joined, { month: 'long', day: 'numeric', year: 'numeric' })], ['Goals', c.goals.map(EG.goalLabel).join(', ')], ['Diet', c.diet], ['Allergies', c.allergies.length ? c.allergies.join(', ') : 'None given'], ['Screening', flags.length ? flags.join(', ') : 'No flags']]
          .map(function (r) { return '<tr><th style="width:8rem">' + r[0] + '</th><td>' + esc(r[1]) + (r[0] === 'Screening' && flags.length ? ' <span class="pill warn">Practitioner reviews orders</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
    if (tab === 'bookings') {
      var bs = D.bookings.filter(function (b) { return b.guests.indexOf(c.id) >= 0; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var e = U.enrollment(c.id), owned = (c.videosOwned || []).map(EG.video);
      return '<div class="split"><div class="card"><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">Bookings</h3><button class="btn small" id="cpBook">Book a session</button></div>' +
        (cp.booking ? '<div class="fields" style="margin-top:.8rem"><div><label for="cbDate">Date</label><input id="cbDate" type="date" value="' + EG.iso(3) + '"></div><div><label for="cbTime">Time</label><select id="cbTime">' + ['09:00', '10:30', '13:00', '15:30', '17:00'].map(function (x) { return '<option value="' + x + '">' + U.fmtTime(x) + '</option>'; }).join('') + '</select></div>' +
          '<div><label for="cbWho">With</label><select id="cbWho">' + EG.CERTIFIED.map(function (p) { return '<option>' + esc(p.name) + '</option>'; }).join('') + '</select></div><div><label for="cbLen">Length</label><select id="cbLen"><option value="30">30 minutes ($99)</option><option value="60">1 hour ($148)</option></select></div></div><div class="row" style="margin-top:.6rem"><button class="btn small" id="cbSave">Save booking</button><span class="small muted">' + esc(U.first(c.name)) + ' gets the invite and Zoom link.</span></div>' : '') +
        '<div class="list" style="margin-top:.6rem">' + (bs.length ? bs.map(function (b) { var sv = EG.SERVICES.filter(function (s) { return s.id === b.service; })[0]; return '<div class="li"><span class="pill num' + (b.date >= t ? ' honey' : '') + '">' + U.fmtDate(b.date, { month: 'short', day: 'numeric' }) + '</span><div class="grow"><div class="title">' + esc(b.name || sv.label) + (b.with ? ' with ' + esc(b.with) : '') + '</div><div class="meta">' + U.fmtTime(b.time) + ' &middot; ' + esc(b.where) + '</div></div><span class="small muted">' + (b.date >= t ? 'Upcoming' : 'Done') + '</span></div>'; }).join('') : '<p class="small muted">No bookings yet.</p>') + '</div></div>' +
        '<div class="card"><h3 class="h3">Packages</h3><div class="list">' +
        (e ? '<div class="li"><div class="grow"><div class="title">Premium Course &middot; ' + money(EG.PROGRAM.price, false) + '</div><div class="meta">Week ' + e.week + ' of 12 &middot; energetics ' + esc(e.assess.toLowerCase()) + ' &middot; ' + e.zoom + ' Zoom sessions attended</div><div class="bar" style="margin-top:.4rem"><i style="width:' + Math.round(e.week / 12 * 100) + '%"></i></div></div></div>' : '') +
        (c.packs || []).map(function (p) { return '<div class="li"><div class="grow"><div class="title">' + esc(p.name) + '</div><div class="meta">' + p.used + ' of ' + p.total + ' used &middot; bought ' + U.fmtDate(p.bought) + '</div></div><span class="pill">' + (p.total - p.used) + ' left</span></div>'; }).join('') +
        owned.map(function (v) { return '<div class="li"><div class="grow"><div class="title">Short course: ' + esc(v.title) + '</div><div class="meta">' + v.lessons + ' lessons &middot; owned</div></div></div>'; }).join('') +
        (!e && !(c.packs || []).length && !owned.length ? '<p class="small muted" style="margin:0">No packages yet.</p>' : '') + '</div></div></div>';
    }
    if (tab === 'billing') {
      var pays = payments(c), e2 = U.enrollment(c.id), paid = pays.filter(function (p) { return p[3] === 'Paid'; }).reduce(function (s, p) { return s + p[2]; }, 0);
      var due = pays.filter(function (p) { return p[3] === 'Scheduled' || p[3] === 'Failed'; });
      return '<div class="grid g3" style="margin-bottom:1rem">' + U.stat(money(paid, false), 'Paid to date', '') + U.stat(due.length ? money(due[0][2], false) : '&mdash;', due.length ? (due[0][3] === 'Failed' ? 'Payment failed' : 'Next charge ' + U.fmtDate(due[0][0])) : 'Nothing due', '') + U.stat(esc(c.card), 'Card on file', '') + '</div>' +
        (e2 && e2.payIssue ? '<div class="flagbar" style="margin-bottom:1rem">' + esc(e2.payIssue) + '. A card-update link went out automatically. <button class="linkish" id="cpPayLink">Send it again</button></div>' : '') +
        '<div class="card"><div class="tablewrap"><table data-tour="billing"><thead><tr><th>Date</th><th>What</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>' +
        pays.map(function (p) { return '<tr><td class="num">' + U.fmtDate(p[0]) + '</td><td>' + esc(p[1]) + '</td><td class="r">' + money(p[2]) + '</td><td><span class="pill' + (p[3] === 'Paid' ? ' ok' : p[3] === 'Failed' ? ' bad' : '') + '">' + p[3] + '</span></td><td class="r">' + (p[3] === 'Paid' ? '<button class="linkish" data-receipt="1">Receipt</button>' : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="row" style="margin-top:.8rem"><button class="btn ghost small" id="cpPayLink2">Send a payment link</button><button class="btn ghost small" id="cpRefund">Issue a refund</button></div></div>';
    }
    if (tab === 'protocols') {
      var ps = D.protocols.filter(function (p) { return p.client === c.id; });
      var act = EGProto.activeFor(c.id);
      return '<div class="row" style="margin-bottom:1rem"><button class="btn small" id="cpNewProto">' + (act ? 'Edit in Protocol Creator' : 'Create a protocol') + '</button>' + (act ? '<button class="btn ghost small" id="cpProtoPdf">Download PDF</button>' : '') + '</div>' +
        (act ? EGProto.doc(act, false) : '<div class="card"><p class="muted" style="margin:0">No protocol yet. ' + (EGProto.latestScan(c.id) ? 'Their report is ready, so the Protocol Creator will have suggestions.' : 'A protocol usually follows their scan report.') + '</p></div>') +
        (ps.filter(function (p) { return p.status !== 'active'; }).length ? '<h2 class="h2">Earlier protocols</h2><div class="card"><div class="list">' + ps.filter(function (p) { return p.status !== 'active'; }).map(function (p) { return '<div class="li"><div class="grow"><div class="title">Protocol from ' + U.fmtDate(p.start) + '</div><div class="meta">' + p.items.length + ' remedies &middot; ' + esc(p.by) + '</div></div><span class="pill">Replaced</span></div>'; }).join('') + '</div></div>' : '');
    }
    if (tab === 'messages') {
      var th = thread(c.id);
      return '<div class="card" data-tour="messages"><div class="row" style="justify-content:space-between;margin-bottom:.8rem"><h3 class="h3" style="margin:0">Messages with ' + esc(U.first(c.name)) + '</h3><span class="small muted">' + esc(U.first(c.name)) + ' writes from their app. Replies arrive there and by email.</span></div>' +
        '<div class="thread">' + (th.length ? th.map(function (m) { return '<div class="bub ' + (m.from === 'team' ? 'me' : 'them') + '">' + esc(m.text) + '<span class="bub-m">' + esc(m.from === 'team' ? m.by : U.first(c.name)) + ' &middot; ' + U.fmtDate(m.at, { month: 'short', day: 'numeric' }) + ', ' + U.fmtTime(m.time) + '</span></div>'; }).join('') : '<p class="small muted" style="margin:0">No messages yet.</p>') + '</div>' +
        '<div class="msgbox"><textarea id="cpReply" rows="2" placeholder="Reply to ' + esc(U.first(c.name)) + '">' + esc(cp.reply || '') + '</textarea><button class="btn" id="cpSend">Send</button></div></div>';
    }
    if (tab === 'notes') {
      return '<div class="card"><div class="row" style="flex-wrap:nowrap;margin-bottom:.8rem"><input type="text" id="cpNote" placeholder="Add a private note about ' + esc(U.first(c.name)) + '" value="' + esc(cp.note) + '" style="flex:1"><button class="btn small" id="cpAddNote">Save</button></div>' +
        (c.notes.length ? c.notes.map(function (n, i) { return '<div class="note"><div class="row" style="justify-content:space-between"><span class="small muted">' + U.fmtDate(n.at, { month: 'short', day: 'numeric', year: 'numeric' }) + ' &middot; ' + esc(n.by || c.practitioner) + '</span><button class="linkish" data-delnote="' + i + '">Delete</button></div><p style="margin:.2rem 0 0">' + esc(n.text) + '</p></div>'; }).join('') : '<p class="small muted" style="margin:0">No notes yet. Only the team sees these.</p>') + '</div>';
    }
    if (tab === 'forms') {
      var forms = [
        ['Wellness consent', c.consent, c.consent ? 'Signed ' + U.fmtDate(c.joined) + ' with a drawn signature' : 'Not signed yet'],
        ['Intake questionnaire', c.intake, c.intake ? 'Goals, diet, allergies and health screening' : 'Not started'],
        ['Health screening', c.intake, c.intake ? ([c.pregnant, c.bloodthinner, c.thyroid].some(Boolean) ? 'Flags noted: a practitioner reviews orders' : 'No flags') : 'Part of the questionnaire'],
        ['Premium Course agreement', c.member ? true : null, c.member ? 'Signed online at enrolment' : 'Only for Premium Course clients'],
        ['Photo and testimonial release', false, 'Optional. Not sent yet']
      ];
      return '<div class="card"><div class="list" data-tour="forms">' + forms.map(function (f, i) {
        return '<div class="li"><div class="grow"><div class="title">' + f[0] + '</div><div class="meta">' + esc(f[2]) + '</div></div>' + (f[1] === true ? '<span class="pill ok">Complete</span><button class="btn ghost small" data-viewform="' + i + '">View</button>' : f[1] === null ? '<span class="pill">Not needed</span>' : '<span class="pill warn">Outstanding</span><button class="btn small" data-sendform="' + esc(f[0]) + '">Send link</button>') + '</div>';
      }).join('') + '</div></div>';
    }
    var docs = [];
    D.scans.filter(function (x) { return x.client === c.id && x.status === 'published'; }).forEach(function (x) { docs.push(['Resonance Map report', x.date, 'Client report', 'report:' + x.id]); });
    D.protocols.filter(function (p) { return p.client === c.id; }).forEach(function (p) { docs.push(['Protocol (' + (p.status === 'active' ? 'active' : 'replaced') + ')', p.start, 'Protocol', 'proto']); });
    if (c.consent) docs.push(['Signed wellness consent.pdf', c.joined, 'Form', '']);
    if (c.member) docs.push(['Premium Course agreement.pdf', (U.enrollment(c.id) || {}).start || c.joined, 'Agreement', '']);
    (c.docs || []).forEach(function (d) { docs.push([d.name, d.at, d.kind, '']); });
    docs.sort(function (a, b) { return a[1] < b[1] ? 1 : -1; });
    return '<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:.4rem"><h3 class="h3" style="margin:0">Documents</h3><label class="btn ghost small" style="margin:0;text-transform:none;letter-spacing:.06em">Upload a file<input type="file" id="cpUpload" hidden></label></div><div class="list" data-tour="docs">' +
      (docs.length ? docs.map(function (d) { return '<div class="li"><span class="docicon">' + (d[2] === 'Client report' ? 'RPT' : d[2] === 'Protocol' ? 'PRO' : 'PDF') + '</span><div class="grow"><div class="title">' + esc(d[0]) + '</div><div class="meta">' + esc(d[2]) + ' &middot; ' + U.fmtDate(d[1]) + '</div></div><button class="btn ghost small" data-opendoc="' + esc(d[3]) + '">Open</button></div>'; }).join('') : '<p class="small muted">No documents yet.</p>') + '</div></div>' +
      (cp.doc ? '<div style="margin-top:1rem">' + cp.doc + '</div>' : '');
  }

  function page(c) {
    var cp = st();
    return '<button class="back" id="cpBack">&larr; All clients</button>' +
      '<div class="row cphead" data-tour="clienthead"><span class="av" style="width:3.2rem;height:3.2rem;font-size:1rem">' + U.initials(c.name) + '</span><div class="grow"><h1 class="h1" style="margin:0">' + esc(c.name) + '</h1><div class="pills"><span class="pill honey">' + esc(tier(c)) + '</span><span class="pill">' + esc(c.practitioner) + '</span>' + (c.consent && c.intake ? '' : '<span class="pill warn">Forms outstanding</span>') + '</div></div>' +
      '<div class="row"><button class="btn ghost small" id="cpApp">View their app</button><button class="btn small" id="cpProto">Protocol</button></div></div>' +
      '<div class="tabs ctabs" data-tour="clienttabs">' + TABS.map(function (t) { var n = t[0] === 'messages' ? unreadBy()[c.id] : 0; return '<button class="tab' + (cp.tab === t[0] ? ' is-on' : '') + '" data-cptab="' + t[0] + '">' + t[1] + (n ? '<span class="unread">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      tabBody(c, cp.tab);
  }

  function view() {
    var cp = st(), c = cp.id ? U.client(cp.id) : null;
    /* Opening the thread marks the client's messages as read. */
    if (c && cp.tab === 'messages') { var html = page(c); thread(c.id).forEach(function (m) { if (m.from === 'client') m.read = true; }); U.save(); return html; }
    return c ? page(c) : list();
  }
  function bind() {
    var cp = st(), $ = U.$, $$ = U.$$, c = cp.id ? U.client(cp.id) : null;
    function keep() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    if (!c) {
      var q = $('#cpQ'); q.addEventListener('input', function () { cp.q = q.value; App.render(); var n = $('#cpQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
      $$('[data-cp]').forEach(function (r) { r.addEventListener('click', function () { cp.id = r.getAttribute('data-cp'); cp.tab = 'info'; cp.doc = null; App.render(); window.scrollTo(0, 0); }); });
      return;
    }
    $('#cpBack').addEventListener('click', function () { cp.id = null; App.render(); });
    /* On a phone the tabs scroll sideways: keep the open one in view. */
    var on = $('.ctabs .is-on'); if (on) on.parentNode.scrollLeft = on.offsetLeft - 16;
    $$('[data-cptab]').forEach(function (b) { b.addEventListener('click', function () { cp.tab = b.getAttribute('data-cptab'); cp.booking = false; cp.doc = null; keep(); }); });
    $('#cpApp').addEventListener('click', function () { App.ui.ca = null; App.go('client'); App.ui.ca.as = c.id; App.ui.ca.tab = 'home'; App.render(); });
    function toProto() { App.ui.pc = { client: c.id, draft: null, mode: 'edit' }; App.go('protocols'); }
    $('#cpProto').addEventListener('click', toProto);
    var np = $('#cpNewProto'); if (np) np.addEventListener('click', toProto);
    $$('[data-ci]').forEach(function (inp) { inp.addEventListener('input', function () { c[inp.getAttribute('data-ci')] = inp.value; U.save(); }); });
    var bk = $('#cpBook'); if (bk) bk.addEventListener('click', function () { cp.booking = !cp.booking; keep(); });
    var bs = $('#cbSave');
    if (bs) bs.addEventListener('click', function () {
      var long = $('#cbLen').value === '60';
      S().bookings.push({ id: 'b' + Date.now(), service: long ? 'session60' : 'session30', date: $('#cbDate').value, time: $('#cbTime').value, guests: [c.id], where: 'Video call', with: $('#cbWho').value, paid: long ? 148 : 99 });
      U.activity('Session booked for ' + c.name + ' with ' + $('#cbWho').value + '. Invite and Zoom link sent.');
      cp.booking = false; U.save(); keep(); U.toast('Booked. ' + U.first(c.name) + ' has the invite.');
    });
    [['#cpPayLink', 'Card-update link sent'], ['#cpPayLink2', 'Payment link sent to ' + c.email + ' (simulated)'], ['#cpRefund', 'Refunds open a short form with the amount and reason (simulated)'], ['#cpProtoPdf', 'PDF downloaded (simulated)']].forEach(function (x) { var b = $(x[0]); if (b) b.addEventListener('click', function () { U.toast(x[1]); }); });
    $$('[data-receipt]').forEach(function (b) { b.addEventListener('click', function () { U.toast('Receipt emailed to ' + c.email + ' (simulated)'); }); });
    var send = $('#cpSend');
    if (send) {
      $('#cpReply').addEventListener('input', function (e) { cp.reply = e.target.value; });
      send.addEventListener('click', function () {
        var v = (cp.reply || '').trim(); if (!v) return;
        var now = new Date();
        S().messages.push({ id: 'msg' + Date.now(), client: c.id, from: 'team', by: c.practitioner, at: U.today(), time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), text: v, read: true, seen: false });
        U.activity('Reply sent to ' + c.name + ' in the client app.');
        cp.reply = ''; U.save(); keep(); U.toast('Sent to ' + U.first(c.name) + '’s app');
      });
    }
    var an = $('#cpAddNote');
    if (an) {
      $('#cpNote').addEventListener('input', function (e) { cp.note = e.target.value; });
      an.addEventListener('click', function () { var v = cp.note.trim(); if (!v) return; c.notes.unshift({ at: U.today(), text: v, by: EG.BRAND.owner }); cp.note = ''; U.save(); keep(); });
    }
    $$('[data-delnote]').forEach(function (b) { b.addEventListener('click', function () { c.notes.splice(+b.getAttribute('data-delnote'), 1); U.save(); keep(); }); });
    $$('[data-sendform]').forEach(function (b) { b.addEventListener('click', function () { U.activity(b.getAttribute('data-sendform') + ' link sent to ' + c.name + '.'); U.save(); U.toast('Link sent to ' + c.email); }); });
    $$('[data-viewform]').forEach(function (b) { b.addEventListener('click', function () { U.toast('Opens the signed PDF (simulated)'); }); });
    $$('[data-opendoc]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-opendoc');
        if (k.indexOf('report:') === 0) { var sc = S().scans.filter(function (x) { return x.id === k.slice(7); })[0]; cp.doc = EGScan.reportHtml(sc, false); }
        else if (k === 'proto') { var p = EGProto.activeFor(c.id) || S().protocols.filter(function (x) { return x.client === c.id; })[0]; cp.doc = EGProto.doc(p, false); }
        else { U.toast('Opens the PDF (simulated)'); return; }
        keep();
      });
    });
    var up = $('#cpUpload');
    if (up) up.addEventListener('change', function () { if (!up.files[0]) return; c.docs = c.docs || []; c.docs.unshift({ name: up.files[0].name, at: U.today(), kind: 'Upload' }); U.save(); keep(); U.toast('Uploaded'); });
  }

  App.register('dashboard', home, bindHome);
  App.register('clients', view, bind);
  window.EGPortal = { open: function (id, tab) { st().id = id; st().tab = tab || 'info'; App.go('clients'); } };
})();
