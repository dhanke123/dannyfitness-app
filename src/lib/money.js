/* Manual money — the domain rules, as pure functions.
 *
 * WHY THIS EXISTS AS ITS OWN MODULE.
 *
 * A small studio does not get to insist on payment before service. Danny takes cash
 * at the park, agrees a price over WhatsApp, lets a regular settle next week, and
 * discounts on the spot. Refusing to model that doesn't make it stop happening — it
 * makes it happen in a notebook the app can't see, which is exactly the state this
 * project is replacing.
 *
 * So: one record for every amount that is owed or was received outside the app,
 * whichever path created it. A coach flagging "she'll pay next week" and the admin
 * recording "bought a 10-pack, paid cash" produce the SAME shape, because they end
 * in the same place — a balance that has to reach zero.
 *
 * THE ONE INVARIANT: an obligation's outstanding amount is always
 * `amount - sum(payments)`. Never stored, always derived. A stored balance and a
 * payment list are two sources of truth for one number, and they drift the first
 * time a payment is voided.
 *
 * DISCOUNTS ARE COUPONS, NOT TYPED-OVER PRICES (decided 28 Jul). A package that
 * lists at $600 and sold for $500 carries a named "$100 off" rather than an
 * unexplained 500. Every discount becomes reusable, reportable, and answerable when
 * someone asks why the average PT pack goes out under list.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const sum = (a, f = (x) => x) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);

export const money = (n) => `$${round2(Number(n) || 0).toFixed(2)}`;

/* What an obligation can be for. `kind` drives what has to be captured alongside it
   — a PT needs a coach, date and time; a package needs a product. */
export const OBLIGATION_KINDS = [
  { key: "pt",      label: "PT session",  needs: ["trainer", "date", "time"] },
  { key: "class",   label: "Class",       needs: ["session"] },
  { key: "camp",    label: "Camp",        needs: ["camp"] },
  { key: "package", label: "Package",     needs: ["product"] },
  { key: "adhoc",   label: "Other",       needs: [] },
];

/* How the money actually moved. The ledger previously knew only PayNow and Card,
   which is why cash had nowhere to go and the payout report had to carry the line
   "cash collected at walk-ins stays outside the app and is never added here". */
export const PAY_METHODS = [
  ["cash",     "Cash"],
  ["paynow",   "PayNow"],
  ["transfer", "Bank transfer"],
  ["card",     "Card"],
  ["other",    "Other"],
];
export const methodLabel = (k) => (PAY_METHODS.find(([v]) => v === k) || [null, k])[1];

export const STATUS = {
  pending:  { label: "Pending",  tone: "orange", blurb: "Nothing received yet" },
  partial:  { label: "Part paid", tone: "blue",  blurb: "Some received, balance outstanding" },
  settled:  { label: "Settled",  tone: "moss",   blurb: "Paid in full" },
  denied:   { label: "Denied",   tone: "accent", blurb: "Not accepted — see the reason" },
};

/* ------------------------------------------------------------------- maths */

export const paidOn   = (o) => round2(sum(o?.payments || [], (p) => p.amt));
export const owedOn   = (o) => round2(Math.max(0, (Number(o?.amount) || 0) - paidOn(o)));

/* Status is derived from the payments, never set by hand — except `denied`, which is
   a decision rather than an arithmetic fact, and `settled`, which the admin may
   assert explicitly (a $2 rounding difference written off is still settled). */
export const statusOf = (o) => {
  if (o.status === "denied" || o.status === "settled") return o.status;
  const p = paidOn(o);
  if (p <= 0) return "pending";
  return p >= (Number(o.amount) || 0) ? "settled" : "partial";
};

/* MUST read the DERIVED status, not the stored one. Reading `o.status` directly
   meant a charge paid in full — where the stored field is still "pending" because
   nobody pressed anything — counted as open forever: it stayed on the chase list, in
   the outstanding total, and on the nav badge, with nothing owed on it. The stored
   field is only ever the admin's override; the arithmetic is the truth. */
export const isOpen = (o) => {
  const s = statusOf(o);
  return s !== "settled" && s !== "denied";
};

export const owedByClient = (obligations, clientId) =>
  round2(sum(obligations.filter(o => o.clientId === clientId && isOpen(o)), owedOn));

export const totalOwed = (obligations) =>
  round2(sum(obligations.filter(isOpen), owedOn));

/* ----------------------------------------------------------------- ageing */

/* How long money has been outstanding. A single "owed" total says nothing about
   whether it is a client who will pay on Friday or one who stopped answering in
   May, and those need different actions. */
export const AGE_BUCKETS = [
  { key: "current", label: "0–30 days",  min: 0,  max: 30 },
  { key: "d30",     label: "30–60 days", min: 31, max: 60 },
  { key: "d60",     label: "60–90 days", min: 61, max: 90 },
  { key: "d90",     label: "90+ days",   min: 91, max: Infinity },
];

export const daysOld = (o, todayIso) => {
  if (!o?.raisedOn) return 0;
  const [ay, am, ad] = String(o.raisedOn).split("-").map(Number);
  const [by, bm, bd] = String(todayIso).split("-").map(Number);
  if (!ay || !by) return 0;
  return Math.max(0, Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000));
};

