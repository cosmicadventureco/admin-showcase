/* Evergrove Wellness showcase - automations.
 *
 * The jobs that run on their own, as working controls: each one can be
 * switched on or off, has its own settings, keeps a log, and can be run by
 * hand. The Work queue shows all of them; Shop shows the ones about orders.
 * Some settings drive the rest of the showcase (the clinic order threshold,
 * the margin alert, how many remedies a scan report carries, whether plan and
 * tracking emails go out).
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc;
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /* settings: [key, label, type, default, extra]. type: number | time | day | check */
  var DEFS = [
    { id: 'approval', area: 'shop', name: 'Order approval', locked: true,
      when: function () { return 'Every order, refill and clinic order waits for a person before any supplier sees it.'; },
      settings: [['margin', 'Warn when margin is below', 'number', 35, '%'], ['flagTick', 'Screening flags need a practitioner tick', 'check', true, '', true]],
      runs: 23, match: /approved|moved to the clinic order/i },
    { id: 'cart', area: 'shop', name: 'Supplier cart fill',
      when: function () { return 'After approval: fills the Physica or DesBio cart in your logged-in tab, or opens the Biotics cart link. You check out.'; },
      settings: [['shipTo', 'Default ship-to for client orders', 'select', 'client', ['client', 'clinic']], ['confirm', 'Save the confirmation number from the supplier email', 'check', true]],
      runs: 19, match: /cart filled|cart link|checked out/i },
    { id: 'batch', area: 'shop', name: 'Clinic order batching',
      when: function (s) { return 'Clinic stock collects per supplier. Orders when Physica reaches $' + s.threshold + ', or every ' + s.day + ', whichever comes first.'; },
      settings: [['threshold', 'Order Physica when the batch reaches', 'number', 500, '$'], ['day', 'Or every', 'day', 'Friday']],
      runs: 1, match: /PO-|clinic order|clinic stock/i },
    { id: 'tracking', area: 'shop', name: 'Tracking emails',
      when: function (s) { return 'When a supplier ships, the client gets the tracking number' + (s.sms ? ' by email and text.' : ' by email.'); },
      settings: [['sms', 'Also send a text message', 'check', false]],
      runs: 17, match: /tracking/i },
    { id: 'refills', area: 'shop', name: 'Auto-ship refills',
      when: function (s) { return 'Creates each refill every ' + s.every + ' days, reminds the client ' + s.remind + ' days before, and adds $' + s.credit + ' credit toward a session or short course. Refills still wait for approval.'; },
      settings: [['every', 'Refill every', 'number', 30, 'days'], ['remind', 'Remind the client', 'number', 5, 'days before'], ['credit', 'Credit per refill, toward sessions and short courses', 'number', 5, '$']],
      runs: 9, match: /refill/i },
    { id: 'plan', area: 'clients', name: 'Personal plan email',
      when: function () { return 'When someone finishes the questionnaire, their plan is emailed and they join the newsletter lists for their goals.'; },
      settings: [['classes', 'Include suggested classes', 'check', true], ['segments', 'Add to goal newsletters', 'check', true]],
      runs: 11, match: /questionnaire/i },
    { id: 'intake', area: 'clients', name: 'Intake reminders',
      when: function (s) { return 'If a booked client has not finished their forms, remind them ' + s.after + ' days after booking and again ' + s.before + ' day before.'; },
      settings: [['after', 'First reminder after', 'number', 2, 'days'], ['before', 'Last reminder', 'number', 1, 'days before']],
      runs: 6, match: /intake reminder|reminder sent to/i },
    { id: 'reviews', area: 'clients', name: 'Review requests',
      when: function (s) { return 'Asks for a review ' + s.after + ' days after a session or a delivered order, at most once every ' + s.gap + ' days per client.'; },
      settings: [['after', 'Ask after', 'number', 7, 'days'], ['gap', 'At most once every', 'number', 90, 'days']],
      runs: 8, match: /review/i },
    { id: 'unlock', area: 'course', name: 'Premium week unlock',
      when: function (s) { return 'Unlocks each member’s next course week every 7 days at ' + s.time + ' and emails them.'; },
      settings: [['time', 'Unlock at', 'time', '07:00']],
      runs: 5, match: /unlock/i },
    { id: 'zoom', area: 'course', name: 'Zoom reminders',
      when: function (s) { return 'Reminds Premium members on ' + s.day + ' at ' + s.time + ', and again ' + s.mins + ' minutes before the session.'; },
      settings: [['day', 'Remind on', 'day', 'Thursday'], ['time', 'At', 'time', '06:45'], ['mins', 'Second reminder', 'number', 15, 'minutes before']],
      runs: 2, match: /zoom/i },
    { id: 'payments', area: 'course', name: 'Payment-plan retries',
      when: function (s) { return 'If an instalment fails, sends a card-update link and retries every ' + s.gap + ' days, up to ' + s.tries + ' times, then tells the owner.'; },
      settings: [['gap', 'Retry every', 'number', 3, 'days'], ['tries', 'Give up after', 'number', 3, 'tries']],
      runs: 1, match: /payment|card/i },
    { id: 'scans', area: 'course', name: 'Scan report extraction',
      when: function (s) { return 'When all four scan exports are in, extracts and ranks the findings and puts the top ' + s.top + ' remedies in the draft. A practitioner signs off before it is published.'; },
      settings: [['top', 'Remedies in the report', 'number', 8, ''], ['claims', 'Block publishing while claim language remains', 'check', true, '', true]],
      runs: 2, match: /scan/i }
  ];
  var AREAS = { shop: 'Orders', clients: 'Clients', course: 'Premium Course' };

  function S() { return App.state(); }
  function st() { if (!App.ui.au) App.ui.au = { open: null, panel: null }; return App.ui.au; }
  function def(id) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].id === id) return DEFS[i]; return null; }
  /* Saved state for one automation, filled in from its defaults on first use. */
  function get(id) {
    var D = S(), d = def(id);
    if (!D.auto) D.auto = {};
    if (!D.auto[id]) {
      var s = {}; d.settings.forEach(function (x) { s[x[0]] = x[3]; });
      D.auto[id] = { on: true, s: s, runs: d.runs, last: null };
    }
    return D.auto[id];
  }
  function setting(id, key) { return get(id).s[key]; }
  function on(id) { return get(id).on; }

  function field(d, a, x) {
    var k = x[0], v = a.s[k], idf = 'au-' + d.id + '-' + k, lock = x[5];
    var input;
    if (x[2] === 'check') input = '<label class="check"><input type="checkbox" id="' + idf + '" data-auset="' + d.id + '" data-k="' + k + '"' + (v ? ' checked' : '') + (lock ? ' disabled' : '') + '> ' + esc(x[1]) + (lock ? ' <span class="pill">Always on</span>' : '') + '</label>';
    else if (x[2] === 'day') input = '<label for="' + idf + '">' + esc(x[1]) + '</label><select id="' + idf + '" data-auset="' + d.id + '" data-k="' + k + '">' + DAYS.map(function (dd) { return '<option' + (dd === v ? ' selected' : '') + '>' + dd + '</option>'; }).join('') + '</select>';
    else if (x[2] === 'select') input = '<label for="' + idf + '">' + esc(x[1]) + '</label><select id="' + idf + '" data-auset="' + d.id + '" data-k="' + k + '">' + x[4].map(function (o) { return '<option value="' + o + '"' + (o === v ? ' selected' : '') + '>' + (o === 'client' ? 'The client (drop-ship)' : 'The clinic') + '</option>'; }).join('') + '</select>';
    else input = '<label for="' + idf + '">' + esc(x[1]) + '</label><div class="row" style="flex-wrap:nowrap;gap:.4rem">' + (x[4] === '$' ? '<span>$</span>' : '') + '<input id="' + idf + '" type="' + (x[2] === 'time' ? 'time' : 'number') + '" value="' + esc(v) + '" data-auset="' + d.id + '" data-k="' + k + '" style="max-width:8rem">' + (x[4] && x[4] !== '$' ? '<span class="small muted">' + esc(x[4]) + '</span>' : '') + '</div>';
    return '<div>' + input + '</div>';
  }

  function logFor(d) {
    var rows = S().activity.filter(function (a) { return d.match.test(a.text) || a.text.indexOf(d.name) === 0; }).slice(0, 6);
    return rows.length ? rows.map(function (a) { return '<div class="li"><span class="pill num">' + U.fmtDate(a.at, { month: 'short', day: 'numeric' }) + ' ' + a.time + '</span><span class="grow small">' + esc(a.text) + '</span></div>'; }).join('')
      : '<p class="small muted" style="margin:0">Nothing logged in the last two weeks.</p>';
  }

  function html(area) {
    var ui = st(), list = DEFS.filter(function (d) { return !area || d.area === area; });
    var running = list.filter(function (d) { return on(d.id); }).length;
    return '<div class="card" data-tour="automations"><div class="row" style="justify-content:space-between;margin-bottom:.4rem"><h3 class="h3" style="margin:0">' + (area ? 'Order automations' : 'Automations') + '</h3><span class="small muted">' + running + ' of ' + list.length + ' running</span></div>' +
      list.map(function (d) {
        var a = get(d.id), open = ui.open === d.id;
        return '<div class="auto' + (a.on ? '' : ' off') + '" id="au-' + d.id + '"><div class="auto-row">' +
          (d.locked ? '<span class="toggle locked" title="Always on"></span>' : '<button class="toggle' + (a.on ? '' : ' off') + '" data-autog="' + d.id + '" aria-label="' + (a.on ? 'Switch off ' : 'Switch on ') + esc(d.name) + '"></button>') +
          '<div class="grow"><div class="row" style="gap:.5rem"><b>' + esc(d.name) + '</b>' + (area ? '' : '<span class="pill">' + AREAS[d.area] + '</span>') + (d.locked ? '<span class="pill">Always on</span>' : a.on ? '' : '<span class="pill warn">Off</span>') + '</div>' +
          '<div class="small muted">' + esc(d.when(a.s)) + '</div><div class="small muted">' + a.runs + (a.runs === 1 ? ' run' : ' runs') + ' this week' + (a.last ? ' &middot; last run by hand at ' + a.last : '') + '</div></div>' +
          '<div class="row auto-acts"><button class="btn ghost small" data-aupanel="' + d.id + '" data-p="settings">Settings</button><button class="btn ghost small" data-aupanel="' + d.id + '" data-p="log">Log</button>' + (d.locked ? '' : '<button class="btn small" data-aurun="' + d.id + '"' + (a.on ? '' : ' disabled') + '>Run now</button>') + '</div></div>' +
          (open && ui.panel === 'settings' ? '<div class="auto-panel"><div class="fields">' + d.settings.map(function (x) { return field(d, a, x); }).join('') + '</div><p class="small muted" style="margin:.6rem 0 0">Changes save as you make them.</p></div>' : '') +
          (open && ui.panel === 'log' ? '<div class="auto-panel"><div class="list">' + logFor(d) + '</div></div>' : '') +
          '</div>';
      }).join('') + '</div>';
  }

  function bind(rerender) {
    var ui = st(), $$ = U.$$;
    function keep() { var y = window.scrollY; rerender(); window.scrollTo(0, y); }
    $$('[data-autog]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-autog'), a = get(id), d = def(id);
        a.on = !a.on;
        U.activity(d.name + ' switched ' + (a.on ? 'on' : 'off') + ' by ' + EG.BRAND.owner + '.');
        U.save(); keep(); U.toast(d.name + (a.on ? ' is running' : ' is off'));
      });
    });
    $$('[data-aupanel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-aupanel'), p = b.getAttribute('data-p');
        if (ui.open === id && ui.panel === p) { ui.open = null; ui.panel = null; } else { ui.open = id; ui.panel = p; }
        keep();
      });
    });
    $$('[data-auset]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var id = inp.getAttribute('data-auset'), k = inp.getAttribute('data-k'), a = get(id), d = def(id);
        var x = d.settings.filter(function (y) { return y[0] === k; })[0];
        a.s[k] = x[2] === 'check' ? inp.checked : x[2] === 'number' ? Math.max(0, +inp.value || 0) : inp.value;
        U.activity(d.name + ': “' + x[1] + '” set to ' + (x[2] === 'check' ? (a.s[k] ? 'on' : 'off') : a.s[k] + (x[4] && x[4] !== '$' && typeof x[4] === 'string' ? ' ' + x[4] : '')) + ' by ' + EG.BRAND.owner + '.');
        U.save(); keep(); U.toast('Saved');
      });
    });
    $$('[data-aurun]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-aurun'), a = get(id), d = def(id), n = new Date();
        a.runs++; a.last = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
        U.activity(d.name + ' run by hand by ' + EG.BRAND.owner + ': ' + d.when(a.s).replace(/\.$/, '') + '. Nothing else needed.');
        U.save(); ui.open = id; ui.panel = 'log'; keep(); U.toast(d.name + ' ran');
      });
    });
  }

  window.EGAuto = { html: html, bind: bind, on: on, setting: setting, DEFS: DEFS };
})();
