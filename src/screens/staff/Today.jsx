import { useApp } from "../../state/AppState.jsx";
import { CT } from "../../data/seed.js";
import { TODAY } from "../../lib/dates.js";
import { sessTrainers } from "../../lib/scheduling.js";
import { T, disp } from "../../theme.js";
import { Btn, Card, H } from "../../ui/kit.jsx";

export default function StaffToday() {
  const { booked, day, isAdmin, isClient, loc, locName, mark, markAll, myClassBookings, ptBookings, rosterOpen, sessions, setDoneSheet, setRosterOpen, setWalkSheet, tName, tab, user } = useApp();
  return (<>
        {/* ==================== TRAINER / ADMIN: TODAY ==================== */}
        {!isClient && tab==="today" && (
          <main className="flex-1 overflow-y-auto pb-24 px-5">
            <div className="flex items-center justify-between">
              <H>{isAdmin?"Today — all coaches":"Today — my sessions"}</H>
            </div>
            <div className="space-y-3">
              {sessions.filter(s=>s.day===TODAY && (isAdmin || sessTrainers(s).includes(user.id))).sort((a,b)=>a.time.localeCompare(b.time)).map(s=>{
                const ct=CT[s.type]; const n=booked(s);
                const att=[...s.attendees, ...(myClassBookings.includes(s.id)?[{name:"Sam Lee",status:s.attendees.find(a=>a.name==="Sam Lee")?.status||"confirmed"}]:[])];
                return (
                <Card key={s.id}>
                  <div className="flex items-center gap-3">
                    <div style={{...disp,fontWeight:700,fontSize:24,minWidth:56}} className="text-right">{s.time}</div>
                    <div style={{width:3,height:34,borderRadius:2,background:ct.color}}/>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{ct.name} · {locName(s.loc)} {s.done && <span className="text-xs" style={{color:T.moss}}>· DONE ✓</span>}</div>
                      <div className="text-xs" style={{color:T.muted}}>Coach {tName(s.trainer)} · {n}/{s.cap} booked</div></div>
                    <div className="flex flex-col gap-1">
                      <Btn small kind="ghost" onClick={()=>setRosterOpen(rosterOpen===s.id?null:s.id)}>{rosterOpen===s.id?"Hide":"Roster"}</Btn>
                      {!s.done && <Btn small kind="dark" onClick={()=>setDoneSheet({kind:"class", id:s.id, trainer:s.trainer, label:`${ct.name} · ${locName(s.loc)}`, incLabel:"", incAmt:""})}>Complete</Btn>}
                    </div>
                  </div>
                  {rosterOpen===s.id && (
                    <div className="mt-3 pt-3" style={{borderTop:`1.5px solid ${T.line}`}}>
                      {att.map(a=>(
                        <div key={a.name} className="flex items-center justify-between py-1.5">
                          <span className="text-sm">{a.name}{a.name==="Sam Lee" && <span className="text-xs" style={{color:T.accent}}> · demo client</span>}</span>
                          {a.status==="attended" ? <span className="text-xs font-bold" style={{color:T.moss}}>ATTENDED ✓</span> :
                           a.status==="no_show" ? <span className="text-xs font-bold" style={{color:T.accent}}>NO-SHOW · pending admin</span> :
                          <div className="flex gap-1.5">
                            <button onClick={()=>mark(s.id,a.name,"attended")} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:"#EFF3EE",color:T.moss}}>✓</button>
                            <button onClick={()=>mark(s.id,a.name,"no_show")} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:"#F7EEE9",color:T.accent}}>✗</button>
                          </div>}
                        </div>))}
                      <div className="mt-2 flex gap-2">
                        <Btn small kind="ghost" onClick={()=>setWalkSheet({sid:s.id, name:""})}>+ Walk-in</Btn>
                        <Btn small full kind="dark" onClick={()=>markAll(s.id)}>Mark all attended</Btn>
                      </div>
                      <div className="text-xs mt-1.5" style={{color:T.muted}}>Walk-in = attendance only. Cash/other payment handled outside the app.</div>
                    </div>)}
                </Card>);})}
              {/* PT sessions today — completing a PT is the trigger that feeds the client log */}
              {ptBookings.filter(b=>b.day===TODAY && b.status!=="cancelled" && (isAdmin || b.trainer===user.id))
                .sort((a,b)=>a.time.localeCompare(b.time)).map(b=>(
                <Card key={b.id} style={{background:"#EEF1F6"}}>
                  <div className="flex items-center gap-3">
                    <div style={{...disp,fontWeight:700,fontSize:24,minWidth:56}} className="text-right">{b.time}</div>
                    <div style={{width:3,height:34,borderRadius:2,background:T.navy}}/>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">PT · {b.who} {b.status==="done" && <span className="text-xs" style={{color:T.moss}}>· DONE ✓</span>}</div>
                      <div className="text-xs" style={{color:T.muted}}>Coach {tName(b.trainer)} · {locName(b.loc)}</div></div>
                    {b.status!=="done" && <Btn small kind="dark" onClick={()=>setDoneSheet({kind:"pt", id:b.id, trainer:b.trainer, label:`PT · ${b.who} · ${locName(b.loc)}`, incLabel:"", incAmt:""})}>Complete</Btn>}
                  </div>
                </Card>))}
            </div>
          </main>)}

  </>);
}

