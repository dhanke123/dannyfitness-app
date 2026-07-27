/* Analytics engine — pure functions over app state. No React, no side effects.
 *
 * Every figure here has to survive Danny reading it next to his bank statement, so
 * two rules are held throughout:
 *
 *   1. **Revenue is money received, not money promised.** Only `status === "paid"`
 *      ledger rows count. A booking is an intention; a payment is a fact.
 *   2. **Pack sales are not profit.** Selling a 10-pack takes $300 today and creates
 *      an obligation to deliver 10 sessions later. `deferredRevenue()` reports that
 *      liability separately — see the long comment there. Getting this wrong is the
 *      single most common way a small studio flatters its own numbers.
 *
 * Money is plain dollars here because the demo ledger is. The live schema stores
 * integer *_cents everywhere; when these move to SQL, divide once at the edge and
 * never mix the two in the same expression.
 */

import { CT, PT_PRICE, isHead } from "../data/seed.js";
import { DAYS, TODAY } from "./dates.js";
import { approvedTotal, expenseReport, outstandingOf } from "./expenses.js";
import { inRange } from "./period.js";
import { DEFAULT_TRAVEL, PT_DUR, sessTrainers, travelBetween } from "./scheduling.js";

const sum = (a, f = x => x) => a.reduce((t, x) => t + (f(x) || 0), 0);

/* Every money report takes an optional range. Passing nothing means "everything",
   which is what the screens did before ranges existed — so adding the argument
   can't silently change an existing caller's numbers.

   Ledger rows without a date are KEPT, not dropped. Excluding them would make the
   ranged total quietly smaller than the all-time total with no explanation on
   screen; `undatedRows` surfaces the gap instead. */
const ledgerIn = (ledger, range) =>
  !range || range.key === "all" ? ledger : ledger.filter(l => !l.date || inRange(l.date, range));
const undatedCount = (ledger) => ledger.filter(l => !l.date).length;
const round = (n) => Math.round(n * 100) / 100;
const pct = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;

/* ------------------------------------------------------------------ A · MONEY */

/* A1 — P&L. Revenue by stream, minus what it cost to deliver. */
export function profitAndLoss(s, range) {
  const { ledger, expenseClaims = [], trainers, rates, sessions, ptBookings } = s;
  const scoped = ledgerIn(ledger, range);
  const paid = scoped.filter(l => l.status === "paid" && l.amt > 0);

  const stream = (test) => round(sum(paid.filter(test), l => l.amt));
  const revenue = {
    dropIn:  stream(l => /Drop-in/i.test(l.what)),
    pt:      stream(l => /^PT ·/i.test(l.what)),
    packs:   stream(l => /pack|credits/i.test(l.what)),
    passes:  stream(l => /pass/i.test(l.what)),
    camps:   stream(l => /camp/i.test(l.what)),
  };
  revenue.other = round(sum(paid, l => l.amt) - sum(Object.values(revenue)));
  const totalRevenue = round(sum(Object.values(revenue)));

  // Cost of delivery. Payout mirrors the payout report: delivered work only.
  const payoutFor = (tid) => {
    const rt = rates[tid]; if (!rt) return 0;
    if (rt.type === "salary") return round((rt.monthly || 0) / 4.33); // weekly slice
    const delivered = sessions.filter(x => sessTrainers(x).includes(tid) && x.done);
    /* SHARED CLASSES: a class with two coaches pays each a SHARE, not the full
       rate. Paying both in full doubles the cost of a class that earns the same
       money — the quickest way to make co-coaching look unaffordable when it
       isn't. Split is equal; the lead/assistant weighting is a Danny decision. */
    const classPay = rt.type === "per_head"
      ? sum(delivered, x => ((x.attendees || []).filter(a => a.status === "attended").length
                             * (rt.perHead || 0)) / sessTrainers(x).length)
      : sum(delivered, x => (rt.perClass || 0) / sessTrainers(x).length);
    const pts = ptBookings.filter(b => b.trainer === tid && b.status === "done").length;
    return round(classPay + pts * (rt.perPt || 0));
  };
  const payouts = trainers.filter(t => !t.admin).map(t => ({ id: t.id, name: t.name, amt: payoutFor(t.id) }));
  const trainerCost = round(sum(payouts, p => p.amt));
  /* Expenses hit the P&L on APPROVAL, not on payment. An approved claim is money
     owed whether or not it has left the bank yet; waiting for the payment to
     recognise the cost would make a month look profitable purely because the admin
     hadn't got round to paying anyone. `expenseOutstanding` is reported alongside
     so the cash position stays visible. */
  const expenseCost = round(sum(expenseClaims.filter(c => c.status === "approved" || c.status === "paid"),
                                approvedTotal));
  const expenseOutstanding = round(sum(expenseClaims, outstandingOf));
  const incidentalCost = expenseCost;   // legacy name, same number

  // Processing fees: HitPay PayNow is 0.9% (min $0.20) under $100, 0.65% + $0.30 at or above.
  const feeFor = (l) => l.method === "PayNow"
    ? (l.amt >= 100 ? l.amt * 0.0065 + 0.30 : Math.max(0.20, l.amt * 0.009))
    : l.method === "Card" ? l.amt * 0.028 + 0.50 : 0;
  const processingFees = round(sum(paid, feeFor));

  const cost = round(trainerCost + incidentalCost + processingFees);
  return {
    revenue, totalRevenue, payouts, trainerCost,
    expenseCost, expenseOutstanding, incidentalCost, processingFees,
    cost, grossMargin: round(totalRevenue - cost),
    marginPct: pct(totalRevenue - cost, totalRevenue),
    range: range || null, undatedRows: undatedCount(ledger),
    paidRows: paid,
  };
}

