import { useApp } from "../../state/AppState.jsx";
import { CT, PT_PRICE, isHead } from "../../data/seed.js";
import { CAL_HEND, CAL_HSTART, DAYS, FULLDAYS, TODAY, dateFor, fmtDM, fmtFull, locAbbr, toMin, weekLabel } from "../../lib/dates.js";
import { downloadIcs, eventStart, googleCalUrl } from "../../lib/calendar.js";
import { PT_DUR } from "../../lib/scheduling.js";
import { AddToCalendar } from "../../components/ApprovalQueue.jsx";
import WeekGrid from "../../components/WeekGrid.jsx";
import { T, disp } from "../../theme.js";
import { Btn, Card, Chip, Select, Ticks } from "../../ui/kit.jsx";

export default function ClientBook() {
  const { active, bookDates, bookWeek, bookWeeks, booked, campOpenId, camps, cancelCamp, cancelClass, cancelPT, classPass, credits, day, daySessions, hoursUntil, isClient, joinWaitlist, loc, locName, locations, myCalDay, myCamps, myClassBookings, myPT, mySpan, myView, myWaitlist, myWeek, memberClash, otherPlace, ping, setBookingDetail, policy, ptByTrainer, ptLoc, ptPool, ptTrainers, refundables, requestRefund, seg, sessions, setBookWeek, setCampOpenId, setClientMove, setDay, setExceptionSheet, setLoc, setMyCalDay, setMySpan, setMyView, setMyWeek, setOtherPlace, setPayMode, setPtLoc, setPtTrainers, setSeg, setSheet, startCamp, tName, tab, trainers, travel } = useApp();

  /* One place that turns any booking into a calendar event (Decision 14). Both the .ics
     download and the Google URL are built from the same object, so they can never drift. */
  const calEvent = (ev) => ({
    title: ev.title, start: eventStart(ev.weekOff, ev.day, ev.time), minutes: ev.minutes || 60,
    location: ev.location || "", uid: ev.uid,
    details: `${ev.details || ""}\nManage or cancel in the ExerciseOnly app.`.trim(),
  });
  const CalRow = ({ ev }) => { const e = calEvent(ev); return (
    <AddToCalendar compact onIcs={()=>{ downloadIcs(e); ping("Calendar file downloaded — open it to add the session"); }}
      onGoogle={()=>window.open(googleCalUrl(e), "_blank", "noopener")} />); };

  return (<>
        {/* ==================== CLIENT: BOOK ==================== */}
        {isClient && tab==="book" && (
          <main className="flex-1 overflow-y-auto pb-24">
            <div className="px-5 flex gap-2 pb-2">
              {[["classes","Classes"],["pt","PT"],["camps","Camps"],["mine","Booked"]].map(([k,l])=>(
                <Chip key={k} active={seg===k} onClick={()=>setSeg(k)}>{l}</Chip>))}
            </div>
            {seg!=="camps" && seg!=="mine" && <>
              {/* week navigator — book beyond the current week */}
              <div className="px-5 flex items-center justify-between pt-1 pb-2">
                <button onClick={()=>setBookWeek(w=>Math.max(0,w-1))} disabled={bookWeek===0}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`, color:bookWeek===0?T.line:T.ink}}>‹</button>
                <div className="text-sm font-bold" style={{...disp}}>{bookWeek===0?"This week":bookWeek===1?"Next week":weekLabel(bookWeek)}<span className="text-xs font-normal" style={{color:T.muted}}> · {weekLabel(bookWeek)}</span></div>
                <button onClick={()=>setBookWeek(w=>Math.min(8,w+1))} disabled={bookWeek>=8}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`, color:bookWeek>=8?T.line:T.ink}}>›</button>
              </div>
              {/* all 7 days fit the width — no horizontal scrolling */}
              <div className="px-5 pb-2 grid gap-1" style={{gridTemplateColumns:"repeat(7,minmax(0,1fr))"}}>
                {DAYS.map((d,i)=>{ const past=bookWeek===0 && i<TODAY; const dt=dateFor(bookWeek,i);
                  const isToday=bookWeek===0 && i===TODAY; const on=day===i&&!past; return (
                  <button key={d} onClick={()=>!past&&setDay(i)} disabled={past}
                    className="rounded-xl py-1.5 text-center" style={{minWidth:0,
                      border:`1.5px solid ${on?T.ink:isToday?T.accent:T.line}`, background:on?T.ink:T.card,
                      color:past?T.line:on?T.paper:T.ink, opacity:past?.5:1}}>
                    <div className="text-[10px] font-bold leading-none" style={{opacity:.75}}>{d}</div>
                    <div style={{...disp,fontWeight:700,fontSize:15,lineHeight:1.15}}>{dt.getDate()}</div>
                    <div className="text-[8px] leading-none" style={{opacity:.6}}>{dt.toLocaleDateString('en-GB',{month:'short'})}</div>
                  </button>);})}
              </div>
              <div className="px-5 pb-3 flex items-center gap-2">
                <span className="text-xs font-bold" style={{color:T.muted}}>LOCATION</span>
                {seg==="classes" ? (
                  <Select value={loc} onChange={setLoc}
                    options={[["all","All locations"], ...locations.map(l=>[l.id,l.name])]} />
                ) : (
                  <Select value={ptLoc} onChange={setPtLoc}
                    options={[...locations.map(l=>[l.id,l.name]), ["other","Other (type a place)"]]} />
                )}
              </div>
              {seg==="pt" && ptLoc==="other" && (
                <div className="px-5 pb-3">
                  <input value={otherPlace} onChange={e=>setOtherPlace(e.target.value)} placeholder="e.g. Poolside, East Coast Park"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <div className="text-xs mt-1.5" style={{color:T.muted}}>Danny can save this as a real location later if you train here often.</div>
                </div>)}
            </>}

            {seg==="classes" && <div className="px-5 space-y-3">
              {daySessions.length===0 && <div className="text-center py-12 text-sm" style={{color:T.muted}}>No classes here on {DAYS[day]}.</div>}
              {daySessions.map(s=>{ const ct=CT[s.type]; const n=booked(s); const full=n>=s.cap; const mine=myClassBookings.includes(s.id); const waited=myWaitlist.includes(s.id);
                return (
                <Card key={s.id} className="flex gap-3 items-center">
                  <div className="text-right" style={{minWidth:56}}>
                    <div style={{...disp,fontWeight:700,fontSize:24,lineHeight:1}}>{s.time}</div>
                    <div className="text-xs" style={{color:T.muted}}>{ct.dur}m</div></div>
                  <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:ct.color}}/>
                  <div className="flex-1">
                    <div style={{...disp,fontWeight:600,fontSize:17}}>{ct.name}</div>
                    <div className="text-xs mb-1" style={{color:T.muted}}>{locName(s.loc)} · Coach {tName(s.trainer)}</div>
                    <div className="text-xs mb-1.5" style={{color:T.muted}}>{ct.desc}</div>
                    <Ticks cap={s.cap} n={n}/></div>
                  <div className="text-right">
                    <div className="text-sm font-bold mb-1.5">${ct.price}</div>
                    {(() => {
                      // a class the member can't attend because they're already busy
                      const clash = mine ? null : memberClash(bookWeek, s.day, s.time, ct.dur);
                      return mine ? <span className="text-xs font-bold" style={{color:T.moss}}>BOOKED ✓</span> :
                       waited ? <span className="text-xs font-bold" style={{color:T.accent}}>WAITLISTED</span> :
                       clash ? <span className="text-[11px] font-bold" style={{color:T.muted}}>CLASHES<br/>{clash.label}</span> :
                       full ? <Btn small kind="ghost" onClick={()=>joinWaitlist(s.id)}>Waitlist</Btn> :
                       <Btn small onClick={()=>{setSheet({kind:"class",...s, date:fmtFull(dateFor(bookWeek,day))}); setPayMode(classPass?"pass":credits.classes>0?"credit":"paynow");}}>Book</Btn>;
                    })()}
                  </div>
                </Card>);})}
            </div>}

            {seg==="pt" && <div className="px-5">
              <div className="flex gap-2 flex-wrap pb-3">
                {trainers.map(t=>(
                  <Chip key={t.id} active={ptTrainers.includes(t.id)}
                    onClick={()=>setPtTrainers(p=>p.includes(t.id)?p.filter(x=>x!==t.id):[...p,t.id])}>
                    {t.name}{t.id==="danny"?" ★":""}</Chip>))}
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Tap a time to book a {PT_DUR}-min session · <span style={{color:T.accent}}>⏱</span> = travel time added.</div>
              <div className="space-y-3">
                {ptLoc==="other" ? (
                  <Card>
                    <div className="text-sm mb-2" style={{color:T.muted}}>Ad-hoc spot — pick a coach, set the exact time at checkout.</div>
                    <div className="flex flex-col gap-2">
                      {ptTrainers.map(tid=>(
                        <Btn key={tid} kind="ghost" onClick={()=>{setSheet({kind:"pt", trainer:tid, day, time:"10:00", loc:"other", date:fmtFull(dateFor(bookWeek,day))}); setPayMode(credits[ptPool(tid)]>0?"credit":"paynow");}}
                          disabled={!otherPlace}>{tName(tid)}{isHead(tid)?" ★":""}</Btn>))}
                    </div>
                    {!otherPlace && <div className="text-xs mt-2" style={{color:T.accent}}>Type a place name above first.</div>}
                  </Card>
                ) : ptByTrainer.map(row=>(
                  <Card key={row.trainer}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">{tName(row.trainer)}{isHead(row.trainer) && <span style={{color:T.accent}}> ★</span>}</div>
                      <div className="text-sm font-bold">${PT_PRICE[row.trainer]}<span className="text-xs font-normal" style={{color:T.muted}}> /{PT_DUR}m</span></div>
                    </div>
                    {!row.working ? (
                      <div className="text-xs" style={{color:T.muted}}>Off on {DAYS[day]}.</div>
                    ) : row.slots.length===0 ? (
                      <div className="text-xs" style={{color:T.muted}}>No open slots — try another day.</div>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        {row.slots.map((sl,i)=>(
                          <button key={i} onClick={()=>{setSheet({kind:"pt",...sl, date:fmtFull(dateFor(bookWeek, sl.day??day))}); setPayMode(credits[ptPool(sl.trainer)]>0?"credit":"paynow");}}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{border:`1.5px solid ${sl.note?T.accent:T.line}`, color:sl.note?T.accent:T.ink}}
                            title={sl.note||""}>{sl.time}{sl.note?" ⏱":""}</button>))}
                      </div>)}
                  </Card>
                ))}
              </div>
            </div>}

            {seg==="camps" && <div className="px-5 space-y-3 pt-1">
              {camps.map(c=>{ const joined=myCamps.includes(c.id); const open=campOpenId===c.id; return (
                <Card key={c.id} style={{background:"#FBEDEF"}}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.plum,color:"#fff"}}>{c.type.toUpperCase()} CAMP</span>
                  </div>
                  <div style={{...disp,fontWeight:700,fontSize:19}}>{c.name}</div>
                  <div className="text-xs mb-2" style={{color:T.muted}}>{c.dates} · {locName(c.loc)} · {c.spots}/{c.cap} spots left</div>
                  <button className="text-xs font-bold mb-2" style={{color:T.plum}} onClick={()=>setCampOpenId(open?null:c.id)}>
                    {open?"Hide":"View"} day-by-day itinerary {open?"▴":"▾"}</button>
                  {open && (
                    <div className="mb-3 space-y-1.5">
                      {c.days.map((d,i)=>(
                        <div key={i} className="text-xs rounded-lg p-2" style={{background:"#fff"}}>
                          <div className="font-bold mb-0.5">{d.label}</div>
                          {d.sessions.map((s,j)=>(
                            <div key={j} style={{color:T.muted}}>{s.start} · {s.activity} · Coach {tName(s.trainer)} · {s.hours}h</div>))}
                        </div>))}
                    </div>)}
                  <div className="flex items-center justify-between">
                    <div className="font-bold">${c.price}</div>
                    {joined ? <span className="text-xs font-bold" style={{color:T.moss}}>ENROLLED ✓</span> :
                      <Btn small kind="plum" disabled={c.spots<=0} onClick={()=>startCamp(c.id)}>{c.type==="Kids"?"Enrol child":"Book camp"}</Btn>}
                  </div>
                  {c.type==="Kids" && !joined && <div className="text-xs mt-2" style={{color:T.plum}}>Requires child's first name, age band, emergency contact & waiver at checkout.</div>}
                </Card>);})}
            </div>}

            {/* MY BOOKINGS — list + calendar view, cancel, and PT reschedule */}
            {seg==="mine" && (() => {
              const none = myClassBookings.length===0 && myPT.length===0 && myCamps.length===0 && myWaitlist.length===0;
              // camp day-blocks flattened onto (week, weekday) so they show in the calendar too
              const campBlocks = [];
              myCamps.forEach(cid=>{ const c=camps.find(x=>x.id===cid); if(!c) return;
                const absStart = TODAY + (c.startInDays??0);
                (c.days||[]).forEach((cd,i)=>{ const abs = absStart + i;
                  (cd.sessions||[]).forEach(s=>{ campBlocks.push({
                    w:Math.floor(abs/7), d:((abs%7)+7)%7, start:toMin(s.start), dur:Math.round((s.hours||1)*60),
                    color:T.plum, time:s.start, code:"CAMP", title:c.name,
                    sub:`${s.activity} · ${locName(c.loc)}`, kind:"camp" }); }); }); });
              // every booking the client owns, for one (week, weekday), lane-packed like the coach grid
              // WeekGrid wants one flat list for the week, tagged with its weekday
              const evsWeek = (w) => [0,1,2,3,4,5,6].flatMap(d => evsFor(w,d).map((e,i) => ({
                id:`${d}-${i}-${e.time}-${e.code}`, day:d, start:e.start, dur:e.dur,
                color:e.color, code:e.code, title:e.title, sub:e.sub,
                cancelled:!!e.cancelled, coaches:e.coaches||1, _src:e })));
              const evsFor = (w,d) => {
                const evs = [];
                myClassBookings.forEach(sid=>{ const s=sessions.find(x=>x.id===sid); if(!s) return;
                  if ((bookWeeks[sid]??0)!==w || s.day!==d) return;
                  evs.push({start:toMin(s.time), dur:CT[s.type].dur, color:CT[s.type].color, time:s.time,
                    code:s.type, title:CT[s.type].name, locId:s.loc,
                    sub:`${locName(s.loc)} · Coach ${tName(s.trainer)}`, kind:"class", id:sid}); });
                myPT.forEach(b=>{ if((b.weekOff??0)!==w || b.day!==d) return;
                  evs.push({start:toMin(b.time), dur:PT_DUR, color:T.navy, time:b.time, code:"PT",
                    title:`PT · ${tName(b.trainer)}`, locId:b.loc,
                    sub:`${b.loc==="other"?(b.otherLabel||"Other spot"):locName(b.loc)} · Coach ${tName(b.trainer)}`,
                    kind:"pt", pt:b}); });
                campBlocks.filter(cb=>cb.w===w && cb.d===d).forEach(cb=>evs.push(cb));
                evs.sort((a,b)=>a.start-b.start);
                const laneEnds=[]; evs.forEach(e=>{ let i=0; for(;i<laneEnds.length;i++){ if(laneEnds[i]<=e.start) break; } e.lane=i; laneEnds[i]=e.start+e.dur; });
                evs._lanes = Math.max(1, laneEnds.length);
                return evs;
              };
              const HSTART=CAL_HSTART, HEND=CAL_HEND, PXH=48, GUT=44, HEADH=32;
              const gridH=(HEND-HSTART)*PXH;
              // Every booking opens a sheet with the same actions the list offers.
              const evClick = (e) => setBookingDetail({ ...e, weekOff: myWeek });
              const DayGrid = ({w, d, wide, compact}) => { const evs=evsFor(w,d); const lanes=evs._lanes; return (
                <div style={{position:"relative", height:gridH, flex: wide?"1 1 auto":"1 1 0", minWidth:0, borderLeft: wide?"none":`1px solid ${T.line}`}}>
                  {Array.from({length:HEND-HSTART}).map((_,i)=>(
                    <div key={i} className="absolute left-0 right-0" style={{top:i*PXH, height:PXH, borderTop:`1px solid ${T.line}`}}/>))}
                  <div className="absolute left-0 right-0" style={{top:gridH, borderTop:`1px solid ${T.line}`}}/>
                  {evs.map((e,i)=>{ const top=(e.start-HSTART*60)/60*PXH;
                    /* Clamp to the grid bottom. A 45-min PT starting 22:30 runs to 23:15,
                       past CAL_HEND, and would be clipped by the wrapper's overflow-hidden
                       — the block simply wouldn't be there. Better to show it slightly
                       short than to lose it. */
                    const h=Math.max(20, Math.min(e.dur/60*PXH-2, gridH-top-2));
                    const left=`${(e.lane/lanes)*100}%`; const wd=`${100/lanes}%`;
                    return compact ? (
                    <div key={i} onClick={()=>evClick(e)} className="absolute rounded overflow-hidden"
                      style={{top:top+1, height:h, left, width:wd, padding:"1px 2px", background:e.color, color:"#fff",
                        fontSize:8.5, lineHeight:1.08, boxShadow:"0 1px 2px rgba(0,0,0,.15)", cursor:"pointer"}}>
                      <div style={{fontWeight:800}}>{e.time}</div>
                      <div style={{fontWeight:700}}>{e.code}</div>
                      {h>26 && <div style={{opacity:.85}}>{locAbbr(e.locId)||""}</div>}
                    </div>) : (
                    <div key={i} onClick={()=>evClick(e)} className="absolute rounded-md px-1 py-0.5 overflow-hidden"
                      style={{top:top+1, height:h, left, width:wd, background:e.color, color:"#fff",
                        fontSize:10, lineHeight:1.1, boxShadow:"0 1px 3px rgba(0,0,0,.15)", cursor:"pointer"}}>
                      <div style={{fontWeight:700}}>{e.time} {e.title}</div>
                      {h>32 && <div style={{opacity:.9}}>{e.sub}</div>}
                    </div>);})}
                </div>);};
              // Hour labels CAL_HSTART:00 … CAL_HEND:00 (5:00 … 23:00). The first and last are
              // nudged inside the box — at top:-5 the first label was clipped by the wrapper's
              // overflow-hidden, and the last was never drawn at all, so the grid looked like
              // it stopped an hour early.
              const TimeGutter = ({top}) => (
                <div style={{width:GUT, flex:"none"}}>
                  {top && <div style={{height:HEADH}}/>}
                  <div style={{position:"relative", height:gridH}}>
                    {Array.from({length:HEND-HSTART+1}).map((_,i)=>{
                      const last = i===HEND-HSTART;
                      return (
                      <div key={i} className="absolute text-[10px]"
                        style={{top: last ? gridH-11 : Math.max(0, i*PXH-5), left:2,
                                color:T.muted, whiteSpace:"nowrap"}}>{HSTART+i}:00</div>);})}
                  </div>
                </div>);
              return (
              <div className="px-5 pt-1">
                <div className="flex gap-2 mb-3">
                  {[["list","List"],["cal","Calendar"]].map(([k,l])=>(
                    <Chip key={k} active={myView===k} onClick={()=>setMyView(k)}>{l}</Chip>))}
                </div>

                {myView==="list" && <div className="space-y-3">
                {none && <div className="text-center py-12 text-sm" style={{color:T.muted}}>No bookings yet. Book a class, PT or camp from the tabs above.</div>}
                {myClassBookings.map(sid=>{ const s=sessions.find(x=>x.id===sid); const w=bookWeeks[sid]??0;
                  const hrs=hoursUntil(w, s.day, s.time); const canCancel=hrs>policy.classHrs; return (
                  <Card key={sid}>
                    <div className="flex items-center gap-3">
                      <div style={{...disp,fontWeight:700,fontSize:20,minWidth:52}} className="text-right">{s.time}</div>
                      <div className="flex-1"><div className="font-semibold text-sm">{CT[s.type].name} · {bookDates[sid]||DAYS[s.day]}</div>
                        <div className="text-xs" style={{color:T.muted}}>{locName(s.loc)} · Coach {tName(s.trainer)}</div></div>
                      {canCancel && <Btn kind="ghost" small onClick={()=>cancelClass(sid)}>Cancel</Btn>}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2.5">
                      <CalRow ev={{title:`${CT[s.type].name} · ExerciseOnly`, weekOff:w, day:s.day, time:s.time,
                        minutes:CT[s.type].dur, location:locName(s.loc), uid:`class-${sid}-w${w}`,
                        details:`Coach ${tName(s.trainer)}`}}/>
                      {/* Decision 4 — classes are not rescheduled. Cancel and rebook. */}
                      {!canCancel && <Btn small kind="ghost" onClick={()=>setExceptionSheet({
                        what:`${CT[s.type].name} · ${bookDates[sid]||DAYS[s.day]} ${s.time}`, kind:"class",
                        ask:"cancel", hrs:Math.max(0,Math.round(hrs)), reason:""})}>Request an exception</Btn>}
                    </div>
                    {!canCancel && <div className="text-[11px] mt-1.5" style={{color:T.accent}}>
                      Inside the {policy.classHrs}h window — cancelling now needs approval.</div>}
                  </Card>);})}
                {myPT.map(b=>{ const hrs=hoursUntil(b.weekOff, b.day, b.time); const canChange=hrs>policy.ptHrs;
                  const where = b.loc==="other" ? (b.otherLabel||"Other spot") : locName(b.loc); return (
                  <Card key={b.id}>
                    <div className="flex items-center gap-3">
                      <div style={{...disp,fontWeight:700,fontSize:20,minWidth:52}} className="text-right">{b.time}</div>
                      <div className="flex-1"><div className="font-semibold text-sm">Personal Training · {b.date||DAYS[b.day]}</div>
                        <div className="text-xs" style={{color:T.muted}}>{where} · Coach {tName(b.trainer)}{isHead(b.trainer)?" ★":""}</div></div>
                    </div>
                    {/* Decision 3 — PT reschedule is unlimited, as long as it's outside the window. */}
                    {canChange ? (
                      <div className="flex gap-2 mt-2.5">
                        <Btn small kind="ghost" full
                          onClick={()=>setClientMove({...b, newWeek:b.weekOff??0, newDay:b.day, newTime:b.time, locked:false})}>Modify</Btn>
                        <Btn small kind="ghost" full onClick={()=>cancelPT(b.id)}>Cancel</Btn>
                      </div>
                    ) : (
                      <div className="mt-2.5">
                        {/* Decision 1a — inside the window is a request, not a dead end. */}
                        <Btn small kind="ghost" full onClick={()=>setExceptionSheet({
                          what:`PT · ${tName(b.trainer)} · ${b.date||DAYS[b.day]} ${b.time}`, kind:"pt",
                          ask:"change", hrs:Math.max(0,Math.round(hrs)), reason:""})}>Request an exception</Btn>
                        <div className="text-[11px] mt-1.5 text-center" style={{color:T.accent}}>
                          Inside the {policy.ptHrs}h window — tell us why and we'll take a look.</div>
                      </div>)}
                    <div className="mt-2.5">
                      <CalRow ev={{title:`PT with ${tName(b.trainer)} · ExerciseOnly`, weekOff:b.weekOff, day:b.day,
                        time:b.time, minutes:PT_DUR, location:where, uid:`pt-${b.id}`,
                        details:`Personal training with Coach ${tName(b.trainer)}`}}/>
                    </div>
                  </Card>);})}
                {/* Decision 16 — camps use the DAYS rule only; there is no 24h camp setting. */}
                {myCamps.map(cid=>{ const c=camps.find(x=>x.id===cid); const canCancel=(c.startInDays??99)>policy.campDays; return (
                  <Card key={cid} style={{background:"#FBEDEF"}}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1"><div className="font-semibold text-sm">{c.name}</div>
                        <div className="text-xs" style={{color:T.plum}}>{c.dates} · {locName(c.loc)}{c.type==="Kids"?" · waiver on file":""}</div></div>
                      {canCancel && <Btn kind="ghost" small onClick={()=>cancelCamp(cid)}>Cancel</Btn>}
                    </div>
                    {!canCancel && (
                      <div className="mt-2.5">
                        <Btn small kind="ghost" full onClick={()=>setExceptionSheet({
                          what:`${c.name} · ${c.dates}`, kind:"camp", ask:"cancel", days:c.startInDays??0, reason:""})}>Request an exception</Btn>
                        <div className="text-[11px] mt-1.5 text-center" style={{color:T.plum}}>
                          Starts in under {policy.campDays} day{policy.campDays===1?"":"s"} — cancelling now needs approval.</div>
                      </div>)}
                  </Card>);})}
                {myWaitlist.map(sid=>{ const s=sessions.find(x=>x.id===sid); return (
                  <Card key={sid} className="flex items-center gap-3" style={{background:"#FBF3EC"}}>
                    <div className="flex-1"><div className="font-semibold text-sm">Waitlisted · {CT[s.type].name} · {DAYS[s.day]} {s.time}</div>
                      <div className="text-xs" style={{color:T.accent}}>We'll WhatsApp you if a spot opens</div></div>
                  </Card>);})}
                {/* Decision 2 — credit back is automatic; money back is a request the admin actions. */}
                {refundables.length>0 && <>
                  <div className="text-xs font-bold pt-2" style={{color:T.muted}}>CREDITED BACK · you can ask for the money instead</div>
                  {refundables.map(r=>(
                    <Card key={r.id} className="!p-3" style={{background:"#EFF3EE"}}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1"><div className="text-sm font-semibold">{r.what}</div>
                          <div className="text-xs" style={{color:T.muted}}>${r.amt} · paid by {r.method} · cancelled {r.when} · already back on your account as credit</div></div>
                      </div>
                      <Btn small kind="ghost" full onClick={()=>requestRefund(r, "")}>Request a bank refund instead</Btn>
                    </Card>))}
                </>}

                {!none && <div className="text-xs text-center pt-1" style={{color:T.muted}}>
                  Free changes & cancellation until {policy.classHrs}h before a class, {policy.ptHrs}h before PT and {policy.campDays} day{policy.campDays===1?"":"s"} before a camp.
                  Inside that, request an exception and we'll review it.</div>}
                </div>}

                {myView==="cal" && (() => {
                  /* Day / Week actually switch now. The chips existed before but both
                     rendered the same seven columns — a control that changes nothing is
                     worse than no control, because you stop believing the ones that work. */
                  const evs = evsWeek(myWeek);
                  const dayEvs = evs.filter(e=>e.day===myCalDay);
                  const cols = mySpan==="day"
                    ? [{ key:myCalDay, day:myCalDay, label:FULLDAYS[myCalDay].toUpperCase(),
                         isToday: myWeek===0 && myCalDay===TODAY }]
                    : undefined;
                  return (<div>
                  <div className="flex gap-2 mb-2 items-center">
                    {[["day","Day"],["week","Week"]].map(([k,l])=>(
                      <Chip key={k} active={mySpan===k} onClick={()=>setMySpan(k)}>{l}</Chip>))}
                    {myWeek!==0 && (
                      <button onClick={()=>{setMyWeek(0); setMyCalDay(TODAY);}}
                        className="ml-auto text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
                        style={{border:`1.5px solid ${T.accent}`, color:T.accent}}>Today</button>)}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={()=>setMyWeek(w=>w-1)} aria-label="Previous week" className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`}}>‹</button>
                    <div className="text-sm font-bold text-center" style={disp}>{weekLabel(myWeek)}{myWeek===0?" · this week":""}
                      <div className="text-[11px] font-medium" style={{color:T.muted}}>
                        {evs.filter(e=>!e.cancelled).length} booked this week</div>
                    </div>
                    <button onClick={()=>setMyWeek(w=>w+1)} aria-label="Next week" className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`}}>›</button>
                  </div>
                  {mySpan==="day" && (
                    <div className="flex gap-1.5 pb-2 overflow-x-auto">
                      {[0,1,2,3,4,5,6].map(d=>{ const dt=dateFor(myWeek,d); const isToday=(myWeek===0&&d===TODAY);
                        const on=myCalDay===d; const n=evs.filter(e=>e.day===d&&!e.cancelled).length; return (
                        <button key={d} onClick={()=>setMyCalDay(d)} className="rounded-xl py-1.5 text-center" style={{flex:"1 0 auto", minWidth:44,
                          background:on?T.ink:T.card, color:on?T.paper:T.ink, border:`1.5px solid ${isToday&&!on?T.accent:on?T.ink:T.line}`}}>
                          <div className="text-[10px] font-bold leading-none" style={{opacity:.7}}>{DAYS[d]}</div>
                          <div style={{...disp,fontWeight:700,fontSize:16,lineHeight:1.1}}>{dt.getDate()}</div>
                          <div className="text-[9px] leading-none" style={{opacity:.65}}>{n||"·"}</div>
                        </button>);})}
                    </div>)}
                  {/* Design A, same shared component as the staff Schedule. Members can
                      open a block but not drag it — moving a booking has a cancellation
                      window and a credit attached, so it goes through the sheet. */}
                  <WeekGrid
                    weekOff={myWeek}
                    columns={cols}
                    events={mySpan==="day" ? dayEvs : evs}
                    hourPx={mySpan==="day" ? 64 : undefined}
                    hoursStart={gymHoursStart}
                  hoursEnd={gymHoursEnd}
                  onEventClick={(e)=>evClick(e._src)}
                    emptyNote={mySpan==="day" ? "Nothing booked on this day." : "Nothing booked this week — browse Classes, PT or Camps above."}
                  />
                  <div className="text-[10px] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{color:T.muted}}>
                    <span style={{color:T.navy}}>■ PT</span><span style={{color:T.plum}}>■ Camp</span><span>■ Class (type colour)</span>
                    <span>Tap a session to change or cancel it</span>
                  </div>
                  {none && <div className="text-center py-6 text-sm" style={{color:T.muted}}>Nothing booked in this week yet.</div>}
                </div>);})()}
              </div>);})()}
          </main>)}

  </>);
}

