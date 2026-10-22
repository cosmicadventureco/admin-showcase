/* Root Cause Clinic showcase - Outcome.
 *
 * The case for the build, kept apart from the working screens: the seven
 * tools it starts with, in menu order, and what can be added later when the
 * business needs it.
 */
(function () {
  'use strict';

  var LATER = [
    ['Newsletters', 'Goal-based emails from questionnaire answers.'],
    ['Video library', 'Free classes and short-course sales in one place.'],
    ['Shared work queue', 'One to-do list for the whole team, with roles.'],
    ['Quotes and agreements', 'Retreat partnerships, signed online.'],
    ['WPMP Course', 'Integrate the current course into the client portal.']
  ];

  function view() {
    return '<p class="eyebrow">Summary</p><h1 class="h1">The Outcome</h1><p class="lede">Seven tools that carry the practice day to day, so the admin no longer rests on one person. Everything else can be added when it is needed.</p>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));margin-bottom:1.6rem" data-tour="purposes">' + [
        ['Client Portal', 'One page per client: details, bookings and packages, billing, protocols, messages, notes, forms and documents.'],
        ['Shop', 'Orders wait for a person, then fill the supplier cart in one go. Prices stay behind login, as Physica requires.'],
        ['Client Report Creator', 'Upload the four scan files and get a finished report the same day, with claim language flagged and a practitioner sign-off.'],
        ['Protocol Creator', 'Suggested from the report. You set what, how much and when; the client gets a schedule and reminders.'],
        ['Booking Calendar', 'Clients book open times online; each Zoom meeting, invite and reminder goes out on its own.'],
        ['Packages', 'Recorded Review, Bioresonance Scan and the 12 Week Package, with the appointments each includes.'],
        ['Waivers & Forms', 'Write each waiver once. The right clients sign it in their portal and the copy is filed.']
      ].map(function (x) { return '<div class="card"><h3 class="h3" style="font-size:1.05rem">' + x[0] + '</h3><p class="small muted" style="margin:0">' + x[1] + '</p></div>'; }).join('') + '</div>' +
      '<h2 class="h2">Ready to add later, when you want them</h2><div class="later" data-tour="later">' + LATER.map(function (x) { return '<div class="card"><b>' + x[0] + '</b><p class="small muted" style="margin:.2rem 0 0">' + x[1] + '</p></div>'; }).join('') + '</div>' +
      '<p class="small muted" style="margin-top:.8rem">Most of these are already sketched in this prototype and switched off to keep things simple. Today the sample data lives in the browser; the build adds a proper database.</p>';
  }

  App.register('outcome', view, function () {});
})();