/* A2 — Deferred revenue / credit liability.
 *
 * THE POINT: cash in the bank from pack sales is not earned until the session is
 * delivered. If Danny has taken $3,000 for packs and members still hold 40 unused
 * sessions, roughly $1,200 of that is an obligation, not profit. Reporting it as
 * profit overstates the month AND hides the fact that a busy redemption month later
 * will look terrible (all cost, no new cash).
 *
 * The demo tracks one member's credits; against the real schema this sums
 * pack_purchases.credits_total - credits_used across everyone. */
export function deferredRevenue(s) {
  const { credits, products, classPass } = s;
  const unitValue = (kind, fallback) => {
    const p = products.find(x => x.kind === kind && x.sessions > 0);
    return p ? round(p.price / p.sessions) : fallback;
  };
  const classUnit = unitValue("classes", 30);
  const headUnit  = unitValue("pthead", PT_PRICE.danny || 120);
  const coachUnit = unitValue("ptcoach", PT_PRICE.dylan || 90);

  const lines = [
    { pool: "Class credits",       units: credits.classes, unit: classUnit },
    { pool: "PT credits · head",   units: credits.ptHead,  unit: headUnit  },
    { pool: "PT credits · coach",  units: credits.ptCoach, unit: coachUnit },
  ].map(l => ({ ...l, value: round(l.units * l.unit) }));

  return {
    lines,
    totalUnits: sum(lines, l => l.units),
    totalValue: round(sum(lines, l => l.value)),
    activePass: classPass ? classPass.label : null,
  };
}

/* A3 — Payment channel mix. Answers "how many pay in the app vs outside it".
   Cash and walk-ins never touch the app, so they're inferred from attendance
   without a matching ledger row — that gap IS the finding. */
export function paymentMix(s, range) {
  const { ledger, sessions } = s;
  const paid = ledgerIn(ledger, range).filter(l => l.status === "paid" && l.amt > 0);
  const by = (m) => ({ n: paid.filter(l => l.method === m).length, amt: round(sum(paid.filter(l => l.method === m), l => l.amt)) });

  const inApp = by("PayNow");
  const card  = by("Card");
  // attendance marked for someone with no payment and no credit spend = collected offline
  const walkIns = sum(sessions, x => (x.attendees || []).filter(a => a.walkIn).length);

  const totalTracked = round(inApp.amt + card.amt);
  return {
    inApp, card, walkIns,
    totalTracked,
    inAppShare: pct(inApp.amt, totalTracked),
    note: walkIns > 0
      ? `${walkIns} walk-in attendance${walkIns === 1 ? "" : "s"} recorded with no in-app payment — cash collected outside the app and invisible to these figures.`
      : "No untracked walk-ins this period.",
  };
}

/* A4 — coupon cost. A5 — credits sold and never used. */
export function couponImpact(s, range) {
  const { ledger } = s;
  const used = ledgerIn(ledger, range).filter(l => l.status === "paid" && /\(([A-Z0-9]+)\)/.test(l.what));
  const map = {};
  used.forEach(l => {
    const code = l.what.match(/\(([A-Z0-9]+)\)/)[1];
    map[code] = map[code] || { code, uses: 0, revenue: 0 };
    map[code].uses += 1; map[code].revenue = round(map[code].revenue + l.amt);
  });
  return Object.values(map).sort((a, b) => b.uses - a.uses);
}

