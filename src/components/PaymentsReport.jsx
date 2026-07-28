/* Money owed and money taken outside the app — the report that makes manual payment
 * auditable instead of just possible.
 *
 * Building the recording paths without this would have been the worse half of the
 * job: it would let money be taken off-app and then lose it, which is the notebook
 * problem with extra steps. Three questions it has to answer, in this order:
 *
 *   1. How much is outstanding, and how old is it? A single "owed" total says
 *      nothing about whether it's a client who pays on Friday or one who stopped
 *      replying in May, and those need different actions. Hence ageing.
 *   2. What was taken that nobody can evidence? Cash has no screenshot, so the
 *      no-proof reason is mandatory — and the total of unevidenced money is the
 *      audit question anyone will actually ask.
 *   3. Who do I chase today?
 *
 * SETTLED IS AN EXPLICIT ACT, not just arithmetic. A $2 rounding difference the admin
 * decides to let go is settled; leaving it on the owed list forever because the maths
 * says $2 is how a list stops being read.
 */

import { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { toISO } from "../lib/dates.js";
import {
  AGE_BUCKETS, PAY_METHODS, STATUS, ageing, bucketOf, daysOld, isOpen, methodLabel,
  money, owedOn, paidOn, paymentRows, paymentSummary, statusOf,
} from "../lib/money.js";
import { downloadBlob, slug } from "../lib/intake.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Pill } from "../ui/kit.jsx";

const VIEWS = [
  { key: "owed",    label: "Owed",    blurb: "Outstanding money, oldest first. This is the chase list." },
  { key: "unproven",label: "No proof",blurb: "Recorded as received with no screenshot or receipt — every one carries a written reason." },
  { key: "manual",  label: "All manual", blurb: "Everything taken outside the app, settled or not." },
  { key: "settled", label: "Settled", blurb: "Closed. Kept, because a payment history is the point." },
];

export default function PaymentsReport() {
  const { obligations, setRecordPay, markObligationSettled, denyObligation, tName, ping, clients } = useApp();
  const [view, setView] = useState("owed");
  const [openId, setOpenId] = useState(null);
  const [acting, setActing] = useState(null);   // {id, mode:'settle'|'deny', reason, cancelBooking}
  const today = toISO(new Date());

  const sum = paymentSummary(obligations, today);
  const buckets = ageing(obligations, today);

  const shown = useMemo(() => {
    const open = obligations.filter(isOpen);
    if (view === "owed")     return [...open].sort((a, b) => daysOld(b, today) - daysOld(a, today));
    if (view === "settled")  return obligations.filter(o => statusOf(o) === "settled");
    if (view === "unproven") return obligations.filter(o => (o.payments || []).some(p => !p.proof));
    return obligations;
  }, [obligations, view, today]);

  const exportCsv = () => {
    const rows = paymentRows(obligations, { tName, todayIso: today });
    if (!rows.length) { ping("Nothing to export yet"); return; }
    const cols = ["ref","who","kind","what","status","amount","paid","owed","ageDays",
                  "raisedOn","raisedBy","source","methods","lastPaidOn","proofs","unproven","note"];
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.map(q).join(","), ...rows.map(r => cols.map(c =>
      typeof r[c] === "number" ? String(r[c]) : q(r[c])).join(","))].join("\n");
    downloadBlob(`exerciseonly-manual-payments-${today}.csv`, csv, "text/csv;charset=utf-8");
    ping(`${rows.length} manual payment records exported`);
  };

  return (
    <div className="space-y-3">
      <Card style={{ background: T.ink, color: T.paper, border: "none" }}>
        <div className="text-xs font-bold mb-1" style={{ color: "#B9B5A9" }}>OUTSTANDING</div>
        <div style={{ ...disp, fontWeight: 800, fontSize: 34 }}>{money(sum.owed)}</div>
        <div className="text-xs mt-1" style={{ color: "#B9B5A9" }}>
          across {sum.openCount} open charge{sum.openCount === 1 ? "" : "s"}
          {sum.oldest > 0 && <> · oldest <b style={{ color: sum.oldest > 60 ? "#FF5A3C" : "#FFA53D" }}>{sum.oldest} days</b></>}
        </div>
        {sum.unproven > 0 && (
          <div className="text-xs mt-2 pt-2" style={{ color: "#B9B5A9", borderTop: "1px solid #3A362B" }}>
            <b style={{ color: "#FFA53D" }}>{money(sum.unproven)}</b> recorded as received with no
            attached proof — each with a written reason. This is the number an auditor asks about.
          </div>)}
      </Card>

      <Btn full onClick={() => setRecordPay({ mode: "new", kind: "package", method: "cash", date: today })}>
        ＋ Record a payment taken outside the app</Btn>

      {/* Ageing. One total can't tell "pays on Friday" from "stopped replying in May". */}
      {sum.owed > 0 && (
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {buckets.map(b => (
            <div key={b.key} className="rounded-lg py-1.5"
              style={{ background: b.key === "d90" && b.amount > 0 ? "#F7EEE9" : "#FBF3EC" }}>
              <div className="text-[10px] font-bold" style={{ color: T.muted }}>{b.label}</div>
              <div style={{ ...disp, fontWeight: 700, fontSize: 15,
                color: b.amount > 0 && (b.key === "d90" || b.key === "d60") ? T.accent : T.ink }}>{money(b.amount)}</div>
              <div className="text-[9px]" style={{ color: T.muted }}>{b.n || "—"}</div>
            </div>))}
        </div>)}

      <div>
        <div className="flex gap-1.5 flex-wrap">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: view === v.key ? T.ink : "transparent", color: view === v.key ? T.paper : T.ink,
                border: `1.5px solid ${view === v.key ? T.ink : T.line}` }}>{v.label}</button>))}
        </div>
        <div className="text-[11px] mt-1.5" style={{ color: view === "unproven" ? T.accent : T.muted }}>
          {VIEWS.find(v => v.key === view)?.blurb}
        </div>
      </div>

      {shown.length === 0 && (
        <Card><div className="text-sm" style={{ color: T.muted }}>
          {view === "owed" ? "Nothing outstanding — every manual charge is settled."
           : view === "unproven" ? "Every recorded payment has proof attached."
           : "Nothing recorded yet."}
        </div></Card>)}

      {shown.map(o => {
        const st = statusOf(o), left = owedOn(o), age = daysOld(o, today);
        const act = acting?.id === o.id ? acting : null;
        return (
        <Card key={o.id} className="!p-3" style={{ background: st === "settled" ? T.card : "#FBF7F0" }}>
          <button className="w-full text-left" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{o.who}</div>
                <div className="text-xs truncate" style={{ color: T.muted }}>{o.what}</div>
              </div>
              <div className="text-right shrink-0">
                <div style={{ ...disp, fontWeight: 700, fontSize: 17,
                  color: left > 0 ? (age > 60 ? T.accent : T.ink) : T.moss }}>
                  {left > 0 ? money(left) : money(o.amount)}</div>
                <Pill tone={STATUS[st]?.tone}>{STATUS[st]?.label}</Pill>
              </div>
            </div>
            <div className="text-[11px] mt-1" style={{ color: age > 60 && left > 0 ? T.accent : T.muted }}>
              {o.ref} · raised {o.raisedOn} by {tName(o.raisedBy)}
              {o.source === "coach_flag" ? " (from a booking)" : ""}
              {left > 0 && <> · <b>{age} day{age === 1 ? "" : "s"} old</b></>}
              {paidOn(o) > 0 && left > 0 && <> · {money(paidOn(o))} of {money(o.amount)} paid</>}
            </div>
            {(o.payments || []).some(p => !p.proof) && (
              <div className="text-[11px] mt-0.5" style={{ color: T.orange }}>
                ⚠ no proof — {(o.payments.find(p => !p.proof) || {}).noProofReason}
              </div>)}
          </button>

          {openId === o.id && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${T.line}` }}>
              {o.note && <div className="text-xs mb-1.5" style={{ color: T.deep }}>“{o.note}”</div>}
              {(o.payments || []).length === 0 && (
                <div className="text-xs mb-1.5" style={{ color: T.muted }}>Nothing received yet.</div>)}
              {(o.payments || []).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs py-0.5">
                  <span style={{ color: T.muted, width: 74 }}>{p.date}</span>
                  <span className="flex-1">{methodLabel(p.method)}{p.ref ? ` · ${p.ref}` : ""}
                    {p.proof ? <span style={{ color: T.moss }}> · 🖼️ {p.proof.name}</span>
                             : <span style={{ color: T.orange }}> · no proof</span>}</span>
                  <b>{money(p.amt)}</b>
                </div>))}
              {o.settleReason && <div className="text-[11px] mt-1" style={{ color: T.moss }}>Written off: {o.settleReason}</div>}
              {o.denyReason && <div className="text-[11px] mt-1" style={{ color: T.accent }}>Denied: {o.denyReason}</div>}

              {isOpen(o) && !act && (
                <div className="flex gap-1.5 mt-2">
                  <Btn small kind="ghost" full onClick={() => setActing({ id: o.id, mode: "deny", reason: "", cancelBooking: false })}>Deny</Btn>
                  <Btn small kind="ghost" full onClick={() => setRecordPay({ mode: "settle", clientId: o.clientId,
                    who: o.who, settleId: o.id, payAmt: left, method: "cash", date: today })}>Record payment</Btn>
                  {/* "Mark settled", not "Settled" — the view filter above is also
                      called Settled, and two controls with one label on the same
                      screen is a mis-tap waiting to happen. */}
                  <Btn small full onClick={() => setActing({ id: o.id, mode: "settle", reason: "" })}>Mark settled</Btn>
                </div>)}

              {act?.mode === "settle" && (
                <div className="mt-2">
                  <div className="text-[11px] font-bold mb-1" style={{ color: T.moss }}>
                    {left > 0 ? `Mark settled — ${money(left)} will be written off` : "Mark settled"}</div>
                  <input autoFocus value={act.reason} onChange={e => setActing(a => ({ ...a, reason: e.target.value }))}
                    placeholder={left > 0 ? "Why write it off? (audit log + shown to the client)" : "Note (optional)"}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                    style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
                  <div className="flex gap-2">
                    <Btn small kind="ghost" full onClick={() => setActing(null)}>Back</Btn>
                    <Btn small full disabled={left > 0 && !act.reason.trim()}
                      onClick={() => { markObligationSettled(o.id, act.reason.trim()); setActing(null); }}>Confirm settled</Btn>
                  </div>
                </div>)}

              {act?.mode === "deny" && (
                <div className="mt-2">
                  <div className="text-[11px] font-bold mb-1" style={{ color: T.accent }}>Deny — reason goes to the client</div>
                  <input autoFocus value={act.reason} onChange={e => setActing(a => ({ ...a, reason: e.target.value }))}
                    placeholder="e.g. no transfer found for this date"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                    style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
                  {/* The session already exists — a coach booked it. So denial has
                      something to unwind, and the admin has to say which. Guessing
                      either way means a client turning up to a cancelled slot, or
                      training for free. */}
                  {o.bookingId && (
                    <button onClick={() => setActing(a => ({ ...a, cancelBooking: !a.cancelBooking }))}
                      className="w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left text-xs mb-2"
                      style={{ border: `1.5px solid ${act.cancelBooking ? T.accent : T.line}`, background: T.card }}>
                      <span style={{ color: act.cancelBooking ? T.accent : T.muted }}>{act.cancelBooking ? "☑" : "☐"}</span>
                      <span>Also cancel the booked session.<br/>
                        <span style={{ color: T.muted }}>Leave unticked to keep the session and leave the money owed.</span></span>
                    </button>)}
                  <div className="flex gap-2">
                    <Btn small kind="ghost" full onClick={() => setActing(null)}>Back</Btn>
                    <Btn small kind="dark" full disabled={!act.reason.trim()}
                      onClick={() => { denyObligation(o.id, act.reason.trim(), act.cancelBooking); setActing(null); }}>Confirm deny</Btn>
                  </div>
                </div>)}
            </div>)}
        </Card>);
      })}

      {obligations.length > 0 && (
        <Btn full kind="dark" onClick={exportCsv}>Export manual payments CSV</Btn>)}

      <Card style={{ background: "#F4F7F3" }}>
        <div className="text-[11px]" style={{ color: T.deep }}>
          <b>Settled</b> is a decision, not a sum. Use it when the money is in, or when you have
          decided to let a remainder go — the write-off is audit-logged with your reason.
          <div className="mt-1.5">
            <b>Deny</b> is for a payment that never arrived. Because the session was already booked,
            you choose whether to release the slot or keep it and keep chasing.
          </div>
        </div>
      </Card>
    </div>);
}
