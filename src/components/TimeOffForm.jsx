import { useState, useEffect, useMemo, useRef } from "react";
import { DAYS } from "../lib/dates.js";
import { T, disp } from "../theme.js";
import { Btn, Chip } from "../ui/kit.jsx";
export default function TimeOffForm({ trainer, tName, onCancel, onSave }) {
  const [scope, setScope] = useState("weekly");
  const [dayIdx, setDayIdx] = useState(0);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Time off · {tName(trainer)}</div><button onClick={onCancel} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
        <div className="text-xs mb-3" style={{color:T.muted}}>Blocks these slots from being offered. Remove anytime to restore availability.</div>
        <div className="flex gap-2 mb-3">
          <Chip active={scope==="single"} onClick={()=>setScope("single")}>One-off date</Chip>
          <Chip active={scope==="weekly"} onClick={()=>setScope("weekly")}>Weekly recurring</Chip>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {DAYS.map((d,i)=><Chip key={d} active={dayIdx===i} onClick={()=>setDayIdx(i)}>{d}</Chip>)}
        </div>
        <button className="flex items-center justify-between w-full py-2 mb-2" onClick={()=>setAllDay(a=>!a)}>
          <span className="text-sm font-semibold">Full day</span>
          <span className="text-xs font-bold" style={{color:allDay?T.moss:T.muted}}>{allDay?"ON ●":"OFF ○"}</span>
        </button>
        {!allDay && (
          <div className="flex items-center gap-2 mb-3">
            <input value={start} onChange={e=>setStart(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
            <span className="text-sm">to</span>
            <input value={end} onChange={e=>setEnd(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          </div>)}
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (optional)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
        <Btn full onClick={()=>onSave({trainer, scope, day:dayIdx, allDay, start, end, reason})}>Save time off</Btn>
      </div>
    </div>
  );
}