/* ---------------------------------------------------------------- B · TRAINERS */

export function trainerScorecards(s) {
  const { trainers, sessions, ptBookings, expenseClaims = [], rates, travel, ledger } = s;
  return trainers.filter(t => !t.admin).map(t => {
    const mine = sessions.filter(x => sessTrainers(x).includes(t.id));
    const delivered = mine.filter(x => x.done);
    const unmarked = mine.filter(x => x.day < TODAY && !x.done);
    const seats = sum(mine, x => x.cap);
    const booked = sum(mine, x => (x.attendees || []).length);
    const attended = sum(mine, x => (x.attendees || []).filter(a => a.status === "attended").length);
    const noShows = sum(mine, x => (x.attendees || []).filter(a => a.status === "no_show").length);
    const pts = ptBookings.filter(b => b.trainer === t.id);
    const ptDone = pts.filter(b => b.status === "done");

    // B4 — unpaid travel. Consecutive commitments on the same day at different
    // venues cost the coach time nobody pays for.
    let travelMin = 0;
    for (let d = 0; d < 7; d++) {
      const day = [...mine.filter(x => x.day === d).map(x => ({ t: x.time, loc: x.loc })),
                   ...pts.filter(b => b.day === d).map(b => ({ t: b.time, loc: b.loc }))]
        .sort((a, b) => a.t.localeCompare(b.t));
      for (let i = 1; i < day.length; i++) travelMin += travelBetween(travel, day[i - 1].loc, day[i].loc);
    }

    const rt = rates[t.id] || {};
    // Same share rule as profitAndLoss — a co-coached class divides between the
    // coaches on it. These two must agree or the P&L and the scorecards disagree
    // about what the same class cost, which is the sort of discrepancy that
    // destroys confidence in every other number on the page.
    const payout = rt.type === "salary" ? round((rt.monthly || 0) / 4.33)
      : round((rt.type === "per_head"
          ? sum(delivered, x => ((x.attendees || []).filter(a => a.status === "attended").length
                                 * (rt.perHead || 0)) / sessTrainers(x).length)
          : sum(delivered, x => (rt.perClass || 0) / sessTrainers(x).length))
        + ptDone.length * (rt.perPt || 0));

    // B3 — revenue attributable to this coach, for margin.
    // revenue attributed the same way, so margin per coach stays comparable
    const classRev = sum(delivered, x => ((x.attendees || []).filter(a => a.status === "attended").length
                                          * CT[x.type].price) / sessTrainers(x).length);
    const ptRev = round(ptDone.length * (PT_PRICE[t.id] || 0));
    const revenue = round(classRev + ptRev);

    return {
      id: t.id, name: t.name, headCoach: isHead(t.id),
      classes: mine.length, delivered: delivered.length, unmarked: unmarked.length,
      fillRate: pct(booked, seats), attendanceRate: pct(attended, booked),
      noShows, ptBooked: pts.length, ptDone: ptDone.length,
      expenses: round(sum(expenseClaims.filter(c => c.trainer === t.id && (c.status === "approved" || c.status === "paid")), approvedTotal)),
      expensesOwed: round(sum(expenseClaims.filter(c => c.trainer === t.id), outstandingOf)),
      travelMin, travelHrs: round(travelMin / 60),
      payout, revenue,
      margin: round(revenue - payout),
      marginPct: pct(revenue - payout, revenue),
      costRatio: revenue > 0 ? round(payout / revenue) : null,
    };
  });
}

/* ----------------------------------------------------------------- C · CLIENTS */

/* Builds a per-client picture from attendance rows and the ledger. Against the
   real schema this is a group-by on bookings + payments. */
