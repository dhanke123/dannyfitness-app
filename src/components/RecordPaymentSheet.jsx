/* Case 2 — the admin records money that changed hands outside the app.
 *
 * "Bought a 10-pack, paid me cash on Saturday." "Paid $80 for Tuesday's PT."
 * "Gave me $200 towards the camp, rest next month." All of it happens, and none of it
 * had anywhere to go: the payout report even carried the line *"cash collected at
 * walk-ins stays outside the app and is never added here"*, which described the gap
 * rather than closing it.
 *
 * Three decisions shape this sheet:
 *
 * 1. SETTLE OR CREATE. The admin either clears something that already exists (a
 *    coach booked it yesterday and flagged it pay-later) or records a purchase that
 *    was never in the app at all. Forcing everything through "create" would mean
 *    cancelling and re-making a booking just to pay for it.
 *
 * 2. DISCOUNTS ARE COUPONS, NOT TYPED-OVER PRICES. A pack that lists at $600 and
 *    sold for $500 carries a named "$100 off", created here if it doesn't exist.
 *    Typing 500 over the price hides the discount; a coupon makes it reusable,
 *    reportable, and answerable when someone asks why the average pack goes out
 *    under list. The same rule sends an unknown package to the product builder
 *    first — a purchase that isn't a real SKU can't be reported on either.
 *
 * 3. PART PAYMENT IS NORMAL. $200 against a $600 package grants the package and
 *    leaves $400 on the balance. A studio that insists on payment in full loses the
 *    client; one that can't track the remainder loses the money.
 */

