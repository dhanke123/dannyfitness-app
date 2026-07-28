/* The funding step on the staff booking sheet (Case 1).
 *
 * A coach booking someone in from the calendar has three honest answers to "how is
 * this being paid?" and the sheet previously asked none of them — it created the
 * booking and said "payment handled at checkout / outside the app for walk-ins",
 * which is another way of writing "nobody knows".
 *
 *   credit  — deduct from what they already hold. Instant, nothing for the admin.
 *   paid    — money already changed hands outside the app. Raises a charge that is
 *             immediately settled, and lands in the admin's queue to verify.
 *   later   — the session happens, the money is owed. Raises an open charge.
 *
 * THE SESSION IS BOOKED EITHER WAY. That is a deliberate departure from Decision 30
 * ("nothing is granted until the admin verifies"), taken 28 Jul: the coach's time is
 * the scarce thing and the session may be tomorrow morning, so the slot is held and
 * the money is chased. What it costs is that denial now has something to unwind —
 * which is why `denyObligation` makes the admin choose between cancelling the session
 * and keeping it with the amount still owed, rather than guessing.
 *
 * BALANCES ARE SHOWN, NOT ASSUMED. The coach sees "2 left" or "0 left" against each
 * option before choosing, and the credit option is disabled at zero with the reason
 * on screen — an unfunded booking made in ignorance is the one nobody chases.
 */

import { useRef } from "react";
import { useApp } from "../state/AppState.jsx";
import { PT_PRICE, isHead } from "../data/seed.js";
import { PAY_METHODS, money } from "../lib/money.js";
import { T } from "../theme.js";
import { Select } from "../ui/kit.jsx";

