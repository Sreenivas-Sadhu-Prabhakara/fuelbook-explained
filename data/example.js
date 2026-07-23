/* ============================================================
   fuelbook-explained — the single worked example used on the page.
   All amounts are INTEGER minor units: paise (₹ × 100) and
   millilitres (L × 1000). Dates are ISO YYYY-MM-DD strings.
   This is a clearly-invented demonstration log (labelled
   "worked example" everywhere on the page) — not real prices,
   not a real vehicle. The derivations below re-implement the
   full-to-full method exactly as the live fuelbook app states it,
   and test/example.test.js re-derives every figure by hand.
   Works in both the browser (global FUELBOOK_EXAMPLE) and Node.
   ============================================================ */

const EXAMPLE_FILLS = [
  // { date, odoKm, ml, paise, full }
  { date: '2026-01-05', odoKm: 12000, ml: 9000, paise: 94500,  full: true  },
  { date: '2026-01-18', odoKm: 12410, ml: 9840, paise: 103320, full: true  },
  { date: '2026-02-02', odoKm: 12600, ml: 4500, paise: 47700,  full: false },
  { date: '2026-02-14', odoKm: 12810, ml: 5500, paise: 58300,  full: true  },
  { date: '2026-02-25', odoKm: 12980, ml: 4000, paise: 42400,  full: false }
];

const EXAMPLE_EXPENSES = [
  { date: '2026-01-25', kind: 'service',   paise: 120000 },
  { date: '2026-03-01', kind: 'insurance', paise: 400000 }
];

/* Demo trend tanks (km/L, one per full-to-full segment) for the
   trend-chart section — invented, labelled as a worked example. */
const EXAMPLE_TREND = [43.1, 41.6, 42.4, 40.9, 41.8, 42.0, 37.2];

function round2(x) { return Math.round(x * 100) / 100; }

/* km/L from integer km and integer millilitres. */
function kmPerL(km, ml) { return round2((km * 1000) / ml); }

/* L/100km display from a km/L figure. */
function lPer100(kpl) { return round2(100 / kpl); }

/* mpg for the mi+gal unit mode. */
function mpg(miles, gallons) { return round2(miles / gallons); }

/* Neutral trend prompt: latest tank more than 10% below the
   trailing average of the previous three tanks. */
function trendFlag(latest, trailingAvg) {
  return trailingAvg > 0 && latest < trailingAvg * 0.9;
}

function trailing3Avg(tanks) {
  const prev = tanks.slice(-4, -1);
  return round2(prev.reduce((a, b) => a + b, 0) / prev.length);
}

/* The full-to-full engine, exactly as the fuelbook method card
   states it: a segment runs between consecutive FULL fills;
   partials in between are folded into that segment; entries
   before the first FULL or after the last FULL are excluded. */
function derive(fills, expenses) {
  const fullIdx = [];
  fills.forEach((f, i) => { if (f.full) fullIdx.push(i); });

  if (fullIdx.length < 2) {
    return { segments: [], lifetime: null, reason: 'need two full fills' };
  }

  const segments = [];
  for (let k = 1; k < fullIdx.length; k++) {
    const a = fullIdx[k - 1];
    const b = fullIdx[k];
    const km = fills[b].odoKm - fills[a].odoKm;
    let ml = 0;
    let paise = 0;
    let includesPartial = false;
    for (let i = a + 1; i <= b; i++) {
      ml += fills[i].ml;
      paise += fills[i].paise;
      if (!fills[i].full) includesPartial = true;
    }
    segments.push({ km, ml, paise, includesPartial, kmPerL: kmPerL(km, ml) });
  }

  const first = fullIdx[0];
  const last = fullIdx[fullIdx.length - 1];
  const kmTotal = fills[last].odoKm - fills[first].odoKm;
  let mlTotal = 0;
  let fuelPaise = 0;
  for (let i = first + 1; i <= last; i++) {
    mlTotal += fills[i].ml;
    fuelPaise += fills[i].paise;
  }

  const winStart = fills[first].date;
  const winEnd = fills[last].date;
  let expensePaise = 0;
  const excludedExpenses = [];
  for (const e of expenses) {
    if (e.date >= winStart && e.date <= winEnd) expensePaise += e.paise;
    else excludedExpenses.push(e);
  }

  return {
    segments,
    windowStart: winStart,
    windowEnd: winEnd,
    kmTotal,
    mlTotal,
    fuelPaise,
    expensePaise,
    excludedExpenses,
    lifetime: kmPerL(kmTotal, mlTotal),
    fuelPaisePerKm: fuelPaise / kmTotal,
    allInPaisePerKm: (fuelPaise + expensePaise) / kmTotal,
    fuelPerKmRupees: round2(fuelPaise / kmTotal / 100),
    allInPerKmRupees: round2((fuelPaise + expensePaise) / kmTotal / 100)
  };
}

/* Derived price per litre for one fill, in rupees (2 dp). */
function pricePerLitre(fill) {
  return round2(fill.paise / 100 / (fill.ml / 1000));
}

const FUELBOOK_EXAMPLE = {
  EXAMPLE_FILLS,
  EXAMPLE_EXPENSES,
  EXAMPLE_TREND,
  round2,
  kmPerL,
  lPer100,
  mpg,
  trendFlag,
  trailing3Avg,
  derive,
  pricePerLitre
};

if (typeof module !== 'undefined') module.exports = FUELBOOK_EXAMPLE;
