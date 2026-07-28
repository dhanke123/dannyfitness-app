/* CoachDayLog — the coach's diary, and the sheet the admin actually reads before paying.
 *
 * This is the in-app equivalent of the Google Sheet Danny keeps today:
 *
 *     Date            Time      Name                  Remarks            Number of Sessions
 *     Wed, Jul 1      6:15 AM   Swati & Supriya
 *                     7:05 AM   Bootcamp
 *                     8:00 AM   Manish
 *                     10:30 AM  Holiday camp
 *                     7:00 PM   Shreyans & Pooja                                 8
 *
 * WHY IT ISN'T THE PAYOUT REPORT. Payouts answers "what do I owe this coach?" — it
 * groups by coach, applies a rate card and produces money. This answers the question
 * that comes *before* it: "what did this coach actually do?" The admin reads the diary
 * to check the work happened, then reads the payout to pay for it. Collapsing the two
 * loses the check: a rate-card total with nothing to verify it against is a number you
 * either trust or don't.
 *
 * Everything the coach ran appears, not just the payable work. The paper sheet lists
 * "Bootcamp" and "Holiday camp" beside named clients because it is a record of the
 * day, not an invoice.
 *
 * NUMBER OF SESSIONS = the pack balance left AFTER that session, and it appears only
 * on rows that draw from a pack. That matches the sheet: Shreyans & Pooja and
 * Mable & Wendy & Helen both read 8 against 10-session packs with 2 used. Writing it
 * by hand is how a balance drifts from the truth, so it is computed.
 */

import { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { CT } from "../data/seed.js";
import { DAYS, dateFor, toMin } from "../lib/dates.js";
import { PT_DUR, sessTrainers } from "../lib/scheduling.js";
import { downloadBlob, slug } from "../lib/intake.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Chip, Select } from "../ui/kit.jsx";

/* "6:15 AM" — the sheet's format, not 24h. The admin is reconciling against a paper
   printout and a WhatsApp message from the coach; matching the format they already
   read is most of what makes a report checkable. */
const ampm = (hhmm) => {
  const m = toMin(hhmm || "00:00");
  const h24 = Math.floor(m / 60), mi = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mi).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
};
const dayLabel = (weekOff, day) =>
  dateFor(weekOff, day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function CoachDayLog() {
  const { camps, clientGroups, groupPacks, locName, ping, ptBookings, sessionLog,
          sessions, tName, trainers, user, isAdmin } = useApp();

  const coaches = trainers.filter(t => !t.admin);
  /* A coach opening this sees their own log. An admin picks. */
  const [coach, setCoach] = useState(() =>
    (!isAdmin && coaches.some(c => c.id === user?.id)) ? user.id : (coaches[0]?.id || ""));
  const [weeks, setWeeks] = useState(1);   // how many weeks of the recurring timetable to lay out

  /* Pack balance for a named client or group, as it stands now. The sheet records
     the balance at the time of the session; the demo has one balance per pack, so
     this is the current one. Server-side this reads the pack ledger at that date. */
  const packFor = (name) => groupPacks.find(p => p.name === name)
    || groupPacks.find(p => clientGroups.find(g => g.id === p.groupId)?.name === name);

  const rows = useMemo(() => {
    if (!coach) return [];
    const out = [];

    for (let w = 0; w < weeks; w++) {
      // ---- classes and bootcamps this coach is on ----
      sessions.filter(s => sessTrainers(s).includes(coach))
        .filter(s => (s.weekOff ?? w) === w || s.weekOff == null)   // seed rows recur weekly
        .forEach(s => {
          const attended = (s.attendees || []).filter(a => a.status === "attended").length;
          const booked = (s.attendees || []).length;
          out.push({
            key: `s${s.id}w${w}`, w, day: s.day, time: s.time,
            name: CT[s.type]?.name || "Class",
            kind: "class",
            where: locName(s.loc),
            remark: [
              s.status === "cancelled" ? `CANCELLED${s.cancelReason ? ` — ${s.cancelReason}` : ""}` : "",
              sessTrainers(s).length > 1 ? `with ${sessTrainers(s).filter(x => x !== coach).map(tName).join(", ")}` : "",
              s.done ? `${attended} of ${booked} attended` : booked ? `${booked} booked, attendance not marked` : "",
            ].filter(Boolean).join(" · "),
            cancelled: s.status === "cancelled",
            sessionsLeft: null,
          });
        });

      // ---- PT and group PT ----
      ptBookings.filter(b => b.trainer === coach && (b.weekOff ?? 0) === w)
        .forEach(b => {
          const who = b.forGroup || b.who || "Client";
          const pack = packFor(who);
          out.push({
            key: `p${b.id}w${w}`, w, day: b.day, time: b.time,
            name: who,
            kind: b.forGroup ? "grouppt" : "pt",
            where: b.otherLabel || locName(b.loc),
            remark: [
              b.status === "cancelled" ? "CANCELLED" : "",
              b.status === "done" ? "completed" : b.status === "cancelled" ? "" : "not marked complete",
            ].filter(Boolean).join(" · "),
            cancelled: b.status === "cancelled",
            // only pack-backed sessions carry a balance — same as the paper sheet
            sessionsLeft: pack ? pack.size - pack.used : null,
          });
        });

      // ---- camps: "Holiday camp" on the sheet ----
      camps.forEach(c => (c.days || []).forEach((cd, i) => {
        const abs = (c.startInDays ?? 0) + i;
        const day = ((abs % 7) + 7) % 7;
        if (Math.floor(abs / 7) !== w) return;
        (cd.sessions || []).forEach(cs => {
          const coaches2 = cs.trainers || (cs.trainer ? [cs.trainer] : []);
          if (!coaches2.includes(coach)) return;
          out.push({
            key: `c${c.id}${i}${cs.start}w${w}`, w, day, time: cs.start,
            name: c.name, kind: "camp", where: locName(c.loc),
            remark: [cd.label, cs.activity, `${cs.hours}h`].filter(Boolean).join(" · "),
            cancelled: false, sessionsLeft: null,
          });
        });
      }));
    }

    /* Backfilled history (the per-client sheet tabs) belongs here too — a session
       the coach ran but that was entered by hand is still work done, and leaving it
       out is how the diary and the client's own history disagree. */
    sessionLog.filter(l => l.tookBy === coach).forEach(l => {
      const pack = packFor(l.who);
      out.push({
        key: `l${l.id}`, w: null, day: null, time: l.time, dateText: l.date,
        name: l.who, kind: "logged", where: "", remark: l.remark || "recorded from history",
        cancelled: false, sessionsLeft: pack ? pack.size - pack.used : null,
      });
    });

    return out.sort((a, b) => {
      if (a.w === null) return 1;            // hand-entered history sits after the timetable
      if (b.w === null) return -1;
      return (a.w - b.w) || (a.day - b.day) || (toMin(a.time) - toMin(b.time));
    });
  }, [coach, weeks, sessions, ptBookings, camps, sessionLog, groupPacks, clientGroups]);

  /* Grouped by date, so the date prints once — exactly how the sheet reads. */
  const days = useMemo(() => {
    const m = [];
    rows.forEach(r => {
      const label = r.dateText || dayLabel(r.w, r.day);
      const last = m[m.length - 1];
      if (last && last.label === label) last.rows.push(r);
      else m.push({ label, rows: [r] });
    });
    return m;
  }, [rows]);

  const live = rows.filter(r => !r.cancelled);
  const counts = {
    total: live.length,
    pt: live.filter(r => r.kind === "pt" || r.kind === "grouppt" || r.kind === "logged").length,
    classes: live.filter(r => r.kind === "class").length,
    camps: live.filter(r => r.kind === "camp").length,
  };

  const exportCsv = () => {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Date", "Time", "Name", "Remarks", "Number of Sessions"].map(q).join(",")];
    days.forEach(d => {
      d.rows.forEach((r, i) => lines.push([
        q(i === 0 ? d.label : ""),          // date printed once per day, like the sheet
        q(ampm(r.time)), q(r.name), q(r.remark),
        r.sessionsLeft == null ? "" : String(r.sessionsLeft),
      ].join(",")));
      lines.push("");                        // the blank row between days
    });
    downloadBlob(`coach-log-${slug(tName(coach))}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
    ping(`${tName(coach)}'s log exported — same columns as the sheet`);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Select value={coach} onChange={setCoach}
          options={coaches.map(t => [t.id, t.name])} style={{ flex: 1 }} />
        {[[1, "1 week"], [2, "2 weeks"], [4, "4 weeks"]].map(([n, l]) => (
          <Chip key={n} active={weeks === n} onClick={() => setWeeks(n)}>{l}</Chip>))}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[["Sessions", counts.total], ["PT", counts.pt], ["Classes", counts.classes], ["Camp days", counts.camps]]
          .map(([l, n]) => (
          <div key={l} className="rounded-lg py-1.5" style={{ background: "#FBF3EC" }}>
            <div className="text-[10px] font-bold" style={{ color: T.muted }}>{l}</div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 18 }}>{n}</div>
          </div>))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex text-[10px] font-bold px-3 py-2"
          style={{ background: "#F4F2EC", color: T.muted, borderBottom: `1.5px solid ${T.line}` }}>
          <span style={{ width: 62 }}>TIME</span>
          <span className="flex-1">NAME</span>
          <span style={{ width: 34, textAlign: "right" }}>LEFT</span>
        </div>

        {days.length === 0 && (
          <div className="px-3 py-4 text-xs" style={{ color: T.muted }}>
            Nothing scheduled for {tName(coach)} in this period.
          </div>)}

        {days.map(d => (
          <div key={d.label}>
            <div className="px-3 py-1.5 text-xs font-bold"
              style={{ ...disp, background: "#FBF7F0", borderBottom: `1px solid ${T.line}` }}>{d.label}</div>
            {d.rows.map(r => (
              <div key={r.key} className="flex items-start gap-2 px-3 py-1.5 text-xs"
                style={{ borderBottom: `1px solid ${T.line}`, opacity: r.cancelled ? 0.55 : 1 }}>
                <span style={{ width: 62, color: T.muted, flexShrink: 0 }}>{ampm(r.time)}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold" style={{ textDecoration: r.cancelled ? "line-through" : "none" }}>{r.name}</span>
                  {r.where && <span style={{ color: T.muted }}> · {r.where}</span>}
                  {r.remark && (
                    <div className="text-[11px]" style={{ color: r.cancelled ? T.accent : T.muted }}>{r.remark}</div>)}
                </span>
                <span className="font-bold" style={{ width: 34, textAlign: "right", flexShrink: 0,
                  color: r.sessionsLeft != null && r.sessionsLeft <= 2 ? T.accent : T.ink }}>
                  {r.sessionsLeft == null ? "" : r.sessionsLeft}
                </span>
              </div>))}
          </div>))}
      </Card>

      <Btn full kind="dark" onClick={exportCsv}>Export {tName(coach)}'s log</Btn>

      <Card style={{ background: "#F4F7F3" }}>
        <div className="text-[11px]" style={{ color: T.deep }}>
          <b>Number of sessions</b> is the pack balance left after that session, and only appears on
          sessions that draw from a pack — the same rule as the sheet. It is computed from the pack,
          not typed, so it can't drift.
          <div className="mt-1.5">
            This is the diary, not the invoice. Read it to check the work happened, then use
            <b> Payouts</b> to pay for it.
          </div>
        </div>
      </Card>
    </div>);
}