export default function BookingFunding({ value, onChange, trainer, whoName, isGroup }) {
  const { credits, myGroupPack, groupPacks, clientGroups, owedFor, clients } = useApp();
  const fileRef = useRef(null);
  const v = value || {};

  const client = clients.find(c => c.name === whoName);
  const outstanding = client ? owedFor(client.id) : 0;

  /* Which pool this booking would draw on. A group session burns the group's shared
     pack, never a member's personal credits — one payment, one pool (Decision 18). */
  const pool = isHead(trainer) ? "ptHead" : "ptCoach";
  const group = isGroup ? clientGroups.find(g => g.name === whoName) : null;
  const pack = group ? groupPacks.find(p => p.groupId === group.id || p.name === group.name) : null;
  const left = isGroup ? (pack ? pack.size - pack.used : 0) : (credits[pool] ?? 0);
  const price = PT_PRICE[trainer] || 0;

  const set = (patch) => onChange({ ...v, ...patch });

  const OPTS = [
    { key: "credit", label: isGroup ? `Group pack · ${whoName || "group"}` : `${isHead(trainer) ? "Head-coach" : "Coach"} PT credit`,
      sub: `${left} left`, disabled: left <= 0,
      why: left <= 0 ? (isGroup ? "This group's shared pack is empty — sell a combo pack or take payment." : "No credits left — take payment or book it as pay-later.") : "" },
    { key: "paid",   label: "Paid outside the app", sub: "cash, PayNow, transfer", disabled: false },
    { key: "later",  label: "Pay later",            sub: "session goes ahead, money owed", disabled: false },
  ];

  return (
    <div>
      <div className="text-xs font-bold mb-1" style={{ color: T.muted }}>HOW IS THIS PAID?</div>

      {/* What they already owe, before another charge is added. A coach booking a
          fourth pay-later session for someone $270 behind should know that. */}
      {outstanding > 0 && (
        <div className="text-[11px] rounded-lg p-2 mb-2" style={{ background: "#F7EEE9", color: T.accent }}>
          ⚠ {whoName} already owes <b>{money(outstanding)}</b> on earlier sessions.
        </div>)}

      <div className="space-y-1.5">
        {OPTS.map(o => (
          <button key={o.key} disabled={o.disabled} onClick={() => set({ how: o.key })}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: v.how === o.key ? T.ink : T.card,
              color: o.disabled ? T.deep : v.how === o.key ? T.paper : T.ink,
              border: `1.5px solid ${v.how === o.key ? T.ink : T.line}`, opacity: o.disabled ? .6 : 1 }}>
            {o.label}
            <span className="font-normal" style={{ opacity: .75 }}> · {o.sub}</span>
            {o.why && <div className="text-[11px] font-normal mt-0.5" style={{ color: T.accent }}>{o.why}</div>}
          </button>))}
      </div>

      {(v.how === "paid" || v.how === "later") && (
        <div className="mt-2.5 rounded-xl p-2.5" style={{ background: "#FBF3EC" }}>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>AMOUNT</div>
              <input value={v.amount ?? price} onChange={e => set({ amount: e.target.value })}
                inputMode="decimal" aria-label="Amount"
                className="w-full px-2.5 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
            </div>
            {v.how === "paid" && (
              <div className="flex-1">
                <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>METHOD</div>
                <Select value={v.method || "cash"} onChange={m => set({ method: m })}
                  options={PAY_METHODS} style={{ width: "100%" }}/>
              </div>)}
          </div>

          {v.how === "paid" && (<>
            {/* Cash produces no screenshot. Same rule the expense claims use: a
                receipt, OR a written reason there isn't one. Never neither — a blank
                "no proof" box is how an unverifiable payment enters the books
                looking verified. */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} aria-label="Payment proof"
              onChange={e => { const f = e.target.files?.[0]; if (f) set({ proof: { name: f.name, size: f.size } }); }}/>
            {v.proof ? (
              <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: "#EAF4EE" }}>
                <span>🖼️</span><span className="text-xs flex-1 truncate">{v.proof.name}</span>
                <button onClick={() => set({ proof: null })} className="text-[11px] font-bold" style={{ color: T.accent }}>Remove</button>
              </div>
            ) : (<>
              <button onClick={() => { if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); } }}
                className="w-full py-2 rounded-lg text-xs font-bold mb-1.5"
                style={{ border: `1.5px dashed ${T.accent}`, color: T.accent }}>
                📎 Attach proof (screenshot / receipt)</button>
              <input value={v.noProofReason || ""} onChange={e => set({ noProofReason: e.target.value })}
                placeholder="No proof? Say why — e.g. cash at the park"
                className="w-full px-2.5 py-2 rounded-lg text-xs outline-none"
                style={{ border: `1.5px solid ${v.noProofReason ? T.line : T.accent}`, background: T.card }}/>
            </>)}
          </>)}

          <input value={v.note || ""} onChange={e => set({ note: e.target.value })}
            placeholder={v.how === "later" ? "When will they pay? (goes to the admin)" : "Note for the admin (optional)"}
            className="w-full px-2.5 py-2 rounded-lg text-xs outline-none mt-1.5"
            style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>

          <div className="text-[11px] mt-1.5" style={{ color: T.deep }}>
            {v.how === "later"
              ? "The session is booked and the amount goes on their balance. The admin sees it in Money owed and follows up."
              : "The session is booked and the payment goes to the admin to verify against the bank or the cash tin."}
          </div>
        </div>)}
    </div>);
}

/* What the sheet needs before it will let the coach confirm. Kept beside the
   component so the button and the form can't disagree about what "complete" means. */
export const fundingErrors = (v) => {
  const e = [];
  if (!v?.how) return ["Say how this is being paid"];
  if (v.how === "credit") return e;
  if (!(Number(v.amount) > 0)) e.push("Enter the amount");
  if (v.how === "paid") {
    if (!v.method) e.push("How was it paid?");
    if (!v.proof && String(v.noProofReason || "").trim().length < 5)
      e.push("Attach proof, or say why there isn't any");
  }
  return e;
};
