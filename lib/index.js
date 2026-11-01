/**
 * In-app cumulative usage panel — Host half.
 *
 * Why this package exists
 * -----------------------
 * The account card's 查询用量 link opens `platform.deepseek.com/usage` inside an
 * Electron `WebContentsView`. The Platform page detects the DSH bridge
 * (`window.dsh`) and, in that embedded mode, queries ONLY the account's single
 * `key_type === "DSH"` key — it has no key selector. An install that bills a
 * different key (the normal API key in `DEEPSEEK_API_KEY`) therefore always sees
 * zero, while the public site (non-embedded) lists every key.
 *
 * The Platform page is server-served and `app.asar` is hash-pinned, so instead of
 * rewriting either, this plugin answers the same numbers from the Host: it holds
 * the account grant, calls `/api/v0/usage/by_api_key/{amount,cost}` WITHOUT a key
 * filter, and returns one aggregated payload. The client half renders it in-app.
 *
 * The account token never leaves the Host: the route returns numbers only.
 */

/** Exact path the client half fetches. */
const ROUTE = "/usage-overview/summary";

/** Accepted range presets; anything else falls back to 30 days. */
const RANGES = new Set(["today", "7d", "30d", "lastMonth"]);

/** Upstream calls are cheap but not free; collapse repeat opens. */
const CACHE_MS = 30_000;

/** Upstream request deadline. */
const UPSTREAM_TIMEOUT_MS = 20_000;

/** `${range}|${key}` -> { at, value } */
const cache = new Map();

/**
 * The Platform rejects a single usage query wider than 31 day-aligned days
 * (`INVALID_PARAM` from 32 days up), so an all-time total has to be summed from
 * consecutive windows. `bucket` is not a way around it — the parameter is
 * ignored and a coarser bucket is rejected too.
 */
const MAX_SPAN_SECONDS = 31 * 86400;

/** How many windows of the all-time backfill are fetched at once. */
const LIFETIME_CONCURRENCY = 8;

/** Stops a pathological history from looping forever (240 x 31 days ≈ 20 years). */
const MAX_LIFETIME_CHUNKS = 240;

/** Today's bucket is re-read at most this often so fresh usage shows up. */
const TODAY_TTL_MS = 60_000;

/** `{ since, through, requests, tokens }` — everything before today, accumulated. */
let lifetimeState = null;

/** `{ dayStart, at, requests, tokens }` — today's bucket, re-read on a short TTL. */
let todayState = null;

/** `${since}|${key}` -> `{ through, months: Map<'YYYY-MM', rollup> }` — history, up to today. */
const monthlyStates = new Map();

/** `${dayStart}|${key}` -> today's slice of its month, re-read on the same short TTL. */
const monthlyToday = new Map();