export function clientInsights(s) {
  const { sessions, ledger, myClassBookings, myPT } = s;
  const map = {};
  const touch = (name) => (map[name] = map[name] || {
    name, booked: 0, attended: 0, noShows: 0, cancels: 0, spend: 0, lastSeen: null,
  });

  sessions.forEach(x => (x.attendees || []).forEach(a => {
    const c = touch(a.name);
    c.booked += 1;
    if (a.status === "attended") { c.attended += 1; c.lastSeen = DAYS[x.day]; }
    if (a.status === "no_show") c.noShows += 1;
  }));
  ledger.filter(l => l.status === "paid" && l.amt > 0).forEach(l => {
    const c = touch(l.who); c.spend = round(c.spend + l.amt);
  });

  const rows = Object.values(map).map(c => ({
    ...c,
    reliability: pct(c.attended, c.booked),
    // C2: the watch-list score. No-shows weigh heaviest — an empty seat the coach
    // was still paid for is the most expensive outcome for Danny.
    riskScore: c.noShows * 3 + c.cancels * 1,
  })).sort((a, b) => b.riskScore - a.riskScore || b.spend - a.spend);

  return {
    rows,
    totalClients: rows.length,
    atRisk: rows.filter(c => c.riskScore >= 3),
    topSpenders: [...rows].sort((a, b) => b.spend - a.spend).slice(0, 5),
    activeBookings: myClassBookings.length + myPT.length,
  };
}

/* ------------------------------------------------------- D · OPS AND CAPACITY */

export function capacity(s) {
  const { sessions, locations, locName, myWaitlist } = s;
  const live = sessions.filter(x => x.status !== "cancelled");
  const byLoc = locations.map(l => {
    const here = live.filter(x => x.loc === l.id);
    const seats = sum(here, x => x.cap);
    const booked = sum(here, x => (x.attendees || []).length);
    const revenue = round(sum(here, x => (x.attendees || []).length * CT[x.type].price));
    return { id: l.id, name: l.name, sessions: here.length, seats, booked,
             fillRate: pct(booked, seats), revenue };
  }).filter(l => l.sessions > 0).sort((a, b) => b.revenue - a.revenue);

  const byType = Object.keys(CT).map(code => {
    const here = live.filter(x => x.type === code);
    const seats = sum(here, x => x.cap);
    const booked = sum(here, x => (x.attendees || []).length);
    return { code, name: CT[code].name, sessions: here.length, seats, booked, fillRate: pct(booked, seats) };
  }).filter(t => t.sessions > 0).sort((a, b) => b.fillRate - a.fillRate);

  // D5 — demand heatmap, day × session count.
  const byDay = DAYS.map((d, i) => {
    const here = live.filter(x => x.day === i);
    return { day: d, sessions: here.length, booked: sum(here, x => (x.attendees || []).length) };
  });

  const full = live.filter(x => (x.attendees || []).length >= x.cap);
  return {
    byLoc, byType, byDay,
    overallFill: pct(sum(live, x => (x.attendees || []).length), sum(live, x => x.cap)),
    fullSessions: full.length,
    waitlisted: myWaitlist.length,
    // D3 — unmet demand is the clearest signal for where to add a class
    unmetDemand: full.map(x => ({ what: CT[x.type].name, when: `${DAYS[x.day]} ${x.time}`, where: locName(x.loc) })),
  };
}

/* --------------------------------------------------------- E · INTEGRITY AUDIT */

/* E5 — the one that's launch-blocking. Everything here is a real inconsistency
   that costs money or misleads a report if left alone. */
