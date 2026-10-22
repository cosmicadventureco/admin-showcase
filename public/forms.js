/* Evergrove Wellness showcase - Waivers & Forms.
 *
 * Templates for every waiver and form: the wording, the fields, and who has
 * to sign it (everyone, Premium members, anyone booked for a scan, or
 * optional). Clients sign in their portal; the Client Portal shows who has
 * signed what. The same renderer draws the preview here and the form the
 * client fills in.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc;
  function S() { return App.state(); }
  function st() { if (!App.ui.fm) App.ui.fm = { sel: 'f1', draft: null }; return App.ui.fm; }
  var TYPES = [['text', 'Short answer'], ['long', 'Paragraph'], ['yesno', 'Yes / no'], ['choice', 'Multiple choice'], ['check', 'Checkbox'], ['date', 'Date'], ['sign', 'Signature']];
  var WHO = [['everyone', 'Every client, before their first session'], ['premium', 'Premium Course members'], ['scan', 'Anyone booked for an energetic scan'], ['optional', 'Optional, sent by hand']];
  function typeLabel(t) { return TYPES.filter(function (x) { return x[0] === t; })[0][1]; }
  function whoLabel(w) { return WHO.filter(function (x) { return x[0] === w; })[0][1]; }
  function form(id) { return S().forms.filter(function (f) { return f.id === id; })[0]; }

  /* Who a form applies to, and whether they have signed it. */
  function applies(f, c) {
    if (f.who === 'everyone') return true;
    if (f.who === 'premium') return !!c.member;
    if (f.who === 'scan') return S().scans.some(function (x) { return x.client === c.id; });
    return !!(c.forms && c.forms[f.id]);
  }
  function outstanding(c) { return S().forms.filter(function (f) { return applies(f, c) && !(c.forms && c.forms[f.id]); }); }

  /* The form as the client sees it. Inputs are live in the client portal. */
  function render(f, live) {
    var dis = live ? '' : ' disabled';
    return '<div class="fdoc" data-tour="formpreview"><div class="fd-head"><span class="pill' + (f.kind === 'Waiver' ? ' honey' : '') + '">' + esc(f.kind) + '</span><h3 class="fd-title">' + esc(f.title || 'Untitled') + '</h3><div class="small muted">Evergrove Wellness</div></div>' +
      (f.body ? '<div class="fd-body">' + esc(f.body) + '</div>' : '') +
      f.fields.map(function (x) {
        var lab = '<div class="fd-label">' + esc(x.label || 'Untitled question') + (x.req ? ' <span class="fd-req">*</span>' : '') + '</div>';
        if (x.type === 'text') return '<div class="fd-q">' + lab + '<input type="text" data-ff="' + x.id + '"' + dis + '></div>';
        if (x.type === 'long') return '<div class="fd-q">' + lab + '<textarea rows="2" data-ff="' + x.id + '"' + dis + '></textarea></div>';
        if (x.type === 'date') return '<div class="fd-q">' + lab + '<input type="date" data-ff="' + x.id + '"' + dis + '></div>';
        if (x.type === 'yesno') return '<div class="fd-q">' + lab + '<div class="row"><label class="check"><input type="radio" name="r' + x.id + '"' + dis + '> Yes</label><label class="check"><input type="radio" name="r' + x.id + '"' + dis + '> No</label></div></div>';
        if (x.type === 'choice') return '<div class="fd-q">' + lab + '<div class="chips">' + (x.options.length ? x.options : ['Option 1', 'Option 2']).map(function (o) { return live ? '<button type="button" class="chip" data-fchip="' + esc(o) + '">' + esc(o) + '</button>' : '<span class="chip">' + esc(o) + '</span>'; }).join('') + '</div></div>';
        if (x.type === 'check') return '<div class="fd-q"><label class="check"><input type="checkbox" data-ff="' + x.id + '"' + dis + '> ' + esc(x.label) + (x.req ? ' <span class="fd-req">*</span>' : '') + '</label></div>';
        return '<div class="fd-q">' + lab + '<input type="text" class="fd-sign" placeholder="Type your full name to sign" data-ffsign="' + x.id + '"' + dis + '></div>';
      }).join('') + '</div>';
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function view() {
    var fm = st(), D = S();
    if (!fm.draft || fm.draft.id !== fm.sel) fm.draft = clone(form(fm.sel) || D.forms[0]);
    var d = fm.draft, clients = D.clients;
    var need = clients.filter(function (c) { return applies(d, c); }), done = need.filter(function (c) { return c.forms && c.forms[d.id]; }), todo = need.filter(function (c) { return !(c.forms && c.forms[d.id]); });
    return U.head('Templates, signatures and who still needs to sign', 'Waivers &amp; Forms', 'Write each waiver and form once. The right clients get it automatically, sign it in their portal, and the signed copy is saved to their documents.') +
      '<div class="fmgrid"><div><div class="card" data-tour="formlist"><div class="row" style="justify-content:space-between;margin-bottom:.4rem"><h3 class="h3" style="margin:0">Templates</h3></div>' +
        D.forms.map(function (f) {
          var n = clients.filter(function (c) { return applies(f, c); }), s = n.filter(function (c) { return c.forms && c.forms[f.id]; }).length;
          return '<button class="fmitem' + (f.id === fm.sel ? ' is-on' : '') + '" data-fsel="' + f.id + '"><span class="grow"><b>' + esc(f.title) + '</b><span class="small muted">' + esc(f.kind) + ' &middot; ' + esc(whoLabel(f.who).split(',')[0]) + '</span></span><span class="small muted num">' + s + '/' + n.length + '</span></button>';
        }).join('') +
        '<div class="row" style="margin-top:.8rem"><button class="btn small" id="fmNewW">New waiver</button><button class="btn ghost small" id="fmNewF">New form</button></div></div></div>' +
      '<div class="card" data-tour="formeditor"><div class="fields"><div class="wide"><label for="fmTitle">Title</label><input id="fmTitle" type="text" value="' + esc(d.title) + '"></div>' +
        '<div><label for="fmKind">Type</label><select id="fmKind">' + ['Waiver', 'Form'].map(function (k) { return '<option' + (k === d.kind ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="fmWho">Who signs it</label><select id="fmWho">' + WHO.map(function (w) { return '<option value="' + w[0] + '"' + (w[0] === d.who ? ' selected' : '') + '>' + w[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="wide"><label for="fmBody">' + (d.kind === 'Waiver' ? 'Waiver wording' : 'Introduction (optional)') + '</label><textarea id="fmBody" rows="4">' + esc(d.body) + '</textarea></div></div>' +
        '<p class="label" style="margin-top:1rem">Questions</p>' +
        d.fields.map(function (x, i) {
          return '<div class="fmrow"><select data-ftype="' + i + '" aria-label="Question type">' + TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === x.type ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
            '<input type="text" data-flabel="' + i + '" value="' + esc(x.label) + '" aria-label="Question">' +
            '<label class="check small" style="margin:0"><input type="checkbox" data-freq="' + i + '"' + (x.req ? ' checked' : '') + '> Required</label>' +
            '<span class="row" style="gap:.2rem;flex-wrap:nowrap"><button class="mv" data-fmv="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button><button class="mv" data-fmv="' + i + '" data-d="1"' + (i === d.fields.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button><button class="linkish" data-fdel="' + i + '">Remove</button></span>' +
            (x.type === 'choice' ? '<input type="text" class="fmopts" data-fopts="' + i + '" value="' + esc(x.options.join(', ')) + '" placeholder="Options, separated by commas" aria-label="Options">' : '') + '</div>';
        }).join('') +
        '<div class="chips" style="margin-top:.6rem" data-tour="addfield">' + TYPES.map(function (t) { return '<button class="chip small" data-fadd="' + t[0] + '">+ ' + t[1] + '</button>'; }).join('') + '</div>' +
        '<div class="row" style="margin-top:1rem"><button class="btn" id="fmSave">Save template</button>' + (todo.length ? '<button class="btn ghost" id="fmSend">Send to ' + todo.length + ' who still need' + (todo.length === 1 ? 's' : '') + ' to sign</button>' : '') + '</div></div>' +
      '<div><p class="label">What the client sees</p>' + render(d, false) +
        '<div class="card" style="margin-top:1rem"><h3 class="h3">Signed ' + done.length + ' of ' + need.length + '</h3>' + (todo.length ? '<p class="small muted" style="margin:.2rem 0 .4rem">Still to sign: ' + todo.slice(0, 8).map(function (c) { return esc(c.name); }).join(', ') + (todo.length > 8 ? ' and ' + (todo.length - 8) + ' more' : '') + '</p>' : '<p class="small muted" style="margin:.2rem 0 0">Everyone who needs it has signed.</p>') + '</div></div></div>';
  }

  function bind() {
    var fm = st(), d = fm.draft, $ = U.$, $$ = U.$$;
    function keep() { var y = window.scrollY; App.render(); window.scrollTo(0, y); }
    $$('[data-fsel]').forEach(function (b) { b.addEventListener('click', function () { fm.sel = b.getAttribute('data-fsel'); fm.draft = null; keep(); }); });
    function make(kind) {
      var D = S(), f = { id: 'f' + Date.now(), title: kind === 'Waiver' ? 'New waiver' : 'New form', kind: kind, who: 'optional', updated: U.today(), body: '', fields: kind === 'Waiver' ? [{ id: 'q' + Date.now(), type: 'check', label: 'I have read and agree to the above', req: true, options: [] }, { id: 'q' + (Date.now() + 1), type: 'sign', label: 'Signature', req: true, options: [] }] : [{ id: 'q' + Date.now(), type: 'text', label: '', req: false, options: [] }] };
      D.forms.push(f); fm.sel = f.id; fm.draft = null; U.save(); App.render(); window.scrollTo(0, 0);
    }
    $('#fmNewW').addEventListener('click', function () { make('Waiver'); });
    $('#fmNewF').addEventListener('click', function () { make('Form'); });
    $('#fmTitle').addEventListener('input', function (e) { d.title = e.target.value; var t = $('.fd-title'); if (t) t.textContent = d.title || 'Untitled'; });
    $('#fmKind').addEventListener('change', function (e) { d.kind = e.target.value; keep(); });
    $('#fmWho').addEventListener('change', function (e) { d.who = e.target.value; keep(); });
    $('#fmBody').addEventListener('change', function (e) { d.body = e.target.value; keep(); });
    $$('[data-ftype]').forEach(function (s) { s.addEventListener('change', function () { d.fields[+s.getAttribute('data-ftype')].type = s.value; keep(); }); });
    $$('[data-flabel]').forEach(function (s) { s.addEventListener('change', function () { d.fields[+s.getAttribute('data-flabel')].label = s.value; keep(); }); });
    $$('[data-fopts]').forEach(function (s) { s.addEventListener('change', function () { d.fields[+s.getAttribute('data-fopts')].options = s.value.split(',').map(function (o) { return o.trim(); }).filter(Boolean); keep(); }); });
    $$('[data-freq]').forEach(function (s) { s.addEventListener('change', function () { d.fields[+s.getAttribute('data-freq')].req = s.checked; keep(); }); });
    $$('[data-fdel]').forEach(function (b) { b.addEventListener('click', function () { d.fields.splice(+b.getAttribute('data-fdel'), 1); keep(); }); });
    $$('[data-fmv]').forEach(function (b) {
      b.addEventListener('click', function () { var i = +b.getAttribute('data-fmv'), j = i + (+b.getAttribute('data-d')), t = d.fields[i]; d.fields[i] = d.fields[j]; d.fields[j] = t; keep(); });
    });
    $$('[data-fadd]').forEach(function (b) {
      b.addEventListener('click', function () { var t = b.getAttribute('data-fadd'); d.fields.push({ id: 'q' + Date.now(), type: t, label: t === 'sign' ? 'Signature' : t === 'date' ? 'Date' : '', req: t === 'sign', options: [] }); keep(); var l = $$('[data-flabel]'); if (l.length) l[l.length - 1].focus(); });
    });
    $('#fmSave').addEventListener('click', function () {
      var D = S(), i = D.forms.map(function (f) { return f.id; }).indexOf(d.id);
      d.updated = U.today(); D.forms[i] = clone(d);
      U.activity('Template "' + d.title + '" saved in Waivers & Forms.');
      U.save(); keep(); U.toast('Saved. New clients get the updated version.');
    });
    var send = $('#fmSend');
    if (send) send.addEventListener('click', function () {
      var n = S().clients.filter(function (c) { return applies(d, c) && !(c.forms && c.forms[d.id]); }).length;
      U.activity('"' + d.title + '" sent to ' + n + ' client' + (n > 1 ? 's' : '') + ' to sign in their portal.');
      U.save(); U.toast('Sent to ' + n + ' client' + (n > 1 ? 's' : '') + '. They sign it in their portal.');
    });
  }

  window.EGForms = { render: render, outstanding: outstanding, applies: applies, form: form, whoLabel: whoLabel };
  App.register('forms', view, bind);
})();
