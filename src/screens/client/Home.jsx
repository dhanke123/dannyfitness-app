import { useApp } from "../../state/AppState.jsx";
import { CT } from "../../data/seed.js";
import { DAYS, toMin } from "../../lib/dates.js";
import { estKcal, prShelf, strengthLogs } from "../../lib/metrics.js";
import { T, disp } from "../../theme.js";

export default function ClientHome() {
  const { active, bookDates, booked, checkIn, checkedIn, classPass, credits, day, goal, isClient, loc, locName, logs, measurements, myClassBookings, myPT, ping, sessions, setLogView, setSeg, setTab, tName, tab, user } = useApp();
  return (<>
        {/* ==================== CLIENT: HOME (Solar Warm dashboard) ==================== */}
        {isClient && tab==="home" && (() => {
          const todayStr = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase().replace(',','');
          const _hr=new Date().getHours(); const greet=_hr<12?"Good morning":_hr<18?"Good afternoon":"Good evening";
          const upC = myClassBookings.map(sid=>{const s=sessions.find(x=>x.id===sid); return {t:s.day*1440+toMin(s.time), time:s.time, day:s.day, date:bookDates[sid], title:CT[s.type].name, sub:`${locName(s.loc)} · Coach ${tName(s.trainer)}`};});
          const upP = myPT.map(b=>({t:b.day*1440+toMin(b.time), time:b.time, day:b.day, date:b.date, title:"Personal Training", sub:`${b.loc==="other"?b.otherLabel:locName(b.loc)} · Coach ${tName(b.trainer)}`}));
          const hero = [...upC,...upP].sort((a,b)=>a.t-b.t)[0];
          const bodyKg = measurements[measurements.length-1].weight;
          const weekWorkouts = strengthLogs(logs).filter(l=>(l.daysAgo??0)<=7).length;
          const weekKcal = logs.filter(l=>(l.daysAgo??0)<=7).reduce((a,l)=>a+(estKcal(l,bodyKg)||0),0);
          const prsN = prShelf(logs).length;
          // weekly-goal completion: blend of workouts + active-kcal progress
          const wR = Math.min(1, weekWorkouts/(goal.workouts||1));
          const kR = Math.min(1, weekKcal/(goal.kcal||1));
          const ringPct = Math.round((wR+kR)/2*100);
          return (
          <main className="flex-1 pb-24 px-5">
            {/* greeting + activity ring */}
            <div className="flex items-start justify-between mb-3 mt-1">
              <div>
                <div className="text-sm" style={{color:T.muted}}>{greet},</div>
                <div style={{...disp,fontWeight:800,fontSize:24}}>{user.name}</div>
                <div style={{...disp,fontWeight:700,letterSpacing:".1em",fontSize:10,color:T.accent,marginTop:3}}>{todayStr}</div>
              </div>
              <div style={{width:66,height:66,borderRadius:"50%",display:"grid",placeItems:"center",position:"relative",
                background:`conic-gradient(${T.accent} ${ringPct}%, #f0e7d8 0)`}}>
                <span style={{position:"absolute",inset:7,borderRadius:"50%",background:T.paper}}/>
                <b style={{position:"relative",zIndex:2,...disp,fontWeight:800,fontSize:16}}>{ringPct}%</b>
              </div>
            </div>

            {/* Next up hero */}
            {hero ? (
              <div style={{position:"relative",borderRadius:26,padding:18,overflow:"hidden",color:"#fff",marginBottom:12,
                background:"linear-gradient(130deg,#FF5A3C 5%,#FFA53D 100%)",boxShadow:"0 18px 34px rgba(255,110,60,.28)"}}>
                <div style={{position:"absolute",right:-30,bottom:-44,width:158,height:158,borderRadius:"50%",background:"rgba(255,255,255,.14)"}}/>
                <span style={{...disp,fontWeight:700,fontSize:11,color:T.accent,background:"#fff",padding:"5px 11px",borderRadius:999}}>● NEXT UP · {hero.date||DAYS[hero.day]} · {hero.time}</span>
                <div style={{...disp,fontWeight:800,fontSize:21,marginTop:10,position:"relative"}}>{hero.title}</div>
                <div className="text-xs" style={{marginTop:3,opacity:.94,position:"relative"}}>{hero.sub}</div>
                <div className="flex items-center gap-3" style={{marginTop:14,position:"relative"}}>
                  <button onClick={()=>checkIn(`${hero.day}-${hero.time}`, hero.title)} style={{flex:1,...disp,fontWeight:700,fontSize:14,padding:12,borderRadius:14,border:"none",background:"#fff",color:T.accent}}>{checkedIn.includes(`${hero.day}-${hero.time}`) ? "Checked in ✓" : "Check in"}</button>
                  <button onClick={()=>{setTab("book"); setSeg("mine");}} className="text-xs font-semibold" style={{color:"#fff",opacity:.95,textDecoration:"underline",whiteSpace:"nowrap"}}>Manage bookings</button>
                </div>
              </div>
            ) : (
              <div style={{position:"relative",borderRadius:26,padding:20,overflow:"hidden",color:"#fff",marginBottom:12,
                background:"linear-gradient(130deg,#FF5A3C 5%,#FFA53D 100%)"}}>
                <div style={{...disp,fontWeight:800,fontSize:20}}>Ready to move?</div>
                <div className="text-xs" style={{opacity:.94,marginTop:2}}>Nothing booked yet — grab a class, PT or camp.</div>
                <button onClick={()=>setTab("book")} style={{...disp,fontWeight:700,fontSize:14,padding:"11px 16px",borderRadius:14,border:"none",background:"#fff",color:T.accent,marginTop:12}}>Book a session</button>
              </div>
            )}

            {/* Quick stats — every one of these is a summary of something that lives on
                Log → Progress, so tapping a number should take you to the detail behind
                it. They were static divs, which reads as "this is just a readout" and
                leaves the user hunting through the bottom nav for the chart. */}
            <div className="flex gap-2.5 mb-3">
              {[[weekWorkouts, "WORKOUTS/WK", T.accent, "weekly workout goal"],
                [prsN, "PRS", T.blue, "personal records"],
                [weekKcal>=1000 ? (weekKcal/1000).toFixed(1)+"k" : weekKcal, "KCAL/WK", T.amber, "weekly calorie goal"]
               ].map(([value, label, color, what]) => (
                <button key={label}
                  onClick={()=>{ setTab("log"); setLogView("progress"); }}
                  aria-label={`${label.replace("/"," per ").toLowerCase()} — open Progress to see your ${what}`}
                  className="flex-1 text-center"
                  style={{background:T.card, border:`1.5px solid ${T.line}`, borderRadius:20,
                          padding:"12px 6px", position:"relative", cursor:"pointer"}}>
                  {/* small affordance: without it these still look like read-only cards */}
                  <span aria-hidden="true" style={{position:"absolute", top:8, right:9, fontSize:11,
                        lineHeight:1, color:T.line, fontWeight:800}}>›</span>
                  <div style={{...disp,fontWeight:800,fontSize:26,color}}>{value}</div>
                  <div style={{...disp,fontWeight:700,fontSize:9,color:T.muted,letterSpacing:".04em"}}>{label}</div>
                </button>))}
            </div>

            {/* quick start */}
            <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-2">JUMP BACK IN</div>
            <div className="flex gap-2.5 mb-4">
              <button onClick={()=>{setTab("log"); setLogView("train");}} className="flex-1 flex items-center gap-2.5" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:12,textAlign:"left"}}>
                <div style={{width:34,height:34,borderRadius:12,background:T.accent,color:"#fff",display:"grid",placeItems:"center",fontWeight:800,fontSize:16}}>＋</div>
                <div><div style={{...disp,fontWeight:700,fontSize:13}}>Train</div><div className="text-xs" style={{color:T.muted}}>Routines &amp; log</div></div>
              </button>
              <button onClick={()=>setTab("book")} className="flex-1 flex items-center gap-2.5" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:12,textAlign:"left"}}>
                <div style={{width:34,height:34,borderRadius:12,background:T.blue,color:"#fff",display:"grid",placeItems:"center",fontWeight:800,fontSize:16}}>↻</div>
                <div><div style={{...disp,fontWeight:700,fontSize:13}}>Book class</div><div className="text-xs" style={{color:T.muted}}>This week</div></div>
              </button>
            </div>

            {/* pack balance strip */}
            <div style={{background:T.ink,color:"#fff",borderRadius:20,padding:14,marginBottom:14}}>
              <div style={{...disp,fontWeight:700,fontSize:10,letterSpacing:".06em",color:"#C9BEB0"}}>MY BALANCE</div>
              <div className="flex gap-5 mt-1 flex-wrap">
                <div><span style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{credits.classes}</span> <span className="text-xs" style={{color:"#C9BEB0"}}>class</span></div>
                <div><span style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{credits.ptHead}</span> <span className="text-xs" style={{color:"#C9BEB0"}}>PT · head</span></div>
                <div><span style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{credits.ptCoach}</span> <span className="text-xs" style={{color:"#C9BEB0"}}>PT · coach</span></div>
              </div>
              {classPass && <div className="text-xs mt-2 font-semibold" style={{color:T.moss}}>✓ {classPass.label} active — classes covered</div>}
            </div>

          </main>);})()}

  </>);
}

