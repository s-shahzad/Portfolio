/* Google Analytics bootstrap for the pages that do NOT load script.min.js.
   SHA-164 (#58).

   WHY THIS FILE EXISTS
   --------------------
   GA needs two halves to record anything:

     1. the loader  <script src="googletagmanager.com/gtag/js?id=G-3CN94DG5LY">
     2. the config  gtag("js", ...) + gtag("config", "G-3CN94DG5LY")

   Before this change the site had them in only one place each. The loader tag
   sat in index.html alone, and the config lived inside script.js (bundled into
   script.min.js). So:

     index.html          loader + script.min.js  -> GA worked
     research/index.html script.min.js, NO loader -> config pushed into
                         dataLayer with nothing to consume it: zero hits
     everything else     neither half            -> nothing at all

   That is why analytics could not see the pages the audit says people bounce
   off. The audit called it "GA runs only on the homepage"; the more exact
   statement is that /research/ was half-wired and looked instrumented.

   WHY A FILE AND NOT AN INLINE SNIPPET
   ------------------------------------
   The site-wide CSP in netlify.toml is

     script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com

   with no 'unsafe-inline' and no nonce. Google's copy-paste gtag snippet is an
   inline <script>, so pasting it would be silently blocked — which is exactly
   what happened to the now-deleted cyber-demo.html. Served from /assets/ this
   is 'self', so it runs under the existing policy and needs no CSP edit.

   WHERE THIS IS INCLUDED
   ----------------------
   Only on pages that do NOT load script.min.js: 404.html, privacy.html,
   detections/index.html, both case-studies/*.html, projects/nids/index.html.
   index.html and research/index.html get the config from script.min.js and
   must NOT also load this file, or every visit would be counted twice. The
   guard below makes a mistaken double-include harmless, but it cannot see the
   copy inside script.min.js — that separation is maintained by hand until the
   next bundle rebuild can move the config out of script.js entirely. */

(function () {
  "use strict";

  // Matches script.js: never report from a dev machine.
  var host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;

  // Idempotence guard, so a second <script> tag pointing here cannot
  // double-count a pageview.
  if (window.__gaBootstrapped) return;
  window.__gaBootstrapped = true;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  window.gtag("js", new Date());
  window.gtag("config", "G-3CN94DG5LY");
})();
