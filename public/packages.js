/* Evergrove Wellness showcase - Packages.
 *
 * The packages the practice sells (Recorded Review, Bioresonance Scan, the
 * 12 Week Package), what each includes, and which appointment credits come
 * with it. Clients buy them in their portal or the team adds one; credits
 * are used up as the client books the matching appointment type.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;
  function S() { return App.state(); }
  function st() { if (!App.ui.pk) App.ui.pk = { tab: 'catalog', edit: null }; return App.ui.pk; }
  function pkg(id) { return S().packages.filter(function (p) { return p.id === id; })[0]; }
  function svc(id) { return EG.SERVICES.filter(function (s) { return s.id === id; })[0]; }
  function sum(o) { return Object.keys(o || {}).reduce(function (t, k) { return t + o[k]; }, 0); }

  /* A client's packages, with credits used and left. */
  function holdings(c) {
    return (c.packs || []).map(function (h) {
      var p = pkg(h.pkg) || { name: h.pkg, credits: {} }, total = sum(p.credits), used = sum(h.used);
      return { h: h, p: p, total: total, used: used, left: total - used };
    });
  }
  /* The package that still has a credit for this appointment type, if any. */
  function creditFor(c, type) {
    return holdings(c).filter(function (x) { return (x.p.credits[type] || 0) > ((x.h.used || {})[type] || 0); })[0] || null;
  }
  function useCredit(c, type) {
    var x = creditFor(c, type); if (!x) return null;
    x.h.used = x.h.used || {}; x.h.used[type] = (x.h.used[type] || 0) + 1; return x.p;
  }
  function sell(c, id, where) {
    var p = pkg(id);
    c.packs = c.packs || []; c.packs.push({ pkg: id, bought: U.today(), paid: p.price, used: {} }); c.ltv += p.price;
    U.activity(p.name + ' (' + money(p.price, false) + ') ' + (where === 'portal' ? 'bought by ' + c.name + ' in the client portal' : 'added for ' + c.name + ', payment link sent') + '.' + (sum(p.credits) ? ' ' + sum(p.credits) + ' appointment credit' + (sum(p.credits) > 1 ? 's' : '') + ' ready to book.' : ''));
    return p;
  }
  function creditPills(p) { return Object.keys(p.credits || {}).map(function (k) { return '<span class="pill">' + (p.credits[k] > 1 ? p.credits[k] + ' &times; ' : '') + esc(svc(k).label) + '</span>'; }).join(' '); }

  function catalog() {
    var pk = st(), D = S();
    var sold = function (id) { return D.clients.reduce(function (n, c) { return n + (c.packs || []).filter(function (h) { return h.pkg === id; }).length; }, 0); };
    return '<div class="pkgrid" data-tour="pkcatalog">' + D.packages.map(function (p) {
      if (pk.edit === p.id) {
        return '<div class="card pkcard"><label for="pkName">Name</label><input id="pkName" type="text" value="' + esc(p.name) + '">' +
          '<label for="pkPrice" style="margin-top:.6rem">Price</label><input id="pkPrice" type="number" min="0" value="' + p.price + '">' +
          '<label for="pkDesc" style="margin-top:.6rem">Description</label><textarea id="pkDesc" rows="3">' + esc(p.desc) + '</textarea>' +
          '<label for="pkInc" style="margin-top:.6rem">What&rsquo;s included (one per line)</label><textarea id="pkInc" rows="4">' + esc(p.includes.join('\n')) + '</textarea>' +
          '<p class="label" style="margin-top:.6rem">Appointment credits</p>' + EG.SERVICES.filter(function (s) { return !s.legacy; }).map(function (s) {
            return '<div class="row small" style="justify-content:space-between;margin-bottom:.3rem"><span>' + esc(s.label) + '</span><input type="number" min="0" max="20" value="' + ((p.credits || {})[s.id] || 0) + '" data-pkcred="' + s.id + '" style="width:4.2rem" aria-label="' + esc(s.label) + ' credits"></div>';
          }).join('') +
          '<div class="row" style="margin-top:.8rem"><button class="btn small" id="pkSave">Save</button><button class="btn ghost small" id="pkCancel">Cancel</button></div></div>';
      }
      return '<div class="card pkcard' + (p.active ? '' : ' off') + '"><div class="row" style="justify-content:space-between;align-items:flex-start"><h3 class="h3" style="margin:0">' + esc(p.name) + '</h3><span class="price">' + money(p.price, false) + '</span></div>' +
        (p.plan ? '<div class="small muted">or ' + esc(p.plan) + '</div>' : '') + '<p class="small muted">' + esc(p.desc) + '</p>' +
        '<ul class="pkinc small">' + p.includes.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
        (sum(p.credits) ? '<p class="label" style="margin:.6rem 0 .3rem">Appointment credits</p><div class="pills">' + creditPills(p) + '</div>' : '') +
        '<div class="row" style="justify-content:space-between;margin-top:.9rem"><span class="small muted">' + sold(p.id) + ' sold</span><span class="row"><label class="check small" style="margin:0"><input type="checkbox" data-pkon="' + p.id + '"' + (p.active ? ' checked' : '') + '> In client portal</label><button class="btn ghost small" data-pkedit="' + p.id + '">Edit</button></span></div></div>';
    }).join('') + '<button class="card pkcard pknew" id="pkNew"><b>+ New package</b><span class="small muted">Name, price, what&rsquo;s included and appointment credits</span></button></div>';
  }

  function clientsView() {
    var D = S(), rows = [];
    D.clients.forEach(function (c) { holdings(c).forEach(function (x) { rows.push({ c: c, x: x }); }); });
    rows.sort(function (a, b) { return a.x.h.bought < b.x.h.bought ? 1 : -1; });
    var clients = D.clients.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<div class="card" style="margin-bottom:1rem"><div class="row"><label for="pkClient" style="margin:0">Add a package for</label><select id="pkClient" style="width:auto;min-width:14rem">' + clients.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<select id="pkPick" style="width:auto">' + D.packages.filter(function (p) { return p.active; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + ' (' + money(p.price, false) + ')</option>'; }).join('') + '</select><button class="btn" id="pkSell">Add and send payment link</button></div></div>' +
      '<div class="card"><div class="tablewrap"><table data-tour="pkclients"><thead><tr><th>Client</th><th>Package</th><th>Bought</th><th>Appointments</th><th class="r">Paid</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        var x = r.x;
        return '<tr><td><b>' + esc(r.c.name) + '</b></td><td>' + esc(x.p.name) + '</td><td class="num">' + U.fmtDate(x.h.bought) + '</td><td>' + (x.total ? '<span class="pill' + (x.left ? ' ok' : '') + '">' + x.used + ' of ' + x.total + ' used</span>' : '<span class="muted">&mdash;</span>') + '</td><td class="r">' + money(x.h.paid, false) + '</td><td class="r"><button class="btn ghost small" data-pkopen="' + r.c.id + '">Open client</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function view() {
    var pk = st(), D = S(), active = 0, credits = 0;
    D.clients.forEach(function (c) { holdings(c).forEach(function (x) { if (x.left > 0 || !x.total) active++; credits += Math.max(0, x.left); }); });
    return U.head('What clients buy, and what is left', 'Packages', 'Each package says what it includes and which appointments come with it. Clients buy them in their portal, and credits are used as they book.') +
      '<div class="grid g3" style="margin-bottom:1rem">' + U.stat(D.packages.filter(function (p) { return p.active; }).length, 'Packages on sale', '') + U.stat(active, 'Active client packages', '') + U.stat(credits, 'Appointments still to book', '') + '</div>' +
      '<div class="tabs"><button class="tab' + (pk.tab === 'catalog' ? ' is-on' : '') + '" data-pktab="catalog">Packages</button><button class="tab' + (pk.tab === 'clients' ? ' is-on' : '') + '" data-pktab="clients">Client packages</button></div>' +
      (pk.tab === 'clients' ? clientsView() : catalog());
  }

  function bind() {
    var pk = st(), $ = U.$, $$ = U.$$, D = S();
    function keep() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    $$('[data-pktab]').forEach(function (b) { b.addEventListener('click', function () { pk.tab = b.getAttribute('data-pktab'); pk.edit = null; keep(); }); });
    $$('[data-pkedit]').forEach(function (b) { b.addEventListener('click', function () { pk.edit = b.getAttribute('data-pkedit'); keep(); }); });
    $$('[data-pkon]').forEach(function (i) { i.addEventListener('change', function () { pkg(i.getAttribute('data-pkon')).active = i.checked; U.save(); keep(); U.toast(i.checked ? 'Shown in the client portal' : 'Hidden from the client portal'); }); });
    var nw = $('#pkNew');
    if (nw) nw.addEventListener('click', function () { var p = { id: 'pk' + Date.now(), name: 'New package', price: 0, credits: {}, active: false, desc: '', includes: [] }; D.packages.push(p); pk.edit = p.id; U.save(); keep(); });
    var cn = $('#pkCancel'); if (cn) cn.addEventListener('click', function () { pk.edit = null; keep(); });
    var sv = $('#pkSave');
    if (sv) sv.addEventListener('click', function () {
      var p = pkg(pk.edit), cr = {};
      $$('[data-pkcred]').forEach(function (i) { var n = +i.value || 0; if (n > 0) cr[i.getAttribute('data-pkcred')] = n; });
      p.name = $('#pkName').value.trim() || 'Untitled package'; p.price = Math.max(0, +$('#pkPrice').value || 0); p.desc = $('#pkDesc').value.trim();
      p.includes = $('#pkInc').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); p.credits = cr;
      U.activity('Package "' + p.name + '" saved (' + money(p.price, false) + ').');
      pk.edit = null; U.save(); keep(); U.toast('Saved');
    });
    var sell2 = $('#pkSell');
    if (sell2) sell2.addEventListener('click', function () { var c = U.client($('#pkClient').value), p = sell(c, $('#pkPick').value, 'team'); U.save(); keep(); U.toast(p.name + ' added for ' + U.first(c.name) + '. Payment link sent.'); });
    $$('[data-pkopen]').forEach(function (b) { b.addEventListener('click', function () { EGPortal.open(b.getAttribute('data-pkopen'), 'bookings'); }); });
  }

  window.EGPkg = { pkg: pkg, holdings: holdings, creditFor: creditFor, useCredit: useCredit, sell: sell, creditPills: creditPills };
  App.register('packages', view, bind);
})();