export function integrityAudit(s) {
  const { sessions, ptBookings, ledger, expenseClaims = [], credits } = s;
  const findings = [];

  const unmarked = sessions.filter(x => x.day < TODAY && !x.done && x.status !== "cancelled");
  if (unmarked.length) findings.push({
    severity: "high", code: "UNMARKED_ATTENDANCE",
    title: `${unmarked.length} past session${unmarked.length === 1 ? "" : "s"} with no attendance marked`,
    why: "The coach isn't paid for these and every attendance-based report undercounts.",
    items: unmarked.map(x => `${CT[x.type].name} · ${DAYS[x.day]} ${x.time}`),
  });

  const openPt = ptBookings.filter(b => b.status !== "done" && b.status !== "cancelled" && b.day < TODAY);
  if (openPt.length) findings.push({
    severity: "high", code: "PT_NOT_COMPLETED",
    title: `${openPt.length} PT session${openPt.length === 1 ? "" : "s"} in the past never marked complete`,
    why: "PT is paid on completion, so these are unpaid and the client log never updated.",
    items: openPt.map(b => `${b.who || "client"} · ${DAYS[b.day]} ${b.time}`),
  });

  const refunded = ledger.filter(l => l.amt < 0);
  const zero = ledger.filter(l => l.status === "paid" && l.amt === 0);
  if (zero.length) findings.push({
    severity: "medium", code: "ZERO_VALUE_PAYMENT",
    title: `${zero.length} paid ledger row${zero.length === 1 ? "" : "s"} worth $0`,
    why: "Usually a coupon applied to 100% or a mis-keyed price. Worth an eyeball.",
    items: zero.map(l => `${l.who} · ${l.what}`),
  });

  const stale = expenseClaims.filter(c => c.status === "submitted");
  if (stale.length) findings.push({
    severity: "low", code: "PENDING_EXPENSE_CLAIMS",
    title: `${stale.length} expense claim${stale.length === 1 ? "" : "s"} awaiting approval`,
    why: "Coaches are out of pocket until these are actioned.",
    items: stale.map(c => `${c.ref} · $${approvedTotal(c).toFixed(2)}`),
  });

  /* Approved-but-unpaid is the finding that didn't exist before, because
     "approved" and "reimbursed" used to be the same state. A claim can now sit
     approved indefinitely with nobody noticing the coach is still out of pocket. */
  const owed = expenseClaims.filter(c => c.status === "approved");
  if (owed.length) findings.push({
    severity: owed.length > 3 ? "medium" : "low", code: "APPROVED_NOT_REIMBURSED",
    title: `${owed.length} approved claim${owed.length === 1 ? "" : "s"} not yet paid · $${round(sum(owed, approvedTotal)).toFixed(2)}`,
    why: "Approved means agreed, not repaid. Until it's marked paid the coach is still out of pocket.",
    items: owed.map(c => `${c.ref} · $${approvedTotal(c).toFixed(2)}${c.decidedAt ? ` · approved ${c.decidedAt}` : ""}`),
  });

  /* No-receipt claims are legitimate — ERP has no slip — but the proportion is the
     number an accountant asks for, so it should be on the page rather than
     something you have to go and compute. */
  const noRec = expenseClaims
    .filter(c => c.status === "approved" || c.status === "paid")
    .flatMap(c => c.lines.filter(l => !l.excluded && !l.receipt).map(l => ({ ...l, ref: c.ref })));
  if (noRec.length) findings.push({
    severity: "low", code: "EXPENSES_WITHOUT_RECEIPT",
    title: `${noRec.length} approved expense line${noRec.length === 1 ? "" : "s"} with no receipt · $${round(sum(noRec, l => Number(l.amount) || 0)).toFixed(2)}`,
    why: "Each carries a written reason, but this is the figure to be able to defend at year end.",
    items: noRec.map(l => `${l.ref} · $${l.amount} · ${l.desc} — "${l.noReceiptReason}"`),
  });

  const negative = Object.entries(credits).filter(([, v]) => v < 0);
  if (negative.length) findings.push({
    severity: "high", code: "NEGATIVE_CREDITS",
    title: "A credit pool has gone negative",
    why: "A member has spent credits they never had. Indicates a double-deduction bug.",
    items: negative.map(([k, v]) => `${k}: ${v}`),
  });

  return {
    findings,
    clean: findings.length === 0,
    high: findings.filter(f => f.severity === "high").length,
    refundedTotal: round(Math.abs(sum(refunded, l => l.amt))),
  };
}

/* ------------------------------------------------------------- F · EXPENSES */

/* Thin wrapper so callers don't each have to remember to pass `inRange`. The real
   work is in lib/expenses.js, which knows nothing about React or ranges. */
export function expenses(s, range) {
  return expenseReport(s.expenseClaims || [], range, inRange, s.tName || (x => x));
}

/* ------------------------------------------------------------------ G · LEADS */

export function leadFunnel(s) {
  const { leads } = s;
  const bySource = {};
  leads.forEach(l => {
    bySource[l.source] = bySource[l.source] || { source: l.source, total: 0, converted: 0, open: 0 };
    bySource[l.source].total += 1;
    if (l.status === "converted") bySource[l.source].converted += 1;
    if (l.status === "new") bySource[l.source].open += 1;
  });
  const rows = Object.values(bySource).map(r => ({ ...r, conversion: pct(r.converted, r.total) }))
    .sort((a, b) => b.total - a.total);
  return { rows, total: leads.length, unactioned: leads.filter(l => l.status === "new").length };
}

/* ------------------------------------------------------------------- exports */

/* Turns any array of flat objects into CSV. Quotes everything, doubles embedded
   quotes — a coach called O'Brien or a note containing a comma must not shift
   every column right in Excel. */
export function toCsv(rows, headers) {
  if (!rows.length) return "";
  const cols = headers || Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.map(esc).join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
}

export function downloadCsv(filename, rows, headers) {
  const csv = toCsv(rows, headers);
  if (!csv) return false;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
