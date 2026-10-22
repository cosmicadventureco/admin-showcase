/* Root Cause Clinic showcase - protocols.
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
  function st() { if (!App.ui.pc) App.ui.pc = { client: 'c7', draft: null, mode: 'list' }; return App.ui.pc; }
  function byId(id) { return S().protocols.filter(function (p) { return p.id === id; })[0]; }
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
    return '<div class="pdoc' + (compact ? ' compact' : '') + '" data-tour="protodoc"><div class="pd-head"><div><div class="pd-title">Personal Protocol</div><div class="pd-sub">Root Cause Clinic &middot; sample data</div></div>' +
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
    return { id: null, client: id, status: 'draft', created: U.today(), start: EG.iso(2), by: 'Deana', items: [], note: '' };
  }

  /* Every protocol, newest first, each with its report one click away. */
  function listView() {
    var ps = st(), D = S(), rows = D.protocols.slice().sort(function (a, b) { return (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || (a.start < b.start ? 1 : -1); });
    var shown = ps.viewing ? byId(ps.viewing) : null;
    var clients = D.clients.slice().sort(function (a, b) { return (b.member ? 1 : 0) - (a.member ? 1 : 0) || a.name.localeCompare(b.name); });
    return '<p class="eyebrow">What each client takes, how much and when</p><h1 class="h1">Protocol Creator</h1><p class="lede">Build a protocol from the client&rsquo;s report, publish it to their app with a daily schedule and reminders, and view or print any protocol report.</p>' +
      '<div class="card" style="margin-bottom:1rem"><div class="row"><label for="pcClient" style="margin:0">New protocol for</label><select id="pcClient" style="width:auto;min-width:16rem">' + clients.map(function (x) { return '<option value="' + x.id + '"' + (x.id === ps.client ? ' selected' : '') + '>' + esc(x.name) + (x.member ? ' (Premium)' : '') + '</option>'; }).join('') + '</select><button class="btn" id="pcNew">Open the creator</button></div></div>' +
      '<h2 class="h2">Protocols</h2><div class="card"><div class="tablewrap"><table data-tour="protolist"><thead><tr><th>Client</th><th>Starts</th><th>Remedies</th><th>Practitioner</th><th>Status</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (p) {
        return '<tr><td><b>' + esc(U.client(p.client).name) + '</b></td><td class="num">' + U.fmtDate(p.start) + '</td><td class="num">' + p.items.length + '</td><td>' + esc(p.by) + '</td><td>' + (p.status === 'active' ? '<span class="pill ok">Active</span>' : '<span class="pill">Replaced</span>') + '</td>' +
          '<td class="r"><button class="btn small' + (ps.viewing === p.id ? '' : ' ghost') + '" data-pview="' + p.id + '">View report</button>' + (p.status === 'active' ? ' <button class="btn ghost small" data-pedit="' + p.client + '">Edit</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="muted">No protocols yet.</td></tr>') + '</tbody></table></div></div>' +
      (shown ? '<div id="pcReport" style="margin-top:1.2rem"><div class="row" style="justify-content:space-between;margin-bottom:.6rem"><h2 class="h2" style="margin:0">Protocol report: ' + esc(U.client(shown.client).name) + '</h2><span class="row"><button class="btn ghost small" id="pcPrint">Download PDF</button><button class="btn ghost small" id="pcHide">Close</button></span></div>' + doc(shown, false) + '</div>' : '');
  }

  function view() {
    var ps = st(), D = S();
    if (ps.mode !== 'edit') return listView();
    if (!ps.draft || ps.draft.client !== ps.client) ps.draft = draftFor(ps.client);
    var d = ps.draft, c = U.client(ps.client), sc = latestScan(c.id), sug = EG.protoSuggestions(c, sc);
    var have = {}; d.items.forEach(function (x) { have[x.sku] = 1; });
    var clients = D.clients.slice().sort(function (a, b) { return (b.member ? 1 : 0) - (a.member ? 1 : 0) || a.name.localeCompare(b.name); });
    var sugRow = function (x) {
      var p = EG.product(x.sku);
      return '<div class="sug">' + U.bottle(p, true) + '<div class="grow"><b class="small">' + esc(p.name) + '</b><div class="small muted">' + esc(x.why) + '</div></div>' +
        (have[x.sku] ? '<span class="pill ok">Added</span>' : '<button class="btn ghost small" data-padd="' + x.sku + '">Add</button>') + '</div>';
    };
    return '<button class="back" id="pcBack">&larr; All protocols</button><p class="eyebrow">Protocol Creator</p><h1 class="h1">' + esc(c.name) + '</h1><p class="lede">Choose what ' + esc(U.first(c.name)) + ' takes, how much and when. Suggestions come from their latest report and their goals; you decide.</p>' +
      '<div class="row" style="margin-bottom:1rem"><label for="pcClient" style="margin:0">Client</label><select id="pcClient" style="width:auto;min-width:16rem">' + clients.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(x.name) + (x.member ? ' (Premium)' : '') + '</option>'; }).join('') + '</select>' +
      (d.editing ? '<span class="pill ok">Editing the active protocol</span>' : '<span class="pill">New protocol</span>') + (sc ? '<button class="btn ghost small" id="pcSeeReport">' + (ps.report ? 'Hide' : 'View') + ' client report</button>' : '') + '</div>' +
      (sc && ps.report ? '<div style="margin-bottom:1rem">' + EGScan.reportHtml(sc, true) + '</div>' : '') +
      '<div class="split"><div class="card" data-tour="suggestions"><h3 class="h3">Suggestions</h3>' +
        (sc ? '<div class="row" style="justify-content:space-between;margin-top:.6rem"><p class="label" style="margin:0">From the report of ' + U.fmtDate(sc.date) + ': top ' + sug.filter(function (x) { return x.from === 'report'; }).length + ' remedies</p>' +
          (sug.some(function (x) { return x.from === 'report' && !have[x.sku]; }) ? '<button class="btn small" id="pcAddAll">Add all from the report</button>' : '') + '</div>' + sug.filter(function (x) { return x.from === 'report'; }).map(sugRow).join('') : '<p class="small muted">No published report yet. Create one in the Client Report Creator to get remedy suggestions from the scan.</p>') +
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
        '<div class="row" style="margin-top:1rem"><button class="btn" id="pcPublish"' + (d.items.length ? '' : ' disabled') + '>Publish to ' + esc(U.first(c.name)) + '&rsquo;s app</button><button class="btn ghost" id="pcOrder"' + (d.items.length ? '' : ' disabled') + '>Order these remedies</button><button class="btn ghost" id="pcPdf"' + (d.items.length ? '' : ' disabled') + '>Download PDF</button></div></div></div>' +
      (d.items.length ? '<h2 class="h2">Protocol report: what ' + esc(U.first(c.name)) + ' will see</h2>' + doc(d, false) : '');
  }

  function bind() {
    var ps = st(), $ = U.$, $$ = U.$$, d = ps.draft;
    function keep() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    function edit(id) { ps.client = id; ps.draft = null; ps.mode = 'edit'; ps.report = false; App.render(); window.scrollTo(0, 0); }
    if (ps.mode !== 'edit') {
      $('#pcClient').addEventListener('change', function (e) { ps.client = e.target.value; });
      $('#pcNew').addEventListener('click', function () { edit($('#pcClient').value); });
      $$('[data-pedit]').forEach(function (b) { b.addEventListener('click', function () { edit(b.getAttribute('data-pedit')); }); });
      $$('[data-pview]').forEach(function (b) {
        b.addEventListener('click', function () { ps.viewing = b.getAttribute('data-pview'); App.render(); var el = $('#pcReport'); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90); });
      });
      var hide = $('#pcHide'); if (hide) hide.addEventListener('click', function () { ps.viewing = null; keep(); });
      var pr = $('#pcPrint'); if (pr) pr.addEventListener('click', function () { pdfOf(byId(ps.viewing), pr); });
      return;
    }
    $('#pcBack').addEventListener('click', function () { ps.mode = 'list'; ps.draft = null; App.render(); window.scrollTo(0, 0); });
    var sr = $('#pcSeeReport'); if (sr) sr.addEventListener('click', function () { ps.report = !ps.report; keep(); });
    $('#pcClient').addEventListener('change', function (e) { ps.client = e.target.value; ps.draft = null; ps.report = false; App.render(); });
    var all = $('#pcAddAll');
    if (all) all.addEventListener('click', function () {
      var have = {}; d.items.forEach(function (x) { have[x.sku] = 1; });
      EG.protoSuggestions(U.client(d.client), latestScan(d.client)).filter(function (x) { return x.from === 'report' && !have[x.sku]; })
        .forEach(function (x) { d.items.push(EG.protoItem(x.sku, x.dose, x.weeks)); });
      keep();
    });
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
      U.save(); ps.draft = null; App.render(); U.toast('Published and saved to ' + U.first(c.name) + '’s documents.');
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
    if (pdf) pdf.addEventListener('click', function () { pdfOf(d, pdf); });
  }

  function pdfOf(p, btn) {
    var name = U.client(p.client).name + ' - Protocol - ' + (p.start || U.today()) + '.pdf', label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Making the PDF…';
    EGPdf.save(doc(p, false), name).then(function () { U.toast('Saved ' + name); }, function (e) { U.toast('The PDF could not be made here: ' + e.message); })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }

  window.EGProto = { doc: doc, activeFor: activeFor, latestScan: latestScan, endDate: endDate, longest: longest };
  App.register('protocols', view, bind);
})();
