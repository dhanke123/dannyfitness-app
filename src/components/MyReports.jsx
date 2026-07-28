/* Me → My Reports — a coach's own numbers.
 *
 * The coach log and the payout report live in the admin console, which is correct for
 * the admin and useless for the coach: the person who actually ran the sessions had no
 * way to see their own week back. "Where does my time go?" and "who am I actually
 * training?" are the coach's questions, and neither had an answer anywhere.
 *
 * SCOPED TO SELF, AND ONLY SELF. The coach id is fixed from `user.id` and never
 * offered as a picker — the admin's version has the dropdown. A coach comparing their
 * hours against a colleague's is a management conversation, not a dashboard, which is
 * the same line already drawn in the Me scorecard (margin and cost ratio stay admin-only).
 *
 * Earnings are deliberately NOT here. There is an existing per-coach `earnings`
 * permission and most coaches don't have it; putting pay on this screen would route
 * round that decision rather than implement it.
 */

import { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { resolveRange } from "../lib/period.js";
import { WORK_FILTERS, ampm, coachWorkRows, filterWork, groupByDay, workCounts } from "../lib/worklog.js";
import { DAYS, toISO } from "../lib/dates.js";
import { downloadBlob, slug } from "../lib/intake.js";
import RangeBar from "./RangeBar.jsx";
import { T, disp } from "../theme.js";
import { Btn, Card } from "../ui/kit.jsx";

const TABS = [["log", "My sessions"], ["load", "Hours & load"], ["clients", "My clients"]];

export default function MyReports() {
  const { camps, clientGroups, groupPacks, locName, ping, ptBookings, sessionLog,
          sessions, tName, user } = useApp();
  const [tab, setTab] = useState("log");
  const [rangeSel, setRangeSel] = useState({ key: "mtd", from: "", to: "" });
  const [filter, setFilter] = useState("past");
  const range = useMemo(() => resolveRange(rangeSel.key, rangeSel), [rangeSel]);
  const todayIso = toISO(new Date());

  const ctx = { sessions, ptBookings, camps, sessionLog, groupPacks, clientGroups, locName, tName };
  /* user.id, always. No picker — this screen is one coach's own record. */
  const all = useMemo(() => coachWorkRows(user?.id, range, ctx),
    [user, range, sessions, ptBookings, camps, sessionLog, groupPacks, clientGroups]);
  const rows = useMemo(() => filterWork(all, filter), [all, filter]);
  const days = useMemo(() => groupByDay(rows), [rows]);
  const counts = workCounts(rows);
  const filterMeta = WORK_FILTERS.find(f => f.key === filter) || WORK_FILTERS[0];

  /* ---- hours and load ----
     Sessions counted is not the same as time spent: a 45-minute PT and a two-hour
     camp block both count as one. Hours is what actually answers "where does my week
     go", so it is computed from durations, not from row counts. */
  const load = useMemo(() => {
    const live = rows.filter(r => !r.cancelled);
    const mins = (r) => r.kind === "camp" ? (r.hours || 1) * 60
      : r.kind === "class" ? 60 : 45;
    const byKind = { pt: 0, class: 0, camp: 0 };
    const byDay = Array(7).fill(0);
    const byHour = {};
    live.forEach(r => {
      const m = mins(r);
      const k = r.kind === "class" ? "class" : r.kind === "camp" ? "camp" : "pt";
      byKind[k] += m;
      if (r.day != null) byDay[r.day] += m;
      const h = parseInt(String(r.time || "0").split(":")[0], 10);
      if (Number.isFinite(h)) byHour[h] = (byHour[h] || 0) + 1;
    });
    const total = byKind.pt + byKind.class + byKind.camp;
    const busiestDay = byDay.indexOf(Math.max(...byDay));
    const hourEntries = Object.entries(byHour).sort((a, b) => b[1] - a[1]);
    return { byKind, byDay, total,
      busiestDay: Math.max(...byDay) > 0 ? busiestDay : null,
      busiestHour: hourEntries[0] ? Number(hourEntries[0][0]) : null,
      hourEntries: hourEntries.slice(0, 4),
      /* Pax per hour: the honest measure of a coach's day. Two weeks with the same
         hours can be very different work. */
      paxPerHour: total > 0 ? Math.round((counts.pax / (total / 60)) * 10) / 10 : 0 };
  }, [rows, counts.pax]);

  /* ---- my clients ---- */
  const myClients = useMemo(() => {
    const m = {};
    rows.filter(r => !r.cancelled && r.kind !== "camp" && r.kind !== "class").forEach(r => {
      m[r.name] = m[r.name] || { who: r.name, n: 0, last: "", pax: r.pax || 1 };
      m[r.name].n += 1;
      if ((r.iso || "") > m[r.name].last) m[r.name].last = r.iso || "";
    });
    return Object.values(m).sort((a, b) => b.n - a.n);
  }, [rows]);

  const exportCsv = () => {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [[`${tName(user?.id)} — my sessions`, range.label, `${range.from} to ${range.to}`, filterMeta.label].map(q).join(","), "",
      ["Date", "Time", "Name", "Remarks", "Number of Pax"].map(q).join(",")];
    days.forEach(d => {
      d.rows.forEach((r, i) => lines.push([q(i === 0 ? d.label : ""), q(ampm(r.time)), q(r.name), q(r.remark),
        r.pax == null ? "" : String(r.pax)].join(",")));
      lines.push("");
    });
    lines.push(["TOTAL", "", `${counts.total} sessions`, `${(load.total / 60).toFixed(1)} hours`, String(counts.pax)].map(q).join(","));
    downloadBlob(`my-sessions-${slug(tName(user?.id))}-${range.from}_to_${range.to}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
    ping("Your sessions exported");
  };

  const hrs = (m) => `${(m / 60).toFixed(1)}h`;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{ background: tab === k ? T.ink : T.card, color: tab === k ? T.paper : T.ink,
              border: `1.5px solid ${tab === k ? T.ink : T.line}` }}>{l}</button>))}
      </div>

      <RangeBar value={rangeSel} onChange={setRangeSel} range={range} allowFuture
        note="Your own record only." />

      <div className="flex gap-1.5 flex-wrap">
        {WORK_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
            style={{ background: filter === f.key ? T.ink : "transparent", color: filter === f.key ? T.paper : T.ink,
              border: `1.5px solid ${filter === f.key ? T.ink : T.line}` }}>
            {f.label}<span style={{ opacity: .65 }}> {filterWork(all, f.key).filter(r => !r.cancelled).length}</span>
          </button>))}
      </div>
      {filter === "unmarked" && counts.total > 0 && (
        <div className="text-[11px] rounded-lg p-2" style={{ background: "#F7EEE9", color: T.accent }}>
          ⚠ {counts.total} session{counts.total === 1 ? "" : "s"} you haven't marked. Unmarked work isn't
          paid — the payout run only counts what's confirmed delivered.
        </div>)}

      <div className="grid grid-cols-4 gap-1.5 text-center">
        {[["Sessions", counts.total], ["Hours", hrs(load.total)], ["Pax", counts.pax],
          ["Per hour", load.paxPerHour || "—"]].map(([l, n]) => (
          <div key={l} className="rounded-lg py-1.5" style={{ background: "#FBF3EC" }}>
            <div className="text-[10px] font-bold" style={{ color: T.muted }}>{l}</div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 16 }}>{n}</div>
          </div>))}
      </div>

      {/* ---------- MY SESSIONS ---------- */}
      {tab === "log" && (<>
        <Card className="!p-0 overflow-hidden">
          <div className="flex text-[10px] font-bold px-3 py-2"
            style={{ background: "#F4F2EC", color: T.muted, borderBottom: `1.5px solid ${T.line}` }}>
            <span style={{ width: 58 }}>TIME</span><span className="flex-1">NAME</span>
            <span style={{ width: 30, textAlign: "right" }}>PAX</span>
          </div>
          {days.length === 0 && (
            <div className="px-3 py-4 text-xs" style={{ color: T.muted }}>
              Nothing {filter === "all" ? "" : `${filterMeta.label.toLowerCase()} `}in {range.label.toLowerCase()}.
            </div>)}
          {days.map(d => (
            <div key={d.label}>
              <div className="px-3 py-1.5 text-xs font-bold"
                style={{ ...disp, background: "#FBF7F0", borderBottom: `1px solid ${T.line}` }}>{d.label}</div>
              {d.rows.map(r => (
                <div key={r.key} className="flex items-start gap-2 px-3 py-1.5 text-xs"
                  style={{ borderBottom: `1px solid ${T.line}`, opacity: r.cancelled ? .55 : 1 }}>
                  <span style={{ width: 58, color: T.muted, flexShrink: 0 }}>{ampm(r.time)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold" style={{ textDecoration: r.cancelled ? "line-through" : "none" }}>{r.name}</span>
                    {r.where && <span style={{ color: T.muted }}> · {r.where}</span>}
                    {r.remark && <div className="text-[11px]" style={{ color: r.cancelled ? T.accent : T.muted }}>{r.remark}</div>}
                  </span>
                  <span className="font-bold" style={{ width: 30, textAlign: "right", flexShrink: 0 }}>{r.pax ?? ""}</span>
                </div>))}
            </div>))}
        </Card>
        <Btn full kind="dark" onClick={exportCsv}>Export my sessions · {range.label}</Btn>
      </>)}

      {/* ---------- HOURS & LOAD ---------- */}
      {tab === "load" && (<>
        <Card>
          <div className="text-xs font-bold mb-2" style={{ color: T.muted }}>WHERE THE TIME GOES</div>
          {load.total === 0 ? (
            <div className="text-sm" style={{ color: T.muted }}>No hours in this period.</div>
          ) : (<>
            {[["PT", load.byKind.pt, T.accent], ["Classes", load.byKind.class, T.blue], ["Camps", load.byKind.camp, T.moss]]
              .filter(([, m]) => m > 0).map(([l, m, c]) => (
              <div key={l} className="mb-1.5">
                <div className="flex justify-between text-xs mb-0.5">
                  <span>{l}</span>
                  <span style={{ color: T.muted }}>{hrs(m)} · {Math.round((m / load.total) * 100)}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: T.line, overflow: "hidden" }}>
                  <div style={{ width: `${(m / load.total) * 100}%`, height: "100%", background: c }}/>
                </div>
              </div>))}
            {/* Sessions and hours are different questions, and the gap between them is
                the point: five PT hours and five camp hours are not the same week. */}
            <div className="text-[11px] mt-2" style={{ color: T.deep }}>
              {counts.total} sessions came to <b>{hrs(load.total)}</b>. A 45-minute PT and a
              two-hour camp block both count as one session — hours is what actually says how
              full the week was.
            </div>
          </>)}
        </Card>

        {load.total > 0 && (
          <Card>
            <div className="text-xs font-bold mb-2" style={{ color: T.muted }}>BY DAY</div>
            <div className="flex items-end gap-1" style={{ height: 70 }}>
              {load.byDay.map((m, i) => {
                const max = Math.max(...load.byDay) || 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
                    <div className="text-[9px]" style={{ color: T.muted }}>{m > 0 ? hrs(m) : ""}</div>
                    <div style={{ width: "100%", height: `${(m / max) * 100}%`, minHeight: m > 0 ? 3 : 0,
                      background: i === load.busiestDay ? T.accent : T.line, borderRadius: 3 }}/>
                    <div className="text-[9px] mt-0.5" style={{ color: T.muted }}>{DAYS[i]}</div>
                  </div>);
              })}
            </div>
            {load.busiestDay != null && (
              <div className="text-[11px] mt-2" style={{ color: T.deep }}>
                Busiest day is <b>{DAYS[load.busiestDay]}</b>
                {load.busiestHour != null && <> · most sessions start around <b>{ampm(`${String(load.busiestHour).padStart(2,"0")}:00`)}</b></>}.
              </div>)}
          </Card>)}
      </>)}

      {/* ---------- MY CLIENTS ---------- */}
      {tab === "clients" && (
        <Card className="!p-3">
          <div className="text-xs font-bold mb-1.5" style={{ color: T.muted }}>
            WHO I TRAINED · {myClients.length} {myClients.length === 1 ? "person or group" : "people and groups"}</div>
          {myClients.length === 0 && (
            <div className="text-sm" style={{ color: T.muted }}>No one-to-one or group sessions in this period.</div>)}
          {myClients.map(c => (
            <div key={c.who} className="flex items-center justify-between py-1.5"
              style={{ borderTop: `1px solid ${T.line}` }}>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{c.who}</div>
                {c.last && <div className="text-[11px]" style={{ color: T.muted }}>last seen {c.last}</div>}
              </div>
              <div className="text-sm font-bold">{c.n}</div>
            </div>))}
          {myClients.length > 0 && (
            <div className="text-[11px] mt-2" style={{ color: T.muted }}>
              Class rosters aren't counted here — this is the people you coach directly.
            </div>)}
        </Card>)}
    </div>);
}
