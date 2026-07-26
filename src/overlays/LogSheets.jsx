import { useApp } from "../state/AppState.jsx";
import RestTimer from "../components/RestTimer.jsx";
import RoutineBuilder from "../components/RoutineBuilder.jsx";
import { ACTIVITIES, BAR_KG, PLATES, SET_TYPES, bestWeight, est1RM, estKcalCardio, exMeta, isWorking } from "../lib/metrics.js";
import { nid } from "../lib/util.js";
import { T, disp } from "../theme.js";
import { Btn, Chip, Select } from "../ui/kit.jsx";

export default function LogSheets() {
  const { active, addCustomExercise, addExerciseToActive, addSet, customEx, cycleType, exLib, exPicker, exSearch, finishWorkout, intakeForm, logs, measurements, noteSheet, ping, plate, prToast, removeExercise, removeSet, rest, routineSheet, setActive, setCustomEx, setExPicker, setExSearch, setIntakeForm, setLogs, setNoteSheet, setPlate, setRest, setRoutineSheet, setRoutines, sheet, toast, toggleSetDone, updSet } = useApp();
  return (<>
        {/* activity logger — cardio / sports with duration + optional distance */}
        {noteSheet && (() => {
          const act = ACTIVITIES.find(a=>a.name===noteSheet.activity) || ACTIVITIES[0];
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setNoteSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Log activity</div>
                <button onClick={()=>setNoteSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs font-bold mb-1.5 mt-2" style={{color:T.muted}}>ACTIVITY</div>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {ACTIVITIES.map(a=>(
                  <Chip key={a.name} active={noteSheet.activity===a.name} onClick={()=>setNoteSheet(n=>({...n,activity:a.name}))}>{a.name}</Chip>))}
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{color:T.muted}}>Duration (min)</div>
                  <input value={noteSheet.duration} onChange={e=>setNoteSheet(n=>({...n,duration:e.target.value}))} placeholder="e.g. 40" type="number"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                </div>
                {act.dist && (
                  <div className="flex-1">
                    <div className="text-xs mb-1" style={{color:T.muted}}>Distance (km)</div>
                    <input value={noteSheet.distance} onChange={e=>setNoteSheet(n=>({...n,distance:e.target.value}))} placeholder="e.g. 6" type="number"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  </div>)}
              </div>
              <input value={noteSheet.notes} onChange={e=>setNoteSheet(n=>({...n,notes:e.target.value}))} placeholder="Notes (optional) — how it felt, route, etc."
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <Btn full disabled={!noteSheet.duration} onClick={()=>{
                const parts = [`${noteSheet.duration} min`];
                if (act.dist && noteSheet.distance) parts.push(`${noteSheet.distance} km`);
                if (noteSheet.notes) parts.push(noteSheet.notes);
                const kc = estKcalCardio(+noteSheet.duration, noteSheet.activity, measurements[measurements.length-1].weight);
                setLogs(l=>[{id:nid(), d:"Today", daysAgo:0, title:noteSheet.activity, detail:parts.join(" · "), kind:"cardio", mins:+noteSheet.duration, activity:noteSheet.activity},...l]);
                ping(`${noteSheet.activity} logged — ~${kc} kcal`); setNoteSheet(null);}}>Save activity</Btn>
            </div>
          </div>);})()}

        {/* ACTIVE WORKOUT — full-screen Strong-style logger */}
        {active && (
          <div className="fixed inset-0 z-30 flex flex-col" style={{background:T.paper}}>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between" style={{borderBottom:`1.5px solid ${T.line}`}}>
              <div className="flex-1">
                <input value={active.title} onChange={e=>setActive(a=>({...a,title:e.target.value}))}
                  className="font-bold text-lg outline-none w-full" style={{...disp}}/>
                <div className="text-xs" style={{color:T.muted}}>{active.exercises.length} exercises · tap the ○ to complete a set</div>
              </div>
              <button onClick={()=>setActive(null)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕ Cancel</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {active.exercises.length===0 && <div className="text-center text-sm py-10" style={{color:T.muted}}>No exercises yet — add one below.</div>}
              {active.exercises.map((e,ei)=>{
                const pb = bestWeight(logs,e.ex);
                return (
                <div key={ei}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm" style={{color:T.navy}}>{e.ex} <span className="text-xs font-normal" style={{color:T.muted}}>· {e.muscle}{pb>0?` · PB ${pb}kg`:""}</span></div>
                    <div className="flex gap-2">
                      {exMeta(e.ex).bar && <button onClick={()=>setPlate({target:e.sets[e.sets.length-1]?.w||60, bar:BAR_KG, ex:e.ex})} className="text-xs font-bold" style={{color:T.navy}}>Plates</button>}
                      <button onClick={()=>removeExercise(ei)} className="text-xs font-bold" style={{color:T.accent}}>Remove</button>
                    </div>
                  </div>
                  <div className="flex text-[10px] font-bold mb-1" style={{color:T.muted}}>
                    <span className="w-10">TYPE</span><span className="flex-1 text-center">KG</span><span className="flex-1 text-center">REPS</span><span className="flex-1 text-center">RPE</span><span className="w-8 text-center">✓</span><span className="w-5"/></div>
                  {e.sets.map((s,si)=>(
                    <div key={si} className="flex items-center gap-1 mb-1" style={{opacity:s.done?0.6:1}}>
                      <button onClick={()=>cycleType(ei,si)} className="w-10 text-xs font-bold py-1.5 rounded-lg" style={{color:"#fff",background:SET_TYPES[s.type]?.color||T.ink}}>{SET_TYPES[s.type]?.lbl}</button>
                      <input value={s.w} type="number" onChange={ev=>updSet(ei,si,"w",+ev.target.value||0)} className="flex-1 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <input value={s.reps} type="number" onChange={ev=>updSet(ei,si,"reps",+ev.target.value||0)} className="flex-1 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <input value={s.rpe||""} type="number" placeholder="–" onChange={ev=>updSet(ei,si,"rpe",+ev.target.value||undefined)} className="flex-1 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <button onClick={()=>toggleSetDone(ei,si)} className="w-8 h-8 rounded-lg text-sm font-bold" style={{background:s.done?T.moss:"transparent",color:s.done?"#fff":T.muted,border:`1.5px solid ${s.done?T.moss:T.line}`}}>{s.done?"✓":"○"}</button>
                      <button onClick={()=>removeSet(ei,si)} className="w-5 text-xs" style={{color:T.muted}}>✕</button>
                    </div>))}
                  <div className="text-xs mb-1" style={{color:T.muted}}>est 1RM (best set): <b style={{color:T.ink}}>{Math.max(0,...e.sets.filter(isWorking).map(s=>est1RM(s.w,s.reps)))||"–"}kg</b></div>
                  <button onClick={()=>addSet(ei)} className="text-xs font-bold" style={{color:T.navy}}>+ Add set</button>
                </div>);})}
            </div>
            <div className="px-5 py-3 flex gap-2" style={{borderTop:`1.5px solid ${T.line}`}}>
              <Btn full kind="ghost" onClick={()=>setExPicker(true)}>+ Add exercise</Btn>
              <Btn full onClick={finishWorkout}>Finish</Btn>
            </div>
          </div>)}

        {/* exercise picker */}
        {exPicker && (
          <div className="fixed inset-0 z-40 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setExPicker(false)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add exercise</div>
                <button onClick={()=>setExPicker(false)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <input value={exSearch} onChange={e=>setExSearch(e.target.value)} placeholder="Search exercises…"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              {Object.entries(exLib).map(([muscle,names])=>{
                const filtered = names.filter(n=>n.toLowerCase().includes(exSearch.toLowerCase()));
                if (filtered.length===0) return null;
                return (
                <div key={muscle} className="mb-2">
                  <div className="text-xs font-bold mb-1" style={{color:T.navy}}>{muscle.toUpperCase()}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {filtered.map(nm=><Chip key={nm} active={false} onClick={()=>addExerciseToActive(nm)}>{nm}</Chip>)}
                  </div>
                </div>);})}
              <Btn full kind="ghost" onClick={()=>setCustomEx({name:exSearch, muscle:"Legs"})}>+ Create custom exercise</Btn>
            </div>
          </div>)}

        {/* custom exercise form */}
        {customEx && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setCustomEx(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>New exercise</div><button onClick={()=>setCustomEx(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="space-y-2 my-3">
                <input value={customEx.name} onChange={e=>setCustomEx(c=>({...c,name:e.target.value}))} placeholder="Exercise name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Select value={customEx.muscle} onChange={v=>setCustomEx(c=>({...c,muscle:v}))} options={Object.keys(exLib).map(m=>[m,m])} />
              </div>
              <Btn full disabled={!customEx.name.trim()} onClick={addCustomExercise}>Add to library</Btn>
            </div>
          </div>)}

        {/* rest timer */}
        {rest && <RestTimer rest={rest} onDone={()=>setRest(null)} onChange={(sec)=>setRest(r=>({...r,sec}))} />}

        {/* plate calculator */}
        {plate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setPlate(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Plate calculator</div>
                <button onClick={()=>setPlate(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="flex items-center gap-2 my-3">
                <span className="text-sm">Target</span>
                <input value={plate.target} type="number" onChange={e=>setPlate(p=>({...p,target:+e.target.value||0}))} className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                <span className="text-sm">kg · bar {plate.bar}kg</span>
              </div>
              {(() => {
                let perSide = (plate.target - plate.bar)/2; const out=[];
                if (perSide < 0) return <div className="text-sm" style={{color:T.accent}}>Target is below the bar weight.</div>;
                PLATES.forEach(p=>{ while(perSide >= p - 1e-9){ out.push(p); perSide = Math.round((perSide-p)*100)/100; } });
                return (<>
                  <div className="text-xs font-bold mb-1" style={{color:T.muted}}>PER SIDE</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {out.length===0 ? <span className="text-sm" style={{color:T.muted}}>Just the bar.</span> :
                      out.map((p,i)=><span key={i} className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{background:T.ink,color:"#fff"}}>{p}</span>)}
                  </div>
                  {perSide>0 && <div className="text-xs mt-2" style={{color:T.accent}}>{perSide}kg/side not loadable with available plates.</div>}
                </>);
              })()}
            </div>
          </div>)}

        {/* routine builder / assign */}
        {routineSheet && (
          <RoutineBuilder rs={routineSheet} setRs={setRoutineSheet} exLib={exLib}
            onSave={(r)=>{ setRoutines(rs=>[...rs, {...r, id:nid()}]); setRoutineSheet(null); ping(`Routine "${r.name}" saved`); }} />
        )}

        {/* PR celebration toast */}
        {prToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl text-center" style={{background:T.accent,color:"#fff",boxShadow:"0 8px 24px rgba(232,80,10,.4)"}}>
            <div className="font-bold text-lg" style={{...disp}}>{prToast}</div>
          </div>)}

        {/* trainer intake assessment sheet */}
        {intakeForm && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setIntakeForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>New client intake · {intakeForm.who}</div><button onClick={()=>setIntakeForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="text-xs mb-3" style={{color:T.muted}}>One-time deeper assessment — separate from the ongoing weight/fat log.</div>
              <div className="space-y-2 mb-3">
                {["Goals","Injury / medical history","Mobility notes","Waist / chest / arm measurements (cm)"].map(f=>(
                  <input key={f} placeholder={f} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>))}
              </div>
              <Btn full onClick={()=>{setIntakeForm(null); ping("Intake saved — kept separate from the client's simple progress view");}}>Save intake</Btn>
            </div>
          </div>)}
  </>);
}

