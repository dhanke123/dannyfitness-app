import { useState, useEffect, useMemo, useRef } from "react";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";
export default function TemplateBuilderForm({ tpl, locations, trainers, classTypes, days, onCancel, onSave }) {
  const [t, setT] = useState(tpl);
  const addBlock = () => setT(x=>({...x, blocks:[...x.blocks, {day:0, time:"06:30", type:Object.keys(classTypes)[0], loc:locations[0]?.id, trainer:trainers[0].id, cap:8}]}));
  const updBlock = (i,field,val) => setT(x=>({...x, blocks:x.blocks.map((b,j)=>j!==i?b:{...b,[field]:val})}));
  const removeBlock = (i) => setT(x=>({...x, blocks:x.blocks.filter((_,j)=>j!==i)}));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div style={{...disp,fontWeight:700,fontSize:22}}>Class template builder</div>
        <input value={t.name} onChange={e=>setT({...t,name:e.target.value})} placeholder="Template name (e.g. Term 1 Timetable)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none my-3" style={{border:`1.5px solid ${T.line}`}}/>

        <div className="text-xs mb-2" style={{color:T.muted}}>Assign a 2nd coach to any block that needs two — availability blocks both.</div>
        <div className="space-y-2.5">
          {t.blocks.map((b,i)=>(
            <div key={i} className="space-y-1">
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <select value={b.day} onChange={e=>updBlock(i,"day",+e.target.value)} className="col-span-2 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {days.map((d,di)=><option key={d} value={di}>{d}</option>)}
                </select>
                <input value={b.time} onChange={e=>updBlock(i,"time",e.target.value)} className="col-span-2 px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                <select value={b.type} onChange={e=>updBlock(i,"type",e.target.value)} className="col-span-3 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {Object.entries(classTypes).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                </select>
                <select value={b.loc} onChange={e=>updBlock(i,"loc",e.target.value)} className="col-span-4 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className="col-span-1 text-xs" style={{color:T.accent}} onClick={()=>removeBlock(i)}>✗</button>
              </div>
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <span className="col-span-2 text-[10px]" style={{color:T.muted}}>Coaches</span>
                <select value={b.trainer} onChange={e=>updBlock(i,"trainer",e.target.value)} className="col-span-5 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {trainers.map(tr=><option key={tr.id} value={tr.id}>{tr.name}</option>)}
                </select>
                <select value={b.trainer2||""} onChange={e=>updBlock(i,"trainer2",e.target.value||undefined)} className="col-span-5 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  <option value="">+ 2nd coach (optional)</option>
                  {trainers.filter(tr=>tr.id!==b.trainer).map(tr=><option key={tr.id} value={tr.id}>{tr.name}</option>)}
                </select>
              </div>
            </div>))}
        </div>
        <Btn full kind="ghost" onClick={addBlock}><span>+ Add class block</span></Btn>

        <div className="flex gap-2 mt-4">
          <Btn full kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn full disabled={!t.name || t.blocks.length===0} onClick={()=>onSave(t)}>Save template</Btn>
        </div>
      </div>
    </div>
  );
}
