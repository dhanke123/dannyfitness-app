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
import { T } from "../../theme.js";
import { Chip, H } from "../../ui/kit.jsx";

export default function AdminReports() {
  const { isAdmin, reportView, setReportView, tab } = useApp();
  if (!isAdmin || tab !== "reports") return null;
  return (
    <main className="flex-1 overflow-y-auto pb-24 px-5">
      <H>Reports</H>
      <div className="flex gap-2 pb-3">
        {[["analytics", "Analytics"], ["payouts", "Payouts"]].map(([k, l]) => (
          <Chip key={k} active={reportView === k} onClick={() => setReportView(k)}>{l}</Chip>))}
      </div>
      {reportView === "payouts"
        ? <PayoutReport/>
        : <Reports/>}
      <div className="text-[11px] text-center mt-4" style={{ color: T.muted }}>
        Every section exports to CSV. Payouts is the sheet you hand over to pay coaches.
      </div>
    </main>);
}
