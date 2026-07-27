import { useApp } from "../../state/AppState.jsx";
import { CT, isHead, weekExtras } from "../../data/seed.js";
import { CAL_HEND, CAL_HSTART, DAYS, FULLDAYS, TODAY, dateFor, firstName, fmtDM, locAbbr, toMin, upcomingDate, weekLabel } from "../../lib/dates.js";
import { PT_DUR, sessTrainers } from "../../lib/scheduling.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import WeekGrid from "../../components/WeekGrid.jsx";
import { T, disp } from "../../theme.js";
import { Btn, Card, Chip, H, Select } from "../../ui/kit.jsx";

export default function StaffSchedule() {
  const { setEventSheet, previewMove, moveBooking, lastMove, undoMove,
          cancelSession, restoreSession, showCancelled, setShowCancelled, openClassBuilder, setClassBuilder, active, audit, booked, calDay, calSpan, calTrainer, calWeek, day, exceptionQueue, isAdmin, isClient, loc, locName, locations, ping, ptBookings, removeTimeOff, resolveException, schedView, sessions, setBookFor, setCalDay, setCalSpan, setCalTrainer, setCalWeek, setMoveDay, setMoveSheet, setSchedView, setShiftEditor, setTimeOff, setTimeOffSheet, shifts, staffSessions, staffTimeOff, tName, tab, trainers, user } = useApp();
  return (<>
        {/* ==================== TRAINER / ADMIN: SCHEDULE ==================== */}
        {!isClient && tab==="schedule" && (
          <main className="flex-1 overflow-y-auto pb-24 px-5">
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
              {/* "Availability" for admin too. It used to be "By coach", which now
                  collides with the calendar's coach-column span — two different
                  controls with the same name is how you click the wrong one. This
                  tab is the shifts and time-off editor; that's what it should say. */}
              {[["cal","Calendar"],["week","List"],["coach","Availability"]].map(([k,l])=>(
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

            {/* ---- CALENDAR ----
                 Three shapes of the same grid, all rendered by WeekGrid:
                   Day       — one wide column
                   Week      — seven columns, tap one to expand it
                   By coach  — one column per coach for a single day (admin)
                 "By coach" is the view Google Calendar can't give Danny without a
                 separate calendar per trainer. Side by side is how you see that
                 Sarah has four back-to-back and Marcus has a two-hour hole.

                 Every block is draggable. The drop is validated by the same conflict
                 engine the builders use, live, while the finger is still down. ---- */}
            {schedView==="cal" && (() => {
              const toMin = (t)=>{ const [h,m]=t.split(":").map(Number); return h*60+m; };
              const inFilter = (tid)=> isAdmin ? (calTrainer==="all"||tid===calTrainer) : tid===user.id;
              const coachCols = calSpan==="coach";
              // "By coach" is inherently all-coaches: filtering to one would leave one column.
              const visibleCoaches = trainers.filter(t=>!t.admin && t.active!==false);

              /* One event list for a weekday, role- and filter-aware. `col` is filled in
                 by the caller because it means a different thing in each view. */
              const evsForDay = (d, filterFn) => {
                const keep = filterFn || inFilter;
                const cls = sessions.filter(s=>s.day===d && sessTrainers(s).some(keep))
                                    .filter(s=>showCancelled || s.status!=="cancelled");
                const pts = ptBookings.filter(b=>b.day===d && b.status!=="cancelled" && keep(b.trainer));
                const extras = weekExtras(calWeek).filter(x=>x.day===d && keep(x.trainer));
                return [
                  ...cls.map(s=>({ key:`c${s.id}`, kind:"class", id:s.id, day:d,
                    start:toMin(s.time), dur:CT[s.type].dur, color:CT[s.type].color,
                    code:s.type, title:CT[s.type].name, time:s.time, locId:s.loc,
                    trainer:s.trainer, trainers:sessTrainers(s),
                    cancelled:s.status==="cancelled", coaches:sessTrainers(s).length,
                    sub:`${locName(s.loc)} · ${sessTrainers(s).map(tName).join(" + ")}` })),
                  ...pts.map(b=>({ key:`p${b.id}`, kind:"pt", id:b.id, day:d,
                    start:toMin(b.time), dur:PT_DUR, color:b.byAdmin?T.plum:T.navy,
                    code:"PT", title:`PT · ${b.who}`, time:b.time, locId:b.loc,
                    trainer:b.trainer, trainers:[b.trainer], coaches:1,
                    sub:`${b.otherLabel||locName(b.loc)} · ${tName(b.trainer)}` })),
                  /* Sample rows that illustrate a busy week. Not real bookings, so they
                     are locked: draggable demo data that can't be saved would be a lie. */
                  ...extras.map((x,i)=>({ key:`x${d}-${i}`, kind:"demo", id:null, day:d,
                    start:toMin(x.time), dur:PT_DUR, color:"#8A7CC0", code:"PT",
                    title:`PT · ${x.who}`, time:x.time, locId:x.loc, trainer:x.trainer,
                    trainers:[x.trainer], coaches:1, locked:true,
                    sub:`${locName(x.loc)} · ${tName(x.trainer)}` })),
                ];
              };

              /* ---- columns + events, per view ---- */
              let columns, gridEvents;
              if (coachCols) {
                columns = visibleCoaches.map(t=>({
                  key:t.id, day:calDay, label:firstName(t.name).toUpperCase()+(isHead(t.id)?" ★":""),
                  big:null, aria:t.name, dropLabel:firstName(t.name),
                  isToday: calWeek===0 && calDay===TODAY }));
                // a class with two coaches shows in both columns — that IS the shared load
                gridEvents = visibleCoaches.flatMap(t =>
                  evsForDay(calDay, (tid)=>tid===t.id).map(e=>({...e, col:t.id, id:`${t.id}|${e.key}`, _src:e })));
              } else if (calSpan==="day") {
                columns = [{ key:calDay, day:calDay, label:FULLDAYS[calDay].toUpperCase(),
                  isToday: calWeek===0 && calDay===TODAY }];
                gridEvents = evsForDay(calDay).map(e=>({...e, col:calDay, id:e.key, _src:e }));
              } else {
                columns = undefined; // WeekGrid's default 7-day rail
                gridEvents = [0,1,2,3,4,5,6].flatMap(d =>
                  evsForDay(d).map(e=>({...e, col:d, id:e.key, _src:e })));
              }

              const bookAt = (colKey, mins) => {
                const trainer = coachCols ? colKey
                  : isAdmin ? (calTrainer!=="all"?calTrainer:trainers[0]?.id) : user.id;
                const d = coachCols ? calDay : colKey;
                setBookFor({trainer, day:d, time:`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`,
                  weekOff:calWeek, loc:locations[0]?.id, self:!isAdmin, who:"", nonClient:false});
              };

              const openEvent = (e) => {
                const s = e._src || e;
                if (s.kind==="demo") { ping("Sample demo booking — illustrative data for this week"); return; }
                setEventSheet({ kind:s.kind, id:s.id, weekOff:calWeek });
              };

              /* Drag: resolve the column back into a day (and, in coach view, a coach)
                 then ask the conflict engine. Reassigning a session by dragging it into
                 another coach's column is the whole reason the coach view exists. */
              const dropTarget = (e, colKey, start) => {
                const s = e._src || e;
                const time = `${String(Math.floor(start/60)).padStart(2,"0")}:${String(start%60).padStart(2,"0")}`;
                return { kind:s.kind, id:s.id, weekOff:calWeek, time,
                  day: coachCols ? calDay : colKey,
                  trainer: coachCols && colKey!==s.trainer ? colKey : undefined };
              };
              const canDrag = isAdmin || !isClient;
              const validateDrop = ({ev, colKey, start}) => {
                const s = ev._src || ev;
                if (s.kind==="demo") return {ok:false, message:"Sample data — not a real booking"};
                if (!isAdmin && !s.trainers.includes(user.id))
                  return {ok:false, message:`That's ${tName(s.trainer)}'s session`};
                if (s.coaches>1 && coachCols)
                  return {ok:false, message:"Multi-coach class — reassign it in Edit class"};
                return previewMove(dropTarget(ev, colKey, start));
              };
              const commitDrop = ({ev, colKey, start}) => moveBooking(dropTarget(ev, colKey, start));

              const dayCount = (d)=>evsForDay(d).filter(e=>!e.cancelled).length;
              const weekMins = gridEvents.filter(e=>!e.cancelled).reduce((t,e)=>t+e.dur,0);

              return (
              <div>
                {/* controls: admin coach filter (not in coach view — it shows them all) */}
                {isAdmin && !coachCols && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold" style={{color:T.muted}}>COACH</span>
                    <Select value={calTrainer} onChange={setCalTrainer} options={[["all","All coaches"], ...trainers.map(t=>[t.id,t.name+(isHead(t.id)?" ★":"")])]}/>
                  </div>)}

                <div className="flex gap-2 mb-2 items-center">
                  {[["day","Day"],["week","Week"],...(isAdmin?[["coach","By coach"]]:[])].map(([k,l])=>(
                    <Chip key={k} active={calSpan===k} onClick={()=>setCalSpan(k)}>{l}</Chip>))}
                  {calWeek!==0 && (
                    <button onClick={()=>{setCalWeek(0); setCalDay(TODAY);}}
                      className="ml-auto text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
                      style={{border:`1.5px solid ${T.accent}`, color:T.accent}}>Today</button>)}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <button onClick={()=>setCalWeek(w=>w-1)} aria-label="Previous week"
                    className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`}}>‹</button>
                  <div className="text-sm font-bold text-center" style={disp}>
                    {weekLabel(calWeek)}{calWeek===0?" · this week":""}
                    <div className="text-[11px] font-medium" style={{color:T.muted}}>
                      {gridEvents.filter(e=>!e.cancelled).length} session{gridEvents.filter(e=>!e.cancelled).length!==1?"s":""} · {(weekMins/60).toFixed(1)}h
                    </div>
                  </div>
                  <button onClick={()=>setCalWeek(w=>w+1)} aria-label="Next week"
                    className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`}}>›</button>
                </div>

                {/* day picker — needed by Day and By-coach, both of which show one date */}
                {calSpan!=="week" && (<>
                  <div className="flex gap-1.5 pb-2 overflow-x-auto">
                    {[0,1,2,3,4,5,6].map(d=>{ const dt=dateFor(calWeek,d); const isToday=(calWeek===0&&d===TODAY); const on=calDay===d; return (
                      <button key={d} onClick={()=>setCalDay(d)} className="rounded-xl py-1.5 text-center" style={{flex:"1 0 auto", minWidth:44,
                        background:on?T.ink:T.card, color:on?T.paper:T.ink, border:`1.5px solid ${isToday&&!on?T.accent:on?T.ink:T.line}`}}>
                        <div className="text-[10px] font-bold leading-none" style={{opacity:.7}}>{DAYS[d]}</div>
                        <div style={{...disp,fontWeight:700,fontSize:16,lineHeight:1.1}}>{dt.getDate()}</div>
                        <div className="text-[9px] leading-none" style={{opacity:.65}}>{dayCount(d)||"·"}</div>
                      </button>);})}
                  </div>
                  <div className="text-xs mb-1.5" style={{color:T.muted}}>
                    {FULLDAYS[calDay]} {fmtDM(dateFor(calWeek,calDay))}
                    {coachCols ? ` · ${visibleCoaches.length} coaches side by side` : ` · ${dayCount(calDay)} session${dayCount(calDay)!==1?"s":""}`}
                  </div>
                </>)}

                <WeekGrid
                  weekOff={calWeek}
                  columns={columns}
                  events={gridEvents}
                  hourPx={calSpan==="week" ? undefined : 64}
                  maxHeight={calSpan==="week" ? 460 : 430}
                  onSlotClick={bookAt}
                  onEventClick={openEvent}
                  validateDrop={canDrag ? validateDrop : undefined}
                  onEventDrop={canDrag ? commitDrop : undefined}
                  emptyNote={coachCols ? "No one is booked on this day." : "No sessions this week."}
                />

                {/* Undo. A drag makes a wrong move one slip of the thumb away, so the
                    way back has to be visible rather than remembered. */}
                {lastMove && (
                  <div className="flex items-center gap-2 mt-2 rounded-xl px-3 py-2"
                    style={{background:"#EEF1F6", border:`1px solid ${T.line}`}}>
                    <span className="text-xs flex-1" style={{color:T.ink}}>
                      Moved <b>{lastMove.label}</b> from {DAYS[lastMove.from.day]} {lastMove.from.time}</span>
                    <button onClick={undoMove} className="text-xs font-bold" style={{color:T.blue}}>↩ Undo</button>
                  </div>)}

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

