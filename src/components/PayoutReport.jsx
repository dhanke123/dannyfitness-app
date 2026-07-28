/* Monthly trainer payout report — the sheet Danny hands over to pay his coaches.

   This is the [confirm] item from Round 2, built from
   `ExerciseOnly_Trainer_Payout_Sample.md`. Two things it does deliberately:

   1. **Every line traces to an event that already happened.** A class only pays
      once attendance has been marked (`session.done`), a PT session only once the
      coach hit Complete (`status === 'done'`). Expense reimbursements are
      deliberately NOT here — see the note in linesFor. Nothing is inferred from a booking — a booking is a
      promise, not delivered work, and paying on bookings would pay for no-shows
      and cancellations.

   2. **The unconfirmed rules are shown, not hidden.** Five questions in the sample
      doc are still open with Danny. Rather than silently picking an answer, the
      report states which basis it used and flags what still needs confirming, so
      the first real payout run is a conversation rather than a surprise.

   Pay bases supported: flat per-class, per-head, and monthly salary. Per-head was
   in the sample (Wei) but the rate model only had per-class and salary. */

import { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { PT_PRICE, isHead } from "../data/seed.js";
import { fmtISO, rangeDays, resolveRange } from "../lib/period.js";
import { coachWorkRows } from "../lib/worklog.js";
import RangeBar from "./RangeBar.jsx";
import { T, disp } from "../theme.js";
import { Btn, Card, Chip } from "../ui/kit.jsx";

const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function PayoutReport() {
  const { camps, clientGroups, expenseClaims, groupPacks, owedTo, locName, ping,
          ptBookings, rates, sessionLog, sessions, tName, trainers } = useApp();
  const [openId, setOpenId] = useState(null);
  const [basis, setBasis] = useState("delivered"); // delivered | booked — see note below

  /* THE PERIOD IS NOW REAL DATES.
     This used to report "the seeded week" with no way to choose one — which made it
     unusable for the thing it exists for, since a payout run is monthly and a
     commission or bonus question is asked over a quarter or a year. Same control and
     same default as the Coach log, and the lines come from the same
     `coachWorkRows`, so the diary and the payment describe the same days. */
  const [rangeSel, setRangeSel] = useState({ key: "mtd", from: "", to: "" });
  const range = useMemo(() => resolveRange(rangeSel.key, rangeSel), [rangeSel]);
  const ctx = { sessions, ptBookings, camps, sessionLog, groupPacks, clientGroups, locName, tName };

  /* One trainer's lines for the period. */
  const linesFor = (tid) => {
    const rt = rates[tid] || {};
    const lines = [];
    const work = coachWorkRows(tid, range, ctx);

    /* Cancelled work is never paid on either basis. "Include booked" relaxes
       *delivered*, not *cancelled* — a class that didn't happen is not work. */
    const eligible = work.filter(r => r.payable && (basis === "booked" ? true : r.delivered));

    // --- classes ---
    eligible.filter(r => r.kind === "class").forEach(r => {
      const share = r.share || 1;                     // co-coached classes split the fee
      let pay = 0, rateLabel = "—";
      if (rt.type === "per_head") { pay = ((r.attended || 0) * (rt.perHead || 0)) / share; rateLabel = `${r.attended || 0} × ${money(rt.perHead || 0)}${share>1?` ÷ ${share}`:""}`; }
      else if (rt.type === "per_class") { pay = (rt.perClass || 0) / share; rateLabel = `${money(rt.perClass || 0)}${share>1?` ÷ ${share}`:""}`; }
      else { rateLabel = "salary"; }
      lines.push({
        kind: "class", when: fmtISO(r.iso), item: `${r.name} (class)${share>1?` · with ${(r.coCoaches||[]).map(tName).join(", ")}`:""}`,
        where: r.where, detail: `${r.attended || 0} attended`, rateLabel, pay,
      });
    });

    // --- PT: paid on completion, never on booking ---
    eligible.filter(r => r.kind === "pt" || r.kind === "grouppt" || r.kind === "logged").forEach(r => {
      const pay = rt.type === "salary" ? 0 : (rt.perPt || 0);
      lines.push({
        kind: "pt", when: r.dateText || fmtISO(r.iso), item: `PT · ${r.name}`,
        where: r.where, detail: r.remark || "completed",
        rateLabel: rt.type === "salary" ? "salary" : money(rt.perPt || 0), pay,
      });
    });

    /* Camp days were never on the payout run at all, so a coach who ran a five-day
       holiday camp was paid nothing for it. They pay at the class rate per block —
       flagged below as unconfirmed rather than assumed correct. */
    eligible.filter(r => r.kind === "camp").forEach(r => {
      const share = r.share || 1;
      const pay = rt.type === "salary" ? 0 : (rt.perClass || rt.perPt || 0) / share;
      lines.push({
        kind: "camp", when: fmtISO(r.iso), item: `${r.name} (camp)`,
        where: r.where, detail: r.remark,
        rateLabel: rt.type === "salary" ? "salary" : `${money(rt.perClass || rt.perPt || 0)}${share>1?` ÷ ${share}`:""}`, pay,
      });
    });

    /* Expenses are NOT on the payout run.
       A payout is earnings; a reimbursement is the coach's own money coming back.
       Adding them together produces a figure that is neither, and that nobody can
       reconcile against a rate card or against a receipt. Approved claims are paid
       separately by the admin and shown below as an outstanding balance. */

    const classPay = lines.filter(l => l.kind === "class" || l.kind === "camp").reduce((a, b) => a + b.pay, 0);
    const ptPay    = lines.filter(l => l.kind === "pt").reduce((a, b) => a + b.pay, 0);
    const owed     = owedTo(tid);   // approved expenses, reimbursed separately
    /* Salary is a MONTHLY figure, so it has to be pro-rated to the period or the
       report lies in both directions: a full month's salary against a one-day range,
       or one month's against a year. Days in period ÷ 30.44 (the mean month). */
    const days     = rangeDays(range);
    const months   = days == null ? 1 : days / 30.44;
    const salary   = rt.type === "salary" ? (rt.monthly || 0) * months : 0;

    return {
      lines, classPay, ptPay, owed, salary, months,
      total: classPay + ptPay + salary,
      nClasses: lines.filter(l => l.kind === "class").length,
      nCamps: lines.filter(l => l.kind === "camp").length,
      nPt: lines.filter(l => l.kind === "pt").length,
      basisLabel: rt.type === "salary" ? `${money(rt.monthly || 0)}/month salary`
                : rt.type === "per_head" ? `per head ${money(rt.perHead || 0)} · PT ${money(rt.perPt || 0)}`
                : `per class ${money(rt.perClass || 0)} · PT ${money(rt.perPt || 0)}`,
    };
  };

  const coaches = trainers.filter(t => !t.admin);
  const report = useMemo(() => coaches.map(t => ({ t, ...linesFor(t.id) })),
    [trainers, rates, range, basis, sessions, ptBookings, camps, sessionLog, expenseClaims]);
  const grand = report.reduce((a, r) => a + r.total, 0);
  const grandOwed = report.reduce((a, r) => a + r.owed, 0);

  /* CSV is what actually gets handed over — Danny's accountant wants a file, not
     a screen. Kept as one row per line item so anything can be re-derived. */
  const exportCsv = () => {
    const rows = [
      ["ExerciseOnly — payout run", range.label, `${range.from} to ${range.to}`, `basis: ${basis}`],
      [],
      ["Trainer", "Basis", "When", "Item", "Location", "Detail", "Rate", "Pay"]];
    report.forEach(r => {
      r.lines.forEach(l => rows.push([r.t.name, r.basisLabel, l.when, l.item, l.where, l.detail, l.rateLabel, l.pay.toFixed(2)]));
      if (r.salary) rows.push([r.t.name, r.basisLabel, "—", `Salary · ${r.months.toFixed(2)} month(s) of the period`, "", "", "", r.salary.toFixed(2)]);
      rows.push([r.t.name, "", "", "TOTAL DUE (payout)", "", "", "", r.total.toFixed(2)]);
      if (r.owed) rows.push([r.t.name, "", "", "Approved expenses — reimbursed separately", "", "", "", r.owed.toFixed(2)]);
    });
    rows.push([], ["PAYOUT TOTAL", "", "", "", "", "", "", grand.toFixed(2)]);
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `exerciseonly-payout-${range.from}_to_${range.to}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ping(`Payout CSV for ${range.label} — one row per line item, ready for your accountant`);
  };

  return (
    <div className="space-y-3">
      {/* Same control, same default, same rows as the Coach log — read one, pay from
          the other, and they describe the same days. */}
      <RangeBar value={rangeSel} onChange={setRangeSel} range={range}
        note="Pick a day, a week, a month, a year — or two dates." />

      <Card style={{ background: T.ink, color: T.paper, border: "none" }}>
        <div className="text-xs font-bold mb-1" style={{ color: "#B9B5A9" }}>
          PAYOUT TOTAL · {range.label.toUpperCase()}</div>
        <div style={{ ...disp, fontWeight: 800, fontSize: 34 }}>{money(grand)}</div>
        <div className="text-xs mt-1" style={{ color: "#B9B5A9" }}>
          {range.key === "all" ? "Everything on record" : `${fmtISO(range.from)} → ${fmtISO(range.to)}`}
          {" · "}{coaches.length} coaches · every line traces to a marked attendance or a completed PT session.
        </div>
        {/* Shown here, added nowhere. Danny needs to know he also owes this money,
            without it contaminating a figure that has to reconcile to a rate card. */}
        {grandOwed > 0 && (
          <div className="text-xs mt-2 pt-2" style={{ color: "#B9B5A9", borderTop: "1px solid #3A362B" }}>
            Plus <b style={{ color: "#FFA53D" }}>{money(grandOwed)}</b> of approved expenses awaiting
            reimbursement — paid separately, not part of the payout above.
          </div>)}
      </Card>

      {/* The distinction that decides whether Danny overpays. */}
      <div className="flex gap-2">
        {[["delivered", "Delivered only"], ["booked", "Include booked"]].map(([k, l]) => (
          <Chip key={k} active={basis === k} onClick={() => setBasis(k)}>{l}</Chip>))}
      </div>
      <div className="text-xs" style={{ color: basis === "booked" ? T.accent : T.muted }}>
        {basis === "delivered"
          ? "Paying only for work marked done — a class with attendance taken, a PT session marked complete. This is the correct basis for a real payout."
          : "Includes bookings that were never marked delivered. Useful to spot coaches who aren't marking attendance — do NOT pay from this view."}
      </div>

      {report.map(r => (
        <Card key={r.t.id} className="!p-3">
          <button className="w-full text-left" onClick={() => setOpenId(openId === r.t.id ? null : r.t.id)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{r.t.name}{isHead(r.t.id) ? " ★" : ""}</div>
                <div className="text-xs" style={{ color: T.muted }}>{r.basisLabel}</div>
              </div>
              <div className="text-right">
                <div style={{ ...disp, fontWeight: 700, fontSize: 20 }}>{money(r.total)}</div>
                <div className="text-xs" style={{ color: T.muted }}>{openId === r.t.id ? "hide" : "show"} breakdown ▾</div>
              </div>
            </div>
          </button>

          <div className="grid grid-cols-4 gap-2 mt-2 text-center">
            {[["Classes", r.nCamps ? `${r.nClasses}+${r.nCamps} camp` : r.nClasses, r.classPay], ["PT", r.nPt, r.ptPay],
              ["Salary", r.salary ? `${r.months.toFixed(1)} mth` : "—", r.salary],
              ["Expenses owed", r.owed > 0 ? "separate" : "—", r.owed]]
              .map(([l, n, v]) => (
              <div key={l} className="rounded-lg py-1.5" style={{ background: "#FBF3EC" }}>
                <div className="text-[10px] font-bold" style={{ color: T.muted }}>{l}</div>
                <div className="text-sm font-bold">{money(v)}</div>
                <div className="text-[10px]" style={{ color: T.muted }}>{n}</div>
              </div>))}
          </div>

          {openId === r.t.id && (
            <div className="mt-3 pt-3" style={{ borderTop: `1.5px solid ${T.line}` }}>
              {r.lines.length === 0 && (
                <div className="text-xs" style={{ color: T.muted }}>
                  Nothing delivered in this period. If that looks wrong, check attendance has been marked
                  and PT sessions closed with Complete.
                </div>)}
              {r.lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-xs"
                  style={{ borderBottom: i < r.lines.length - 1 ? `1px solid ${T.line}` : "none" }}>
                  <span style={{ width: 30, color: T.muted }}>{l.when}</span>
                  <span className="flex-1">
                    {l.item}
                    {l.where && <span style={{ color: T.muted }}> · {l.where}</span>}
                    <span style={{ color: T.muted }}> · {l.detail}</span>
                  </span>
                  <span style={{ color: T.muted }}>{l.rateLabel}</span>
                  <span className="font-bold" style={{ width: 54, textAlign: "right" }}>{money(l.pay)}</span>
                </div>))}
              {r.salary > 0 && (
                <div className="flex items-center gap-2 py-1 text-xs">
                  <span style={{ width: 30, color: T.muted }}>—</span>
                  <span className="flex-1">Salary <span style={{ color: T.muted }}>
                    · flat, independent of sessions · pro-rated to {r.months.toFixed(2)} month{r.months === 1 ? "" : "s"} of this period</span></span>
                  <span className="font-bold" style={{ width: 54, textAlign: "right" }}>{money(r.salary)}</span>
                </div>)}
            </div>)}
        </Card>
      ))}

      <Btn full kind="dark" onClick={exportCsv}>Export payout CSV · {range.label}</Btn>

      {/* Sample doc §"Open questions for Danny" — surfaced rather than assumed. */}
      <Card style={{ background: "#F7EEE9" }}>
        <div className="text-xs font-bold mb-1.5" style={{ color: T.accent }}>STILL TO CONFIRM WITH DANNY</div>
        <div className="text-xs space-y-1" style={{ color: T.ink }}>
          <div>· <b>Per-class or per-head</b>, and the real numbers per coach and class type.</div>
          <div>· <b>PT split</b> — flat coach rate, a percentage of the session fee, or per package. Currently a flat rate per completed session.</div>
          <div>· Reimbursements are <b>paid separately from the payout run</b>, and the admin marks each claim paid. Say if you would rather they were combined into one payment.</div>
          <div>· Do <b>no-shows count</b> toward per-head pay? Currently they don't — only confirmed attendance.</div>
          <div>· <b>Swimming</b> — same basis as other classes, or its own rate?</div>
          <div>· <b>Camp days</b> pay at the class rate per block, split between co-coaches. They
            previously paid nothing at all. Confirm the real basis — a five-day camp is not five classes.</div>
          <div>· <b>Commission and bonuses have no model yet.</b> Rates cover per-class, per-head,
            per-PT and salary only. If a coach earns a percentage of what their clients spend, or a
            bonus on renewals or retention, say which and it becomes a rate type rather than a
            figure someone adds by hand afterwards.</div>
        </div>
        <div className="text-[11px] mt-2" style={{ color: T.muted }}>
          Cash collected at walk-ins stays outside the app and is never added here.
        </div>
      </Card>
    </div>
  );
}
