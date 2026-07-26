/* Create or edit a class. There was no way to do this — the timetable was seed
 * data and the template builder only produced reusable blocks. "How do I add a
 * class?" had no answer.
 *
 * Multi-coach is first-class here: a class can have a lead and any number of
 * assistants, every one of whom must be free. Conflicts are shown live as you
 * change the time, not thrown at you on save — a form that only tells you it's
 * wrong after you've filled it in makes you do the work twice.
 */

import { useApp } from "../state/AppState.jsx";
import { CT, isHead } from "../data/seed.js";
import { DAYS } from "../lib/dates.js";
import { SEVERITY, allConflicts, hasBlocking } from "../lib/conflicts.js";
import { T, disp } from "../theme.js";
import { Btn, Select } from "../ui/kit.jsx";

export default function ClassBuilderForm() {
  const { classBuilder, setClassBuilder, saveClass, locations, locName,
          trainers, tName, sessions, ptBookings, timeOff, camps, travel } = useApp();
  if (!classBuilder) return null;
  const cb = classBuilder;
  const set = (k, v) => setClassBuilder(c => ({ ...c, [k]: v }));

  const dur = CT[cb.type]?.dur || 60;
  const ctx = { sessions, ptBookings, timeOff, camps, travel };
  const conflicts = cb.trainers.length
    ? allConflicts({ trainers: cb.trainers, day: cb.day, time: cb.time, durMin: dur, loc: cb.loc },
                   ctx, tName, locName, cb.editId)
    : [];
  const blocked = hasBlocking(conflicts);
  const ready = cb.trainers.length > 0 && cb.time && cb.loc && +cb.cap > 0 && !blocked;

  const toggleCoach = (id) =>
    set("trainers", cb.trainers.includes(id) ? cb.trainers.filter(x => x !== id) : [...cb.trainers, id]);

  const field = { width:"100%", padding:"10px 12px", borderRadius:12,
    border:`1.5px solid ${T.line}`, background:T.card, color:T.ink, fontSize:15, outline:"none" };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setClassBuilder(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[92vh] overflow-y-auto"
        style={{background:T.paper}} onClick={e=>e.stopPropagation()}>

        <div className="flex items-start justify-between mb-3">
          <div style={{...disp,fontWeight:700,fontSize:22}}>{cb.editId ? "Edit class" : "New class"}</div>
          <button onClick={()=>setClassBuilder(null)} aria-label="Close"
            className="text-sm font-bold px-2 py-1 rounded-lg -mt-1"
            style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
        </div>

        <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>CLASS TYPE</div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {Object.entries(CT).map(([code, c])=>(
            <button key={code} onClick={()=>set("type", code)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
              style={{background:cb.type===code?c.color:"transparent", color:cb.type===code?"#fff":T.ink,
                      border:`1.5px solid ${cb.type===code?c.color:T.line}`}}>
              {c.name} <span style={{opacity:.7}}>{c.dur}m</span>
            </button>))}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <div className="text-xs font-bold mb-1" style={{color:T.muted}}>DAY</div>
            <Select value={String(cb.day)} onChange={v=>set("day", +v)} style={{width:"100%"}}
              options={DAYS.map((d,i)=>[String(i), d])}/>
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold mb-1" style={{color:T.muted}}>START</div>
            <input value={cb.time} onChange={e=>set("time", e.target.value)} placeholder="07:00" style={field}/>
          </div>
          <div style={{width:74}}>
            <div className="text-xs font-bold mb-1" style={{color:T.muted}}>CAP</div>
            <input value={cb.cap} onChange={e=>set("cap", e.target.value)} type="number" style={field}/>
          </div>
        </div>

        <div className="text-xs font-bold mb-1" style={{color:T.muted}}>LOCATION</div>
        <div className="mb-3">
          <Select value={cb.loc} onChange={v=>set("loc", v)} style={{width:"100%"}}
            options={locations.map(l=>[l.id, l.name])}/>
        </div>

        {/* Multi-coach. Order matters: the first selected is the lead. */}
        <div className="text-xs font-bold mb-1" style={{color:T.muted}}>
          COACHES {cb.trainers.length>1 && <span style={{color:T.blue}}>· {cb.trainers.length} assigned, pay splits between them</span>}
        </div>
        <div className="flex gap-1.5 flex-wrap mb-1">
          {trainers.filter(t=>!t.admin && t.active!==false).map(t=>{
            const on = cb.trainers.includes(t.id);
            const lead = cb.trainers[0]===t.id;
            return (
              <button key={t.id} onClick={()=>toggleCoach(t.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                style={{background:on?T.ink:"transparent", color:on?T.paper:T.ink,
                        border:`1.5px solid ${on?T.ink:T.line}`}}>
                {t.name}{isHead(t.id)?" ★":""}{lead && cb.trainers.length>1 ? " · lead" : ""}
              </button>);})}
        </div>
        <div className="text-[11px] mb-3" style={{color:T.muted}}>
          {cb.trainers.length===0 ? "Pick at least one coach."
            : cb.trainers.length===1 ? "First one picked is the lead."
            : "Everyone assigned is blocked from PT and other classes at this time."}
        </div>

        {/* Live conflicts. Shown as you change the time, not sprung on save. */}
        {conflicts.length>0 && (
          <div className="rounded-xl p-3 mb-3" style={{background: blocked ? "#F7EEE9" : "#FBF3EC"}}>
            <div className="text-xs font-bold mb-1" style={{color: blocked ? T.accent : T.orange}}>
              {blocked ? "CAN'T SCHEDULE THIS" : "WORTH CHECKING"}
            </div>
            {conflicts.map((c,i)=>(
              <div key={i} className="text-xs" style={{color:T.ink}}>
                <span style={{color: c.severity===SEVERITY.BLOCK ? T.accent : T.orange}}>●</span> {c.message}
              </div>))}
            {blocked && <div className="text-[11px] mt-1.5" style={{color:T.muted}}>
              Change the time, the day, or drop that coach.</div>}
          </div>)}

        {!cb.editId && (
          <div className="mb-3">
            <div className="text-xs font-bold mb-1" style={{color:T.muted}}>REPEAT</div>
            <div className="flex gap-1.5">
              {[[1,"Once"],[4,"4 weeks"],[8,"8 weeks"],[12,"12 weeks"]].map(([n,l])=>(
                <button key={n} onClick={()=>set("repeat", n)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold"
                  style={{background:cb.repeat===n?T.ink:"transparent", color:cb.repeat===n?T.paper:T.ink,
                          border:`1.5px solid ${cb.repeat===n?T.ink:T.line}`}}>{l}</button>))}
            </div>
          </div>)}

        <Btn full disabled={!ready} onClick={()=>saveClass(cb)}>
          {cb.editId ? "Save changes" : cb.repeat>1 ? `Create ${cb.repeat} weekly classes` : "Create class"}
        </Btn>
        {!ready && !blocked && (
          <div className="text-center text-xs mt-2" style={{color:T.muted}}>
            Needs a coach, a start time, a location and a capacity.</div>)}
      </div>
    </div>);
}
