/* Admin: review one expense claim, then pay it.
 *
 * Approval and payment are two separate acts on purpose. "Approved" means the cost
 * is agreed; "paid" means the money has left the account. Collapsing them makes the
 * only question a coach ever asks — am I still out of pocket? — unanswerable.
 *
 * Per-line exclusion means the admin can approve four parking slips and query the
 * fifth, rather than rejecting the batch and making the coach re-key everything
 * that was already fine. The exclusion reason travels back to them.
 */

import { useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { STATUS, approvedTotal, catIcon, catLabel, claimTotal, excludedTotal } from "../lib/expenses.js";
import { fmtISO } from "../lib/period.js";
import { toISO } from "../lib/dates.js";
import { T, disp } from "../theme.js";
import { Btn, DateInput, Pill, Select } from "../ui/kit.jsx";

const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function ExpenseReview() {
  const { claimReview, setClaimReview, claimById, toggleClaimLine, decideClaim,
          markClaimPaid, tName, ping } = useApp();
  const [mode, setMode] = useState(null);          // null | 'reject' | 'pay' | {excluding:lineId}
  const [reason, setReason] = useState("");
  const [pay, setPay] = useState({ ref: "", method: "PayNow", date: toISO(new Date()) });

  if (!claimReview) return null;
  const c = claimById(claimReview);
  const close = () => { setClaimReview(null); setMode(null); setReason(""); };
  if (!c) return null;

  const st = STATUS[c.status] || STATUS.draft;
  const net = approvedTotal(c);
  const cut = excludedTotal(c);
  const editable = c.status === "submitted";
  const noReceipt = c.lines.filter(l => !l.excluded && !l.receipt);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={close}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[92vh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              <span style={{ ...disp, fontWeight: 700, fontSize: 21 }}>{c.ref}</span>
              <Pill tone={st.tone}>{st.label}</Pill>
            </div>
            <div className="text-xs" style={{ color: T.muted }}>
              {tName(c.trainer)} · {c.lines.length} item{c.lines.length === 1 ? "" : "s"}
              {c.submittedAt ? ` · sent ${fmtISO(c.submittedAt)}` : ""}
            </div>
          </div>
          <button onClick={close} aria-label="Close" className="text-sm font-bold px-2 py-1 rounded-lg"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>

        {c.note && <div className="text-xs italic mt-1" style={{ color: T.muted }}>“{c.note}”</div>}

        {/* The control figure: how much of this has no receipt behind it. */}
        {noReceipt.length > 0 && (
          <div className="text-xs rounded-lg p-2 mt-2" style={{ background: "#FBF3EC" }}>
            <b style={{ color: T.orange }}>{noReceipt.length} item{noReceipt.length === 1 ? "" : "s"} with no receipt</b>
            {" "}· {money(noReceipt.reduce((t, l) => t + (Number(l.amount) || 0), 0))}. Each carries a
            written reason — read them before approving.
          </div>)}

        <div className="mt-3">
          {c.lines.map(l => (
            <div key={l.id} className="rounded-xl p-2.5 mb-1.5"
              style={{ background: T.card, border: `1.5px solid ${l.excluded ? T.accent : T.line}`,
                       opacity: l.excluded ? .7 : 1 }}>
              <div className="flex items-start gap-2">
                <span>{catIcon(l.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ textDecoration: l.excluded ? "line-through" : "none" }}>
                    {l.desc || catLabel(l.category)}
                  </div>
                  <div className="text-[11px]" style={{ color: T.muted }}>
                    {fmtISO(l.date)} · {catLabel(l.category)}
                  </div>
                </div>
                <span className="text-sm font-bold whitespace-nowrap"
                  style={{ textDecoration: l.excluded ? "line-through" : "none" }}>{money(l.amount)}</span>
              </div>

              {l.receipt ? (
                <div className="flex items-center gap-2 mt-1.5 rounded-lg p-1.5" style={{ background: "#EAF4EE" }}>
                  <span>{l.receipt.kind === "photo" ? "🖼️" : "📄"}</span>
                  <span className="text-[11px] flex-1 truncate">{l.receipt.name}</span>
                  <button onClick={() => ping("Receipt files open from Supabase storage once the data layer is wired")}
                    className="text-[10px] font-bold" style={{ color: T.blue }}>View</button>
                </div>
              ) : (
                <div className="text-[11px] mt-1.5 rounded-lg p-1.5" style={{ background: "#FBF3EC" }}>
                  <b style={{ color: T.orange }}>No receipt</b> — “{l.noReceiptReason || "no reason given"}”
                </div>)}

              {l.excluded && (
                <div className="text-[11px] mt-1.5" style={{ color: T.accent }}>
                  Excluded{l.excludeReason ? ` — ${l.excludeReason}` : ""}
                </div>)}

              {editable && (
                mode?.excluding === l.id ? (
                  <div className="mt-2">
                    <input value={reason} onChange={e => setReason(e.target.value)} autoFocus
                      placeholder="Why is this one excluded?"
                      className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                      style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
                    <div className="flex gap-1.5 mt-1.5">
                      <Btn small full kind="ghost" onClick={() => { setMode(null); setReason(""); }}>Keep it</Btn>
                      <Btn small full disabled={!reason.trim()}
                        onClick={() => { toggleClaimLine(c.id, l.id, reason.trim()); setMode(null); setReason(""); }}>
                        Exclude</Btn>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { if (l.excluded) toggleClaimLine(c.id, l.id);
                                     else { setMode({ excluding: l.id }); setReason(""); } }}
                    className="text-[11px] font-bold mt-1.5"
                    style={{ color: l.excluded ? T.moss : T.muted }}>
                    {l.excluded ? "↩ Put it back" : "Exclude this item"}
                  </button>))}
            </div>))}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: `1.5px solid ${T.line}` }}>
          <div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 15 }}>
              {cut > 0 ? "Approving" : "Claim total"}
            </div>
            {cut > 0 && <div className="text-[11px]" style={{ color: T.muted }}>
              claimed {money(claimTotal(c))} · excluded {money(cut)}</div>}
          </div>
          <div style={{ ...disp, fontWeight: 800, fontSize: 23 }}>{money(net)}</div>
        </div>

        {/* ---- actions by state ---- */}
        {c.status === "submitted" && (
          mode === "reject" ? (
            <div className="mt-3">
              <div className="text-xs font-bold mb-1" style={{ color: T.accent }}>WHY IS THIS REJECTED?</div>
              <input value={reason} onChange={e => setReason(e.target.value)} autoFocus
                placeholder="The coach sees this — be specific"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
              <div className="flex gap-2 mt-2">
                <Btn small full kind="ghost" onClick={() => { setMode(null); setReason(""); }}>Back</Btn>
                <Btn small full disabled={!reason.trim()}
                  onClick={() => { decideClaim(c.id, false, reason.trim()); close(); }}>Reject claim</Btn>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <Btn small full kind="ghost" onClick={() => { setMode("reject"); setReason(""); }}>Reject</Btn>
              <Btn small full disabled={!(net > 0)}
                onClick={() => { decideClaim(c.id, true, null); close(); }}>
                Approve {money(net)}</Btn>
            </div>))}

        {c.status === "approved" && (
          mode === "pay" ? (
            <div className="mt-3">
              <div className="text-xs font-bold mb-1.5" style={{ color: T.muted }}>RECORD THE REIMBURSEMENT</div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>DATE PAID</div>
                  <DateInput value={pay.date} max={toISO(new Date())}
                    onChange={v => setPay(p => ({ ...p, date: v }))} style={{ width: "100%" }}/>
                </div>
                <div>
                  <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>METHOD</div>
                  <Select value={pay.method} onChange={v => setPay(p => ({ ...p, method: v }))}
                    options={[["PayNow", "PayNow"], ["Bank transfer", "Bank transfer"], ["Cash", "Cash"]]}/>
                </div>
              </div>
              <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>REFERENCE (optional)</div>
              <input value={pay.ref} onChange={e => setPay(p => ({ ...p, ref: e.target.value }))}
                placeholder="e.g. PayNow transaction ref"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
              <div className="text-[11px] mt-1.5" style={{ color: T.muted }}>
                This writes a ledger row and closes the claim. It's how the coach knows
                they're square.
              </div>
              <div className="flex gap-2 mt-2">
                <Btn small full kind="ghost" onClick={() => setMode(null)}>Back</Btn>
                <Btn small full onClick={() => { markClaimPaid(c.id, pay); close(); }}>
                  Mark {money(net)} paid</Btn>
              </div>
            </div>
          ) : (<>
            <div className="text-xs rounded-lg p-2 mt-3" style={{ background: "#EEF1F6" }}>
              Approved {c.decidedAt ? fmtISO(c.decidedAt) : ""} — <b>{tName(c.trainer)} is still out of
              pocket {money(net)}</b> until you mark it paid.
            </div>
            <Btn full onClick={() => setMode("pay")} >Mark as paid</Btn>
          </>))}

        {c.status === "paid" && (
          <div className="text-xs rounded-lg p-2.5 mt-3" style={{ background: "#EAF4EE" }}>
            Paid {fmtISO(c.paidAt)} by {c.paidMethod}{c.paidRef ? ` · ref ${c.paidRef}` : ""}.
            Recorded in the ledger and the expense report.
          </div>)}

        {c.status === "rejected" && (
          <div className="text-xs rounded-lg p-2.5 mt-3" style={{ background: "#F7EEE9" }}>
            Rejected {c.decidedAt ? fmtISO(c.decidedAt) : ""}{c.reason ? ` — “${c.reason}”` : ""}.
            Kept for the record; the coach submits a corrected claim.
          </div>)}
      </div>
    </div>);
}