function num(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

/** Offset of the local zone in seconds east, which is what the Platform expects. */
function tzSecondsEast() {
  return -new Date().getTimezoneOffset() * 60;
}

/**
 * Epoch seconds for 00:00 of one local-zone calendar day, matching the Platform
 * page: `Date.UTC(y, m-1, d)/1000 - tz`. Day-aligned bounds are mandatory —
 * unaligned ones are rejected with `INVALID_PARAM`.
 */
function dayEpoch(year, month, day, tz) {
  return Date.UTC(year, month - 1, day) / 1000 - tz;
}

/** start/end epoch seconds for one preset, with `end` exclusive. */
function rangeWindow(range, tz) {
  const shifted = new Date((Math.floor(Date.now() / 1000) + tz) * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  if (range === "today") {
    return { start: dayEpoch(y, m, d, tz), end: dayEpoch(y, m, d, tz) + 86400 };
  }
  if (range === "7d") {
    return { start: dayEpoch(y, m, d - 6, tz), end: dayEpoch(y, m, d, tz) + 86400 };
  }
  if (range === "lastMonth") {
    return { start: dayEpoch(y, m - 1, 1, tz), end: dayEpoch(y, m, 1, tz) };
  }
  return { start: dayEpoch(y, m, d - 29, tz), end: dayEpoch(y, m, d, tz) + 86400 };
}

/** `YYYY-MM` -> the local-zone day the month starts and the day the next one starts. */
function monthWindow(month) {
  const [yearText, monthText] = String(month).split("-");
  const year = Number(yearText);
  const index = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(index) || index < 1 || index > 12) return null;
  if (year < 2000 || year > 2100) return null;
  const tz = tzSecondsEast();
  return { start: dayEpoch(year, index, 1, tz), end: dayEpoch(year, index + 1, 1, tz) };
}

/** Local calendar date (`YYYY-MM-DD`) of one bucket boundary. */
function localDateOf(epochSeconds, tz) {
  return new Date((Number(epochSeconds) + tz) * 1000).toISOString().slice(0, 10);
}

/** Every local calendar date covered by the window, oldest first. */
function datesOf(start, end, tz) {
  const dates = [];
  for (let at = start; at < end; at += 86400) dates.push(localDateOf(at, tz));
  return dates;
}

// ---- all-time totals ------------------------------------------------------
//
// There is no Platform aggregate for lifetime tokens/requests: `get_user_summary`
// reports only money (`total_costs`). So the all-time figures are summed from
// consecutive 31-day windows, starting at the day the account's first API key
// was created. Verified against independent per-month queries.

/** Requests and tokens inside one usage payload. */
function sumUsage(biz) {
  let requests = 0;
  let tokens = 0;
  for (const series of biz?.series ?? []) {
    for (const bucket of series?.buckets ?? []) {
      const usage = bucket?.usage ?? {};
      requests += num(usage.REQUEST);
      tokens += num(usage.PROMPT_CACHE_HIT_TOKEN) + num(usage.PROMPT_CACHE_MISS_TOKEN) + num(usage.RESPONSE_TOKEN);
    }
  }
  return { requests, tokens };
}

/** Local-zone day start of the earliest API-key creation, or null without keys. */
function lifetimeSince(apiKeys, tz) {
  let earliest = null;
  for (const key of apiKeys ?? []) {
    const created = Number(key?.created_at);
    if (!Number.isFinite(created) || created <= 0) continue;
    if (earliest === null || created < earliest) earliest = created;
  }
  if (earliest === null) return null;
  const local = new Date((earliest + tz) * 1000);
  return dayEpoch(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), tz);
}

/** Split `[from, to)` into day-aligned windows the Platform will accept. */
function lifetimeWindows(from, to) {
  const windows = [];
  let cursor = from;
  while (cursor < to && windows.length < MAX_LIFETIME_CHUNKS) {
    const end = Math.min(cursor + MAX_SPAN_SECONDS, to);
    windows.push({ start: cursor, end });
    cursor = end;
  }
  return windows;
}

function usageAmountPath(start, end, tz) {
  return `/api/v0/usage/by_api_key/amount?${new URLSearchParams({
    start: String(start),
    end: String(end),
    tz: String(tz)
  }).toString()}`;
}

/** Sum several windows, a few requests in flight at a time. */
async function sumWindows(origin, token, tz, windows) {
  let requests = 0;
  let tokens = 0;
  for (let index = 0; index < windows.length; index += LIFETIME_CONCURRENCY) {
    const batch = windows.slice(index, index + LIFETIME_CONCURRENCY);
    const payloads = await Promise.all(
      batch.map((window) => platformGet(origin, token, usageAmountPath(window.start, window.end, tz), tz))
    );
    for (const payload of payloads) {
      const part = sumUsage(payload);
      requests += part.requests;
      tokens += part.tokens;
    }
  }
  return { requests, tokens };
}

/**
 * All-time requests/tokens up to `dayStart`, plus today's bucket.
 *
 * History before today is accumulated once per process and then extended by the
 * missing days only; today is re-read on a short TTL, so usage within the
 * current day still appears without double counting.
 */
async function lifetimeTotals(origin, token, tz, since, dayStart) {
  if (lifetimeState === null || lifetimeState.since !== since) {
    lifetimeState = { since, through: since, requests: 0, tokens: 0 };
  }
  if (lifetimeState.through < dayStart) {
    const windows = lifetimeWindows(lifetimeState.through, dayStart);
    const part = await sumWindows(origin, token, tz, windows);
    lifetimeState = {
      since,
      through: windows.length === 0 ? dayStart : windows[windows.length - 1].end,
      requests: lifetimeState.requests + part.requests,
      tokens: lifetimeState.tokens + part.tokens
    };
  }

  if (todayState === null || todayState.dayStart !== dayStart || Date.now() - todayState.at >= TODAY_TTL_MS) {
    const today = await sumWindows(origin, token, tz, [{ start: dayStart, end: dayStart + 86400 }]);
    todayState = { dayStart, at: Date.now(), requests: today.requests, tokens: today.tokens };
  }

  return {
    requests: lifetimeState.requests + todayState.requests,
    tokens: lifetimeState.tokens + todayState.tokens
  };
}

