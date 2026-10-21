/* Evergrove Wellness showcase - the Work queue.
 *
 * The answer to "someone is leaving and they did all the admin". Everything
 * that still needs a person sits in one list anyone on the team can work
 * through; everything else is shown as what the system now does on its own,
 * with a log of it doing so.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  function S() { return App.state(); }
  function st() { if (!App.ui.wq) App.ui.wq = { tab: 'needs', confirm: null, reply: null }; return App.ui.wq; }

  /* Estimates for the pitch, to confirm with the team before building. */
  var JOBS = [
    ['Typing intake answers into a spreadsheet', 'Daily', 'auto', 3, 0, 'Clients fill in the questionnaire themselves.'],
    ['Choosing supplements for each new client', 'Daily', 'auto', 4, 0.5, 'Suggested from the answers. A practitioner only checks flagged clients.'],
    ['Ordering from suppliers one product at a time', 'Daily', 'approve', 4, 0.5, 'Approved orders fill the supplier cart in one go and you click checkout. Clinic stock goes out as one weekly order.'],
    ['Copying tracking numbers to clients', 'Daily', 'auto', 2, 0, 'Tracking emails go out the moment the supplier ships.'],
    ['Refill reminders and reorders', 'Weekly', 'approve', 2, 0.3, 'Reminders are automatic. Each refill order still gets approved.'],
    ['Selling short courses and sending access', 'Daily', 'auto', 1.5, 0, 'Checkout ($59 to $119) unlocks the course and sends a receipt.'],
    ['Booking practitioner sessions and taking payment', 'Daily', 'auto', 2, 0, 'Clients pick a practitioner, 30 minutes or an hour, and a time, and pay when they book.'],
    ['Enrolling Premium Course members, welcome packs', 'Weekly', 'auto', 1.5, 0, 'Payment, agreement, welcome email and Zoom invites in one step.'],
    ['Unlocking course weeks, sending Zoom links', 'Weekly', 'auto', 1.5, 0, 'Weeks unlock every 7 days; reminders go out Thursday morning.'],
    ['Turning scan exports into client reports', 'Weekly', 'approve', 4, 0.5, 'Findings are extracted and ranked automatically. A practitioner reviews, signs off and publishes.'],
    ['Chasing payment-plan instalments', 'Monthly', 'auto', 1, 0.2, 'Cards are charged on schedule; a failed card gets an update link.'],
    ['Answering client questions', 'Daily', 'person', 2, 2, 'Questions land in a shared inbox, so anyone can answer.']
  ];
  var HOW = { auto: ['ok', 'Runs itself'], approve: ['honey', 'One-click approval'], person: ['', 'A person, any teammate'] };

  function tasks() {
    var D = S(), out = [];
    D.orders.filter(function (o) { return o.stage === 0 && !o.held && !o.batched; }).forEach(function (o) {
      var c = U.client(o.client), flagged = c && EG.recommend(c).flags.length > 0;
      out.push({ kind: 'order', id: o.id, who: flagged ? 'Practitioner' : 'Assistant', o: o, c: c, flagged: flagged });
    });
    D.inbox.filter(function (m) { return !m.done; }).forEach(function (m) { out.push({ kind: 'msg', id: m.id, who: m.lead ? 'Owner' : 'Anyone', m: m, c: U.client(m.from) }); });
    D.scans.filter(function (x) { return x.status === 'uploaded' || x.status === 'review'; }).forEach(function (x) { out.push({ kind: 'scan', id: 'sc-' + x.id, who: 'Practitioner', sc: x, c: U.client(x.client) }); });
    D.enrollments.filter(function (e) { return e.payIssue; }).forEach(function (e) { out.push({ kind: 'pay', id: 'p-' + e.client, who: 'Owner', e: e, c: U.client(e.client) }); });
    D.enrollments.filter(function (e) { return e.testing === 'Results in'; }).forEach(function (e) { out.push({ kind: 'results', id: 'r-' + e.client, who: 'Practitioner', e: e, c: U.client(e.client) }); });
    return out;
  }

  function taskHtml(t) {
    var wq = st(), body = '', acts = '';
    if (t.kind === 'order') {
      var sups = {}; t.o.items.forEach(function (it) { sups[EG.SUPPLIERS[EG.product(it[0]).supplier].name] = 1; });
      body = '<b>Approve order ' + t.o.id + '</b> for ' + esc(t.c.name) + ' &middot; ' + money(U.orderTotal(t.o)) + (t.o.fromApp ? ' &middot; from the client app' : t.o.sub ? ' &middot; auto-ship refill' : '') +
        '<div class="small muted">' + t.o.items.map(function (it) { return it[1] + ' &times; ' + esc(EG.product(it[0]).name); }).join(', ') + ' &rarr; ' + Object.keys(sups).map(esc).join(' and ') + '</div>';
      if (t.flagged) acts = '<span class="pill warn">Screening flag</span><button class="btn ghost small" data-wreview="' + t.o.id + '">Review</button>';
      else if (wq.confirm === t.o.id) acts = '<span class="small">Send to the supplier for ' + money(U.orderCost(t.o)) + '?</span><button class="btn small" data-wconfirm="' + t.o.id + '">Yes, send</button><button class="btn ghost small" data-wcancel="1">Cancel</button>';
      else acts = '<button class="btn small" data-wapprove="' + t.o.id + '">Approve</button>';
    } else if (t.kind === 'msg') {
      body = '<b>' + (t.m.lead ? 'Sales lead from ' : 'Question from ') + esc(t.c.name) + '</b>' + (t.m.lead ? ' <span class="pill honey">Premium Course</span>' : '') + '<div class="small">&ldquo;' + esc(t.m.text) + '&rdquo;</div>' +
        (wq.reply === t.m.id ? '<div class="row" style="margin-top:.5rem;flex-wrap:nowrap"><input type="text" id="wReply" placeholder="Type a reply" style="flex:1"><button class="btn small" data-wsend="' + t.m.id + '">Send</button></div>' : '');
      acts = wq.reply === t.m.id ? '' : '<button class="btn ghost small" data-wreply="' + t.m.id + '">Reply</button>';
    } else if (t.kind === 'scan') {
      body = '<b>Review the energetic scan for ' + esc(t.c.name) + '</b><div class="small muted">Scanned ' + U.fmtDate(t.sc.date) + '. ' + (t.sc.status === 'review' ? 'Findings extracted, waiting for sign-off.' : 'All four exports are in.') + '</div>';
      acts = '<button class="btn small" data-wscan="' + t.sc.id + '">Review</button>';
    } else if (t.kind === 'pay') {
      body = '<b>' + esc(t.e.payIssue) + '</b> for ' + esc(t.c.name) + '<div class="small muted">A card-update link went out automatically. The system retries in 3 days, so this is only here in case a call would help.</div>';
      acts = '<button class="btn ghost small" data-wresolve="' + t.c.id + '">Mark resolved</button>';
    } else {
      body = '<b>Review test results with ' + esc(t.c.name) + '</b><div class="small muted">Week ' + t.e.week + ' of the program. Results arrived from the lab.</div>';
      acts = '<button class="btn ghost small" data-wbook="' + t.c.id + '">Book review call</button>';
    }
    return '<div class="wtask" id="w-' + t.id + '"><span class="wwho ' + t.who.toLowerCase() + '">' + t.who + '</span><div class="grow">' + body + '</div><div class="row wacts">' + acts + '</div></div>';
  }

  function view() {
    var wq = st(), D = S(), list = tasks();
    var before = JOBS.reduce(function (t, j) { return t + j[3]; }, 0), after = JOBS.reduce(function (t, j) { return t + j[4]; }, 0);
    var auto = 1284 + D.activity.length;
    var body;
    if (wq.tab === 'auto') {
      body = '<div class="card"><p class="small muted" style="margin-top:0">The admin jobs one person used to do by hand, and who does them now. Hours are estimates for this pitch; we confirm them with your team before building.</p><div class="tablewrap"><table data-tour="jobs"><thead><tr><th>Job</th><th>How often</th><th>Now</th><th class="r">Hours a week before</th><th class="r">After</th></tr></thead><tbody>' +
        JOBS.map(function (j) { return '<tr><td><b>' + esc(j[0]) + '</b><br><span class="small muted">' + esc(j[5]) + '</span></td><td>' + j[1] + '</td><td><span class="pill ' + HOW[j[2]][0] + '">' + HOW[j[2]][1] + '</span></td><td class="r">' + j[3] + '</td><td class="r">' + j[4] + '</td></tr>'; }).join('') +
        '<tr class="total"><td colspan="3"><b>Total</b></td><td class="r"><b>' + before + '</b></td><td class="r"><b>' + after + '</b></td></tr></tbody></table></div></div>';
    } else if (wq.tab === 'log') {
      body = '<div class="card"><div class="list" data-tour="activity">' + D.activity.slice(0, 25).map(function (a) { return '<div class="li"><span class="pill num">' + U.fmtDate(a.at, { month: 'short', day: 'numeric' }) + ' ' + a.time + '</span><span class="grow small">' + esc(a.text) + '</span></div>'; }).join('') + '</div></div>';
    } else if (wq.tab === 'team') {
      var roles = [['Owner', 'Maya Lindqvist'], ['Practitioner', 'Theo Marsh, Dr. Ana Whitlock'], ['Assistant', 'Any new hire']];
      var perms = [['Approve orders', 1, 1, 1], ['Review screening flags', 1, 1, 0], ['Answer client questions', 1, 1, 1], ['Manage program members', 1, 1, 1], ['Edit products and prices', 1, 0, 0], ['Refunds, revenue and payouts', 1, 0, 0]];
      var list2 = [['Supplier logins moved to the team vault', 1], ['Email wording moved into templates', 1], ['Refill schedules imported', 1], ['Program members and payment plans imported', 1], ['15-minute walkthrough of the Work queue for the assistant', 0], ['Retire the old spreadsheet', 0]];
      body = '<div class="split"><div class="card"><h3 class="h3">Who can do what</h3><div class="tablewrap"><table data-tour="roles"><thead><tr><th></th>' + roles.map(function (r) { return '<th>' + r[0] + '<br><span class="small muted" style="text-transform:none;letter-spacing:0;font-weight:400">' + esc(r[1]) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
        perms.map(function (p) { return '<tr><td>' + p[0] + '</td>' + [1, 2, 3].map(function (i) { return '<td>' + (p[i] ? '<span class="pill ok">Yes</span>' : '<span class="muted">&mdash;</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div class="card"><h3 class="h3">Handoff checklist</h3><p class="small muted" style="margin-top:0">Sample of what moving off one person looks like.</p>' + list2.map(function (x) { return '<div class="todo"><span class="dotmark ' + (x[1] ? 'ok' : '') + '"></span><span class="grow small">' + esc(x[0]) + '</span>' + (x[1] ? '<span class="pill ok">Done</span>' : '<span class="pill">To do</span>') + '</div>'; }).join('') + '</div></div>';
    } else {
      body = '<div class="card" data-tour="tasks">' + (list.length ? list.map(taskHtml).join('') : '<p class="muted" style="margin:0">Nothing needs a person right now.</p>') + '</div>';
    }
    return U.head('Run the practice', 'Work queue',
      'Everything that still needs a person, in one list anyone on the team can work through. Everything else runs on its own and is logged.') +
      U.pitch('new', 'Built for handing off the admin role: the jobs one person did by hand become automatic or one-click, and what is left sits in a shared queue with clear roles, so nobody is the only one who knows how.') +
      '<div class="grid g4" style="margin-bottom:1rem" data-tour="wstats">' + U.stat(list.length, 'Need a person today', '') + U.stat(auto.toLocaleString(), 'Jobs done automatically this month', '') +
      U.stat(before + 'h &rarr; ' + after + 'h', 'Admin hours a week (estimate)', '') + U.stat(money(5114, false), 'Short courses and sessions sold this month, no admin', '') + '</div>' +
      '<div class="tabs">' + [['needs', 'Needs a person (' + list.length + ')'], ['auto', 'Runs itself'], ['log', 'Activity log'], ['team', 'Team & handoff']].map(function (t) { return '<button class="tab' + (wq.tab === t[0] ? ' is-on' : '') + '" data-wtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + body;
  }

  function bind() {
    var wq = st(), $ = U.$, $$ = U.$$;
    $$('[data-wtab]').forEach(function (b) { b.addEventListener('click', function () { wq.tab = b.getAttribute('data-wtab'); App.render(); }); });
    $$('[data-wapprove]').forEach(function (b) { b.addEventListener('click', function () { wq.confirm = b.getAttribute('data-wapprove'); App.render(); }); });
    $$('[data-wcancel]').forEach(function (b) { b.addEventListener('click', function () { wq.confirm = null; App.render(); }); });
    $$('[data-wconfirm]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-wconfirm'); wq.confirm = null;
        App.approveOrder(id);
        setTimeout(function () { if (App.ui.view === 'queue') App.render(); }, 60);
        U.toast(id + ' approved and sent to the supplier. Tracking will follow automatically.');
      });
    });
    $$('[data-wscan]').forEach(function (b) {
      b.addEventListener('click', function () { var sc = S().scans.filter(function (x) { return x.id === b.getAttribute('data-wscan'); })[0]; App.ui.sc = { open: sc.id, step: sc.data ? 'review' : 'upload', files: {}, signed: false, editing: null }; App.go('scans'); });
    });
    $$('[data-wreview]').forEach(function (b) { b.addEventListener('click', function () { App.ui.shopTab = 'pipeline'; App.go('shop'); }); });
    $$('[data-wreply]').forEach(function (b) { b.addEventListener('click', function () { wq.reply = b.getAttribute('data-wreply'); App.render(); var r = $('#wReply'); if (r) r.focus(); }); });
    $$('[data-wsend]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = S().inbox.filter(function (x) { return x.id === b.getAttribute('data-wsend'); })[0], c = U.client(m.from);
        m.done = true; wq.reply = null;
        U.activity('Reply sent to ' + c.name + ' from the shared inbox.');
        U.save(); App.render(); U.toast('Reply sent to ' + c.name + ' (simulated)');
      });
    });
    $$('[data-wresolve]').forEach(function (b) {
      b.addEventListener('click', function () { var e = U.enrollment(b.getAttribute('data-wresolve')); e.payIssue = null; U.save(); App.render(); U.toast('Marked resolved'); });
    });
    $$('[data-wbook]').forEach(function (b) {
      b.addEventListener('click', function () { var e = U.enrollment(b.getAttribute('data-wbook')); e.testing = 'Review booked'; U.activity('Results review booked for ' + U.client(e.client).name + '. Invite sent.'); U.save(); App.render(); U.toast('Review call booked, invite sent'); });
    });
  }

  App.register('queue', view, bind);
})();
