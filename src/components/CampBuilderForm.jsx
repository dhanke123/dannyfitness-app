/* Camp builder.
 *
 * Three things were broken:
 *
 *   1. **Start time was a free text box.** "9am" parses to NaN, and because every
 *      NaN comparison is false, the conflict engine reported NO conflicts for it.
 *      A malformed time didn't fail — it silently approved everything. Native
 *      <input type="time"> can only produce a valid value, and gives a real
 *      picker on a phone.
 *   2. **A camp had no actual date.** `dates` was a free-text label ("11–15 Aug")
 *      and `startInDays` only existed in seed data, so a camp built here could
 *      never be placed on a calendar or conflict-checked at all.
 *   3. **One coach per block.** Camps are exactly where you need two.
 */

import { useState } from "react";
import { fromISO, isoFor, toISO } from "../lib/dates.js";
import { SEVERITY, allConflicts, hasBlocking } from "../lib/conflicts.js";
import { T, disp } from "../theme.js";
import { Btn, Card, DateInput, TimeInput } from "../ui/kit.jsx";

export default function CampBuilderForm({ camp, locations, trainers, onCancel, onSave, ctx, tName, locName }) {
  const [c, setC] = useState(() => ({
    ...camp,
    // migrate a seeded camp (startInDays) onto a real date the picker can show
    startDate: camp.startDate || (camp.startInDays != null
      ? toISO(new Date(Date.now() + camp.startInDays * 86400000)) : ""),
    days: (camp.days || []).map(d => ({ ...d,
      sessions: (d.sessions || []).map(s => ({ ...s,
        trainers: s.trainers || (s.trainer ? [s.trainer] : []) })) })),
  }));

  const addDay = () => setC(x=>({...x, days:[...x.days, {label:`Day ${x.days.length+1}`, sessions:[]}]}));
  const dupDay = (i) => setC(x=>({...x, days:[...x.days.slice(0,i+1),
    {...JSON.parse(JSON.stringify(x.days[i])), label:`Day ${x.days.length+1}`}, ...x.days.slice(i+1)]}));
  const removeDay = (i) => setC(x=>({...x, days:x.days.filter((_,j)=>j!==i)}));
  const addSession = (i) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d,
    sessions:[...d.sessions,{activity:"", trainers:[], start:"09:00", hours:1}]})}));
  const updSession = (i,k,field,val) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d,
    sessions:d.sessions.map((s,l)=>l!==k?s:{...s,[field]:val})})}));
  const removeSession = (i,k) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d,
    sessions:d.sessions.filter((_,l)=>l!==k)})}));
  const toggleCoach = (i,k,id) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d,
    sessions:d.sessions.map((s,l)=>l!==k?s:{...s,
      trainers: s.trainers.includes(id) ? s.trainers.filter(t=>t!==id) : [...s.trainers, id]})})}));

  const start = fromISO(c.startDate);

  /* Conflicts per block, against the real date each camp day falls on. Without a
     start date there's nothing to check against — which is exactly why the date
     is required rather than optional. */
  const blockConflicts = (dayIdx, sess) => {
    if (!start || !sess.trainers.length) return [];
    const abs = start.weekOff * 7 + start.day + dayIdx;
    return allConflicts({
      trainers: sess.trainers, day: ((abs % 7) + 7) % 7, weekOff: Math.floor(abs / 7),
      time: sess.start, durMin: Math.round((sess.hours || 1) * 60), loc: c.loc,
    }, ctx || {}, tName, locName)
      // a camp block clashing with its own camp isn't news
      .filter(x => !String(x.message).includes(c.name));
  };
  const allBlocks = c.days.flatMap((d,i)=>d.sessions.map((s,k)=>({d:i,k,s,conf:blockConflicts(i,s)})));
  const blocked = allBlocks.some(b => hasBlocking(b.conf));
  const noCoach = allBlocks.some(b => b.s.trainers.length === 0);

  const endISO = start && c.days.length
    ? isoFor(...(() => { const abs = start.weekOff*7 + start.day + c.days.length - 1;
        return [Math.floor(abs/7), ((abs%7)+7)%7]; })())
    : null;

  const ready = c.name.trim() && c.startDate && c.days.length > 0 && !blocked && !noCoach;

  const save = () => {
    // derive everything the rest of the app needs from the real date
    const startInDays = Math.round((start.date.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    const label = endISO && endISO !== c.startDate
      ? `${new Date(c.startDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}–${new Date(endISO).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`
      : new Date(c.startDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    onSave({ ...c, startInDays, dates: label,
      days: c.days.map(d => ({...d, sessions: d.sessions.map(s => ({...s, trainer: s.trainers[0]}))})) });
  };

  const inp = { border:`1.5px solid ${T.line}`, background:T.card };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div style={{...disp,fontWeight:700,fontSize:22}}>Camp builder</div>

        <div className="grid grid-cols-2 gap-2 my-3">
          <input value={c.name} onChange={e=>setC({...c,name:e.target.value})} placeholder="Camp name"
            className="col-span-2 px-3 py-2.5 rounded-lg text-sm outline-none" style={inp}/>
          <select value={c.type} onChange={e=>setC({...c,type:e.target.value})}
            className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inp}>
            <option>Kids</option><option>Adult</option>
          </select>
          <select value={c.loc} onChange={e=>setC({...c,loc:e.target.value})}
            className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inp}>
            {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {/* A real date. Everything else — which weekday each block lands on,
              whether a coach is free, where it sits on the calendar — derives
              from this, so it can't be optional. */}
          <div className="col-span-2">
            <div className="text-xs font-bold mb-1" style={{color:T.muted}}>START DATE *</div>
            <DateInput value={c.startDate} min={toISO(new Date())}
              onChange={v=>setC({...c,startDate:v})} style={{width:"100%"}}/>
            {start && (
              <div className="text-[11px] mt-1" style={{color: start.past ? T.accent : T.muted}}>
                {start.past ? "That's in the past — pick a future date." :
                  `${start.date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}${c.days.length>1?` → runs ${c.days.length} days`:""}`}
              </div>)}
          </div>

          <input value={c.price} onChange={e=>setC({...c,price:e.target.value})} placeholder="Price $" type="number"
            className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inp}/>
          <input value={c.cap} onChange={e=>setC({...c,cap:e.target.value})} placeholder="Capacity" type="number"
            className="px-3 py-2.5 rounded-lg text-sm outline-none" style={inp}/>
        </div>

        <div className="space-y-3">
          {c.days.map((d,i)=>{
            const dayDate = start ? (() => { const abs = start.weekOff*7+start.day+i;
              return new Date(start.date.getTime() + i*86400000); })() : null;
            return (
            <Card key={i} className="!p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <input value={d.label} onChange={e=>setC(x=>({...x,days:x.days.map((dd,j)=>j!==i?dd:{...dd,label:e.target.value})}))}
                    className="font-bold text-sm px-2 py-1 rounded outline-none" style={{border:`1px solid ${T.line}`,width:110}}/>
                  {dayDate && <div className="text-[11px] mt-0.5" style={{color:T.muted}}>
                    {dayDate.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</div>}
                </div>
                <div className="flex gap-1.5">
                  <button className="text-xs font-bold" style={{color:T.navy}} onClick={()=>dupDay(i)}>Duplicate</button>
                  <button className="text-xs font-bold" style={{color:T.accent}} onClick={()=>removeDay(i)}>Remove day</button>
                </div>
              </div>

              {d.sessions.map((s,k)=>{
                const conf = blockConflicts(i,s);
                return (
                <div key={k} className="rounded-lg p-2 mb-2" style={{background:"#FBF3EC"}}>
                  <div className="flex gap-1.5 mb-1.5">
                    <input value={s.activity} onChange={e=>updSession(i,k,"activity",e.target.value)} placeholder="Activity"
                      className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none" style={inp}/>
                    <TimeInput value={s.start} onChange={v=>updSession(i,k,"start",v)} style={{width:104,fontSize:12}}/>
                    <input value={s.hours} onChange={e=>updSession(i,k,"hours",+e.target.value||0)} type="number" step="0.5"
                      className="px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{...inp,width:48}}/>
                    <button className="text-xs px-1" style={{color:T.accent}} onClick={()=>removeSession(i,k)}>✗</button>
                  </div>
                  {/* multi-coach per block */}
                  <div className="flex gap-1 flex-wrap">
                    {trainers.filter(t=>!t.admin && t.active!==false).map(t=>{
                      const on = s.trainers.includes(t.id);
                      return (
                        <button key={t.id} onClick={()=>toggleCoach(i,k,t.id)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold"
                          style={{background:on?T.ink:"transparent", color:on?T.paper:T.ink,
                                  border:`1px solid ${on?T.ink:T.line}`}}>{t.name}</button>);})}
                  </div>
                  {s.trainers.length===0 && <div className="text-[11px] mt-1" style={{color:T.accent}}>Pick at least one coach.</div>}
                  {s.trainers.length>1 && <div className="text-[11px] mt-1" style={{color:T.blue}}>{s.trainers.length} coaches — pay splits between them.</div>}
                  {conf.map((x,z)=>(
                    <div key={z} className="text-[11px] mt-1" style={{color: x.severity===SEVERITY.BLOCK ? T.accent : T.orange}}>
                      ● {x.message}</div>))}
                </div>);})}

              <button className="text-xs font-bold mt-1" style={{color:T.navy}} onClick={()=>addSession(i)}>+ Add session block</button>
            </Card>);})}
          <Btn full kind="ghost" onClick={addDay}>+ Add day</Btn>
        </div>

        {!c.startDate && <div className="text-xs mt-3" style={{color:T.accent}}>
          A start date is required — without it nothing can be checked for clashes or placed on a calendar.</div>}

        <div className="flex gap-2 mt-4">
          <Btn full kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn full disabled={!ready} onClick={save}>Save camp</Btn>
        </div>
      </div>
    </div>
  );
}
