import { useApp } from "../../state/AppState.jsx";
import { DAYS } from "../../lib/dates.js";
import { T } from "../../theme.js";
import { Card, H } from "../../ui/kit.jsx";

export default function StaffMe() {
  const { isAdmin, isClient, perm, ptBookings, rates, sessions, shifts, staffSessions, tab, trainers, user } = useApp();
  return (<>
        {!isClient && !isAdmin && tab==="me" && (() => {
          const me = trainers.find(t=>t.id===user.id) || {name:user.name, bio:""};
          const myPerm = perm[user.id] || {};
          const myRate = rates[user.id];
          const shiftDays = [0,1,2,3,4,5,6].filter(d=>shifts[user.id]?.[d]);
          return (
          <main className="flex-1 pb-24 px-5 space-y-3">
            <H>Me</H>
            <Card><div className="font-bold">{me.name}</div><div className="text-xs" style={{color:T.muted}}>{me.tag||"Coach"}</div>
              {me.bio && <div className="text-xs mt-2" style={{color:T.muted}}>{me.bio}</div>}</Card>
            <Card><div className="text-xs font-bold mb-1" style={{color:T.muted}}>THIS WEEK</div>
              <div className="text-sm">{staffSessions(user.id).length} sessions · PT shift {shiftDays.length? shiftDays.map(d=>`${DAYS[d]} ${shifts[user.id][d][0]}–${shifts[user.id][d][1]}`).join(" · ") : "not set"}</div>
              <div className="text-xs mt-1" style={{color:T.muted}}>Bookable for PT at any location during shift hours.</div></Card>
            <Card><div className="text-xs font-bold mb-1" style={{color:T.muted}}>EARNINGS</div>
              <div className="text-sm" style={{color:T.muted}}>{myPerm.earnings
                ? (myRate?.type==="salary" ? `Salary $${myRate.monthly}/mo` : `${staffSessions(user.id).length} classes + ${ptBookings.filter(b=>b.trainer===user.id).length} PT this week`)
                : "Hidden — enabled by admin per trainer"}</div></Card>
            <div className="text-xs text-center" style={{color:T.muted}}>Permissions set by Danny (admin). Currently: attendance ✓, availability ✓, edit descriptions {myPerm.editDesc?"✓":"✗"}.</div>
          </main>);})()}

  </>);
}

