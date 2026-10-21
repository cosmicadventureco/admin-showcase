/* Evergrove Wellness showcase - energetic scans to client reports.
 *
 * The clinic's own report builder, connected to everything else: the four
 * scan files are uploaded, findings are pulled out and ranked, a practitioner
 * reviews and signs off, and the report is published straight to the
 * client's app with the recommended remedies one tap from the cart. The
 * extraction is simulated here with invented sample data.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  var STATUS = { stressed: 'Stressed', weakened: 'Weakened', balanced: 'Balanced', none: 'Unmarked' };
  function S() { return App.state(); }
  function st() { if (!App.ui.sc) App.ui.sc = { open: null, step: 'list', files: {}, signed: false, editing: null, newClient: 'c7' }; return App.ui.sc; }
  function scan(id) { return S().scans.filter(function (x) { return x.id === id; })[0]; }
  function inShop(name) { return EG.PRODUCTS.filter(function (p) { return p.name === name; })[0] || null; }
  function scoreState(n) { return n > 55 ? 'stressed' : n < 45 ? 'weakened' : 'balanced'; }
  function remedies(d) {
    return d.items.filter(function (x) { return x.section === 'Recommended Remedies' && x.include; }).sort(function (a, b) { return a.rank - b.rank; });
  }
  function slug(name) { return name.toLowerCase().replace(/[^a-z]+/g, '-'); }

  /* The dial, drawn the way the builder draws it: five bands, one needle. */
  function gauge(score) {
    var cx = 50, cy = 52, r = 38, sw = 11;
    function pt(deg, rad) { var a = deg * Math.PI / 180; return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]; }
    function arc(a1, a2, color) { var p1 = pt(a1, r), p2 = pt(a2, r); return '<path d="M ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' A ' + r + ' ' + r + ' 0 0 1 ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2) + '" fill="none" stroke="' + color + '" stroke-width="' + sw + '"/>'; }
    var s = Math.max(0, Math.min(100, score)), n = pt(180 - s * 1.8, r - 5);
    return '<svg class="rr-gauge" viewBox="0 0 100 60" role="img" aria-label="Reading ' + s + ' of 100">' +
      [[180, 144, '#d9534f'], [144, 108, '#e6935a'], [108, 72, '#e0c14f'], [72, 36, '#a9c67e'], [36, 0, '#4f9a86']].map(function (b) { return arc(b[0], b[1], b[2]); }).join('') +
      '<line x1="50" y1="52" x2="' + n[0].toFixed(2) + '" y2="' + n[1].toFixed(2) + '" stroke="#2b2b2b" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="52" r="4" fill="#2b2b2b"/></svg>';
  }

  /* The client-facing report. Shared by the console preview and the client app. */
  function reportHtml(sc, compact) {
    var c = U.client(sc.client), d = sc.data, rem = remedies(d).slice(0, d.limit);
    var by = {};
    d.items.filter(function (x) { return x.include && x.section !== 'Recommended Remedies'; }).forEach(function (x) { (by[x.section] = by[x.section] || []).push(x); });
    var organs = d.organs.filter(function (o) { return o.include; });
    var dob = '04/12/' + (1975 + (c.name.length * 3) % 20);
    return '<div class="rr' + (compact ? ' compact' : '') + '" data-tour="report">' +
      '<div class="rr-banner"><div class="rr-title">Evergrove Resonance Map</div><div class="rr-sub">Energetic scan report &middot; sample brand, sample data</div>' +
      '<div class="rr-grid">' + [['Client', c.name], ['Scan date', U.fmtDate(sc.date, { month: 'short', day: 'numeric', year: 'numeric' })], ['Date of birth', dob],
        ['Practitioner', sc.by || 'Theo Marsh'], ['Approx. age imbalances began', d.ageEst], ['Course week', (U.enrollment(c.id) || { week: 1 }).week + ' of 12']].map(function (x) { return '<div><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' +
      (compact ? '' : '<p class="rr-welcome">This report turns your scan into three parts: which body systems stood out, what the scan linked them to, and the remedies your practitioner chose in priority order. The dials show energetic resonance. They are not a diagnosis and not a measure of how well an organ works.</p>') + '</div>' +
      '<div class="rr-body"><div class="rr-h">Organ systems</div>' + organs.map(function (o) {
        var stt = scoreState(o.score);
        return '<div class="rr-organ"><div class="rr-aside">' + gauge(o.score) + '<span class="rr-score ' + stt + '">' + o.score + '</span></div><div class="rr-otext"><div class="rr-oname">' + esc(o.organ) + ' resonance <span class="rr-tag ' + stt + '">' + STATUS[stt] + '</span></div>' +
          (compact ? '<p>' + esc(o.paragraphs[0]) + '</p>' : o.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('')) + '</div></div>';
      }).join('') +
      '<div class="rr-h">Your remedies, in priority order</div>' + rem.map(function (x, i) {
        var p = inShop(x.item);
        return '<div class="rr-rem"><span class="rr-n">' + (i + 1) + '</span><div class="grow"><b>' + esc(x.item) + (x.code ? ' (' + esc(x.code) + ')' : '') + '</b>' + (x.rc ? ' <span class="rr-rc">RC</span>' : '') +
          '<div class="small muted">' + esc(x.dil) + ' &middot; ' + esc(x.qty) + ' &middot; ' + esc(x.dur) + '</div>' + (compact ? '' : '<div class="small">' + esc(x.desc) + '</div>') + '</div>' + (p ? '<span class="rr-shop">In shop</span>' : '') + '</div>';
      }).join('') +
      EG.SCAN_SECTIONS.filter(function (sec) { return by[sec]; }).map(function (sec) {
        var rows = by[sec].map(function (x) {
          return '<div class="rr-item"><span class="rr-dot ' + x.status + '"></span><div class="grow"><b>' + esc(x.item) + (x.code ? ' (' + esc(x.code) + ')' : '') + '</b> &ndash; ' + esc(x.desc) + '</div><div class="rr-right">' + esc(x.category) + (x.rc ? ' <span class="rr-rc">RC</span>' : '') + (x.note ? '<br><span class="rr-note">' + esc(x.note) + '</span>' : '') + '</div></div>';
        }).join('');
        return compact ? '<details class="rr-sec"><summary>' + esc(sec) + ' <span class="muted">(' + by[sec].length + ')</span></summary>' + rows + '</details>' : '<div class="rr-h">' + esc(sec) + '</div>' + rows;
      }).join('') + '</div></div>';
  }

  /* ------------------------------------------------------------- screens */
  var STEPS = ['Upload the 4 scan files', 'Review', 'Sign off & publish', 'Build the protocol'];
  function stepline(n) { return '<div class="stepline">' + STEPS.map(function (x, i) { return '<span class="' + (i === n ? 'on' : '') + '">' + (i + 1) + '. ' + x + '</span>'; }).join('') + '</div>'; }

  /* Step 1, always at the top of the page: pick the client, add the four files. */
  function newReport() {
    var s = st(), D = S(), all = EG.SCAN_SLOTS.every(function (x) { return s.files[x.code]; });
    var clients = D.clients.slice().sort(function (a, b) { return (b.member ? 1 : 0) - (a.member ? 1 : 0) || a.name.localeCompare(b.name); });
    return '<div class="card newrep" data-tour="newreport">' + stepline(0) + '<h3 class="h3" style="margin-top:0">New client report</h3>' +
      '<div class="row" style="margin-bottom:.9rem"><label for="scClient" style="margin:0">Client</label><select id="scClient" style="width:auto;min-width:16rem">' + clients.map(function (c) { return '<option value="' + c.id + '"' + (c.id === s.newClient ? ' selected' : '') + '>' + esc(c.name) + (c.member ? ' (Premium)' : '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="slots" data-tour="slots">' + EG.SCAN_SLOTS.map(function (x) {
        var f = s.files[x.code];
        return '<label class="slot' + (f ? ' filled' : '') + '"><input type="file" accept=".pdf,.csv,.txt" data-slotfile="' + x.code + '"><b>' + x.code + '</b><span class="small">' + esc(x.label) + '</span><span class="small ' + (f ? 'ok' : 'muted') + '">' + (f ? '&#10003; ' + esc(f) : esc(x.hint) + '. Click to choose the file.') + '</span></label>';
      }).join('') + '</div>' +
      '<div class="row" style="margin-top:1rem"><button class="btn" id="scExtract"' + (all ? '' : ' disabled') + '>Create the report</button><button class="btn ghost" id="scAll">Use the sample files</button><span class="small muted">The report and the protocol are both saved to the client&rsquo;s documents.</span></div>' +
      '<div id="scProg" hidden style="margin-top:1rem"><div class="small" id="scProgLabel">Working</div><div class="bar" style="margin-top:.4rem"><i id="scProgBar" style="width:0%"></i></div></div></div>';
  }

  function listView() {
    var D = S();
    var pill = { published: '<span class="pill ok">Published</span>', uploaded: '<span class="pill warn">Scan done, files to add</span>', booked: '<span class="pill">Scan booked</span>', review: '<span class="pill honey">In review</span>' };
    return newReport() + '<h2 class="h2">Reports</h2><div class="card"><div class="tablewrap"><table data-tour="scanlist"><thead><tr><th>Client</th><th>Scan date</th><th>Status</th><th>Remedies</th><th></th></tr></thead><tbody>' +
      D.scans.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (sc) {
        var c = U.client(sc.client), n = sc.data ? remedies(sc.data).slice(0, sc.data.limit).length : '&mdash;';
        var act = sc.status === 'booked' ? '<span class="small muted">Scan on ' + U.fmtDate(sc.date) + '</span>'
          : !sc.data ? '<button class="btn small" data-scfiles="' + sc.client + '">Add files</button>'
          : '<button class="btn small' + (sc.status === 'published' ? ' ghost' : '') + '" data-scopen="' + sc.id + '">' + (sc.status === 'published' ? 'View report' : 'Review') + '</button>';
        return '<tr><td><b>' + esc(c.name) + '</b><br><span class="small muted">' + (c.member ? 'Premium Course' : 'Single scan') + '</span></td><td class="num">' + U.fmtDate(sc.date) + '</td><td>' + pill[sc.status] + (sc.by && sc.status === 'published' ? '<br><span class="small muted">Signed off by ' + esc(sc.by) + '</span>' : '') + '</td><td class="num">' + n + '</td><td class="r">' + act + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function reviewView(sc) {
    var d = sc.data, c = U.client(sc.client), rem = remedies(d), s = st();
    var by = {};
    d.items.forEach(function (x) { if (x.section !== 'Recommended Remedies') (by[x.section] = by[x.section] || []).push(x); });
    var flagged = d.items.filter(function (x) { return x.claims.length && x.include; }).length;
    return '<div class="card" style="margin-bottom:1rem">' + stepline(1) + '<h3 class="h3">Check what goes in the report</h3><p class="small muted">Everything below was pulled from the exports. Untick anything that should not appear, adjust a reading, reorder remedies, or fix wording the system flagged.</p>' +
      '<div class="fields" style="margin-top:.8rem"><div><label>Client</label><input type="text" value="' + esc(c.name) + '" readonly></div><div><label for="scAge">Approx. age imbalances began</label><input id="scAge" type="text" value="' + esc(d.ageEst) + '"></div></div>' +
      (flagged ? '<div class="flagbar">&#9873; ' + flagged + ' item' + (flagged > 1 ? 's use' : ' uses') + ' claim language from the supplier&rsquo;s text. Reword before publishing.</div>' : '<div class="flagbar ok">No claim language left in the report.</div>') + '</div>' +
      '<div class="split"><div class="card" data-tour="organs"><h3 class="h3">Organ readings</h3><p class="small muted" style="margin-top:0">Most out of balance first. 45 to 55 is balanced.</p>' + d.organs.map(function (o, i) {
        return '<div class="orow"><input type="checkbox" data-org="' + i + '"' + (o.include ? ' checked' : '') + ' aria-label="Include ' + esc(o.organ) + '"><div class="omini">' + gauge(o.score) + '</div><span class="grow"><b>' + esc(o.organ) + '</b><br><span class="small muted">' + STATUS[scoreState(o.score)] + '</span></span><input type="number" min="0" max="100" value="' + o.score + '" data-score="' + i + '" aria-label="' + esc(o.organ) + ' score"></div>';
      }).join('') + '</div>' +
      '<div class="card" data-tour="remedies"><div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">Remedies, in priority order</h3><span class="small">Top <input type="number" id="scLimit" min="1" max="20" value="' + d.limit + '" style="width:3.4rem;padding:.25rem .4rem"> go in the report</span></div><p class="small muted">Root-cause findings first, then symptom support, each from the lowest dilution up. Use the arrows to change the order.</p>' +
      rem.map(function (x, i) {
        return (i === d.limit ? '<div class="cutline">Below this line is left out of the report</div>' : '') + '<div class="remrow' + (i >= d.limit ? ' cut' : '') + '"><span class="rr-n">' + (i + 1) + '</span><span class="dil">' + x.doc + ' ' + esc(x.dil) + '</span><span class="grow small"><b>' + esc(x.item) + '</b> <span class="muted">' + esc(x.category) + '</span></span>' + (inShop(x.item) ? '<span class="rr-shop">In shop</span>' : '') +
          '<button class="mv" data-mv="' + x.id + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button><button class="mv" data-mv="' + x.id + '" data-d="1"' + (i === rem.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button></div>';
      }).join('') + '</div></div>' +
      '<h2 class="h2">Findings by section</h2><div class="card" data-tour="findings">' + EG.SCAN_SECTIONS.filter(function (sec) { return by[sec]; }).map(function (sec) {
        return '<div class="fsec"><div class="fsec-h">' + esc(sec) + ' <span class="muted">' + by[sec].length + '</span></div>' + by[sec].map(function (x) { return findingRow(x, s); }).join('') + '</div>';
      }).join('') +
      '<div class="fsec"><div class="fsec-h">Recommended Remedies <span class="muted">' + rem.length + '</span></div>' + rem.map(function (x) { return findingRow(x, s); }).join('') + '</div></div>' +
      '<div class="row" style="margin-top:1rem"><button class="btn" id="scBuild">Build the report</button><button class="btn ghost" id="scBack">Back to scans</button></div>';
  }
  function findingRow(x, s) {
    return '<div class="frow' + (x.include ? '' : ' off') + '" id="fr-' + x.id + '"><input type="checkbox" data-inc="' + x.id + '"' + (x.include ? ' checked' : '') + ' aria-label="Include ' + esc(x.item) + '"><button class="sw ' + x.status + '" data-sw="' + x.id + '" title="' + STATUS[x.status] + ': click to change" aria-label="Status ' + STATUS[x.status] + '"></button>' +
      '<div class="grow"><b class="small">' + esc(x.item) + (x.code ? ' (' + esc(x.code) + ')' : '') + '</b> <span class="small muted">' + x.doc + ' &middot; ' + esc(x.category) + ' &middot; ' + esc(x.dil) + ' &middot; ' + esc(x.qty) + ' &middot; ' + esc(x.dur) + '</span>' + (x.note ? ' <span class="pill">' + esc(x.note) + '</span>' : '') +
      '<div class="small">' + esc(x.desc) + '</div>' +
      (x.claims.length ? '<div class="claimflag">&#9873; Claim language: &ldquo;' + esc(x.claims.join('&rdquo;, &ldquo;')) + '&rdquo;. <button class="linkish" data-edit="' + x.id + '">Edit text</button></div>' : '') +
      (s.editing === x.id ? '<textarea data-desc="' + x.id + '" rows="2" style="margin-top:.4rem">' + esc(x.desc) + '</textarea>' : '') + '</div></div>';
  }

  function finalView(sc) {
    var c = U.client(sc.client), s = st(), done = sc.status === 'published';
    return '<div class="card" style="margin-bottom:1rem">' + stepline(done ? 3 : 2) + '<div class="row" style="justify-content:space-between"><h3 class="h3" style="margin:0">' + (done ? 'Published to ' + esc(c.name) + '&rsquo;s app' : 'Report ready to publish') + '</h3>' + (done ? '<span class="pill ok">Signed off by ' + esc(sc.by) + '</span>' : '') + '</div>' +
      (done ? '<p class="small muted">Saved to ' + esc(U.first(c.name)) + '&rsquo;s documents in the Client Portal and published to their app. ' + esc(U.first(c.name)) + ' was emailed.</p><div class="row"><button class="btn" id="scProto">Next: build the protocol</button><button class="btn ghost" id="scDocs">Open in Client Portal</button><button class="btn ghost" id="scSeeApp">See it in the client app</button><button class="btn ghost" id="scPdf">Download PDF</button><button class="btn ghost" id="scBack">Back to scans</button></div>'
        : '<label class="check" style="margin:.8rem 0" data-tour="signoff"><input type="checkbox" id="scSign"' + (s.signed ? ' checked' : '') + '> I have reviewed this report and it is ready for the client. <span class="muted">(Theo Marsh, Certified Energetics Practitioner)</span></label>' +
          '<div class="row"><button class="btn" id="scPublish"' + (s.signed ? '' : ' disabled') + '>Publish to client app</button><button class="btn ghost" id="scEdit">Back to edit</button><button class="btn ghost" id="scPdf">Download PDF</button></div>') + '</div>' +
      reportHtml(sc, false);
  }

  function view() {
    var s = st(), sc = s.open ? scan(s.open) : null;
    var body = !sc ? listView() : s.step === 'review' ? reviewView(sc) : finalView(sc);
    return U.head('Scan files in, client report out', 'Client Report Creator', 'Upload the four scan files, check what was pulled out, sign off, and the report is saved to the client&rsquo;s documents and their app.') +
      U.pitch('new', 'Your report builder already turns scan exports into a report on one computer. Here it is connected to everything else: the client record, a practitioner sign-off, the client app and the shop.') +
      (sc ? '<div class="row" style="margin-bottom:1rem"><button class="back" id="scList" style="margin:0">&larr; All reports</button><span class="small muted">' + esc(U.client(sc.client).name) + ' &middot; scan ' + U.fmtDate(sc.date) + '</span></div>' : '') + body;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function bind() {
    var s = st(), $ = U.$, $$ = U.$$, sc = s.open ? scan(s.open) : null;
    function go(step) { s.step = step; App.render(); window.scrollTo(0, 0); }
    $$('[data-scopen]').forEach(function (b) {
      b.addEventListener('click', function () {
        var x = scan(b.getAttribute('data-scopen'));
        s.open = x.id; s.files = {}; s.signed = false; s.editing = null;
        go(x.status === 'published' ? 'final' : 'review');
      });
    });
    $$('[data-scfiles]').forEach(function (b) { b.addEventListener('click', function () { s.newClient = b.getAttribute('data-scfiles'); s.files = {}; App.render(); window.scrollTo(0, 0); }); });
    var pick = $('#scClient'); if (pick) pick.addEventListener('change', function () { s.newClient = pick.value; s.files = {}; App.render(); });
    $$('[data-slotfile]').forEach(function (inp) { inp.addEventListener('change', function () { if (inp.files[0]) { s.files[inp.getAttribute('data-slotfile')] = inp.files[0].name; App.render(); } }); });
    var nb = slug(U.client(s.newClient || 'c7').name);
    var all = $('#scAll'); if (all) all.addEventListener('click', function () { EG.SCAN_SLOTS.forEach(function (x) { s.files[x.code] = nb + '_' + x.code + '.pdf'; }); App.render(); });
    var ex = $('#scExtract');
    if (ex) ex.addEventListener('click', function () {
      var c = U.client(s.newClient), D = S();
      /* Attach the files to the scan already on record, or start a new one. */
      var sc = D.scans.filter(function (x) { return x.client === c.id && !x.data && x.status !== 'published'; })[0];
      if (!sc) { sc = { id: 's' + Date.now(), client: c.id, date: U.today(), status: 'uploaded', data: null }; D.scans.push(sc); }
      ex.disabled = true; $('#scProg').hidden = false;
      var steps = ['Reading RR: ' + (s.files.RR || 'RR'), 'Lifting organ readings and write-ups', 'Reading RC, SS and IMB findings', 'Applying dilution notes and ranking remedies', 'Checking wording for claim language'];
      var chain = Promise.resolve();
      steps.forEach(function (t, i) { chain = chain.then(function () { var l = $('#scProgLabel'), bar = $('#scProgBar'); if (l) l.textContent = t; if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%'; return wait(450); }); });
      chain.then(function () {
        sc.data = EG.sampleScan(c); sc.status = 'review'; sc.files = Object.keys(s.files).map(function (k) { return s.files[k]; });
        if (window.EGAuto) sc.data.limit = EGAuto.setting('scans', 'top');
        U.activity('Scan files for ' + c.name + ' read: 8 organ readings, ' + sc.data.items.length + ' findings. Waiting for practitioner review.');
        s.open = sc.id; s.files = {}; s.signed = false; s.editing = null;
        U.save(); go('review');
      });
    });
    var list = $('#scList'); if (list) list.addEventListener('click', function () { s.open = null; go('list'); });
    $$('#scBack').forEach(function (b) { b.addEventListener('click', function () { s.open = null; go('list'); }); });
    if (!sc) return;
    var c = U.client(sc.client);
    if (!sc.data) return;
    var d = sc.data;
    function keepScroll() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    /* review */
    $$('[data-org]').forEach(function (cb) { cb.addEventListener('change', function () { d.organs[+cb.getAttribute('data-org')].include = cb.checked; U.save(); }); });
    $$('[data-score]').forEach(function (inp) { inp.addEventListener('change', function () { d.organs[+inp.getAttribute('data-score')].score = Math.max(0, Math.min(100, +inp.value || 0)); U.save(); keepScroll(); }); });
    var lim = $('#scLimit'); if (lim) lim.addEventListener('change', function () { d.limit = Math.max(1, Math.min(20, +lim.value || 8)); U.save(); keepScroll(); });
    function item(id) { return d.items.filter(function (x) { return x.id === id; })[0]; }
    $$('[data-mv]').forEach(function (b) {
      b.addEventListener('click', function () {
        var rem = remedies(d), x = item(b.getAttribute('data-mv')), i = rem.indexOf(x), j = i + (+b.getAttribute('data-d'));
        if (j < 0 || j >= rem.length) return;
        var t = rem[i].rank; rem[i].rank = rem[j].rank; rem[j].rank = t; U.save(); keepScroll();
      });
    });
    $$('[data-inc]').forEach(function (cb) { cb.addEventListener('change', function () { item(cb.getAttribute('data-inc')).include = cb.checked; U.save(); keepScroll(); }); });
    $$('[data-sw]').forEach(function (b) {
      b.addEventListener('click', function () { var x = item(b.getAttribute('data-sw')), o = ['none', 'stressed', 'weakened', 'balanced']; x.status = o[(o.indexOf(x.status) + 1) % 4]; U.save(); keepScroll(); });
    });
    $$('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { s.editing = b.getAttribute('data-edit'); keepScroll(); var t = $('[data-desc]'); if (t) t.focus(); }); });
    $$('[data-desc]').forEach(function (t) {
      t.addEventListener('input', function () { var x = item(t.getAttribute('data-desc')); x.desc = t.value; x.claims = EG.claimWords(t.value); U.save(); });
      /* No redraw on blur: it would swallow a click on the next button. */
      t.addEventListener('blur', function () { s.editing = null; });
    });
    var age = $('#scAge'); if (age) age.addEventListener('change', function () { d.ageEst = age.value; U.save(); });
    var build = $('#scBuild'); if (build) build.addEventListener('click', function () { go('final'); });
    /* final */
    var edit = $('#scEdit'); if (edit) edit.addEventListener('click', function () { go('review'); });
    var sign = $('#scSign'); if (sign) sign.addEventListener('change', function () { s.signed = sign.checked; $('#scPublish').disabled = !sign.checked; });
    var pub = $('#scPublish');
    if (pub) pub.addEventListener('click', function () {
      if (d.items.some(function (x) { return x.include && x.claims.length; })) { U.toast('Reword the flagged claim language first.'); go('review'); return; }
      sc.status = 'published'; sc.by = 'Theo Marsh';
      var e = U.enrollment(c.id); if (e) e.assess = 'Complete';
      S().emails.unshift({ at: U.today(), to: c.id, kind: 'Scan report', subject: 'Your Evergrove Resonance Map is ready' });
      U.activity('Scan report for ' + c.name + ' signed off by Theo Marsh and published to the client app. Client emailed; ' + remedies(d).slice(0, d.limit).length + ' remedies ready to order.');
      U.save(); App.render(); U.toast('Published. ' + U.first(c.name) + ' has been emailed.');
    });
    var pdf = $('#scPdf'); if (pdf) pdf.addEventListener('click', function () { U.toast('PDF saved to ' + c.name + '’s record (simulated)'); });
    var np = $('#scProto'); if (np) np.addEventListener('click', function () { App.ui.pc = { client: c.id, draft: null, mode: 'edit' }; App.go('protocols'); });
    var dc = $('#scDocs'); if (dc) dc.addEventListener('click', function () { EGPortal.open(c.id, 'docs'); });
    var see = $('#scSeeApp');
    if (see) see.addEventListener('click', function () { App.ui.ca = null; App.go('client'); App.ui.ca.as = c.id; App.ui.ca.tab = 'report'; App.render(); });
  }

  window.EGScan = { reportHtml: reportHtml, gauge: gauge, remedies: remedies, inShop: inShop };
  App.register('scans', view, bind);
})();
