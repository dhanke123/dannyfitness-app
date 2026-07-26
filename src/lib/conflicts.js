/* Conflict detection — one implementation, used by the class builder, the camp
 * builder, the calendar and the booking sheets.
 *
 * Written as pure functions so the same rules apply wherever a session is created
 * or moved. Three copies of "is this coach free?" is how a coach ends up
 * double-booked while every individual screen looks correct.
 *
 * MULTI-COACH: a class can have several coaches. The rule is that EVERY assigned
 * coach must be free — not just the first. That's the whole point of checking:
 * adding a second coach adds a second way to clash.
 */

import { CT } from "../data/seed.js";
import { DAYS } from "./dates.js";
import { PT_DUR, sessTrainers, travelBetween } from "./scheduling.js";

const toMin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + m; };
const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS;

export const SEVERITY = { BLOCK: "block", WARN: "warn" };

/* Everything a coach is committed to on one weekday, as minute ranges. */
export function commitments(trainerId, day, ctx, ignoreSessionId, weekOff) {
  /* weekOff-aware. A session carrying an explicit weekOff exists only in that
     week; seed timetable rows have none and recur every week. Without this a
     class created for 12 August clashes with one created for 19 August purely
     because both fall on a Tuesday. */
  const sameWeek = (x) => weekOff == null || x.weekOff == null || x.weekOff === weekOff;
  const { sessions = [], ptBookings = [], timeOff = [], camps = [] } = ctx;
  const out = [];

  sessions.filter(s => s.id !== ignoreSessionId
                    && s.status !== "cancelled"
                    && sessTrainers(s).includes(trainerId)
                    && s.day === day && sameWeek(s))
    .forEach(s => out.push({
      kind: "class", start: toMin(s.time), end: toMin(s.time) + (CT[s.type]?.dur || 60),
      loc: s.loc, label: CT[s.type]?.name || "Class",
    }));

  ptBookings.filter(b => b.trainer === trainerId && b.day === day
                      && b.status !== "cancelled" && sameWeek(b))
    .forEach(b => out.push({
      kind: "pt", start: toMin(b.time), end: toMin(b.time) + PT_DUR,
      loc: b.loc, label: `PT · ${b.who || "client"}`,
    }));

  // Camp days a coach is running. Camps span days, so this maps each day-block
  // onto the weekday it actually falls on.
  camps.forEach(c => (c.days || []).forEach((cd, i) => {
    const abs = (c.startInDays ?? 0) + i;
    if (((abs % 7) + 7) % 7 !== day) return;
    (cd.sessions || []).forEach(cs => {
      // camp blocks can now carry more than one coach
      const coaches = cs.trainers || (cs.trainer ? [cs.trainer] : []);
      if (!coaches.includes(trainerId)) return;
      out.push({ kind: "camp", start: toMin(cs.start),
        end: toMin(cs.start) + Math.round((cs.hours || 1) * 60),
        loc: c.loc, label: `${c.name} — ${cs.activity}` });
    });
  }));

  timeOff.filter(t => t.trainer === trainerId && t.active !== false && t.day === day
                   && !(t.overrides || []).includes(day))
    .forEach(t => out.push({
      kind: "timeoff", start: t.allDay ? 0 : toMin(t.start), end: t.allDay ? 1440 : toMin(t.end),
      loc: null, label: t.reason ? `Time off — ${t.reason}` : "Time off",
    }));

  return out.sort((a, b) => a.start - b.start);
}

/* Check a proposed session against every coach assigned to it.
   Returns [] when clear. */
export function checkSessionConflicts({ trainers = [], day, time, durMin, loc, weekOff },
                                      ctx, tName, locName, ignoreSessionId) {
  const start = toMin(time), end = start + durMin;
  const found = [];

  trainers.forEach(tid => {
    commitments(tid, day, ctx, ignoreSessionId, weekOff).forEach(c => {
      if (overlaps(start, end, c.start, c.end)) {
        found.push({
          severity: SEVERITY.BLOCK, trainer: tid,
          message: `${tName(tid)} already has ${c.label} at ${fmt(c.start)}–${fmt(c.end)} on ${DAYS[day]}`,
        });
        return;
      }
      // Not an overlap, but too tight to physically get there. A warning rather
      // than a block: Danny may knowingly schedule tight and absorb it.
      if (c.loc && loc && c.loc !== loc) {
        const buf = travelBetween(ctx.travel || {}, loc, c.loc);
        const gapAfter = start - c.end, gapBefore = c.start - end;
        const gap = gapAfter >= 0 ? gapAfter : gapBefore >= 0 ? gapBefore : null;
        if (gap !== null && gap < buf) {
          found.push({
            severity: SEVERITY.WARN, trainer: tid,
            message: `${tName(tid)} has ${gap} min between ${locName(c.loc)} and ${locName(loc)} — needs about ${buf}`,
          });
        }
      }
    });
  });

  return found;
}

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* Two classes at the same venue and time. Not automatically wrong — these are
   outdoor locations and Danny may run two groups side by side — so it's a warning
   that surfaces the decision rather than a rule that assumes one. */
export function checkVenueClash({ day, time, durMin, loc, weekOff }, ctx, locName, ignoreSessionId) {
  const start = toMin(time), end = start + durMin;
  const clash = (ctx.sessions || []).filter(s =>
    s.id !== ignoreSessionId && s.status !== "cancelled" && s.day === day && s.loc === loc &&
    (weekOff == null || s.weekOff == null || s.weekOff === weekOff) &&
    overlaps(start, end, toMin(s.time), toMin(s.time) + (CT[s.type]?.dur || 60)));
  return clash.length ? [{
    severity: SEVERITY.WARN, trainer: null,
    message: `${clash.length} other class${clash.length === 1 ? "" : "es"} already at ${locName(loc)} then — fine if you're running parallel groups`,
  }] : [];
}

/* Everything, in one call. */
export function allConflicts(draft, ctx, tName, locName, ignoreSessionId) {
  // An unparseable time makes every overlap test NaN-false, i.e. "no conflicts".
  // Fail loudly instead of silently approving everything.
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(draft.time || ""))) {
    return [{ severity: SEVERITY.BLOCK, trainer: null,
      message: `"${draft.time || "(empty)"}" isn't a valid time — use 24-hour HH:MM` }];
  }
  return [
    ...checkSessionConflicts(draft, ctx, tName, locName, ignoreSessionId),
    ...checkVenueClash(draft, ctx, locName, ignoreSessionId),
  ];
}

export const hasBlocking = (list) => list.some(c => c.severity === SEVERITY.BLOCK);
