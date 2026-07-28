/* CoachDayLog — the coach's diary, and the sheet the admin reads before paying.
 *
 * The in-app equivalent of the Google Sheet Danny keeps today:
 *
 *     Date            Time      Name                  Remarks            Number of Sessions
 *     Wed, Jul 1      6:15 AM   Swati & Supriya
 *                     7:05 AM   Bootcamp
 *                     8:00 AM   Manish
 *                     10:30 AM  Holiday camp
 *                     7:00 PM   Shreyans & Pooja                                 8
 *
 * WHY IT ISN'T THE PAYOUT REPORT. Payouts answers "what do I owe this coach?" — it
 * applies a rate card and produces money. This answers the question that comes
 * first: "what did this coach actually do?" The admin reads the diary to check the
 * work happened, then reads the payout to pay for it. Collapse the two and you lose
 * the check: a rate-card total with nothing to verify it against is a number you
 * either trust or don't.
 *
 * Both now read the SAME rows from `lib/worklog.js` over the SAME range, so they
 * cannot describe different weeks.
 *
 * Everything the coach ran appears, not only the payable work — the paper sheet
 * lists "Bootcamp" and "Holiday camp" beside named clients because it is a record of
 * the day, not an invoice.
 *
 * NUMBER OF SESSIONS = the pack balance left after that session, and only on rows
 * that draw from a pack. Confirmed against the sheet: Shreyans & Pooja and
 * Mable & Wendy & Helen both read 8, and both packs are 10 with 2 used. Computed,
 * never typed — a hand-written balance drifts.
 */

import { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { resolveRange } from "../lib/period.js";
import { toISO } from "../lib/dates.js";
import { WORK_FILTERS, ampm, coachWorkRows, filterWork, groupByDay, workCounts } from "../lib/worklog.js";
import { downloadBlob, slug } from "../lib/intake.js";
import RangeBar from "./RangeBar.jsx";
import { T, disp } from "../theme.js";
import { Btn, Card, Select } from "../ui/kit.jsx";

export default function CoachDayLog() {
  const { camps, clientGroups, groupPacks, locName, ping, ptBookings, sessionLog,
          sessions, tName, trainers, user, isAdmin } = useApp();

  const coaches = trainers.filter(t => !t.admin);
  /* A coach opening this sees their own log; an admin picks. */
  const [coach, setCoach] = useState(() =>
    (!isAdmin && coaches.some(c => c.id === user?.id)) ? user.id : (coaches[0]?.id || ""));
  /* Defaults to the current month: a payout run is monthly, and landing on the
     period you are about to pay for beats landing on one you aren't. */
  const [rangeSel, setRangeSel] = useState({ key: "mtd", from: "", to: "" });
  const range = useMemo(() => resolveRange(rangeSel.key, rangeSel), [rangeSel]);
  /* Defaults to Past: the reason to open this is usually the payout run, and a total
     that quietly includes sessions that haven't happened yet is the wrong number to
     pay from. Future is one tap away when the question is the forecast instead. */
  const [filter, setFilter] = useState("past");
  const todayIso = toISO(new Date());

  const ctx = { sessions, ptBookings, camps, sessionLog, groupPacks, clientGroups, locName, tName };
  const all = useMemo(() => coachWorkRows(coach, range, ctx),
    [coach, range, sessions, ptBookings, camps, sessionLog, groupPacks, clientGroups]);
  const rows = useMemo(() => filterWork(all, filter), [all, filter]);
  const days = useMemo(() => groupByDay(rows), [rows]);
  const counts = workCounts(rows);
  const filterMeta = WORK_FILTERS.find(f => f.key === filter) || WORK_FILTERS[0];

  const exportCsv = () => {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      [`ExerciseOnly — coach log`, tName(coach), range.label,
       `${range.from} to ${range.to}`, `view: ${filterMeta.label}`].map(q).join(","),
      "",
      // The sheet's five columns, plus pax — an hour with 1 and an hour with 14 are
      // indistinguishable without it.
      ["Date", "Time", "Name", "Remarks", "Number of Pax", "Number of Sessions"].map(q).join(","),
    ];
    days.forEach(d => {
      d.rows.forEach((r, i) => lines.push([
        q(i === 0 ? d.label : ""),          // date printed once per day, like the sheet
        q(ampm(r.time)), q(r.name), q(r.remark),
        r.pax == null ? "" : String(r.pax),
        r.sessionsLeft == null ? "" : String(r.sessionsLeft),
      ].join(",")));
      lines.push("");                        // the blank row between days
    });
    lines.push(["TOTAL", "", `${counts.total} sessions`,
      `${counts.pt} PT · ${counts.classes} classes · ${counts.camps} camp days`,
      String(counts.pax), ""].map(q).join(","));
    downloadBlob(`coach-log-${slug(tName(coach))}-${slug(filterMeta.label)}-${range.from}_to_${range.to}.csv`,
      lines.join("\n"), "text/csv;charset=utf-8");
    ping(`${tName(coach)} · ${range.label} · ${filterMeta.label} exported`);
  };

  return (
    <div className="space-y-3">
      <Select value={coach} onChange={setCoach}
        options={coaches.map(t => [t.id, t.name])} style={{ width: "100%" }} />

      {/* The same control every other report uses. A payout period picked one way on
          one screen and another way on the next is how two reports disagree about
          the same month. */}
      <RangeBar value={rangeSel} onChange={setRangeSel} range={range} allowFuture
        note="Pick a day, a week, a month, a year — or two dates." />

      {/* Looking back this is a payout document; looking forward it's a forecast.
          Same rows, two jobs — so the filter carries both axes rather than forcing
          a choice between them. */}
      <div>
        <div className="flex gap-1.5 flex-wrap">
          {WORK_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: filter === f.key ? T.ink : "transparent",
                color: filter === f.key ? T.paper : T.ink,
                border: `1.5px solid ${filter === f.key ? T.ink : T.line}` }}>
              {f.label}
              <span style={{ opacity: .65, fontWeight: 700 }}> {filterWork(all, f.key).filter(r => !r.cancelled).length}</span>
            </button>))}
        </div>
        <div className="text-[11px] mt-1.5" style={{ color: filter === "unmarked" ? T.accent : T.muted }}>
          {filterMeta.blurb}
        </div>
        {/* Every backward preset ends today, so asking for the forecast over one can
            only ever return nothing. Say why and offer the fix rather than showing an
            empty list that looks like "no sessions booked". */}
        {filter === "future" && range.to <= todayIso && (
          <div className="text-[11px] mt-1.5 rounded-lg p-2" style={{ background: "#FBF3EC", color: T.deep }}>
            This period ends today, so there is nothing ahead of it to show.{" "}
            <button onClick={() => setRangeSel({ key: "next30", from: "", to: "" })}
              className="font-bold" style={{ color: T.blue }}>Look at the next 30 days →</button>
          </div>)}
      </div>

      <div className="grid grid-cols-5 gap-1.5 text-center">
        {[["Sessions", counts.total], ["PT", counts.pt], ["Classes", counts.classes],
          ["Camps", counts.camps], ["Pax", counts.pax]]
          .map(([l, n]) => (
          <div key={l} className="rounded-lg py-1.5" style={{ background: l === "Pax" ? "#EFF3EE" : "#FBF3EC" }}>
            <div className="text-[10px] font-bold" style={{ color: T.muted }}>{l}</div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 17 }}>{n}</div>
          </div>))}
      </div>
      <div className="text-[11px] -mt-1" style={{ color: T.muted }}>
        <b>Pax</b> is people trained, not sessions run — an hour with one client and an hour with
        fourteen look the same in every other column.
      </div>
      {counts.cancelled > 0 && (
        <div className="text-[11px]" style={{ color: T.muted }}>
          {counts.cancelled} cancelled session{counts.cancelled === 1 ? "" : "s"} shown struck through and
          excluded from the counts — kept because a light week needs its reason on the same page.
        </div>)}

      <Card className="!p-0 overflow-hidden">
        <div className="flex text-[10px] font-bold px-3 py-2"
          style={{ background: "#F4F2EC", color: T.muted, borderBottom: `1.5px solid ${T.line}` }}>
          <span style={{ width: 58 }}>TIME</span>
          <span className="flex-1">NAME</span>
          <span style={{ width: 30, textAlign: "right" }}>PAX</span>
          <span style={{ width: 30, textAlign: "right" }}>LEFT</span>
        </div>

        {days.length === 0 && (
          <div className="px-3 py-4 text-xs" style={{ color: T.muted }}>
            Nothing {filter === "all" ? "" : `${filterMeta.label.toLowerCase()} `}for {tName(coach)} in {range.label.toLowerCase()}.
            {filter !== "all" && " Try All, or a wider period."}
          </div>)}

        {days.map(d => (
          <div key={d.label}>
            <div className="px-3 py-1.5 text-xs font-bold"
              style={{ ...disp, background: "#FBF7F0", borderBottom: `1px solid ${T.line}` }}>{d.label}</div>
            {d.rows.map(r => (
              <div key={r.key} className="flex items-start gap-2 px-3 py-1.5 text-xs"
                style={{ borderBottom: `1px solid ${T.line}`, opacity: r.cancelled ? 0.55 : 1 }}>
                <span style={{ width: 58, color: T.muted, flexShrink: 0 }}>{ampm(r.time)}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold" style={{ textDecoration: r.cancelled ? "line-through" : "none" }}>{r.name}</span>
                  {r.where && <span style={{ color: T.muted }}> · {r.where}</span>}
                  {r.remark && (
                    <div className="text-[11px]" style={{ color: r.cancelled ? T.accent : T.muted }}>{r.remark}</div>)}
                </span>
                <span style={{ width: 30, textAlign: "right", flexShrink: 0 }}>
                  <span className="font-bold">{r.pax ?? ""}</span>
                  {/* what the number counts differs by session type, so say which */}
                  {r.paxNote && <div className="text-[9px] leading-none" style={{ color: T.muted }}>{r.paxNote}</div>}
                </span>
                <span className="font-bold" style={{ width: 30, textAlign: "right", flexShrink: 0,
                  color: r.sessionsLeft != null && r.sessionsLeft <= 2 ? T.accent : T.ink }}>
                  {r.sessionsLeft == null ? "" : r.sessionsLeft}
                </span>
              </div>))}
          </div>))}
      </Card>

      <Btn full kind="dark" onClick={exportCsv}>Export {tName(coach)} · {range.label} · {filterMeta.label}</Btn>

      <Card style={{ background: "#F4F7F3" }}>
        <div className="text-[11px]" style={{ color: T.deep }}>
          <b>Number of sessions</b> is the pack balance left after that session, and only appears on
          sessions that draw from a pack — the same rule as the sheet. It is computed from the pack,
          not typed, so it can't drift.
          <div className="mt-1.5">
            <b>Past</b> includes today — a 6am session is finished by the time anyone opens this,
            and a payout view that silently drops the current day is how a coach ends up short.
            <b> Not marked</b> is the list to chase before running a payout; <b>Future</b> is the
            forecast, not the bill.
          </div>
          <div className="mt-1.5">
            This is the diary, not the invoice. Read it to check the work happened, then use
            <b> Payouts</b> for the same period to pay for it — both read the same rows, so they
            can't disagree.
          </div>
        </div>
      </Card>
    </div>);
}