export const bucketOf = (o, todayIso) => {
  const d = daysOld(o, todayIso);
  return (AGE_BUCKETS.find(b => d >= b.min && d <= b.max) || AGE_BUCKETS[0]).key;
};

export function ageing(obligations, todayIso) {
  const open = obligations.filter(isOpen);
  return AGE_BUCKETS.map(b => {
    const rows = open.filter(o => bucketOf(o, todayIso) === b.key);
    return { ...b, amount: round2(sum(rows, owedOn)), n: rows.length };
  });
}

/* ------------------------------------------------------------- validation */

/* Cash produces no screenshot. The requirement says attach proof when it isn't a
   credit booking, but there is nothing to attach to a $90 note handed over at the
   park — so the rule is the same one the expense claims use: a receipt, OR a written
   reason there isn't one. Never neither. A blank "no proof" box is how an
   unverifiable payment enters the books looking verified. */
export function paymentErrors(p, todayIso) {
  const e = [];
  const amt = Number(p.amt);
  if (!(amt > 0)) e.push("Enter an amount above $0");
  if (amt > 20000) e.push("Over $20,000 — check the amount");
  if (!p.method) e.push("How was it paid?");
  if (!p.date) e.push("When was it paid?");
  else if (todayIso && p.date > todayIso) e.push("That date is in the future");
  if (!p.proof && String(p.noProofReason || "").trim().length < 5)
    e.push("Attach the transfer screenshot, or say why there isn't one");
  return e;
}

export function obligationErrors(o) {
  const e = [];
  if (!o.clientId && !String(o.who || "").trim()) e.push("Who is this for?");
  if (!(Number(o.amount) > 0)) e.push("Enter the amount owed");
  const needs = (OBLIGATION_KINDS.find(k => k.key === o.kind) || {}).needs || [];
  if (needs.includes("trainer") && !o.trainer) e.push("Which coach?");
  if (needs.includes("date") && !o.date) e.push("Which date?");
  if (needs.includes("product") && !o.productId) e.push("Which package?");
  return e;
}

/* ------------------------------------------------------------------ pricing */

/* Price after a coupon. The SAME function the shop checkout uses, deliberately —
   a package sold at the door and one sold in the app must not compute to different
   numbers for the same coupon. */
export const priceAfter = (listPrice, coupon) => {
  const base = Number(listPrice) || 0;
  if (!coupon) return round2(base);
  return round2(coupon.pct ? base * (1 - coupon.pct / 100) : Math.max(0, base - (coupon.flat || 0)));
};

/* The coupon that turns a list price into the amount actually taken. Danny agrees
   $500 on a $600 pack; rather than typing 500 over the price, this proposes the
   flat-amount coupon that explains the gap, which the admin then names and saves.
   Returns null when there is no gap. */
export const discountToCoupon = (listPrice, paidPrice) => {
  const list = Number(listPrice) || 0, paid = Number(paidPrice) || 0;
  const gap = round2(list - paid);
  if (gap <= 0) return null;
  const pct = Math.round((gap / list) * 1000) / 10;
  return { flat: gap, pct: null, suggestedCode: `OFF${String(gap).replace(/\D/g, "")}`,
           label: `${money(gap)} off — agreed in person`, equivalentPct: pct };
};

/* ------------------------------------------------------------------ reporting */

/* One row per obligation, flattened for the report and the CSV. Rows carry both the
   headline amount and what is left, because "a $600 package" and "$400 still owed on
   a $600 package" are different facts and a report showing only one of them gets
   read as the other. */
export function paymentRows(obligations, { tName = (x) => x, todayIso } = {}) {
  return obligations.map(o => ({
    ref: o.ref, who: o.who, kind: o.kind, what: o.what,
    status: statusOf(o),
    amount: round2(Number(o.amount) || 0),
    paid: paidOn(o),
    owed: owedOn(o),
    raisedOn: o.raisedOn, raisedBy: tName(o.raisedBy), source: o.source,
    ageDays: isOpen(o) ? daysOld(o, todayIso) : 0,
    methods: [...new Set((o.payments || []).map(p => methodLabel(p.method)))].join(" + "),
    lastPaidOn: (o.payments || []).map(p => p.date).sort().slice(-1)[0] || "",
    proofs: (o.payments || []).filter(p => p.proof).length,
    unproven: (o.payments || []).filter(p => !p.proof).length,
    note: o.note || "",
  }));
}

export function paymentSummary(obligations, todayIso) {
  const open = obligations.filter(isOpen);
  const settled = obligations.filter(o => statusOf(o) === "settled");
  return {
    owed: totalOwed(obligations),
    openCount: open.length,
    pending: open.filter(o => statusOf(o) === "pending").length,
    partial: open.filter(o => statusOf(o) === "partial").length,
    settledCount: settled.length,
    collected: round2(sum(obligations, paidOn)),
    /* Money in the books that nobody can evidence. The audit question anyone will
       actually ask, and the reason the no-proof reason is mandatory. */
    unproven: round2(sum(obligations.flatMap(o => (o.payments || []).filter(p => !p.proof)), (p) => p.amt)),
    oldest: Math.max(0, ...open.map(o => daysOld(o, todayIso))),
  };
}
