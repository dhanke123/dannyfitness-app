import { useState } from "react";
import { useApp } from "../../state/AppState.jsx";
import { CLIENTS } from "../../data/seed.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import { downloadCsv } from "../../lib/analytics.js";
import { buildIntakeCsv, buildIntakeDoc, downloadBlob, printIntakePdf, slug } from "../../lib/intake.js";
import { T, disp } from "../../theme.js";
import { Btn, Card, H, Select } from "../../ui/kit.jsx";

export default function StaffClients() {
  const { credits, intakeRecords, isAdmin, isClient, measurements, noShowQueue, ping,
          resolveNoShow, setActive, setIntakeForm, setMeasForm, setRoutineSheet, tName, tab, user,
          sessionLog, addSessionLog, groupPacks, trainers,
          clients, clientGroups, clientById, addClient, createGroup, updateGroup, deleteGroup,
          importClientsCsv, editClient, setIntakeView, locName, locations } = useApp();
  /* Records store ids for coach and venue; "danny" / "CDS" are database values.
     Every surface that shows a record resolves them to names. */
  const resolve = (kind, v) => kind === "trainer" ? tName(v) : kind === "location" ? locName(v) : v;
  const [openIntake, setOpenIntake] = useState(null);
  const [openSessions, setOpenSessions] = useState(null);   // client name whose session history is expanded
  const [backfill, setBackfill] = useState(null);           // {who, date, time, tookBy, remark}
  const [groupBuilder, setGroupBuilder] = useState(null);   // {memberIds:[], primaryId:null}
  const [groupEdit, setGroupEdit] = useState(null);         // {id, name, memberIds, primaryId, trainer}
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [newClient, setNewClient] = useState(null);         // {name, phone, email, loc}
  const [editSheet, setEditSheet] = useState(null);         // {id, name, phone, email, loc} — admin edits any client
  /* Search. Twenty seeded clients already scroll past a phone screen and the real
     roster is bigger; by a hundred, finding someone means thumbing through the lot.
     Matches name, mobile, email AND location, because "who trains at Bayshore?" is a
     question the admin asks as often as "what's Priya's number?". Digits-only on the
     phone so "9123 0001" finds a record stored as "91230001". */
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const matchesClient = (c) => {
    if (!needle) return true;
    return (c.name || "").toLowerCase().includes(needle)
      || (c.email || "").toLowerCase().includes(needle)
      || locName(c.loc || "").toLowerCase().includes(needle)
      || (!!digits && (c.phone || "").replace(/\D/g, "").includes(digits));
  };
  const shownClients = clients.filter(matchesClient);
  /* A group matches on its own name or on ANY member — searching "Wendy" should
     surface the trio she trains in, not just her personal record. */
  const shownGroups = clientGroups.filter(g => !needle
    || g.name.toLowerCase().includes(needle)
    || g.memberIds.some(id => { const c = clientById(id); return c && matchesClient(c); }));
  return (<>
        {/* ==================== TRAINER / ADMIN: CLIENTS ==================== */}
        {!isClient && tab==="clients" && (
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-5">
            <H>Clients</H>

            {/* One search box for both lists below — a person and the group they train
                in are the same lookup, and splitting it into two boxes means guessing
                which one holds the name you half-remember. */}
            <div className="relative mb-3">
              <input value={q} onChange={e=>setQ(e.target.value)}
                placeholder="Search name, mobile, email or location"
                aria-label="Search clients and groups"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
                style={{border:`1.5px solid ${T.line}`, background:T.card}}/>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{color:T.muted}} aria-hidden="true">🔍</span>
              {q && (
                <button onClick={()=>setQ("")} aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold px-1.5"
                  style={{color:T.muted}}>✕</button>)}
            </div>
            {needle && (
              <div className="text-xs mb-2" style={{color:T.muted}}>
                {shownClients.length} client{shownClients.length===1?"":"s"} · {shownGroups.length} group{shownGroups.length===1?"":"s"} matching "{q.trim()}"
              </div>)}

            {/* No-show decisions moved to Manage → Approvals → Client ops (28 Jul).
                They were here because that is where the client is, but the admin's job
                is "what needs my decision today" and that answer was spread over four
                screens. Coaches never saw this queue anyway — it was admin-only. */}

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
              {groupPacks.map(g=>{
                const grp = clientGroups.find(x=>x.id===g.groupId || x.name===g.name);
                const primary = grp ? (clientById(grp.primaryId)?.name) : null;
                return (
                <div key={g.id} className="flex items-center justify-between py-1" style={{borderBottom:`1px solid ${T.line}`}}>
                  <div>
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[11px]" style={{color:T.muted}}>{g.members.length} pax{primary?` · ★ ${primary} pays`:""} · Coach {tName(g.trainer)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{color: g.size-g.used<=2 ? T.accent : T.ink}}>{g.size-g.used} left</div>
                    <div className="text-[10px]" style={{color:T.muted}}>{g.used}/{g.size} used</div>
                  </div>
                </div>);})}
              <div className="text-[11px] mt-1.5" style={{color:T.muted}}>
                Each joint session deducts 1 from the shared pack. Session logs below auto-deduct.
              </div>
            </Card>

            {/* ---- GROUPS ----
                 Groups could be created and then never touched: no list, no rename, no
                 way to add the third person who joined, no way to move PRIMARY when the
                 person paying changes. The only workaround was a second group, which
                 splits the shared pack and the payment history down the middle. */}
            <Card className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold" style={{color:T.blue}}>GROUPS · {clientGroups.length}</div>
                <Btn small kind="ghost" onClick={()=>setGroupBuilder({memberIds:[], primaryId:null})}>+ Group</Btn>
              </div>
              {clientGroups.length === 0 && (
                <div className="text-xs" style={{color:T.muted}}>
                  No groups yet. A group links 2 or more clients so they share one pack and one payment —
                  each of them still logs in as themselves.
                </div>)}
              {clientGroups.length > 0 && shownGroups.length === 0 && (
                <div className="text-xs" style={{color:T.muted}}>No group matches "{q.trim()}".</div>)}
              {shownGroups.map(g=>{
                const pack = groupPacks.find(p=>p.groupId===g.id || p.name===g.name);
                const left = pack ? pack.size - pack.used : null;
                return (
                <button key={g.id} onClick={()=>setGroupEdit({
                    id:g.id, name:g.name, memberIds:[...g.memberIds], primaryId:g.primaryId, trainer:g.trainer })}
                  className="w-full text-left flex items-center gap-2 py-1.5"
                  style={{borderTop:`1px solid ${T.line}`}}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{g.name}</div>
                    <div className="text-[11px] truncate" style={{color:T.muted}}>
                      {g.memberIds.map(id=>clientById(id)?.name).filter(Boolean).join(", ")}
                      {" · ★ "}{clientById(g.primaryId)?.name || "no primary"} pays · Coach {tName(g.trainer)}
                    </div>
                  </div>
                  {left != null && (
                    <span className="text-[11px] font-bold whitespace-nowrap"
                      style={{color: left<=2 ? T.accent : T.muted}}>{left} left</span>)}
                  <span className="text-xs font-bold" style={{color:T.blue}}>Edit ›</span>
                </button>);})}
            </Card>

            {/* header actions: the registry is the source of truth now */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold" style={{color:T.muted}}>
                CLIENTS · {needle ? `${shownClients.length} of ${clients.length}` : `${clients.length} people`} · {clientGroups.length} groups</div>
              <div className="flex gap-1.5">
                <Btn small kind="ghost" onClick={()=>setNewClient({name:"", phone:"", email:"", loc:""})}>+ Client</Btn>
                <Btn small kind="ghost" onClick={()=>setGroupBuilder({memberIds:[], primaryId:null})}>+ Group</Btn>
                {isAdmin && <Btn small kind="ghost" onClick={()=>setImportOpen(true)}>Import ⇪</Btn>}
              </div>
            </div>

            {needle && shownClients.length === 0 && (
              <Card className="mb-2"><div className="text-sm" style={{color:T.muted}}>
                No client matches "{q.trim()}". Search covers name, mobile, email and location.
              </div></Card>)}

            {shownClients.map(c=>c.name).map(n=>(
              <Card key={n} className="mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{background:T.line}}>{n[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{n}</div>
                    <div className="text-xs" style={{color:T.muted}}>{n==="Sam Lee"?`${credits.classes} class + ${credits.ptHead+credits.ptCoach} PT credits`:"Active member"}</div>
                    {/* Mobile, email and location together — the three things anyone needs
                        to place a person and get hold of them. Location was missing, and it
                        is what tells a coach which of eight venues to expect them at. */}
                    {(()=>{ const c = clients.find(x=>x.name===n); if (!c) return null;
                      const bits = [c.phone, c.email, c.loc && `📍 ${locName(c.loc)}`].filter(Boolean);
                      return bits.length ? (
                        <div className="text-[11px] truncate" style={{color:T.deep}}>{bits.join(" · ")}</div>) : null; })()}
                  </div>
                  <div className="flex gap-1.5">
                    <Btn small kind="ghost" onClick={()=>setMeasForm({who:n, weight:"", fat:""})}>+ Stats</Btn>
                    <Btn small kind="ghost" onClick={()=>setIntakeForm({who:n})}>+ Intake</Btn>
                    {isAdmin && (()=>{ const c = clients.find(x=>x.name===n);
                      return c ? <Btn small kind="ghost" onClick={()=>setEditSheet({id:c.id, name:c.name, phone:c.phone||"", email:c.email||"", loc:c.loc||""})}>Edit</Btn> : null; })()}
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
                          <div className="flex gap-1.5">
                            {/* Word = the paper form, for a handover or the client's file.
                                Excel = one row per dated assessment, for the trend. Two
                                different questions, so two buttons rather than one
                                "Export" that answers neither well. */}
                            <button onClick={()=>{
                                const r0 = recs[0];
                                const ok = printIntakePdf(r0, { client:n, coachName:tName(r0.by), resolve });
                                ping(ok ? "Opened for printing — choose Save as PDF"
                                        : "Your browser blocked the print window. Allow pop-ups and try again.");
                              }}
                              className="text-xs font-bold px-2 py-1 rounded-lg"
                              style={{border:`1.5px solid ${T.line}`, color:T.ink}}>📕 PDF</button>
                            <button onClick={()=>{
                                const r0 = recs[0];
                                downloadBlob(`intake-${slug(n)}-${slug(r0.d)}.doc`,
                                  buildIntakeDoc(r0, { client:n, coachName:tName(r0.by), resolve }),
                                  "application/msword");
                                ping(`${n}'s latest assessment as a Word document`);
                              }}
                              className="text-xs font-bold px-2 py-1 rounded-lg"
                              style={{border:`1.5px solid ${T.line}`, color:T.ink}}>📄 Word</button>
                            <button onClick={()=>{
                                downloadBlob(`intake-${slug(n)}-all-assessments.csv`,
                                  buildIntakeCsv(recs, { resolve }), "text/csv;charset=utf-8");
                                ping(`${recs.length} assessment${recs.length===1?"":"s"} for ${n} — oldest first, ready to chart`);
                              }}
                              className="text-xs font-bold px-2 py-1 rounded-lg"
                              style={{border:`1.5px solid ${T.line}`, color:T.ink}}>📊 Excel</button>
                          </div>)}
                      </div>

                      {open && (
                        <div className="mt-2 space-y-2">
                          {/* A summary, not the record. Tapping opens the full form back —
                              the body-composition panel, the 22-exercise assessment and the
                              ratings all went in and previously had no way out. */}
                          {recs.map((r, i) => {
                            const prev = recs[i+1];   // recs are newest-first
                            const delta = (k, unit, lowerIsBetter) => {
                              const a = parseFloat(r[k]), b = prev && parseFloat(prev[k]);
                              if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
                              const d = Math.round((a - b) * 10) / 10;
                              const good = lowerIsBetter ? d < 0 : d > 0;
                              return <span key={k} style={{color: good ? T.moss : T.orange}}>
                                {" "}{d > 0 ? "▲" : "▼"}{Math.abs(d)}{unit}</span>;
                            };
                            return (
                            <button key={r.id} onClick={()=>setIntakeView({id:r.id})}
                              className="w-full text-left rounded-lg p-2 text-xs" style={{background:"#FBF3EC"}}>
                              <div className="flex justify-between">
                                <span style={{...disp, fontWeight:700}}>{r.d}{i===0 && recs.length>1 ? " · latest" : ""}</span>
                                <span style={{color:T.muted}}>by {tName(r.by)} ›</span>
                              </div>
                              {(r.weight || r.bodyFat || r.bmi) && (
                                <div className="mt-1">
                                  <b>Body:</b> {[r.weight&&`${r.weight}kg`, r.bodyFat&&`${r.bodyFat}% fat`, r.bmi&&`BMI ${r.bmi}`].filter(Boolean).join(" · ")}
                                  {/* movement since the previous assessment — the only
                                      number a coach actually reads a re-assessment for */}
                                  {prev && <>{delta("weight","kg",true)}{delta("bodyFat","%",true)}</>}
                                </div>)}
                              {r.goals    && <div className="mt-0.5 truncate"><b>Goals:</b> {r.goals}</div>}
                              {r.injuries && <div className="truncate"><b>Injuries:</b> <span style={{color:T.accent}}>{r.injuries}</span></div>}
                              {(r.medication || r.allergies) && (
                                <div className="truncate" style={{color:T.accent}}>
                                  {[r.medication&&`Medication: ${r.medication}`, r.allergies&&`Allergies: ${r.allergies}`].filter(Boolean).join(" · ")}
                                </div>)}
                              <div className="mt-1 font-bold" style={{color:T.blue}}>Open full form →</div>
                            </button>);})}
                          {stats.length > 0 && (
                            <div className="text-xs" style={{color:T.muted}}>
                              Body stats on file: {stats.map(m=>`${m.d} — ${m.weight}kg${m.fat?` / ${m.fat}%`:""}`).join(" · ")}
                            </div>)}
                          <div className="text-[11px]" style={{color:T.deep}}>
                            Records are never overwritten — open one and tap <b>Re-assess</b> to record a
                            change. Excel gives one row per assessment, oldest first, so you can chart
                            weight, body fat and the assessment scores over time.
                          </div>
                        </div>)}
                    </div>);
                })()}

                {/* ---- Session history — replaces the per-client Google Sheet tab.
                     Auto-fills when attendance is marked; staff can backfill past
                     sessions (client-side past booking stays blocked). ---- */}
                {(() => {
                  /* A group member's joint sessions are logged against the GROUP name
                     ("Swati & Supriya"), which is how the paper sheet keeps them — one tab
                     per pair. Filtering on the person's own name alone left Swati's card
                     empty while six of her sessions sat one row away. Her history is her own
                     sessions plus the ones her group ran. */
                  const myGroups = clientGroups.filter(g =>
                    g.memberIds.some(id => clientById(id)?.name === n)).map(g => g.name);
                  const logs = sessionLog.filter(l => l.who === n || myGroups.includes(l.who));
                  const open = openSessions === n;
                  const pack = groupPacks.find(g => g.name === n)
                    || groupPacks.find(g => myGroups.includes(g.name));
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

            {/* ---- new client ---- */}
            {newClient && (
              <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setNewClient(null)}>
                <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div style={{...disp,fontWeight:700,fontSize:20}}>New client</div>
                    <button onClick={()=>setNewClient(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
                  </div>
                  <div className="text-xs mb-3" style={{color:T.muted}}>One record per person. Their mobile becomes their login.</div>
                  <div className="space-y-2 mb-3">
                    <input value={newClient.name} onChange={e=>setNewClient(x=>({...x,name:e.target.value}))} placeholder="Full name"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    <input value={newClient.phone} onChange={e=>setNewClient(x=>({...x,phone:e.target.value}))} placeholder="Mobile (their login)" inputMode="tel"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    <input value={newClient.email} onChange={e=>setNewClient(x=>({...x,email:e.target.value}))} placeholder="Email (optional)"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    {/* Which venue they train at — asked as often as the phone number,
                        because Danny runs out of eight outdoor locations. */}
                    <Select value={newClient.loc||""} onChange={v=>setNewClient(x=>({...x,loc:v}))}
                      options={[["","Usual location (optional)"],...locations.map(l=>[l.id,l.name])]} style={{width:"100%"}}/>
                  </div>
                  <Btn full disabled={!newClient.name.trim()} onClick={()=>{
                    addClient({ name:newClient.name.trim(), phone:newClient.phone.replace(/\D/g,""), email:newClient.email.trim(), loc:newClient.loc||"" });
                    ping(`${newClient.name.trim()} added`); setNewClient(null);}}>Add client</Btn>
                </div>
              </div>)}

            {/* ---- admin: edit client details ---- */}
            {editSheet && (
              <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setEditSheet(null)}>
                <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div style={{...disp,fontWeight:700,fontSize:20}}>Edit client</div>
                    <button onClick={()=>setEditSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
                  </div>
                  <div className="text-xs mb-3" style={{color:T.muted}}>
                    The mobile number doubles as their login and WhatsApp. Changing it here changes
                    how they sign in once Supabase auth is live.
                  </div>
                  <div className="space-y-2 mb-3">
                    <div><div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>FULL NAME</div>
                      <input value={editSheet.name} onChange={e=>setEditSheet(x=>({...x,name:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                    <div><div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>MOBILE · LOGIN &amp; WHATSAPP</div>
                      <input value={editSheet.phone} onChange={e=>setEditSheet(x=>({...x,phone:e.target.value}))} inputMode="tel"
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                    <div><div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>EMAIL</div>
                      <input value={editSheet.email} onChange={e=>setEditSheet(x=>({...x,email:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/></div>
                    <div><div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>USUAL LOCATION</div>
                      <Select value={editSheet.loc||""} onChange={v=>setEditSheet(x=>({...x,loc:v}))}
                        options={[["","Not set"],...locations.map(l=>[l.id,l.name])]} style={{width:"100%"}}/></div>
                  </div>
                  <Btn full disabled={!editSheet.name.trim()} onClick={()=>{
                    editClient(editSheet.id, { name:editSheet.name.trim(), phone:editSheet.phone.replace(/\D/g,""), email:editSheet.email.trim(), loc:editSheet.loc||"" });
                    setEditSheet(null);}}>Save changes</Btn>
                </div>
              </div>)}

            {/* ---- edit an existing group ----
                 Two invariants the schema enforces and this must not break: at least 2
                 members, and exactly one primary. Both are guarded in updateGroup as well
                 as here — validating only in the UI is validating nowhere. ---- */}
            {groupEdit && (() => {
              const pack = groupPacks.find(p=>p.groupId===groupEdit.id || p.name===clientGroups.find(g=>g.id===groupEdit.id)?.name);
              const left = pack ? pack.size - pack.used : 0;
              const inThisGroup = (cid) => groupEdit.memberIds.includes(cid);
              /* Selectable = this group's members plus anyone not already in another
                 group. A person in two groups has two shared packs and no answer to
                 "which one does this session come out of". */
              const pickable = clients.filter(c => inThisGroup(c.id)
                || !clientGroups.some(g => g.id !== groupEdit.id && g.memberIds.includes(c.id)));
              const autoName = groupEdit.memberIds.map(id=>clientById(id)?.name).filter(Boolean).join(" & ");
              return (
              <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>{setGroupEdit(null); setConfirmDelete(false);}}>
                <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90dvh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div style={{...disp,fontWeight:700,fontSize:20}}>Edit group</div>
                    <button onClick={()=>{setGroupEdit(null); setConfirmDelete(false);}} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
                  </div>
                  <div className="text-xs mb-3" style={{color:T.muted}}>
                    Everyone in the group is told when it changes. The shared pack follows the
                    group, so a rename carries over to it.
                  </div>

                  <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>GROUP NAME</div>
                  <input value={groupEdit.name} onChange={e=>setGroupEdit(x=>({...x,name:e.target.value}))}
                    placeholder={autoName || "Group name"}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-1"
                    style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  {groupEdit.name.trim() !== autoName && autoName && (
                    <button onClick={()=>setGroupEdit(x=>({...x,name:autoName}))}
                      className="text-[11px] font-bold mb-2" style={{color:T.blue}}>
                      Use "{autoName}"</button>)}

                  <div className="text-[10px] font-bold mt-2 mb-1" style={{color:T.muted}}>
                    MEMBERS · tap to add or remove · ★ sets who pays</div>
                  <div className="space-y-1 mb-3 max-h-56 overflow-y-auto">
                    {pickable.map(c=>{
                      const on = inThisGroup(c.id);
                      const isPrimary = groupEdit.primaryId === c.id;
                      return (
                      <div key={c.id} className="flex items-center gap-2">
                        <button onClick={()=>setGroupEdit(b=>{
                            const next = on ? b.memberIds.filter(x=>x!==c.id) : [...b.memberIds, c.id];
                            /* Removing the primary must promote someone, not leave the
                               group with nobody to bill. */
                            const primaryId = next.includes(b.primaryId) ? b.primaryId : (next[0] || null);
                            return {...b, memberIds:next, primaryId};
                          })}
                          className="flex-1 text-left px-3 py-2 rounded-lg text-sm font-semibold"
                          style={{background:on?T.ink:T.card, color:on?T.paper:T.ink, border:`1.5px solid ${on?T.ink:T.line}`}}>
                          {c.name}{isPrimary?" ★":""}
                        </button>
                        {on && !isPrimary && (
                          <button onClick={()=>setGroupEdit(b=>({...b, primaryId:c.id}))}
                            className="text-xs font-bold px-2 py-2" style={{color:T.muted}}>★</button>)}
                      </div>);})}
                  </div>

                  <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>COACH</div>
                  <Select value={groupEdit.trainer || "danny"} onChange={v=>setGroupEdit(x=>({...x,trainer:v}))}
                    options={trainers.filter(t=>t.active!==false).map(t=>[t.id,t.name])} style={{width:"100%", marginBottom:12}}/>

                  {groupEdit.memberIds.length < 2 && (
                    <div className="text-xs mb-2 font-semibold" style={{color:T.accent}}>
                      A group needs at least 2 people.</div>)}

                  <Btn full disabled={groupEdit.memberIds.length < 2} onClick={()=>{
                    if (updateGroup(groupEdit.id, { name:groupEdit.name, memberIds:groupEdit.memberIds,
                        primaryId:groupEdit.primaryId, trainer:groupEdit.trainer })) {
                      setGroupEdit(null); setConfirmDelete(false); }
                  }}>Save group</Btn>

                  {/* Removing is unlinking, not deleting people — and it is refused while
                      the shared pack still holds unused sessions, because those are money
                      already taken and would be left with no owner. */}
                  <div className="mt-3 pt-3" style={{borderTop:`1px solid ${T.line}`}}>
                    {left > 0 ? (
                      <div className="text-[11px]" style={{color:T.muted}}>
                        This group can't be removed yet — the shared pack still has <b>{left} unused
                        session{left===1?"":"s"}</b>. Use them or refund them first.
                      </div>
                    ) : !confirmDelete ? (
                      <button onClick={()=>setConfirmDelete(true)} className="text-xs font-bold"
                        style={{color:T.accent}}>Remove this group</button>
                    ) : (
                      <div>
                        <div className="text-[11px] mb-1.5" style={{color:T.deep}}>
                          Unlinks {groupEdit.memberIds.length} people. They stay as individual clients
                          with their own history — only the group and its empty shared pack go.
                        </div>
                        <div className="flex gap-2">
                          <Btn small kind="ghost" full onClick={()=>setConfirmDelete(false)}>Keep it</Btn>
                          <Btn small kind="dark" full onClick={()=>{
                            if (deleteGroup(groupEdit.id)) { setGroupEdit(null); setConfirmDelete(false); }
                          }}>Remove group</Btn>
                        </div>
                      </div>)}
                  </div>
                </div>
              </div>);})()}

            {/* ---- group builder: pick 2-3 people, star the primary ---- */}
            {groupBuilder && (
              <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setGroupBuilder(null)}>
                <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85dvh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div style={{...disp,fontWeight:700,fontSize:20}}>New group</div>
                    <button onClick={()=>setGroupBuilder(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
                  </div>
                  <div className="text-xs mb-3" style={{color:T.muted}}>
                    Pick 2 or more clients who train together. Tap ★ to set the primary — they
                    pay, own the shared pack and get the billing messages.
                  </div>
                  <div className="space-y-1 mb-3">
                    {clients.filter(c=>!clientGroups.some(g=>g.memberIds.includes(c.id))).map(c=>{
                      const on = groupBuilder.memberIds.includes(c.id);
                      const isPrimary = groupBuilder.primaryId === c.id;
                      return (
                      <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                        style={{background:on?"#EFF3EE":"transparent", border:`1.5px solid ${on?T.moss:T.line}`}}>
                        <button onClick={()=>setGroupBuilder(b=>({...b,
                          memberIds: on ? b.memberIds.filter(x=>x!==c.id) : [...b.memberIds,c.id],
                          primaryId: on && b.primaryId===c.id ? null : b.primaryId}))}
                          className="flex-1 text-left text-sm font-semibold">{on?"✓ ":""}{c.name}</button>
                        {on && <button onClick={()=>setGroupBuilder(b=>({...b, primaryId:c.id}))}
                          className="text-lg leading-none" style={{opacity:isPrimary?1:.25}}>★</button>}
                      </div>);})}
                  </div>
                  <Btn full disabled={groupBuilder.memberIds.length<2} onClick={()=>{
                    const g = createGroup({ memberIds:groupBuilder.memberIds, primaryId:groupBuilder.primaryId });
                    ping(`Group "${g.name}" created — sell them a combo pack from Shop`);
                    setGroupBuilder(null);}}>
                    {groupBuilder.memberIds.length<2 ? "Pick at least 2 clients" : "Create group"}</Btn>
                </div>
              </div>)}

            {/* ---- CSV import: clients + groups + pack balances in one paste ---- */}
            {importOpen && (
              <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setImportOpen(false)}>
                <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <div style={{...disp,fontWeight:700,fontSize:20}}>Import clients</div>
                    <button onClick={()=>setImportOpen(false)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
                  </div>
                  <div className="text-xs mb-2" style={{color:T.muted}}>
                    Export your Google Sheet as CSV — one row per person — and paste it here.
                    Groups form automatically from matching group_name; the shared pack opens
                    with sessions_remaining.
                  </div>
                  <div className="text-[10px] rounded-lg p-2 mb-2 font-mono" style={{background:"#F4F1EA", color:T.muted}}>
                    name,phone,email,location,group_name,is_primary,sessions_remaining<br/>
                    Swati,9123...,s@x.com,Swati &amp; Supriya,1,4<br/>
                    Supriya,9124...,,Swati &amp; Supriya,,4
                  </div>
                  <textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={6}
                    placeholder="Paste CSV here…" className="w-full px-3 py-2.5 rounded-lg text-xs outline-none font-mono mb-3"
                    style={{border:`1.5px solid ${T.line}`,background:T.card,resize:"none"}}/>
                  <Btn full disabled={!importText.trim()} onClick={()=>{
                    importClientsCsv(importText); setImportText(""); setImportOpen(false);}}>Import</Btn>
                </div>
              </div>)}
            <div className="text-xs mt-2" style={{color:T.muted}}>
              Trainers co-author the log: log a session for a client, assign a routine (they see it in their Log), and enter stats/intake. {isAdmin?"Admin can also create / import (CSV) / deactivate clients from Manage → People.":"Payment amounts stay hidden."}
            </div>
          </main>)}

  </>);
}

