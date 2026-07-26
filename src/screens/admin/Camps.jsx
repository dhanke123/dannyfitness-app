import { useApp } from "../../state/AppState.jsx";
import { T } from "../../theme.js";
import { Btn, Card, H } from "../../ui/kit.jsx";

export default function AdminCamps() {
  const { camps, day, isAdmin, loc, locName, locations, sessions, setCampBuilder, tName, tab } = useApp();
  return (<>
        {/* ==================== ADMIN: CAMPS (builder) ==================== */}
        {isAdmin && tab==="camps" && (
          <main className="flex-1 pb-24 px-5">
            <div className="flex items-center justify-between mb-3">
              <H>Camps</H>
              <Btn small onClick={()=>setCampBuilder({name:"", type:"Kids", loc:locations[0]?.id, price:"", cap:"", dates:"", days:[]})}>+ New camp</Btn>
            </div>
            <div className="text-xs mb-3" style={{color:T.muted}}>Build day by day — each day can hold more than one activity block, with its own coach, start time and duration. Assigned coaches see these in their normal Today/Schedule view.</div>
            <div className="space-y-3">
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
          </main>)}

  </>);
}

