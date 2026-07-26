import { useApp } from "../state/AppState.jsx";
import { CT, PT_PRICE, isHead } from "../data/seed.js";
import { DAYS } from "../lib/dates.js";
import { T, disp } from "../theme.js";
import { Btn, Card, QR, Select } from "../ui/kit.jsx";

export default function BookingSheets() {
  const { applyCoupon, campSheet, cancelHrs, classPass, confirmBook, confirmCampBuy, confirmShopBuy, coupon, couponMsg, couponValue, credits, day, loc, locName, otherPlace, payMode, ptPool, setCampSheet, setCoupon, setCouponMsg, setOtherPlace, setPayMode, setSheet, setShopSheet, sheet, shopSheet, tName } = useApp();
  return (<>
        {/* booking sheet */}
        {sheet && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>
                  {sheet.kind==="class"?`${CT[sheet.type].name} · ${DAYS[sheet.day]} ${sheet.time}`:`PT with ${tName(sheet.trainer)} · ${DAYS[sheet.day]} ${sheet.time}`}</div>
                <button onClick={()=>setSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg -mt-1" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              {sheet.kind==="pt" && sheet.loc==="other" ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={otherPlace} onChange={e=>setOtherPlace(e.target.value)} placeholder="Place name" className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <input value={sheet.time} onChange={e=>setSheet(s=>({...s,time:e.target.value}))} className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                </div>
              ) : null}
              <div className="text-sm mb-3" style={{color:T.muted}}>
                {sheet.date && <span style={{color:T.ink, fontWeight:600}}>{sheet.date} · {sheet.time} · </span>}
                {sheet.kind==="class" ? locName(sheet.loc) : (sheet.loc==="other" ? (otherPlace||"Other spot") : locName(sheet.loc))} · ${sheet.kind==="class"?CT[sheet.type].price:PT_PRICE[sheet.trainer]}</div>
              {sheet.note && <div className="text-xs mb-2 font-semibold" style={{color:T.accent}}>⏱ {sheet.note}</div>}
              <div className="space-y-2 mb-3">
                {(() => {
                  const pool = sheet.kind==="pt" ? ptPool(sheet.trainer) : null;
                  const opts = [];
                  if (sheet.kind==="class" && classPass) opts.push(["pass", `${classPass.label} (unlimited)`, false]);
                  if (sheet.kind==="class") opts.push(["credit", `Class credit (${credits.classes} left)`, credits.classes<=0]);
                  if (sheet.kind==="pt") opts.push(["credit", `${isHead(sheet.trainer)?"Head-coach":"Coach"} PT credit (${credits[pool]} left)`, credits[pool]<=0]);
                  opts.push(["paynow","PayNow QR",false],["card","Card · coming soon",true]);
                  return opts.map(([k,label,dis])=>(
                    <button key={k} disabled={dis} onClick={()=>setPayMode(k)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{background:payMode===k?T.ink:T.card, color:dis?T.muted:payMode===k?T.paper:T.ink,
                        border:`1.5px solid ${payMode===k?T.ink:T.line}`, opacity:dis?.5:1}}>{label}</button>));
                })()}
              </div>
              {(payMode==="paynow"||payMode==="card") && (
                <div className="flex gap-2 mb-3">
                  <input value={coupon} onChange={e=>{setCoupon(e.target.value); setCouponMsg(null);}} placeholder="Coupon code"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <Btn small kind="ghost" onClick={()=>applyCoupon(sheet.kind==="class"?CT[sheet.type].price:PT_PRICE[sheet.trainer])}>Apply</Btn>
                </div>)}
              {couponMsg && <div className="text-xs mb-2 font-semibold" style={{color:couponMsg.startsWith("Applied")?T.moss:T.accent}}>{couponMsg}</div>}
              {payMode==="paynow" && <QR/>}
              <Btn full disabled={sheet.kind==="pt" && sheet.loc==="other" && !otherPlace} onClick={confirmBook}>{payMode==="credit"?"Confirm · 1 credit":payMode==="pass"?"Confirm · covered by pass":"Pay & book"}</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>Free cancellation until {cancelHrs}h before.</div>
            </div>
          </div>)}

        {/* shop checkout sheet — bug 1: Buy now goes through a real PayNow/Card step */}
        {shopSheet && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setShopSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Checkout</div>
                <button onClick={()=>setShopSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>{shopSheet.product.name} · ${shopSheet.product.price}</div>
              <div className="space-y-2 mb-3">
                {[["paynow","PayNow QR",false],["card","Card · coming soon",true]].map(([k,label,dis])=>(
                  <button key={k} disabled={dis} onClick={()=>setPayMode(k)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{background:payMode===k?T.ink:T.card, color:dis?T.muted:payMode===k?T.paper:T.ink,
                      border:`1.5px solid ${payMode===k?T.ink:T.line}`, opacity:dis?.5:1}}>{label}</button>))}
              </div>
              <div className="flex gap-2 mb-3">
                <input value={coupon} onChange={e=>{setCoupon(e.target.value); setCouponMsg(null);}} placeholder="Coupon code"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small kind="ghost" onClick={()=>applyCoupon(shopSheet.product.price)}>Apply</Btn>
              </div>
              {couponMsg && <div className="text-xs mb-2 font-semibold" style={{color:couponMsg.startsWith("Applied")?T.moss:T.accent}}>{couponMsg}</div>}
              {payMode==="paynow" && <QR/>}
              <Btn full onClick={confirmShopBuy}>Pay ${Math.round(couponValue(shopSheet.product.price))} & buy</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>Receipt emailed via Resend. Card details never touch our servers.</div>
            </div>
          </div>)}

        {/* camp checkout sheet — payment + (kids) waiver, replaces instant enroll */}
        {campSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setCampSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>{campSheet.camp.name}</div>
                <button onClick={()=>setCampSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg -mt-1" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>{campSheet.camp.dates} · {locName(campSheet.camp.loc)} · ${campSheet.camp.price}</div>

              {campSheet.waiver && (<>
                <div className="text-xs font-bold mb-1.5" style={{color:T.plum}}>CHILD DETAILS & WAIVER (required)</div>
                <div className="space-y-2 mb-3">
                  <input value={campSheet.waiver.child} onChange={e=>setCampSheet(s=>({...s,waiver:{...s.waiver,child:e.target.value}}))}
                    placeholder="Child's first name" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{color:T.muted}}>Age band</span>
                    <Select value={campSheet.waiver.ageBand} onChange={v=>setCampSheet(s=>({...s,waiver:{...s.waiver,ageBand:v}}))}
                      options={[["10–12","10–12"],["13–15","13–15"]]} />
                  </div>
                  <input value={campSheet.waiver.emergency} onChange={e=>setCampSheet(s=>({...s,waiver:{...s.waiver,emergency:e.target.value}}))}
                    placeholder="Emergency contact (name + phone)" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <button onClick={()=>setCampSheet(s=>({...s,waiver:{...s.waiver,accepted:!s.waiver.accepted}}))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm" style={{border:`1.5px solid ${campSheet.waiver.accepted?T.moss:T.line}`,background:T.card}}>
                    <span style={{color:campSheet.waiver.accepted?T.moss:T.muted}}>{campSheet.waiver.accepted?"☑":"☐"}</span>
                    I accept the parental consent & liability waiver for my child.
                  </button>
                </div>
              </>)}

              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>PAYMENT</div>
              <div className="space-y-2 mb-3">
                {[["paynow","PayNow QR",false],["card","Card · coming soon",true]].map(([k,label,dis])=>(
                  <button key={k} disabled={dis} onClick={()=>setCampSheet(s=>({...s,pay:k}))}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{background:campSheet.pay===k?T.ink:T.card, color:dis?T.muted:campSheet.pay===k?T.paper:T.ink,
                      border:`1.5px solid ${campSheet.pay===k?T.ink:T.line}`, opacity:dis?.5:1}}>{label}</button>))}
              </div>
              <div className="flex gap-2 mb-3">
                <input value={coupon} onChange={e=>{setCoupon(e.target.value); setCouponMsg(null);}} placeholder="Coupon code"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small kind="ghost" onClick={()=>applyCoupon(campSheet.camp.price)}>Apply</Btn>
              </div>
              {couponMsg && <div className="text-xs mb-2 font-semibold" style={{color:couponMsg.startsWith("Applied")?T.moss:T.accent}}>{couponMsg}</div>}
              {campSheet.pay==="paynow" && <QR/>}
              <Btn full disabled={campSheet.waiver && (!campSheet.waiver.child || !campSheet.waiver.emergency || !campSheet.waiver.accepted)}
                onClick={confirmCampBuy}>Pay ${Math.round(couponValue(campSheet.camp.price))} & book</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>Free cancellation within the policy window · one-off payment, no pack credits.</div>
            </div>
          </div>)}

  </>);
}

