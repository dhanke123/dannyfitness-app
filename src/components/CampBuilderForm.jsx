import { useState, useEffect, useMemo, useRef } from "react";
import { T, disp } from "../theme.js";
import { Btn, Card } from "../ui/kit.jsx";
export default function CampBuilderForm({ camp, locations, trainers, onCancel, onSave }) {
  const [c, setC] = useState(camp);
  const addDay = () => setC(x=>({...x, days:[...x.days, {label:`Day ${x.days.length+1}`, sessions:[]}]}));
  const dupDay = (i) => setC(x=>({...x, days:[...x.days.slice(0,i+1), {...JSON.parse(JSON.stringify(x.days[i])), label:`Day ${x.days.length+1}`}, ...x.days.slice(i+1)]}));
  const removeDay = (i) => setC(x=>({...x, days:x.days.filter((_,j)=>j!==i)}));
  const addSession = (i) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d, sessions:[...d.sessions,{activity:"", trainer:trainers[0].id, start:"09:00", hours:1}]})}));
  const updSession = (i,k,field,val) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d, sessions:d.sessions.map((s,l)=>l!==k?s:{...s,[field]:val})})}));
  const removeSession = (i,k) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d, sessions:d.sessions.filter((_,l)=>l!==k)})}));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div style={{...disp,fontWeight:700,fontSize:22}}>Camp builder</div>
        <div className="grid grid-cols-2 gap-2 my-3">
          <input value={c.name} onChange={e=>setC({...c,name:e.target.value})} placeholder="Camp name" className="col-span-2 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          <select value={c.type} onChange={e=>setC({...c,type:e.target.value})} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}>
            <option>Kids</option><option>Adult</option>
          </select>
          <select value={c.loc} onChange={e=>setC({...c,loc:e.target.value})} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}>
            {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input value={c.dates} onChange={e=>setC({...c,dates:e.target.value})} placeholder="Dates label (e.g. 15–16 Aug)" className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          <input value={c.price} onChange={e=>setC({...c,price:e.target.value})} placeholder="Price $" type="number" className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          <input value={c.cap} onChange={e=>setC({...c,cap:e.target.value})} placeholder="Capacity" type="number" className="col-span-2 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
        </div>

        <div className="space-y-3">
          {c.days.map((d,i)=>(
            <Card key={i} className="!p-3">
              <div className="flex items-center justify-between mb-2">
                <input value={d.label} onChange={e=>setC(x=>({...x,days:x.days.map((dd,j)=>j!==i?dd:{...dd,label:e.target.value})}))}
                  className="font-bold text-sm px-2 py-1 rounded outline-none" style={{border:`1px solid ${T.line}`,width:110}}/>
                <div className="flex gap-1.5">
                  <button className="text-xs font-bold" style={{color:T.navy}} onClick={()=>dupDay(i)}>Duplicate</button>
                  <button className="text-xs font-bold" style={{color:T.accent}} onClick={()=>removeDay(i)}>Remove day</button>
                </div>
              </div>
              {d.sessions.map((s,k)=>(
                <div key={k} className="grid grid-cols-12 gap-1.5 mb-1.5 items-center">
                  <input value={s.activity} onChange={e=>updSession(i,k,"activity",e.target.value)} placeholder="Activity" className="col-span-5 px-2 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <select value={s.trainer} onChange={e=>updSession(i,k,"trainer",e.target.value)} className="col-span-3 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                    {trainers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={s.start} onChange={e=>updSession(i,k,"start",e.target.value)} className="col-span-2 px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <input value={s.hours} onChange={e=>updSession(i,k,"hours",+e.target.value||0)} type="number" step="0.5" className="col-span-1 px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <button className="col-span-1 text-xs" style={{color:T.accent}} onClick={()=>removeSession(i,k)}>✗</button>
                </div>))}
              <button className="text-xs font-bold mt-1" style={{color:T.navy}} onClick={()=>addSession(i)}>+ Add session block</button>
            </Card>))}
          <Btn full kind="ghost" onClick={addDay}>+ Add day</Btn>
        </div>

        <div className="flex gap-2 mt-4">
          <Btn full kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn full disabled={!c.name} onClick={()=>onSave(c)}>Save camp</Btn>
        </div>
      </div>
    </div>
  );
}
