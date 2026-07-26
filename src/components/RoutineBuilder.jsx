import { useState, useEffect, useMemo, useRef } from "react";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";
export default function RoutineBuilder({ rs, setRs, exLib, onSave }) {
  const [pick, setPick] = useState(false);
  const allEx = Object.entries(exLib).flatMap(([m,arr])=>arr.map(n=>[n,m]));
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setRs(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div style={{...disp,fontWeight:700,fontSize:22}}>New routine</div>
          <button onClick={()=>setRs(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
        </div>
        <input value={rs.name} onChange={e=>setRs(r=>({...r,name:e.target.value}))} placeholder="Routine name (e.g. Leg Day)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none my-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
        <div className="space-y-2 mb-3">
          {rs.items.map((it,i)=>(
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm font-semibold">{it.ex}</span>
              <input value={it.sets} type="number" onChange={e=>setRs(r=>({...r,items:r.items.map((x,j)=>j!==i?x:{...x,sets:+e.target.value||1})}))} className="w-12 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
              <span className="text-xs" style={{color:T.muted}}>×</span>
              <input value={it.reps} type="number" onChange={e=>setRs(r=>({...r,items:r.items.map((x,j)=>j!==i?x:{...x,reps:+e.target.value||1})}))} className="w-12 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
              <button onClick={()=>setRs(r=>({...r,items:r.items.filter((_,j)=>j!==i)}))} className="text-xs" style={{color:T.accent}}>✕</button>
            </div>))}
        </div>
        {pick ? (
          <div className="mb-3 max-h-40 overflow-y-auto">
            {allEx.map(([n,m])=>(
              <button key={n} onClick={()=>{ setRs(r=>({...r,items:[...r.items,{ex:n,muscle:m,sets:3,reps:8}]})); setPick(false); }}
                className="block w-full text-left text-sm py-1.5 px-2 rounded-lg" style={{color:T.ink}}>{n} <span className="text-xs" style={{color:T.muted}}>· {m}</span></button>))}
          </div>
        ) : <Btn full kind="ghost" onClick={()=>setPick(true)}>+ Add exercise</Btn>}
        <div className="mt-3"><Btn full disabled={!rs.name.trim()||rs.items.length===0} onClick={()=>onSave(rs)}>Save routine</Btn></div>
      </div>
    </div>
  );
}