/** `YYYY-MM` of one bucket boundary in the local zone. */
function monthOf(epochSeconds, tz) {
  return localDateOf(epochSeconds, tz).slice(0, 7);
}

/** Sum one usage payload's buckets into `months`. */
function addUsageToMonths(months, biz, tz) {
  for (const series of biz?.series ?? []) {
    for (const bucket of series?.buckets ?? []) {
      const month = monthOf(bucket?.time, tz);
      if (!/^\d{4}-\d{2}$/.test(month)) continue;
      let row = months.get(month);
      if (row === undefined) {
        row = createRollup();
        months.set(month, row);
      }
      const usage = bucket?.usage ?? {};
      row.requests += num(usage.REQUEST);
      row.tokens +=
        num(usage.PROMPT_CACHE_HIT_TOKEN) + num(usage.PROMPT_CACHE_MISS_TOKEN) + num(usage.RESPONSE_TOKEN);
    }
  }
}

/** Sum one cost payload's buckets into `months`. */
function addCostToMonths(months, biz, tz) {
  for (const group of biz?.data ?? []) {
    const currency = typeof group?.currency === "string" ? group.currency : "CNY";
    for (const series of group?.series ?? []) {
      for (const bucket of series?.buckets ?? []) {
        const amount = num(bucket?.cost);
        if (amount === 0) continue;
        const month = monthOf(bucket?.time, tz);
        if (!/^\d{4}-\d{2}$/.test(month)) continue;
        let row = months.get(month);
        if (row === undefined) {
          row = createRollup();
          months.set(month, row);
        }
        row.cost.set(currency, (row.cost.get(currency) ?? 0) + amount);
      }
    }
  }
}

/** Both Platform payloads for one day-aligned window, honouring the key filter. */
async function usagePair(origin, token, tz, start, end, key) {
  const query = new URLSearchParams({ start: String(start), end: String(end), tz: String(tz) });
  if (key !== "") query.set("api_key_tracking_id", key);
  const suffix = query.toString();
  const [amountBiz, costBiz] = await Promise.all([
    platformGet(origin, token, `/api/v0/usage/by_api_key/amount?${suffix}`, tz),
    platformGet(origin, token, `/api/v0/usage/by_api_key/cost?${suffix}`, tz)
  ]);
  return { amountBiz, costBiz };
}

/**
 * Month by month since the account's first key: requests, tokens and spend.
 *
 * History up to today is accumulated once and extended by the missing windows;
 * today is re-read on a short TTL so the current month keeps moving. Everything
 * is bounded by the same 31-day window rule as the lifetime backfill.
 */
async function monthlyTotals(origin, token, tz, since, dayStart, key) {
  const stateKey = `${since}|${key}`;
  let state = monthlyStates.get(stateKey);
  if (state === undefined) {
    state = { through: since, months: new Map() };
    monthlyStates.set(stateKey, state);
  }
  if (state.through < dayStart) {
    const windows = lifetimeWindows(state.through, dayStart);
    for (let index = 0; index < windows.length; index += LIFETIME_CONCURRENCY) {
      const batch = windows.slice(index, index + LIFETIME_CONCURRENCY);
      const pairs = await Promise.all(
        batch.map((window) => usagePair(origin, token, tz, window.start, window.end, key))
      );
      for (const pair of pairs) {
        addUsageToMonths(state.months, pair.amountBiz, tz);
        addCostToMonths(state.months, pair.costBiz, tz);
      }
    }
    state.through = windows.length === 0 ? dayStart : windows[windows.length - 1].end;
  }

  const todayKey = `${dayStart}|${key}`;
  let today = monthlyToday.get(todayKey);
  if (today === undefined || Date.now() - today.at >= TODAY_TTL_MS) {
    const pair = await usagePair(origin, token, tz, dayStart, dayStart + 86400, key);
    const probe = new Map();
    addUsageToMonths(probe, pair.amountBiz, tz);
    addCostToMonths(probe, pair.costBiz, tz);
    const month = monthOf(dayStart, tz);
    const row = probe.get(month) ?? createRollup();
    today = { at: Date.now(), month, requests: row.requests, tokens: row.tokens, cost: new Map(row.cost) };
    monthlyToday.set(todayKey, today);
  }

  const merged = new Map();
  for (const [month, row] of state.months) {
    merged.set(month, { requests: row.requests, tokens: row.tokens, cost: new Map(row.cost) });
  }
  const current = merged.get(today.month) ?? createRollup();
  current.requests += today.requests;
  current.tokens += today.tokens;
  for (const [currency, amount] of today.cost) {
    current.cost.set(currency, (current.cost.get(currency) ?? 0) + amount);
  }
  merged.set(today.month, current);

  return [...merged.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([month, row]) => ({
      month,
      requests: row.requests,
      tokens: row.tokens,
      cost: costArray(row.cost)
    }));
}

