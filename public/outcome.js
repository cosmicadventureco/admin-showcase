/* Evergrove Wellness showcase - Outcome.
 *
 * The case for the build, kept apart from the working screens: the four
 * functions it starts with, the admin time they give back, and what can be
 * added later when the business needs it. Hours are estimates, and say so.
 */
(function () {
  'use strict';

  var U = App.util, esc = U.esc;

  /* Estimates for the pitch, to confirm with the team before building. */
  var JOBS = [
    ['Writing up each scan as a client report', 'Weekly', 'approve', 4, 0.5, 'Exports are read and ranked for you. A practitioner reviews and signs off.'],
    ['Writing each client’s protocol and schedule', 'Weekly', 'approve', 3, 0.5, 'Remedies are suggested from the report; you set doses and times, and the client gets reminders.'],
    ['Ordering from suppliers one product at a time', 'Daily', 'approve', 4, 0.5, 'An approved order fills the supplier cart in one go; you click checkout.'],
    ['Booking sessions and sending Zoom links', 'Daily', 'auto', 3, 0, 'Clients book open times; Zoom, invites and reminders are automatic.'],
    ['Copying tracking numbers to clients', 'Daily', 'auto', 2, 0, 'Tracking goes to the client when the supplier ships.'],
    ['Chasing forms and payments', 'Daily', 'auto', 2, 0.5, 'Waivers go out automatically and are signed in the client portal; payment links are one click.'],
    ['Answering client questions by text and email', 'Daily', 'approve', 2, 1, 'One message thread per client, on their page and in their app.'],
    ['Finding a client’s documents and history', 'Daily', 'auto', 2, 0, 'Reports, protocols, forms, notes and payments live on one page per client.']
  ];
  var HOW = { auto: ['ok', 'Runs itself'], approve: ['honey', 'You check it, one click'] };
  var LATER = [
    ['Newsletters', 'Goal-based emails from questionnaire answers.'],
    ['Video library', 'Free classes and short-course sales in one place.'],
    ['Shared work queue', 'One to-do list for the whole team, with roles.'],
    ['Automation settings', 'Switches, settings and logs for each automatic job.'],
    ['Clinic stock batching', 'One weekly supplier order with a pick list.'],
    ['Shopify store', 'A members-only store feeding the same orders.'],
    ['Quotes and agreements', 'Retreat partnerships, signed online.'],
    ['Biotics and DesBio carts', 'The same one-click ordering for the other suppliers.']
  ];

  function view() {
    var before = JOBS.reduce(function (t, j) { return t + j[3]; }, 0), after = JOBS.reduce(function (t, j) { return t + j[4]; }, 0);
    return '<p class="eyebrow">Summary</p><h1 class="h1">The Outcome</h1><p class="lede">Seven tools that carry the practice day to day, so the admin no longer rests on one person. Everything else can be added when it is needed.</p>' +
      '<div class="grid g3" style="margin-bottom:1.6rem" data-tour="purposes">' + [
        ['Client Portal', 'One page per client: details, bookings and packages, billing, protocols, messages, notes, forms and documents.'],
        ['Shop', 'Orders wait for a person, then fill the supplier cart in one go. Prices stay behind login, as Physica requires.'],
        ['Client Report Creator', 'Upload the four scan files and get a finished report the same day, with claim language flagged and a practitioner sign-off.'],
        ['Booking Calendar', 'Clients book open times online; each Zoom meeting, invite and reminder goes out on its own.'],
        ['Packages', 'Recorded Review, Bioresonance Scan and the 12 Week Package, with the appointments each includes.'],
        ['Waivers & Forms', 'Write each waiver once. The right clients sign it in their portal and the copy is filed.'],
        ['Protocol Creator', 'Suggested from the report. You set what, how much and when; the client gets a schedule and reminders.']
      ].map(function (x) { return '<div class="card"><h3 class="h3" style="font-size:1.05rem">' + x[0] + '</h3><p class="small muted" style="margin:0">' + x[1] + '</p></div>'; }).join('') + '</div>' +
      '<h2 class="h2">Time back: about ' + before + ' hours a week of admin becomes ' + after + '</h2><div class="card"><p class="small muted" style="margin-top:0">Estimates for this pitch; we confirm them with the team before building.</p><div class="tablewrap"><table data-tour="jobs"><thead><tr><th>Job</th><th>How often</th><th>After the build</th><th class="r">Hours a week now</th><th class="r">After</th></tr></thead><tbody>' +
        JOBS.map(function (j) { return '<tr><td><b>' + esc(j[0]) + '</b><br><span class="small muted">' + esc(j[5]) + '</span></td><td>' + j[1] + '</td><td><span class="pill ' + HOW[j[2]][0] + '">' + HOW[j[2]][1] + '</span></td><td class="r">' + j[3] + '</td><td class="r">' + j[4] + '</td></tr>'; }).join('') +
        '<tr class="total"><td colspan="3"><b>Total</b></td><td class="r"><b>' + before + '</b></td><td class="r"><b>' + after + '</b></td></tr></tbody></table></div></div>' +
      '<h2 class="h2">Ready to add later, when you want them</h2><div class="later" data-tour="later">' + LATER.map(function (x) { return '<div class="card"><b>' + x[0] + '</b><p class="small muted" style="margin:.2rem 0 0">' + x[1] + '</p></div>'; }).join('') + '</div>' +
      '<p class="small muted" style="margin-top:.8rem">Most of these are already sketched in this prototype and switched off to keep things simple. Today the sample data lives in the browser; the build adds a proper database.</p>';
  }

  App.register('outcome', view, function () {});
})();
