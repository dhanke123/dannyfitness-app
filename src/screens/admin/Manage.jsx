import { useApp } from "../../state/AppState.jsx";
import { COUPONS, CT, TRAINERS } from "../../data/seed.js";
import { DEFAULT_TRAVEL, PT_DUR, travelKey } from "../../lib/scheduling.js";
import { DAYS } from "../../lib/dates.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import CampsSection from "./Camps.jsx";
import { nid } from "../../lib/util.js";
import { T, disp } from "../../theme.js";
import { Btn, Card, Chip, Pill } from "../../ui/kit.jsx";
import { STATUS, approvedTotal } from "../../lib/expenses.js";
import MenuManagement, { buildDefault } from "./MenuManagement.jsx";
import PaymentsReport from "../../components/PaymentsReport.jsx";
import { fmtISO } from "../../lib/period.js";

export default function AdminManage() {
  const { openClassBuilder, restoreSession, applyTemplate, copyText, deactivateTrainer, reactivateTrainer, deletionRequests, resolveDeletion, setProductForm, setRefundQueue, aboutCopy, active, addLocation, adminSec, booked, classTemplates, coupon, coupons, closedLeads, exceptionQueue, expenseClaims, pendingClaims, approvedUnpaid, setClaimReview, isAdmin, leads, ledger, openLeads, setLeadStatus, locName, locations, login, newLocName, noShowQueue, offers, pendingCounts, perm, permOpen, ping, policy, products, promoteSuggested, ptBookings, rates, refundQueue, resolveNoShow, resolveRefund, revenue, sessions, setAboutEdit, setAddLead, setAddTrainer, setAdminSec, setClassTemplates, setCouponForm, setCoupons, setLeads, setLedger, setNewLocName, setOfferSheet, setOffers, setPerm, setPermOpen, setPolicy, setProducts, setTemplateBuilder, setTravel, staffSessions, suggestedLocs, tName, tab, trainers, travel, adminInboxOpen, setAdminInboxOpen, chatThreads, menuConfig, setMenuConfig, gymHoursStart, gymHoursEnd, setGymHoursStart, setGymHoursEnd, paymentQueue, resolvePayment, paynowConfig, setPaynowConfig,
          pendingClients, confirmPendingClient, undeliveredInvites, retryInvite, invites, createCoach,
          approvalsView, setApprovalsView, setTab } = useApp();
  return (<>
        {/* ==================== ADMIN: MANAGE ==================== */}
        {isAdmin && tab==="manage" && (
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-5">
            {/* Six sections. Previously a 4-column grid holding six items, which left a
                ragged second row of two and two empty cells — the eye reads that as
                "something is missing". Three columns gives two full rows, every cell
                the same weight, and a wider target on a phone.

                ORDER FOLLOWS FREQUENCY, not tidiness: Dash and Approvals are daily,
                People and Products are weekly, Access and Settings are rare. Approvals
                sits directly before Settings so the two things an admin opens most are
                at the start of each row. */}
            <div className="grid grid-cols-3 gap-1.5 pb-3">
              {[["dash","Dash"],["people","People"],["products","Products"],
                ["access","🔐 Access"],["approvals","Approvals"],["settings",<span key="g" className="inline-flex items-center gap-1 justify-center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Settings</span>]].map(([k,l])=>{
                /* One badge, on the one tab that holds decisions. Spreading counts over
                   several tabs made the admin check each in turn; a single number is
                   the question they actually have. */
                const n = k==="approvals"
                  ? pendingCounts.payments + pendingCounts.refunds + pendingCounts.expenses
                    + pendingCounts.noshows + pendingCounts.deletions + pendingCounts.manualmoney
                  : 0;
                return (
                <button key={k} onClick={()=>setAdminSec(k)}
                  className="px-2 py-2 rounded-full text-xs font-semibold relative"
                  style={{background:adminSec===k?T.ink:"transparent", color:adminSec===k?T.paper:T.ink,
                          border:`1.5px solid ${adminSec===k?T.ink:T.line}`, minWidth:0}}>
                  {l}
                  {n>0 && <span style={{position:"absolute", top:-4, right:-4, minWidth:16, height:16,
                    lineHeight:"16px", borderRadius:8, padding:"0 4px", background:T.accent, color:"#fff",
                    fontSize:9.5, fontWeight:800}}>{n>9?"9+":n}</span>}
                </button>);})}
            </div>

            {adminSec==="dash" && (() => {
              // weekly trainer payout/cost from rates (per-class/PT or salary)
              // Rough weekly estimate for the dashboard. The authoritative figure —
              // paid only for delivered work — is in Manage → Payouts.
              const payoutFor = (tid) => {
                const rt = rates[tid]; if(!rt) return 0;
                if (rt.type==="salary") return Math.round(rt.monthly/4.33);
                const mine = staffSessions(tid);
                const classPay = rt.type==="per_head"
                  ? mine.reduce((a,s)=>a + (s.attendees||[]).length * (rt.perHead||0), 0)
                  : mine.length * (rt.perClass||0);
                const pts = ptBookings.filter(b=>b.trainer===tid && b.status!=="cancelled").length;
                return classPay + pts*(rt.perPt||0);
              };
              const payouts = trainers.map(t=>({t, amt:payoutFor(t.id)}));
              const totalPayout = payouts.reduce((a,b)=>a+b.amt,0);
              /* Approved AND paid both count: an approved claim is money owed, so
                 leaving it out until someone pays it would flatter the week. */
              const approvedInc = expenseClaims.filter(c=>c.status==="approved"||c.status==="paid")
                .reduce((a,c)=>a+approvedTotal(c),0);
              const profit = revenue - totalPayout - approvedInc;
              return (
              <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["$"+revenue,"Revenue (wk)"],[sessions.length,"Sessions (wk)"],["87%","Attendance"],["2","Packs expiring"]].map(([v,l])=>(
                  <Card key={l}><div style={{...disp,fontWeight:700,fontSize:28}}>{v}</div><div className="text-xs" style={{color:T.muted}}>{l}</div></Card>))}
              </div>
              <Card style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="text-xs font-bold mb-2" style={{color:"#B9B5A9"}}>REVENUE vs COST (this week)</div>
                <div className="flex justify-between text-sm"><span>Revenue collected</span><span className="font-bold" style={{color:"#8FD9B6"}}>${revenue}</span></div>
                <div className="flex justify-between text-sm"><span>Trainer payout (est.)</span><span className="font-bold" style={{color:T.accent}}>-${totalPayout}</span></div>
                {approvedInc>0 && <div className="flex justify-between text-sm"><span>Approved expenses</span><span className="font-bold" style={{color:T.accent}}>-${approvedInc.toFixed(2)}</span></div>}
                <div className="flex justify-between text-sm mt-1 pt-1" style={{borderTop:"1px solid #3A362B"}}><span className="font-bold">Gross margin</span><span className="font-bold">${profit}</span></div>
                <div className="mt-2 space-y-0.5">
                  {payouts.map(({t,amt})=>(
                    <div key={t.id} className="flex justify-between text-xs" style={{color:"#B9B5A9"}}>
                      <span>{t.name} · {rates[t.id]?.type==="salary"?"salary":`${staffSessions(t.id).length} cls + ${ptBookings.filter(b=>b.trainer===t.id).length} PT`}</span><span>${amt}</span></div>))}
                </div>
                <div className="text-xs mt-2" style={{color:"#6B675C"}}>Payout est. from each coach's rate (per-class/PT or salary). Actual payout runs in Money → payouts.</div>
              </Card>
              <Card style={{background:"#FBEDEF"}}>
                <div className="text-xs font-bold" style={{color:T.plum}}>LEAD FUNNEL</div>
                <div className="flex gap-4 mt-1">
                  {["new","contacted","trial booked"].map(st=>(
                    <div key={st}><span style={{...disp,fontWeight:700,fontSize:22}}>{leads.filter(l=>l.status===st).length}</span>
                      <div className="text-xs" style={{color:T.muted}}>{st}</div></div>))}
                </div>
              </Card>
              {/* Decision 6 — pending items stay pending. Without a visible count in one place
                  the four queues silently pile up, so Dash summarises all of them. */}
              {pendingCounts.total>0 && (
                <Card style={{background:"#F7EEE9"}}>
                  <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>WAITING ON YOU ({pendingCounts.total})</div>
                  <div className="space-y-1">
                    {/* Each row now JUMPS to the queue it names. A summary that tells you
                        where to go and then makes you navigate there yourself is a
                        signpost, not a control. */}
                    {[["PayNow proofs to verify", pendingCounts.payments, "approvals", "payments"],
                      ["Refund requests",         pendingCounts.refunds,  "approvals", "payments"],
                      ["Money owed",              pendingCounts.manualmoney, "approvals", "owed"],
                      ["Expense claims",          pendingCounts.expenses, "approvals", "expenses"],
                      ["No-show decisions",       pendingCounts.noshows,  "approvals", "clientops"],
                      ["Deletion requests",       pendingCounts.deletions,"approvals", "clientops"],
                      ["Exception requests",      pendingCounts.exceptions, "schedule", null]]
                      .filter(([,n])=>n>0).map(([label,n,sec,sub])=>(
                      <button key={label} className="w-full flex items-center justify-between text-sm py-0.5 text-left"
                        onClick={()=>{ if(sec==="schedule"){ setTab("schedule"); return; }
                          setAdminSec(sec); if(sub) setApprovalsView(sub); }}>
                        <span>{label} <span className="font-bold">({n})</span></span>
                        <span className="text-xs font-bold" style={{color:T.blue}}>
                          {sec==="schedule" ? "Schedule ›" : "Approvals ›"}</span>
                      </button>))}
                  </div>
                  <div className="text-xs mt-2" style={{color:T.muted}}>Nothing auto-approves or auto-declines — these wait until you action them.</div>
                </Card>)}
              <Card style={{background:"#F7EEE9"}}>
                <div className="text-xs font-bold" style={{color:T.accent}}>ALERTS</div>
                <div className="text-sm mt-1">· Wed 06:30 Strength @ Meyer Park has 1 booking — consider auto-cancel rule</div>
                <div className="text-sm">· Priya's 10-pack expires in 6 days (3 unused)</div>
              </Card>
            </div>); })()}

            {adminSec==="people" && <div className="space-y-3">

              {/* ---- ACCOUNTS WAITING ON YOU ----
                   Two states that look identical from the outside and need different
                   actions: a record nobody has confirmed, and a confirmed record whose
                   login invite never arrived. Both look like "they haven't signed up
                   yet" until someone checks, which is exactly why they badge. */}
              {(pendingClients.length > 0 || undeliveredInvites.length > 0) && (
                <div className="rounded-xl p-3" style={{background:"#F7EEE9", border:`1.5px solid ${T.line}`}}>
                  <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>ACCOUNTS WAITING ON YOU</div>

                  {pendingClients.map(c=>(
                    <div key={c.id} className="flex items-center gap-2 py-1.5" style={{borderTop:`1px solid ${T.line}`}}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{c.name}</div>
                        <div className="text-[11px] truncate" style={{color:T.muted}}>
                          {[c.phone, c.email].filter(Boolean).join(" · ") || "no contact details"}
                          {" · "}{c.source==="self_signup" ? "registered themselves" : `added by ${tName(c.addedBy)}`}
                        </div>
                      </div>
                      <Btn small onClick={()=>confirmPendingClient(c.id)}>Approve &amp; invite</Btn>
                    </div>))}

                  {undeliveredInvites.map(inv=>(
                    <div key={inv.id} className="py-1.5" style={{borderTop:`1px solid ${T.line}`}}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{inv.name}
                            <span className="text-[11px] font-normal" style={{color:T.muted}}> · {inv.kind}</span></div>
                          <div className="text-[11px]" style={{color:T.accent}}>
                            Approved, but they can't log in — the invite didn't reach them.
                          </div>
                        </div>
                      </div>
                      {Object.entries(inv.channels||{}).map(([ch,r])=>(
                        <div key={ch} className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] flex-1" style={{color: r.status==="sent"?T.moss:T.muted}}>
                            {ch==="email"?"Email":"WhatsApp"}: {r.status==="sent" ? `sent to ${r.to}` : r.error}
                          </span>
                          {r.status!=="sent" && r.status!=="skipped" && (
                            <button onClick={()=>retryInvite(inv.id, ch)} className="text-[11px] font-bold px-2 py-1 rounded-lg"
                              style={{border:`1.5px solid ${T.line}`, color:T.ink}}>Retry</button>)}
                          {r.status==="skipped" && (
                            <span className="text-[11px]" style={{color:T.orange}}>add one to send</span>)}
                        </div>))}
                    </div>))}

                  <div className="text-[11px] mt-2" style={{color:T.deep}}>
                    Approving sends the login by WhatsApp <b>and</b> email, and records whether each
                    one actually got there. Coaches are created here — nobody signs up as staff.
                  </div>
                </div>)}

              {/* ---- Member Messages ---- */}
              <div className="rounded-xl p-3" style={{background:T.card, border:`1.5px solid ${T.line}`}}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-xs font-bold" style={{color:T.muted}}>MEMBER MESSAGES</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {chatThreads.length} conversation{chatThreads.length!==1?"s":""}{" "}
                      {chatThreads.reduce((n,t)=>n+t.unread,0)>0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                          style={{background:T.accent,color:"#fff"}}>
                          {chatThreads.reduce((n,t)=>n+t.unread,0)} unread
                        </span>)}
                    </div>
                  </div>
                  <Btn small onClick={()=>setAdminInboxOpen(true)}>Open inbox</Btn>
                </div>
                <div className="text-[11px]" style={{color:T.muted}}>
                  Members message you from Account → Chat. Replies appear in their chat instantly.
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{color:T.muted}}>
                  LEADS · {openLeads.length} open{closedLeads.length>0 && <span style={{fontWeight:400}}> · {closedLeads.length} closed</span>}
                </div>
                <Btn small kind="ghost" onClick={()=>setAddLead({name:"", phone:"", source:"Walk-in", note:""})}>+ Add lead</Btn>
              </div>
              {/* What a lead IS and how it leaves the list. Previously a lead could be
                  tagged but never closed, so the list only grew and "new" stopped
                  meaning anything. Converted and Lost now archive it out. */}
              <Card className="!p-3" style={{background:"#EFF3EE"}}>
                <div className="text-xs" style={{color:T.ink}}>
                  <b>How this works.</b> Someone enquires (form, Instagram DM, walk-in, referral) and lands here as
                  <b> New</b>. WhatsApp or call them → mark <b>Contacted</b>. If they book a trial → <b>Trial booked</b>.
                  Then close it: <b>Converted</b> once they're a paying member, or <b>Lost</b> if they go quiet.
                  Closed leads drop out of this list into the archive below — that's what keeps the open count honest.
                </div>
              </Card>
              {openLeads.length===0 && <div className="text-xs" style={{color:T.muted}}>No open leads. Everything's been actioned.</div>}
              {openLeads.map(l=>{ const wa = (l.phone||"").replace(/\D/g,""); return (
                <Card key={l.id} className="!p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{l.name} {l.phone && <span className="text-xs font-normal" style={{color:T.muted}}>· +65 {l.phone}</span>}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{background:l.source==="Enquiry form"?T.ink:T.line, color:l.source==="Enquiry form"?T.paper:T.ink}}>{l.source}</span>
                  </div>
                  {/* enquiry-form leads carry more than a note — show it all, or the
                      admin has to guess what they asked and where they want to train */}
                  {(l.email || l.location || l.at) && (
                    <div className="text-xs mt-0.5" style={{color:T.muted}}>
                      {l.email && <span>{l.email}</span>}
                      {l.email && (l.location || l.at) && <span> · </span>}
                      {l.location && <span>prefers {l.location}</span>}
                      {l.location && l.at && <span> · </span>}
                      {l.at && <span>{l.at}</span>}
                    </div>)}
                  {l.note && <div className="text-xs mt-1 rounded-lg p-2" style={{background:"#FBF3EC", color:T.ink}}>{l.note}</div>}
                  {/* one-tap contact-back */}
                  <div className="flex gap-1.5 mt-2">
                    <button disabled={!wa} onClick={()=>{ if(l.status==="new") setLeadStatus(l.id,"contacted"); ping(wa?`Opening WhatsApp to +65 ${l.phone} — marked contacted`:"No number on file"); }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:wa?"#25D366":T.line, color:"#fff", opacity:wa?1:.5}}>WhatsApp</button>
                    <button disabled={!wa} onClick={()=>{ if(l.status==="new") setLeadStatus(l.id,"contacted"); ping(wa?`Calling +65 ${l.phone}… — marked contacted`:"No number on file"); }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{border:`1.5px solid ${T.line}`, color:wa?T.ink:T.muted}}>Call</button>
                  </div>
                  {/* Progress and close are visually separated — closing is the action
                      that removes it from the list, so it shouldn't sit in the same row
                      as a harmless status nudge. */}
                  <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                    <span className="text-[10px] font-bold" style={{color:T.muted}}>STAGE</span>
                    {["new","contacted","trial booked"].map(st=>(
                      <button key={st} onClick={()=>setLeadStatus(l.id,st)}
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{background:l.status===st?T.plum:"transparent", color:l.status===st?"#fff":T.muted, border:`1px solid ${l.status===st?T.plum:T.line}`}}>{st}</button>))}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Btn small kind="ghost" full onClick={()=>setLeadStatus(l.id,"lost")}>Lost — close it</Btn>
                    <Btn small full onClick={()=>setLeadStatus(l.id,"converted")}>Converted ✓</Btn>
                  </div>
                </Card>);})}

              {closedLeads.length>0 && (
                <details>
                  <summary className="text-xs font-bold cursor-pointer" style={{color:T.muted}}>
                    CLOSED LEADS ({closedLeads.length}) · converted &amp; lost
                  </summary>
                  <div className="space-y-2 mt-2">
                    {closedLeads.map(l=>(
                      <Card key={l.id} className="!p-3" style={{opacity:.75}}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm">
                            <span className="font-semibold">{l.name}</span>
                            <span className="text-xs" style={{color:T.muted}}> · {l.source}{l.closedAt?` · closed ${l.closedAt}`:""}</span>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{background:l.status==="converted"?T.moss:T.line, color:l.status==="converted"?"#fff":T.muted}}>{l.status}</span>
                        </div>
                        <button onClick={()=>setLeadStatus(l.id,"contacted")} className="text-xs font-bold mt-1.5" style={{color:T.accent}}>
                          Reopen</button>
                      </Card>))}
                  </div>
                  <div className="text-[11px] mt-2" style={{color:T.muted}}>
                    Kept, not deleted — closed leads are what the conversion-rate report in Reports → Clients is built from.
                  </div>
                </details>)}
              <Btn full kind="ghost" onClick={()=>copyText("https://exerciseonly.vip/?from=instagram", "Booking link copied — paste it into your Instagram bio or a story")}>Copy Instagram booking link</Btn>
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>TRAINERS · rate + permissions</div>
              {trainers.filter(t=>!t.admin).map(t=>{ const rt=rates[t.id]; return (
                <Card key={t.id} style={t.active===false?{opacity:.6}:undefined}>
                  <div className="flex items-center justify-between">
                    <div><div className="font-semibold text-sm">{t.name}{t.active===false && <span className="text-xs font-normal" style={{color:T.accent}}> · inactive</span>}</div>
                      <div className="text-xs" style={{color:T.muted}}>{t.tag} · {rt ? (rt.type==="salary" ? `$${rt.monthly}/mo salary` : rt.type==="per_head" ? `$${rt.perHead}/head · $${rt.perPt}/PT` : `$${rt.perClass}/class · $${rt.perPt}/PT`) : "rate not set"}</div></div>
                    <div className="flex gap-1.5">
                      <Btn small kind="ghost" onClick={()=>setAddTrainer({editId:t.id, name:t.name, phone:t.phone||"", bio:t.bio||"", payType:rt?.type||"per_class", perClass:rt?.perClass||"", perHead:rt?.perHead||"", perPt:rt?.perPt||"", monthly:rt?.monthly||""})}>Edit</Btn>
                      <Btn small kind="ghost" onClick={()=>setPermOpen(permOpen===t.id?null:t.id)}>Perms</Btn>
                      {t.active===false
                        ? <Btn small onClick={()=>reactivateTrainer(t.id)}>Reactivate</Btn>
                        : <Btn small kind="ghost" onClick={()=>deactivateTrainer(t.id)}>Deactivate</Btn>}
                    </div>
                  </div>
                  {permOpen===t.id && (
                    <div className="mt-3 pt-3 space-y-2" style={{borderTop:`1.5px solid ${T.line}`}}>
                      {[["editDesc","Edit class descriptions"],["cancel","Cancel booked sessions"],["earnings","See own earnings"],["manageLocations","Add locations"]].map(([k,l])=>(
                        <button key={k} className="w-full flex justify-between items-center py-1"
                          onClick={()=>setPerm(p=>({...p,[t.id]:{...(p[t.id]||{}),[k]:!(p[t.id]||{})[k]}}))}>
                          <span className="text-sm">{l}</span>
                          <span className="text-xs font-bold" style={{color:(perm[t.id]||{})[k]?T.moss:T.muted}}>{(perm[t.id]||{})[k]?"ON ●":"OFF ○"}</span>
                        </button>))}
                    </div>)}
                </Card>);})}
              <Btn full kind="ghost" onClick={()=>setAddTrainer({name:"",phone:"",payType:"per_class",perClass:"",perPt:"",monthly:""})}>+ Add trainer</Btn>
              <div className="rounded-xl p-3" style={{border:`1.5px dashed ${T.line}`}}>
                <div className="text-sm font-semibold" style={{color:T.muted}}>Import clients (CSV) — not available yet</div>
                <div className="text-[11px] mt-0.5" style={{color:T.muted}}>
                  Needs the backend: each row has to create a real account and request PDPA consent at
                  first login. Deliberately not faked — a button that says "imported" and does nothing
                  is how you lose a client list.</div>
              </div>
            </div>}

            {adminSec==="products" && <div className="space-y-3">
              <div className="text-xs font-bold" style={{color:T.muted}}>PACKS & MEMBERSHIPS</div>
              {products.map(p=>(
                <Card key={p.id} className="flex items-center gap-3">
                  <div className="flex-1"><div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs" style={{color:T.muted}}>${p.price} · {p.kind}{p.sessions?` · ${p.sessions} sessions`:""}</div></div>
                  <button onClick={()=>setProducts(ps=>ps.map(x=>x.id!==p.id?x:{...x,active:!x.active}))}
                    className="text-xs font-bold" style={{color:p.active?T.moss:T.muted}}>{p.active?"ACTIVE ●":"HIDDEN ○"}</button>
                  <button onClick={()=>{ setProducts(ps=>ps.filter(x=>x.id!==p.id)); ping(`${p.name} deleted`); }}
                    className="text-xs font-bold px-1.5 py-1 rounded" style={{color:T.accent,border:`1.5px solid ${T.line}`}}>Delete</button>
                </Card>))}
              <div className="text-xs" style={{color:T.muted}}>Deactivate hides a pack from the shop but keeps already-purchased ones valid. Delete removes it entirely.</div>
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-bold" style={{color:T.muted}}>COUPONS</div>
                <Btn small kind="ghost" onClick={()=>setCouponForm({code:"", mode:"pct", val:"", label:""})}>+ Add</Btn>
              </div>
              {Object.entries(coupons).length===0 && <div className="text-xs" style={{color:T.muted}}>No coupons. Add one with + Add.</div>}
              {Object.entries(coupons).map(([code,c])=>(
                <Card key={code} className="flex items-center gap-3 !p-3">
                  <div className="flex-1"><div className="font-semibold text-sm">{code}</div>
                    <div className="text-xs" style={{color:T.muted}}>{c.label}</div></div>
                  <button onClick={()=>{ setCoupons(cs=>{ const n={...cs}; delete n[code]; return n; }); ping(`Coupon ${code} deleted`); }}
                    className="text-xs font-bold px-1.5 py-1 rounded" style={{color:T.accent,border:`1.5px solid ${T.line}`}}>Delete</button>
                </Card>))}
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>REFERRAL REWARD</div>
              <Card className="!p-3"><div className="text-sm">1 free class credit — both referrer & referee, on referee's first paid booking.</div></Card>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-bold" style={{color:T.muted}}>OFFERS &amp; PROMOS · shown in Shop → Offers</div>
                <Btn small kind="ghost" onClick={()=>setOfferSheet({kind:"This month", title:"", blurb:"", code:"", color:"#1E50A0"})}>+ Add</Btn>
              </div>
              {offers.map(o=>(
                <Card key={o.id} className="!p-3 flex items-center gap-3">
                  <div className="flex-1"><div className="font-semibold text-sm">{o.title} <span className="text-xs font-normal" style={{color:T.muted}}>· {o.kind}{o.code?` · ${o.code}`:""}</span></div>
                    <div className="text-xs" style={{color:T.muted}}>{o.blurb}</div></div>
                  <button onClick={()=>{setOffers(os=>os.filter(x=>x.id!==o.id)); ping("Offer removed");}} className="text-xs font-bold px-1.5 py-1 rounded" style={{color:T.accent,border:`1.5px solid ${T.line}`}}>Delete</button>
                </Card>))}

              <div className="flex items-center justify-between pt-3">
                <div className="text-xs font-bold" style={{color:T.muted}}>CLASS TEMPLATES · reusable weekly timetables</div>
                <Btn small onClick={()=>setTemplateBuilder({name:"", blocks:[]})}>+ New</Btn>
              </div>
              {classTemplates.map(tpl=>(
                <Card key={tpl.id} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{tpl.name}</div>
                      <div className="text-xs" style={{color:T.muted}}>{tpl.blocks.length} class blocks/week</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Btn small kind="ghost" onClick={()=>setTemplateBuilder(JSON.parse(JSON.stringify(tpl)))}>Edit</Btn>
                      <Btn small kind="ghost" onClick={()=>{
                        const clone = {id:nid(), name:tpl.name+" (copy)", blocks:tpl.blocks.map(b=>({...b}))};
                        setClassTemplates(ts=>[...ts,clone]); ping(`Cloned "${tpl.name}" — edit and rename the copy`);}}>Clone</Btn>
                      <Btn small onClick={()=>applyTemplate(tpl)}>Apply</Btn>
                    </div>
                  </div>
                </Card>))}

              <Btn full kind="ghost" onClick={()=>setProductForm({name:"", price:"", kind:"classes", sessions:"", validity:"90"})}>+ Add a pack or pass</Btn>
              <div className="text-xs" style={{color:T.muted}}>Price changes never affect already-purchased packs. Template edits only affect future-generated sessions.</div>
            </div>}

            {/* ==================== APPROVALS ====================
                 Everything that costs money or changes a balance, in one place.
                 It was scattered across four screens — payment proofs and refunds
                 under Money, no-shows under Clients, deletion requests wherever they
                 landed, arrears under Reports. The admin's actual job is "what needs
                 my decision today", and that question had no single answer.

                 Four sub-tabs because they are four different KINDS of decision, not
                 four lists: money coming in (verify it), money going out (authorise
                 it), money owed (chase it), and a client's standing (rule on it).
                 Grouping by kind is what lets the admin work one queue to the end
                 rather than context-switching down a single mixed list. */}
            {adminSec==="approvals" && (() => {
              const counts = {
                payments: paymentQueue.length + refundQueue.length,
                owed:     pendingCounts.manualmoney,
                expenses: pendingClaims.length + approvedUnpaid.length,
                clientops:noShowQueue.length + deletionRequests.length,
              };
              const SUBS = [
                ["payments", "Payments",  "Money in: PayNow proofs to verify, and refunds to authorise."],
                ["owed",     "Money owed","Money out there: what's unpaid, how old it is, and who to chase."],
                ["expenses", "Expenses",  "Coaches' own money to give back — approve, then record the payment."],
                ["clientops","Client ops","Decisions about a person rather than an amount: no-shows and deletion requests."],
              ];
              const total = Object.values(counts).reduce((a,b)=>a+b,0);
              return (
              <div className="space-y-3">
                {/* One honest answer to "is there anything for me?" before any tab is
                    chosen. Four zeroes read very differently from four sub-tabs that
                    each have to be opened to find out. */}
                <Card style={{background: total>0 ? "#F7EEE9" : T.card}}>
                  <div className="text-xs font-bold mb-0.5" style={{color: total>0 ? T.accent : T.moss}}>
                    {total>0 ? `${total} DECISION${total===1?"":"S"} WAITING` : "NOTHING WAITING"}</div>
                  <div className="text-xs" style={{color:T.deep}}>
                    {total>0
                      ? "Everything that costs money or changes a balance. Nothing here resolves itself."
                      : "Every queue is clear. New proofs, refunds, claims and no-shows all land here."}
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-1.5">
                  {SUBS.map(([k,l])=>{
                    const on = approvalsView===k, n = counts[k];
                    return (
                    <button key={k} onClick={()=>setApprovalsView(k)}
                      className="px-2.5 py-2 rounded-xl text-xs font-bold relative text-left"
                      style={{background:on?T.ink:T.card, color:on?T.paper:T.ink,
                              border:`1.5px solid ${on?T.ink:T.line}`}}>
                      {l}
                      {/* The count is the whole point of the chip — an admin should
                          not have to open a queue to discover it is empty. */}
                      <span style={{opacity:on?.75:1, color:on?T.paper:(n>0?T.accent:T.muted), fontWeight:800}}> {n}</span>
                    </button>);})}
                </div>
                <div className="text-[11px] -mt-1" style={{color:T.muted}}>
                  {(SUBS.find(x=>x[0]===approvalsView)||[])[2]}
                </div>

                {/* ---- MONEY OWED ---- moved from Reports: arrears is a thing you act
                     on, not a thing you read, and it belongs beside the other actions. */}
                {approvalsView==="owed" && <PaymentsReport/>}

                {/* ---- PAYMENTS IN AND OUT ---- */}
                {approvalsView==="payments" && (<>
                  {/* ---- PAYMENT APPROVALS (manual PayNow, Danny's decision 27 Jul) ----
                       The member paid by bank transfer and uploaded a screenshot. NOTHING is
                       granted until the transfer is matched in the bank app and approved here.
                       Approve = credits/booking/camp granted + ledger row + client notified.
                       Deny = client notified with the reason; nothing was ever granted. */}
                  {paymentQueue.length > 0 && (
                    <ApprovalQueue
                      label={`PAYMENT APPROVALS · ${paymentQueue.length} PayNow proof${paymentQueue.length===1?"":"s"} to verify`}
                      items={paymentQueue.map(p=>({
                        id: p.id,
                        title: `${p.who} — $${p.amt} · ${p.what}`,
                        sub: `${p.method} · proof: ${p.proof?.name || "⚠ no screenshot"} · check the bank app before approving`,
                        meta: p.at,
                      }))}
                      onResolve={resolvePayment}
                      approveLabel="Payment received" denyLabel="Not found" />)}
                  {paymentQueue.length === 0 && (
                    <Card className="!p-3"><div className="text-xs" style={{color:T.muted}}>
                      No PayNow proofs waiting. Purchases paid by transfer land here for you to
                      verify against the bank app before anything is granted.</div></Card>)}

                  {/* ---- REFUNDS (Decisions 2, 6, 7) ----
                       Credit back is automatic on cancellation. Money back is not: the member asks,
                       the admin approves, and only then does the credit come off and the refund
                       get triggered by hand. Never both a credit and a refund. */}
                  {refundQueue.length>0 && (
                    <ApprovalQueue
                      label="REFUND REQUESTS · bank refund instead of credit"
                      items={refundQueue.map(r=>({
                        id:r.id, title:`${r.who} — $${r.amt} back to bank`,
                        sub:`${r.what} · originally paid by ${r.method} · cancelled ${r.when}${r.reason?` · "${r.reason}"`:""}`,
                      }))}
                      onResolve={resolveRefund}
                      approveLabel="Approve refund" denyLabel="Deny (keep credit)" />)}
                  {refundQueue.length===0 && (
                    <div className="text-xs" style={{color:T.muted}}>No refund requests.</div>)}

                  {/* The ledger sits UNDER the queues it feeds, not in a tab of its own:
                      an approval writes a row here, and seeing it land is how the admin
                      knows the approval took. It is a record, not a decision. */}
                  <div className="text-xs font-bold pt-2" style={{color:T.muted}}>LEDGER · every payment recorded</div>
                  {ledger.slice(0,12).map(l=>(
                    <Card key={l.id} className="flex items-center gap-3 !p-3">
                      <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{l.who} · {l.what}</div>
                        <div className="text-xs" style={{color:T.muted}}>{l.method} · {l.d}</div></div>
                      <div className="font-bold text-sm">${l.amt}</div>
                      <Btn small kind="ghost" disabled={l.amt<=0} onClick={()=>{
                        setRefundQueue(q=>[...q, {id:nid(), who:l.who, what:l.what, amt:l.amt,
                          method:l.method, pool:null, reason:"Raised by admin from the ledger",
                          when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}]);
                        ping("Added to the refund queue — approve it above to record the refund");
                      }}>Refund</Btn>
                    </Card>))}
                  {ledger.length>12 && (
                    <div className="text-[11px]" style={{color:T.muted}}>
                      Showing the 12 most recent. Full history and CSV export are in Reports → Analytics.</div>)}
                </>)}

                {/* ---- EXPENSE CLAIMS ----
                     Not an ApprovalQueue: a claim isn't a yes/no. It holds several
                     lines, each of which the admin may want to read, question or
                     exclude, and after approving there is still a payment to record.
                     Squeezing that into approve/deny would force the all-or-nothing
                     rejection this workflow exists to avoid. */}
                {approvalsView==="expenses" && (<>
                  {(pendingClaims.length>0 || approvedUnpaid.length>0) ? (
                    <div>
                      <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>
                        EXPENSE CLAIMS · {pendingClaims.length} to review
                        {approvedUnpaid.length>0 && <span style={{color:T.blue}}> · {approvedUnpaid.length} approved, unpaid</span>}
                      </div>
                      <div className="space-y-2">
                        {[...pendingClaims, ...approvedUnpaid].map(c=>{
                          const st = STATUS[c.status]; const net = approvedTotal(c);
                          const noRec = c.lines.filter(l=>!l.excluded && !l.receipt).length;
                          return (
                            <Card key={c.id} className="!p-3">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold">{tName(c.trainer)}</span>
                                    <Pill tone={st.tone}>{st.label}</Pill>
                                  </div>
                                  <div className="text-[11px]" style={{color:T.muted}}>
                                    {c.ref} · {c.lines.length} item{c.lines.length===1?"":"s"}
                                    {c.submittedAt ? ` · sent ${fmtISO(c.submittedAt)}` : ""}
                                    {noRec>0 && <span style={{color:T.orange}}> · {noRec} no receipt</span>}
                                  </div>
                                </div>
                                <div style={{...disp,fontWeight:800,fontSize:17}}>${net.toFixed(2)}</div>
                              </div>
                              <Btn small full kind="ghost" onClick={()=>setClaimReview(c.id)}>
                                {c.status==="approved" ? "Record payment" : "Review claim"}</Btn>
                            </Card>);})}
                      </div>
                      <div className="text-[11px] mt-2" style={{color:T.deep}}>
                        Approved and paid are separate on purpose: approved means "yes, that's a real
                        cost", paid means the money has left the account. Only the second answers a
                        coach asking whether they are still out of pocket.
                      </div>
                    </div>
                  ) : (
                    <Card className="!p-3"><div className="text-xs" style={{color:T.muted}}>
                      No expense claims waiting. Submitted claims land here to review, and approved
                      ones stay until you record the payment.</div></Card>)}
                </>)}

                {/* ---- CLIENT OPS ----
                     Decisions about a PERSON rather than an amount. They have a money
                     consequence — a forfeited credit, an anonymised account — but the
                     judgement is about the client, so they sit apart from the queues
                     where the question is "did this money arrive?" */}
                {approvalsView==="clientops" && (<>
                  {/* No-shows: the coach marks absent, NOTHING auto-deducts, the admin
                      decides. Same treatment as PT (Decisions 5, 6, 7). */}
                  {noShowQueue.length>0 ? (
                    <ApprovalQueue
                      label="NO-SHOW DECISIONS · nothing is deducted until you decide"
                      items={noShowQueue.map(nq=>({ id:nq.id, title:nq.who, sub:`${nq.session} · Policy: ${nq.policy}` }))}
                      onResolve={(id, approved, reason)=>resolveNoShow(id, approved, reason)}
                      approveLabel="Apply forfeit" denyLabel="Waive" />
                  ) : (
                    <Card className="!p-3"><div className="text-xs" style={{color:T.muted}}>
                      No no-shows waiting. A coach marking someone absent lands here — the credit is
                      never deducted automatically.</div></Card>)}

                  {/* DECISION 15 — deletion is a PDPA right with a real queue behind it. */}
                  {deletionRequests.length>0 && (
                    <ApprovalQueue
                      label="ACCOUNT DELETION REQUESTS · PDPA"
                      items={deletionRequests.map(d=>({ id:d.id, title:`${d.who} asked to delete their account`,
                        sub:d.reason ? `"${d.reason}"` : "No reason given", meta:d.when }))}
                      onResolve={resolveDeletion}
                      approveLabel="Anonymise" denyLabel="Decline" />)}
                  <div className="text-[11px]" style={{color:T.muted}}>
                    Approving a deletion scrubs the name, phone and email and keeps the bookings and
                    payments as anonymised rows, so the books still balance (Decision 15).
                  </div>
                </>)}

                <div className="text-[11px] text-center pt-1" style={{color:T.muted}}>
                  Exception requests stay under Schedule — they are about a booking, and the calendar
                  is the context you need to rule on one.
                </div>
              </div>);})()}

            {/* Camps moved here from the bottom nav — set up occasionally, so a
                permanent slot in a five-item nav was expensive. */}

            {adminSec==="settings" && <div className="space-y-3">
              {/* ---- Calendar hours ---- */}
              <div className="rounded-xl p-3" style={{background:T.card, border:`1.5px solid ${T.line}`}}>
                <div className="text-xs font-bold mb-2" style={{color:T.muted}}>CALENDAR HOURS</div>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>FROM</div>
                    <select value={gymHoursStart} onChange={e=>setGymHoursStart(Number(e.target.value))}
                      className="w-full px-2 py-2 rounded-lg text-sm"
                      style={{border:`1.5px solid ${T.line}`,background:T.card,color:T.ink}}>
                      {[4,5,6,7,8,9,10].map(h=>(
                        <option key={h} value={h}>{h}:00 {h<12?"am":"pm"}</option>))}
                    </select>
                  </div>
                  <div className="text-sm font-bold" style={{color:T.muted}}>–</div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>TO</div>
                    <select value={gymHoursEnd} onChange={e=>setGymHoursEnd(Number(e.target.value))}
                      className="w-full px-2 py-2 rounded-lg text-sm"
                      style={{border:`1.5px solid ${T.line}`,background:T.card,color:T.ink}}>
                      {[18,19,20,21,22,23,24].map(h=>(
                        <option key={h} value={h}>{h<=12?h:h-12}:00 {h<12?"am":"pm"}</option>))}
                    </select>
                  </div>
                </div>
                <div className="text-[11px] mt-1.5" style={{color:T.muted}}>
                  {gymHoursEnd-gymHoursStart}h window · calendar resizes automatically on all views
                </div>
              </div>

              {/* ---- PayNow receiving details — what members see at checkout ---- */}
              <div className="rounded-xl p-3" style={{background:T.card, border:`1.5px solid ${T.line}`}}>
                <div className="text-xs font-bold mb-2" style={{color:T.muted}}>PAYNOW DETAILS · shown to members at checkout</div>
                <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>UEN</div>
                <input value={paynowConfig.uen} onChange={e=>setPaynowConfig(p=>({...p, uen:e.target.value.toUpperCase()}))}
                  placeholder="e.g. 202412345A" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-2"
                  style={{border:`1.5px solid ${T.line}`,background:T.paper}}/>
                <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>PAYNOW MOBILE</div>
                <input value={paynowConfig.mobile} onChange={e=>setPaynowConfig(p=>({...p, mobile:e.target.value}))}
                  placeholder="+65 8100 6608" inputMode="tel" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-2"
                  style={{border:`1.5px solid ${T.line}`,background:T.paper}}/>
                <div className="text-[10px] font-bold mb-1" style={{color:T.muted}}>PAYNOW QR · upload the bank-generated image</div>
                {paynowConfig.qrImage ? (
                  <div className="flex items-center gap-3">
                    <img src={paynowConfig.qrImage} alt="PayNow QR" style={{width:72,height:72,objectFit:"contain",borderRadius:8,border:`1.5px solid ${T.line}`,background:"#fff"}}/>
                    <div className="flex-1">
                      <div className="text-xs" style={{color:T.moss}}>✓ Real QR uploaded — members scan this one.</div>
                      <button onClick={()=>setPaynowConfig(p=>({...p, qrImage:null}))}
                        className="text-xs font-bold mt-1" style={{color:T.accent}}>Remove</button>
                    </div>
                  </div>
                ) : (<>
                  <input type="file" accept="image/*" id="paynow-qr-upload" style={{display:"none"}}
                    onChange={e=>{ const f=e.target.files?.[0]; if(!f) return;
                      const r = new FileReader();
                      r.onload = () => setPaynowConfig(p=>({...p, qrImage:r.result}));
                      r.readAsDataURL(f); }}/>
                  <label htmlFor="paynow-qr-upload"
                    className="block w-full py-2.5 rounded-xl text-sm font-bold text-center cursor-pointer"
                    style={{border:`1.5px dashed ${T.line}`, color:T.muted}}>
                    📎 Upload PayNow QR image
                  </label>
                  <div className="text-[10px] mt-1" style={{color:T.muted}}>
                    Until you upload one, members see a placeholder pattern with the UEN — export
                    the real QR from the bank app so scans hit the right account.
                  </div>
                </>)}
              </div>

              {/* Timetable lives here: creating classes and camps is setup, done
                  occasionally, not day-to-day running. */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{color:T.muted}}>CLASSES · the weekly timetable</div>
                <Btn small onClick={()=>openClassBuilder({})}>+ New class</Btn>
              </div>
              <div className="text-xs" style={{color:T.muted}}>
                {sessions.filter(x=>x.status!=="cancelled").length} live · {sessions.filter(x=>x.status==="cancelled").length} cancelled.
                Assign more than one coach and the pay splits between them.
              </div>
              {[...sessions].sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time)).slice(0,12).map(x=>(
                <Card key={x.id} className="!p-3 flex items-center gap-3"
                  style={x.status==="cancelled"?{opacity:.6}:undefined}>
                  <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:CT[x.type].color}}/>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={x.status==="cancelled"?{textDecoration:"line-through"}:undefined}>
                      {CT[x.type].name} · {DAYS[x.day]} {x.time}</div>
                    <div className="text-xs" style={{color:T.muted}}>
                      {locName(x.loc)} · cap {x.cap} · {(x.trainers||[x.trainer]).map(tName).join(" + ")}
                      {(x.trainers||[x.trainer]).length>1 && <span style={{color:T.blue}}> · split pay</span>}
                      {x.status==="cancelled" && <span style={{color:T.accent}}> · cancelled{x.cancelReason?` — ${x.cancelReason}`:""}</span>}
                    </div>
                  </div>
                  {x.status==="cancelled"
                    ? <Btn small kind="ghost" onClick={()=>restoreSession(x.id)}>Restore</Btn>
                    : <Btn small kind="ghost" onClick={()=>openClassBuilder({editId:x.id, type:x.type, day:x.day,
                        time:x.time, loc:x.loc, cap:x.cap, trainers:x.trainers||[x.trainer], repeat:1})}>Edit</Btn>}
                </Card>))}

              <div className="pt-2"><CampsSection/></div>
              <div className="pt-2" style={{borderTop:`1.5px solid ${T.line}`}}/>

              <Card className="!p-3 flex items-center justify-between">
                <div><div className="font-semibold text-sm">Shop “About” page copy</div>
                  <div className="text-xs" style={{color:T.muted}}>Class + PT explainers clients read in Shop → About</div></div>
                <Btn small kind="ghost" onClick={()=>setAboutEdit({...aboutCopy})}>Edit</Btn>
              </Card>
              <div className="text-xs" style={{color:T.muted}}>Coach write-ups are edited per trainer under People → Edit.</div>
              <div className="text-xs font-bold" style={{color:T.muted}}>LOCATIONS</div>
              {locations.map(l=>(
                <Card key={l.id} className="!p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">{l.name}</span>
                  <span className="text-xs" style={{color:T.muted}}>id: {l.id}</span>
                </Card>))}
              <div className="flex gap-2">
                <input value={newLocName} onChange={e=>setNewLocName(e.target.value)} placeholder="New location name"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small onClick={addLocation}>+ Add</Btn>
              </div>

              {suggestedLocs.length>0 && <>
                <div className="text-xs font-bold pt-2" style={{color:T.accent}}>SUGGESTED FROM CLIENT "OTHER" BOOKINGS</div>
                {suggestedLocs.map(name=>(
                  <Card key={name} className="!p-3 flex items-center justify-between">
                    <span className="text-sm">{name}</span>
                    <Btn small onClick={()=>promoteSuggested(name)}>+ Save as location</Btn>
                  </Card>))}
              </>}

              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>TRAVEL TIME BETWEEN LOCATIONS (minutes)</div>
              <div className="text-xs mb-1" style={{color:T.muted}}>Default {DEFAULT_TRAVEL}m applies to any pair not listed here, including "Other" spots.</div>
              {locations.flatMap((a,i)=>locations.slice(i+1).map(b=>({a,b}))).map(({a,b})=>{
                const key = travelKey(a.id,b.id); const val = travel[key] ?? DEFAULT_TRAVEL;
                return (
                  <Card key={key} className="!p-3 flex items-center justify-between">
                    <span className="text-sm">{a.name} ↔ {b.name}</span>
                    <input type="number" value={val} onChange={e=>setTravel(tv=>({...tv,[key]:+e.target.value||0}))}
                      className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  </Card>);})}

              {/* Decisions 1 & 16 — split per booking type, admin-editable, all starting at 24h.
                  Classes and PT use hours; camps use days only. Every gate and every line of
                  policy copy in the app reads these three numbers, so changing one here changes
                  the rule everywhere at once. Nothing is hard-coded. */}
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>CANCELLATION &amp; CHANGE WINDOWS</div>
              <div className="text-xs" style={{color:T.muted}}>
                Inside these windows a member can't cancel or move on their own — they can request an exception, which lands in your queue under Schedule.</div>
              {[["classHrs","Classes","hours before"],["ptHrs","Personal training","hours before"],["campDays","Camps","days before"]].map(([k,label,unit])=>(
                <Card key={k} className="!p-3 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs" style={{color:T.muted}}>{unit} the session starts</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" value={policy[k]}
                      onChange={e=>setPolicy(p=>({...p, [k]:Math.max(0, +e.target.value||0)}))}
                      className="w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold outline-none"
                      style={{border:`1.5px solid ${T.line}`}}/>
                    <span className="text-xs" style={{color:T.muted}}>{k==="campDays"?"days":"hrs"}</span>
                  </div>
                </Card>))}
              <div className="text-xs" style={{color:T.muted}}>
                Class rescheduling isn't offered — members cancel and rebook, and the credit returns.
                PT can be moved as often as needed, as long as it's outside the window.</div>

              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>REMINDERS</div>
              <Card className="!p-3"><div className="text-sm">Sent at <b>24h</b> and <b>2h</b> before every booking. Members choose WhatsApp or email in their Account; new members default to WhatsApp.</div></Card>

              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>OTHER POLICIES</div>
              <Card className="!p-3"><div className="text-sm">PT session length: <b>{PT_DUR} min</b> (fixed for now — flagged as possibly variable by trainer/session type later)</div></Card>
              <Card className="!p-3"><div className="text-sm">Card payments: <b>off</b> — PayNow only at launch. Review when the studio passes <b>100 active members</b>.</div></Card>
              <Card className="!p-3"><div className="text-sm">Same-location changeover buffer: <b>0 min</b> (no gap required back-to-back at one venue)</div></Card>
            </div>}

            {adminSec==="access" && <div className="space-y-3">
              <div className="text-xs font-bold pb-1" style={{color:T.muted}}>MENU &amp; ACCESS CONTROL</div>
              <div className="text-[11px] mb-2" style={{color:T.muted}}>
                Control which tabs and sections are visible to Members and Coaches, and whether they
                can write (create/edit) or only read. Changes take effect immediately in the demo.
              </div>
              <MenuManagement
                menuConfig={menuConfig || buildDefault()}
                setMenuConfig={(v) => setMenuConfig(typeof v === "function" ? v(menuConfig || buildDefault()) : v)}
              />
            </div>}

          </main>)}

  </>);
}

