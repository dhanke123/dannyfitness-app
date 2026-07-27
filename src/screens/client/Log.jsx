import { useApp } from "../../state/AppState.jsx";
import { SET_TYPES, estKcal, estKcalRoutine, exSeries, loggedDaySet, muscleVolume, prShelf, strengthLogs } from "../../lib/metrics.js";
import { T, body, disp } from "../../theme.js";
import { Btn, Card, Chip, H } from "../../ui/kit.jsx";

export default function ClientLog() {
  const { active, goal, isClient, logOpen, logView, logs, measurements, progEx, progMetric, repeatLog, routines, setGoal, setLogOpen, setLogView, setNoteSheet, setProgEx, setProgMetric, setRoutineSheet, startBlank, startFromRoutine, tName, tab } = useApp();
  return (<>
        {/* ==================== CLIENT: LOG ==================== */}
        {isClient && tab==="log" && (() => {
          const prs = prShelf(logs);
          const allEx = [...new Set(strengthLogs(logs).flatMap(l=>(l.exercises||[]).map(e=>e.ex)))];
          const series = exSeries(logs, progEx);
          const maxV = Math.max(1, ...series.map(s=>progMetric==="orm"?s.orm:s.top));
          const vol = muscleVolume(logs, 30);
          const maxVol = Math.max(1, ...vol.map(v=>v[1]));
          const dayset = loggedDaySet(logs);
          const weekWorkouts = strengthLogs(logs).filter(l=>(l.daysAgo??0)<=7).length;
          const myRoutines = routines.filter(r=>r.owner==="sam" || r.assignedTo==="Sam Lee");
          const bodyKg = measurements[measurements.length-1].weight;
          const monthLogs = logs.filter(l=>(l.daysAgo??0)<=31); // history: last month only
          const weekKcal = logs.filter(l=>(l.daysAgo??0)<=7).reduce((a,l)=>a+(estKcal(l,bodyKg)||0),0);
          return (
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-5">
            <H>Training log</H>
            <div className="flex gap-2 mb-3">
              <Chip active={logView==="train"} onClick={()=>setLogView("train")}>Train</Chip>
              <Chip active={logView==="progress"} onClick={()=>setLogView("progress")}>Progress</Chip>
            </div>

            {/* ---------------- TRAIN: start, routines, history ---------------- */}
            {logView==="train" && (<>
              <Card className="mb-3" style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="text-sm" style={{color:"#B9B5A9"}}>{weekWorkouts} workout{weekWorkouts!==1?"s":""} this week{weekKcal>0?` · ~${weekKcal} kcal burned`:""}</div>
                <div className="mt-2"><Btn full onClick={startBlank}>Start a workout</Btn></div>
                <button onClick={()=>setNoteSheet({activity:"Run", duration:"", distance:"", notes:""})}
                  className="w-full text-center text-xs mt-2 font-semibold" style={{color:"#B9B5A9"}}>or log a run / cardio activity</button>
              </Card>

              {/* routines */}
              <Card className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold" style={{color:T.muted}}>MY ROUTINES</div>
                  <Btn small kind="ghost" onClick={()=>setRoutineSheet({name:"", items:[], owner:"sam"})}>+ New</Btn>
                </div>
                {myRoutines.length===0 && <div className="text-xs" style={{color:T.muted}}>No routines yet. Build one, or ask your coach to assign a plan.</div>}
                {myRoutines.map(r=>(
                  <div key={r.id} className="flex items-center justify-between py-1.5">
                    <div><div className="font-semibold text-sm">{r.name} {r.assignedTo && r.owner!=="sam" && <span className="text-xs" style={{color:T.plum}}>· from Coach {tName(r.owner)}</span>}</div>
                      <div className="text-xs" style={{color:T.muted}}>{r.items.length} exercises · ~{estKcalRoutine(r,bodyKg)} kcal</div></div>
                    <Btn small onClick={()=>startFromRoutine(r)}>Start</Btn>
                  </div>))}
              </Card>

              {/* history — last 30 days */}
              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>HISTORY · last 30 days</div>
              <div className="space-y-2">
                {monthLogs.map((l)=>{ const kc=estKcal(l,bodyKg); return (
                  <Card key={l.id||l.title+l.d}>
                    <div className="flex justify-between items-center" onClick={()=>l.exercises && setLogOpen(logOpen===l.id?null:l.id)}>
                      <div><div className="font-semibold text-sm">{l.title} {l.kind==="cardio" && <span className="text-xs" style={{color:T.moss}}>· activity</span>}</div>
                        <div className="text-xs" style={{color:T.muted}}>{l.exercises ? `${l.exercises.length} exercises` : l.detail}{kc?` · ~${kc} kcal`:""}</div></div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold" style={{color:T.muted}}>{l.d}</div>
                        {l.exercises && <span className="text-xs" style={{color:T.navy}}>{logOpen===l.id?"▴":"▾"}</span>}
                      </div>
                    </div>
                    {l.exercises && logOpen===l.id && (
                      <div className="mt-3 pt-3 space-y-2" style={{borderTop:`1.5px solid ${T.line}`}}>
                        {l.exercises.map((e,i)=>(
                          <div key={i}>
                            <div className="text-sm font-semibold">{e.ex} <span className="text-xs font-normal" style={{color:T.muted}}>· {e.muscle}</span></div>
                            {e.sets.map((s,j)=>(
                              <div key={j} className="flex justify-between text-xs py-0.5" style={{color:T.muted}}>
                                <span><span className="font-bold" style={{color:SET_TYPES[s.type]?.color||T.ink}}>{SET_TYPES[s.type]?.lbl||"N"}</span> set {j+1}</span>
                                <span className="font-semibold" style={{color:T.ink}}>{s.reps} × {s.w}kg{s.rpe?` · RPE ${s.rpe}`:""}</span>
                              </div>))}
                          </div>))}
                        <Btn small full kind="ghost" onClick={()=>repeatLog(l)}>Repeat this workout</Btn>
                      </div>)}
                  </Card>);})}
              </div>
            </>)}

            {/* ---------------- PROGRESS: streak, PRs, charts, body stats ---------------- */}
            {logView==="progress" && (() => {
              const bodyKg = measurements[measurements.length-1].weight;
              const weekWorkouts = strengthLogs(logs).filter(l=>(l.daysAgo??0)<=7).length;
              const weekKcal = logs.filter(l=>(l.daysAgo??0)<=7).reduce((a,l)=>a+(estKcal(l,bodyKg)||0),0);
              const wPct = Math.min(100, Math.round(weekWorkouts/(goal.workouts||1)*100));
              const kPct = Math.min(100, Math.round(weekKcal/(goal.kcal||1)*100));
              return (<>
              {/* weekly goal — client sets it, drives the Home ring */}
              <Card className="mb-3">
                <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-2">MY WEEKLY GOAL</div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Workouts</span>
                    <button onClick={()=>setGoal(g=>({...g,workouts:Math.max(1,g.workouts-1)}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>−</button>
                    <span className="text-sm font-bold w-5 text-center">{goal.workouts}</span>
                    <button onClick={()=>setGoal(g=>({...g,workouts:g.workouts+1}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>+</button>
                  </div>
                  <span className="text-xs" style={{color:T.muted}}>{weekWorkouts}/{goal.workouts} done</span>
                </div>
                <div className="rounded-full h-2 mb-3" style={{background:"#efe7d8"}}><div className="h-2 rounded-full" style={{width:`${wPct}%`,background:T.accent}}/></div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Active kcal</span>
                    <button onClick={()=>setGoal(g=>({...g,kcal:Math.max(500,g.kcal-250)}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>−</button>
                    <span className="text-sm font-bold w-12 text-center">{goal.kcal}</span>
                    <button onClick={()=>setGoal(g=>({...g,kcal:g.kcal+250}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>+</button>
                  </div>
                  <span className="text-xs" style={{color:T.muted}}>{weekKcal}/{goal.kcal}</span>
                </div>
                <div className="rounded-full h-2" style={{background:"#efe7d8"}}><div className="h-2 rounded-full" style={{width:`${kPct}%`,background:T.amber}}/></div>
                <div className="text-xs mt-2" style={{color:T.muted}}>Your Home ring shows the average of these two.</div>
              </Card>
              <Card className="mb-3" style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="flex gap-5 mb-2">
                  <div><span style={{...disp,fontWeight:700,fontSize:26,color:T.accent}}>{weekWorkouts}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>workouts / 7d</span></div>
                  <div><span style={{...disp,fontWeight:700,fontSize:26,color:T.accent}}>{prs.length}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>PRs tracked</span></div>
                </div>
                <div className="text-xs mb-1" style={{color:"#B9B5A9"}}>LAST 3 WEEKS</div>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({length:21}).map((_,i)=>{ const off=20-i; const on=dayset.has(off);
                    return <span key={i} title={`${off}d ago`} style={{width:11,height:11,borderRadius:3,background:on?T.accent:"#3A362B"}}/>; })}
                </div>
              </Card>

              {prs.length>0 && (
                <Card className="mb-3" style={{background:"#FBF3EC"}}>
                  <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>PERSONAL RECORDS 🏆</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {prs.slice(0,6).map(([ex,pr])=>(
                      <div key={ex} className="text-sm"><span className="font-bold">{pr.w}kg</span> <span className="text-xs" style={{color:T.muted}}>{ex} · {pr.reps}r</span></div>))}
                  </div>
                </Card>)}

              {allEx.length>0 && (
                <Card className="mb-3" style={{background:"#EEF1F6"}}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-bold" style={{color:T.navy}}>PROGRESS</div>
                    <div className="flex gap-1.5 items-center">
                      <button onClick={()=>setProgMetric(m=>m==="top"?"orm":"top")} className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.navy}}>{progMetric==="orm"?"est 1RM":"top set"}</button>
                      <select value={progEx} onChange={e=>setProgEx(e.target.value)} className="text-xs font-semibold px-2 py-1 rounded-lg outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}>
                        {allEx.map(ex=><option key={ex} value={ex}>{ex}</option>)}
                      </select>
                    </div>
                  </div>
                  {series.length===0 ? <div className="text-xs" style={{color:T.muted}}>No logged sets for {progEx} yet.</div> : (
                    <div className="flex items-end gap-3">
                      {series.map((s,i)=>{ const v=progMetric==="orm"?s.orm:s.top; return (
                        <div key={i} className="text-center">
                          <div className="rounded-t" style={{width:24,height:20+v/maxV*60,background:T.navy}}/>
                          <div className="text-[10px] mt-1" style={{color:T.muted}}>{v}kg</div>
                          <div className="text-[9px]" style={{color:T.muted}}>{s.d}</div>
                        </div>);})}
                    </div>)}
                </Card>)}

              {vol.length>0 && (
                <Card className="mb-3">
                  <div className="text-xs font-bold mb-2" style={{color:T.muted}}>VOLUME BY MUSCLE · sets, last 30d</div>
                  <div className="space-y-1.5">
                    {vol.map(([m,n])=>(
                      <div key={m} className="flex items-center gap-2">
                        <span className="text-xs w-16" style={{color:T.muted}}>{m}</span>
                        <div className="flex-1 rounded-full h-3" style={{background:"#EFEBE3"}}>
                          <div className="h-3 rounded-full" style={{width:`${n/maxVol*100}%`,background:T.moss}}/></div>
                        <span className="text-xs font-bold w-6 text-right">{n}</span>
                      </div>))}
                  </div>
                </Card>)}

              <Card style={{background:"#EFF3EE"}}>
                <div className="text-xs font-bold mb-1" style={{color:T.moss}}>BODY STATS · coach-tracked</div>
                <div className="flex gap-6">
                  <div><span style={{...disp,fontWeight:700,fontSize:26}}>{measurements[measurements.length-1].weight}</span><span className="text-xs" style={{color:T.muted}}> kg</span></div>
                  <div><span style={{...disp,fontWeight:700,fontSize:26}}>{measurements[measurements.length-1].fat}</span><span className="text-xs" style={{color:T.muted}}> % fat</span></div>
                  <div className="text-xs self-end pb-1" style={{color:T.moss}}>▾ {(measurements[0].fat-measurements[measurements.length-1].fat).toFixed(1)}% since 1 Jul</div>
                </div>
              </Card>
            </>);})()}
          </main>);})()}

  </>);
}

