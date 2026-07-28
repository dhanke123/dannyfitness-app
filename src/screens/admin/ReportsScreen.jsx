/* Reports promoted to the admin bottom nav, between Clients and Manage.
 *
 * It was buried inside Manage alongside settings and product editing — but
 * reporting is something Danny does *regularly* and configuration is something he
 * does *rarely*. Nav position should follow frequency of use, not tidiness of
 * grouping. Payouts lives here too: it's a report, not a setting.
 */

import { useApp } from "../../state/AppState.jsx";
import Reports from "../../components/Reports.jsx";
import PayoutReport from "../../components/PayoutReport.jsx";
import CoachDayLog from "../../components/CoachDayLog.jsx";
import { T } from "../../theme.js";
import { Chip, H } from "../../ui/kit.jsx";

export default function AdminReports() {
  const { isAdmin, reportView, setReportView, tab, sessionLog, groupPacks, tName } = useApp();
  if (!isAdmin || tab !== "reports") return null;
  // "money" was a valid view until Money owed moved; fall back rather than blank.
  const view = reportView === "money" ? "analytics" : reportView;
  /* Utilization by PERSON — group sessions produce one row per attendee, so this
     counts individuals correctly even when they train in pairs/trios. */
  const byPerson = Object.values(sessionLog.reduce((m, l) => {
    m[l.who] = m[l.who] || { who: l.who, n: 0 };
    m[l.who].n += 1; return m;
  }, {})).sort((a, b) => b.n - a.n).slice(0, 8);
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-5">
      <H>Reports</H>
      {/* Coach log sits BEFORE Payouts deliberately: it answers "what did they do?",
          which is the question the admin has to settle before "what do I owe them?". */}
      <div className="flex gap-2 pb-3 overflow-x-auto">
        {[["analytics", "Analytics"], ["coachlog", "Coach log"], ["payouts", "Payouts"]].map(([k, l]) => (
          <Chip key={k} active={view === k} onClick={() => setReportView(k)}>{l}</Chip>))}
      </div>
      {view === "analytics" && byPerson.length > 0 && (
        <div className="rounded-xl p-3 mb-3" style={{border:`1.5px solid ${T.line}`, background:"#FBF9F4"}}>
          <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>SESSIONS BY PERSON · from the session log</div>
          {byPerson.map(p => (
            <div key={p.who} className="flex items-center justify-between text-sm py-0.5">
              <span>{p.who}</span><span className="font-bold">{p.n}</span>
            </div>))}
          <div className="text-[11px] mt-1.5" style={{color:T.muted}}>
            Group sessions count each attendee individually. Shared packs outstanding:{" "}
            {groupPacks.map(g=>`${g.name} ${g.size-g.used}`).join(" · ")}.
          </div>
        </div>)}
      {/* Money owed moved to Manage → Approvals (28 Jul). Arrears is something you ACT
          on, not something you read, and it belongs beside the other decisions rather
          than in a drawer of reports. */}
      {view === "payouts" ? <PayoutReport/>
        : view === "coachlog" ? <CoachDayLog/>
        : <Reports/>}
      <div className="text-[11px] text-center mt-4" style={{ color: T.muted }}>
        Every section exports to CSV. Coach log is the diary of what was run; Payouts is what
        that work is worth.
      </div>
    </main>);
}
