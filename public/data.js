/* Root Cause Clinic showcase - sample data and the small engines behind it.
 *
 * Everything here is invented. Names use example.com addresses, suppliers are
 * fictional, and the recommendation rules are demonstration logic only. Dates
 * are relative to today so the showcase always looks current.
 */
(function () {
  'use strict';

  var DAY = 86400000;
  function iso(offset) {
    var d = new Date(Date.now() + offset * DAY);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  var BRAND = {
    name: 'Root Cause Clinic',
    tagline: 'Videos, coaching and supplements, personalised',
    owner: 'Maya Brooks',
    email: 'hello@rootcause.example'
  };

  var GOALS = [
    { id: 'energy', label: 'More energy' },
    { id: 'sleep', label: 'Better sleep' },
    { id: 'stress', label: 'Less stress' },
    { id: 'digestion', label: 'Digestion' },
    { id: 'immunity', label: 'Immunity' },
    { id: 'joints', label: 'Joints & mobility' },
    { id: 'detox', label: 'Detox & drainage' },
    { id: 'focus', label: 'Focus' }
  ];

  /* The client's three largest suppliers, from public websites (checked
     October 2026), plus one invented backup lab. `path` is how an approved
     order reaches each one; every path runs inside a session the
     practitioner opened themselves, never a stored-password robot. The policy
     flags are hard rules the platform enforces, not settings. */
  var SUPPLIERS = {
    physica: { name: 'Physica Energetics', short: 'Physica', role: 'Primary supplier', platform: 'BigCommerce',
      path: 'cart', pathLabel: 'Fills your Physica cart (browser extension)',
      dispensary: 'Patient Portal with a practitioner ID (what it covers is still to confirm)',
      dropship: 'Yes, practitioner-placed orders ship to the client. $20 flat under $500 (US), free from $500. Packing slip shows no prices.',
      flags: { mapEnforced: true, pricingPublic: false, requiresPractitionerLink: true, shipsInternationally: 'Canada (90-day supply)' },
      memberDiscount: 'Not without Physica’s written OK: selling below their minimum advertised price breaks the resale policy.',
      freeFrom: 500, flat: 20, ships: 'Ships in 1-2 days, UPS 3-5 business days' },
    biotics: { name: 'Biotics Research', short: 'Biotics', role: 'Nutritionals', platform: 'Shopify',
      path: 'link', pathLabel: 'Opens a ready-made cart link in your Biotics account',
      dispensary: 'eStoreRx (branded patient store, auto-ship, drop-ship). Also on Fullscript.',
      dropship: 'Through eStoreRx or Fullscript. Wholesale orders ship to the clinic.',
      flags: { mapEnforced: true, pricingPublic: false, requiresPractitionerLink: true, shipsInternationally: 'To confirm' },
      memberDiscount: 'Only as a private code for your own patients, never shown on the site. Online prices at or above suggested retail.',
      freeFrom: 0, flat: 0, ships: 'To confirm' },
    desbio: { name: 'DesBio (Deseret Biologicals)', short: 'DesBio', role: 'Homeopathics and detox', platform: 'WooCommerce',
      path: 'cart', pathLabel: 'Adds lines to your DesBio cart (extension or add-to-cart links)',
      dispensary: 'dbscript (practitioner approves each purchase; ships in 24 hours on weekdays; US only)',
      dropship: 'Through dbscript, US addresses only. International clients: order and forward it yourself.',
      flags: { mapEnforced: false, pricingPublic: false, requiresPractitionerLink: true, shipsInternationally: 'No (dbscript)' },
      memberDiscount: 'Policy not yet read. Treat as not allowed until it is.',
      freeFrom: 0, flat: 0, ships: 'dbscript: within 24 hours on weekdays, UPS or USPS Priority', note: 'FDA warning letter dated Oct 1, 2026 about one DesBio product sold on desbio.com. Check any product before listing it.' },
    bluewater: { name: 'Bluewater Labs (sample)', short: 'Bluewater', role: 'Invented backup', platform: 'Email',
      path: 'email', pathLabel: 'Sends a purchase order by email', dispensary: 'None', dropship: 'Sample only',
      flags: { mapEnforced: false, pricingPublic: true, requiresPractitionerLink: false, shipsInternationally: 'Sample' },
      memberDiscount: 'Sample supplier.', freeFrom: 0, flat: 0, ships: '1-3 days' }
  };
  var PATHS = {
    cart: 'Session cart: the extension fills the cart in your own logged-in tab; you click checkout',
    link: 'Cart link: one link builds the whole cart in your logged-in account; you click checkout',
    email: 'Email purchase order: a templated order goes out; the reply is matched back',
    manual: 'Manual queue: a task with everything to type in, and a box for the confirmation number'
  };

  var LINES = {
    milieu: { label: 'Milieu', kind: 'Drainage tonifier' },
    code: { label: 'Code', kind: 'Sarcode' },
    tox: { label: 'Tox', kind: 'Detoxifier homaccord' },
    nutri: { label: 'Nutritional', kind: 'Nutritional supplement' },
    desbio: { label: 'DesBio', kind: 'Homeopathic formula' }
  };

  /* Names are from Physica Energetics' public catalogue. Their prices sit behind
     a practitioner login, so every price and cost here is a placeholder. The
     goal pairings stand in for the practitioner's own protocol choices: they
     are not product claims. */
  var PRODUCTS = [
    { sku: 'PE-ADM', name: 'Adrenal Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { stress: 3, energy: 2 }, tags: ['vegan'], hue: 168 },
    { sku: 'PE-RLX', name: 'Relax Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { sleep: 3, stress: 2 }, tags: ['vegan'], hue: 182 },
    { sku: 'PE-SOL', name: 'Solace Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { stress: 3, focus: 1 }, tags: ['vegan'], hue: 158 },
    { sku: 'PE-DRN', name: 'Drainage Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { detox: 3, digestion: 1 }, tags: ['vegan'], hue: 175 },
    { sku: 'PE-LIV', name: 'Liver Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { detox: 2, digestion: 2 }, tags: ['vegan'], hue: 150 },
    { sku: 'PE-FLU', name: 'Flu Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { immunity: 3 }, tags: ['vegan'], hue: 190 },
    { sku: 'PE-HSM', name: 'Heart’s Song Milieu', line: 'milieu', dose: '30 mL tincture', price: 34, cost: 20.40, supplier: 'physica', goals: { stress: 2, sleep: 1 }, tags: ['vegan'], hue: 165 },
    { sku: 'PE-ADC', name: 'Adapto Code', line: 'code', dose: '30 mL tincture', price: 30, cost: 17.50, supplier: 'physica', goals: { stress: 2, energy: 2, focus: 1 }, tags: ['vegan'], hue: 262 },
    { sku: 'PE-PIN', name: 'Pineal Code', line: 'code', dose: '30 mL tincture', price: 30, cost: 17.50, supplier: 'physica', goals: { sleep: 3 }, tags: ['vegan'], hue: 250 },
    { sku: 'PE-THY', name: 'Thymus Code', line: 'code', dose: '30 mL tincture', price: 30, cost: 17.50, supplier: 'physica', goals: { immunity: 2 }, tags: ['vegan'], hue: 275 },
    { sku: 'PE-HYP', name: 'Hypothal Code', line: 'code', dose: '30 mL tincture', price: 30, cost: 17.50, supplier: 'physica', goals: { energy: 1, sleep: 1 }, tags: ['vegan'], caution: ['thyroid'], hue: 240 },
    { sku: 'PE-MET', name: 'Metabolic-Tox', line: 'tox', dose: '30 mL tincture', price: 32, cost: 18.90, supplier: 'physica', goals: { energy: 2, digestion: 2 }, tags: ['vegan'], hue: 36 },
    { sku: 'PE-MTL', name: 'Metal-Tox', line: 'tox', dose: '30 mL tincture', price: 32, cost: 18.90, supplier: 'physica', goals: { detox: 3 }, tags: ['vegan'], hue: 28 },
    { sku: 'PE-PNE', name: 'Pneuma-Tox', line: 'tox', dose: '30 mL tincture', price: 32, cost: 18.90, supplier: 'physica', goals: { immunity: 2, detox: 1 }, tags: ['vegan'], hue: 44 },
    { sku: 'PE-INF', name: 'Inflamma-Tox', line: 'tox', dose: '30 mL tincture', price: 32, cost: 18.90, supplier: 'physica', goals: { joints: 3 }, tags: ['vegan'], hue: 20 },
    { sku: 'PE-SIN', name: 'Sinus-Tox', line: 'tox', dose: '30 mL tincture', price: 32, cost: 18.90, supplier: 'physica', goals: { immunity: 1 }, tags: ['vegan'], hue: 52 },
    { sku: 'EG-MAG', name: 'Mg-Zyme', line: 'nutri', dose: 'Magnesium, tablets', price: 24, cost: 9.10, supplier: 'biotics', goals: { sleep: 2, joints: 1, stress: 1 }, tags: ['vegan'], hue: 120 },
    { sku: 'EG-D3K', name: 'Bio-D-Mulsion Forte', line: 'nutri', dose: 'Vitamin D3 drops, 2,000 IU per drop', price: 19, cost: 6.20, supplier: 'biotics', goals: { immunity: 2, energy: 1 }, tags: [], caution: ['bloodthinner'], hue: 48 },
    { sku: 'EG-OM3', name: 'Omega-3 Fish Oil', line: 'nutri', dose: '1,000 mg, 90 softgels', price: 32, cost: 13.75, supplier: 'bluewater', goals: { focus: 2, joints: 2 }, tags: ['fish'], caution: ['bloodthinner'], hue: 205 },
    { sku: 'EG-PRO', name: 'Probiotic 30B CFU', line: 'nutri', dose: '30 capsules', price: 39, cost: 15.30, supplier: 'bluewater', goals: { digestion: 3, immunity: 1 }, tags: ['vegan'], hue: 110 },
    { sku: 'EG-BCX', name: 'Methylated B-Complex', line: 'nutri', dose: '60 capsules', price: 22, cost: 7.80, supplier: 'bluewater', goals: { energy: 2, focus: 2 }, tags: ['vegan'], hue: 15 },
    { sku: 'DB-CDK', name: 'Comprehensive Detox Kit', line: 'desbio', dose: '6 homeopathic formulas', price: 159, cost: 92, supplier: 'desbio', goals: { detox: 2 }, tags: ['vegan'], hue: 205 },
    { sku: 'DB-GID', name: 'GI Drainage', line: 'desbio', dose: 'Homeopathic liquid', price: 29, cost: 16.5, supplier: 'desbio', goals: { digestion: 2, detox: 1 }, tags: ['vegan'], hue: 195 },
    { sku: 'DB-TXA', name: 'ToxAffix', line: 'desbio', dose: 'Charcoal and apple pectin capsules', price: 44, cost: 24, supplier: 'desbio', goals: { digestion: 1, detox: 1 }, tags: ['vegan'], hue: 215 }
  ];

  /* access: free with an account, or a paid short course ($59-$119 each,
     included for Premium Course members). */
  var VIDEOS = [
    { id: 'v1', title: '10-Minute Morning Mobility', mins: 10, goals: ['joints', 'energy'], views: 4210, hue: 32, access: 'free' },
    { id: 'v2', title: 'Box Breathing for Stress', mins: 6, goals: ['stress', 'focus'], views: 6890, hue: 190, access: 'free' },
    { id: 'v3', title: 'Wind-Down Yoga for Sleep', mins: 18, goals: ['sleep', 'stress'], views: 5320, hue: 250, access: 'free' },
    { id: 'v4', title: 'Gut Health 101', mins: 14, goals: ['digestion', 'immunity'], views: 3150, hue: 120, access: 'free' },
    { id: 'v9', title: 'Understanding Your Remedies', mins: 9, goals: ['immunity', 'detox'], views: 2410, hue: 55, access: 'free' },
    { id: 'v11', title: 'Sleep Reset', mins: 52, lessons: 4, price: 79, goals: ['sleep'], views: 1380, hue: 238, access: 'paid' },
    { id: 'v12', title: 'Stress & Adrenals Deep Dive', mins: 74, lessons: 5, price: 99, goals: ['stress', 'energy'], views: 1612, hue: 30, access: 'paid' },
    { id: 'v13', title: 'Detox Done Gently', mins: 61, lessons: 4, price: 89, goals: ['detox', 'digestion'], views: 990, hue: 160, access: 'paid' },
    { id: 'v14', title: 'Energetics 101 with Deana', mins: 96, lessons: 6, price: 119, goals: ['energy', 'focus', 'immunity'], views: 1204, hue: 280, access: 'paid' },
    { id: 'v15', title: 'Gut Reset in 14 Days', mins: 70, lessons: 5, price: 99, goals: ['digestion', 'immunity'], views: 1105, hue: 110, access: 'paid' },
    { id: 'v7', title: 'Guided Meditation Series', mins: 40, lessons: 3, price: 59, goals: ['sleep', 'stress'], views: 7015, hue: 290, access: 'paid' },
    { id: 'v8', title: 'Strength Basics for Bone Health', mins: 44, lessons: 3, price: 69, goals: ['joints', 'energy'], views: 1960, hue: 350, access: 'paid' },
    { id: 'v10', title: 'Supporting Your Drainage Pathways', mins: 33, lessons: 3, price: 59, goals: ['detox', 'digestion'], views: 1720, hue: 170, access: 'paid' },
    { id: 'v6', title: 'Building a Balanced Plate', mins: 12, goals: ['energy', 'digestion'], views: 3940, hue: 80, access: 'free' },
    { id: 'v5', title: 'Desk Posture Reset', mins: 8, goals: ['joints', 'focus'], views: 2780, hue: 15, access: 'free' }
  ];

  /* One-to-one sessions with a Certified Practitioner. */
  var SESSION = { base: 99, mins: 30, upgrade: 49, upgradeMins: 60, premiumOff: 0.25 };
  var CERTIFIED = [
    { id: 'p1', name: 'Deana', role: 'Certified Energetics Practitioner', hue: 280 },
    { id: 'p2', name: 'Anna Moore', role: 'Certified Practitioner', hue: 160 },
    { id: 'p3', name: 'Lena Ortiz', role: 'Certified Wellness Practitioner', hue: 30 }
  ];
  function sessionPrice(long, c) {
    var p = SESSION.base + (long ? SESSION.upgrade : 0);
    return c && c.member ? Math.round(p * (1 - SESSION.premiumOff) * 100) / 100 : p;
  }

  /* Appointment types. The first four are what clients and the team book;
     the rest are kept only for older records. */
  var SERVICES = [
    { id: 'review60', label: '1 Hour Practitioner Review', mins: 60, price: 165, desc: 'One-to-one with a Certified Practitioner by Zoom, going over your report, protocol and progress.' },
    { id: 'recorded', label: 'Recorded Review', mins: 30, price: 500, recorded: true, desc: 'Your practitioner reviews your report and protocol and records a video walkthrough for you to watch any time.' },
    { id: 'pkg1', label: '12 Week Package 1/2', mins: 75, price: 0, pkg: 'twelve', desc: 'Your first 12 Week Package session: bioresonance scan and planning.' },
    { id: 'pkg2', label: '12 Week Package 2/2', mins: 60, price: 0, pkg: 'twelve', desc: 'Your second 12 Week Package session: retest and next steps.' },
    { id: 'initial', label: 'Initial Wellness Consultation', mins: 60, price: 145, legacy: true },
    { id: 'followup', label: 'Follow-up Coaching', mins: 30, price: 75 },
    { id: 'energetics', label: 'Energetics Assessment', mins: 75, price: 0 },
    { id: 'breathwork', label: 'Group Breathwork Workshop', mins: 75, price: 35 },
    { id: 'corporate', label: 'Retreat Partner Session', mins: 60, price: 0 },
    { id: 'session30', label: 'Practitioner session (30 min)', mins: 30, price: 99 },
    { id: 'session60', label: 'Practitioner session (1 hour)', mins: 60, price: 148 }
  ];

  /* What clients buy. Each package can include appointment credits. */
  var PACKAGES = [
    { id: 'recorded', name: 'Recorded Review', price: 500, credits: { recorded: 1 }, active: true,
      desc: 'A practitioner reviews your latest report and protocol and records a personal video walkthrough.',
      includes: ['1 Recorded Review appointment', 'Video walkthrough in your portal within 3 business days', 'Follow-up questions by message'] },
    { id: 'scan', name: 'Bioresonance Scan', price: 350, credits: { recorded: 1 }, active: true,
      desc: 'An in-house bioresonance scan, your Resonance Map report, and a recorded review of the results.',
      includes: ['In-house bioresonance scan', 'Resonance Map client report', '1 Recorded Review of your results'] },
    { id: 'twelve', name: '12 Week Package', price: 1200, credits: { pkg1: 1, pkg2: 1 }, active: true,
      desc: 'Twelve weeks with a practitioner, built around your scan.',
      includes: ['12 Week Package 1/2: scan and planning', '12 Week Package 2/2: retest and next steps', 'Your personal protocol with reminders'] }
  ];

  var PLANS = { free: 'Free account', newsletter: 'Newsletter', monthly: 'Monthly Coaching', vip: 'VIP Concierge', program: 'Premium Course' };

  /* The flagship offer. Fictional practitioners; real structure. */
  var PROGRAM = {
    name: 'WPMP Course',
    sub: 'Premium 3-Month Course',
    price: 6995,
    plan: { n: 3, each: 2395 },
    weeks: 12,
    discount: 0.2,
    includes: [
      ['Your personal protocol', 'The remedies and supplements chosen for you, with a daily schedule and reminders in your app. Product recommendations are part of the course.'],
      ['Custom energetics assessment & work', 'A one-to-one energetic assessment at the start and a retest at week 11, with a protocol built from your results.'],
      ['Additional testing', 'At-home test kits chosen by your practitioner, with results reviewed with you live.'],
      ['A 12-week course built around you', 'Weekly video modules unlocked one at a time, with a track chosen from your intake. Watch online or download.'],
      ['Weekly live Zoom with practitioners', 'Thursday group sessions for questions, coaching and accountability. Every session is recorded.'],
      ['20% off every supplement', 'Member pricing across the whole shop for the length of the course, applied automatically.'],
      ['Free shipping on every order', 'No minimum, for the length of the course.'],
      ['Every short course included', 'All short courses free while you are enrolled (normally $59 to $119 each), yours to download.'],
      ['25% off one-to-one sessions', 'Extra time with a Certified Practitioner from $74.25 instead of $99.']
    ]
  };
  var PRACTITIONERS = [
    { name: 'Maya Brooks', role: 'Founder, wellness coach' },
    { name: 'Deana', role: 'Energetics practitioner' },
    { name: 'Anna Moore', role: 'Certified Practitioner' }
  ];
  var MODULES = [
    { w: 1, title: 'Foundations and your energetic baseline', vids: 4, mins: 48 },
    { w: 2, title: 'Reading your assessment and test results', vids: 3, mins: 41 },
    { w: 3, title: 'Opening your drainage pathways', vids: 4, mins: 52 },
    { w: 4, title: 'Nutrition that fits your body', vids: 5, mins: 63 },
    { w: 5, title: 'Your personal track', vids: 4, mins: 50, track: true },
    { w: 6, title: 'Stress resilience and the nervous system', vids: 3, mins: 39 },
    { w: 7, title: 'Gut, immunity and terrain', vids: 4, mins: 55 },
    { w: 8, title: 'Movement for energy', vids: 3, mins: 44 },
    { w: 9, title: 'Emotional energetics', vids: 4, mins: 47 },
    { w: 10, title: 'Your environment and toxic load', vids: 3, mins: 38 },
    { w: 11, title: 'Retest and protocol adjustments', vids: 2, mins: 29 },
    { w: 12, title: 'Your plan for the next year', vids: 3, mins: 36 }
  ];
  var TRACKS = { sleep: 'Deep Sleep track', stress: 'Calm Nervous System track', energy: 'Energy Rebuild track', digestion: 'Gut Reset track', detox: 'Gentle Detox track' };
  /** What this person may do with a video: watch, buy, or watch as a member. */
  function videoAccess(v, c) {
    if (v.access === 'free') return 'free';
    if (c && c.member) return 'included';
    if (c && c.videosOwned && c.videosOwned.indexOf(v.id) >= 0) return 'owned';
    return 'locked';
  }
  function trackFor(goals) {
    for (var i = 0; i < goals.length; i++) if (TRACKS[goals[i]]) return TRACKS[goals[i]];
    return 'Whole-Body Balance track';
  }

  /* ------------------------------------------------------------------ */
  /* Recommendation engine                                               */
  /* ------------------------------------------------------------------ */

  /**
   * A profile in, a ranked plan out, with the reason for every pick.
   * Demonstration rules: score by goal overlap, drop anything the diet or an
   * allergy rules out, and flag anything a practitioner should look at first.
   */
  function recommend(p) {
    var goals = p.goals || [];
    var diet = p.diet || 'omnivore';
    var allergies = p.allergies || [];
    var flags = [];
    if (p.pregnant) flags.push('pregnant');
    if (p.bloodthinner) flags.push('bloodthinner');
    if (p.thyroid) flags.push('thyroid');

    var picks = [];
    PRODUCTS.forEach(function (prod) {
      if ((diet === 'vegan' || diet === 'vegetarian') && prod.tags.indexOf('fish') >= 0) return;
      if (allergies.indexOf('fish') >= 0 && prod.tags.indexOf('fish') >= 0) return;
      var score = 0, why = [];
      goals.forEach(function (g) {
        if (prod.goals[g]) {
          score += prod.goals[g];
          why.push('Paired with ' + goalLabel(g).toLowerCase());
        }
      });
      if (!score) return;
      /* House supplier first: a small nudge, never enough to beat a better match. */
      if (prod.supplier === 'physica') score += 0.5;
      var cautions = (prod.caution || []).filter(function (c) { return flags.indexOf(c) >= 0; });
      if (p.pregnant) cautions.push('pregnant');
      picks.push({ product: prod, score: score, why: why, review: cautions.length > 0, cautions: cautions });
    });
    picks.sort(function (a, b) { return b.score - a.score || a.product.price - b.product.price; });
    picks = picks.slice(0, 4);

    var vids = VIDEOS.map(function (v) {
      var s = v.goals.filter(function (g) { return goals.indexOf(g) >= 0; }).length;
      return { video: v, score: s };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score || b.video.views - a.video.views; })
      .slice(0, 3).map(function (x) { return x.video; });

    var service = goals.length >= 3 || flags.length ? SERVICES[0] : SERVICES[1];
    var monthly = picks.reduce(function (t, x) { return t + x.product.price; }, 0);
    return {
      picks: picks,
      videos: vids,
      service: service,
      monthly: monthly,
      needsReview: flags.length > 0 || picks.some(function (x) { return x.review; }),
      flags: flags
    };
  }

  function goalLabel(id) {
    for (var i = 0; i < GOALS.length; i++) if (GOALS[i].id === id) return GOALS[i].label;
    return id;
  }
  function product(sku) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].sku === sku) return PRODUCTS[i];
    return null;
  }
  function video(id) {
    for (var i = 0; i < VIDEOS.length; i++) if (VIDEOS[i].id === id) return VIDEOS[i];
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Seed                                                                */
  /* ------------------------------------------------------------------ */

  function seed() {
    var people = [
      ['c1', 'Jane Smith', ['stress', 'sleep', 'focus'], 'vegetarian', 'vip', -142, 1186, true],
      ['c2', 'Mike Brown', ['joints', 'energy'], 'omnivore', 'monthly', -96, 642, true],
      ['c3', 'Lisa Garcia', ['digestion', 'detox'], 'vegan', 'monthly', -63, 418, true],
      ['c4', 'John Miller', ['energy', 'focus'], 'omnivore', 'newsletter', -40, 96, false],
      ['c5', 'Sarah Davis', ['sleep'], 'omnivore', 'newsletter', -21, 38, false],
      ['c6', 'Tom Wilson', ['immunity', 'energy'], 'omnivore', 'monthly', -188, 904, true],
      ['c7', 'Amy Clark', ['detox', 'digestion', 'stress'], 'pescatarian', 'vip', -230, 1544, true],
      ['c8', 'Mary Lewis', ['joints'], 'omnivore', 'monthly', -75, 377, true],
      ['c9', 'David Hall', ['focus', 'stress'], 'vegan', 'newsletter', -12, 0, false],
      ['c10', 'Emily Young', ['immunity'], 'omnivore', 'newsletter', -5, 21, false],
      ['c11', 'Mark Johnson', ['energy', 'joints', 'sleep'], 'omnivore', 'monthly', -54, 288, false],
      ['c12', 'Karen White', ['stress', 'sleep'], 'vegetarian', 'vip', -301, 2210, true],
      ['c13', 'Chris Lee', ['digestion'], 'omnivore', 'newsletter', -3, 0, false],
      ['c14', 'Laura King', ['detox', 'energy'], 'vegan', 'monthly', -33, 214, true]
    ];
    var clients = people.map(function (r, i) {
      var first = r[1].split(' ')[0].toLowerCase();
      var last = r[1].split(' ')[1].toLowerCase();
      var c = {
        id: r[0], name: r[1], email: first + '.' + last + '@example.com',
        phone: '(801) 555-01' + String(10 + i), goals: r[2], diet: r[3], plan: r[4],
        joined: iso(r[5]), ltv: r[6], autoship: r[7], allergies: i === 6 ? ['shellfish'] : [],
        pregnant: false, bloodthinner: i === 7, thyroid: false,
        consent: i !== 12 && i !== 9, intake: i !== 12 && i !== 9 && i !== 8,
        videos: {}, notes: []
      };
      c.plan_items = recommend(c).picks.map(function (x) { return x.product.sku; });
      recommend(c).videos.forEach(function (v, k) { c.videos[v.id] = [100, 60, 0][k] || 0; });
      return c;
    });
    clients[0].notes.push({ at: iso(-9), text: 'Sleep improving since magnesium. Keep theanine before presentations.' });
    clients[7].notes.push({ at: iso(-20), text: 'On warfarin. Fish oil and D3 held until her doctor signs off.' });

    var bookings = [
      { id: 'b1', service: 'review60', date: iso(0), time: '09:30', guests: ['c9'], where: 'Video call', with: 'Lena Ortiz' },
      { id: 'b2', service: 'recorded', date: iso(0), time: '13:00', guests: ['c2'], where: 'Recorded', with: 'Deana' },
      { id: 'b3', service: 'review60', date: iso(3), time: '10:00', guests: ['c1'], where: 'Video call', with: 'Deana', paid: 165 },
      { id: 'b4', service: 'pkg1', date: iso(2), time: '10:00', guests: ['c3'], where: 'Studio', with: 'Deana' },
      { id: 'b5', service: 'review60', date: iso(4), time: '12:00', guests: ['c11'], where: 'Video call', with: 'Anna Moore' },
      { id: 'b6', service: 'review60', date: iso(6), time: '16:30', guests: ['c7'], where: 'Video call', with: 'Deana' },
      { id: 'b7', service: 'pkg1', date: iso(8), time: '11:00', guests: ['c14'], where: 'Studio', with: 'Deana' },
      { id: 'b8', service: 'recorded', date: iso(11), time: '09:00', guests: ['c6'], where: 'Recorded', with: 'Anna Moore' },
      { id: 'b9', service: 'pkg2', date: iso(15), time: '15:00', guests: ['c12'], where: 'Studio', with: 'Deana' },
      { id: 'b10', service: 'review60', date: iso(19), time: '14:00', guests: ['c13'], where: 'Video call', with: 'Lena Ortiz' },
      { id: 'b11', service: 'review60', date: iso(-3), time: '10:00', guests: ['c1'], where: 'Video call', with: 'Deana' },
      { id: 'b12', service: 'review60', date: iso(-6), time: '15:00', guests: ['c4'], where: 'Video call', with: 'Anna Moore' },
      { id: 'b13', service: 'review60', date: iso(3), time: '11:00', guests: ['c2'], where: 'Video call', with: 'Lena Ortiz', paid: 165 },
      { id: 'b14', service: 'recorded', date: iso(5), time: '15:30', guests: ['c5'], where: 'Recorded', with: 'Deana', paid: 500 },
      { id: 'b15', service: 'pkg2', date: iso(14), time: '10:00', guests: ['c1'], where: 'Studio', with: 'Deana' },
      { id: 'b16', service: 'pkg1', date: iso(-58), time: '10:00', guests: ['c1'], where: 'Studio', with: 'Deana' },
      { id: 'b17', service: 'recorded', date: iso(-30), time: '10:00', guests: ['c11'], where: 'Recorded', with: 'Anna Moore', video: true }
    ];


    var orders = [
      { id: 'EG-10482', client: 'c12', at: iso(-6), items: [['PE-RLX', 1], ['PE-ADM', 1], ['EG-MAG', 1]], stage: 4, tracking: '1Z84F2A10398', sub: true, discount: 0.2, approvedBy: 'Maya Brooks' },
      { id: 'EG-10483', client: 'c7', at: iso(-5), items: [['PE-DRN', 1], ['EG-PRO', 1]], stage: 4, tracking: '9400 1112 0274', sub: true, discount: 0.2, approvedBy: 'Maya Brooks' },
      { id: 'EG-10484', client: 'c2', at: iso(-4), items: [['PE-INF', 1], ['EG-OM3', 1]], stage: 3, tracking: '1Z84F2A10411', sub: true, approvedBy: 'Deana' },
      { id: 'EG-10485', client: 'c4', at: iso(-3), source: 'Shopify', items: [['PE-MET', 1]], stage: 3, tracking: '9400 1112 0298', sub: false, approvedBy: 'Maya Brooks' },
      { id: 'EG-10486', client: 'c14', at: iso(-2), items: [['PE-MTL', 1], ['EG-BCX', 1]], stage: 2, sub: true, discount: 0.2, approvedBy: 'Deana' },
      { id: 'EG-10487', client: 'c6', at: iso(-1), source: 'Shopify', items: [['PE-FLU', 2], ['EG-D3K', 1]], stage: 1, sub: true, approvedBy: 'Maya Brooks' },
      { id: 'EG-10488', client: 'c8', at: iso(-1), items: [['PE-INF', 1], ['EG-D3K', 1]], stage: 0, sub: true },
      { id: 'EG-10489', client: 'c10', at: iso(0), source: 'Shopify', items: [['PE-THY', 1]], stage: 0, sub: false }
    ];

    /* Program members: where each one is in their twelve weeks. */
    var enrollments = [
      { client: 'c12', week: 11, assess: 'Retest booked', testing: 'Results reviewed', plan: 'Delivered', pay: 'Paid in full', zoom: 10 },
      { client: 'c1', week: 9, assess: 'Complete', testing: 'Results reviewed', plan: 'Delivered', pay: 'Paid in full', zoom: 8 },
      { client: 'c7', week: 5, assess: 'Complete', testing: 'Results in', plan: 'Delivered', pay: '2 of 3 paid', zoom: 4 },
      { client: 'c3', week: 2, assess: 'Complete', testing: 'Kit shipped', plan: 'Building', pay: '1 of 3 paid', zoom: 1 },
      { client: 'c14', week: 1, assess: 'Booked ' + iso(8).slice(5).replace('-', '/'), testing: 'Kit ordered', plan: 'After assessment', pay: 'Paid in full', zoom: 0 }
    ].map(function (e) { e.start = iso(-7 * (e.week - 1) - 2); return e; });

    var emails = [
      { at: iso(-1), to: 'c14', kind: 'Order shipped', subject: 'Your Root Cause order is on its way' },
      { at: iso(-1), to: 'c6', kind: 'Refill reminder', subject: 'Running low on Vitamin D3 + K2?' },
      { at: iso(-2), to: 'c9', kind: 'Intake link', subject: 'Before your consultation with Maya' },
      { at: iso(-3), to: 'c1', kind: 'Session notes', subject: 'Your follow-up notes and plan' },
      { at: iso(-4), to: 'c13', kind: 'Intake link', subject: 'Before your breathwork workshop' },
      { at: iso(-6), to: 'c4', kind: 'Recommendations', subject: 'Your personalised wellness plan' }
    ];

    var campaigns = [
      { id: 'n1', subject: 'Five evening habits for deeper sleep', segment: 'sleep', sent: iso(-14), recipients: 312, opens: 0.58, clicks: 0.141, revenue: 2318 },
      { id: 'n2', subject: 'Spring reset: gut health week', segment: 'all', sent: iso(-28), recipients: 1236, opens: 0.47, clicks: 0.088, revenue: 4102 },
      { id: 'n3', subject: 'Members only: new breathwork series', segment: 'coaching', sent: iso(-35), recipients: 64, opens: 0.81, clicks: 0.36, revenue: 980 }
    ];

    var agreements = [
      {
        id: 'q1', title: 'Spring Renewal Retreat: Practitioner Partnership', client: 'Stillwater Retreats',
        contact: 'Leah Brandt, Retreat Director', status: 'Viewed', sent: iso(-2),
        lines: [
          ['Lead practitioner days (4-day retreat)', 4, 1200],
          ['Energetic scan and report for each guest', 24, 95],
          ['Pre-retreat questionnaire and personal plan', 24, 35],
          ['Personal remedy kit for each guest', 24, 72],
          ['30-minute follow-up session after the retreat', 24, 99],
          ['Short course access for guests (3 months)', 24, 25]
        ],
        terms: '50% deposit on signing, balance due 14 days before the retreat. Guests complete the consent and questionnaire at least 10 days before arrival. Remedy kits ship to the venue for arrival day. Cancellations more than 30 days out are refunded less the deposit.'
      },
      {
        id: 'q2', title: 'VIP Concierge Renewal', client: 'Karen White', contact: 'nadia.haddad@example.com',
        status: 'Signed', sent: iso(-11),
        lines: [['VIP Concierge (12 months)', 12, 189], ['Quarterly lab review', 4, 60]],
        terms: 'Billed monthly. Cancel any time with 30 days notice.'
      }
    ];

    enrollments.forEach(function (e) { var c = clients.filter(function (x) { return x.id === e.client; })[0]; c.plan = 'program'; c.member = true; });
    clients.forEach(function (c, i) {
      c.videosOwned = [];
      c.dob = String(1 + (i * 5) % 12).padStart(2, '0') + '/' + String(3 + (i * 7) % 25).padStart(2, '0') + '/' + (1968 + (i * 3) % 30);
      c.address = (120 + i * 37) + ' ' + ['Juniper Way', 'Canyon Rd', 'Sage Ave', 'Aspen Ct'][i % 4] + ', ' + ['Salt Lake City', 'Park City', 'Sandy', 'Provo'][i % 4] + ', UT';
      c.practitioner = ['Deana', 'Anna Moore', 'Lena Ortiz'][i % 3];
      c.card = ['Visa', 'Mastercard', 'Amex'][i % 3] + ' \u2022\u2022\u2022\u2022 ' + (4242 + i * 111) % 10000;
      c.packs = []; c.docs = [];
    });
    /* Packages each client has bought; credits are used as appointments are booked. */
    clients[1].packs = [{ pkg: 'scan', bought: iso(-40), paid: 350, used: { recorded: 1 } }];
    clients[10].packs = [{ pkg: 'recorded', bought: iso(-42), paid: 500, used: { recorded: 1 } }];
    enrollments.forEach(function (e) {
      var c = clients.filter(function (x) { return x.id === e.client; })[0];
      var has = function (t) { return bookings.some(function (b) { return b.service === t && b.guests[0] === c.id; }); };
      var used = {}; if (has('pkg1') || /Complete|Retest/.test(e.assess)) used.pkg1 = 1; if (has('pkg2')) used.pkg2 = 1;
      c.packs.unshift({ pkg: 'twelve', bought: e.start, paid: 1200, used: used });
    });
    bookings.forEach(function (b) { if (b.service === 'pkg1' || b.service === 'pkg2') b.pkg = 'twelve'; if (b.service === 'recorded' && (b.guests[0] === 'c11' || b.guests[0] === 'c2')) b.pkg = b.guests[0] === 'c11' ? 'recorded' : 'scan'; });
    clients[0].docs = [{ name: 'Blood panel (from her doctor).pdf', at: iso(-50), kind: 'Upload' }];
    clients[4].videosOwned = ['v11'];
    /* Auto-ship credit already earned: $5 a refill, spent on sessions and courses. */
    clients.forEach(function (c, i) { if (c.autoship) c.credit = [15, 10, 5, 20][i % 4]; });
    clients[1].videosOwned = ['v8', 'v12'];
    clients[9].videosOwned = ['v14'];
    enrollments[3].payIssue = 'Card declined for payment 2 of 3';

    /* Energetic scans done in the clinic. Jane's is published, Amy's
       exports are in and waiting for a practitioner, Laura's is booked. */
    var scans = [
      { id: 's1', client: 'c1', date: iso(-58), status: 'published', by: 'Deana', data: null },
      { id: 's2', client: 'c7', date: iso(-1), status: 'uploaded', data: null },
      { id: 's3', client: 'c12', date: iso(-70), status: 'published', by: 'Deana', data: null },
      { id: 's4', client: 'c14', date: iso(8), status: 'booked', data: null },
      { id: 's5', client: 'c11', date: iso(-40), status: 'published', by: 'Anna Moore', data: null }
    ];
    scans.forEach(function (sc) { if (sc.status === 'published') sc.data = sampleScan(clients.filter(function (x) { return x.id === sc.client; })[0]); });

    /* Protocols built from those reports: what to take, how much, and when. */
    var protocols = scans.filter(function (sc) { return sc.status === 'published'; }).map(function (sc, i) {
      var c = clients.filter(function (x) { return x.id === sc.client; })[0];
      var items = protoSuggestions(c, sc).filter(function (x) { return x.from === 'report'; }).slice(0, 5).map(function (x) { return protoItem(x.sku, x.dose, x.weeks); });
      return { id: 'p' + (i + 1), client: c.id, status: 'active', created: iso(-55 + i * 10), start: iso(-54 + i * 10), by: 'Deana', items: items,
        note: 'Start with the morning remedies for the first three days, then add the evening ones. Drink plenty of water while the drainage remedies are working.' };
    });

    /* Stock for the clinic, gathered per supplier and ordered in one go once
       it is worth it (Physica ships free from $500). Each line remembers
       which client it is for, so the box reconciles when it arrives. */
    var batches = {
      physica: [['PE-ADM', 2, 'c12'], ['PE-RLX', 1, 'c1'], ['PE-DRN', 3, 'c7'], ['PE-LIV', 2, 'c3'], ['PE-PIN', 2, 'c1'], ['PE-MTL', 1, 'c14'], ['PE-SOL', 2, 'c12'], ['PE-FLU', 4, ''], ['PE-THY', 2, 'c6'], ['PE-INF', 2, 'c8']],
      biotics: [['EG-D3K', 3, 'c6'], ['EG-MAG', 2, 'c12']],
      desbio: [['DB-GID', 2, 'c3'], ['DB-CDK', 1, 'c7']]
    };

    /* Questions clients sent from the app. Anyone on the team can answer. */
    var inbox = [
      { id: 'm1', from: 'c3', at: iso(0), text: 'Can I take Drainage Milieu with my morning coffee, or should I wait?', done: false },
      { id: 'm2', from: 'c5', at: iso(-1), text: 'I bought the Sleep Reset course. Is there a workbook to go with it?', done: false },
      { id: 'm3', from: 'c6', at: iso(-2), text: 'Please skip my next refill, I am travelling until the 10th.', done: true }
    ];

    /* Conversations between clients and their practitioner, from the app. */
    var messages = [
      ['c1', 'client', 'Jane Smith', -3, '08:12', 'Is it okay to take the Adrenal Milieu drops in water, or straight under the tongue?', true],
      ['c1', 'team', 'Deana', -3, '10:40', 'Either works. Under the tongue is best, but a little water is fine if that is easier to stick with.', true],
      ['c1', 'client', 'Jane Smith', 0, '07:55', 'Thank you! Sleeping much better this week. Should I keep the bedtime dose the same?', false],
      ['c7', 'team', 'Deana', -1, '16:20', 'Hi Amy, your scan went well. I will have your report and protocol to you in a day or two.', true],
      ['c7', 'client', 'Amy Clark', -1, '18:02', 'Great, thank you. I have a work trip next week. Will that be a problem with timing?', false],
      ['c3', 'client', 'Lisa Garcia', 0, '09:30', 'Can I take Drainage Milieu with my morning coffee, or should I wait?', false],
      ['c5', 'client', 'Sarah Davis', -2, '12:05', 'Is there a workbook to go with the Sleep Reset course?', true],
      ['c5', 'team', 'Anna Moore', -2, '14:30', 'Yes, it is under lesson 1 as a download. Let me know if you cannot find it.', true]
    ].map(function (m, i) { return { id: 'msg' + i, client: m[0], from: m[1], by: m[2], at: iso(m[3]), time: m[4], text: m[5], read: m[6] }; });

    /* Waiver and form templates, built in Waivers & Forms. Each client's
       completed ones are kept on the client as c.forms[id] = date signed. */
    var F = function (id, type, label, req, options) { return { id: id, type: type, label: label, req: !!req, options: options || [] }; };
    var forms = [
      { id: 'f1', title: 'Wellness consent', kind: 'Waiver', who: 'everyone', updated: iso(-40),
        body: 'I understand that Root Cause Clinic offers education and wellness support, not medical diagnosis or treatment. Energetic scans measure resonance, not disease. I will keep seeing my own doctor for medical care and tell my practitioner about any medication I take.',
        fields: [F('a1', 'text', 'Full name', true), F('a2', 'date', 'Date of birth', true), F('a3', 'check', 'I have read and agree to the above', true), F('a4', 'sign', 'Signature', true)] },
      { id: 'f2', title: 'Intake questionnaire', kind: 'Form', who: 'everyone', updated: iso(-40), body: '',
        fields: [F('b1', 'choice', 'What would you most like help with?', true, ['Sleep', 'Stress', 'Digestion', 'Energy', 'Immunity', 'Hormones']), F('b2', 'long', 'Medications and supplements you take now', false), F('b3', 'text', 'Allergies', false), F('b4', 'yesno', 'Are you pregnant or trying to conceive?', true), F('b5', 'yesno', 'Do you take a blood thinner?', true), F('b6', 'yesno', 'Do you have a thyroid condition?', true)] },
      { id: 'f3', title: 'Premium Course agreement', kind: 'Waiver', who: 'premium', updated: iso(-30),
        body: 'The Premium Course runs for 12 weeks and includes an energetic assessment and retest, at-home testing chosen by your practitioner, weekly live Zoom sessions and your personal protocol. Payment plans are billed every 30 days. You may cancel within 7 days of enrolling for a full refund.',
        fields: [F('c1', 'choice', 'Payment', true, ['Paid in full', '3 monthly payments']), F('c2', 'check', 'I agree to the course terms', true), F('c3', 'sign', 'Signature', true)] },
      { id: 'f4', title: 'Energetic scan waiver', kind: 'Waiver', who: 'scan', updated: iso(-20),
        body: 'The energetic scan is non-invasive and is used to guide wellness recommendations. It is not a medical test. Please do not have a scan if you have a pacemaker or other implanted electronic device.',
        fields: [F('d1', 'yesno', 'Do you have a pacemaker or implanted electronic device?', true), F('d2', 'check', 'I understand the scan is not a medical test', true), F('d3', 'sign', 'Signature', true)] },
      { id: 'f5', title: 'Photo and testimonial release', kind: 'Waiver', who: 'optional', updated: iso(-90),
        body: 'I give Root Cause Clinic permission to share my testimonial and any photos I provide, using my first name only.',
        fields: [F('e1', 'yesno', 'May we use your photo?', false), F('e2', 'sign', 'Signature', true)] }
    ];
    clients.forEach(function (c) {
      c.forms = {};
      if (c.consent) c.forms.f1 = c.joined;
      if (c.intake) c.forms.f2 = c.joined;
      if (c.member) c.forms.f3 = c.joined;
    });
    scans.forEach(function (sc) { if (sc.status === 'published') clients.filter(function (x) { return x.id === sc.client; })[0].forms.f4 = sc.date; });

    /* Every video booking gets its own Zoom meeting, created automatically. */
    bookings.forEach(function (b, i) { if (b.where === 'Video call') b.zoom = String(81000000000 + (i + 3) * 2654435761 % 8999999999).replace(/(\d{3})(\d{4})(\d+)/, '$1 $2 $3'); });
    var bookcfg = {
      zoom: true, remind24: true, remind1: true, sms: false, gcal: true, buffer: 15, notice: 12, window: 30,
      hours: { p1: ['09:00', '17:00'], p2: ['10:00', '18:00'], p3: ['08:00', '15:00'] },
      days: { p1: [1, 2, 3, 4, 5], p2: [1, 3, 5], p3: [2, 3, 4, 6] },
      types: [{ id: 'review60', on: true }, { id: 'recorded', on: true }, { id: 'pkg1', on: true }, { id: 'pkg2', on: true }]
    };

    /* What the system did on its own, newest first. */
    var activity = [
      [0, '07:00', 'Week 12 unlocked for Karen White. Email sent.'],
      [0, '06:45', 'Zoom reminder sent to 5 program members for Thursday 6:00pm.'],
      [0, '06:30', 'Refill EG-10488 created for Mary Lewis. Held for approval (screening flag).'],
      [-1, '21:14', 'Sarah Davis bought the Sleep Reset short course ($79). Access granted, receipt sent.'],
      [-1, '18:20', 'Mike Brown booked a 1-hour session with Lena Ortiz ($148). Calendar invite and Zoom link sent.'],
      [-1, '17:02', 'Tracking 1Z84F2A10411 emailed to Mike Brown.'],
      [-1, '15:40', 'Payment 2 of 3 failed for Lisa Garcia. Card-update link sent. Retry in 3 days.'],
      [-1, '11:08', 'Emily Young finished the free questionnaire. Plan emailed, added to Immunity newsletter.'],
      [-2, '19:25', 'Laura King enrolled in WPMP Course. Welcome pack, Zoom invites and week 1 sent.'],
      [-2, '09:12', 'Reorder reminder sent to 6 auto-ship clients.'],
      [-3, '14:30', 'Emily Young bought Energetics 101 with Deana ($119). Access granted.']
    ].map(function (a) { return { at: iso(a[0]), time: a[1], text: a[2] }; });

    return {
      v: 18, packages: JSON.parse(JSON.stringify(PACKAGES)), forms: forms, bookcfg: bookcfg, messages: messages, clients: clients, bookings: bookings, orders: orders, emails: emails,
      campaigns: campaigns, agreements: agreements, enrollments: enrollments, inbox: inbox, activity: activity, scans: scans, protocols: protocols, batches: batches, pos: [], nextOrder: 10490, nextClient: 15,
      revenue: [3120, 3480, 3290, 3910, 4260, 4105, 4870, 5340]
    };
  }

  var STAGES = ['Awaiting approval', 'Sent to supplier', 'Supplier confirmed', 'Shipped', 'Delivered'];

  /** Which supplier a line goes to, and why. Shown before anyone approves. */
  function routeLine(sku) {
    var p = product(sku);
    return { supplier: p.supplier, reason: p.supplier === 'physica' ? 'Primary supplier' : 'Nutritional, from backup supplier' };
  }


  /* ------------------------------------------------------------------ */
  /* Energetic scans                                                     */
  /* ------------------------------------------------------------------ */

  /* Same shape as the clinic's report builder works with: four exports per
     scan (RR organ readings, RC root-cause findings, SS symptom support, IMB
     imbalance markers). Everything here is invented sample content. */
  var SCAN_SLOTS = [
    { code: 'RR', label: 'Baseline / Resonance Report', hint: 'Organ system dials and write-ups' },
    { code: 'RC', label: 'Root Cause Analysis Scan', hint: 'Primary findings, flagged RC' },
    { code: 'SS', label: 'Symptom Support Scan', hint: 'Frequency and symptom-support items' },
    { code: 'IMB', label: 'Imbalance Scan', hint: 'Markers with dilution notes' }
  ];
  var SCAN_SECTIONS = ['Generational Echoes', 'Toxins & Interferences', 'Resonating Maladies', 'Environmental Stressors',
    'Hormone Markers', 'Neurological Markers', 'Amino Acid Markers', 'Enzyme Markers', 'Mineral Markers', 'Vitamin Markers',
    'Dental Markers', 'Vertebral Markers', 'Cell Health Markers', 'Inflammation Markers', 'Chinese Medicine Markers',
    'Meridians / Vortices', 'Supportive Lifestyle Changes', 'Beneficial Positive Thoughts', 'Botanical Support', 'Recommended Remedies'];
  /* The trailing letters of a dilution code set the note, on IMB hormone,
     mineral and amino acid markers only - the builder's own rule. */
  var DIL_NOTES = { V: 'May be low', X: 'May be low', C: 'May fluctuate', K: 'May fluctuate', M: 'May be high', LM: 'May be high', DM: 'May be high or unable to absorb', CM: 'May be high or unable to absorb', MM: 'May be high or unable to absorb' };
  var DIL_SERIES = ['V', 'X', 'K', 'C', 'M', 'LM', 'DM', 'CM', 'MM'];
  function dilNote(doc, category, dil) {
    if (doc !== 'IMB' || !/hormone|mineral|amino/i.test(category)) return '';
    var m = String(dil).match(/([A-Za-z]+)\s*$/);
    return m ? DIL_NOTES[m[1].toUpperCase()] || '' : '';
  }
  /* RC before SS before IMB; then up the V, X, K, C, M ladder; then by number. */
  function potencyKey(it) {
    var m = String(it.dil).match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)$/);
    var doc = { RC: 0, SS: 1, IMB: 2 }[it.doc];
    if (!m) return [doc, 99, 1e9];
    var i = DIL_SERIES.indexOf(m[2].toUpperCase());
    return [doc, i < 0 ? 98 : i, parseFloat(m[1])];
  }
  function comparePotency(a, b) {
    var ka = potencyKey(a), kb = potencyKey(b);
    for (var i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  }
  var CLAIM_RE = /\b(cures?|cured|treats?|prevents?|eliminat\w+|heals?|reverses?)\b(?!\s*T3)/gi;
  function claimWords(t) { var m = String(t || '').match(CLAIM_RE); return m ? m.map(function (x) { return x.toLowerCase(); }).filter(function (x, i, a) { return a.indexOf(x) === i; }) : []; }

  var ORGANS = [
    ['Adrenal', 72, 'The adrenal glands sit above the kidneys and are closely tied to how the body responds to pressure and demand.', 'Symptoms may include: an afternoon energy dip, feeling wired at night, salt cravings.', 'Emotional aspect: carrying responsibility for everyone else.'],
    ['Liver', 66, 'The liver is the body’s main processing plant, involved in filtering, storage and hundreds of daily tasks.', 'Symptoms may include: waking between 1 and 3am, sluggish mornings.', 'Emotional aspect: frustration that has nowhere to go.'],
    ['Small Intestine', 61, 'Most nutrients are absorbed in the small intestine, so its resonance often shows up alongside mineral and vitamin markers.', 'Symptoms may include: bloating after meals, irregular digestion.', ''],
    ['Lymphatic', 58, 'The lymphatic system carries fluid and waste away from tissues and relies on movement to keep flowing.', 'Symptoms may include: puffiness in the morning, a heavy feeling in the legs.', ''],
    ['Kidney', 52, 'The kidneys balance fluids and minerals. A reading in this range suggests energy is flowing in balance.', '', 'Emotional aspect: a steady sense of safety.'],
    ['Heart', 49, 'The heart’s resonance sits in the balanced range on this scan.', '', ''],
    ['Thyroid', 38, 'The thyroid helps set the body’s pace. A lower reading here suggests energy flow is reduced rather than overactive.', 'Symptoms may include: feeling cold, slow starts to the day.', 'Emotional aspect: holding back what you want to say.'],
    ['Pineal', 34, 'The pineal gland is associated with the body’s day and night rhythm.', 'Symptoms may include: trouble winding down, light sleep.', '']
  ];
  /* doc, category, item, code, dilution, quantity, duration, description, section, status */
  var FINDINGS = [
    ['RC', 'Drainage Tonifiers', 'Adrenal Milieu', 'ADM', '11V', '8 Drops', '4 Weeks', 'A drainage tonifier selected to support the adrenal pathway during this phase of your plan.', 'Recommended Remedies', 'stressed'],
    ['RC', 'Sarcodes', 'Pineal Code', 'PIN', '15C', '6 Drops', '3 Weeks', 'Chosen to support the day and night rhythm the scan highlighted.', 'Recommended Remedies', 'weakened'],
    ['RC', 'Drainage Tonifiers', 'Liver Milieu', 'LIV', '30C', '8 Drops', '4 Weeks', 'Supports the liver pathway, the second-highest reading on your scan.', 'Recommended Remedies', 'stressed'],
    ['RC', 'Detoxifier Homaccords', 'Metal-Tox', 'MTX', '8M', '5 Drops', '6 Weeks', 'Paired with the metal signature found in the Toxins & Interferences section.', 'Recommended Remedies', 'stressed'],
    ['RC', 'Chemical Filter', 'Heavy Metal Signature', 'HM2', '200C', '5 Drops', '3 Weeks', 'An energetic signature associated with metal exposure. It is addressed through the remedy plan.', 'Toxins & Interferences', 'stressed'],
    ['RC', 'Emotional Filter', 'Unresolved Grief', 'EF7', '30C', '5 Drops', '3 Weeks', 'An emotional pattern the scan links to an earlier period of life. Worth exploring in your coaching sessions.', 'Generational Echoes', 'weakened'],
    ['RC', 'Electromagnetic', 'Wi-Fi Exposure', 'EM3', '12X', '5 Drops', '3 Weeks', 'Consider switching the router off overnight and keeping the phone out of the bedroom.', 'Environmental Stressors', 'weakened'],
    ['SS', 'Drainage Tonifiers', 'Drainage Milieu', 'DRN', '12X', '8 Drops', '4 Weeks', 'A gentle starting point that supports the body’s natural drainage.', 'Recommended Remedies', 'weakened'],
    ['SS', 'Drainage Tonifiers', 'Relax Milieu', 'RLX', '20C', '6 Drops', '4 Weeks', 'Selected for the wind-down and sleep pattern in your symptom scan.', 'Recommended Remedies', 'weakened'],
    ['SS', 'Sarcodes', 'Thymus Code', 'THY', '200C', '5 Drops', '3 Weeks', 'Supports the thymus resonance found in the symptom scan.', 'Recommended Remedies', 'balanced'],
    ['SS', 'Detoxifier Homaccords', 'Inflamma-Tox', 'INF', '1M', '5 Drops', '3 Weeks', 'Formulated to help the body eliminate inflammatory triggers.', 'Recommended Remedies', 'weakened'],
    ['SS', 'Drainage Tonifiers', 'Heart’s Song Milieu', 'HSM', '6X', '6 Drops', '4 Weeks', 'Chosen alongside the emotional findings to support a calmer baseline.', 'Recommended Remedies', 'balanced'],
    ['SS', 'Detoxifier Homaccords', 'Sinus-Tox', 'SIN', '30C', '5 Drops', '2 Weeks', 'A short course for the seasonal pattern in your symptom scan.', 'Recommended Remedies', 'weakened'],
    ['SS', 'Drainage Tonifiers', 'Solace Milieu', 'SOL', '15C', '6 Drops', '4 Weeks', 'Supports emotional steadiness during the course.', 'Recommended Remedies', 'balanced'],
    ['SS', 'Frequency', '528 Hertz Frequency', 'HZ528', '9C', '5 Drops', '3 Weeks', 'A supportive frequency included in your custom tincture.', 'Resonating Maladies', 'none'],
    ['SS', 'Sleep', 'A consistent sleep window', '', '1X', '1 Drops', '4 Weeks', 'Lights out within the same 30 minutes each night, including weekends.', 'Supportive Lifestyle Changes', 'none'],
    ['SS', 'Stress Management', 'Five-minute breathing breaks', '', '1X', '1 Drops', '4 Weeks', 'Twice a day, before lunch and before dinner. The Box Breathing class walks you through it.', 'Supportive Lifestyle Changes', 'none'],
    ['SS', 'Power Thoughts', '“I am allowed to rest.”', '', '1X', '1 Drops', '4 Weeks', 'Say it when you notice the urge to do one more thing.', 'Beneficial Positive Thoughts', 'none'],
    ['SS', 'Single Oils', 'Lavender', '', '6X', '2 Drops', '4 Weeks', 'A calming essential oil many people use at bedtime.', 'Botanical Support', 'none'],
    ['IMB', 'Hormone Signatures', 'Cortisol', '', '600V', '5 Drops', '3 Weeks', 'A stress hormone that follows a daily rhythm.', 'Hormone Markers', 'weakened'],
    ['IMB', 'Hormone Signatures', 'DHEA', '', '15C', '5 Drops', '3 Weeks', 'Made by the adrenal glands.', 'Hormone Markers', 'weakened'],
    ['IMB', 'Hormone Signatures', 'Melatonin', '', '11V', '5 Drops', '3 Weeks', 'Associated with the body’s sleep signal.', 'Hormone Markers', 'weakened'],
    ['IMB', 'Mineral Signatures', 'Magnesium', '', '11V', '5 Drops', '3 Weeks', 'Involved in hundreds of processes, including relaxation.', 'Mineral Markers', 'weakened'],
    ['IMB', 'Mineral Signatures', 'Zinc', '', '8M', '5 Drops', '3 Weeks', 'A trace mineral used throughout the body.', 'Mineral Markers', 'stressed'],
    ['IMB', 'Amino Acid Signatures', 'Tryptophan', '', '30CM', '5 Drops', '3 Weeks', 'An amino acid the body uses to make serotonin and melatonin.', 'Amino Acid Markers', 'stressed'],
    ['IMB', 'Vitamin Signatures', 'Vitamin D3', '', '12X', '5 Drops', '3 Weeks', 'Often lower in the darker months.', 'Vitamin Markers', 'weakened']
  ];

  /** A scan for one client, with scores nudged so no two clients look alike. */
  function sampleScan(c) {
    var seed = 0; for (var i = 0; i < c.id.length; i++) seed += c.id.charCodeAt(i) * (i + 3);
    var organs = ORGANS.map(function (o, k) {
      var score = Math.max(18, Math.min(88, o[1] + ((seed * (k + 5)) % 13) - 6));
      return { organ: o[0], score: score, paragraphs: o.slice(2).filter(Boolean), include: true };
    }).sort(function (a, b) { return Math.abs(b.score - 50) - Math.abs(a.score - 50); });
    var items = FINDINGS.map(function (f, k) {
      return { id: 'f' + k, doc: f[0], category: f[1], item: f[2], code: f[3], dil: f[4], qty: f[5], dur: f[6], desc: f[7],
        section: f[8], status: f[9], include: true, rc: f[0] === 'RC', note: dilNote(f[0], f[1], f[4]), claims: claimWords(f[7]) };
    });
    var rem = items.filter(function (x) { return x.section === 'Recommended Remedies'; }).sort(comparePotency);
    rem.forEach(function (x, k) { x.rank = k; });
    return { organs: organs, items: items, limit: 8, ageEst: (21 + seed % 14) + '.0' };
  }

  /* ------------------------------------------------------------------ */
  /* Protocols                                                           */
  /* ------------------------------------------------------------------ */

  var TIMES = [['morning', 'Morning', '7:30am'], ['midday', 'Midday', '12:30pm'], ['evening', 'Evening', '6:00pm'], ['bedtime', 'Bedtime', '9:30pm']];
  var HOWS = ['Under the tongue, away from food', 'In a little water', 'With food', 'Away from food'];
  /* A sensible first guess at when to take something; the practitioner changes it. */
  function timesFor(p) {
    var g = p.goals || {};
    if (g.sleep >= 2) return ['evening', 'bedtime'];
    if (g.energy >= 2 || g.stress >= 3) return ['morning', 'midday'];
    if (p.line === 'nutri') return ['morning'];
    return ['morning', 'evening'];
  }
  function protoItem(sku, dose, weeks) {
    var p = product(sku);
    return { sku: sku, dose: dose || (p.line === 'nutri' ? '1 capsule' : '8 drops'), times: timesFor(p), weeks: weeks || 4, how: p.line === 'nutri' ? 'With food' : 'Under the tongue, away from food' };
  }
  /* Suggestions for a protocol: the report's remedies first, then products for their goals. */
  function protoSuggestions(c, scan) {
    var out = [], seen = {};
    if (scan && scan.data) {
      scan.data.items.filter(function (x) { return x.section === 'Recommended Remedies' && x.include; })
        .sort(function (a, b) { return a.rank - b.rank; }).slice(0, scan.data.limit).forEach(function (x) {
          var p = PRODUCTS.filter(function (q) { return q.name === x.item; })[0];
          if (p && !seen[p.sku]) { seen[p.sku] = 1; out.push({ sku: p.sku, from: 'report', why: x.doc + ' ' + x.dil + ' · ' + x.desc, dose: x.qty.replace('Drops', 'drops'), weeks: parseInt(x.dur, 10) || 4 }); }
        });
    }
    recommend(c).picks.forEach(function (x) {
      if (!seen[x.product.sku]) { seen[x.product.sku] = 1; out.push({ sku: x.product.sku, from: 'goals', why: x.why.join(' · ') }); }
    });
    return out;
  }

  window.EG = {
    BRAND: BRAND, GOALS: GOALS, PRODUCTS: PRODUCTS, VIDEOS: VIDEOS, SERVICES: SERVICES, PACKAGES: PACKAGES,
    SUPPLIERS: SUPPLIERS, PATHS: PATHS, PLANS: PLANS, STAGES: STAGES, LINES: LINES,
    PROGRAM: PROGRAM, PRACTITIONERS: PRACTITIONERS, MODULES: MODULES, trackFor: trackFor,
    SCAN_SLOTS: SCAN_SLOTS, SCAN_SECTIONS: SCAN_SECTIONS, sampleScan: sampleScan, comparePotency: comparePotency, claimWords: claimWords,
    TIMES: TIMES, HOWS: HOWS, protoItem: protoItem, protoSuggestions: protoSuggestions,
    SESSION: SESSION, CERTIFIED: CERTIFIED, sessionPrice: sessionPrice, videoAccess: videoAccess,
    recommend: recommend, goalLabel: goalLabel, product: product, video: video,
    seed: seed, iso: iso, routeLine: routeLine
  };
})();
