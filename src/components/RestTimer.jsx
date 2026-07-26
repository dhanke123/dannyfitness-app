import { useState, useEffect, useMemo, useRef } from "react";
import { T, disp } from "../theme.js";
export default function RestTimer({ rest, onDone, onChange }) {
  const [left, setLeft] = useState(rest.sec);
  useEffect(() => { setLeft(rest.sec); }, [rest.sec, rest.ex]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const mmss = `${Math.floor(Math.max(0,left)/60)}:${String(Math.max(0,left)%60).padStart(2,"0")}`;
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-4 pb-4">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{background:T.ink,color:T.paper,boxShadow:"0 6px 20px rgba(0,0,0,.3)"}}>
        <div className="text-xs" style={{color:"#B9B5A9"}}>Rest · {rest.ex}</div>
        <div style={{...disp,fontWeight:700,fontSize:24,color:left<=0?"#8FD9B6":T.paper}}>{left<=0?"Done!":mmss}</div>
        <div className="flex-1"/>
        <button onClick={()=>onChange(Math.max(0,left-15))} className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:"1.5px solid #3A362B"}}>−15s</button>
        <button onClick={()=>onChange(left+15)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:"1.5px solid #3A362B"}}>+15s</button>
        <button onClick={onDone} className="text-xs font-bold px-2 py-1 rounded-lg" style={{background:T.accent}}>Skip</button>
      </div>
    </div>
  );
}
