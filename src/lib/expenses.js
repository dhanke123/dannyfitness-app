/* Expense claims — the domain rules, as pure functions.
 *
 * Replaces the old "receipt" flow, which was a single amount plus a photo tacked
 * onto the end of marking a session complete. That was wrong in three ways:
 *
 *   1. **It was attached to a session.** Most of what a coach spends isn't tied to
 *      one class — parking for a morning of three, petrol for a week. Forcing the
 *      cost onto whichever session happened to be in front of them made the data
 *      meaningless the moment anyone tried to report on it.
 *   2. **One receipt per submission.** A coach with five parking slips submitted
 *      five times and the admin approved five times.
 *   3. **Approval was the end of it.** Nothing recorded that the coach had actually
 *      been paid back, so "approved" and "out of pocket" were indistinguishable.
 *
 * A claim is now a small batch of lines with its own reference, moving through
 *   draft → submitted → approved / rejected → paid
 * and every transition is audited.
 *
 * Rules live here rather than in the form so that validation can't differ between
 * what the UI allows and what the store accepts. A form that blocks something the
 * store permits is a rule that only exists on one screen.
 */

const round = (n) => Math.round(n * 100) / 100;
const sum = (a, f = x => x) => a.reduce((t, x) => t + (f(x) || 0), 0);

/* Categories are a fixed list, not free text. Free text means "Parking", "parking",
   "Car park" and "carpark" are four categories, and the expense report by category
   — the whole reason to have categories — becomes noise. */
export const CATEGORIES = [
  { key: "petrol",     label: "Petrol",            icon: "⛽" },
  { key: "parking",    label: "Parking",           icon: "🅿️" },
  { key: "erp",        label: "ERP / tolls",       icon: "🛣️" },
  { key: "transport",  label: "Taxi / transport",  icon: "🚕" },
  { key: "equipment",  label: "Equipment",         icon: "🏋️" },
  { key: "venue",      label: "Venue fee",         icon: "📍" },
  { key: "refresh",    label: "Client refreshments", icon: "🥤" },
  { key: "phone",      label: "Phone & data",      icon: "📱" },
  { key: "other",      label: "Other",             icon: "•" },
];
export const catLabel = (k) => CATEGORIES.find(c => c.key === k)?.label || k;
export const catIcon  = (k) => CATEGORIES.find(c => c.key === k)?.icon || "•";

export const STATUS = {
  draft:     { label: "Draft",     tone: "muted",  blurb: "Not sent yet" },
  submitted: { label: "Submitted", tone: "orange", blurb: "Waiting on admin" },
  approved:  { label: "Approved",  tone: "blue",   blurb: "Awaiting payment" },
  rejected:  { label: "Rejected",  tone: "accent", blurb: "Not approved" },
  paid:      { label: "Paid",      tone: "moss",   blurb: "Reimbursed" },
};

export const emptyLine = (id) => ({
  id, date: "", category: "parking", amount: "", desc: "",
  receipt: null,            // {name, kind:'photo'|'file'}
  noReceipt: false, noReceiptReason: "",
  excluded: false, excludeReason: "",   // admin can drop one line and approve the rest
});

export const emptyClaim = (id, ref, trainer) => ({
  id, ref, trainer, status: "draft",
  note: "", lines: [emptyLine(`${id}-1`)],
  submittedAt: null, decidedAt: null, decidedBy: null, reason: null,
  paidAt: null, paidRef: "", paidMethod: "PayNow",
});

/* ------------------------------------------------------------ validation */

/* One line's problems, as human sentences. Returning strings rather than codes
   because every one of these is shown directly to the coach — a rule the person
   can't read is a rule they'll trip over twice. */
export function lineErrors(l, today) {
  const e = [];
  const amt = Number(l.amount);
  if (!l.date) e.push("Pick the date you spent it");
  else if (today && l.date > today) e.push("That date is in the future");
  if (!(amt > 0)) e.push("Enter an amount above $0");
  if (amt > 0 && amt > 5000) e.push("Over $5,000 — check the amount");
  if (!String(l.desc || "").trim()) e.push("Say what it was for");



  if (!l.receipt && !l.noReceipt) e.push("Attach a receipt, or tick 'no receipt'");
  return e;
}

export function claimErrors(c, today) {
  const e = [];
  if (!c.lines.length) e.push("Add at least one expense");
  c.lines.forEach((l, i) => lineErrors(l, today).forEach(m => e.push(`Line ${i + 1}: ${m}`)));
  return e;
}

export const canSubmit = (c, today) => claimErrors(c, today).length === 0;

