/* Camps builder. Moved out of the admin bottom nav and under Manage — camps are
   set up occasionally, so a permanent slot in a five-item nav was expensive real
   estate. Exported as a body (no <main>) because it now renders inside Manage. */

import { useApp } from "../../state/AppState.jsx";
import { T } from "../../theme.js";
import { Btn, Card } from "../../ui/kit.jsx";

export default function CampsSection() {
  const { camps, locName, locations, setCampBuilder, tName } = useApp();
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold" style={{color:T.muted}}>CAMPS · day-by-day builder</div>
        <Btn small onClick={()=>setCampBuilder({name:"", type:"Kids", loc:locations[0]?.id, price:"", cap:"", dates:"", startDate:"",
          // Start with Day 1 and one block already there. Opening on an empty shell
          // hid the coach picker entirely — it only exists inside a block, so you had
          // to add a day AND a block before you could see there was a coach option.
          leadCoach:"danny",
          days:[{label:"Day 1", sessions:[{activity:"", trainers:["danny"], start:"09:00", hours:2}]}]})}>+ New camp</Btn>
      </div>
      <div className="text-xs mb-3" style={{color:T.muted}}>Build day by day — each day can hold more than one activity block, with its own coach, start time and duration. Assigned coaches see these in their normal Today/Schedule view.</div>
      <div className="space-y-3">
        {camps.length===0 && <div className="text-xs" style={{color:T.muted}}>No camps yet.</div>}
        {camps.map(c=>(
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs" style={{color:T.muted}}>{c.type} · {c.dates} · {locName(c.loc)} · ${c.price} · {c.days.length} day{c.days.length!==1?"s":""} built</div>
              </div>
              <Btn small kind="ghost" onClick={()=>setCampBuilder(JSON.parse(JSON.stringify(c)))}>Edit</Btn>
            </div>
            <div className="mt-2 space-y-1">
              {c.days.map((d,i)=>(
                <div key={i} className="text-xs" style={{color:T.muted}}>
                  <span className="font-bold" style={{color:T.ink}}>{d.label}:</span>{" "}
                  {d.sessions.map(s=>`${s.activity} (${tName(s.trainer)}, ${s.start}, ${s.hours}h)`).join(" · ") || "no sessions yet"}
                </div>))}
            </div>
          </Card>))}
      </div>
    </div>);
}
