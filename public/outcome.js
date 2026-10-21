/* Evergrove Wellness showcase - Outcome.
 *
 * The case for the build, kept apart from the working screens: what the
 * dashboard is for, the time it gives back, the client journey it runs, how
 * it supports advertising within the suppliers' rules, and a revenue
 * calculator. Every number here is an estimate for the pitch, and says so.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc, money = U.money;

  /* Estimates for the pitch, to confirm with the team before building. */
  var JOBS = [
    ['Typing intake answers into a spreadsheet', 'Daily', 'auto', 3, 0, 'Clients fill in the questionnaire themselves.'],
    ['Choosing supplements for each new client', 'Daily', 'auto', 4, 0.5, 'Suggested from the answers. A practitioner only checks flagged clients.'],
    ['Ordering from suppliers one product at a time', 'Daily', 'approve', 4, 0.5, 'Approved orders fill the supplier cart in one go and you click checkout. Clinic stock goes out as one weekly order.'],
    ['Copying tracking numbers to clients', 'Daily', 'auto', 2, 0, 'Tracking emails go out the moment the supplier ships.'],
    ['Refill reminders and reorders', 'Weekly', 'approve', 2, 0.3, 'Reminders are automatic. Each refill order still gets approved.'],
    ['Selling short courses and sending access', 'Daily', 'auto', 1.5, 0, 'Checkout ($59 to $119) unlocks the course and sends a receipt.'],
    ['Booking practitioner sessions and taking payment', 'Daily', 'auto', 2, 0, 'Clients pick a practitioner, 30 minutes or an hour, and a time, and pay when they book.'],
    ['Enrolling Premium Course members, welcome packs', 'Weekly', 'auto', 1.5, 0, 'Payment, agreement, welcome email and Zoom invites in one step.'],
    ['Unlocking course weeks, sending Zoom links', 'Weekly', 'auto', 1.5, 0, 'Weeks unlock every 7 days; reminders go out Thursday morning.'],
    ['Turning scan exports into client reports', 'Weekly', 'approve', 4, 0.5, 'Findings are extracted and ranked automatically. A practitioner reviews, signs off and publishes.'],
    ['Chasing payment-plan instalments', 'Monthly', 'auto', 1, 0.2, 'Cards are charged on schedule; a failed card gets an update link.'],
    ['Answering client questions', 'Daily', 'person', 2, 2, 'Questions land in a shared inbox, so anyone can answer.']
  ];
  var HOW = { auto: ['ok', 'Runs itself'], approve: ['honey', 'One-click approval'], person: ['', 'A person, any teammate'] };

  var JOURNEY = [
    ['Free questionnaire', 'Ads and social posts point here. No product prices needed to advertise it.', 'Plan email, goal newsletters', 'None'],
    ['Plan and first order', 'Remedies and supplements picked for their goals, ordered in one tap.', 'Cart, supplier cart fill, tracking', 'Approves the order'],
    ['Short course or session', '$59 to $119 courses, or a $99 session with a Certified Practitioner.', 'Course access, booking, receipts', 'Runs the session'],
    ['Premium Course, $2,995', 'Twelve weeks: energetics work, testing, a custom course, weekly Zoom.', 'Enrolment, week unlocks, Zoom reminders, payment retries', 'Coaches, runs the Zoom'],
    ['Energetic scan and report', 'The in-house scan becomes a report and remedy plan the same day.', 'Extraction, ranking, claim check', 'Reviews and signs off'],
    ['Refills and reorders', 'Clients stay on their plan; most revenue repeats from here.', 'Refill reminders, batching, review requests', 'Approves each refill']
  ];

  function st() { if (!App.ui.oc) App.ui.oc = { leads: 60, first: 40, avg: 95, course: 15, session: 10, premium: 3, keep: 60, refill: 80 }; return App.ui.oc; }
  function calc(o) {
    var firsts = o.leads * o.first / 100;
    return [
      ['First orders', firsts * o.avg],
      ['Short courses', o.leads * o.course / 100 * 85],
      ['Practitioner sessions', o.leads * o.session / 100 * 110],
      ['Premium Course', o.leads * o.premium / 100 * EG.PROGRAM.price],
      ['Refills (one month in)', firsts * o.keep / 100 * o.refill]
    ];
  }

  function view() {
    var o = st(), rows = calc(o), total = rows.reduce(function (t, r) { return t + r[1]; }, 0);
    var before = JOBS.reduce(function (t, j) { return t + j[3]; }, 0), after = JOBS.reduce(function (t, j) { return t + j[4]; }, 0);
    var input = function (k, label, unit) { return '<div><label for="oc-' + k + '">' + label + '</label><div class="row" style="flex-wrap:nowrap;gap:.4rem">' + (unit === '$' ? '<span>$</span>' : '') + '<input id="oc-' + k + '" type="number" min="0" value="' + o[k] + '" data-oc="' + k + '">' + (unit && unit !== '$' ? '<span class="small muted">' + unit + '</span>' : '') + '</div></div>'; };
    return '<p class="eyebrow">Why build this</p><h1 class="h1">Outcome</h1><p class="lede">One place that sells, delivers and fulfils, so the business grows on supplements and the Premium Course without the admin resting on one person.</p>' +
      '<div class="grid g4" style="margin-bottom:1.6rem" data-tour="purposes">' + [
        ['Sell more, with less effort', 'Free plans turn into first orders, short courses, sessions and Premium enrolments, each one tap away for the client.'],
        ['Deliver the Premium Course', 'Enrolment, weekly unlocks, Zoom, scans and reports run on schedule. Practitioners spend their time with clients.'],
        ['Stay safe with suppliers', 'Orders always wait for a person. Prices stay behind login and minimum-price rules are checked, protecting the Physica account.'],
        ['Hand off the admin', 'What one person did by hand is automated or one click, with roles and a shared queue anyone can work.']
      ].map(function (x) { return '<div class="card"><h3 class="h3" style="font-size:1.05rem">' + x[0] + '</h3><p class="small muted" style="margin:0">' + x[1] + '</p></div>'; }).join('') + '</div>' +

      '<h2 class="h2">Time back: about ' + before + ' hours a week of admin becomes ' + after + '</h2><div class="card"><p class="small muted" style="margin-top:0">The jobs one person did by hand, and who does them after the build. Hours are estimates for this pitch; we confirm them with your team before building.</p><div class="tablewrap"><table data-tour="jobs"><thead><tr><th>Job</th><th>How often</th><th>After the build</th><th class="r">Hours a week now</th><th class="r">After</th></tr></thead><tbody>' +
        JOBS.map(function (j) { return '<tr><td><b>' + esc(j[0]) + '</b><br><span class="small muted">' + esc(j[5]) + '</span></td><td>' + j[1] + '</td><td><span class="pill ' + HOW[j[2]][0] + '">' + HOW[j[2]][1] + '</span></td><td class="r">' + j[3] + '</td><td class="r">' + j[4] + '</td></tr>'; }).join('') +
        '<tr class="total"><td colspan="3"><b>Total</b></td><td class="r"><b>' + before + '</b></td><td class="r"><b>' + after + '</b></td></tr></tbody></table></div></div>' +

      '<h2 class="h2">The client journey it runs</h2><div class="journey" data-tour="journey">' + JOURNEY.map(function (j, i) {
        return '<div class="jstep"><span class="jn">' + (i + 1) + '</span><b>' + esc(j[0]) + '</b><p class="small">' + esc(j[1]) + '</p><div class="small"><span class="muted">Runs itself:</span> ' + esc(j[2]) + '</div><div class="small"><span class="muted">A person:</span> ' + esc(j[3]) + '</div></div>';
      }).join('<span class="jarrow" aria-hidden="true">&rarr;</span>') + '</div><p class="small muted">Step 6 feeds back into step 2: each refill is another approved order, and each plan update can lead to a session or the Premium Course.</p>' +

      '<h2 class="h2">Advertising that fits the supplier rules</h2><div class="split" data-tour="ads"><div class="card"><h3 class="h3">What the platform makes possible</h3><ul class="olist">' +
        ['<b>Advertise the free questionnaire, not products.</b> Ads lead to a service, so Physica&rsquo;s ban on shopping ads and public prices is never touched.',
         '<b>Goal-based newsletters.</b> Every questionnaire answer becomes a segment: sleep, stress, detox. Each reader gets their own pick.',
         '<b>Follow-ups for people who did not buy.</b> A short email series offers a free class, then a $99 session.',
         '<b>Reviews on schedule.</b> Requests go out 7 days after a session or delivery, building the clinic&rsquo;s search ranking.',
         '<b>Member referrals.</b> Premium members share a link to the free questionnaire; the referral is tracked to their record.',
         '<b>Free classes as the front door.</b> Short courses and the Premium Course are the paid next steps.'].map(function (x) { return '<li>' + x + '</li>'; }).join('') +
      '</ul></div><div class="card policy"><h3 class="h3">What to stay away from</h3><ul class="olist">' +
        ['No Google Shopping, Amazon, eBay or social media shops for Physica or Biotics products.',
         'No product prices on public pages. Prices appear only after a client signs in.',
         'No discounts below Physica&rsquo;s minimum advertised price, or below Biotics&rsquo; suggested retail online.',
         'No health claims in ads. The claim-language check used on scan reports can screen ad copy too.'].map(function (x) { return '<li>' + x + '</li>'; }).join('') +
      '</ul></div></div>' +

      '<h2 class="h2">What it could add up to</h2><div class="split" data-tour="calc"><div class="card"><p class="small muted" style="margin-top:0">Illustrative only. Change the numbers to your own.</p><div class="fields">' +
        input('leads', 'Free questionnaires a month', '') + input('first', 'Who place a first order', '%') + input('avg', 'Average first order', '$') + input('course', 'Who buy a short course ($85 average)', '%') +
        input('session', 'Who book a session ($110 average)', '%') + input('premium', 'Who join the Premium Course', '%') + input('keep', 'First-time buyers who refill', '%') + input('refill', 'Average refill', '$') +
      '</div></div><div class="card"><h3 class="h3">Monthly revenue from new clients</h3><table><tbody>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="r">' + money(r[1], false) + '</td></tr>'; }).join('') +
        '<tr class="total"><td><b>Total a month</b></td><td class="r" id="ocTotal"><b>' + money(total, false) + '</b></td></tr></tbody></table><p class="small muted" style="margin:.6rem 0 0">Before supplier costs. Refills compound: every month&rsquo;s new buyers add to the next month&rsquo;s refills.</p></div></div>';
  }

  function bind() {
    var o = st();
    U.$$('[data-oc]').forEach(function (inp) {
      inp.addEventListener('change', function () { o[inp.getAttribute('data-oc')] = Math.max(0, +inp.value || 0); var y = window.scrollY; App.render(); window.scrollTo(0, y); });
    });
  }

  App.register('outcome', view, bind);
})();
