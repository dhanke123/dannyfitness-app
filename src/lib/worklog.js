/* One coach's work, over a real date range.
 *
 * WHY THIS IS A SHARED MODULE AND NOT TWO COMPONENTS.
 *
 * Two screens answer questions about the same work: the Coach log ("what did they
 * do?") and Payouts ("what do I owe them?"). The second is the first with a rate
 * card applied. If each materialised the timetable its own way they would drift —
 * one counting a cancelled class, the other not; one including camps, the other
 * silently dropping them — and the admin would be reconciling a payment against a
 * diary that disagrees with it. `period.js` makes the same argument about dates and
 * for the same reason: a payout report and a work log describing different Julys is
 * worse than only having one of them, because you can't tell which one lied.
 *
 * THE TIMETABLE PROBLEM. The app models a recurring weekly timetable — a session
 * carries a weekday and, sometimes, a `weekOff`. A payout period is real dates. So
 * this walks every date in the range, works out which (weekOffset, weekday) it is,
 * and collects what falls on it. A row with an explicit `weekOff` exists only in
 * that week; a seed row without one recurs, which is what makes the demo timetable
 * repeat. Server-side this becomes a query on `bookings.starts_at` and this whole
 * expansion disappears — which is exactly why it lives behind one function.
 */

import { ANCHOR_MON, DAYS, MS_DAY, toISO, toMin } from "./dates.js";
import { CT } from "../data/seed.js";
import { PT_DUR, sessTrainers } from "./scheduling.js";

/* A guard, not a preference. "All time" resolves to 0000-01-01 → 9999-12-31, and
   expanding a recurring timetable across four million days locks the phone. A year
   of daily rows is already more than anyone reads on a payout screen. */
export const MAX_DAYS = 400;

/* "6:15 AM" — the format on the paper sheet. The admin reconciles this against a
   printout and a WhatsApp message from the coach, and a report they have to
   mentally convert is a report they check less carefully. */
export const ampm = (hhmm) => {
  const m = toMin(hhmm || "00:00");
  const h24 = Math.floor(m / 60), mi = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mi).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
};

/* Every date in the range as {iso, date, weekOff, day}. */
export function daysInRange(range) {
  if (!range || range.key === "all") {
    // "All time" on a recurring timetable means the window we can actually show.
    const start = new Date(ANCHOR_MON.getTime() - 28 * MS_DAY);
    return daysBetween(start, new Date(ANCHOR_MON.getTime() + 84 * MS_DAY));
  }
  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  return daysBetween(new Date(fy, fm - 1, fd), new Date(ty, tm - 1, td));
}

