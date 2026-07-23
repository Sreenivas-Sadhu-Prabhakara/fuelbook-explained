/* ============================================================
   fuelbook-explained — page behaviour.
   1. Tag <html> with .js so the CSS animation layer activates
      (no-JS visitors keep the fully-legible static states).
   2. Scroll-reveal: IntersectionObserver adds .in-view once.
   3. Every figure on the page is re-derived from the worked
      example in data/example.js — the same module the Node
      self-tests assert — so page numbers can never silently
      drift from the math.
   No network. No storage. No third-party anything.
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ---- figures from the single source of truth ---- */
  var X = typeof FUELBOOK_EXAMPLE !== 'undefined' ? FUELBOOK_EXAMPLE : null;
  if (X) {
    var d = X.derive(X.EXAMPLE_FILLS, X.EXAMPLE_EXPENSES);
    var figures = {
      seg1: d.segments[0].kmPerL.toFixed(2),
      seg2: d.segments[1].kmPerL.toFixed(2),
      lifetime: d.lifetime.toFixed(2),
      fuelkm: d.fuelPerKmRupees.toFixed(2),
      allinkm: d.allInPerKmRupees.toFixed(2),
      ppl: X.pricePerLitre(X.EXAMPLE_FILLS[1]).toFixed(2),
      l100: X.lPer100(d.segments[0].kmPerL).toFixed(2),
      trailavg: X.trailing3Avg(X.EXAMPLE_TREND).toFixed(2)
    };
    var nodes = document.querySelectorAll('[data-fig]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-fig');
      if (Object.prototype.hasOwnProperty.call(figures, key)) {
        nodes[i].textContent = figures[key];
      }
    }
  }

  /* ---- scroll reveal (adds .in-view once per section) ---- */
  var sections = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        for (var j = 0; j < entries.length; j++) {
          if (entries[j].isIntersecting) {
            entries[j].target.classList.add('in-view');
            io.unobserve(entries[j].target);
          }
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );
    for (var k = 0; k < sections.length; k++) io.observe(sections[k]);
  } else {
    for (var m = 0; m < sections.length; m++) sections[m].classList.add('in-view');
  }
})();
