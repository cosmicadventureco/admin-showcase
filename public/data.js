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
    { id: 'skin', label: 'Skin & hair' },
    { id: 'focus', label: 'Focus' }
  ];

  var SUPPLIERS = {
    northpeak: { name: 'NorthPeak Nutraceuticals', ships: '1-2 days', region: 'Utah' },
    bluewater: { name: 'Bluewater Labs', ships: '2-3 days', region: 'Oregon' },
    sunfield: { name: 'Sunfield Botanicals', ships: '1-3 days', region: 'Colorado' }
  };

  /* tags: diet/allergen facts. caution: what makes a practitioner look first. */
  var PRODUCTS = [
    { sku: 'EG-MAG-200', name: 'Magnesium Glycinate', dose: '200 mg', price: 24, cost: 9.10,
      supplier: 'northpeak', alt: 'bluewater', goals: { sleep: 3, stress: 2, joints: 1 }, tags: ['vegan'], hue: 160 },
    { sku: 'EG-ASH-600', name: 'Ashwagandha KSM-66', dose: '600 mg', price: 29, cost: 11.40,
      supplier: 'sunfield', goals: { stress: 3, energy: 1, sleep: 1 }, tags: ['vegan'],
      caution: ['pregnant', 'thyroid'], hue: 35 },
    { sku: 'EG-D3K2-2K', name: 'Vitamin D3 + K2', dose: '2,000 IU', price: 19, cost: 6.20,
      supplier: 'bluewater', alt: 'northpeak', goals: { immunity: 3, energy: 1, joints: 1 }, tags: [],
      caution: ['bloodthinner'], hue: 48 },
    { sku: 'EG-OM3-1K', name: 'Omega-3 Fish Oil', dose: '1,000 mg EPA/DHA', price: 32, cost: 13.75,
      supplier: 'bluewater', goals: { focus: 2, joints: 2, skin: 1 }, tags: ['fish'],
      caution: ['bloodthinner'], hue: 200 },
    { sku: 'EG-ALG-500', name: 'Algae Omega-3', dose: '500 mg DHA', price: 36, cost: 16.10,
      supplier: 'sunfield', goals: { focus: 2, joints: 1, skin: 1 }, tags: ['vegan'], hue: 175 },
    { sku: 'EG-BCX-M', name: 'Methylated B-Complex', dose: '1 capsule', price: 22, cost: 7.80,
      supplier: 'northpeak', goals: { energy: 3, focus: 2, stress: 1 }, tags: ['vegan'], hue: 20 },
    { sku: 'EG-PRO-30', name: 'Probiotic 30B CFU', dose: '30 billion CFU', price: 39, cost: 15.30,
      supplier: 'bluewater', alt: 'sunfield', goals: { digestion: 3, immunity: 2, skin: 1 }, tags: ['vegan'],
      cold: true, hue: 120 },
    { sku: 'EG-THE-200', name: 'L-Theanine', dose: '200 mg', price: 18, cost: 5.90,
      supplier: 'sunfield', goals: { stress: 2, focus: 2, sleep: 1 }, tags: ['vegan'], hue: 95 },
    { sku: 'EG-ELD-Z', name: 'Elderberry + Zinc', dose: '2 gummies', price: 21, cost: 7.40,
      supplier: 'northpeak', goals: { immunity: 3 }, tags: ['vegan'], hue: 280 },
    { sku: 'EG-COL-10', name: 'Collagen Peptides', dose: '10 g', price: 42, cost: 17.90,
      supplier: 'northpeak', goals: { skin: 3, joints: 2 }, tags: ['bovine'], hue: 10 },
    { sku: 'EG-TUR-500', name: 'Turmeric Curcumin', dose: '500 mg + piperine', price: 26, cost: 9.60,
      supplier: 'sunfield', goals: { joints: 3, digestion: 1 }, tags: ['vegan'],
      caution: ['bloodthinner'], hue: 40 },
    { sku: 'EG-IRN-25', name: 'Iron Bisglycinate', dose: '25 mg', price: 16, cost: 4.80,
      supplier: 'bluewater', goals: { energy: 2 }, tags: ['vegan'], caution: ['review'], hue: 0 },
    { sku: 'EG-PRE-M', name: 'Prenatal Multi', dose: '3 capsules', price: 38, cost: 14.20,
      supplier: 'northpeak', goals: {}, tags: ['vegan'], prenatal: true, hue: 330 },
    { sku: 'EG-RHO-300', name: 'Rhodiola Rosea', dose: '300 mg', price: 27, cost: 10.10,
      supplier: 'sunfield', goals: { energy: 2, focus: 2, stress: 1 }, tags: ['vegan'],
      caution: ['pregnant'], hue: 60 },
    { sku: 'EG-MEL-1', name: 'Low-Dose Melatonin', dose: '1 mg', price: 14, cost: 3.90,
      supplier: 'bluewater', goals: { sleep: 2 }, tags: ['vegan'], caution: ['pregnant'], hue: 240 },
    { sku: 'EG-ENZ-D', name: 'Digestive Enzymes', dose: '1 capsule', price: 23, cost: 8.30,
      supplier: 'northpeak', goals: { digestion: 2 }, tags: ['vegan'], hue: 140 }
  ];

  var VIDEOS = [
    { id: 'v1', title: '10-Minute Morning Mobility', mins: 10, goals: ['joints', 'energy'], views: 4210, hue: 32 },
    { id: 'v2', title: 'Box Breathing for Stress', mins: 6, goals: ['stress', 'focus'], views: 6890, hue: 190 },
    { id: 'v3', title: 'Wind-Down Yoga for Sleep', mins: 18, goals: ['sleep', 'stress'], views: 5320, hue: 250 },
    { id: 'v4', title: 'Gut Health 101', mins: 14, goals: ['digestion', 'immunity'], views: 3150, hue: 120 },
    { id: 'v5', title: 'Desk Posture Reset', mins: 8, goals: ['joints', 'focus'], views: 2780, hue: 15 },
    { id: 'v6', title: 'Building a Balanced Plate', mins: 12, goals: ['energy', 'digestion'], views: 3940, hue: 80 },
    { id: 'v7', title: 'Guided Body Scan Meditation', mins: 20, goals: ['sleep', 'stress'], views: 7015, hue: 280 },
    { id: 'v8', title: 'Strength Basics for Bone Health', mins: 22, goals: ['joints', 'energy'], views: 1960, hue: 350 },
    { id: 'v9', title: 'Understanding Your Supplements', mins: 9, goals: ['immunity', 'skin'], views: 2410, hue: 55 },
    { id: 'v10', title: 'Skin from the Inside Out', mins: 11, goals: ['skin', 'digestion'], views: 1720, hue: 330 }
  ];

  var SERVICES = [
    { id: 'initial', label: 'Initial Wellness Consultation', mins: 60, price: 145 },
    { id: 'followup', label: 'Follow-up Coaching', mins: 30, price: 75 },
    { id: 'nutrition', label: 'Nutrition Deep-Dive', mins: 90, price: 190 },
    { id: 'breathwork', label: 'Group Breathwork Workshop', mins: 75, price: 35 },
    { id: 'corporate', label: 'Corporate Wellness Session', mins: 60, price: 0 }
  ];

  var PLANS = { newsletter: 'Newsletter', monthly: 'Monthly Coaching', vip: 'VIP Concierge' };

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
      if (prod.prenatal) {
        if (p.pregnant) picks.push({ product: prod, score: 99, why: ['Recommended for pregnancy'], review: true });
        return;
      }
      if ((diet === 'vegan' || diet === 'vegetarian') && (prod.tags.indexOf('fish') >= 0 || prod.tags.indexOf('bovine') >= 0)) return;
      if (allergies.indexOf('fish') >= 0 && prod.tags.indexOf('fish') >= 0) return;
      var score = 0, why = [];
      goals.forEach(function (g) {
        if (prod.goals[g]) {
          score += prod.goals[g];
          why.push('Supports ' + goalLabel(g).toLowerCase());
        }
      });
      if (!score) return;
      var cautions = (prod.caution || []).filter(function (c) { return flags.indexOf(c) >= 0 || c === 'review'; });
      if (p.pregnant && (prod.caution || []).indexOf('pregnant') >= 0) return;
      if (diet === 'vegan' && prod.tags.indexOf('vegan') >= 0) why.push('Vegan-friendly');
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

    var service = goals.length >= 3 || flags.length ? SERVICES[0] : (goals.indexOf('digestion') >= 0 ? SERVICES[2] : SERVICES[1]);
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
      ['c3', 'Elena Fuentes', ['digestion', 'skin'], 'vegan', 'monthly', -63, 418, true],
      ['c4', 'Jordan Okafor', ['energy', 'focus'], 'omnivore', 'newsletter', -40, 96, false],
      ['c5', 'Hannah Kowalski', ['sleep'], 'omnivore', 'newsletter', -21, 38, false],
      ['c6', 'Samuel Trent', ['immunity', 'energy'], 'omnivore', 'monthly', -188, 904, true],
      ['c7', 'Aiko Tanaka', ['skin', 'digestion', 'stress'], 'pescatarian', 'vip', -230, 1544, true],
      ['c8', 'Ruth Abernathy', ['joints'], 'omnivore', 'monthly', -75, 377, true],
      ['c9', 'Dev Malhotra', ['focus', 'stress'], 'vegan', 'newsletter', -12, 0, false],
      ['c10', 'Grace Whitfield', ['immunity'], 'omnivore', 'newsletter', -5, 21, false],
      ['c11', 'Tomas Lindgren', ['energy', 'joints', 'sleep'], 'omnivore', 'monthly', -54, 288, false],
      ['c12', 'Nadia Haddad', ['stress', 'sleep'], 'vegetarian', 'vip', -301, 2210, true],
      ['c13', 'Owen Castillo', ['digestion'], 'omnivore', 'newsletter', -3, 0, false],
      ['c14', 'Leila Moreau', ['skin', 'energy'], 'vegan', 'monthly', -33, 214, true]
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
    clients[7].notes.push({ at: iso(-20), text: 'On warfarin. Turmeric and D3 held until her doctor signs off.' });

    var bookings = [
      { id: 'b1', service: 'initial', date: iso(0), time: '09:30', guests: ['c9'], where: 'Video call' },
      { id: 'b2', service: 'followup', date: iso(0), time: '13:00', guests: ['c2'], where: 'Studio' },
      { id: 'b3', service: 'breathwork', date: iso(1), time: '18:00', guests: ['c1', 'c5', 'c10', 'c12', 'c13'], where: 'Studio' },
      { id: 'b4', service: 'nutrition', date: iso(2), time: '10:00', guests: ['c3'], where: 'Video call' },
      { id: 'b5', service: 'corporate', date: iso(4), time: '12:00', guests: ['c4', 'c11', 'c13', 'c9'], where: 'Harbor & Pine (on site)', name: 'Harbor & Pine lunch session' },
      { id: 'b6', service: 'followup', date: iso(6), time: '16:30', guests: ['c7'], where: 'Video call' },
      { id: 'b7', service: 'initial', date: iso(8), time: '11:00', guests: ['c14'], where: 'Studio' },
      { id: 'b8', service: 'followup', date: iso(11), time: '09:00', guests: ['c6'], where: 'Video call' },
      { id: 'b9', service: 'breathwork', date: iso(15), time: '18:00', guests: ['c12', 'c8', 'c3'], where: 'Studio' },
      { id: 'b10', service: 'nutrition', date: iso(19), time: '14:00', guests: ['c11'], where: 'Studio' },
      { id: 'b11', service: 'followup', date: iso(-3), time: '10:00', guests: ['c1'], where: 'Video call' },
      { id: 'b12', service: 'initial', date: iso(-6), time: '15:00', guests: ['c4'], where: 'Studio' }
    ];

    var orders = [
      { id: 'EG-10482', client: 'c12', at: iso(-6), items: [['EG-MAG-200', 1], ['EG-THE-200', 1], ['EG-ASH-600', 1]], stage: 4, tracking: '1Z84F2A10398', sub: true },
      { id: 'EG-10483', client: 'c7', at: iso(-5), items: [['EG-COL-10', 1], ['EG-PRO-30', 1]], stage: 4, tracking: '9400 1112 0274', sub: true },
      { id: 'EG-10484', client: 'c2', at: iso(-4), items: [['EG-TUR-500', 1], ['EG-OM3-1K', 1]], stage: 3, tracking: '1Z84F2A10411', sub: true },
      { id: 'EG-10485', client: 'c4', at: iso(-3), items: [['EG-BCX-M', 1]], stage: 3, tracking: '9400 1112 0298', sub: false },
      { id: 'EG-10486', client: 'c14', at: iso(-2), items: [['EG-ALG-500', 1], ['EG-BCX-M', 1]], stage: 2, sub: true },
      { id: 'EG-10487', client: 'c6', at: iso(-1), items: [['EG-D3K2-2K', 2], ['EG-ELD-Z', 1]], stage: 2, sub: true },
      { id: 'EG-10488', client: 'c3', at: iso(-1), items: [['EG-PRO-30', 1], ['EG-ENZ-D', 1]], stage: 1, sub: true },
      { id: 'EG-10489', client: 'c10', at: iso(0), items: [['EG-ELD-Z', 1]], stage: 0, sub: false }
    ];

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

    return {
      v: 3, clients: clients, bookings: bookings, orders: orders, emails: emails,
      campaigns: campaigns, agreements: agreements, nextOrder: 10490, nextClient: 15,
      revenue: [3120, 3480, 3290, 3910, 4260, 4105, 4870, 5340]
    };
  }

  var STAGES = ['Order received', 'Routed to supplier', 'Supplier confirmed', 'Shipped', 'Delivered'];

  /** Pick the supplier for a line: the main one unless its stock says otherwise. */
  function routeLine(sku, n) {
    var p = product(sku);
    var main = p.supplier;
    var useAlt = p.alt && (n % 3 === 0);
    return { supplier: useAlt ? p.alt : main, reason: useAlt ? 'Main supplier low on stock, switched to backup' : 'In stock, lowest landed cost' };
  }

  window.EG = {
    BRAND: BRAND, GOALS: GOALS, PRODUCTS: PRODUCTS, VIDEOS: VIDEOS, SERVICES: SERVICES,
    SUPPLIERS: SUPPLIERS, PLANS: PLANS, STAGES: STAGES,
    recommend: recommend, goalLabel: goalLabel, product: product, video: video,
    seed: seed, iso: iso, routeLine: routeLine
  };
})();
