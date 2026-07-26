import { useApp } from "../../state/AppState.jsx";
import { COUPONS, TRAINERS } from "../../data/seed.js";
import { DEFAULT_TRAVEL, PT_DUR, travelKey } from "../../lib/scheduling.js";
import ApprovalQueue from "../../components/ApprovalQueue.jsx";
import PayoutReport from "../../components/PayoutReport.jsx";
import { nid } from "../../lib/util.js";
import { T, disp } from "../../theme.js";
import { Btn, Card, Chip } from "../../ui/kit.jsx";

export default function AdminManage() {
  const { aboutCopy, active, addLocation, adminSec, booked, classTemplates, coupon, coupons, exceptionQueue, incidentals, isAdmin, leads, ledger, locations, login, newLocName, noShowQueue, offers, pendingCounts, perm, permOpen, ping, policy, products, promoteSuggested, ptBookings, rates, refundQueue, resolveIncidental, resolveNoShow, resolveRefund, revenue, sessions, setAboutEdit, setAddLead, setAddTrainer, setAdminSec, setClassTemplates, setCouponForm, setCoupons, setIncidentals, setLeads, setLedger, setNewLocName, setOfferSheet, setOffers, setPerm, setPermOpen, setPolicy, setProducts, setTemplateBuilder, setTravel, staffSessions, suggestedLocs, tName, tab, trainers, travel } = useApp();
  return (<>
        {/* ==================== ADMIN: MANAGE ==================== */}
        {isAdmin && tab==="manage" && (
          <main className="flex-1 pb-24 px-5">
            <div className="flex gap-2 pb-3">
              {[["dash","Dash"],["people","People"],["products","Products"],["money","Money"],["payouts","Payouts"],
                ["settings",<svg key="g" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>]].map(([k,l])=>(
                <Chip key={k} active={adminSec===k} onClick={()=>setAdminSec(k)}>{l}</Chip>))}
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
              const approvedInc = incidentals.filter(i=>i.status==="approved").reduce((a,b)=>a+b.amt,0);
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
                {approvedInc>0 && <div className="flex justify-between text-sm"><span>Approved incidentals</span><span className="font-bold" style={{color:T.accent}}>-${approvedInc}</span></div>}
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
                    {[["Exception requests", pendingCounts.exceptions, "schedule", "Schedule"],
                      ["No-show decisions", pendingCounts.noshows, "clients", "Clients"],
                      ["Refund requests", pendingCounts.refunds, "money", "Manage → Money"],
                      ["Trainer receipts", pendingCounts.receipts, "money", "Manage → Money"]]
                      .filter(([,n])=>n>0).map(([label,n,,where])=>(
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span>{label} <span className="font-bold">({n})</span></span>
                        <span className="text-xs" style={{color:T.muted}}>{where}</span>
                      </div>))}
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
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{color:T.muted}}>LEADS · enquiry, Instagram & referrals</div>
                <Btn small kind="ghost" onClick={()=>setAddLead({name:"", phone:"", source:"Walk-in", note:""})}>+ Add lead</Btn>
              </div>
              {leads.map(l=>{ const wa = (l.phone||"").replace(/\D/g,""); return (
                <Card key={l.id} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{l.name} {l.phone && <span className="text-xs font-normal" style={{color:T.muted}}>· +65 {l.phone}</span>}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.line}}>{l.source}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{color:T.muted}}>{l.note}</div>
                  {/* one-tap contact-back */}
                  <div className="flex gap-1.5 mt-2">
                    <button disabled={!wa} onClick={()=>{ if(l.status==="new") setLeads(ls=>ls.map(x=>x.id!==l.id?x:{...x,status:"contacted"})); ping(wa?`Opening WhatsApp to +65 ${l.phone} (deep-link in production)`:"No number on file"); }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:wa?"#25D366":T.line, color:"#fff", opacity:wa?1:.5}}>WhatsApp</button>
                    <button disabled={!wa} onClick={()=>ping(wa?`Calling +65 ${l.phone}…`:"No number on file")}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{border:`1.5px solid ${T.line}`, color:wa?T.ink:T.muted}}>Call</button>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {["new","contacted","trial booked","converted","lost"].map(st=>(
                      <button key={st} onClick={()=>setLeads(ls=>ls.map(x=>x.id!==l.id?x:{...x,status:st}))}
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{background:l.status===st?T.plum:"transparent", color:l.status===st?"#fff":T.muted, border:`1px solid ${l.status===st?T.plum:T.line}`}}>{st}</button>))}
                  </div>
                </Card>);})}
              <Btn full kind="ghost" onClick={()=>ping("Instagram booking link — opens this same flow from your bio/stories")}>View Instagram booking link</Btn>
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>TRAINERS · rate + permissions</div>
              {trainers.filter(t=>!t.admin).map(t=>{ const rt=rates[t.id]; return (
                <Card key={t.id}>
                  <div className="flex items-center justify-between">
                    <div><div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs" style={{color:T.muted}}>{t.tag} · {rt ? (rt.type==="salary" ? `$${rt.monthly}/mo salary` : rt.type==="per_head" ? `$${rt.perHead}/head · $${rt.perPt}/PT` : `$${rt.perClass}/class · $${rt.perPt}/PT`) : "rate not set"}</div></div>
                    <div className="flex gap-1.5">
                      <Btn small kind="ghost" onClick={()=>setAddTrainer({editId:t.id, name:t.name, phone:t.phone||"", bio:t.bio||"", payType:rt?.type||"per_class", perClass:rt?.perClass||"", perHead:rt?.perHead||"", perPt:rt?.perPt||"", monthly:rt?.monthly||""})}>Edit</Btn>
                      <Btn small kind="ghost" onClick={()=>setPermOpen(permOpen===t.id?null:t.id)}>Perms</Btn>
                      <Btn small kind="ghost" onClick={()=>ping(`${t.name} deactivated (demo) — their sessions need reassignment`)}>Deactivate</Btn>
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
              <Btn full kind="ghost" onClick={()=>ping("CSV import — map columns, PDPA consent requested on first login")}>Import clients (CSV)</Btn>
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
                      <Btn small onClick={()=>ping(`"${tpl.name}" applied — sessions generated for upcoming weeks`)}>Apply</Btn>
                    </div>
                  </div>
                </Card>))}

              <Btn full kind="ghost" onClick={()=>ping("New product — pack / membership / coupon code")}>+ Add pack, membership or coupon</Btn>
              <div className="text-xs" style={{color:T.muted}}>Price changes never affect already-purchased packs. Template edits only affect future-generated sessions.</div>
            </div>}

            {adminSec==="money" && <div className="space-y-3">
              <Card style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="text-xs" style={{color:"#B9B5A9"}}>PAYMENT METHODS</div>
                <div className="text-sm mt-1">PayNow (UEN linked) ✓ · Card via Stripe ✓ · Cash ✓</div>
              </Card>
              {/* ---- Queue 3 of 4: REFUNDS (Decisions 2, 6, 7) ----
                   Credit back is automatic on cancellation. Money back is not: the member asks,
                   the admin approves, and only then does the credit come off and the HitPay
                   refund get triggered by hand. Never both a credit and a refund. */}
              {refundQueue.length>0 && (
                <ApprovalQueue
                  label="REFUND REQUESTS · bank refund instead of credit"
                  items={refundQueue.map(r=>({
                    id:r.id, title:`${r.who} — $${r.amt} back to bank`,
                    sub:`${r.what} · originally paid by ${r.method} · cancelled ${r.when}${r.reason?` · "${r.reason}"`:""}`,
                  }))}
                  onResolve={resolveRefund}
                  approveLabel="Approve refund" denyLabel="Deny (keep credit)" />)}

              {/* ---- Queue 4 of 4: RECEIPTS / INCIDENTALS (Decisions 6, 7) ---- */}
              {incidentals.filter(i=>i.status==="pending").length>0 && (
                <ApprovalQueue
                  label="RECEIPTS · trainer-submitted incidentals"
                  items={incidentals.filter(i=>i.status==="pending").map(i=>({
                    id:i.id, title:`${i.label} · $${i.amt}`, sub:i.note, meta:tName(i.trainer),
                  }))}
                  onResolve={resolveIncidental}
                  approveLabel="Approve" denyLabel="Deny" />)}

              {refundQueue.length===0 && incidentals.filter(i=>i.status==="pending").length===0 && (
                <div className="text-xs" style={{color:T.muted}}>
                  No refund or receipt approvals waiting. No-shows are under Clients; exception requests are under Schedule.</div>)}
              <div className="text-xs font-bold pt-1" style={{color:T.muted}}>LEDGER · export CSV for accountant</div>
              {ledger.map(l=>(
                <Card key={l.id} className="flex items-center gap-3 !p-3">
                  <div className="flex-1"><div className="text-sm font-semibold">{l.who} · {l.what}</div>
                    <div className="text-xs" style={{color:T.muted}}>{l.method} · {l.d}</div></div>
                  <div className="font-bold text-sm">${l.amt}</div>
                  <Btn small kind="ghost" onClick={()=>ping("Refund flow — full/partial or return credit, reason logged")}>Refund</Btn>
                </Card>))}
              <div className="text-xs" style={{color:T.muted}}>Trainer payouts: sessions × rate, monthly export. All actions audited.</div>
            </div>}

            {/* Round-2 [confirm] deliverable: the monthly sheet Danny hands over to pay coaches. */}
            {adminSec==="payouts" && <PayoutReport/>}

            {adminSec==="settings" && <div className="space-y-3">
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
          </main>)}

  </>);
}

