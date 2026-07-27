/* Build an expense claim. Coach-facing.
 *
 * One claim, many lines — a coach with four parking slips from one weekend submits
 * once and the admin approves once. The old flow made them do it four times.
 *
 * Two things drive the design:
 *
 *   1. **Nothing is submitted until it's complete.** The submit button is disabled
 *      with the reason written next to it, rather than accepting the claim and
 *      bouncing it back later. Being told what's missing while you're still holding
 *      the receipt is worth more than being told two days after.
 *   2. **Receipt or an explanation, never neither.** Ticking "no receipt" costs you
 *      a sentence. A claim with no proof and no reason is the one nobody can defend
 *      a year later, and asking then is too late.
 */

import { useRef } from "react";
import { useApp } from "../state/AppState.jsx";
import { CATEGORIES, catIcon, claimTotal, emptyLine, lineErrors } from "../lib/expenses.js";
import { toISO } from "../lib/dates.js";
import { fmtISO } from "../lib/period.js";
import { T, disp } from "../theme.js";
import { Btn, DateInput } from "../ui/kit.jsx";

const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function ExpenseClaimForm() {
  const { claimEditor, setClaimEditor, claimById, updateClaim, submitClaim, deleteClaim } = useApp();
  const fileRef = useRef(null);
  const pickingFor = useRef(null);
  if (!claimEditor) return null;
  const c = claimById(claimEditor);
  if (!c) return null;

  const today = toISO(new Date());
  const errsFor = (l) => lineErrors(l, today);
  const blocked = c.lines.flatMap(errsFor);
  const total = claimTotal(c);

  const setLine = (lineId, patch) => updateClaim(c.id, x => ({
    ...x, lines: x.lines.map(l => l.id !== lineId ? l : { ...l, ...patch }) }));
  const addLine = () => updateClaim(c.id, x => ({
    ...x, lines: [...x.lines, { ...emptyLine(`${x.id}-${x.lines.length + 1}-${Date.now()}`),
      date: x.lines[x.lines.length - 1]?.date || today }] }));
  const removeLine = (lineId) => updateClaim(c.id, x => ({
    ...x, lines: x.lines.length > 1 ? x.lines.filter(l => l.id !== lineId) : x.lines }));

  /* A real <input type="file">. `capture="environment"` makes the phone open the
     camera directly, which is the whole point — a coach standing at a parking
     machine should not have to photograph, save, then find the file. */
  const openPicker = (lineId, capture) => {
    pickingFor.current = lineId;
    if (!fileRef.current) return;
    if (capture) fileRef.current.setAttribute("capture", "environment");
    else fileRef.current.removeAttribute("capture");
    fileRef.current.value = "";
    fileRef.current.click();
  };
  const onFile = (e) => {
    const f = e.target.files?.[0]; const lineId = pickingFor.current;
    if (!f || !lineId) return;
    setLine(lineId, {
      receipt: { name: f.name, kind: /^image\//.test(f.type) ? "photo" : "file", size: f.size },
      noReceipt: false, noReceiptReason: "" });
  };

  const field = { width: "100%", padding: "9px 11px", borderRadius: 10,
    border: `1.5px solid ${T.line}`, background: T.card, color: T.ink, fontSize: 15, outline: "none" };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setClaimEditor(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[92vh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>

        <input ref={fileRef} type="file" accept="image/*,application/pdf"
          onChange={onFile} style={{ display: "none" }} aria-label="Receipt file"/>

        <div className="flex items-start justify-between mb-1">
          <div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 22 }}>Expense claim</div>
            <div className="text-xs" style={{ color: T.muted }}>{c.ref} · draft</div>
          </div>
          <button onClick={() => setClaimEditor(null)} aria-label="Close"
            className="text-sm font-bold px-2 py-1 rounded-lg"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>

        <div className="text-[11px] mb-3" style={{ color: T.muted }}>
          Add everything you've paid for out of your own pocket. Several items can go on
          one claim — it's approved and paid as a batch.
        </div>

        {c.lines.map((l, i) => {
          const errs = errsFor(l);
          return (
            <div key={l.id} className="rounded-xl p-3 mb-2.5"
              style={{ background: T.card, border: `1.5px solid ${errs.length ? T.line : T.moss}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold" style={{ color: T.muted }}>ITEM {i + 1}</div>
                {c.lines.length > 1 && (
                  <button onClick={() => removeLine(l.id)} className="text-[11px] font-bold"
                    style={{ color: T.accent }}>Remove</button>)}
              </div>

              {/* category — fixed list, so the report by category means something */}
              <div className="flex gap-1 flex-wrap mb-2">
                {CATEGORIES.map(cat => {
                  const on = l.category === cat.key;
                  return (
                    <button key={cat.key} onClick={() => setLine(l.id, { category: cat.key })}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold"
                      style={{ background: on ? T.ink : "transparent", color: on ? T.paper : T.ink,
                        border: `1.5px solid ${on ? T.ink : T.line}` }}>
                      {cat.icon} {cat.label}
                    </button>);
                })}
              </div>

              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>DATE SPENT</div>
                  <DateInput value={l.date} max={today} onChange={v => setLine(l.id, { date: v })} style={{ width: "100%" }}/>
                </div>
                <div style={{ width: 110 }}>
                  <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>AMOUNT $</div>
                  <input value={l.amount} onChange={e => setLine(l.id, { amount: e.target.value })}
                    type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" style={field}/>
                </div>
              </div>

              <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>WHAT WAS IT FOR</div>
              <input value={l.desc} onChange={e => setLine(l.id, { desc: e.target.value })}
                placeholder="e.g. Parking at Costa Del Sol, Sat 7am class" style={{ ...field, marginBottom: 8 }}/>

              {/* receipt */}
              {l.receipt ? (
                <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: "#EAF4EE" }}>
                  <span>{l.receipt.kind === "photo" ? "🖼️" : "📄"}</span>
                  <span className="text-xs flex-1 truncate">{l.receipt.name}</span>
                  <button onClick={() => setLine(l.id, { receipt: null })} className="text-[11px] font-bold"
                    style={{ color: T.accent }}>Remove</button>
                </div>
              ) : (<>
                <div className="flex gap-1.5">
                  <button onClick={() => openPicker(l.id, true)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ border: `1.5px solid ${T.line}`, background: T.card }}>📷 Take a photo</button>
                  <button onClick={() => openPicker(l.id, false)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ border: `1.5px solid ${T.line}`, background: T.card }}>📎 Upload a file</button>
                </div>
                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={l.noReceipt} className="mt-0.5"
                    onChange={e => setLine(l.id, { noReceipt: e.target.checked, noReceiptReason: "" })}/>
                  <span className="text-xs">No receipt for this one</span>
                </label>
                {l.noReceipt && (<>
                  <input value={l.noReceiptReason} onChange={e => setLine(l.id, { noReceiptReason: e.target.value })}
                    placeholder="Why not? e.g. ERP deducts automatically, no slip"
                    style={{ ...field, marginTop: 6 }}/>
                  <div className="text-[10px] mt-1" style={{ color: T.muted }}>
                    This is kept with the claim and shows on the expense report.
                  </div>
                </>)}
              </>)}

              {errs.length > 0 && (
                <div className="text-[11px] mt-2" style={{ color: T.orange }}>
                  {errs.map((e, k) => <div key={k}>• {e}</div>)}
                </div>)}
            </div>);
        })}

        <Btn small full kind="ghost" onClick={addLine}>＋ Add another item</Btn>

        <div className="text-[10px] font-bold mt-3 mb-1" style={{ color: T.muted }}>NOTE FOR ADMIN (optional)</div>
        <input value={c.note} onChange={e => updateClaim(c.id, { note: e.target.value })}
          placeholder="Anything worth explaining" style={field}/>

        <div className="flex items-center justify-between mt-4 mb-1">
          <span style={{ ...disp, fontWeight: 700, fontSize: 16 }}>Claim total</span>
          <span style={{ ...disp, fontWeight: 800, fontSize: 22 }}>{money(total)}</span>
        </div>
        <div className="text-[11px] mb-3" style={{ color: T.muted }}>
          {c.lines.length} item{c.lines.length === 1 ? "" : "s"} · goes to admin for approval,
          then admin marks it paid once you've been reimbursed.
        </div>

        {/* Disabled with the reason, not enabled-then-rejected. */}
        <Btn full disabled={blocked.length > 0}
          onClick={() => submitClaim(c.id)}>
          {blocked.length ? `${blocked.length} thing${blocked.length === 1 ? "" : "s"} still to fix` : `Submit ${money(total)} claim`}
        </Btn>

        <button onClick={() => setClaimEditor(null)} className="w-full text-sm font-bold mt-2"
          style={{ color: T.muted }}>Save as draft</button>
        <button onClick={() => deleteClaim(c.id)} className="w-full text-xs font-bold mt-2"
          style={{ color: T.accent }}>Delete this draft</button>
      </div>
    </div>);
}
