import { useApp } from "../state/AppState.jsx";
import CampBuilderForm from "../components/CampBuilderForm.jsx";
import TemplateBuilderForm from "../components/TemplateBuilderForm.jsx";
import ClassBuilderForm from "../components/ClassBuilderForm.jsx";
import { CT } from "../data/seed.js";
import { DAYS } from "../lib/dates.js";
import { nid } from "../lib/util.js";
import { T, disp } from "../theme.js";
import { Btn, Select } from "../ui/kit.jsx";

export default function AdminSheets() {
  const { sessions, ptBookings, timeOff, camps, travel, locName, productForm, setProductForm, addProduct, addTrainer, campBuilder, coupon, couponForm, day, locations, measForm, measurements, ping, setAddTrainer, setCampBuilder, setCamps, setClassTemplates, setCouponForm, setCoupons, setMeasForm, setMeasurements, setPerm, setRates, setShiftEditor, setShifts, setTemplateBuilder, setTrainers, sheet, shiftEditor, shifts, tName, tab, templateBuilder, trainers, user } = useApp();
  return (<>
        <ClassBuilderForm/>
        {/* Adding a pack used to be a toast that created nothing. */}
        {productForm && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setProductForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add a pack or pass</div>
                <button onClick={()=>setProductForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="space-y-2 mb-3">
                <input value={productForm.name} onChange={e=>setProductForm(f=>({...f,name:e.target.value}))} placeholder="Name — e.g. 10-class pack"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <div className="flex gap-1.5 flex-wrap">
                  {[["classes","Class credits"],["pthead","PT · head coach"],["ptcoach","PT · coach"],["classpass","Unlimited pass"]].map(([k,l])=>(
                    <button key={k} onClick={()=>setProductForm(f=>({...f,kind:k}))} className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                      style={{background:productForm.kind===k?T.ink:"transparent",color:productForm.kind===k?T.paper:T.ink,border:`1.5px solid ${productForm.kind===k?T.ink:T.line}`}}>{l}</button>))}
                </div>
                <div className="flex gap-2">
                  <input value={productForm.price} onChange={e=>setProductForm(f=>({...f,price:e.target.value}))} placeholder="Price $" type="number"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  {productForm.kind==="classpass"
                    ? <input value={productForm.period||""} onChange={e=>setProductForm(f=>({...f,period:e.target.value}))} placeholder="day / week / month"
                        className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    : <input value={productForm.sessions} onChange={e=>setProductForm(f=>({...f,sessions:e.target.value}))} placeholder="Sessions" type="number"
                        className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>}
                </div>
                <input value={productForm.validity} onChange={e=>setProductForm(f=>({...f,validity:e.target.value}))} placeholder="Valid for (days)" type="number"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              </div>
              <Btn full disabled={!productForm.name.trim() || !productForm.price} onClick={()=>addProduct(productForm)}>Add to shop</Btn>
              <div className="text-center text-xs mt-2" style={{color:T.muted}}>Goes live in the shop immediately. Existing purchases are unaffected.</div>
            </div>
          </div>)}

        {/* admin: add a coupon */}
        {couponForm && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setCouponForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add coupon</div>
                <button onClick={()=>setCouponForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="space-y-2.5">
                <div><div className="text-xs font-bold mb-1" style={{color:T.muted}}>CODE</div>
                  <input value={couponForm.code} onChange={e=>setCouponForm(f=>({...f,code:e.target.value.toUpperCase().replace(/\s/g,"")}))} placeholder="e.g. SEP20"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                <div className="flex gap-2">
                  <div className="flex-1"><div className="text-xs font-bold mb-1" style={{color:T.muted}}>TYPE</div>
                    <Select value={couponForm.mode} onChange={v=>setCouponForm(f=>({...f,mode:v}))} options={[["pct","% off"],["flat","$ off"]]}/></div>
                  <div className="flex-1"><div className="text-xs font-bold mb-1" style={{color:T.muted}}>{couponForm.mode==="pct"?"PERCENT":"AMOUNT $"}</div>
                    <input value={couponForm.val} onChange={e=>setCouponForm(f=>({...f,val:e.target.value}))} type="number" placeholder={couponForm.mode==="pct"?"10":"5"}
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                </div>
                <div><div className="text-xs font-bold mb-1" style={{color:T.muted}}>LABEL</div>
                  <input value={couponForm.label} onChange={e=>setCouponForm(f=>({...f,label:e.target.value}))} placeholder="e.g. 20% off — September promo"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
              </div>
              <div className="mt-4"><Btn full disabled={!couponForm.code.trim()||!(+couponForm.val>0)} onClick={()=>{
                const code=couponForm.code.trim(); const v=+couponForm.val;
                setCoupons(cs=>({...cs, [code]: couponForm.mode==="pct" ? {pct:v, label:couponForm.label||`${v}% off`} : {flat:v, label:couponForm.label||`$${v} off`}}));
                ping(`Coupon ${code} added`); setCouponForm(null);}}>Add coupon</Btn></div>
            </div>
          </div>)}

        {/* The old receipt-upload sheet lived here. It has been replaced by the
           expense-claim workflow (components/ExpenseClaimForm.jsx): a claim can hold
           several items, each with its own date, category and receipt, and it tracks
           through approval to actually being paid. */}
        {/* shift-hours editor — per-weekday, weekly recurring */}
        {shiftEditor && (() => {
          const tid = shiftEditor.trainer; const sh = shifts[tid] || {};
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setShiftEditor(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Shift hours — {tName(tid)}</div><button onClick={()=>setShiftEditor(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Set on-shift hours per weekday (weekends can differ). Repeats every week until you change it. Toggle a day off to remove it.</div>
              <div className="space-y-2">
                {DAYS.map((d,di)=>{ const on=!!sh[di]; return (
                  <div key={d} className="flex items-center gap-2">
                    <button onClick={()=>setShifts(s=>{ const c={...(s[tid]||{})}; if(c[di])delete c[di]; else c[di]=["09:00","17:00"]; return {...s,[tid]:c}; })}
                      className="text-xs font-bold w-14 py-1.5 rounded-lg" style={{background:on?T.ink:"transparent",color:on?T.paper:T.muted,border:`1.5px solid ${on?T.ink:T.line}`}}>{d}</button>
                    {on ? (<>
                      <input value={sh[di][0]} onChange={e=>setShifts(s=>({...s,[tid]:{...s[tid],[di]:[e.target.value,s[tid][di][1]]}}))}
                        className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <span className="text-sm">–</span>
                      <input value={sh[di][1]} onChange={e=>setShifts(s=>({...s,[tid]:{...s[tid],[di]:[s[tid][di][0],e.target.value]}}))}
                        className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                    </>) : <span className="text-sm" style={{color:T.muted}}>Off</span>}
                  </div>);})}
              </div>
              <div className="mt-4"><Btn full onClick={()=>{setShiftEditor(null); ping("Shift hours saved — PT availability updated");}}>Done</Btn></div>
            </div>
          </div>);})()}

        {/* add / edit trainer form (with cost/rate) */}
        {addTrainer && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setAddTrainer(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>{addTrainer.editId?"Edit trainer":"Add trainer"}</div>
                <button onClick={()=>setAddTrainer(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Rates can be temporary — set a per-class / per-PT rate or a monthly salary. Used for payout & cost tracking.</div>
              <div className="space-y-2 mb-3">
                <input value={addTrainer.name} onChange={e=>setAddTrainer(a=>({...a,name:e.target.value}))} placeholder="Name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={addTrainer.phone} onChange={e=>setAddTrainer(a=>({...a,phone:e.target.value}))} placeholder="Mobile"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <textarea value={addTrainer.bio||""} onChange={e=>setAddTrainer(a=>({...a,bio:e.target.value}))} placeholder="Coach bio / about (shown to clients on Shop → About)" rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                {/* Three bases — per-head was in the payout sample but had no way to be entered. */}
                <div className="flex gap-1.5">
                  {[["per_class","Per class"],["per_head","Per head"],["salary","Salary"]].map(([k,l])=>(
                    <button key={k} onClick={()=>setAddTrainer(a=>({...a,payType:k}))} className="flex-1 px-2 py-2 rounded-lg text-xs font-semibold"
                      style={{background:addTrainer.payType===k?T.ink:T.card,color:addTrainer.payType===k?T.paper:T.ink,border:`1.5px solid ${addTrainer.payType===k?T.ink:T.line}`}}>{l}</button>))}
                </div>
                {addTrainer.payType==="salary" ? (
                  <input value={addTrainer.monthly} onChange={e=>setAddTrainer(a=>({...a,monthly:e.target.value}))} placeholder="Monthly salary $" type="number"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                ) : (
                  <div className="flex gap-2">
                    {addTrainer.payType==="per_head" ? (
                      <input value={addTrainer.perHead||""} onChange={e=>setAddTrainer(a=>({...a,perHead:e.target.value}))} placeholder="$ / head" type="number"
                        className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    ) : (
                      <input value={addTrainer.perClass} onChange={e=>setAddTrainer(a=>({...a,perClass:e.target.value}))} placeholder="$ / class" type="number"
                        className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>)}
                    <input value={addTrainer.perPt} onChange={e=>setAddTrainer(a=>({...a,perPt:e.target.value}))} placeholder="$ / PT" type="number"
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  </div>)}
                {addTrainer.payType==="per_head" && <div className="text-xs" style={{color:T.muted}}>
                  Paid per attendee actually marked present. No-shows don't count.</div>}
              </div>
              <Btn full disabled={!addTrainer.name} onClick={()=>{
                const nm = addTrainer.name.trim();
                const rateObj = {type:addTrainer.payType, perClass:+addTrainer.perClass||0, perHead:+addTrainer.perHead||0, perPt:+addTrainer.perPt||0, monthly:+addTrainer.monthly||0};
                if (addTrainer.editId) {
                  const id = addTrainer.editId;
                  setTrainers(ts=>ts.map(t=>t.id!==id?t:{...t,name:nm,phone:addTrainer.phone,bio:addTrainer.bio}));
                  setRates(r=>({...r,[id]:rateObj}));
                  ping(`${nm} updated`);
                } else {
                  const id = nm.toLowerCase().replace(/[^a-z]/g,"").slice(0,8)+nid();
                  setTrainers(ts=>[...ts,{id,name:nm,tag:"Coach",phone:addTrainer.phone,bio:addTrainer.bio}]);
                  setRates(r=>({...r,[id]:rateObj}));
                  setShifts(s=>({...s,[id]:{0:["09:00","17:00"],1:["09:00","17:00"],2:["09:00","17:00"],3:["09:00","17:00"],4:["09:00","17:00"]}}));
                  setPerm(p=>({...p,[id]:{editDesc:false,cancel:false,earnings:false,manageLocations:false}}));
                  ping(`${nm} added — shift hours & rate set`);
                }
                setAddTrainer(null);}}>{addTrainer.editId?"Save changes":"Add trainer"}</Btn>
            </div>
          </div>)}

        {/* camp builder sheet */}
        {campBuilder && (
          <CampBuilderForm camp={campBuilder} locations={locations} trainers={trainers}
            ctx={{sessions, ptBookings, timeOff, camps, travel}} tName={tName} locName={locName}
            onCancel={()=>setCampBuilder(null)}
            onSave={(c)=>{
              setCamps(cs => c.id && cs.some(x=>x.id===c.id) ? cs.map(x=>x.id===c.id?c:x) : [...cs, {...c, id:c.id||nid(), spots:(c.spots ?? (+c.cap||0))}]);
              setCampBuilder(null); ping(`"${c.name}" saved`);
            }} />
        )}

        {/* class template builder sheet */}
        {templateBuilder && (
          <TemplateBuilderForm tpl={templateBuilder} locations={locations} trainers={trainers} classTypes={CT} days={DAYS}
            onCancel={()=>setTemplateBuilder(null)}
            onSave={(t)=>{
              setClassTemplates(ts => t.id && ts.some(x=>x.id===t.id) ? ts.map(x=>x.id===t.id?t:x) : [...ts, {...t, id:t.id||nid()}]);
              setTemplateBuilder(null); ping(`"${t.name}" saved`);
            }} />
        )}

        {/* measurements sheet */}
        {measForm && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setMeasForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Stats · {measForm.who}</div><button onClick={()=>setMeasForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="flex gap-2 my-3">
                <input value={measForm.weight} onChange={e=>setMeasForm({...measForm,weight:e.target.value})} placeholder="Weight kg"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={measForm.fat} onChange={e=>setMeasForm({...measForm,fat:e.target.value})} placeholder="Body fat %"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              </div>
              <Btn full disabled={!measForm.weight} onClick={()=>{
                if(measForm.who==="Sam Lee") setMeasurements(m=>[...m,{who:"Sam Lee",weight:+measForm.weight,fat:+measForm.fat||m[m.length-1].fat,d:"Today"}]);
                setMeasForm(null); ping("Stats saved — visible in client's Log tab");}}>Save</Btn>
            </div>
          </div>)}

  </>);
}

