/* Date ranges and trend bucketing — the shared time layer for every report.
 *
 * WHY THIS EXISTS AS ITS OWN MODULE: "between these two dates" and "show me this
 * weekly / monthly / yearly" are the same question asked twice, and if each report
 * answers it in its own way they stop agreeing. The P&L saying one thing for July
 * and the expense report saying another for the same July is worse than neither
 * report existing, because you can't tell which one lied.
 *
 * ISO strings, not Date objects. `yyyy-mm-dd` compares correctly with `<` and `>`
 * as plain strings, there's no timezone to get wrong, and Singapore is UTC+8 — the
 * exact offset that makes `toISOString()` hand back yesterday.
 */

import { MS_DAY, toISO } from "./dates.js";

/* ------------------------------------------------------------------- ranges */

/* `today` and `wtd` exist because the payout run is read at those two grains more
   than any other: "what did Ansab do this morning" and "what is this week's coach
   bill". Both were reachable only by opening Custom and picking the same date twice,
   which is four taps for the most common question on the screen. */
export const RANGE_PRESETS = [
  { key: "today", label: "Today"      },
  { key: "wtd",   label: "This week"  },
  { key: "7d",    label: "7 days"     },
  { key: "30d",   label: "30 days"    },
  { key: "mtd",   label: "This month" },
  { key: "qtd",   label: "Quarter"    },
  { key: "ytd",   label: "This year"  },
  { key: "all",   label: "All time"   },
];

const shift = (dt, days) => new Date(dt.getTime() + days * MS_DAY);
const startOfDay = (dt) => { const d = new Date(dt); d.setHours(0, 0, 0, 0); return d; };

/* Resolve a preset (or a custom pair) into a concrete {from, to} in ISO.
   `to` is inclusive — a range that quietly excludes its own end date is the
   classic off-by-one that makes month totals disagree with the ledger by exactly
   one day's takings. */
export function resolveRange(key, custom = {}, now = new Date()) {
  const today = startOfDay(now);
  const iso = toISO(today);
  const mk = (from, label) => ({ key, from: toISO(from), to: iso, label });

  switch (key) {
    // A single day. `to` is already today, so from === to — one day, end inclusive.
    case "today": return mk(today, today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }));
    // Monday to today. Distinct from "7 days": on a Tuesday this is 2 days, not 7,
    // and a week-to-date payout figure must not quietly include last Wednesday.
    case "wtd": return mk(shift(today, -((today.getDay() + 6) % 7)), "This week");
    case "7d":  return mk(shift(today, -6), "Last 7 days");
    case "30d": return mk(shift(today, -29), "Last 30 days");
    case "mtd": return mk(new Date(today.getFullYear(), today.getMonth(), 1),
                          today.toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
    case "qtd": {
      const q = Math.floor(today.getMonth() / 3);
      return mk(new Date(today.getFullYear(), q * 3, 1), `Q${q + 1} ${today.getFullYear()}`);
    }
    case "ytd": return mk(new Date(today.getFullYear(), 0, 1), String(today.getFullYear()));
    case "all": return { key, from: "0000-01-01", to: "9999-12-31", label: "All time" };
    case "custom": {
      // Tolerate a backwards range rather than silently returning nothing: someone
      // picking the end date first shouldn't see an empty report and assume there's
      // no data.
      let { from, to } = custom;
      if (!from || !to) return resolveRange("30d", {}, now);
      if (from > to) [from, to] = [to, from];
      return { key: "custom", from, to, label: `${fmtISO(from)} → ${fmtISO(to)}` };
    }
    default: return resolveRange("30d", {}, now);
  }
}

export const inRange = (isoDate, r) => !!isoDate && isoDate >= r.from && isoDate <= r.to;

export const fmtISO = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
};

export const rangeDays = (r) => {
  if (r.key === "all") return null;
  const [a, b] = [r.from, r.to].map(s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); });
  return Math.round((b - a) / MS_DAY) + 1;
};

/* The equivalent window immediately before this one, for "vs previous period".
   A number with nothing to compare it to is trivia. */
export function previousRange(r) {
  const days = rangeDays(r);
  if (!days) return null;
  const [y, m, d] = r.from.split("-").map(Number);
  const from = new Date(y, m - 1, d - days);
  const to = new Date(y, m - 1, d - 1);
  return { key: "prev", from: toISO(from), to: toISO(to), label: "previous period" };
}

/* ------------------------------------------------------------- granularity */

export const GRAINS = [
  { key: "week",  label: "Weekly"  },
  { key: "month", label: "Monthly" },
  { key: "year",  label: "Yearly"  },
];

/* Which bucket an ISO date falls in. Weeks start Monday — Singapore business weeks
   do, and the whole app already indexes weekdays Mon=0. */
export function bucketKey(iso, grain) {
  if (!iso) return null;
  if (grain === "year") return iso.slice(0, 4);
  if (grain === "month") return iso.slice(0, 7);
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const back = (dt.getDay() + 6) % 7;              // days since Monday
  return toISO(new Date(dt.getTime() - back * MS_DAY));
}

export function bucketLabel(key, grain) {
  if (grain === "year") return key;
  if (grain === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  }
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* Every bucket in the range, including empty ones.
 *
 * The empty ones are the point. Dropping a week with no revenue turns a gap into a
 * smooth line and hides exactly the thing you opened the trend to find. Capped so a
 * five-year weekly range can't render 260 bars on a phone. */
export function buckets(range, grain, cap = 24) {
  if (range.key === "all") return [];
  const out = [];
  const [fy, fm, fd] = range.from.split("-").map(Number);
  let cur = new Date(fy, fm - 1, fd);
  if (grain === "week") cur = new Date(cur.getTime() - ((cur.getDay() + 6) % 7) * MS_DAY);
  if (grain === "month") cur = new Date(fy, fm - 1, 1);
  if (grain === "year") cur = new Date(fy, 0, 1);

  const guard = 400;
  for (let i = 0; i < guard; i++) {
    const key = bucketKey(toISO(cur), grain);
    if (key > bucketKey(range.to, grain)) break;
    out.push({ key, label: bucketLabel(key, grain) });
    if (grain === "week") cur = new Date(cur.getTime() + 7 * MS_DAY);
    else if (grain === "month") cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    else cur = new Date(cur.getFullYear() + 1, 0, 1);
  }
  // keep the most recent `cap` buckets — the far past compresses to nothing anyway
  return out.length > cap ? out.slice(out.length - cap) : out;
}

/* Sum `value(row)` per bucket. Rows without a usable date are returned separately
   rather than dropped: undated money is a data problem, and silently excluding it
   makes the trend disagree with the total on the same screen. */
export function trend(rows, { date, value = () => 1 }, range, grain, cap) {
  const bs = buckets(range, grain, cap);
  const index = new Map(bs.map(b => [b.key, { ...b, value: 0, n: 0 }]));
  let undated = 0;
  rows.forEach(r => {
    const iso = date(r);
    if (!iso) { undated += 1; return; }
    if (!inRange(iso, range)) return;
    const b = index.get(bucketKey(iso, grain));
    if (!b) return;
    b.value += value(r) || 0; b.n += 1;
  });
  const series = [...index.values()].map(b => ({ ...b, value: Math.round(b.value * 100) / 100 }));
  return { series, undated, max: Math.max(0, ...series.map(b => b.value)) };
}
