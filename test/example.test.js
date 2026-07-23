'use strict';
/* Re-derive every figure shown on the explainer page by hand.
   Run with bare `node --test` (Node 20+). */

const test = require('node:test');
const assert = require('node:assert/strict');

const X = require('../data/example.js');
const { EXAMPLE_FILLS, EXAMPLE_EXPENSES, EXAMPLE_TREND } = X;

test('segment 1 (clean full-to-full): 410 km / 9.84 L = 41.67 km/L', () => {
  const d = X.derive(EXAMPLE_FILLS, EXAMPLE_EXPENSES);
  assert.equal(d.segments.length, 2);
  assert.equal(d.segments[0].km, 410);
  assert.equal(d.segments[0].ml, 9840);
  assert.equal(d.segments[0].kmPerL, 41.67);
  assert.equal(d.segments[0].includesPartial, false);
});

test('segment 2 folds the partial in: 400 km / (4.50+5.50) L = 40.00 km/L', () => {
  const d = X.derive(EXAMPLE_FILLS, EXAMPLE_EXPENSES);
  assert.equal(d.segments[1].km, 400);
  assert.equal(d.segments[1].ml, 10000);
  assert.equal(d.segments[1].kmPerL, 40);
  assert.equal(d.segments[1].includesPartial, true);
});

test('lifetime km/L = 810 / 19.84 = 40.83; first FULL litres excluded', () => {
  const d = X.derive(EXAMPLE_FILLS, EXAMPLE_EXPENSES);
  assert.equal(d.kmTotal, 810);
  assert.equal(d.mlTotal, 19840); // 9840 + 4500 + 5500 — NOT the first 9000
  assert.equal(d.lifetime, 40.83);
});

test('trailing 2026-02-25 PARTIAL (after last FULL) leaves lifetime unchanged', () => {
  const withoutTrailing = X.derive(EXAMPLE_FILLS.slice(0, 4), EXAMPLE_EXPENSES);
  const withTrailing = X.derive(EXAMPLE_FILLS, EXAMPLE_EXPENSES);
  assert.equal(withoutTrailing.lifetime, withTrailing.lifetime);
  assert.equal(withTrailing.lifetime, 40.83);
});

test('fuel cost/km = ₹2093.20 / 810 km = ₹2.58 (integer paise inside)', () => {
  const d = X.derive(EXAMPLE_FILLS, EXAMPLE_EXPENSES);
  assert.equal(d.fuelPaise, 103320 + 47700 + 58300); // 209320 paise
  assert.equal(d.fuelPerKmRupees, 2.58);
});

test('all-in cost/km adds only in-window expenses: (2093.20+1200)/810 = ₹4.07', () => {
  const d = X.derive(EXAMPLE_FILLS, EXAMPLE_EXPENSES);
  assert.equal(d.expensePaise, 120000); // service in window
  assert.equal(d.excludedExpenses.length, 1); // ₹4000 insurance dated 2026-03-01
  assert.equal(d.excludedExpenses[0].kind, 'insurance');
  assert.equal(d.allInPerKmRupees, 4.07);
});

test('derived price per litre for the 2026-01-18 fill = ₹105.00', () => {
  assert.equal(X.pricePerLitre(EXAMPLE_FILLS[1]), 105);
});

test('unit conversions: 41.67 km/L → 2.40 L/100km; 300 mi / 9.375 gal = 32.00 mpg', () => {
  assert.equal(X.lPer100(41.67), 2.4);
  assert.equal(X.mpg(300, 9.375), 32);
});

test('trend flag: >10% below trailing average fires, smaller dips do not', () => {
  assert.equal(X.trendFlag(44, 50), true);      // 12% drop
  assert.equal(X.trendFlag(40, 41.67), false);  // 4.01% drop
});

test('page trend example: latest 37.2 is >10% below trailing-3 avg 41.57', () => {
  const avg = X.trailing3Avg(EXAMPLE_TREND);
  assert.equal(avg, 41.57); // (40.9 + 41.8 + 42.0) / 3
  assert.equal(X.trendFlag(EXAMPLE_TREND[EXAMPLE_TREND.length - 1], avg), true);
});

test('honest refusal: fewer than two FULL fills yields null with a reason', () => {
  const onlyPartials = EXAMPLE_FILLS.map((f) => ({ ...f, full: false }));
  assert.equal(X.derive(onlyPartials, []).lifetime, null);
  assert.equal(X.derive(onlyPartials, []).reason, 'need two full fills');
  const oneFull = [EXAMPLE_FILLS[0], EXAMPLE_FILLS[2]];
  assert.equal(X.derive(oneFull, []).lifetime, null);
});

test('property: over 500 seeded random logs, segment km/ml sum to the lifetime window', () => {
  // deterministic mulberry32
  let s = 0xC0FFEE;
  const rnd = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let round = 0; round < 500; round++) {
    const n = 2 + Math.floor(rnd() * 10);
    const fills = [];
    let odo = 10000;
    for (let i = 0; i < n; i++) {
      odo += 50 + Math.floor(rnd() * 400);
      fills.push({
        date: '2026-01-01',
        odoKm: odo,
        ml: 1000 + Math.floor(rnd() * 9000),
        paise: 10000 + Math.floor(rnd() * 90000),
        full: i === 0 || i === n - 1 ? true : rnd() < 0.6
      });
    }
    const d = X.derive(fills, []);
    const segKm = d.segments.reduce((a, sg) => a + sg.km, 0);
    const segMl = d.segments.reduce((a, sg) => a + sg.ml, 0);
    const segPaise = d.segments.reduce((a, sg) => a + sg.paise, 0);
    assert.equal(segKm, d.kmTotal);
    assert.equal(segMl, d.mlTotal);
    assert.equal(segPaise, d.fuelPaise);
    assert.equal(Number.isInteger(segPaise), true);
  }
});
