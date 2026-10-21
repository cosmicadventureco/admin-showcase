/* Evergrove Wellness showcase - sample data and the small engines behind it.
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
    name: 'Evergrove Wellness',
    tagline: 'Videos, coaching and supplements, personalised',
    owner: 'Maya Lindqvist',
    email: 'hello@evergrove.example'
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

  /* Physica Energetics is the main supplier. Bluewater Labs is a fictional
     backup for plain nutritionals, there to show routing between suppliers. */
  var SUPPLIERS = {
    physica: { name: 'Physica Energetics', short: 'Physica', ships: '2-4 days', region: 'Primary supplier' },
    bluewater: { name: 'Bluewater Labs (sample)', short: 'Bluewater', ships: '1-3 days', region: 'Backup, nutritionals' }
  };

  var LINES = {
    milieu: { label: 'Milieu', kind: 'Drainage tonifier' },
    code: { label: 'Code', kind: 'Sarcode' },
    tox: { label: 'Tox', kind: 'Detoxifier homaccord' },
    nutri: { label: 'Nutritional', kind: 'Nutritional supplement' }
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
    { sku: 'EG-MAG', name: 'Magnesium Glycinate', line: 'nutri', dose: '120 capsules', price: 24, cost: 9.10, supplier: 'bluewater', goals: { sleep: 2, joints: 1, stress: 1 }, tags: ['vegan'], hue: 120 },
    { sku: 'EG-D3K', name: 'Vitamin D3 + K2', line: 'nutri', dose: '2,000 IU, 60 softgels', price: 19, cost: 6.20, supplier: 'bluewater', goals: { immunity: 2, energy: 1 }, tags: [], caution: ['bloodthinner'], hue: 48 },
    { sku: 'EG-OM3', name: 'Omega-3 Fish Oil', line: 'nutri', dose: '1,000 mg, 90 softgels', price: 32, cost: 13.75, supplier: 'bluewater', goals: { focus: 2, joints: 2 }, tags: ['fish'], caution: ['bloodthinner'], hue: 205 },
    { sku: 'EG-PRO', name: 'Probiotic 30B CFU', line: 'nutri', dose: '30 capsules', price: 39, cost: 15.30, supplier: 'bluewater', goals: { digestion: 3, immunity: 1 }, tags: ['vegan'], hue: 110 },
    { sku: 'EG-BCX', name: 'Methylated B-Complex', line: 'nutri', dose: '60 capsules', price: 22, cost: 7.80, supplier: 'bluewater', goals: { energy: 2, focus: 2 }, tags: ['vegan'], hue: 15 }
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
    { id: 'v14', title: 'Energetics 101 with Theo Marsh', mins: 96, lessons: 6, price: 119, goals: ['energy', 'focus', 'immunity'], views: 1204, hue: 280, access: 'paid' },
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
    { id: 'p1', name: 'Theo Marsh', role: 'Certified Energetics Practitioner', hue: 280 },
    { id: 'p2', name: 'Dr. Ana Whitlock, ND', role: 'Naturopathic doctor', hue: 160 },
    { id: 'p3', name: 'Lena Ortiz', role: 'Certified Wellness Practitioner', hue: 30 }
  ];
  function sessionPrice(long, c) {
    var p = SESSION.base + (long ? SESSION.upgrade : 0);
    return c && c.member ? Math.round(p * (1 - SESSION.premiumOff) * 100) / 100 : p;
  }

  var SERVICES = [
    { id: 'initial', label: 'Initial Wellness Consultation', mins: 60, price: 145 },
    { id: 'followup', label: 'Follow-up Coaching', mins: 30, price: 75 },
    { id: 'energetics', label: 'Energetics Assessment', mins: 75, price: 0 },
    { id: 'breathwork', label: 'Group Breathwork Workshop', mins: 75, price: 35 },
    { id: 'corporate', label: 'Corporate Wellness Session', mins: 60, price: 0 },
    { id: 'session30', label: 'Practitioner session (30 min)', mins: 30, price: 99 },
    { id: 'session60', label: 'Practitioner session (1 hour)', mins: 60, price: 148 }
  ];

  var PLANS = { free: 'Free account', newsletter: 'Newsletter', monthly: 'Monthly Coaching', vip: 'VIP Concierge', program: 'Premium Course' };

  /* The flagship offer. Fictional practitioners; real structure. */
  var PROGRAM = {
    name: 'Evergrove Restore',
    sub: 'Premium 3-Month Course',
    price: 2995,
    plan: { n: 3, each: 1035 },
    weeks: 12,
    discount: 0.2,
    includes: [
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
    { name: 'Maya Lindqvist', role: 'Founder, wellness coach' },
    { name: 'Theo Marsh', role: 'Energetics practitioner' },
    { name: 'Dr. Ana Whitlock, ND', role: 'Naturopathic doctor' }
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
      subscribePrice: Math.round(monthly * 0.85 * 100) / 100,
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
      ['c1', 'Priya Raman', ['stress', 'sleep', 'focus'], 'vegetarian', 'vip', -142, 1186, true],
      ['c2', 'Marcus Bell', ['joints', 'energy'], 'omnivore', 'monthly', -96, 642, true],
      ['c3', 'Elena Fuentes', ['digestion', 'detox'], 'vegan', 'monthly', -63, 418, true],
      ['c4', 'Jordan Okafor', ['energy', 'focus'], 'omnivore', 'newsletter', -40, 96, false],
      ['c5', 'Hannah Kowalski', ['sleep'], 'omnivore', 'newsletter', -21, 38, false],
      ['c6', 'Samuel Trent', ['immunity', 'energy'], 'omnivore', 'monthly', -188, 904, true],
      ['c7', 'Aiko Tanaka', ['detox', 'digestion', 'stress'], 'pescatarian', 'vip', -230, 1544, true],
      ['c8', 'Ruth Abernathy', ['joints'], 'omnivore', 'monthly', -75, 377, true],
      ['c9', 'Dev Malhotra', ['focus', 'stress'], 'vegan', 'newsletter', -12, 0, false],
      ['c10', 'Grace Whitfield', ['immunity'], 'omnivore', 'newsletter', -5, 21, false],
      ['c11', 'Tomas Lindgren', ['energy', 'joints', 'sleep'], 'omnivore', 'monthly', -54, 288, false],
      ['c12', 'Nadia Haddad', ['stress', 'sleep'], 'vegetarian', 'vip', -301, 2210, true],
      ['c13', 'Owen Castillo', ['digestion'], 'omnivore', 'newsletter', -3, 0, false],
      ['c14', 'Leila Moreau', ['detox', 'energy'], 'vegan', 'monthly', -33, 214, true]
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
      { id: 'b1', service: 'initial', date: iso(0), time: '09:30', guests: ['c9'], where: 'Video call' },
      { id: 'b2', service: 'followup', date: iso(0), time: '13:00', guests: ['c2'], where: 'Studio' },
      { id: 'b3', service: 'breathwork', date: iso(1), time: '18:00', guests: ['c1', 'c5', 'c10', 'c12', 'c13'], where: 'Studio' },
      { id: 'b4', service: 'energetics', date: iso(2), time: '10:00', guests: ['c3'], where: 'Video call' },
      { id: 'b5', service: 'corporate', date: iso(4), time: '12:00', guests: ['c4', 'c11', 'c13', 'c9'], where: 'Harbor & Pine (on site)', name: 'Harbor & Pine lunch session' },
      { id: 'b6', service: 'followup', date: iso(6), time: '16:30', guests: ['c7'], where: 'Video call' },
      { id: 'b7', service: 'initial', date: iso(8), time: '11:00', guests: ['c14'], where: 'Studio' },
      { id: 'b8', service: 'followup', date: iso(11), time: '09:00', guests: ['c6'], where: 'Video call' },
      { id: 'b9', service: 'breathwork', date: iso(15), time: '18:00', guests: ['c12', 'c8', 'c3'], where: 'Studio' },
      { id: 'b10', service: 'energetics', date: iso(19), time: '14:00', guests: ['c11'], where: 'Studio' },
      { id: 'b11', service: 'followup', date: iso(-3), time: '10:00', guests: ['c1'], where: 'Video call' },
      { id: 'b12', service: 'initial', date: iso(-6), time: '15:00', guests: ['c4'], where: 'Studio' },
      { id: 'b13', service: 'session60', date: iso(3), time: '11:00', guests: ['c2'], where: 'Video call', with: 'Lena Ortiz', paid: 148 },
      { id: 'b14', service: 'session30', date: iso(5), time: '15:30', guests: ['c5'], where: 'Video call', with: 'Theo Marsh', paid: 99 }
    ];

    var orders = [
      { id: 'EG-10482', client: 'c12', at: iso(-6), items: [['PE-RLX', 1], ['PE-ADM', 1], ['EG-MAG', 1]], stage: 4, tracking: '1Z84F2A10398', sub: true, discount: 0.2, approvedBy: 'Maya Lindqvist' },
      { id: 'EG-10483', client: 'c7', at: iso(-5), items: [['PE-DRN', 1], ['EG-PRO', 1]], stage: 4, tracking: '9400 1112 0274', sub: true, discount: 0.2, approvedBy: 'Maya Lindqvist' },
      { id: 'EG-10484', client: 'c2', at: iso(-4), items: [['PE-INF', 1], ['EG-OM3', 1]], stage: 3, tracking: '1Z84F2A10411', sub: true, approvedBy: 'Theo Marsh' },
      { id: 'EG-10485', client: 'c4', at: iso(-3), items: [['PE-MET', 1]], stage: 3, tracking: '9400 1112 0298', sub: false, approvedBy: 'Maya Lindqvist' },
      { id: 'EG-10486', client: 'c14', at: iso(-2), items: [['PE-MTL', 1], ['EG-BCX', 1]], stage: 2, sub: true, discount: 0.2, approvedBy: 'Theo Marsh' },
      { id: 'EG-10487', client: 'c6', at: iso(-1), items: [['PE-FLU', 2], ['EG-D3K', 1]], stage: 1, sub: true, approvedBy: 'Maya Lindqvist' },
      { id: 'EG-10488', client: 'c8', at: iso(-1), items: [['PE-INF', 1], ['EG-D3K', 1]], stage: 0, sub: true },
      { id: 'EG-10489', client: 'c10', at: iso(0), items: [['PE-THY', 1]], stage: 0, sub: false }
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
      { at: iso(-1), to: 'c14', kind: 'Order shipped', subject: 'Your Evergrove order is on its way' },
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
        id: 'q1', title: 'Corporate Wellness Program', client: 'Harbor & Pine Architects',
        contact: 'Dana Reyes, People Ops', status: 'Viewed', sent: iso(-2),
        lines: [
          ['Lunch-and-learn sessions (monthly)', 6, 450],
          ['1:1 coaching credits for staff', 20, 75],
          ['Personalised supplement starter kits', 24, 38],
          ['On-demand video library seats (6 months)', 24, 12]
        ],
        terms: 'Sessions are scheduled at least 14 days ahead. Unused coaching credits roll over for 90 days. Supplement kits ship directly to each employee from our fulfilment partners.'
      },
      {
        id: 'q2', title: 'VIP Concierge Renewal', client: 'Nadia Haddad', contact: 'nadia.haddad@example.com',
        status: 'Signed', sent: iso(-11),
        lines: [['VIP Concierge (12 months)', 12, 189], ['Quarterly lab review', 4, 60]],
        terms: 'Billed monthly. Cancel any time with 30 days notice.'
      }
    ];

    enrollments.forEach(function (e) { var c = clients.filter(function (x) { return x.id === e.client; })[0]; c.plan = 'program'; c.member = true; });
    clients.forEach(function (c) { c.videosOwned = []; });
    clients[4].videosOwned = ['v11'];
    clients[1].videosOwned = ['v8', 'v12'];
    clients[9].videosOwned = ['v14'];
    enrollments[3].payIssue = 'Card declined for payment 2 of 3';

    /* Questions clients sent from the app. Anyone on the team can answer. */
    var inbox = [
      { id: 'm1', from: 'c3', at: iso(0), text: 'Can I take Drainage Milieu with my morning coffee, or should I wait?', done: false },
      { id: 'm2', from: 'c5', at: iso(-1), text: 'I bought the Sleep Reset course. Is there a workbook to go with it?', done: false },
      { id: 'm3', from: 'c6', at: iso(-2), text: 'Please skip my next refill, I am travelling until the 10th.', done: true }
    ];

    /* What the system did on its own, newest first. */
    var activity = [
      [0, '07:00', 'Week 12 unlocked for Nadia Haddad. Email sent.'],
      [0, '06:45', 'Zoom reminder sent to 5 program members for Thursday 6:00pm.'],
      [0, '06:30', 'Refill EG-10488 created for Ruth Abernathy. Held for approval (screening flag).'],
      [-1, '21:14', 'Hannah Kowalski bought the Sleep Reset short course ($79). Access granted, receipt sent.'],
      [-1, '18:20', 'Marcus Bell booked a 1-hour session with Lena Ortiz ($148). Calendar invite and Zoom link sent.'],
      [-1, '17:02', 'Tracking 1Z84F2A10411 emailed to Marcus Bell.'],
      [-1, '15:40', 'Payment 2 of 3 failed for Elena Fuentes. Card-update link sent. Retry in 3 days.'],
      [-1, '11:08', 'Grace Whitfield finished the free questionnaire. Plan emailed, added to Immunity newsletter.'],
      [-2, '19:25', 'Leila Moreau enrolled in Evergrove Restore. Welcome pack, Zoom invites and week 1 sent.'],
      [-2, '09:12', 'Reorder reminder sent to 6 auto-ship clients.'],
      [-3, '14:30', 'Grace Whitfield bought Energetics 101 with Theo Marsh ($119). Access granted.']
    ].map(function (a) { return { at: iso(a[0]), time: a[1], text: a[2] }; });

    return {
      v: 6, clients: clients, bookings: bookings, orders: orders, emails: emails,
      campaigns: campaigns, agreements: agreements, enrollments: enrollments, inbox: inbox, activity: activity, nextOrder: 10490, nextClient: 15,
      revenue: [3120, 3480, 3290, 3910, 4260, 4105, 4870, 5340]
    };
  }

  var STAGES = ['Awaiting approval', 'Sent to supplier', 'Supplier confirmed', 'Shipped', 'Delivered'];

  /** Which supplier a line goes to, and why. Shown before anyone approves. */
  function routeLine(sku) {
    var p = product(sku);
    return { supplier: p.supplier, reason: p.supplier === 'physica' ? 'Primary supplier' : 'Nutritional, from backup supplier' };
  }

  window.EG = {
    BRAND: BRAND, GOALS: GOALS, PRODUCTS: PRODUCTS, VIDEOS: VIDEOS, SERVICES: SERVICES,
    SUPPLIERS: SUPPLIERS, PLANS: PLANS, STAGES: STAGES, LINES: LINES,
    PROGRAM: PROGRAM, PRACTITIONERS: PRACTITIONERS, MODULES: MODULES, trackFor: trackFor,
    SESSION: SESSION, CERTIFIED: CERTIFIED, sessionPrice: sessionPrice, videoAccess: videoAccess,
    recommend: recommend, goalLabel: goalLabel, product: product, video: video,
    seed: seed, iso: iso, routeLine: routeLine
  };
})();