/** Human label for one api_key descriptor in the usage series. */
function keyLabel(apiKey) {
  if (apiKey === null || typeof apiKey !== "object") return "";
  const name = typeof apiKey.name === "string" ? apiKey.name.trim() : "";
  if (name !== "") return name;
  const sensitive = typeof apiKey.sensitive_id === "string" ? apiKey.sensitive_id : "";
  return sensitive;
}

function isLoopbackAddress(address) {
  if (typeof address !== "string") return false;
  const plain = address.startsWith("::ffff:") ? address.slice(7) : address;
  return plain === "::1" || /^127\./.test(plain);
}

/**
 * The route reads the signed-in account's billing data, so it only answers
 * requests that arrived on loopback with a loopback Host — the check that stops
 * a rebinding hostname from reaching it.
 */
function isLoopbackRequest(req) {
  if (!isLoopbackAddress(req.socket?.remoteAddress)) return false;
  const host = String(req.headers?.host ?? "");
  const hostname = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.split(":")[0];
  return hostname === "localhost" || hostname === "::1" || /^127\./.test(hostname);
}

/** One authenticated Platform GET; returns `data.biz_data` or throws. */
async function platformGet(origin, token, path, tz) {
  const headers = {
    "x-dsh-auth-token": token,
    "x-client-bundle-id": "",
    "x-client-platform": "desktop-win",
    "x-client-version": "0.2.1-rc.2",
    "x-client-locale": "zh_CN",
    "x-client-timezone-offset": String(tz),
    accept: "application/json"
  };
  const response = await fetch(origin + path, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  const body = await response.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    json = undefined;
  }
  if (!response.ok) throw new Error(`platform HTTP ${String(response.status)}`);
  if (json === undefined) throw new Error("platform returned a non-JSON body");
  if (json.code !== 0) throw new Error(`platform code ${String(json.code)}`);
  const data = json.data;
  if (data?.biz_code !== 0) {
    throw new Error(`platform biz_code ${String(data?.biz_code)} ${String(data?.biz_msg ?? "")}`.trim());
  }
  return data?.biz_data;
}

function createRollup() {
  return { requests: 0, tokens: 0, cost: new Map() };
}

function addRollup(map, label, requests, tokens) {
  if (label === "") return;
  let row = map.get(label);
  if (row === undefined) {
    row = createRollup();
    map.set(label, row);
  }
  row.requests += requests;
  row.tokens += tokens;
}

function addCost(map, label, currency, amount) {
  if (label === "" || amount === 0) return;
  let row = map.get(label);
  if (row === undefined) {
    row = createRollup();
    map.set(label, row);
  }
  row.cost.set(currency, (row.cost.get(currency) ?? 0) + amount);
}