import { useRef, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { PT_PRICE } from "../data/seed.js";
import { toISO } from "../lib/dates.js";
import { OBLIGATION_KINDS, PAY_METHODS, discountToCoupon, money, owedOn, paymentErrors, priceAfter, statusOf } from "../lib/money.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Select, DateInput } from "../ui/kit.jsx";

export default function RecordPaymentSheet() {
  const { recordPay, setRecordPay, clients, clientGroups, obligations, products, coupons, setCoupons,
          camps, sessions, trainers, tName, locName, ping, raiseObligation, recordPayment,
          setProductForm, setCredits, setClassPass, setGroupPacks, logAudit } = useApp();
  const fileRef = useRef(null);
  const [couponDraft, setCouponDraft] = useState(null);
  if (!recordPay) return null;

  const f = recordPay;
  const set = (patch) => setRecordPay(x => ({ ...x, ...patch }));
  const today = toISO(new Date());

  const client = clients.find(c => c.id === f.clientId);
  const whoName = client?.name || f.who || "";
  /* Everything this person still owes, so the admin can settle an existing charge
     rather than raising a second one for the same money. */
  const theirOpen = obligations.filter(o =>
    (o.clientId === f.clientId || o.who === whoName) && statusOf(o) !== "settled" && statusOf(o) !== "denied");

  const product = products.find(p => p.id === f.productId);
  const coupon = f.couponCode ? coupons[f.couponCode.toUpperCase()] : null;
  const listPrice = product ? product.price : 0;
  const due = f.kind === "package" ? priceAfter(listPrice, coupon) : (Number(f.amount) || 0);
  const paying = Number(f.payAmt ?? due) || 0;
  const remainder = Math.max(0, due - paying);

  const errs = [
    ...(whoName ? [] : ["Who paid?"]),
    ...(f.mode === "settle" && !f.settleId ? ["Pick what this is against"] : []),
    ...(f.mode === "new" && f.kind === "package" && !f.productId ? ["Pick a package"] : []),
    ...(f.mode === "new" && f.kind !== "package" && !(Number(f.amount) > 0) ? ["Enter the amount"] : []),
    ...paymentErrors({ amt: paying, method: f.method, date: f.date, proof: f.proof, noProofReason: f.noProofReason }, today),
  ];

  /* The gap between list and what was actually taken, expressed as the coupon that
     explains it. Proposed, then named and saved by the admin. */
  const suggestion = f.kind === "package" && product && f.wantDiscount && !coupon
    ? discountToCoupon(listPrice, Number(f.targetPrice) || listPrice) : null;

  const saveCoupon = () => {
    const d = couponDraft; if (!d?.code?.trim()) return;
    const code = d.code.trim().toUpperCase();
    setCoupons(c => ({ ...c, [code]: d.pct ? { pct: Number(d.pct), label: d.label || `${d.pct}% off` }
                                           : { flat: Number(d.flat) || 0, label: d.label || `${money(d.flat)} off` } }));
    set({ couponCode: code, wantDiscount: false });
    logAudit(`Coupon created from a manual payment · ${code} · ${d.label || ""}`);
    setCouponDraft(null);
    ping(`${code} saved — reusable, and it shows on the coupon report`);
  };

  const commit = () => {
    /* Settle an existing charge: no new obligation, just money against it. */
    if (f.mode === "settle") {
      recordPayment(f.settleId, { amt: paying, method: f.method, date: f.date,
        ref: f.ref, note: f.note, proof: f.proof, noProofReason: f.noProofReason });
      setRecordPay(null); return;
    }

    const what = f.kind === "package" ? product.name
      : f.kind === "pt"    ? `PT · ${tName(f.trainer)} · ${f.date}${f.time ? ` ${f.time}` : ""}`
      : f.kind === "class" ? `Class · ${f.what || "drop-in"}`
      : f.kind === "camp"  ? `${camps.find(c => c.id === f.campId)?.name || "Camp"}`
      : (f.what || "Ad-hoc");

    const ob = raiseObligation({ clientId: f.clientId, who: whoName, kind: f.kind, what,
      amount: due, listPrice: f.kind === "package" ? listPrice : null,
      couponCode: f.couponCode || null, productId: f.productId || null,
      trainer: f.trainer, date: f.date, time: f.time,
      note: f.note, raisedOn: f.date || today, source: "admin_record" });

    // pass the RECORD, not the id — state hasn't flushed yet in this handler
    if (paying > 0) recordPayment(ob, { amt: paying, method: f.method, date: f.date,
      ref: f.ref, note: f.note, proof: f.proof, noProofReason: f.noProofReason });

    /* Grant the package. Deliberately on the FIRST payment, not on full settlement —
       a deposit buys the pack; the remainder is chased on the balance. */
    if (f.kind === "package" && product) {
      if (product.kind === "classes") setCredits(c => ({ ...c, classes: c.classes + product.sessions }));
      else if (product.kind === "pthead") setCredits(c => ({ ...c, ptHead: c.ptHead + product.sessions }));
      else if (product.kind === "ptcoach") setCredits(c => ({ ...c, ptCoach: c.ptCoach + product.sessions }));
      else if (product.kind === "classpass") setClassPass({ label: product.name, period: product.period, expires: `+${product.validity}d` });
      logAudit(`Package granted from a manual payment · ${product.name} · ${whoName}${f.couponCode ? ` · ${f.couponCode}` : ""}`);
    }
    setRecordPay(null);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ background: "rgba(23,21,15,.55)" }}
      onClick={() => setRecordPay(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[92dvh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div style={{ ...disp, fontWeight: 700, fontSize: 20 }}>Record a payment</div>
          <button onClick={() => setRecordPay(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>
        <div className="text-xs mb-3" style={{ color: T.muted }}>
          Money taken outside the app — cash at the park, a transfer, a package agreed in person.
        </div>

        <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>WHO PAID</div>
        <Select value={f.clientId || ""} onChange={v => set({ clientId: v, settleId: null })}
          options={[["", "Pick a client…"], ...clients.map(c => [c.id, c.name + (c.status === "pending" ? " · pending" : "")])]}
          style={{ width: "100%", marginBottom: 10 }}/>

        {theirOpen.length > 0 && (
          <div className="rounded-lg p-2 mb-3" style={{ background: "#F7EEE9" }}>
            <div className="text-[11px] font-bold mb-1" style={{ color: T.accent }}>
              {whoName} already owes {money(theirOpen.reduce((a, o) => a + owedOn(o), 0))}</div>
            <div className="text-[11px]" style={{ color: T.deep }}>
              Settle one of those below rather than raising a second charge for the same money.
            </div>
          </div>)}

        <div className="flex gap-1.5 mb-3">
          {[["settle", "Settle something owed"], ["new", "New purchase"]].map(([k, l]) => (
            <button key={k} onClick={() => set({ mode: k })} disabled={k === "settle" && theirOpen.length === 0}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={{ background: f.mode === k ? T.ink : T.card, color: f.mode === k ? T.paper : T.ink,
                border: `1.5px solid ${f.mode === k ? T.ink : T.line}`,
                opacity: (k === "settle" && theirOpen.length === 0) ? .5 : 1 }}>{l}</button>))}
        </div>

        {f.mode === "settle" ? (
          <div className="space-y-1.5 mb-3">
            {theirOpen.map(o => (
              <button key={o.id} onClick={() => set({ settleId: o.id, payAmt: owedOn(o) })}
                className="w-full text-left px-3 py-2 rounded-xl text-sm"
                style={{ background: f.settleId === o.id ? T.ink : T.card, color: f.settleId === o.id ? T.paper : T.ink,
                  border: `1.5px solid ${f.settleId === o.id ? T.ink : T.line}` }}>
                <div className="font-semibold">{o.what}</div>
                <div className="text-[11px]" style={{ opacity: .75 }}>
                  {o.ref} · raised {o.raisedOn} · {money(owedOn(o))} outstanding of {money(o.amount)}</div>
              </button>))}
          </div>
        ) : (<>
          <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>WHAT FOR</div>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {OBLIGATION_KINDS.map(k => (
              <button key={k.key} onClick={() => set({ kind: k.key })}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                style={{ background: f.kind === k.key ? T.ink : "transparent", color: f.kind === k.key ? T.paper : T.ink,
                  border: `1.5px solid ${f.kind === k.key ? T.ink : T.line}` }}>{k.label}</button>))}
          </div>

          {f.kind === "package" && (
            <div className="mb-3">
              <Select value={f.productId || ""} onChange={v => set({ productId: v, targetPrice: products.find(p => p.id === v)?.price })}
                options={[["", "Pick a package…"], ...products.filter(p => p.active).map(p => [p.id, `${p.name} — $${p.price}`])]}
                style={{ width: "100%" }}/>
              {/* An unknown package becomes a real SKU first. A purchase that isn't a
                  product can't be reported on, renewed, or sold again. */}
              <button onClick={() => setProductForm({ name: "", price: "", kind: "classes", sessions: "", validity: 90 })}
                className="text-[11px] font-bold mt-1.5" style={{ color: T.blue }}>
                Not in the list? ＋ Create the package first →</button>

              {product && (
                <div className="mt-2 rounded-lg p-2.5" style={{ background: "#FBF3EC" }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: T.muted }}>List price</span><b>{money(listPrice)}</b></div>
                  {coupon ? (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span style={{ color: T.moss }}>{f.couponCode} · {coupon.label}</span>
                      <span className="flex items-center gap-2">
                        <b style={{ color: T.moss }}>{money(due)}</b>
                        <button onClick={() => set({ couponCode: null })} className="text-[11px] font-bold" style={{ color: T.accent }}>×</button>
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <div className="flex gap-1.5 items-center">
                        <Select value="" onChange={v => v && set({ couponCode: v })}
                          options={[["", "Apply a coupon…"], ...Object.entries(coupons).map(([code, c]) => [code, `${code} — ${c.label}`])]}
                          style={{ flex: 1 }}/>
                        <button onClick={() => set({ wantDiscount: !f.wantDiscount })}
                          className="text-[11px] font-bold px-2 py-2" style={{ color: T.blue }}>
                          {f.wantDiscount ? "Cancel" : "＋ New"}</button>
                      </div>
                      {/* Danny agreed a number in person. Rather than typing it over
                          the price, work out the coupon that explains the gap. */}
                      {f.wantDiscount && (
                        <div className="mt-2">
                          <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>WHAT DID THEY ACTUALLY AGREE TO PAY?</div>
                          <input value={f.targetPrice ?? ""} inputMode="decimal" aria-label="Agreed price"
                            onChange={e => set({ targetPrice: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-lg text-sm outline-none"
                            style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
                          {suggestion && (
                            <div className="mt-2 rounded-lg p-2" style={{ background: T.card, border: `1.5px solid ${T.line}` }}>
                              <div className="text-[11px] mb-1.5" style={{ color: T.deep }}>
                                That's <b>{money(suggestion.flat)} off</b> ({suggestion.equivalentPct}%). Name it and it
                                becomes reusable — and it shows on the coupon report instead of vanishing into the price.
                              </div>
                              <div className="flex gap-1.5">
                                <input value={couponDraft?.code ?? suggestion.suggestedCode}
                                  onChange={e => setCouponDraft(d => ({ ...(d || { flat: suggestion.flat }), code: e.target.value }))}
                                  placeholder="CODE" aria-label="Coupon code"
                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none uppercase"
                                  style={{ border: `1.5px solid ${T.line}` }}/>
                                <input value={couponDraft?.label ?? suggestion.label}
                                  onChange={e => setCouponDraft(d => ({ ...(d || { flat: suggestion.flat }), label: e.target.value }))}
                                  placeholder="Why" aria-label="Coupon reason"
                                  className="flex-[2] px-2 py-1.5 rounded-lg text-xs outline-none"
                                  style={{ border: `1.5px solid ${T.line}` }}/>
                              </div>
                              <Btn small full kind="ghost" onClick={() => { setCouponDraft(d => ({ code: suggestion.suggestedCode, label: suggestion.label, flat: suggestion.flat, ...(d || {}) })); setTimeout(saveCoupon, 0); }}>
                                Save coupon &amp; apply</Btn>
                            </div>)}
                        </div>)}
                    </div>)}
                </div>)}
            </div>)}

          {f.kind === "pt" && (
            <div className="flex gap-2 mb-3">
              <div className="flex-1"><div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>COACH</div>
                <Select value={f.trainer || ""} onChange={v => set({ trainer: v, amount: PT_PRICE[v] })}
                  options={[["", "Coach…"], ...trainers.filter(t => !t.admin).map(t => [t.id, t.name])]} style={{ width: "100%" }}/></div>
              <div className="flex-1"><div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>TIME</div>
                <input value={f.time || ""} onChange={e => set({ time: e.target.value })} type="time"
                  className="w-full px-2 py-2 rounded-lg text-sm outline-none" style={{ border: `1.5px solid ${T.line}`, background: T.card }}/></div>
            </div>)}

          {f.kind === "camp" && (
            <Select value={f.campId || ""} onChange={v => set({ campId: v, amount: camps.find(c => c.id === v)?.price })}
              options={[["", "Which camp…"], ...camps.map(c => [c.id, `${c.name} — $${c.price}`])]}
              style={{ width: "100%", marginBottom: 10 }}/>)}

          {(f.kind === "class" || f.kind === "adhoc") && (
            <input value={f.what || ""} onChange={e => set({ what: e.target.value })}
              placeholder={f.kind === "class" ? "Which class? e.g. Strength, Sat 9am" : "What was it for?"}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-2.5"
              style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>)}

          {f.kind !== "package" && (
            <div className="mb-2.5">
              <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>AMOUNT DUE</div>
              <input value={f.amount ?? ""} inputMode="decimal" aria-label="Amount due"
                onChange={e => set({ amount: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
            </div>)}
        </>)}

        {/* ---- the money itself ---- */}
        <div className="rounded-xl p-3 mb-3" style={{ background: "#EFF3EE" }}>
          <div className="text-[10px] font-bold mb-1.5" style={{ color: T.moss }}>WHAT WAS ACTUALLY RECEIVED</div>
          <div className="flex gap-2 mb-2">
            <div className="flex-1"><div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>AMOUNT</div>
              <input value={f.payAmt ?? due} inputMode="decimal" aria-label="Amount received"
                onChange={e => set({ payAmt: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg text-sm outline-none"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }}/></div>
            <div className="flex-1"><div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>METHOD</div>
              <Select value={f.method || "cash"} onChange={m => set({ method: m })} options={PAY_METHODS} style={{ width: "100%" }}/></div>
          </div>
          <div className="mb-2">
            {/* The date the money MOVED, not the date it was typed — otherwise a
                payment taken on the 29th and entered on the 2nd lands in the wrong
                month and the P&L disagrees with the bank. */}
            <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>DATE RECEIVED</div>
            <DateInput value={f.date || today} max={today} onChange={v => set({ date: v })} style={{ width: "100%" }}/>
          </div>

          {remainder > 0 && (
            <div className="text-[11px] rounded-lg p-2 mb-2" style={{ background: "#FBF3EC", color: T.deep }}>
              Part payment — <b>{money(remainder)}</b> will stay on {whoName || "their"} balance and show
              in Money owed.{f.kind === "package" ? " The package is granted now." : ""}
            </div>)}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} aria-label="Payment proof"
            onChange={e => { const file = e.target.files?.[0]; if (file) set({ proof: { name: file.name, size: file.size } }); }}/>
          {f.proof ? (
            <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: T.card }}>
              <span>🖼️</span><span className="text-xs flex-1 truncate">{f.proof.name}</span>
              <button onClick={() => set({ proof: null })} className="text-[11px] font-bold" style={{ color: T.accent }}>Remove</button>
            </div>
          ) : (<>
            <button onClick={() => { if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); } }}
              className="w-full py-2 rounded-lg text-xs font-bold mb-1.5"
              style={{ border: `1.5px dashed ${T.moss}`, color: T.moss }}>📎 Attach proof</button>
            <input value={f.noProofReason || ""} onChange={e => set({ noProofReason: e.target.value })}
              placeholder="No proof? Say why — e.g. cash, handed over at Bayshore"
              className="w-full px-2.5 py-2 rounded-lg text-xs outline-none"
              style={{ border: `1.5px solid ${f.noProofReason ? T.line : T.accent}`, background: T.card }}/>
          </>)}

          <input value={f.note || ""} onChange={e => set({ note: e.target.value })}
            placeholder="Comment — e.g. bought a 10-pack outside, agreed with Danny"
            className="w-full px-2.5 py-2 rounded-lg text-xs outline-none mt-1.5"
            style={{ border: `1.5px solid ${T.line}`, background: T.card }}/>
        </div>

        {errs.length > 0 && <div className="text-xs mb-2 font-semibold" style={{ color: T.accent }}>{errs[0]}</div>}
        <Btn full disabled={errs.length > 0} onClick={commit}>
          {remainder > 0 ? `Record ${money(paying)} · ${money(remainder)} still owed` : `Record ${money(paying)} — settled`}
        </Btn>
        <div className="text-center text-[11px] mt-2" style={{ color: T.muted }}>
          Audit-logged, and {whoName || "the client"} is notified.
        </div>
      </div>
    </div>);
}