function daysBetween(from, to) {
  const out = [];
  const cur = new Date(from); cur.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  for (let i = 0; i <= MAX_DAYS && cur <= end; i++) {
    const diff = Math.round((cur.getTime() - ANCHOR_MON.getTime()) / MS_DAY);
    out.push({
      iso: toISO(cur), date: new Date(cur),
      weekOff: Math.floor(diff / 7), day: ((diff % 7) + 7) % 7,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/* Rows for ONE coach across the range, oldest first.
 *
 * `kind` is what the row is; `payable` is whether a rate can attach to it. They are
 * separate on purpose. The paper sheet lists Holiday camp and Bootcamp beside named
 * clients because it is a record of the day — dropping unpayable rows would make the
 * diary stop matching the coach's own memory of the week, which is the one thing it
 * has to do. Payouts filters on `payable`; the log doesn't.
 */
export function coachWorkRows(coachId, range, ctx) {
  const { sessions = [], ptBookings = [], camps = [], sessionLog = [],
          groupPacks = [], clientGroups = [], locName = (x) => x, tName = (x) => x } = ctx;
  if (!coachId) return [];

  const packFor = (name) => groupPacks.find(p => p.name === name)
    || groupPacks.find(p => clientGroups.find(g => g.id === p.groupId)?.name === name);

  const rows = [];
  const days = daysInRange(range);
  const seenLog = new Set();

  days.forEach(({ iso, date, weekOff, day }) => {
    // ---- classes and bootcamps ----
    sessions.filter(s => sessTrainers(s).includes(coachId) && s.day === day)
      .filter(s => s.weekOff == null || s.weekOff === weekOff)   // seed rows recur weekly
      .forEach(s => {
        const attendees = s.attendees || [];
        const attended = attendees.filter(a => a.status === "attended").length;
        const share = sessTrainers(s).length;
        rows.push({
          key: `s${s.id}-${iso}`, iso, date, weekOff, day, time: s.time,
          name: CT[s.type]?.name || "Class", kind: "class",
          where: locName(s.loc),
          cancelled: s.status === "cancelled",
          delivered: s.done === true,
          payable: s.status !== "cancelled",
          attended, booked: attendees.length, share, type: s.type,
          coCoaches: sessTrainers(s).filter(x => x !== coachId),
          remark: [
            s.status === "cancelled" ? `CANCELLED${s.cancelReason ? ` — ${s.cancelReason}` : ""}` : "",
            share > 1 ? `with ${sessTrainers(s).filter(x => x !== coachId).map(tName).join(", ")}` : "",
            s.done ? `${attended} of ${attendees.length} attended`
              : attendees.length ? `${attendees.length} booked, attendance not marked` : "",
          ].filter(Boolean).join(" · "),
          sessionsLeft: null,
        });
      });

    // ---- PT and group PT ----
    ptBookings.filter(b => b.trainer === coachId && b.day === day && (b.weekOff ?? 0) === weekOff)
      .forEach(b => {
        const who = b.forGroup || b.who || "Client";
        const pack = packFor(who);
        rows.push({
          key: `p${b.id}-${iso}`, iso, date, weekOff, day, time: b.time,
          name: who, kind: b.forGroup ? "grouppt" : "pt",
          where: b.otherLabel || locName(b.loc),
          cancelled: b.status === "cancelled",
          delivered: b.status === "done",
          payable: b.status !== "cancelled",
          share: 1,
          remark: [
            b.status === "cancelled" ? "CANCELLED" : "",
            b.status === "done" ? "completed" : b.status === "cancelled" ? "" : "not marked complete",
          ].filter(Boolean).join(" · "),
          // only pack-backed sessions carry a balance — the same rule as the sheet
          sessionsLeft: pack ? pack.size - pack.used : null,
        });
      });

    // ---- camps: "Holiday camp" on the sheet ----
    camps.forEach(c => (c.days || []).forEach((cd, i) => {
      const abs = (c.startInDays ?? 0) + i;
      if (Math.floor(abs / 7) !== weekOff || ((abs % 7) + 7) % 7 !== day) return;
      (cd.sessions || []).forEach(cs => {
        const coaches = cs.trainers || (cs.trainer ? [cs.trainer] : []);
        if (!coaches.includes(coachId)) return;
        rows.push({
          key: `c${c.id}-${i}-${cs.start}-${iso}`, iso, date, weekOff, day, time: cs.start,
          name: c.name, kind: "camp", where: locName(c.loc),
          cancelled: false, delivered: true, payable: true, share: coaches.length,
          hours: cs.hours || 1,
          remark: [cd.label, cs.activity, `${cs.hours}h`].filter(Boolean).join(" · "),
          sessionsLeft: null,
        });
      });
    }));
  });

  /* Hand-entered history (the per-client sheet tabs). A session the coach ran that
     was typed in rather than booked is still work done — leaving it out is how the
     diary and the client's own history end up disagreeing.
     These carry a display date like "Wed, Jul 1" and no ISO, so they are matched by
     parsing that label; anything unparseable is kept rather than dropped, because a
     dropped session is an unpaid one. */
  sessionLog.filter(l => l.tookBy === coachId).forEach(l => {
    if (seenLog.has(l.id)) return;
    seenLog.add(l.id);
    const iso = isoFromLabel(l.date);
    if (iso && range && range.key !== "all" && (iso < range.from || iso > range.to)) return;
    const pack = packFor(l.who);
    rows.push({
      key: `l${l.id}`, iso: iso || "", date: null, weekOff: null, day: null,
      time: l.time || "", dateText: l.date,
      name: l.who, kind: "logged", where: "",
      cancelled: false, delivered: true, payable: true, share: 1,
      remark: l.remark || "recorded from history",
      sessionsLeft: pack ? pack.size - pack.used : null,
    });
  });

  return rows.sort((a, b) =>
    (a.iso || "9999").localeCompare(b.iso || "9999") || (toMin(a.time || "00:00") - toMin(b.time || "00:00")));
}

/* "Wed, Jul 1" / "Wed, Jul 1, 2026" -> ISO. The session log stores a human label
   because that is what the Google Sheet held; new rows written by the app carry an
   ISO too. Returns null when it can't be read, and the caller keeps the row. */
const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
export function isoFromLabel(label) {
  const m = /([A-Za-z]{3})\w*\s+(\d{1,2})(?:,\s*(\d{4}))?/.exec(String(label || ""));
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  if (mi < 0) return null;
  const year = m[3] ? Number(m[3]) : new Date().getFullYear();
  return toISO(new Date(year, mi, Number(m[2])));
}

/* Group rows by date for display, so the date prints once — the sheet's shape. */
export function groupByDay(rows) {
  const out = [];
  rows.forEach(r => {
    const label = r.dateText || (r.date
      ? r.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      : DAYS[r.day] || "—");
    const last = out[out.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else out.push({ label, iso: r.iso, rows: [r] });
  });
  return out;
}

export const workCounts = (rows) => {
  const live = rows.filter(r => !r.cancelled);
  return {
    total: live.length,
    pt: live.filter(r => r.kind === "pt" || r.kind === "grouppt" || r.kind === "logged").length,
    classes: live.filter(r => r.kind === "class").length,
    camps: live.filter(r => r.kind === "camp").length,
    cancelled: rows.length - live.length,
    heads: live.filter(r => r.kind === "class").reduce((a, r) => a + (r.attended || 0), 0),
  };
};
