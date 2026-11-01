// Regression test for the month/lifetime aggregation race.
//
// The panel can fire more than one summary request at once (mount + refresh).
// The Host accumulated history into a shared cache; without a single-flight
// guard every concurrent request added the same 31-day windows again, so the
// month table and the lifetime totals showed 2x/3x the real values.
//
// Run with: node test/aggregation-race.test.mjs
import { monthlyTotals, lifetimeTotals } from '../lib/index.js';

const TZ = 8 * 3600; // +08:00
const DAY = 86400;
const ORIGIN = 'https://example.invalid';
const COST_PER_DAY = 0.01;
const TOKENS_PER_DAY = 1000;
const REQUESTS_PER_DAY = 1;

function localEpoch(dateText) {
  return Math.floor(new Date(`${dateText}T00:00:00+08:00`).getTime() / 1000);
}

function dayBuckets(start, end) {
  const times = [];
  for (let time = start; time < end; time += DAY) times.push(time);
  return times;
}

globalThis.fetch = async (url) => {
  const parsed = new URL(url);
  const start = Number(parsed.searchParams.get('start'));
  const end = Number(parsed.searchParams.get('end'));
  const times = dayBuckets(start, end);
  const isAmount = parsed.pathname.endsWith('/amount');
  const biz = isAmount
    ? {
        series: [{
          model: 'mock',
          api_key: { name: 'mock-key' },
          buckets: times.map((time) => ({
            time,
            usage: {
              REQUEST: REQUESTS_PER_DAY,
              PROMPT_CACHE_HIT_TOKEN: TOKENS_PER_DAY,
              PROMPT_CACHE_MISS_TOKEN: 0,
              RESPONSE_TOKEN: 0
            }
          }))
        }]
      }
    : {
        data: [{
          currency: 'CNY',
          series: [{
            model: 'mock',
            api_key: { name: 'mock-key' },
            buckets: times.map((time) => ({ time, cost: COST_PER_DAY }))
          }]
        }]
      };
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify({ code: 0, data: { biz_code: 0, biz_data: biz } });
    }
  };
};

const since = localEpoch('2026-09-04');
const dayStart = localEpoch('2026-11-01');
// Sep 4-30 (27) + Oct (31) + Nov 1, today's bucket added separately (1)
const expectedDays = 27 + 31 + 1;
const expectedCost = +(expectedDays * COST_PER_DAY).toFixed(4);
const expectedTokens = expectedDays * TOKENS_PER_DAY;
const expectedRequests = expectedDays * REQUESTS_PER_DAY;

let failures = 0;
function check(label, actual, expected) {
  const ok = Math.abs(actual - expected) < 1e-9;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual} (expected ${expected})`);
  if (!ok) failures += 1;
}

function rollup(months) {
  const cost = months.reduce((sum, month) => sum + month.cost.reduce((s, c) => s + c.amount, 0), 0);
  return {
    cost: +cost.toFixed(4),
    tokens: months.reduce((sum, month) => sum + month.tokens, 0),
    requests: months.reduce((sum, month) => sum + month.requests, 0)
  };
}

// Three requests racing, like the panel opening while a refresh is in flight.
const concurrent = await Promise.all([
  monthlyTotals(ORIGIN, 'token', TZ, since, dayStart, ''),
  monthlyTotals(ORIGIN, 'token', TZ, since, dayStart, ''),
  monthlyTotals(ORIGIN, 'token', TZ, since, dayStart, '')
]);
for (const result of concurrent) {
  const total = rollup(result);
  check('concurrent monthly cost', total.cost, expectedCost);
  check('concurrent monthly tokens', total.tokens, expectedTokens);
  check('concurrent monthly requests', total.requests, expectedRequests);
}

const later = rollup(await monthlyTotals(ORIGIN, 'token', TZ, since, dayStart, ''));
check('monthly after refresh', later.cost, expectedCost);

const life = await lifetimeTotals(ORIGIN, 'token', TZ, since, dayStart);
check('lifetime requests', life.requests, expectedRequests);
check('lifetime tokens', life.tokens, expectedTokens);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\naggregation race test passed');
