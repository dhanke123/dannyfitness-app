import { useApp } from "../../state/AppState.jsx";
import { CT, isHead, weekExtras } from "../../data/seed.js";
import { CAL_HEND, CAL_HSTART, DAYS, FULLDAYS, TODAY, dateFor, firstName, fmtDM, locAbbr, toMin, upcomingDate, weekLabel } from "../../lib/dates.js";
import { PT_DUR, sessTrainers } from "../../lib/scheduling.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import { T, disp } from "../../theme.js";
import { Btn, Card, Chip, H, Select } from "../../ui/kit.jsx";

export default function StaffSchedule() {
  const { cancelSession, restoreSession, showCancelled, setShowCancelled, openClassBuilder, setClassBuilder, active, audit, booked, calDay, calSpan, calTrainer, calWeek, day, exceptionQueue, isAdmin, isClient, loc, locName, locations, ping, ptBookings, removeTimeOff, resolveException, schedView, sessions, setBookFor, setCalDay, setCalSpan, setCalTrainer, setCalWeek, setMoveDay, setMoveSheet, setSchedView, setShiftEditor, setTimeOff, setTimeOffSheet, shifts, staffSessions, staffTimeOff, tName, tab, trainers, user } = useApp();
  return (<>
        {/* ==================== TRAINER / ADMIN: SCHEDULE ==================== */}
        {!isClient && tab==="schedule" && (
          <main className="flex-1 pb-24 px-5">
            <H>{isAdmin?"Master schedule":"My week & availability"}</H>

            {/* ---- Queue 1 of 4: EXCEPTIONS (Decisions 1a, 6, 7) ----
                 Members who are inside the cancellation window land here rather than hitting a
                 wall. Nothing auto-resolves: these sit until the admin approves or denies with
                 a reason, which is why the count is badged on the nav. */}
            {isAdmin && exceptionQueue.length>0 && (
              <div className="mb-4">
                <ApprovalQueue
                  label="EXCEPTION REQUESTS · inside the cancellation window"
                  items={exceptionQueue.map(e=>({
                    id:e.id,
                    title:`${e.who} — ${e.ask==="cancel"?"wants to cancel":"wants to move"}`,
                    sub:`${e.what} · "${e.reason}"`,
                    meta:e.when,
                  }))}
                  onResolve={resolveException}
                  approveLabel="Approve" denyLabel="Deny" />
              </div>)}

            <div className="flex gap-2 pb-2 items-center flex-wrap">
              {[["cal","Calendar"],["week","List"],["coach",isAdmin?"By coach":"Availability"]].map(([k,l])=>(
                <Chip key={k} active={schedView===k} onClick={()=>setSchedView(k)}>{l}</Chip>))}
              {isAdmin && <Btn small onClick={()=>openClassBuilder({})}>+ Class</Btn>}
            </div>
            {schedView==="cal" && (
              <div className="flex items-center justify-between pb-2">
                <button onClick={()=>setShowCancelled(v=>!v)} className="text-xs font-bold"
                  style={{color: showCancelled ? T.ink : T.muted}}>
                  {showCancelled ? "☑" : "☐"} Show cancelled
                </button>
                <div className="text-[11px]" style={{color:T.muted}}>
                  Cancelled classes stay struck through — kept for the record.
                </div>
              </div>)}

            {/* ---- CALENDAR: Google-Calendar-style time-grid — day or full-week ---- */}
            {schedView==="cal" && (() => {
              const toMin = (t)=>{ const [h,m]=t.split(":").map(Number); return h*60+m; };
              const HSTART=CAL_HSTART, HEND=CAL_HEND, PXH=52, GUT=40, HEADH=34;
              const gridH=(HEND-HSTART)*PXH;
              // events for a weekday, respecting role + admin trainer filter, with lane packing
              const evsForDay = (d) => {
                const inFilter = (tid)=> isAdmin ? (calTrainer==="all"||tid===calTrainer) : tid===user.id;
                const cls = sessions.filter(s=>s.day===d && sessTrainers(s).some(inFilter))
                                    .filter(s=>showCancelled || s.status!=="cancelled");
                const pts = ptBookings.filter(b=>b.day===d && b.status!=="cancelled" && inFilter(b.trainer));
                const extras = weekExtras(calWeek).filter(x=>x.day===d && inFilter(x.trainer));
                const evs = [
                  ...cls.map(s=>({start:toMin(s.time), dur:CT[s.type].dur, color:CT[s.type].color, title:CT[s.type].name,
                    time:s.time, code:s.type, who:null, locId:s.loc,
                    cancelled:s.status==="cancelled", coaches:sessTrainers(s).length, sid:s.id,
                    sub:`${locName(s.loc)} · ${sessTrainers(s).map(tName).join(" + ")}`,
                    move:{kind:"class", id:s.id, day:s.day, time:s.time, trainer:s.trainer, loc:s.loc, label:CT[s.type].name}})),
                  ...pts.map(b=>({start:toMin(b.time), dur:PT_DUR, color:b.byAdmin?T.plum:T.navy, title:`PT · ${b.who}`,
                    time:b.time, code:"PT", who:b.who, locId:b.loc,
                    sub:`${b.otherLabel||locName(b.loc)} · ${tName(b.trainer)}`,
                    move:{kind:"pt", id:b.id, day:b.day, time:b.time, trainer:b.trainer, loc:b.loc, label:`PT · ${b.who}`}})),
                  ...extras.map(x=>({start:toMin(x.time), dur:PT_DUR, color:"#8A7CC0", title:`PT · ${x.who}`,
                    time:x.time, code:"PT", who:x.who, locId:x.loc, demo:true,
                    sub:`${locName(x.loc)} · ${tName(x.trainer)}`, move:null})),
                ].sort((a,b)=>a.start-b.start);
                const laneEnds=[]; evs.forEach(e=>{ let i=0; for(;i<laneEnds.length;i++){ if(laneEnds[i]<=e.start) break; } e.lane=i; laneEnds[i]=e.start+e.dur; });
                evs._lanes=Math.max(1,laneEnds.length);
                return evs;
              };
              const bookAt = (d,hr) => {
                const trainer = isAdmin ? (calTrainer!=="all"?calTrainer:trainers[0]?.id) : user.id;
                setBookFor({trainer, day:d, time:`${String(hr).padStart(2,"0")}:00`, weekOff:calWeek, loc:locations[0]?.id, self:!isAdmin, who:"", nonClient:false});
              };
              const evClick = (e)=>{ if(e.demo) ping("Sample demo booking — illustrative data for this week"); else setMoveSheet(e.move); };
              // one day's vertical grid. `wide` = roomy single-day; `compact` = narrow week column.
              const DayGrid = ({d, wide, compact}) => { const evs=evsForDay(d); const lanes=evs._lanes; return (
                <div style={{position:"relative", height:gridH, flex: wide?"1 1 auto":"1 1 0", width: wide?"auto":"auto", minWidth:0, borderLeft: wide?"none":`1px solid ${T.line}`}}>
                  {Array.from({length:HEND-HSTART}).map((_,i)=>{ const hr=HSTART+i; return (
                    <div key={hr} onClick={()=>bookAt(d,hr)}
                      className="absolute left-0 right-0" style={{top:i*PXH, height:PXH, borderTop:`1px solid ${T.line}`, cursor:"pointer"}}/>);})}
                  {/* "now" line — the single most useful thing Google Calendar puts on a
                      day grid: it tells you where you are without reading any labels. */}
                  {calWeek===0 && d===TODAY && (() => {
                    const now=new Date(); const mins=now.getHours()*60+now.getMinutes();
                    if (mins < HSTART*60 || mins > HEND*60) return null;
                    const top=(mins-HSTART*60)/60*PXH;
                    return (<div className="absolute left-0 right-0" style={{top, zIndex:3, pointerEvents:"none"}}>
                      <div style={{height:2, background:T.accent}}/>
                      <div style={{position:"absolute", left:-3, top:-3, width:8, height:8, borderRadius:4, background:T.accent}}/>
                    </div>);})()}
                  {evs.map((e,i)=>{ const top=(e.start-HSTART*60)/60*PXH; const h=Math.max(20,e.dur/60*PXH-2);
                    const left=`${(e.lane/lanes)*100}%`; const w=`${100/lanes}%`;
                    /* A cancelled class stays on the grid, struck through and faded,
                       rather than disappearing. Removing it erases the reason a coach's
                       week looks light and hides a pattern of cancellations. */
                    const strike = e.cancelled ? {textDecoration:"line-through"} : null;
                    const blockStyle = e.cancelled
                      ? {background:"transparent", color:e.color, border:`1.5px dashed ${e.color}`, opacity:.75}
                      : {background:e.color, color:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,.15)"};
                    return compact ? (
                    <div key={i} onClick={(ev)=>{ev.stopPropagation(); evClick(e);}}
                      className="absolute rounded overflow-hidden" style={{top:top+1, height:h, left, width:w, padding:"1px 2px",
                        fontSize:8.5, lineHeight:1.08, cursor:"pointer", ...blockStyle}}>
                      <div style={{fontWeight:800, ...strike}}>{e.time}</div>
                      <div style={{fontWeight:700, ...strike}}>{e.who ? firstName(e.who) : e.code}</div>
                      {h>26 && <div style={{opacity:.85}}>{e.coaches>1 ? `👥${e.coaches}` : locAbbr(e.locId)}</div>}
                    </div>) : (
                    <div key={i} onClick={(ev)=>{ev.stopPropagation(); evClick(e);}}
                      className="absolute rounded-md px-1 py-0.5 overflow-hidden" style={{top:top+1, height:h, left, width:w,
                        fontSize:10, lineHeight:1.1, cursor:"pointer", ...blockStyle}}>
                      <div style={{fontWeight:700, ...strike}}>
                        {e.time} {e.title}{e.coaches>1 ? ` · ${e.coaches} coaches` : ""}</div>
                      {h>32 && <div style={{opacity:.9}}>{e.cancelled ? "CANCELLED" : e.sub}</div>}
                    </div>);})}
                </div>);};
              // Hour labels CAL_HSTART:00 … CAL_HEND:00 (5:00 … 23:00). First and last are
              // nudged inside the box — at top:-5 the first label was clipped by the
              // wrapper's overflow-hidden, and the last was never drawn, so the grid
              // appeared to stop an hour early.
              const TimeGutter = ({top}) => (
                <div style={{width:GUT, flex:"none"}}>
                  {top && <div style={{height:HEADH}}/>}
                  <div style={{position:"relative", height:gridH}}>
                    {Array.from({length:HEND-HSTART+1}).map((_,i)=>{
                      const last = i===HEND-HSTART;
                      return (
                      <div key={i} className="absolute text-[10px]"
                        style={{top: last ? gridH-9 : Math.max(0, i*PXH-5), left:2, color:T.muted}}>{HSTART+i}:00</div>);})}
                  </div>
                </div>);
              const dayCount = (d)=>evsForDay(d).length;
              return (
              <div>
                {/* controls: admin trainer filter, then day/week span toggle */}
                {isAdmin && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold" style={{color:T.muted}}>COACH</span>
                    <Select value={calTrainer} onChange={setCalTrainer} options={[["all","All coaches"], ...trainers.map(t=>[t.id,t.name+(isHead(t.id)?" ★":"")])]}/>
                  </div>)}
                <div className="flex gap-2 mb-2">
                  {[["day","Day"],["week","Full week"]].map(([k,l])=>(
                    <Chip key={k} active={calSpan===k} onClick={()=>setCalSpan(k)}>{l}</Chip>))}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={()=>setCalWeek(w=>w-1)} className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`}}>‹</button>
                  <div className="text-sm font-bold" style={disp}>{weekLabel(calWeek)}{calWeek===0?" · this week":""}</div>
                  <button onClick={()=>setCalWeek(w=>w+1)} className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`}}>›</button>
                </div>

                {calSpan==="day" ? (<>
                  <div className="flex gap-1.5 pb-3 overflow-x-auto">
                    {[0,1,2,3,4,5,6].map(d=>{ const dt=dateFor(calWeek,d); const isToday=(calWeek===0&&d===TODAY); const on=calDay===d; return (
                      <button key={d} onClick={()=>setCalDay(d)} className="rounded-xl py-1.5 text-center" style={{flex:"1 0 auto", minWidth:44,
                        background:on?T.ink:T.card, color:on?T.paper:T.ink, border:`1.5px solid ${isToday&&!on?T.accent:on?T.ink:T.line}`}}>
                        <div className="text-[10px] font-bold leading-none" style={{opacity:.7}}>{DAYS[d]}</div>
                        <div style={{...disp,fontWeight:700,fontSize:16,lineHeight:1.1}}>{dt.getDate()}</div>
                      </button>);})}
                  </div>
                  <div className="text-xs mb-1.5" style={{color:T.muted}}>{FULLDAYS[calDay]} {fmtDM(dateFor(calWeek,calDay))} · {dayCount(calDay)} session{dayCount(calDay)!==1?"s":""} · tap a slot to book, tap a session to modify</div>
                  <div className="flex rounded-xl overflow-hidden" style={{border:`1.5px solid ${T.line}`, background:T.card}}>
                    <TimeGutter top={false}/>
                    <DayGrid d={calDay} wide/>
                  </div>
                </>) : (<>
                  <div className="text-xs mb-1.5" style={{color:T.muted}}>Whole week · tap a slot to book, tap a session to modify · blocks show time · type/client · location initials</div>
                  <div className="rounded-xl overflow-hidden" style={{border:`1.5px solid ${T.line}`, background:T.card}}>
                    <div className="flex">
                      <TimeGutter top/>
                      {[0,1,2,3,4,5,6].map(d=>{ const dt=dateFor(calWeek,d); const isToday=(calWeek===0&&d===TODAY); return (
                        <div key={d} className="flex flex-col" style={{flex:"1 1 0", minWidth:0}}>
                          <div className="text-center" style={{height:HEADH, borderLeft:`1px solid ${T.line}`, background:isToday?"#FBF3EC":"transparent"}}>
                            <div className="text-[9px] font-bold leading-none pt-1" style={{color:isToday?T.accent:T.muted}}>{DAYS[d]}</div>
                            <div style={{...disp,fontWeight:700,fontSize:12,lineHeight:1.1,color:isToday?T.accent:T.ink}}>{dt.getDate()}/{dt.getMonth()+1}</div>
                          </div>
                          <DayGrid d={d} compact/>
                        </div>);})}
                    </div>
                  </div>
                  <div className="text-[10px] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{color:T.muted}}>
                    <span>Loc: {locations.map(l=>l.id).join(" · ")}</span>
                    <span style={{color:"#8A7CC0"}}>■ sample data (future weeks)</span>
                  </div>
                </>)}

                {(isAdmin || !isClient) && <div className="mt-3"><Btn small full kind="ghost"
                  onClick={()=>{ const trainer=isAdmin?(calTrainer!=="all"?calTrainer:trainers[0]?.id):user.id;
                    setBookFor({trainer, day:calDay, time:"09:00", weekOff:calWeek, loc:locations[0]?.id, self:!isAdmin, who:"", nonClient:false}); }}>
                  ＋ {isAdmin?"Book on behalf of a coach":"Book a session"}</Btn></div>}
                {isAdmin && audit.length>0 && (
                  <Card className="!p-3 mt-3">
                    <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>ADMIN ACTIVITY · audit trail</div>
                    {audit.slice(0,5).map(a=>(
                      <div key={a.id} className="text-xs py-0.5" style={{color:T.ink}}>{a.what} <span style={{color:T.muted}}>· {a.when}</span></div>))}
                  </Card>)}
              </div>);})()}

            {/* ---- WEEK: master calendar — who is booked when, across all coaches & locations ---- */}
            {schedView==="week" && (
              <div className="space-y-2.5">
                {[0,1,2,3,4,5,6].map(d=>{
                  const cls = sessions.filter(s=>s.day===d && (isAdmin || sessTrainers(s).includes(user.id)));
                  const pts = ptBookings.filter(b=>b.day===d && b.status!=="cancelled" && (isAdmin || b.trainer===user.id));
                  const rows = [
                    ...cls.map(s=>({time:s.time, color:CT[s.type].color, label:CT[s.type].name, loc:s.loc, who:sessTrainers(s).map(tName).join(" + ")})),
                    ...pts.map(b=>({time:b.time, color:T.navy, label:`PT · ${b.who}`, loc:b.loc, who:tName(b.trainer)})),
                  ].sort((a,b)=>a.time.localeCompare(b.time));
                  const off = !isAdmin ? staffTimeOff(user.id).filter(to=>to.day===d) : [];
                  const shiftDay = !isAdmin && shifts[user.id]?.[d];
                  return (
                    <Card key={d} className="!p-3" style={d===TODAY?{border:`1.5px solid ${T.accent}`}:undefined}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-xs font-bold" style={{color:d===TODAY?T.accent:T.muted}}>{FULLDAYS?.[d]||DAYS[d]}{d===TODAY?" · TODAY":""}</div>
                        <div className="text-xs" style={{color:T.muted}}>{rows.length} session{rows.length!==1?"s":""}</div>
                      </div>
                      {!isAdmin && (
                        <div className="text-xs mb-1.5" style={{color:T.muted}}>
                          {shiftDay?`PT shift ${shiftDay[0]}–${shiftDay[1]}`:"No PT shift"}
                          {off.map(o=>` · off ${o.allDay?"all day":`${o.start}–${o.end}`}`).join("")}
                        </div>)}
                      {rows.length===0 ? <div className="text-sm" style={{color:T.muted}}>—</div> :
                        <div className="space-y-1">
                          {rows.map((r,i)=>(
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span style={{...disp,fontWeight:700,minWidth:46}}>{r.time}</span>
                              <span style={{width:3,height:16,borderRadius:2,background:r.color}}/>
                              <span className="flex-1">{r.label} · {locName(r.loc)}</span>
                              {isAdmin && <span className="text-xs" style={{color:T.navy}}>{r.who}</span>}
                            </div>))}
                        </div>}
                    </Card>);})}
              </div>)}

            {/* ---- BY COACH: per-trainer sessions + editable shifts / time off ---- */}
            {schedView==="coach" && (isAdmin?trainers:trainers.filter(t=>t.id===user.id)).map(t=>{
              const myPtToday = ptBookings.filter(b=>b.trainer===t.id && b.day===TODAY && b.status!=="cancelled");
              return (
              <div key={t.id} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold" style={{color:T.muted}}>{t.name.toUpperCase()} · {staffSessions(t.id).length} SESSIONS/WK</div>
                  {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setMoveDay({trainer:t.id})}>Running late</Btn>}
                </div>
                <div className="space-y-2">
                  {staffSessions(t.id).sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time)).map(s=>(
                    <Card key={s.id} className="flex items-center gap-3 !p-3">
                      <span style={{...disp,minWidth:70}}><span style={{fontWeight:700,fontSize:16}}>{DAYS[s.day]} {s.time}</span><br/><span className="text-xs" style={{color:T.muted,fontWeight:500}}>{fmtDM(upcomingDate(s.day))}</span></span>
                      <span className="flex-1 text-sm">{CT[s.type].name} · {locName(s.loc)}
                        {sessTrainers(s).length>1 && <span className="text-xs" style={{color:T.navy}}> · +{sessTrainers(s).length-1} coach</span>}</span>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setMoveSheet({kind:"class", id:s.id, day:s.day, time:s.time, trainer:s.trainer, loc:s.loc, label:CT[s.type].name})}>Move</Btn>}
                    </Card>))}
                  {myPtToday.length>0 && myPtToday.map(b=>(
                    <Card key={b.id} className="flex items-center gap-3 !p-3" style={{background:"#EEF1F6"}}>
                      <span style={{...disp,minWidth:70}}><span style={{fontWeight:700,fontSize:16}}>{DAYS[b.day]} {b.time}</span><br/><span className="text-xs" style={{color:T.muted,fontWeight:500}}>{fmtDM(upcomingDate(b.day))}</span></span>
                      <span className="flex-1 text-sm">PT · {b.who} · {locName(b.loc)}</span>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setMoveSheet({kind:"pt", id:b.id, day:b.day, time:b.time, trainer:b.trainer, loc:b.loc, label:`PT · ${b.who}`})}>Move</Btn>}
                    </Card>))}
                  <Card className="!p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold" style={{color:T.navy}}>PT SHIFT HOURS · bookable at any location</div>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setShiftEditor({trainer:t.id})}>Edit</Btn>}
                    </div>
                    {[0,1,2,3,4,5,6].some(d=>shifts[t.id]?.[d]) ? (
                      <div className="text-sm py-0.5">{[0,1,2,3,4,5,6].filter(d=>shifts[t.id]?.[d]).map(d=>`${DAYS[d]} ${shifts[t.id][d][0]}–${shifts[t.id][d][1]}`).join(" · ")}</div>
                    ) : <div className="text-sm py-0.5" style={{color:T.muted}}>No PT shift set.</div>}
                    <div className="text-xs mt-1" style={{color:T.muted}}>Weekly-recurring; hours can differ per day (e.g. weekends). Repeats every week until edited.</div>
                  </Card>
                  <Card className="!p-3" style={{background:"#FBF3EC"}}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold" style={{color:T.accent}}>TIME OFF</div>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setTimeOffSheet({trainer:t.id})}>+ Add</Btn>}
                    </div>
                    {staffTimeOff(t.id).length===0 && <div className="text-sm" style={{color:T.muted}}>None set — fully available per their windows.</div>}
                    {staffTimeOff(t.id).map(to=>{ const overridden=(to.overrides||[]).includes(TODAY); return (
                      <div key={to.id} className="flex items-center justify-between py-1 gap-2">
                        <span className="text-sm flex-1">
                          {to.scope==="weekly" ? `Every ${DAYS[to.day]}` : `${DAYS[to.day]} (one-off)`} · {to.allDay?"All day":`${to.start}–${to.end}`}
                          {to.reason && <span style={{color:T.muted}}> · {to.reason}</span>}
                          {overridden && <span className="font-bold" style={{color:T.moss}}> · working today ✓</span>}
                        </span>
                        {to.day===TODAY && <button className="text-xs font-bold" style={{color:T.moss}}
                          onClick={()=>{setTimeOff(ts=>ts.map(x=>x.id!==to.id?x:{...x, overrides: overridden ? (x.overrides||[]).filter(d=>d!==TODAY) : [...(x.overrides||[]),TODAY]})); ping(overridden?"Override removed":"Override — you're available today despite this time off");}}>
                          {overridden?"Undo":"Work today"}</button>}
                        <button className="text-xs font-bold" style={{color:T.muted}} onClick={()=>removeTimeOff(to.id)}>Remove</button>
                      </div>);})}
                  </Card>
                </div>
              </div>);})}
          </main>)}

  </>);
}