function costArray(map) {
  return [...map.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => ({ currency, amount: round6(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

/** Wallet list from `get_user_summary`, as `[{ currency, amount }]`. */
function walletList(wallets) {
  return (wallets ?? [])
    .map((wallet) => ({ currency: String(wallet?.currency ?? ""), amount: round6(num(wallet?.balance)) }))
    .filter((wallet) => wallet.currency !== "");
}

/** Turn the two Platform payloads into the single shape the panel renders. */
function summarize(amountBiz, costBiz, range, tz) {
  const totals = { requests: 0, cacheHitTokens: 0, cacheMissTokens: 0, responseTokens: 0, tokens: 0 };
  const byModel = new Map();
  const byKey = new Map();
  const keyCost = new Map();
  const modelCost = new Map();
  const currencyTotals = new Map();
  const daily = new Map();

  for (const series of amountBiz?.series ?? []) {
    const model = typeof series?.model === "string" ? series.model : "unknown";
    const key = keyLabel(series?.api_key);
    let requests = 0;
    let tokens = 0;
    for (const bucket of series?.buckets ?? []) {
      const usage = bucket?.usage ?? {};
      const requestsHere = num(usage.REQUEST);
      const tokensHere =
        num(usage.PROMPT_CACHE_HIT_TOKEN) + num(usage.PROMPT_CACHE_MISS_TOKEN) + num(usage.RESPONSE_TOKEN);
      requests += requestsHere;
      tokens += tokensHere;
      totals.requests += requestsHere;
      totals.cacheHitTokens += num(usage.PROMPT_CACHE_HIT_TOKEN);
      totals.cacheMissTokens += num(usage.PROMPT_CACHE_MISS_TOKEN);
      totals.responseTokens += num(usage.RESPONSE_TOKEN);
      const date = localDateOf(bucket?.time, tz);
      let row = daily.get(date);
      if (row === undefined) {
        row = createRollup();
        daily.set(date, row);
      }
      row.requests += requestsHere;
      row.tokens += tokensHere;
    }
    addRollup(byModel, model, requests, tokens);
    addRollup(byKey, key, requests, tokens);
  }

  for (const group of costBiz?.data ?? []) {
    const currency = typeof group?.currency === "string" ? group.currency : "CNY";
    for (const series of group?.series ?? []) {
      const model = typeof series?.model === "string" ? series.model : "unknown";
      const key = keyLabel(series?.api_key);
      let amount = 0;
      for (const bucket of series?.buckets ?? []) {
        const here = num(bucket?.cost);
        amount += here;
        const date = localDateOf(bucket?.time, tz);
        let row = daily.get(date);
        if (row === undefined) {
          row = createRollup();
          daily.set(date, row);
        }
        row.cost.set(currency, (row.cost.get(currency) ?? 0) + here);
      }
      addCost(modelCost, model, currency, amount);
      addCost(keyCost, key, currency, amount);
      currencyTotals.set(currency, (currencyTotals.get(currency) ?? 0) + amount);
    }
  }

  totals.tokens = totals.cacheHitTokens + totals.cacheMissTokens + totals.responseTokens;

  const rows = (map, costMap) =>
    [...map.entries()]
      .map(([label, row]) => ({
        label,
        requests: row.requests,
        tokens: row.tokens,
        cost: costArray(costMap.get(label)?.cost ?? new Map())
      }))
      .sort((a, b) => b.tokens - a.tokens);

  return {
    range,
    totals,
    cost: costArray(currencyTotals),
    daily: [...daily.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, row]) => ({ date, requests: row.requests, tokens: row.tokens, cost: costArray(row.cost) })),
    byModel: rows(byModel, modelCost),
    byKey: rows(byKey, keyCost)
  };
}

export const name = "usage-overview";

export function apply(ctx) {
  ctx.inject(["webServer"], (scope) => {
    const handler = async (req, res) => {
      const send = (status, payload) => {
        res
          .writeHead(status, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store"
          })
          .end(JSON.stringify(payload));
      };
      try {
        if (!isLoopbackRequest(req)) return send(403, { error: "forbidden" });
        if (req.method !== "GET") return send(405, { error: "method-not-allowed" });

        let url;
        try {
          url = new URL(req.url ?? "/", "http://127.0.0.1");
        } catch {
          return send(400, { error: "bad-request" });
        }
        const requested = url.searchParams.get("range");
        const requestedMonth = (url.searchParams.get("month") ?? "").trim();
        const month = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : "";
        const monthBounds = month === "" ? null : monthWindow(month);
        const range = requested !== null && RANGES.has(requested) ? requested : "30d";
        const requestedKey = (url.searchParams.get("key") ?? "").trim();
        const key = /^[A-Za-z0-9._:-]{1,128}$/.test(requestedKey) ? requestedKey : "";
        const fresh = url.searchParams.get("fresh") === "1";

        const cacheKey = `${month === "" ? range : `month:${month}`}|${key}`;
        const cached = cache.get(cacheKey);
        if (!fresh && cached !== undefined && Date.now() - cached.at < CACHE_MS) return send(200, cached.value);

        const account = ctx.get("deepseekAccount");
        if (account === undefined) return send(503, { error: "account-unavailable" });

        const session = await account.getPlatformSession();
        if (session === null) return send(401, { error: "signed-out" });

        const tz = tzSecondsEast();
        if (month !== "" && monthBounds === null) return send(400, { error: "bad-month" });
        const window = monthBounds === null ? rangeWindow(range, tz) : monthBounds;
        const query = new URLSearchParams({
          start: String(window.start),
          end: String(window.end),
          tz: String(tz)
        });
        if (key !== "") query.set("api_key_tracking_id", key);
        const usageQuery = query.toString();

        const [amountBiz, costBiz, summary, keys] = await Promise.all([
          platformGet(session.origin, session.token, `/api/v0/usage/by_api_key/amount?${usageQuery}`, tz),
          platformGet(session.origin, session.token, `/api/v0/usage/by_api_key/cost?${usageQuery}`, tz),
          platformGet(session.origin, session.token, "/api/v0/users/get_user_summary", tz),
          platformGet(session.origin, session.token, "/api/v0/users/get_api_keys", tz)
        ]);

        const summaryPart = summarize(amountBiz, costBiz, month === "" ? range : `month:${month}`, tz);
        const dates = datesOf(window.start, window.end, tz);
        const byDate = new Map(summaryPart.daily.map((row) => [row.date, row]));

        // All-time totals are independent of `range`/`key`. A failure here must not
        // take the range panel down with it, so it degrades to null on its own.
        let lifetime = null;
        let monthly = null;
        const sinceAll = lifetimeSince(keys?.api_keys, tz);
        if (sinceAll !== null) {
          const dayStart = rangeWindow("today", tz).start;
          try {
            const allTime = await lifetimeTotals(session.origin, session.token, tz, sinceAll, dayStart);
            lifetime = { since: localDateOf(sinceAll, tz), requests: allTime.requests, tokens: allTime.tokens };
          } catch (error) {
            ctx.logger?.("usage-overview")?.warn?.(error instanceof Error ? error : new Error(String(error)));
            lifetime = null;
          }
          // A month table is useful even when the lifetime totals failed on their own.
          try {
            monthly = await monthlyTotals(session.origin, session.token, tz, sinceAll, dayStart, key);
          } catch (error) {
            ctx.logger?.("usage-overview")?.warn?.(error instanceof Error ? error : new Error(String(error)));
            monthly = null;
          }
        }

        const value = {
          ...summaryPart,
          month: month === "" ? null : month,
          lifetime,
          monthly,
          daily: dates.map(
            (date) =>
              byDate.get(date) ?? {
                date,
                requests: 0,
                tokens: 0,
                cost: []
              }
          ),
          balance: walletList(summary?.normal_wallets),
          bonus: walletList(summary?.bonus_wallets),
          lifetimeCost: (summary?.total_costs ?? [])
            .map((entry) => ({ currency: String(entry?.currency ?? ""), amount: round6(num(entry?.amount)) }))
            .filter((entry) => entry.currency !== ""),
          keys: (keys?.api_keys ?? [])
            .map((entry) => ({
              trackingId: String(entry?.tracking_id ?? ""),
              name: String(entry?.name ?? ""),
              keyType: String(entry?.key_type ?? "")
            }))
            .filter((entry) => entry.trackingId !== ""),
          window: { start: window.start, end: window.end, tz },
          fetchedAt: Date.now()
        };
        cache.set(cacheKey, { at: Date.now(), value });
        ctx.logger?.("usage-overview")?.debug?.(
          `summary ${month === "" ? `range=${range}` : `month=${month}`} key=${key === "" ? "all" : key} requests=${String(value.totals.requests)}`
        );
        return send(200, value);
      } catch (error) {
        ctx.logger?.("usage-overview")?.warn?.(error instanceof Error ? error : new Error(String(error)));
        return send(502, { error: "upstream-failed", message: String(error?.message ?? error) });
      }
    };

    scope.effect(() => scope.webServer.register({ kind: "exact", path: ROUTE, handler }), "usage-overview: summary route");
  });
}

// Exported so the verification script can exercise the same math against the
// live Platform API without starting the Host. Not part of the plugin contract.
export {
  rangeWindow,
  monthWindow,
  summarize,
  tzSecondsEast,
  datesOf,
  localDateOf,
  lifetimeSince,
  lifetimeWindows,
  sumUsage,
  lifetimeTotals,
  monthlyTotals
};