/* -------------------------------------------------------------- totals */

export const claimTotal = (c) => round(sum(c.lines, l => Number(l.amount) || 0));

/* What the admin actually approved: the total less any line they excluded. Kept
   separate from claimTotal so a partly-approved claim reports both numbers — the
   coach needs to see what was cut and why, not just a smaller figure. */
export const approvedTotal = (c) =>
  round(sum(c.lines.filter(l => !l.excluded), l => Number(l.amount) || 0));

export const excludedTotal = (c) => round(claimTotal(c) - approvedTotal(c));

/* The number that hits the P&L. Approved and paid claims are both a real cost —
   an approved claim is money owed whether or not it has left the bank yet. Only
   rejected and draft claims cost nothing. */
export const isCost = (c) => c.status === "approved" || c.status === "paid";
export const costOf = (c) => (isCost(c) ? approvedTotal(c) : 0);

/* Money owed to coaches right now. This is the figure that matters to a coach and
   never previously existed anywhere: approved but not yet reimbursed. */
export const outstandingOf = (c) => (c.status === "approved" ? approvedTotal(c) : 0);

export const receiptCount = (c) => c.lines.filter(l => l.receipt).length;
export const noReceiptCount = (c) => c.lines.filter(l => !l.receipt && l.noReceipt).length;

/* ------------------------------------------------------------- reporting */

/* Flatten claims to one row per LINE, filtered by a date range.
 *
 * Line-level, not claim-level, because a claim can span dates and categories: a
 * claim submitted on the 3rd can hold a parking slip from the 28th of last month.
 * Reporting it against the submission date would put last month's cost in this
 * month, which is the whole reason a between-two-dates report was asked for. */
export function expenseLines(claims, range, inRange) {
  const out = [];
  claims.forEach(c => {
    if (c.status === "draft" || c.status === "rejected") return;
    c.lines.forEach(l => {
      if (l.excluded) return;
      if (range && !inRange(l.date, range)) return;
      out.push({
        claimId: c.id, ref: c.ref, trainer: c.trainer, status: c.status,
        date: l.date, category: l.category, categoryLabel: catLabel(l.category),
        amount: round(Number(l.amount) || 0), desc: l.desc,
        receipt: l.receipt ? l.receipt.name : "",
        noReceipt: !l.receipt, noReceiptReason: l.noReceiptReason || "",
        paidAt: c.paidAt || "", paidRef: c.paidRef || "",
      });
    });
  });
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/* The expense report itself: totals, splits by coach and category, and the two
   control figures — how much is still owed, and how much was claimed without a
   receipt. The second one is the audit question anyone will actually ask. */
export function expenseReport(claims, range, inRange, tName = (x) => x) {
  const lines = expenseLines(claims, range, inRange);
  const total = round(sum(lines, l => l.amount));

  const group = (keyOf, labelOf) => {
    const m = {};
    lines.forEach(l => {
      const k = keyOf(l);
      m[k] = m[k] || { key: k, label: labelOf(l), amount: 0, n: 0 };
      m[k].amount = round(m[k].amount + l.amount); m[k].n += 1;
    });
    return Object.values(m)
      .map(r => ({ ...r, share: total > 0 ? Math.round((r.amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  };

  const noReceipt = lines.filter(l => l.noReceipt);
  const inRangeClaims = claims.filter(c =>
    c.lines.some(l => !l.excluded && (!range || inRange(l.date, range))));

  return {
    lines, total, count: lines.length,
    byCoach: group(l => l.trainer, l => tName(l.trainer)),
    byCategory: group(l => l.category, l => l.categoryLabel),
    paid: round(sum(lines.filter(l => l.status === "paid"), l => l.amount)),
    outstanding: round(sum(lines.filter(l => l.status === "approved"), l => l.amount)),
    noReceiptTotal: round(sum(noReceipt, l => l.amount)),
    noReceiptCount: noReceipt.length,
    noReceiptShare: total > 0 ? Math.round((sum(noReceipt, l => l.amount) / total) * 100) : 0,
    claims: inRangeClaims,
    avgClaim: inRangeClaims.length ? round(total / inRangeClaims.length) : 0,
  };
}

/* Next reference. Sequential and human-quotable — "EXP-0042" is something a coach
   can put in a WhatsApp message; a uuid isn't. */
export function nextRef(claims) {
  const n = claims.reduce((max, c) => {
    const m = /^EXP-(\d+)$/.exec(c.ref || "");
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `EXP-${String(n + 1).padStart(4, "0")}`;
}
