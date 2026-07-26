/* Monthly trainer payout report — the sheet Danny hands over to pay his coaches.

   This is the [confirm] item from Round 2, built from
   `ExerciseOnly_Trainer_Payout_Sample.md`. Two things it does deliberately:

   1. **Every line traces to an event that already happened.** A class only pays
      once attendance has been marked (`session.done`), a PT session only once the
      coach hit Complete (`status === 'done'`), and an incidental only once the
      admin approved it. Nothing is inferred from a booking — a booking is a
      promise, not delivered work, and paying on bookings would pay for no-shows
      and cancellations.

   2. **The unconfirmed rules are shown, not hidden.** Five questions in the sample
      doc are still open with Danny. Rather than silently picking an answer, the
      report states which basis it used and flags what still needs confirming, so
      the first real payout run is a conversation rather than a surprise.

   Pay bases supported: flat per-class, per-head, and monthly salary. Per-head was
   in the sample (Wei) but the rate model only had per-class and salary. */

import { useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { CT, PT_PRICE, isHead } from "../data/seed.js";
import { sessTrainers } from "../lib/scheduling.js";
import { DAYS } from "../lib/dates.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Chip } from "../ui/kit.jsx";

const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function PayoutReport() {
  const { incidentals, locName, ping, ptBookings, rates, sessions, tName, trainers } = useApp();
  const [openId, setOpenId] = useState(null);
  const [basis, setBasis] = useState("delivered"); // delivered | booked — see note below

  /* One trainer's lines for the period. In the demo the "period" is the seeded
     week; in the real build this takes a month range and queries by date. */
  const linesFor = (tid) => {
    const rt = rates[tid] || {};
    const lines = [];

    // --- classes: only those actually delivered (attendance marked) ---
    sessions
      .filter(s => sessTrainers(s).includes(tid))
      .filter(s => basis === "booked" ? true : s.done === true)
      .forEach(s => {
        const attended = (s.attendees || []).filter(a => a.status === "attended").length;
        const heads = attended;
        let pay = 0, rateLabel = "—";
        if (rt.type === "per_head") { pay = heads * (rt.perHead || 0); rateLabel = `${heads} × ${money(rt.perHead || 0)}`; }
        else if (rt.type === "per_class") { pay = rt.perClass || 0; rateLabel = money(rt.perClass || 0); }
        else { rateLabel = "salary"; }
        lines.push({
          kind: "class", when: DAYS[s.day], item: `${CT[s.type].name} (class)`,
          where: locName(s.loc), detail: `${attended} attended`, rateLabel, pay,
        });
      });

    // --- PT: paid on completion, never on booking ---
    ptBookings
      .filter(b => b.trainer === tid)
      .filter(b => basis === "booked" ? b.status !== "cancelled" : b.status === "done")
      .forEach(b => {
        const pay = rt.type === "salary" ? 0 : (rt.perPt || 0);
        lines.push({
          kind: "pt", when: DAYS[b.day], item: `PT · ${b.who || "client"}`,
          where: b.otherLabel || locName(b.loc),
          detail: b.status === "done" ? "completed" : b.status || "booked",
          rateLabel: rt.type === "salary" ? "salary" : money(rt.perPt || 0), pay,
        });
      });

    // --- incidentals: approved only ---
    incidentals
      .filter(i => i.trainer === tid && i.status === "approved")
      .forEach(i => lines.push({
        kind: "inc", when: "—", item: `Incidental · ${i.label}`, where: "",
        detail: "approved", rateLabel: money(i.amt), pay: i.amt,
      }));

    const classPay = lines.filter(l => l.kind === "class").reduce((a, b) => a + b.pay, 0);
    const ptPay    = lines.filter(l => l.kind === "pt").reduce((a, b) => a + b.pay, 0);
    const incPay   = lines.filter(l => l.kind === "inc").reduce((a, b) => a + b.pay, 0);
    // salary is a flat monthly figure, independent of the lines above
    const salary   = rt.type === "salary" ? (rt.monthly || 0) : 0;

    return {
      lines, classPay, ptPay, incPay, salary,
      total: classPay + ptPay + incPay + salary,
      nClasses: lines.filter(l => l.kind === "class").length,
      nPt: lines.filter(l => l.kind === "pt").length,
      basisLabel: rt.type === "salary" ? `${money(rt.monthly || 0)}/month salary`
                : rt.type === "per_head" ? `per head ${money(rt.perHead || 0)} · PT ${money(rt.perPt || 0)}`
                : `per class ${money(rt.perClass || 0)} · PT ${money(rt.perPt || 0)}`,
    };
  };

  const coaches = trainers.filter(t => !t.admin);
  const report = coaches.map(t => ({ t, ...linesFor(t.id) }));
  const grand = report.reduce((a, r) => a + r.total, 0);

  /* CSV is what actually gets handed over — Danny's accountant wants a file, not
     a screen. Kept as one row per line item so anything can be re-derived. */
  const exportCsv = () => {
    const rows = [["Trainer", "Basis", "When", "Item", "Location", "Detail", "Rate", "Pay"]];
    report.forEach(r => {
      r.lines.forEach(l => rows.push([r.t.name, r.basisLabel, l.when, l.item, l.where, l.detail, l.rateLabel, l.pay.toFixed(2)]));
      if (r.salary) rows.push([r.t.name, r.basisLabel, "—", "Monthly salary", "", "", "", r.salary.toFixed(2)]);
      rows.push([r.t.name, "", "", "TOTAL DUE", "", "", "", r.total.toFixed(2)]);
    });
    rows.push([], ["PAYOUT TOTAL", "", "", "", "", "", "", grand.toFixed(2)]);
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "exerciseonly-payout.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ping("Payout CSV downloaded — one row per line item, ready for your accountant");
  };

  return (
    <div className="space-y-3">
      <Card style={{ background: T.ink, color: T.paper, border: "none" }}>
        <div className="text-xs font-bold mb-1" style={{ color: "#B9B5A9" }}>PAYOUT TOTAL · this period</div>
        <div style={{ ...disp, fontWeight: 800, fontSize: 34 }}>{money(grand)}</div>
        <div className="text-xs mt-1" style={{ color: "#B9B5A9" }}>
          {coaches.length} coaches · every line traces to a marked attendance, a completed PT session, or an approved receipt.
        </div>
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
            {[["Classes", r.nClasses, r.classPay], ["PT", r.nPt, r.ptPay],
              ["Receipts", r.incPay > 0 ? "✓" : "—", r.incPay], ["Salary", r.salary ? "✓" : "—", r.salary]]
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
                  <span className="flex-1">Monthly salary <span style={{ color: T.muted }}>· flat, independent of sessions</span></span>
                  <span className="font-bold" style={{ width: 54, textAlign: "right" }}>{money(r.salary)}</span>
                </div>)}
            </div>)}
        </Card>
      ))}

      <Btn full kind="dark" onClick={exportCsv}>Export payout CSV</Btn>

      {/* Sample doc §"Open questions for Danny" — surfaced rather than assumed. */}
      <Card style={{ background: "#F7EEE9" }}>
        <div className="text-xs font-bold mb-1.5" style={{ color: T.accent }}>STILL TO CONFIRM WITH DANNY</div>
        <div className="text-xs space-y-1" style={{ color: T.ink }}>
          <div>· <b>Per-class or per-head</b>, and the real numbers per coach and class type.</div>
          <div>· <b>PT split</b> — flat coach rate, a percentage of the session fee, or per package. Currently a flat rate per completed session.</div>
          <div>· Are approved <b>incidentals reimbursed on the same run</b>, or separately? Currently included.</div>
          <div>· Do <b>no-shows count</b> toward per-head pay? Currently they don't — only confirmed attendance.</div>
          <div>· <b>Swimming</b> — same basis as other classes, or its own rate?</div>
        </div>
        <div className="text-[11px] mt-2" style={{ color: T.muted }}>
          Cash collected at walk-ins stays outside the app and is never added here.
        </div>
      </Card>
    </div>
  );
}
