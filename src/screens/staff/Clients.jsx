import { useState } from "react";
import { useApp } from "../../state/AppState.jsx";
import { CLIENTS } from "../../data/seed.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import { downloadCsv } from "../../lib/analytics.js";
import { T, disp } from "../../theme.js";
import { Btn, Card, H } from "../../ui/kit.jsx";

export default function StaffClients() {
  const { credits, intakeRecords, isAdmin, isClient, measurements, noShowQueue, ping,
          resolveNoShow, setActive, setIntakeForm, setMeasForm, setRoutineSheet, tName, tab, user,
          sessionLog, addSessionLog, groupPacks, trainers } = useApp();
  const [openIntake, setOpenIntake] = useState(null);
  const [openSessions, setOpenSessions] = useState(null);   // client name whose session history is expanded
  const [backfill, setBackfill] = useState(null);           // {who, date, time, tookBy, remark}
  return (<>
        {/* ==================== TRAINER / ADMIN: CLIENTS ==================== */}
        {!isClient && tab==="clients" && (
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-5">
            <H>Clients</H>

            {/* ---- Queue 2 of 4: NO-SHOWS (Decisions 5, 6, 7) ----
                 Class no-shows get the same treatment as PT: the coach marks absent, nothing
                 auto-deducts, the admin decides. "Apply" is the approval (forfeit the credit),
                 "Waive" is the denial — both capture a reason and are audit-logged. */}
            {isAdmin && noShowQueue.length>0 && (
              <div className="mb-4">
                <ApprovalQueue
                  label="NO-SHOW DECISIONS · nothing is deducted until you decide"
                  items={noShowQueue.map(nq=>({ id:nq.id, title:nq.who, sub:`${nq.session} · Policy: ${nq.policy}` }))}
                  onResolve={(id, approved, reason)=>resolveNoShow(id, approved, reason)}
                  approveLabel="Apply forfeit" denyLabel="Waive" />
              </div>)}

            {/* PR feed — a low-effort reason to congratulate clients (retention driver) */}
            <Card className="mb-3" style={{background:"#FBF3EC"}}>
              <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>RECENT CLIENT PRs 🏆</div>
              <div className="space-y-0.5">
                <div className="text-sm">Sam Lee — <b>Back Squat 85kg</b> <span className="text-xs" style={{color:T.muted}}>· today</span></div>
                <div className="text-sm">Ben — <b>Deadlift 140kg</b> <span className="text-xs" style={{color:T.muted}}>· yesterday</span></div>
                <div className="text-sm">Priya — <b>Bench Press 47.5kg</b> <span className="text-xs" style={{color:T.muted}}>· 2d ago</span></div>
              </div>
            </Card>
            {/* ---- Shared combo packs (2-3 pax train together, one pack) ---- */}
            <Card className="mb-3" style={{background:"#EFF3EE"}}>
              <div className="text-xs font-bold mb-1.5" style={{color:T.moss}}>PT COMBO PACKS · shared credits</div>
              {groupPacks.map(g=>(
                <div key={g.id} className="flex items-center justify-between py-1" style={{borderBottom:`1px solid ${T.line}`}}>
                  <div>
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[11px]" style={{color:T.muted}}>{g.members.length} pax · Coach {tName(g.trainer)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{color: g.size-g.used<=2 ? T.accent : T.ink}}>{g.size-g.used} left</div>
                    <div className="text-[10px]" style={{color:T.muted}}>{g.used}/{g.size} used</div>
                  </div>
                </div>))}
              <div className="text-[11px] mt-1.5" style={{color:T.muted}}>
                Each joint session deducts 1 from the shared pack. Session logs below auto-deduct.
              </div>
            </Card>

            {["Sam Lee","Ben","Cheryl","Priya","Kumar","Elaine","Swati & Supriya","Shreyans & Pooja","Mable & Wendy & Helen"].map(n=>(
              <Card key={n} className="mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{background:T.line}}>{n[0]}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{n}</div>
                    <div className="text-xs" style={{color:T.muted}}>{n==="Sam Lee"?`${credits.classes} class + ${credits.ptHead+credits.ptCoach} PT credits`:"Active member"}</div></div>
                  <div className="flex gap-1.5">
                    <Btn small kind="ghost" onClick={()=>setMeasForm({who:n, weight:"", fat:""})}>+ Stats</Btn>
                    <Btn small kind="ghost" onClick={()=>setIntakeForm({who:n})}>+ Intake</Btn>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <Btn small kind="ghost" onClick={()=>{setActive({title:`${n} — coach-logged`, forClient:n, exercises:[]}); ping(`Logging a session for ${n}`);}}>Log workout</Btn>
                  <Btn small kind="ghost" onClick={()=>setRoutineSheet({name:"", items:[], owner:user.id, assignedTo:n})}>Assign routine</Btn>
                </div>

                {/* Intake history, in the same place as the client — not behind a
                    separate menu. This is the record a coach needs when a client is
                    handed over: goals, injuries, what's already been tried. It used
                    to be write-only; the form saved nothing. */}
                {(() => {
                  const recs = intakeRecords.filter(r => r.who === n);
                  const stats = measurements.filter(m => m.who === n);
                  const open = openIntake === n;
                  return (
                    <div className="mt-2 pt-2" style={{borderTop:`1px solid ${T.line}`}}>
                      <div className="flex items-center justify-between">
                        <button onClick={()=>setOpenIntake(open ? null : n)} className="text-xs font-bold" style={{color: recs.length ? T.blue : T.muted}}>
                          {recs.length
                            ? `Intake records (${recs.length}) ${open ? "▴" : "▾"}`
                            : "No intake on file yet"}
                        </button>
                        {recs.length > 0 && (
                          <button
                            onClick={()=>{
                              downloadCsv(`intake-${n.toLowerCase().replace(/\W+/g,"-")}.csv`,
                                recs.map(r => ({ client:r.who, date:r.d, coach:tName(r.by),
                                                 goals:r.goals, injuries:r.injuries, notes:r.notes })));
                              ping(`${n}'s intake history exported — hand this to the new coach`);
                            }}
                            className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{border:`1.5px solid ${T.line}`, color:T.ink}}>Export ↓</button>)}
                      </div>

                      {open && (
                        <div className="mt-2 space-y-2">
                          {recs.map(r => (
                            <div key={r.id} className="rounded-lg p-2 text-xs" style={{background:"#FBF3EC"}}>
                              <div className="flex justify-between">
                                <span style={{...disp, fontWeight:700}}>{r.d}</span>
                                <span style={{color:T.muted}}>by {tName(r.by)}</span>
                              </div>
                              {r.goals    && <div className="mt-1"><b>Goals:</b> {r.goals}</div>}
                              {r.injuries && <div><b>Injuries:</b> <span style={{color:T.accent}}>{r.injuries}</span></div>}
                              {(r.weight || r.bodyFat) && <div><b>Body:</b> {[r.weight&&`${r.weight}kg`, r.bodyFat&&`${r.bodyFat}% fat`, r.bmi&&`BMI ${r.bmi}`].filter(Boolean).join(" · ")}</div>}
                              {r.medication && <div><b>Medication:</b> {r.medication}</div>}
                              {r.allergies && <div><b>Allergies:</b> {r.allergies}</div>}
                              {r.trainingPlan && <div><b>Plan:</b> {r.trainingPlan}</div>}
                              {r.preferredTimes && <div style={{color:T.muted}}>Prefers: {r.preferredTimes}{r.frequency?` · ${r.frequency}`:""}</div>}
                              {r.notes    && <div style={{color:T.muted}}>{r.notes}</div>}
                            </div>))}
                          {stats.length > 0 && (
                            <div className="text-xs" style={{color:T.muted}}>
                              Body stats on file: {stats.map(m=>`${m.d} — ${m.weight}kg${m.fat?` / ${m.fat}%`:""}`).join(" · ")}
                            </div>)}
                          <div className="text-[11px]" style={{color:T.muted}}>
                            Oldest to newest shows how the picture has changed. Export before a handover
                            so the next coach starts with the history, not a blank page.
                          </div>
                        </div>)}
                    </div>);
                })()}

                {/* ---- Session history — replaces the per-client Google Sheet tab.
                     Auto-fills when attendance is marked; staff can backfill past
                     sessions (client-side past booking stays blocked). ---- */}
                {(() => {
                  const logs = sessionLog.filter(l => l.who === n);
                  const open = openSessions === n;
                  const pack = groupPacks.find(g => g.name === n);
                  return (
                    <div className="mt-2 pt-2" style={{borderTop:`1px solid ${T.line}`}}>
                      <div className="flex items-center justify-between">
                        <button onClick={()=>setOpenSessions(open ? null : n)} className="text-xs font-bold"
                          style={{color: logs.length ? T.moss : T.muted}}>
                          Session history ({logs.length}) {open ? "▴" : "▾"}
                          {pack && <span style={{color:T.muted, fontWeight:400}}> · {pack.size-pack.used} of {pack.size} left</span>}
                        </button>
                        <button onClick={()=>setBackfill({who:n, date:"", time:"", tookBy:user.id, remark:""})}
                          className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`, color:T.ink}}>
                          + Add session</button>
                      </div>
                      {open && logs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {logs.map(l => (
                            <div key={l.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs" style={{background:"#F4F7F3"}}>
                              <span className="font-bold" style={{...disp, minWidth:74}}>{l.date}</span>
                              <span style={{color:T.muted, minWidth:52}}>{l.time}</span>
                              <span className="flex-1">{l.kind}</span>
                              <span style={{color:T.moss, fontWeight:700}}>{tName(l.tookBy) || l.tookBy}</span>
                              {l.remark && <span style={{color:T.accent}}>· {l.remark}</span>}
                            </div>))}
                          {logs.length > 0 && (
                            <button onClick={()=>{
                              downloadCsv(`sessions-${n.toLowerCase().replace(/\W+/g,"-")}.csv`,
                                logs.map(l => ({ client:l.who, date:l.date, time:l.time, type:l.kind,
                                                 trained_by:tName(l.tookBy)||l.tookBy, remark:l.remark||"" })));
                              ping(`${n}'s session history exported`);
                            }} className="text-[11px] font-bold" style={{color:T.blue}}>Export CSV ↓</button>)}
                        </div>)}
                      {open && logs.length === 0 && (
                        <div className="text-[11px] mt-1" style={{color:T.muted}}>
                          No sessions logged yet — marking attendance logs one automatically.</div>)}
                    </div>);
                })()}
              </Card>))}

            {/* ---- staff backfill: add a past session to a client's log ---- */}
            {backfill && (
              <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}}
                onClick={()=>setBackfill(null)}>
                <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div style={{...disp,fontWeight:700,fontSize:20}}>Log session · {backfill.who}</div>
                    <button onClick={()=>setBackfill(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
                      style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
                  </div>
                  <div className="text-xs mb-3" style={{color:T.muted}}>
                    Staff can record past sessions — use this to migrate the Google Sheet history.
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input value={backfill.date} onChange={e=>setBackfill(b=>({...b,date:e.target.value}))}
                      placeholder="Date (e.g. Wed, Jul 1)" className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    <input value={backfill.time} onChange={e=>setBackfill(b=>({...b,time:e.target.value}))}
                      placeholder="Time" className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{width:90,border:`1.5px solid ${T.line}`,background:T.card}}/>
                  </div>
                  <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>WHO TOOK THE SESSION</div>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {trainers.map(t=>(
                      <button key={t.id} onClick={()=>setBackfill(b=>({...b,tookBy:t.id}))}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                        style={{background:backfill.tookBy===t.id?T.ink:"transparent", color:backfill.tookBy===t.id?T.paper:T.ink,
                          border:`1.5px solid ${backfill.tookBy===t.id?T.ink:T.line}`}}>{t.name}</button>))}
                  </div>
                  <input value={backfill.remark} onChange={e=>setBackfill(b=>({...b,remark:e.target.value}))}
                    placeholder="Remark (e.g. only Swati, took until 12:20)" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3"
                    style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <Btn full disabled={!backfill.date.trim()} onClick={()=>{
                    addSessionLog({ who:backfill.who, date:backfill.date.trim(), time:backfill.time.trim()||"—",
                      kind:"PT", tookBy:backfill.tookBy, remark:backfill.remark.trim() });
                    ping(`Session logged for ${backfill.who}`); setBackfill(null);}}>Save session</Btn>
                </div>
              </div>)}
            <div className="text-xs mt-2" style={{color:T.muted}}>
              Trainers co-author the log: log a session for a client, assign a routine (they see it in their Log), and enter stats/intake. {isAdmin?"Admin can also create / import (CSV) / deactivate clients from Manage → People.":"Payment amounts stay hidden."}
            </div>
          </main>)}

  </>);
}

