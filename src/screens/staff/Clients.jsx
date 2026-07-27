import { useState } from "react";
import { useApp } from "../../state/AppState.jsx";
import { CLIENTS } from "../../data/seed.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import { downloadCsv } from "../../lib/analytics.js";
import { T, disp } from "../../theme.js";
import { Btn, Card, H } from "../../ui/kit.jsx";

export default function StaffClients() {
  const { credits, intakeRecords, isAdmin, isClient, measurements, noShowQueue, ping,
          resolveNoShow, setActive, setIntakeForm, setMeasForm, setRoutineSheet, tName, tab, user } = useApp();
  const [openIntake, setOpenIntake] = useState(null);
  return (<>
        {/* ==================== TRAINER / ADMIN: CLIENTS ==================== */}
        {!isClient && tab==="clients" && (
          <main className="flex-1 overflow-y-auto pb-24 px-5">
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
            {["Sam Lee","Ben","Cheryl","Priya","Kumar","Elaine"].map(n=>(
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
              </Card>))}
            <div className="text-xs mt-2" style={{color:T.muted}}>
              Trainers co-author the log: log a session for a client, assign a routine (they see it in their Log), and enter stats/intake. {isAdmin?"Admin can also create / import (CSV) / deactivate clients from Manage → People.":"Payment amounts stay hidden."}
            </div>
          </main>)}

  </>);
}

