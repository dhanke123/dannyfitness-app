import { useApp } from "../state/AppState.jsx";
import { CT, PT_PRICE, isHead } from "../data/seed.js";
import { DAYS } from "../lib/dates.js";
import { downloadIcs, eventStart, googleCalUrl } from "../lib/calendar.js";
import { T, disp } from "../theme.js";
import { Btn, Card, QR, Select } from "../ui/kit.jsx";

export default function BookingSheets() {
  const { applyCoupon, campSheet, classPass, confirmBook, confirmCampBuy, confirmShopBuy, coupon, couponMsg, couponValue, credits, day, exceptionSheet, justBooked, loc, locName, otherPlace, payMode, ping, policy, ptPool, reminderChannel, requestException, setCampSheet, setCoupon, setCouponMsg, setExceptionSheet, setJustBooked, setOtherPlace, setPayMode, setSheet, setShopSheet, sheet, shopSheet, tName, myGroup, myGroupPack } = useApp();

  const bookedEvent = justBooked && {
    title: justBooked.title, start: eventStart(justBooked.weekOff, justBooked.day, justBooked.time),
    minutes: justBooked.minutes, location: justBooked.location, uid: justBooked.uid,
    details: `${justBooked.details}\nManage or cancel in the ExerciseOnly app.`,
  };

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

              {/* Book as myself, or as my group — the choice only exists for
                  group members; solo clients never see it. Group PT burns the
                  SHARED pack, not a personal credit. */}
              {myGroup && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>BOOKING FOR</div>
                  <div className="flex gap-1.5">
                    {[["me","Myself"],["group",`👥 ${myGroup.name}`]].map(([k,l])=>{
                      const on = (sheet.bookAs||"me")===k;
                      return (
                      <button key={k} onClick={()=>{ setSheet(s=>({...s,bookAs:k}));
                        if (sheet.kind==="pt") setPayMode(k==="group" ? "grouppack" : (credits[ptPool(sheet.trainer)]>0?"credit":"paynow")); }}
                        className="flex-1 py-2 rounded-xl text-sm font-bold"
                        style={{background:on?T.ink:T.card, color:on?T.paper:T.ink,
                          border:`1.5px solid ${on?T.ink:T.line}`}}>{l}</button>);})}
                  </div>
                  {sheet.bookAs==="group" && sheet.kind==="class" && (
                    <div className="text-[11px] mt-1.5 rounded-lg p-2" style={{background:"#FBF3EC", color:T.muted}}>
                      Class seats are per person — this books YOUR seat; the rest of {myGroup.name} are
                      notified to grab theirs. Group credits apply to PT sessions.
                    </div>)}
                </div>)}

              <div className="space-y-2 mb-3">
                {(() => {
                  const pool = sheet.kind==="pt" ? ptPool(sheet.trainer) : null;
                  const asGroup = sheet.bookAs==="group" && myGroup && sheet.kind==="pt";
                  const gLeft = myGroupPack ? myGroupPack.size - myGroupPack.used : 0;
                  const opts = [];
                  if (asGroup) opts.push(["grouppack", `Group pack · ${myGroup.name} (${gLeft} left)`, gLeft<=0]);
                  if (sheet.kind==="class" && classPass) opts.push(["pass", `${classPass.label} (unlimited)`, false]);
                  if (sheet.kind==="class") opts.push(["credit", `Class credit (${credits.classes} left)`, credits.classes<=0]);
                  if (sheet.kind==="pt" && !asGroup) opts.push(["credit", `${isHead(sheet.trainer)?"Head-coach":"Coach"} PT credit (${credits[pool]} left)`, credits[pool]<=0]);
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
              <Btn full disabled={(sheet.kind==="pt" && sheet.loc==="other" && !otherPlace) || (payMode==="grouppack" && myGroupPack && myGroupPack.size-myGroupPack.used<=0)} onClick={confirmBook}>{payMode==="grouppack"?"Confirm · 1 group credit":payMode==="credit"?"Confirm · 1 credit":payMode==="pass"?"Confirm · covered by pass":"Pay & book"}</Btn>
              {/* window is per booking type and read from Settings — never a constant in copy */}
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>
                Free cancellation until {sheet.kind==="class"?policy.classHrs:policy.ptHrs}h before. Inside that, you can request an exception.</div>
            </div>
          </div>)}

        {/* ---- confirmation step: add to calendar (Decision 14) ----
             .ics download + a Google Calendar link. No OAuth, no sync, no stored tokens —
             works for Apple, Outlook and Google, and there is nothing to revoke later. */}
        {justBooked && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setJustBooked(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="text-center mb-1" style={{fontSize:34}}>✅</div>
              <div className="text-center" style={{...disp,fontWeight:700,fontSize:22}}>You're booked</div>
              <div className="text-center text-sm mb-4" style={{color:T.muted}}>
                {justBooked.dateLabel ? `${justBooked.dateLabel} · ` : ""}{justBooked.time} · {justBooked.location}
                <div className="text-xs mt-1">Confirmation and reminders go to your {reminderChannel==="email"?"email":"WhatsApp"} — change this in Account.</div>
              </div>
              <div className="text-xs font-bold mb-2" style={{color:T.muted}}>ADD TO YOUR CALENDAR</div>
              <div className="space-y-2 mb-3">
                <button onClick={()=>{ downloadIcs(bookedEvent); ping("Calendar file downloaded — open it to add the session"); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{background:T.card, border:`1.5px solid ${T.line}`}}>📅 Apple Calendar / Outlook <span className="font-normal" style={{color:T.muted}}>· .ics file</span></button>
                <button onClick={()=>window.open(googleCalUrl(bookedEvent), "_blank", "noopener")}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{background:T.card, border:`1.5px solid ${T.line}`}}>📅 Google Calendar <span className="font-normal" style={{color:T.muted}}>· opens in a new tab</span></button>
              </div>
              <Btn full kind="dark" onClick={()=>setJustBooked(null)}>Done</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>You can add this to your calendar later from Book → Booked.</div>
            </div>
          </div>)}

        {/* ---- request an exception (Decision 1a) ----
             Inside the cancellation window is no longer a dead end. The member gives a
             reason, it lands in the admin Exceptions queue, and a human decides. Nothing
             about the booking changes until it's approved. */}
        {exceptionSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setExceptionSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between mb-1">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Request an exception</div>
                <button onClick={()=>setExceptionSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg -mt-1" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>
                {exceptionSheet.what}
                <div className="text-xs mt-1">
                  {exceptionSheet.kind==="camp"
                    ? `Starts in under ${policy.campDays} day${policy.campDays===1?"":"s"}.`
                    : `Starts in about ${exceptionSheet.hrs}h — inside the ${exceptionSheet.kind==="class"?policy.classHrs:policy.ptHrs}h window.`}
                </div>
              </div>
              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>WHAT DO YOU NEED?</div>
              <div className="flex gap-2 mb-3">
                {[["cancel","Cancel it"], ...(exceptionSheet.kind==="pt" ? [["change","Move it"]] : [])].map(([k,l])=>(
                  <button key={k} onClick={()=>setExceptionSheet(s=>({...s, ask:k}))}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold"
                    style={{background:exceptionSheet.ask===k?T.ink:T.card, color:exceptionSheet.ask===k?T.paper:T.ink,
                      border:`1.5px solid ${exceptionSheet.ask===k?T.ink:T.line}`}}>{l}</button>))}
              </div>
              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>WHY? (the admin sees this)</div>
              <textarea value={exceptionSheet.reason} onChange={e=>setExceptionSheet(s=>({...s, reason:e.target.value}))}
                rows={3} placeholder="e.g. I've come down with flu and don't want to pass it on"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3"
                style={{border:`1.5px solid ${T.line}`, background:T.card, resize:"none"}}/>
              <Btn full disabled={!exceptionSheet.reason.trim()}
                onClick={()=>requestException({what:exceptionSheet.what, kind:exceptionSheet.kind,
                  ask:exceptionSheet.ask, reason:exceptionSheet.reason.trim()})}>Send request</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>
                Your booking stays as it is until someone reviews this. You'll hear back on {reminderChannel==="email"?"email":"WhatsApp"}.</div>
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

