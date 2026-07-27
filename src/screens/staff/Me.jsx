import { useState } from "react";
import { useApp } from "../../state/AppState.jsx";
import MyExpenses from "../../components/MyExpenses.jsx";
import { approvedTotal } from "../../lib/expenses.js";
import { trainerScorecards } from "../../lib/analytics.js";
import { DAYS } from "../../lib/dates.js";
import { T, disp } from "../../theme.js";
import { Card, Chip, H } from "../../ui/kit.jsx";

export default function StaffMe() {
  const app = useApp();
  const { isAdmin, isClient, perm, ptBookings, rates, sessions, shifts, staffSessions, tab, trainers, user, myClaims } = app;
  const [meView, setMeView] = useState("me");
  return (<>
        {!isClient && !isAdmin && tab==="me" && (() => {
          const me = trainers.find(t=>t.id===user.id) || {name:user.name, bio:""};
          const myPerm = perm[user.id] || {};
          const myRate = rates[user.id];
          const shiftDays = [0,1,2,3,4,5,6].filter(d=>shifts[user.id]?.[d]);
          /* Own numbers only. Margin, cost ratio and any cross-coach ranking stay in
             the admin console — a coach seeing how their margin compares to a
             colleague's is a management conversation, not a dashboard. */
          const me_ = trainerScorecards(app).find(c => c.id === user.id) || {};
          const owed = myClaims.filter(c => c.status === "approved").reduce((t, c) => t + approvedTotal(c), 0);
          const drafts = myClaims.filter(c => c.status === "draft").length;
          return (
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-5 space-y-3">
            <H>Me</H>
            {/* Expenses are a real part of a coach's account, not a button hidden on
                another screen. The badge is what makes an unfinished draft or unpaid
                claim visible instead of forgotten. */}
            <div className="flex gap-2">
              {[["me","My week"],["expenses","Expenses"]].map(([k,l])=>(
                <Chip key={k} active={meView===k} onClick={()=>setMeView(k)}>
                  {l}{k==="expenses" && (owed>0||drafts>0) ? ` · ${owed>0?`$${owed.toFixed(0)}`:`${drafts} draft`}` : ""}
                </Chip>))}
            </div>
            {meView==="expenses" && <MyExpenses/>}
            {meView==="me" && (<>
            <Card><div className="font-bold">{me.name}</div><div className="text-xs" style={{color:T.muted}}>{me.tag||"Coach"}</div>
              {me.bio && <div className="text-xs mt-2" style={{color:T.muted}}>{me.bio}</div>}</Card>
            <Card><div className="text-xs font-bold mb-1" style={{color:T.muted}}>THIS WEEK</div>
              <div className="text-sm">{staffSessions(user.id).length} sessions · PT shift {shiftDays.length? shiftDays.map(d=>`${DAYS[d]} ${shifts[user.id][d][0]}–${shifts[user.id][d][1]}`).join(" · ") : "not set"}</div>
              <div className="text-xs mt-1" style={{color:T.muted}}>Bookable for PT at any location during shift hours.</div></Card>
            {/* Own scorecard — motivating and actionable. No margin, no ranking. */}
            <Card>
              <div className="text-xs font-bold mb-2" style={{color:T.muted}}>MY NUMBERS · this week</div>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[["Classes", me_.delivered ?? 0, `${me_.classes ?? 0} scheduled`],
                  ["Fill", `${me_.fillRate ?? 0}%`, "seats taken"],
                  ["Attend", `${me_.attendanceRate ?? 0}%`, "turned up"],
                  ["PT", `${me_.ptDone ?? 0}`, `of ${me_.ptBooked ?? 0}`]].map(([l,v,sub])=>(
                  <div key={l} className="rounded-xl py-2" style={{background:"#FBF3EC"}}>
                    <div className="text-[9px] font-bold" style={{color:T.muted}}>{l.toUpperCase()}</div>
                    <div style={{...disp,fontWeight:800,fontSize:18}}>{v}</div>
                    <div className="text-[9px]" style={{color:T.muted}}>{sub}</div>
                  </div>))}
              </div>
              {me_.unmarked > 0 && (
                <div className="text-xs mt-2 rounded-lg p-2" style={{background:"#F7EEE9", color:T.ink}}>
                  <b style={{color:T.accent}}>{me_.unmarked} session{me_.unmarked===1?"":"s"} not marked.</b> You
                  aren't paid for a class until attendance is taken — mark them under Today.
                </div>)}
              {me_.travelHrs > 0 && (
                <div className="text-[11px] mt-2" style={{color:T.muted}}>
                  {me_.travelHrs}h travelling between venues this week. Raise it with Danny if that's not working.
                </div>)}
            </Card>

            <Card><div className="text-xs font-bold mb-1" style={{color:T.muted}}>EARNINGS</div>
              <div className="text-sm" style={{color:T.muted}}>{myPerm.earnings
                ? (myRate?.type==="salary" ? `Salary $${myRate.monthly}/mo` : `${staffSessions(user.id).length} classes + ${ptBookings.filter(b=>b.trainer===user.id).length} PT this week`)
                : "Hidden — enabled by admin per trainer"}</div></Card>
            <div className="text-xs text-center" style={{color:T.muted}}>Permissions set by the admin. Currently: attendance ✓, availability ✓, edit descriptions {myPerm.editDesc?"✓":"✗"}.</div>
            </>)}
          </main>);})()}

  </>);
}

