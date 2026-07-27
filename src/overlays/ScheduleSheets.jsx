import { useApp } from "../state/AppState.jsx";
import TimeOffForm from "../components/TimeOffForm.jsx";
import { CLIENTS, CT, isHead } from "../data/seed.js";
import { DAYS, FULLDAYS, TODAY, dateFor, fmtDM, fmtFull, fromMin, toMin, upcomingDate, weekLabel } from "../lib/dates.js";
import { PT_DUR, ptSlotsFor, sessTrainers, trainerBusyBlocks, workWindow } from "../lib/scheduling.js";
import { nid } from "../lib/util.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Select } from "../ui/kit.jsx";

export default function ScheduleSheets() {
  const { cancelSession, restoreSession, addTimeOff, audit, bookFor, booked, cancelPT, clientMove, policy, setExceptionSheet, commitClientMove, day, doneSheet, hoursUntil, isAdmin, loc, locName, locations, logAudit, mark, moveDay, moveSheet, myPT, otherPlace, ping, ptBookings, ptCtx, revenue, sessions, setBookFor, setChatOpen, setClientMove, setDoneSheet, setMoveDay, setMoveSheet, setPtBookings, setSessions, setTimeOffSheet, setWalkSheet, sheet, shifts, tName, timeOffSheet, trainers, travel, walkSheet, notifyClient, clients, clientGroups, clientById, logGroupSession, addSessionLog, trainers: allTrainers } = useApp();
  return (<>
        {/* time off sheet */}
        {timeOffSheet && (
          <TimeOffForm trainer={timeOffSheet.trainer} tName={tName} onCancel={()=>setTimeOffSheet(null)} onSave={addTimeOff} />
        )}

        {/* move session sheet */}
        {moveSheet && (() => {
          const nd = moveSheet.newDay ?? moveSheet.day;
          const nt = moveSheet.newTime || moveSheet.time;
          const nl = moveSheet.newLoc || moveSheet.loc;
          const isPt = moveSheet.kind==="pt";
          const nw = moveSheet.newWeek ?? moveSheet.weekOff ?? 0;   // PT can move to any future week
          const dur = isPt ? PT_DUR : CT[sessions.find(s=>s.id===moveSheet.id)?.type]?.dur || 60;
          const ns = toMin(nt), ne = ns+dur;
          // conflict: overlap with another commitment for this coach on the *target* day (exclude self)
          const others = trainerBusyBlocks(moveSheet.trainer, nd, ptCtx)
            .filter(b => !(nd===moveSheet.day && b.start===toMin(moveSheet.time)));
          const conflict = others.find(b => ns < b.end && ne > b.start);
          const moved = nd!==moveSheet.day || nt!==moveSheet.time || nl!==moveSheet.loc || (isPt && nw!==(moveSheet.weekOff??0));
          const doCancel = () => {
            if (isPt) { setPtBookings(pb=>pb.map(b=>b.id!==moveSheet.id?b:{...b,status:"cancelled"}));
              const target = ptBookings.find(b=>b.id===moveSheet.id);
              if (target?.who) notifyClient(target.who.replace(/ \(non-client\)$/,""),
                `Your PT session with ${tName(moveSheet.trainer)} on ${target.date||DAYS[moveSheet.day]} ${moveSheet.time} was cancelled. Contact us to rebook.`);
              if (isAdmin) logAudit(`Cancelled ${moveSheet.label} · was ${DAYS[moveSheet.day]} ${moveSheet.time}`);
              ping("Cancelled — client notified in-app (audited)"); }
            // A class is CANCELLED, never deleted: it stays on the calendar struck
            // through so the record of what was scheduled survives.
            else cancelSession(moveSheet.id, moveSheet.cancelReason);
            setMoveSheet(null);
          };
          return (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setMoveSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Reschedule · {moveSheet.label}</div><button onClick={()=>setMoveSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Currently {DAYS[moveSheet.day]} · {moveSheet.time} · {locName(moveSheet.loc)}</div>

              {moveSheet.confirmingCancel ? (<>
                <div className="text-sm mb-3">Cancel this {isPt?"session":"class"}? Booked clients are notified and credited back.</div>
                {!isPt && <>
                  <input value={moveSheet.cancelReason||""} onChange={e=>setMoveSheet(m=>({...m,cancelReason:e.target.value}))}
                    placeholder="Reason (weather, coach ill, low numbers…)"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-2" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <div className="text-xs mb-3" style={{color:T.muted}}>
                    The class stays on the calendar, struck through, with the reason — so you can see
                    later why a week looked light, and spot a pattern.</div>
                </>}
                <button onClick={doCancel} className="w-full font-bold rounded-xl py-3 mb-2" style={{background:T.accent,color:"#fff"}}>Yes, cancel it</button>
                <button onClick={()=>setMoveSheet(m=>({...m,confirmingCancel:false}))} className="w-full text-sm font-bold" style={{color:T.muted}}>Keep it</button>
              </>) : (<>
                {isPt && (
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={()=>setMoveSheet(m=>({...m,newWeek:Math.max(0,(m.newWeek??m.weekOff??0)-1)}))}
                      className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`, color:nw===0?T.line:T.ink}}>‹</button>
                    <div className="text-sm font-bold" style={disp}>{nw===0?"This week":nw===1?"Next week":`+${nw} weeks`}</div>
                    <button onClick={()=>setMoveSheet(m=>({...m,newWeek:Math.min(12,(m.newWeek??m.weekOff??0)+1)}))}
                      className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`, color:nw>=12?T.line:T.ink}}>›</button>
                  </div>)}
                <div className="text-xs font-bold mb-1" style={{color:T.muted}}>NEW DAY</div>
                <div className="flex gap-1.5 mb-3 overflow-x-auto">
                  {[0,1,2,3,4,5,6].map(d=>{ const on=nd===d; return (
                    <button key={d} onClick={()=>setMoveSheet(m=>({...m,newDay:d}))} className="rounded-lg text-center" style={{flex:"1 0 auto", minWidth:40, padding:"6px 8px",
                      background:on?T.ink:T.card, color:on?T.paper:T.ink, border:`1.5px solid ${on?T.ink:T.line}`}}>
                      <div className="text-[11px] font-bold leading-none">{DAYS[d]}</div>
                      <div className="text-[9px] leading-none mt-0.5" style={{opacity:.75}}>{fmtDM(isPt ? dateFor(nw, d) : upcomingDate(d))}</div>
                    </button>);})}
                </div>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1"><div className="text-xs font-bold mb-1" style={{color:T.muted}}>NEW TIME</div>
                    <input value={nt} onChange={e=>setMoveSheet(m=>({...m,newTime:e.target.value}))}
                      placeholder="HH:MM" className="w-full px-3 py-2.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                  <div className="flex-1"><div className="text-xs font-bold mb-1" style={{color:T.muted}}>LOCATION</div>
                    <Select value={nl} onChange={v=>setMoveSheet(m=>({...m,newLoc:v}))} options={locations.map(l=>[l.id,l.name])}/></div>
                </div>
                <div className="text-xs mb-3" style={{color:T.muted}}>Re-checked against this coach's other sessions and the travel-time buffer — booked clients are notified if it moves.</div>
                {conflict && <div className="text-xs mb-2 font-semibold" style={{color:T.accent}}>⚠ Conflicts with {conflict.label} ({fromMin(conflict.start)}–{fromMin(conflict.end)}) on {DAYS[nd]}. Move that one too, or pick another slot.</div>}
                <Btn full disabled={!moved} onClick={()=>{
                  const newDate = fmtFull(dateFor(nw, nd));
                  if (isPt) {
                    setPtBookings(pb=>pb.map(b=>b.id!==moveSheet.id?b:{...b,day:nd,time:nt,loc:nl, weekOff:nw, date:newDate}));
                    // the client whose booking just moved gets told the new date & time
                    const target = ptBookings.find(b=>b.id===moveSheet.id);
                    if (target?.who) notifyClient(target.who.replace(/ \(non-client\)$/,""),
                      `Your PT session with ${tName(moveSheet.trainer)} was moved to ${newDate} at ${nt} (${locName(nl)}).`);
                  }
                  else setSessions(ss=>ss.map(s=>s.id!==moveSheet.id?s:{...s,day:nd,time:nt,loc:nl}));
                  if (isAdmin) logAudit(`Moved ${moveSheet.label} · ${DAYS[moveSheet.day]} ${moveSheet.time} → ${isPt?newDate:DAYS[nd]} ${nt} · ${locName(nl)}`);
                  ping(conflict ? `Moved to ${DAYS[nd]} ${nt} despite a conflict — resolve the overlap (audited)` : `Moved to ${isPt?newDate:DAYS[nd]} ${nt} — client notified in-app (WhatsApp when Twilio is live)`);
                  setMoveSheet(null);}}>{conflict?"Move anyway":"Confirm move"}</Btn>
                <button onClick={()=>setMoveSheet(m=>({...m,confirmingCancel:true}))} className="w-full text-sm font-bold mt-2" style={{color:T.accent}}>Cancel this {isPt?"session":"class"}</button>
              </>)}
            </div>
          </div>);})()}

        {/* CLIENT: reschedule my PT session — only inside the policy window, only onto free coach slots */}
        {clientMove && (() => {
          const mv = clientMove;
          const nw = mv.newWeek ?? mv.weekOff ?? 0, nd = mv.newDay ?? mv.day, nt = mv.newTime || mv.time;
          const isOther = mv.loc==="other";
          const working = !!workWindow(shifts, mv.trainer, nd);
          const slots = isOther ? [] : ptSlotsFor(mv.trainer, nd, mv.loc, travel, ptCtx, locName)
            .filter(sl => !(nw===(mv.weekOff??0) && sl.time===mv.time))       // current slot isn't a "move"
            .filter(sl => !myPT.some(b=>b.id!==mv.id && (b.weekOff??0)===nw && b.day===nd && b.time===sl.time))
            // no rescheduling ONTO a time that has already passed today
            .filter(sl => !(nw===0 && nd===TODAY && toMin(sl.time) <= new Date().getHours()*60 + new Date().getMinutes()));
          const pastDay = nw===0 && nd<TODAY;
          const changed = !(nw===(mv.weekOff??0) && nd===mv.day && nt===mv.time);
          const valid = changed && !pastDay && hoursUntil(nw,nd,nt) > policy.ptHrs;
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setClientMove(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[88vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Modify PT session</div>
                <button onClick={()=>setClientMove(null)} className="text-sm font-bold px-2 py-1 rounded-lg -mt-1" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>
                Currently <span style={{color:T.ink,fontWeight:600}}>{mv.date||DAYS[mv.day]} · {mv.time}</span> · {isOther?(mv.otherLabel||"Other spot"):locName(mv.loc)} · Coach {tName(mv.trainer)}{isHead(mv.trainer)?" ★":""}
              </div>

              {/* Decision 1a — inside the window is an approval request, not a refusal. */}
              {mv.locked ? (<>
                <Card style={{background:"#FBF3EC"}}>
                  <div className="text-sm font-semibold" style={{color:T.accent}}>Inside the {policy.ptHrs}h change window</div>
                  <div className="text-xs mt-1" style={{color:T.muted}}>This session starts in under {policy.ptHrs} hours, so it can't be moved straight away — but you can ask. Tell us why and the ExerciseOnly admin will review it.</div>
                </Card>
                <Btn full onClick={()=>{ setClientMove(null); setExceptionSheet({
                  what:`PT · ${tName(mv.trainer)} · ${mv.date||DAYS[mv.day]} ${mv.time}`, kind:"pt",
                  ask:"change", hrs:Math.max(0,Math.round(hoursUntil(mv.weekOff, mv.day, mv.time))), reason:"" }); }}>Request an exception</Btn>
                <button onClick={()=>{setClientMove(null); setChatOpen(true);}} className="w-full text-sm font-bold mt-2" style={{color:T.muted}}>Or message ExerciseOnly</button>
              </>) : (<>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={()=>setClientMove(m=>({...m,newWeek:Math.max(0,(m.newWeek??0)-1)}))}
                    className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`, color:nw===0?T.line:T.ink}}>‹</button>
                  <div className="text-sm font-bold" style={disp}>{nw===0?"This week":nw===1?"Next week":weekLabel(nw)}</div>
                  <button onClick={()=>setClientMove(m=>({...m,newWeek:Math.min(8,(m.newWeek??0)+1)}))}
                    className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{border:`1.5px solid ${T.line}`, color:nw>=8?T.line:T.ink}}>›</button>
                </div>
                <div className="grid gap-1 mb-3" style={{gridTemplateColumns:"repeat(7,minmax(0,1fr))"}}>
                  {[0,1,2,3,4,5,6].map(d=>{ const dt=dateFor(nw,d); const past=nw===0&&d<TODAY; const on=nd===d; return (
                    <button key={d} disabled={past} onClick={()=>setClientMove(m=>({...m,newDay:d,newTime:null}))}
                      className="rounded-xl py-1.5 text-center" style={{minWidth:0, opacity:past?.4:1,
                        background:on&&!past?T.ink:T.card, color:past?T.line:on?T.paper:T.ink, border:`1.5px solid ${on&&!past?T.ink:T.line}`}}>
                      <div className="text-[10px] font-bold leading-none" style={{opacity:.75}}>{DAYS[d]}</div>
                      <div style={{...disp,fontWeight:700,fontSize:15,lineHeight:1.15}}>{dt.getDate()}</div>
                    </button>);})}
                </div>

                <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>COACH {tName(mv.trainer).toUpperCase()} · AVAILABLE {fmtFull(dateFor(nw,nd)).toUpperCase()}</div>
                {isOther ? (
                  <div className="mb-3">
                    <input value={nt} onChange={e=>setClientMove(m=>({...m,newTime:e.target.value}))} placeholder="HH:MM"
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    <div className="text-xs mt-1.5" style={{color:T.muted}}>Ad-hoc location — your coach confirms the exact time.</div>
                  </div>
                ) : !working ? (
                  <div className="text-sm mb-3 rounded-xl p-3" style={{background:T.card, border:`1.5px solid ${T.line}`, color:T.muted}}>
                    Coach {tName(mv.trainer)} isn't working on {FULLDAYS[nd]}. Try another day.</div>
                ) : slots.length===0 ? (
                  <div className="text-sm mb-3 rounded-xl p-3" style={{background:T.card, border:`1.5px solid ${T.line}`, color:T.muted}}>
                    No free slots on {FULLDAYS[nd]} at {locName(mv.loc)}. Try another day or week.</div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {slots.map((sl,i)=>{ const on=nt===sl.time; return (
                      <button key={i} onClick={()=>setClientMove(m=>({...m,newTime:sl.time}))} title={sl.note||""}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                        style={{background:on?T.ink:T.card, color:on?T.paper:sl.note?T.accent:T.ink,
                          border:`1.5px solid ${on?T.ink:sl.note?T.accent:T.line}`}}>{sl.time}{sl.note?" ⏱":""}</button>);})}
                  </div>)}

                <div className="text-xs mb-3" style={{color:T.muted}}>
                  Same coach, same location, no extra charge — your credit stays applied. Reschedule as often as you need, as long as it's more than {policy.ptHrs}h before the new time.</div>
                <Btn full disabled={!valid} onClick={commitClientMove}>
                  {changed ? `Move to ${fmtFull(dateFor(nw,nd))} · ${nt}` : "Pick a new day or time"}</Btn>
                <button onClick={()=>{ cancelPT(mv.id); setClientMove(null); }} className="w-full text-sm font-bold mt-2" style={{color:T.accent}}>Cancel this session instead</button>
              </>)}
            </div>
          </div>);})()}

        {/* running-late / shift-my-day cascade */}
        {moveDay && (() => {
          const items = [
            ...sessions.filter(s=>sessTrainers(s).includes(moveDay.trainer)&&s.day===TODAY&&s.status!=="cancelled").map(s=>({id:s.id,kind:"class",time:s.time,label:CT[s.type].name+" · "+locName(s.loc)})),
            ...ptBookings.filter(b=>b.trainer===moveDay.trainer&&b.day===TODAY&&b.status!=="cancelled").map(b=>({id:b.id,kind:"pt",time:b.time,label:"PT · "+b.who})),
          ].sort((a,b)=>a.time.localeCompare(b.time));
          const delay = moveDay.delay ?? 15;
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setMoveDay(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Running late — {tName(moveDay.trainer)}</div><button onClick={()=>setMoveDay(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Push today's remaining sessions back together. Clients are notified; conflicts with other coaches' sessions are flagged.</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold">Delay everything by</span>
                {[10,15,30].map(m=>(
                  <button key={m} onClick={()=>setMoveDay(d=>({...d,delay:m}))} className="px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{background:delay===m?T.ink:"transparent",color:delay===m?T.paper:T.ink,border:`1.5px solid ${delay===m?T.ink:T.line}`}}>{m}m</button>))}
              </div>
              <div className="space-y-1.5 mb-3">
                {items.length===0 && <div className="text-sm" style={{color:T.muted}}>Nothing left to move today.</div>}
                {items.map(it=>(
                  <div key={it.id} className="flex items-center justify-between text-sm">
                    <span>{it.label}</span>
                    <span className="font-semibold">{it.time} → {fromMin(toMin(it.time)+delay)}</span>
                  </div>))}
              </div>
              <Btn full disabled={items.length===0} onClick={()=>{
                setSessions(ss=>ss.map(s=> (sessTrainers(s).includes(moveDay.trainer)&&s.day===TODAY) ? {...s,time:fromMin(toMin(s.time)+delay)} : s));
                setPtBookings(pb=>pb.map(b=> (b.trainer===moveDay.trainer&&b.day===TODAY) ? {...b,time:fromMin(toMin(b.time)+delay)} : b));
                ping(`Shifted ${items.length} session${items.length>1?"s":""} by ${delay}m — everyone notified (audited)`); setMoveDay(null);}}>
                Shift {items.length} session{items.length!==1?"s":""} by {delay}m
              </Btn>
            </div>
          </div>);})()}

        {/* Complete-session sheet — attendance only.
             The optional "incidental" that used to live here has gone. Attaching a
             cost to whichever session happened to be in front of the coach made the
             expense data meaningless: a week's petrol got booked against one Tuesday
             class. Expenses are now their own claim under Me → Expenses, with their
             own dates. */}
        {doneSheet && (() => {
          /* Group PT: attendance is captured per PERSON here (the "only Swati"
             case), while the shared pack still burns one credit. Solo PT logs a
             session-history row automatically — same as class attendance. */
          const ptb = doneSheet.kind==="pt" ? ptBookings.find(b=>b.id===doneSheet.id) : null;
          const grp = ptb ? clientGroups.find(g=>g.name===String(ptb.who||"").replace(/ \(non-client\)$/,"")) : null;
          const att = doneSheet.attended ?? (grp ? grp.memberIds : []);
          const toggleAtt = (id) => setDoneSheet(d=>({...d, attended: att.includes(id) ? att.filter(x=>x!==id) : [...att, id]}));
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setDoneSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Complete session</div>
                <button onClick={()=>setDoneSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-1" style={{color:T.muted}}>{doneSheet.label}</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>
                Marking this complete is what makes it payable — a session isn't in your
                payout until it's marked.
              </div>
              {grp && (<>
                <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>WHO TURNED UP · 1 shared credit either way</div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {grp.memberIds.map(id=>{ const on=att.includes(id); const nm=clientById(id)?.name;
                    return (
                    <button key={id} onClick={()=>toggleAtt(id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{background:on?T.moss:"transparent", color:on?"#fff":T.ink,
                        border:`1.5px solid ${on?T.moss:T.line}`}}>{on?"✓ ":""}{nm}</button>);})}
                </div>
                <input value={doneSheet.remark||""} onChange={e=>setDoneSheet(d=>({...d,remark:e.target.value}))}
                  placeholder="Remark (optional)" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3"
                  style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              </>)}
              <Btn full disabled={grp ? att.length===0 : false} onClick={()=>{
                const today = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
                if (doneSheet.kind==="pt") {
                  setPtBookings(bs=>bs.map(b=>b.id!==doneSheet.id?b:{...b,status:"done"}));
                  if (grp) logGroupSession({ group:grp, attended:att, date:ptb?.date||today,
                    time:ptb?.time||"", tookBy:ptb?.trainer||"", remark:doneSheet.remark||"" });
                  else if (ptb?.who) addSessionLog({ who:String(ptb.who).replace(/ \(non-client\)$/,""),
                    date:ptb.date||today, time:ptb.time||"", kind:"PT", tookBy:ptb.trainer||"" });
                }
                else setSessions(ss=>ss.map(s=>s.id!==doneSheet.id?s:{...s,done:true}));
                ping(grp ? `Complete — ${att.length}/${grp.memberIds.length} attended, 1 credit used` : "Session marked complete");
                setDoneSheet(null);}}>Mark complete</Btn>
              <div className="text-[11px] text-center mt-3" style={{color:T.muted}}>
                Spent money on this? Claim it under <b>Me → Expenses</b>, where it gets its
                own date and receipt.
              </div>
            </div>
          </div>);})()}


        {/* class walk-in — attendance only, no payment (cash handled outside the app) */}
        {walkSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setWalkSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add walk-in</div>
                <button onClick={()=>setWalkSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Records attendance only — no payment step. Take cash/other payment outside the app.</div>
              <input value={walkSheet.name} onChange={e=>setWalkSheet(w=>({...w,name:e.target.value}))} placeholder="Name (or 'Guest')" autoFocus
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <Btn full onClick={()=>{
                const nm=(walkSheet.name||"").trim()||"Guest";
                setSessions(ss=>ss.map(s=>s.id!==walkSheet.sid?s:{...s, attendees:[...s.attendees,{name:nm,status:"attended",walkin:true}]}));
                ping(`${nm} added as walk-in · attendance marked`); setWalkSheet(null);}}>Add & mark attended</Btn>
            </div>
          </div>)}

        {/* book a session — admin books on behalf of any coach; a trainer books their own.
            Client is picked from the registered list, or marked as a non-client (unregistered). */}
        {bookFor && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setBookFor(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <div style={{...disp,fontWeight:700,fontSize:22}}>{bookFor.self?"Book a session":"Book for a coach"}</div>
                <button onClick={()=>setBookFor(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.ink,fontWeight:600}}>{fmtFull(dateFor(bookFor.weekOff,bookFor.day))} · PT session</div>
              <div className="space-y-2.5">
                {bookFor.self ? (
                  <div><div className="text-xs font-bold mb-1" style={{color:T.muted}}>COACH</div>
                    <div className="px-3 py-2.5 rounded-lg text-sm" style={{border:`1.5px solid ${T.line}`,background:T.line}}>{tName(bookFor.trainer)} (you)</div></div>
                ) : (
                  <div><div className="text-xs font-bold mb-1" style={{color:T.muted}}>COACH</div>
                    <Select value={bookFor.trainer} onChange={v=>setBookFor(b=>({...b,trainer:v}))} options={trainers.map(t=>[t.id,t.name+(isHead(t.id)?" ★":"")])}/></div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold" style={{color:T.muted}}>CLIENT</div>
                    <button onClick={()=>setBookFor(b=>({...b, nonClient:!b.nonClient, who:""}))} className="text-xs font-bold" style={{color:T.accent}}>
                      {bookFor.nonClient?"↩ Pick registered client":"+ Non-client (not registered)"}</button>
                  </div>
                  {bookFor.nonClient ? (
                    <input value={bookFor.who||""} onChange={e=>setBookFor(b=>({...b,who:e.target.value}))} placeholder="Name (walk-in / not yet a member)" autoFocus
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.accent}`,background:T.card}}/>
                  ) : (
                    <Select value={bookFor.who||""} onChange={v=>setBookFor(b=>({...b,who:v}))} options={[["","Select a client…"],
                      ...clientGroups.map(g=>[g.name, `👥 ${g.name} (group)`]),
                      ...clients.map(c=>[c.name, c.name])]}/>
                  )}
                  {bookFor.nonClient && <div className="text-xs mt-1" style={{color:T.accent}}>Marked non-client — booked for attendance; not linked to a member account.</div>}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1"><div className="text-xs font-bold mb-1" style={{color:T.muted}}>TIME</div>
                    <input value={bookFor.time} onChange={e=>setBookFor(b=>({...b,time:e.target.value}))} placeholder="HH:MM"
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                  <div className="flex-1"><div className="text-xs font-bold mb-1" style={{color:T.muted}}>LOCATION</div>
                    <Select value={bookFor.loc} onChange={v=>setBookFor(b=>({...b,loc:v}))} options={[...locations.map(l=>[l.id,l.name]), ["other","Other (type a place)"]]}/></div>
                </div>
                {bookFor.loc==="other" && (
                  <div><input value={bookFor.otherPlace||""} onChange={e=>setBookFor(b=>({...b,otherPlace:e.target.value}))} placeholder="e.g. Poolside, East Coast Park" autoFocus
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.accent}`,background:T.card}}/>
                    <div className="text-xs mt-1" style={{color:T.muted}}>Ad-hoc spot — Danny can save it as a real location later.</div></div>)}
              </div>
              <div className="text-xs my-3" style={{color:T.muted}}>{isAdmin?"Recorded to the audit trail — who booked what, for which coach, and when.":"Added to your schedule. Payment handled at checkout / outside the app for walk-ins."}</div>
              <Btn full disabled={!(bookFor.who||"").trim() || (bookFor.loc==="other" && !(bookFor.otherPlace||"").trim())} onClick={()=>{
                const who=(bookFor.who||"").trim(); const date=fmtFull(dateFor(bookFor.weekOff,bookFor.day));
                const otherLabel = bookFor.loc==="other" ? (bookFor.otherPlace||"Other spot").trim() : null;
                const locShown = otherLabel || locName(bookFor.loc);
                setPtBookings(pb=>[...pb,{id:nid(), trainer:bookFor.trainer, day:bookFor.day, time:bookFor.time, loc:bookFor.loc, otherLabel, who:who+(bookFor.nonClient?" (non-client)":""), date, weekOff:bookFor.weekOff, byAdmin:isAdmin, nonClient:bookFor.nonClient}]);
                if (isAdmin) logAudit(`Booked PT · ${who}${bookFor.nonClient?" (non-client)":""} with ${tName(bookFor.trainer)} · ${date} ${bookFor.time} · ${locShown}`);
                if (!bookFor.nonClient && !bookFor.self) notifyClient(who,
                  `A PT session with ${tName(bookFor.trainer)} was booked for you: ${date} at ${bookFor.time} (${locShown}).`);
                ping(`Booked ${who} · ${tName(bookFor.trainer)}${isAdmin?" · audit-logged":""}`); setBookFor(null);}}>Confirm booking</Btn>
            </div>
          </div>)}

  </>);
}

