/* Evergrove Wellness showcase - Booking Calendar.
 *
 * The week at a glance for every practitioner, and the rules the automatic
 * booking runs on: which sessions clients can book, when each practitioner is
 * available, buffers and notice. When anyone books a video session, from the
 * client portal or here, a Zoom meeting is created, the invite goes out and
 * reminders are scheduled without anyone touching it.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  function S() { return App.state(); }
  function st() { if (!App.ui.cal) App.ui.cal = { week: 0, who: 'all', sel: null, add: null, tab: 'week' }; return App.ui.cal; }
  var START = 8, END = 20, ROW = 26; // hours shown, pixels per half hour
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function weekDates(off) {
    var t = new Date(U.today() + 'T12:00:00'), mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7) + off * 7);
    return [0, 1, 2, 3, 4, 5, 6].map(function (i) { var d = new Date(mon); d.setDate(mon.getDate() + i); return iso(d); });
  }
  function svc(b) { return EG.SERVICES.filter(function (x) { return x.id === b.service; })[0] || { label: 'Session', mins: 30 }; }
  function prac(b) { return b.with || U.client(b.guests[0]).practitioner; }
  function pr(name) { return EG.CERTIFIED.filter(function (p) { return p.name === name; })[0] || { id: 'p0', name: name, hue: 200 }; }
  function mins(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function zoomId() { var n = String(Math.floor(81000000000 + Math.random() * 8999999999)); return n.slice(0, 3) + ' ' + n.slice(3, 7) + ' ' + n.slice(7); }
  function label(b) { return b.name || svc(b).label; }
  function who(b) { return b.guests.length > 2 ? U.client(b.guests[0]).name + ' + ' + (b.guests.length - 1) : b.guests.map(function (g) { return U.client(g).name; }).join(', '); }

  /* Book a session: one place, used by the calendar and the client portal. */
  function book(o) {
    var s = EG.SERVICES.filter(function (x) { return x.id === o.service; })[0], cfg = S().bookcfg, c = U.client(o.client);
    var b = { id: 'b' + Date.now(), service: o.service, date: o.date, time: o.time, guests: [o.client], where: s.recorded ? 'Recorded' : s.pkg ? 'Studio' : 'Video call', with: o.with, paid: o.paid };
    if (o.byTeam) b.confirmed = false;
    /* A package credit covers it when the client has one for this type. */
    var used = !o.paid && window.EGPkg ? EGPkg.useCredit(c, o.service) : null;
    if (used) b.pkg = used.id;
    if (cfg.zoom && b.where === 'Video call') b.zoom = zoomId();
    S().bookings.push(b);
    U.activity(svc(b).label + ' booked for ' + c.name + ' with ' + o.with + ' on ' + U.fmtDate(o.date) + ' at ' + U.fmtTime(o.time) + '.' + (used ? ' Used a ' + used.name + ' credit.' : '') + (b.zoom ? ' Zoom meeting created and invite sent.' : b.where === 'Recorded' ? ' The video review goes to their portal.' : ' Confirmation sent.') + (cfg.remind24 || cfg.remind1 ? ' Reminders scheduled.' : '') + (o.byTeam ? ' Waiting for ' + U.first(c.name) + ' to confirm.' : ''));
    return b;
  }

  function weekView() {
    var cal = st(), D = S(), days = weekDates(cal.week), t = U.today();
    var list = D.bookings.filter(function (b) { return days.indexOf(b.date) >= 0 && (cal.who === 'all' || pr(prac(b)).id === cal.who); });
    var sel = cal.sel ? D.bookings.filter(function (b) { return b.id === cal.sel; })[0] : null;
    var hours = []; for (var h = START; h < END; h++) hours.push(h);
    var grid = '<div class="calwrap" data-tour="calweek"><div class="calgrid" style="--rows:' + (END - START) * 2 + ';--row:' + ROW + 'px"><div class="cal-hd"></div>' +
      days.map(function (d) { var x = new Date(d + 'T12:00:00'); return '<div class="cal-hd' + (d === t ? ' today' : '') + '">' + DAYS[x.getDay()] + ' <b>' + x.getDate() + '</b></div>'; }).join('') +
      '<div class="cal-times">' + hours.map(function (hh) { return '<span>' + U.fmtTime(String(hh).padStart(2, '0') + ':00').replace(':00', '') + '</span>'; }).join('') + '</div>' +
      days.map(function (d) {
        var cells = '';
        for (var i = 0; i < (END - START) * 2; i++) { var tm = String(START + Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00'); cells += '<button class="cal-cell" data-cslot="' + d + '|' + tm + '" aria-label="Book ' + d + ' ' + tm + '"></button>'; }
        return '<div class="cal-day">' + cells + list.filter(function (b) { return b.date === d; }).map(function (b) {
          var top = (mins(b.time) - START * 60) / 30 * ROW, ht = Math.max(ROW, svc(b).mins / 30 * ROW - 2), p = pr(prac(b));
          return '<button class="cal-ev' + (b.id === cal.sel ? ' is-on' : '') + '" data-cev="' + b.id + '" style="top:' + top + 'px;height:' + ht + 'px;--h:' + p.hue + '"><b>' + U.fmtTime(b.time) + '</b> ' + esc(label(b)) + '<span>' + esc(who(b)) + '</span></button>';
        }).join('') + '</div>';
      }).join('') + '</div></div>';
    var side = sel ? detail(sel) : cal.add ? addForm(cal.add) : '<div class="card"><h3 class="h3">This week</h3><p class="small muted" style="margin-top:0">' + list.length + ' appointment' + (list.length === 1 ? '' : 's') + ', ' + list.filter(function (b) { return b.zoom; }).length + ' on Zoom. Click one for details, or click an empty time to book.</p>' +
      EG.CERTIFIED.map(function (p) { var n = list.filter(function (b) { return pr(prac(b)).id === p.id; }).length; return '<div class="row small" style="margin-top:.4rem"><span class="caldot" style="--h:' + p.hue + '"></span><span class="grow">' + esc(p.name) + '</span><b>' + n + '</b></div>'; }).join('') + '</div>';
    return '<div class="row" style="justify-content:space-between;margin-bottom:.8rem"><div class="row"><button class="btn ghost small" id="calPrev" aria-label="Previous week">&larr;</button><b>' + U.fmtDate(days[0], { month: 'short', day: 'numeric' }) + ' &ndash; ' + U.fmtDate(days[6], { month: 'short', day: 'numeric' }) + '</b><button class="btn ghost small" id="calNext" aria-label="Next week">&rarr;</button>' + (cal.week ? '<button class="linkish" id="calToday">This week</button>' : '') + '</div>' +
      '<div class="chips">' + [['all', 'Everyone']].concat(EG.CERTIFIED.map(function (p) { return [p.id, p.name.replace(', ND', '')]; })).map(function (x) { return '<button class="chip small' + (cal.who === x[0] ? ' is-on' : '') + '" data-cwho2="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="calsplit">' + grid + '<div>' + side + '</div></div>';
  }

  function detail(b) {
    var s = svc(b), c = U.client(b.guests[0]), cfg = S().bookcfg;
    return '<div class="card" data-tour="caldetail"><div class="row" style="justify-content:space-between"><span class="pill' + (b.zoom ? ' ok' : '') + '">' + (b.zoom ? 'Zoom' : esc(b.where)) + '</span><button class="linkish" id="calClose">Close</button></div>' +
      '<h3 class="h3" style="margin:.5rem 0 .2rem">' + esc(label(b)) + '</h3><p class="small muted" style="margin:0">' + U.fmtDate(b.date, { weekday: 'long', month: 'long', day: 'numeric' }) + ' &middot; ' + U.fmtTime(b.time) + ' &middot; ' + s.mins + ' min</p>' +
      '<table class="small" style="margin-top:.7rem"><tbody><tr><th style="width:6.5rem">Client</th><td>' + esc(who(b)) + '</td></tr><tr><th>Practitioner</th><td>' + esc(prac(b)) + '</td></tr>' + (b.paid ? '<tr><th>Paid</th><td>' + money(b.paid) + '</td></tr>' : '') + '</tbody></table>' +
      (b.where === 'Recorded' ? '<div class="zoombox"><b class="small">Recorded review</b><div class="small muted">' + esc(prac(b)) + ' records the review at this time. The video goes to the client&rsquo;s portal and they are emailed.</div></div>' : '') +
      (b.confirmed === false ? '<p class="small" style="margin:.6rem 0 0"><span class="pill warn">Waiting for the client to confirm</span></p>' : b.confirmedAt ? '<p class="small" style="margin:.6rem 0 0"><span class="pill ok">Confirmed by the client</span></p>' : '') +
      (b.pkg ? '<p class="small" style="margin:.6rem 0 0"><span class="pill ok">' + esc(EGPkg.pkg(b.pkg).name) + ' credit</span></p>' : '') +
      (b.zoom ? '<div class="zoombox"><b class="small">Zoom meeting, created automatically</b><div class="num small">zoom.us/j/' + b.zoom.replace(/ /g, '') + '</div><div class="small muted">Meeting ID ' + b.zoom + '</div></div>' : '') +
      '<ul class="autolist small">' + [b.zoom ? 'Calendar invite with the Zoom link sent' : 'Calendar invite sent', cfg.remind24 ? 'Reminder email 24 hours before' : '', cfg.remind1 ? 'Reminder 1 hour before' + (cfg.sms ? ', by text' : ', by email') : '', cfg.gcal ? 'Added to ' + esc(prac(b).split(',')[0]) + '’s Google Calendar' : ''].filter(Boolean).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
      '<div class="row" style="margin-top:.8rem"><button class="btn small" data-calclient="' + c.id + '">Open client</button><button class="btn ghost small" id="calMove">Reschedule</button><button class="btn ghost small" id="calCancel">Cancel</button></div></div>';
  }

  function addForm(a) {
    var D = S(), clients = D.clients.slice().sort(function (x, y) { return x.name.localeCompare(y.name); });
    var types = D.bookcfg.types.map(function (t) { return EG.SERVICES.filter(function (s) { return s.id === t.id; })[0]; });
    return '<div class="card" data-tour="caladd"><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">New appointment</h3><button class="linkish" id="calClose">Close</button></div>' +
      '<p class="small muted" style="margin:.2rem 0 .6rem">' + U.fmtDate(a.date, { weekday: 'long', month: 'short', day: 'numeric' }) + ' at ' + U.fmtTime(a.time) + '</p>' +
      '<label for="calClient">Client</label><select id="calClient">' + clients.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<label for="calType" style="margin-top:.6rem">Session</label><select id="calType">' + types.map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + ' (' + s.mins + ' min)</option>'; }).join('') + '</select>' +
      '<label for="calWith" style="margin-top:.6rem">Practitioner</label><select id="calWith">' + EG.CERTIFIED.map(function (p) { return '<option>' + esc(p.name) + '</option>'; }).join('') + '</select>' +
      '<p class="small muted" style="margin:.7rem 0">' + (D.bookcfg.zoom ? 'A Zoom meeting is created and the invite goes to the client.' : 'Zoom is switched off in Booking settings.') + '</p><button class="btn ca-wide" id="calSave">Book it</button></div>';
  }

  function settings() {
    var cfg = S().bookcfg;
    var tog = function (k, title, sub) { return '<label class="tog"><input type="checkbox" data-cfg="' + k + '"' + (cfg[k] ? ' checked' : '') + '><span class="grow"><b>' + title + '</b><span class="small muted">' + sub + '</span></span></label>'; };
    return '<div class="split"><div><div class="card" data-tour="bookauto"><h3 class="h3">What happens when a client books</h3><p class="small muted" style="margin-top:0">Clients book from their portal or your booking link: <code>evergrove.example/book</code></p>' +
        tog('zoom', 'Create a Zoom meeting', 'A unique meeting for every video session, added to the invite') +
        tog('remind24', 'Reminder 24 hours before', 'Email with the Zoom link and any forms still to sign') +
        tog('remind1', 'Reminder 1 hour before', 'With the Zoom link') +
        tog('sms', 'Send reminders by text too', 'Needs a texting account') +
        tog('gcal', 'Sync to practitioners’ Google Calendars', 'Busy times there are blocked here') +
        '<div class="fields" style="margin-top:.8rem"><div><label for="cfgBuffer">Gap between sessions</label><select id="cfgBuffer">' + [0, 10, 15, 30].map(function (n) { return '<option value="' + n + '"' + (n === cfg.buffer ? ' selected' : '') + '>' + (n ? n + ' minutes' : 'None') + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="cfgNotice">Minimum notice</label><select id="cfgNotice">' + [2, 12, 24, 48].map(function (n) { return '<option value="' + n + '"' + (n === cfg.notice ? ' selected' : '') + '>' + n + ' hours</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="card" style="margin-top:1rem"><h3 class="h3">Sessions clients can book</h3>' + cfg.types.map(function (t, i) {
        var s = EG.SERVICES.filter(function (x) { return x.id === t.id; })[0];
        return '<label class="tog"><input type="checkbox" data-ctype="' + i + '"' + (t.on ? ' checked' : '') + '><span class="grow"><b>' + esc(s.label) + '</b><span class="small muted">' + s.mins + ' min' + (s.price ? ' &middot; ' + money(s.price, false) : ' &middot; included in the 12 Week Package') + '</span></span></label>';
      }).join('') + '</div></div>' +
      '<div class="card" data-tour="avail"><h3 class="h3">When each practitioner is available</h3>' + EG.CERTIFIED.map(function (p) {
        var h = cfg.hours[p.id], ds = cfg.days[p.id];
        var opts = function (v) { return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(function (x) { return '<option value="' + x + '"' + (x === v ? ' selected' : '') + '>' + U.fmtTime(x) + '</option>'; }).join(''); };
        return '<div class="availrow"><div class="row" style="margin-bottom:.4rem"><span class="caldot" style="--h:' + p.hue + '"></span><b>' + esc(p.name) + '</b></div><div class="chips">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<button class="chip small' + (ds.indexOf(d) >= 0 ? ' is-on' : '') + '" data-aday="' + p.id + '|' + d + '">' + DAYS[d] + '</button>'; }).join('') + '</div>' +
          '<div class="row" style="margin-top:.4rem"><select data-ahour="' + p.id + '|0" aria-label="From">' + opts(h[0]) + '</select><span class="small muted">to</span><select data-ahour="' + p.id + '|1" aria-label="To">' + opts(h[1]) + '</select></div></div>';
      }).join('') + '<p class="small muted" style="margin:.6rem 0 0">Clients only see open times inside these hours, after the gap and notice rules.</p></div></div>';
  }

  function view() {
    var cal = st();
    return U.head('Zoom sessions that book themselves', 'Booking Calendar', 'Every practitioner’s week in one place. Clients book open times from their portal, and the Zoom link, invite and reminders go out on their own.') +
      '<div class="tabs"><button class="tab' + (cal.tab === 'week' ? ' is-on' : '') + '" data-caltab="week">Calendar</button><button class="tab' + (cal.tab === 'settings' ? ' is-on' : '') + '" data-caltab="settings">Booking settings</button></div>' +
      (cal.tab === 'settings' ? settings() : weekView());
  }

  function bind() {
    var cal = st(), $ = U.$, $$ = U.$$, cfg = S().bookcfg;
    function keep() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    $$('[data-caltab]').forEach(function (b) { b.addEventListener('click', function () { cal.tab = b.getAttribute('data-caltab'); keep(); }); });
    [['#calPrev', -1], ['#calNext', 1]].forEach(function (x) { var b = $(x[0]); if (b) b.addEventListener('click', function () { cal.week += x[1]; cal.sel = null; cal.add = null; keep(); }); });
    var td = $('#calToday'); if (td) td.addEventListener('click', function () { cal.week = 0; keep(); });
    $$('[data-cwho2]').forEach(function (b) { b.addEventListener('click', function () { cal.who = b.getAttribute('data-cwho2'); cal.sel = null; keep(); }); });
    $$('[data-cev]').forEach(function (b) { b.addEventListener('click', function () { cal.sel = b.getAttribute('data-cev'); cal.add = null; keep(); }); });
    $$('[data-cslot]').forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-cslot').split('|'); cal.add = { date: p[0], time: p[1] }; cal.sel = null; keep(); }); });
    var cl = $('#calClose'); if (cl) cl.addEventListener('click', function () { cal.sel = null; cal.add = null; keep(); });
    $$('[data-calclient]').forEach(function (b) { b.addEventListener('click', function () { EGPortal.open(b.getAttribute('data-calclient'), 'bookings'); }); });
    var mv = $('#calMove'); if (mv) mv.addEventListener('click', function () { U.toast('The client gets a link to pick a new time (simulated)'); });
    var cn = $('#calCancel');
    if (cn) cn.addEventListener('click', function () {
      var D = S(), b = D.bookings.filter(function (x) { return x.id === cal.sel; })[0];
      D.bookings.splice(D.bookings.indexOf(b), 1);
      U.activity(label(b) + ' for ' + who(b) + ' cancelled.' + (b.zoom ? ' Zoom meeting deleted and the client told.' : ''));
      cal.sel = null; U.save(); keep(); U.toast('Cancelled. The client has been told.');
    });
    var sv = $('#calSave');
    if (sv) sv.addEventListener('click', function () {
      var s = $('#calType').value, b = book({ client: $('#calClient').value, service: s, date: cal.add.date, time: cal.add.time, with: $('#calWith').value, byTeam: true });
      cal.add = null; cal.sel = b.id; U.save(); keep(); U.toast(cfg.zoom ? 'Booked. Zoom link sent to the client.' : 'Booked.');
    });
    /* settings */
    $$('[data-cfg]').forEach(function (i) { i.addEventListener('change', function () { cfg[i.getAttribute('data-cfg')] = i.checked; U.save(); U.toast('Saved'); }); });
    $$('[data-ctype]').forEach(function (i) { i.addEventListener('change', function () { cfg.types[+i.getAttribute('data-ctype')].on = i.checked; U.save(); U.toast('Saved'); }); });
    var bu = $('#cfgBuffer'); if (bu) bu.addEventListener('change', function () { cfg.buffer = +bu.value; U.save(); U.toast('Saved'); });
    var no = $('#cfgNotice'); if (no) no.addEventListener('change', function () { cfg.notice = +no.value; U.save(); U.toast('Saved'); });
    $$('[data-aday]').forEach(function (b) {
      b.addEventListener('click', function () { var p = b.getAttribute('data-aday').split('|'), ds = cfg.days[p[0]], d = +p[1], i = ds.indexOf(d); if (i >= 0) ds.splice(i, 1); else ds.push(d); U.save(); keep(); });
    });
    $$('[data-ahour]').forEach(function (s) { s.addEventListener('change', function () { var p = s.getAttribute('data-ahour').split('|'); cfg.hours[p[0]][+p[1]] = s.value; U.save(); U.toast('Saved'); }); });
  }

  window.EGCal = { book: book, svc: svc, prac: prac, label: label };
  App.register('calendar', view, bind);
})();
