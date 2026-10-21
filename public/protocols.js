/* Evergrove Wellness showcase - protocols.
 *
 * A protocol is what a client takes, how much and when, for how long. The
 * creator suggests remedies from the client's latest report and their goals;
 * the practitioner sets the dose, the times of day and the weeks, and
 * publishes it. The client then sees a daily schedule with reminders in their
 * app. The same document view is used in the creator, on the client's page
 * (as the PDF) and in the client app.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  function S() { return App.state(); }
  function st() { if (!App.ui.pc) App.ui.pc = { client: 'c7', draft: null }; return App.ui.pc; }
  function latestScan(id) { return S().scans.filter(function (x) { return x.client === id && x.status === 'published'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0] || null; }
  function activeFor(id) { return S().protocols.filter(function (p) { return p.client === id && p.status === 'active'; })[0] || null; }
  function endDate(start, weeks) { var d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + weeks * 7); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function longest(p) { return p.items.reduce(function (m, x) { return Math.max(m, +x.weeks || 0); }, 0); }

  /* The protocol as the client receives it: a daily schedule, then the details. */
  function doc(p, compact) {
    var c = U.client(p.client), weeks = longest(p);
    var grid = EG.TIMES.map(function (t) {
      var rows = p.items.filter(function (x) { return x.times.indexOf(t[0]) >= 0; });
      return '<div class="pd-slot"><div class="pd-time"><b>' + t[1] + '</b><span>' + t[2] + '</span></div>' +
        (rows.length ? rows.map(function (x) { return '<div class="pd-take"><span>' + esc(EG.product(x.sku).name) + '</span><b>' + esc(x.dose) + '</b></div>'; }).join('') : '<div class="pd-none">Nothing</div>') + '</div>';
    }).join('');
    return '<div class="pdoc' + (compact ? ' compact' : '') + '" data-tour="protodoc"><div class="pd-head"><div><div class="pd-title">Personal Protocol</div><div class="pd-sub">Evergrove Wellness &middot; sample data</div></div>' +
      '<div class="pd-meta">' + [['Client', c.name], ['Practitioner', p.by], ['Starts', U.fmtDate(p.start, { month: 'short', day: 'numeric', year: 'numeric' })], ['Review', U.fmtDate(endDate(p.start, weeks), { month: 'short', day: 'numeric' })]].map(function (m) { return '<div><span>' + m[0] + '</span><b>' + esc(m[1]) + '</b></div>'; }).join('') + '</div></div>' +
      '<div class="pd-body"><div class="pd-h">Your day</div><div class="pd-grid">' + grid + '</div>' +
      '<div class="pd-h">Your remedies</div><div class="tablewrap"><table class="pd-table"><thead><tr><th>Remedy</th><th>Dose</th><th>When</th>' + (compact ? '' : '<th>How</th>') + '<th class="r">Weeks</th></tr></thead><tbody>' +
      p.items.map(function (x) {
        var pr = EG.product(x.sku);
        return '<tr><td><b>' + esc(pr.name) + '</b><br><span class="muted">' + esc(EG.SUPPLIERS[pr.supplier].short) + ' &middot; ' + esc(pr.dose) + '</span></td><td>' + esc(x.dose) + '</td><td>' + x.times.map(function (t) { return EG.TIMES.filter(function (y) { return y[0] === t; })[0][1]; }).join(', ') + '</td>' + (compact ? '' : '<td>' + esc(x.how) + '</td>') + '<td class="r">' + x.weeks + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (p.note ? '<div class="pd-h">From your practitioner</div><p class="pd-note">' + esc(p.note) + '</p>' : '') +
      '<p class="pd-fine">Take only as your practitioner has set out here. Stop and contact us if anything feels wrong. This plan does not replace care from your doctor.</p></div></div>';
  }

  function clone(p) { return JSON.parse(JSON.stringify(p)); }
  function draftFor(id) {
    var a = activeFor(id);
    if (a) { var d = clone(a); d.editing = a.id; return d; }
    return { id: null, client: id, status: 'draft', created: U.today(), start: EG.iso(2), by: 'Theo Marsh', items: [], note: '' };
  }

  function view() {
    var ps = st(), D = S();
    if (!ps.draft || ps.draft.client !== ps.client) ps.draft = draftFor(ps.client);
    var d = ps.draft, c = U.client(ps.client), sc = latestScan(c.id), sug = EG.protoSuggestions(c, sc);
    var have = {}; d.items.forEach(function (x) { have[x.sku] = 1; });
    var clients = D.clients.slice().sort(function (a, b) { return (b.member ? 1 : 0) - (a.member ? 1 : 0) || a.name.localeCompare(b.name); });
    var sugRow = function (x) {
      var p = EG.product(x.sku);
      return '<div class="sug">' + U.bottle(p, true) + '<div class="grow"><b class="small">' + esc(p.name) + '</b><div class="small muted">' + esc(x.why) + '</div></div>' +
        (have[x.sku] ? '<span class="pill ok">Added</span>' : '<button class="btn ghost small" data-padd="' + x.sku + '">Add</button>') + '</div>';
    };
    return '<p class="eyebrow">Protocol creator</p><h1 class="h1">Protocols</h1><p class="lede">Choose what a client takes, how much and when. Suggestions come from their latest report and their goals; you decide.</p>' +
      '<div class="row" style="margin-bottom:1rem"><label for="pcClient" style="margin:0">Client</label><select id="pcClient" style="width:auto;min-width:16rem">' + clients.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(x.name) + (x.member ? ' (Premium)' : '') + '</option>'; }).join('') + '</select>' +
      (d.editing ? '<span class="pill ok">Editing the active protocol</span>' : '<span class="pill">New protocol</span>') + '</div>' +
      '<div class="split"><div class="card" data-tour="suggestions"><h3 class="h3">Suggestions</h3>' +
        (sc ? '<p class="label" style="margin-top:.6rem">From the report of ' + U.fmtDate(sc.date) + '</p>' + sug.filter(function (x) { return x.from === 'report'; }).map(sugRow).join('') : '<p class="small muted">No published report yet. Create one in Client reports to get remedy suggestions from the scan.</p>') +
        '<p class="label" style="margin-top:1rem">From their goals: ' + c.goals.map(EG.goalLabel).join(', ') + '</p>' + sug.filter(function (x) { return x.from === 'goals'; }).slice(0, 4).map(sugRow).join('') + '</div>' +
      '<div class="card" data-tour="builder"><h3 class="h3">' + esc(U.first(c.name)) + '&rsquo;s protocol</h3>' +
        (d.items.length ? d.items.map(function (x, i) {
          var p = EG.product(x.sku);
          return '<div class="prow"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b class="small">' + esc(p.name) + '</b><button class="linkish" data-prm="' + i + '" aria-label="Remove ' + esc(p.name) + '">Remove</button></div>' +
            '<div class="prow-f"><input type="text" value="' + esc(x.dose) + '" data-pf="dose" data-i="' + i + '" aria-label="Dose"><input type="number" min="1" max="52" value="' + x.weeks + '" data-pf="weeks" data-i="' + i + '" aria-label="Weeks"><span class="small muted">weeks</span></div>' +
            '<div class="chips">' + EG.TIMES.map(function (t) { return '<button class="chip small' + (x.times.indexOf(t[0]) >= 0 ? ' is-on' : '') + '" data-pt="' + t[0] + '" data-i="' + i + '">' + t[1] + '</button>'; }).join('') + '</div>' +
            '<select data-pf="how" data-i="' + i + '" aria-label="How to take it">' + EG.HOWS.map(function (h) { return '<option' + (h === x.how ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></div>';
        }).join('') : '<p class="small muted">Add remedies from the suggestions to start.</p>') +
        '<div class="fields" style="margin-top:.8rem"><div><label for="pcStart">Starts</label><input id="pcStart" type="date" value="' + d.start + '"></div><div><label for="pcBy">Practitioner</label><select id="pcBy">' + EG.CERTIFIED.map(function (p) { return '<option' + (p.name === d.by ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="wide"><label for="pcNote">Note to the client</label><textarea id="pcNote" rows="2">' + esc(d.note) + '</textarea></div></div>' +
        '<div class="row" style="margin-top:1rem"><button class="btn" id="pcPublish"' + (d.items.length ? '' : ' disabled') + '>Publish to ' + esc(U.first(c.name)) + '&rsquo;s app</button><button class="btn ghost" id="pcOrder"' + (d.items.length ? '' : ' disabled') + '>Order these remedies</button><button class="btn ghost" id="pcPdf"' + (d.items.length ? '' : ' disabled') + '>Save PDF to documents</button></div></div></div>' +
      (d.items.length ? '<h2 class="h2">What ' + esc(U.first(c.name)) + ' will see</h2>' + doc(d, false) : '');
  }

  function bind() {
    var ps = st(), $ = U.$, $$ = U.$$, d = ps.draft;
    function keep() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    $('#pcClient').addEventListener('change', function (e) { ps.client = e.target.value; ps.draft = null; App.render(); });
    $$('[data-padd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sku = b.getAttribute('data-padd'), sug = EG.protoSuggestions(U.client(d.client), latestScan(d.client)).filter(function (x) { return x.sku === sku; })[0] || {};
        d.items.push(EG.protoItem(sku, sug.dose, sug.weeks)); keep();
      });
    });
    $$('[data-prm]').forEach(function (b) { b.addEventListener('click', function () { d.items.splice(+b.getAttribute('data-prm'), 1); keep(); }); });
    $$('[data-pt]').forEach(function (b) {
      b.addEventListener('click', function () {
        var x = d.items[+b.getAttribute('data-i')], t = b.getAttribute('data-pt'), i = x.times.indexOf(t);
        if (i >= 0) { if (x.times.length > 1) x.times.splice(i, 1); } else x.times.push(t);
        x.times.sort(function (a, b2) { return EG.TIMES.map(function (y) { return y[0]; }).indexOf(a) - EG.TIMES.map(function (y) { return y[0]; }).indexOf(b2); });
        keep();
      });
    });
    $$('[data-pf]').forEach(function (inp) {
      inp.addEventListener('change', function () { var x = d.items[+inp.getAttribute('data-i')], f = inp.getAttribute('data-pf'); x[f] = f === 'weeks' ? Math.max(1, +inp.value || 1) : inp.value; keep(); });
    });
    $('#pcStart').addEventListener('change', function (e) { d.start = e.target.value; keep(); });
    $('#pcBy').addEventListener('change', function (e) { d.by = e.target.value; keep(); });
    $('#pcNote').addEventListener('change', function (e) { d.note = e.target.value; keep(); });
    var c = U.client(d.client);
    var pub = $('#pcPublish');
    if (pub) pub.addEventListener('click', function () {
      var D = S();
      D.protocols.forEach(function (p) { if (p.client === d.client && p.status === 'active') p.status = 'replaced'; });
      var p = clone(d); delete p.editing; p.id = 'p' + Date.now(); p.status = 'active'; p.created = U.today();
      D.protocols.unshift(p);
      D.emails.unshift({ at: U.today(), to: c.id, kind: 'Protocol', subject: 'Your protocol is ready' });
      U.activity('Protocol for ' + c.name + ' published by ' + p.by + ': ' + p.items.length + ' remedies. Daily reminders scheduled in their app.');
      U.save(); ps.draft = null; App.render(); U.toast('Published. ' + U.first(c.name) + ' has been emailed.');
    });
    var ord = $('#pcOrder');
    if (ord) ord.addEventListener('click', function () {
      var D = S(), o = { id: 'EG-' + (D.nextOrder++), client: c.id, at: U.today(), source: 'Protocol', stage: 0, sub: false, discount: c.member ? EG.PROGRAM.discount : 0,
        items: d.items.map(function (x) { return [x.sku, Math.max(1, Math.ceil(x.weeks / 4))]; }) };
      D.orders.push(o);
      U.activity(o.id + ' created from ' + c.name + '’s protocol (' + o.items.length + ' remedies). Waiting for approval in Shop.');
      U.save(); U.toast('Order created. It is waiting for approval in Shop.');
    });
    var pdf = $('#pcPdf');
    if (pdf) pdf.addEventListener('click', function () {
      c.docs = c.docs || [];
      c.docs.unshift({ name: 'Protocol ' + U.fmtDate(d.start, { month: 'short', day: 'numeric' }) + '.pdf', at: U.today(), kind: 'Protocol' });
      U.save(); U.toast('PDF saved to ' + c.name + '’s documents');
    });
  }

  window.EGProto = { doc: doc, activeFor: activeFor, latestScan: latestScan, endDate: endDate, longest: longest };
  App.register('protocols', view, bind);
})();
