/* Root Cause Clinic showcase - reading the real scan exports.
 *
 * The four Qest4 PDF exports (RR, RC, SS, IMB) are read in the browser with
 * pdf.js; nothing is uploaded anywhere. The parsing rules are the clinic's own
 * report builder's: organ write-ups and scores from the RR, findings anchored
 * on their dosage line from the other three, sections from the category,
 * dilution notes on IMB markers, supplier copy trimmed to the substance.
 *
 * The result has the same shape as the sample scan, so the review screen,
 * the report and the protocol builder work on it unchanged.
 *
 * Works in Node too (for tests): parse() needs only the extracted text.
 */
(function (root) {
  'use strict';

  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var HTML2PDF = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

  /* ------------------------------------------------------------ loading */
  var loads = {};
  function script(src) {
    if (!loads[src]) loads[src] = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { delete loads[src]; fail(new Error('Could not load ' + src.split('/').pop())); };
      document.head.appendChild(s);
    });
    return loads[src];
  }
  function pdfjs() {
    return script(PDFJS + 'pdf.min.js').then(function () {
      root.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
      return root.pdfjsLib;
    });
  }

  /* --------------------------------------------- PDF text, line by line */
  /* Fragments do not arrive in reading order: bucket them into lines by
     rounded y, order lines top to bottom and fragments left to right, and
     mark a paragraph wherever the gap is well over a normal line. */
  function pageText(content) {
    var buckets = {}, text = '';
    content.items.forEach(function (it) {
      if (!it.str) return;
      var y = Math.round(it.transform[5] / 3) * 3;
      (buckets[y] = buckets[y] || []).push({ x: it.transform[4], s: it.str });
    });
    var ys = Object.keys(buckets).map(Number).sort(function (a, b) { return b - a; });
    var gaps = [];
    for (var g = 1; g < ys.length; g++) gaps.push(ys[g - 1] - ys[g]);
    gaps.sort(function (a, b) { return a - b; });
    var paraGap = (gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12) * 1.6;
    ys.forEach(function (y, yi) {
      if (yi > 0 && ys[yi - 1] - y > paraGap) text += '\n';
      var frags = buckets[y].sort(function (a, b) { return a.x - b.x; }), line = '';
      frags.forEach(function (f, i) {
        if (i > 0) {
          var prev = frags[i - 1];
          var needSpace = f.x - prev.x > prev.s.length * 3 || (!/\s$/.test(line) && !/^\s/.test(f.s));
          if (needSpace && !/\s$/.test(line)) line += ' ';
        }
        line += f.s;
      });
      line = line.replace(/\s+/g, ' ').trim();
      if (line) text += line + '\n';
    });
    return text + '\n';
  }
  function textOf(lib, data) {
    return lib.getDocument({ data: data }).promise.then(function (pdf) {
      var out = [], chain = Promise.resolve();
      for (var p = 1; p <= pdf.numPages; p++) (function (p) {
        chain = chain.then(function () { return pdf.getPage(p); }).then(function (pg) { return pg.getTextContent(); }).then(function (c) { out.push(pageText(c)); });
      })(p);
      return chain.then(function () { pdf.destroy(); return out.join(''); });
    });
  }

  /* ------------------------------------------------------------- rules */
  var NOISE_RE = /^(Stressed|Weakened|Balanced|Symptomatic|Retest|Re-establishing balance|Confidential|Assessment Results|Filter Test|Amplification Level|Operator|Clinic Name|Bringing your health|CONFIDENTIAL INFORMATION|Root Cause Clinic|PO Box|support@|www\.|Toll Free|Disclaimer|USA\/CANADA|Aperture Energetics|This approach is not looking|maintaining optimum health|Date:|DOB:|Sex:|\* This is not to be used)/i;
  var ORGAN_STOP = /^(Comprehensive Analysis Summary|Information Report|Dental Chart|Vertebral Chart|Baseline Summary|Qest4 offers an energetic)/i;
  var CAT_RE = /^(.+?)\s*\((\d{1,4})\)\s*$/;
  var DOSAGE_RE = /(\S{1,16})\s+(\d+\s*(?:Drops?|Sprays?|Tablets?|ml))\s+(\d+\s*(?:Weeks?|Months?|Days?))\s*$/i;
  var CODE_RE = /^(.+?)\s*\(([A-Za-z][A-Za-z0-9.\-\/]{0,10})\)\s*:?\s*$/;
  /* Machine settings, not findings: read, but left unticked. */
  var SETTING_CATEGORIES = /^(imprint|remote imprint|search:)/i;
  var BOTANICAL = ['doterra', 'emotions', 'skin', 'tree 1', 'single oils', 'respiratory system'];
  var CATEGORY_LABELS = {
    'hormone signatures': 'Hormone Markers', 'amino acid signatures': 'Amino Acid Markers', 'vitamin signatures': 'Vitamin Markers',
    'mineral signatures': 'Mineral Markers', 'enzyme signatures': 'Enzyme Markers', 'vertebral signatures': 'Vertebral Markers',
    'virus signatures': 'Virus Markers', 'genome signatures': 'Genome Markers', 'cell salt signatures': 'Cell Salt Markers',
    'supplement signatures': 'Supplement Markers', 'fatty acid signatures': 'Fatty Acid Markers', 'hormone markers': 'Hormone Markers'
  };
  var DIL_NOTES = { V: 'May be low', X: 'May be low', C: 'May fluctuate', K: 'May fluctuate', M: 'May be high', LM: 'May be high', DM: 'May be high or unable to absorb', CM: 'May be high or unable to absorb', MM: 'May be high or unable to absorb' };
  var DIL_SERIES = ['V', 'X', 'K', 'C', 'M', 'LM', 'DM', 'CM', 'MM'];
  var CLAIM_RE = /\b(cures?|cured|treats?|prevents?|eliminat\w+|heals?|reverses?)\b(?!\s*T3)/gi;

  function categoryLabel(cat) { var k = String(cat || '').trim(); return CATEGORY_LABELS[k.toLowerCase()] || k; }
  function classify(category, name) {
    var c = String(category || '').toLowerCase(), n = String(name || '').toLowerCase();
    if (n.indexOf('hertz frequency') > -1) return 'Resonating Maladies';
    var rules = [
      [/emotional filter/, 'Generational Echoes'], [/bacteria filter|chemical filter/, 'Toxins & Interferences'], [/virus/, 'Resonating Maladies'],
      [/electromagnetic/, 'Environmental Stressors'], [/hormone signatures|hormone markers/, 'Hormone Markers'], [/neurological filter/, 'Neurological Markers'],
      [/amino acid signatures/, 'Amino Acid Markers'], [/enzyme signatures/, 'Enzyme Markers'], [/mineral signatures/, 'Mineral Markers'],
      [/vitamin signatures/, 'Vitamin Markers'], [/vertebral signatures/, 'Vertebral Markers'], [/tooth|occlusal|associated vertebrae|dental/, 'Dental Markers'],
      [/genome signatures|chromosomal filter|cell salt/, 'Cell Health Markers'], [/inflammation filter/, 'Inflammation Markers'],
      [/meridian clearing/, 'Chinese Medicine Markers'], [/meridian/, 'Meridians / Vortices'], [/stress management|sleep/, 'Supportive Lifestyle Changes'],
      [/power thoughts/, 'Beneficial Positive Thoughts']
    ];
    for (var i = 0; i < rules.length; i++) if (rules[i][0].test(c)) return rules[i][1];
    /* Exact match: "Skin" is botanical, "Skin Energy" is a remedy. */
    if (BOTANICAL.indexOf(c.trim()) > -1) return 'Botanical Support';
    return 'Recommended Remedies';
  }
  function dilNote(doc, category, dil) {
    if (doc !== 'IMB' || !/hormone|mineral|amino acid/i.test(category)) return '';
    var m = String(dil || '').match(/([A-Za-z]+)\s*$/);
    return m ? DIL_NOTES[m[1].toUpperCase()] || '' : '';
  }
  function potencyKey(it) {
    var m = String(it.dil || '').trim().match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)$/), doc = { RC: 0, SS: 1, IMB: 2 }[it.doc];
    if (doc === undefined) doc = 9;
    if (!m) return [doc, 99, 1e15];
    var i = DIL_SERIES.indexOf(m[2].toUpperCase());
    return [doc, i < 0 ? 98 : i, parseFloat(m[1])];
  }
  function comparePotency(a, b) {
    var ka = potencyKey(a), kb = potencyKey(b);
    for (var i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  }
  function claimWords(t) { var m = String(t || '').match(CLAIM_RE); return m ? m.map(function (x) { return x.toLowerCase(); }).filter(function (x, i, a) { return a.indexOf(x) === i; }) : []; }

  /* Supplier copy carries dosing, ingredient decks, promo codes, addresses
     and citations. Strip that so the client reads the substance. Nothing is
     reworded, only removed, so no claim gets stronger than the source. */
  var STRIP = [
    [/https?:\/\/\S+/gi, ''], [/www\.\S+/gi, ''], [/[\w.\-]+@[\w.\-]+\.\w+/gi, ''], [/\b\d{3}[.\-]\d{3}[.\-]\d{4}\b/g, ''],
    [/\b(?:Toll Free|Phone)\s*:?\s*[\d.\-\s]+/gi, ''],
    [/\b(Order from your|Shop (?:at|with)|Get a membership|Obtain with your advocate|code RCC|Up to \d+% off|for \d+% off)[^.]*\.?/gi, ''],
    [/\b(GENERAL\s+)?DOSING\s*:[^.]*\.?/gi, ''],
    [/\b(DIRECTIONS|Dosage|Instructions|As a dietary supplement|Apply to affected area)\s*:?[^.]*\.?/gi, ''],
    [/\b\d+\s*-?\s*\d*\s*drops? (?:under the tongue|twice|three times|four times|in the morning|daily)[^.]*\.?/gi, ''],
    [/Consult (?:a|your) physician[^.]*\.?/gi, ''], [/Not for children under[^.]*\.?/gi, ''], [/Keep out of reach of children\.?/gi, ''],
    [/Store in a cool[^.]*\.?/gi, ''], [/These statements have not been evaluated[^.]*\.?/gi, ''], [/This product is not intended to diagnose[^.]*\.?/gi, ''],
    [/Disclaimer\s*:[\s\S]*$/gi, ''], [/Limited to licensed Healing Arts[\s\S]*$/gi, ''], [/\b(CAUSAL CHAIN\s+)?INGREDIENTS\s*:[\s\S]*$/gi, ''],
    [/\bQUANTITY\s*:\s*\S+\s*/gi, ''], [/(?:\b[A-Z][A-Za-z\-]+(?:\s+[A-Za-z\-]+)?\s*\(\d+[XCM]+\)[\s,|]*){3,}/g, ''],
    [/Helper Remedies\s*:[^.]*\.?/gi, ''], [/Acupuncture Meridians\s*:[^.]*\.?/gi, ''], [/Symptom Profile\s*:/gi, 'May relate to:'],
    [/\((?:Modern Essentials[^)]*|P\.E\. Nielsen[^)]*)\)/gi, ''], [/\bBook\s*:\s*The Healing Nutrients Within[^.]*\.?/gi, ''],
    [/seen on www\.\S+[^.]*\.?/gi, ''], [/References?\s*:[\s\S]*$/gi, ''],
    [/\bfound (?:January|February|March|April|May|June|July|August|September|October|November|December) \d+,?\s*\d{4}/gi, ''], [/\*+/g, '']
  ];
  /* "Common primary uses:" can run to 30 conditions; keep five and count the rest. */
  function condense(t) {
    return t.replace(/(Common primary uses|May relate to|Clinical uses|Common application methods|Support For|Food [Ss]ources|Deficiency symptoms|Symptoms of Deficiency)\s*:\s*([^.]{60,})\./gi, function (full, label, body) {
      var parts = body.split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
      return parts.length <= 6 ? full : label + ': ' + parts.slice(0, 5).join(', ') + ', and ' + (parts.length - 5) + ' more.';
    });
  }
  function simplify(desc, max, maxLen) {
    if (!desc) return '';
    var t = desc;
    STRIP.forEach(function (r) { t = t.replace(r[0], r[1]); });
    t = condense(t).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/([.,;:]){2,}/g, '$1').replace(/\(\s*\)/g, '').trim().replace(/^[\s.,;:|\-]+/, '');
    var out = t.split(/(?<=[.!?])\s+/).filter(function (p) { return p.split(/\s+/).length > 2; }).slice(0, max || 3).join(' ').trim();
    /* Some supplier text has no full stops, so one "sentence" can run to a page. */
    if (maxLen && out.length > maxLen + 20) { out = out.slice(0, maxLen); var cut = Math.max(out.lastIndexOf('; '), out.lastIndexOf('. ')); out = (cut > maxLen / 2 ? out.slice(0, cut + 1) : out.slice(0, out.lastIndexOf(' '))).replace(/[;,:]$/, '') + '…'; }
    if (out && !/[.!?…]$/.test(out)) out += '.';
    return out;
  }

  /* --------------------------------------------------------- RR: organs */
  function parseOrgans(text) {
    var raw = text.split('\n').map(function (l) { return l.trim(); });
    var lines = raw.filter(function (l, i) { return l !== '' || (i > 0 && raw[i - 1] !== ''); });
    var heads = [];
    lines.forEach(function (l, i) { var m = l.match(/^([A-Za-z][A-Za-z\s\/]{2,45}?)\s+Resonance$/); if (m) heads.push({ i: i, organ: m[1].trim() }); });
    var out = [], seen = {};
    heads.forEach(function (h, k) {
      var block = lines.slice(h.i + 1, k + 1 < heads.length ? heads[k + 1].i : lines.length);
      var stop = -1; block.some(function (b, j) { if (ORGAN_STOP.test(b)) { stop = j; return true; } return false; });
      if (stop > -1) block = block.slice(0, stop);
      /* The score is a short line of its own near the top, not always first. */
      var score = null;
      for (var j = 0; j < Math.min(block.length, 8); j++) {
        if (/^\d{1,3}$/.test(block[j])) { score = parseInt(block[j], 10); block.splice(j, 1); break; }
      }
      if (score === null && block.length) { var fm = block[0].match(/^(\d{1,3})\b\s+(.*)$/); if (fm) { score = parseInt(fm[1], 10); block[0] = fm[2]; } }
      if (score === null || score > 100 || seen[h.organ.toLowerCase()]) return;
      seen[h.organ.toLowerCase()] = 1;
      block = block.filter(function (l) { return !/^\d+\s*of\s*\d+$/i.test(l) && !NOISE_RE.test(l); });
      var paras = [], cur = [];
      block.forEach(function (l) { if (l === '') { if (cur.length) { paras.push(cur.join(' ')); cur = []; } } else cur.push(l); });
      if (cur.length) paras.push(cur.join(' '));
      /* A page break in the export splits a paragraph; join a piece that
         does not finish its sentence to the one after it. */
      paras = paras.reduce(function (acc, p) {
        var last = acc[acc.length - 1];
        if (last && !/[.!?:"”)]$/.test(last.trim())) acc[acc.length - 1] = last + ' ' + p; else acc.push(p);
        return acc;
      }, []);
      /* Description first, then symptoms, then the emotional aspect. */
      var main = [], sym = [], emo = [];
      paras.forEach(function (p) {
        var t = p.replace(/\s+/g, ' ').trim(); if (!t) return;
        (/^Symptoms may include/i.test(t) ? sym : /^Emotional aspect/i.test(t) ? emo : main).push(t);
      });
      var ordered = main.concat(sym, emo).map(function (p) { return simplify(p, 20); }).filter(Boolean);
      out.push({ organ: h.organ, score: score, paragraphs: ordered.length ? ordered : [''], include: true });
    });
    return out;
  }

  /* --------------------------------------------- RC, SS, IMB: findings */
  function parseItems(text, doc) {
    var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && !/^\d+\s*of\s*\d+$/i.test(l); });
    var items = [], cat = 'General', i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (NOISE_RE.test(line)) { i++; continue; }
      var cm = line.match(CAT_RE);
      if (cm) { cat = cm[1].trim(); i++; continue; }
      /* An item is anchored by the dosage at the end of its own line. */
      var dm = line.match(DOSAGE_RE);
      if (!dm) { i++; continue; }
      var name = line.replace(DOSAGE_RE, '').trim(), code = '';
      if (!name) { i++; continue; }
      var codeM = name.match(CODE_RE); if (codeM) { name = codeM[1].trim(); code = codeM[2]; }
      var desc = [], k = i + 1;
      while (k < lines.length && !CAT_RE.test(lines[k]) && !DOSAGE_RE.test(lines[k]) && !NOISE_RE.test(lines[k])) desc.push(lines[k++]);
      var full = desc.join(' ').replace(/\s+/g, ' ').trim(), plain = simplify(full, 3, 400);
      items.push({ doc: doc, category: categoryLabel(cat), item: name, code: code, dil: dm[1], qty: dm[2], dur: dm[3], desc: plain, raw: full,
        claims: claimWords(plain), section: classify(cat, name), status: 'none', include: !SETTING_CATEGORIES.test(cat), rc: doc === 'RC', note: dilNote(doc, cat, dm[1]) });
      i = k;
    }
    return items;
  }

  /* ------------------------------------------------------- client info */
  function parseDate(str) {
    if (!str) return null;
    var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, m[1] - 1, +m[2]); }
    var d = new Date(str); return isNaN(d) ? null : d;
  }
  function iso(d) { return d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : ''; }
  function clientInfo(all) {
    var name = '', m = all.match(/Client Name\s*\n?\s*([A-Za-z,'\-\. ]{3,40})/);
    if (m) name = m[1].trim();
    if (!name) { m = all.match(/([A-Z][a-zA-Z'\-]+,\s*[A-Z][a-zA-Z'\-]+)\s*\n?\s*(?:Date:|Amplification Level)/); if (m) name = m[1].trim(); }
    if (name.indexOf(',') > -1) { var p = name.split(',').map(function (s) { return s.trim(); }); if (p.length === 2) name = p[1] + ' ' + p[0]; }
    var dob = (all.match(/DOB[:\s]*\n?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/) || [])[1] || '';
    var date = (all.match(/(?:Scan Date|Date)[:\s]*\n?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}|[A-Z][a-z]+ [0-9]{1,2},\s*[0-9]{4})/) || [])[1] || '';
    var sex = (all.match(/Sex[:\s]*\n?\s*(Male|Female)/) || [])[1] || '';
    var ageEst = (all.match(/give or take[^)]*\)\s*\n?\s*([\d.]+)/i) || [])[1] || '';
    var bd = parseDate(dob), sd = parseDate(date), age = bd && sd ? String(Math.floor((sd - bd) / (365.25 * 864e5))) : '';
    return { name: name, dob: dob, date: iso(sd), sex: sex, age: age, ageEst: ageEst };
  }

  /* texts: { RR: '...', RC: '...', SS: '...', IMB: '...' }, any subset. */
  function parse(texts) {
    var organs = [], items = [], all = '';
    ['RR', 'RC', 'SS', 'IMB'].forEach(function (code) {
      var t = texts[code]; if (!t) return;
      all += t + '\n';
      if (code === 'RR') organs = parseOrgans(t);
      else items = items.concat(parseItems(t, code));
    });
    items.forEach(function (x, k) { x.id = 'f' + k; });
    organs.sort(function (a, b) { return Math.abs(b.score - 50) - Math.abs(a.score - 50); });
    items.filter(function (x) { return x.section === 'Recommended Remedies'; }).sort(comparePotency).forEach(function (x, k) { x.rank = k; });
    var info = clientInfo(all);
    return { organs: organs, items: items, limit: 15, ageEst: info.ageEst, info: info, real: true };
  }

  /* files: { RR: File, ... }. onStep(label) reports progress. */
  function read(files, onStep) {
    var codes = ['RR', 'RC', 'SS', 'IMB'].filter(function (c) { return files[c]; }), texts = {};
    onStep = onStep || function () {};
    onStep('Loading the PDF reader', 0);
    return pdfjs().then(function (lib) {
      var chain = Promise.resolve();
      codes.forEach(function (c, i) {
        chain = chain.then(function () { onStep('Reading ' + c + ': ' + files[c].name, (i + 1) / (codes.length + 1)); return files[c].arrayBuffer(); })
          .then(function (buf) { return textOf(lib, new Uint8Array(buf)); })
          .then(function (t) { texts[c] = t; }, function (e) { throw new Error('Could not read the ' + c + ' file (' + files[c].name + '): ' + e.message); });
      });
      return chain;
    }).then(function () {
      onStep('Sorting findings and ranking remedies', 1);
      return parse(texts);
    });
  }

  /* Which slot a file belongs in, from its name: "07-03-26_RC.pdf" is RC. */
  function slotFor(name) {
    var m = String(name).toUpperCase().match(/(?:^|[^A-Z])(RR|RC|SS|IMB)(?:[^A-Z]|$)/g);
    return m ? m[m.length - 1].replace(/[^A-Z]/g, '') : '';
  }

  /* --------------------------------------------------------- PDF out */
  /* Lays the report out at a fixed width and saves it as a PDF. html2pdf
     copies the element into its own hidden overlay, so it needs no place on the page. */
  function save(html, filename) {
    return script(HTML2PDF).then(function () {
      var box = document.createElement('div');
      box.className = 'pdf-render'; box.innerHTML = html;
      /* html2canvas skips inline SVG, so each dial is drawn to a PNG first. */
      var dials = Array.prototype.map.call(box.querySelectorAll('svg'), function (svg) {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '200'); svg.setAttribute('height', '120');
        return new Promise(function (ok) {
          var src = new Image();
          src.onload = function () {
            var cv = document.createElement('canvas'); cv.width = 200; cv.height = 120; cv.getContext('2d').drawImage(src, 0, 0, 200, 120);
            var img = new Image(); img.src = cv.toDataURL('image/png'); img.className = svg.getAttribute('class') || '';
            if (svg.parentNode) svg.parentNode.replaceChild(img, svg);
            ok();
          };
          src.onerror = function () { ok(); };
          src.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML);
        });
      });
      return Promise.all(dials).then(function () { return root.html2pdf().set({
        margin: [8, 8, 10, 8], filename: filename, image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.rr-organ', '.rr-rem', '.rr-item', '.rr-h'] }
      }).from(box).save(); });
    });
  }

  root.EGPdf = { read: read, parse: parse, pageText: pageText, slotFor: slotFor, save: save, claimWords: claimWords, comparePotency: comparePotency, simplify: simplify };
  if (typeof module === 'object' && module.exports) module.exports = root.EGPdf;
})(typeof window !== 'undefined' ? window : globalThis);
