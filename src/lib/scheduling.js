/* PT scheduling engine: shift hours minus commitments, with travel buffers.
   NOTE for dev phase: this must move server-side (Supabase RPC) so availability is authoritative. */

import { CT } from "../data/seed.js";
import { fromMin, toMin } from "./dates.js";

export const DEFAULT_TRAVEL = 15; // minutes — fallback for any location pair without a specific value

export const travelKey = (a,b)=>[a,b].sort().join("|");

export const travelBetween = (travel, a, b) => {
  if (!a || !b || a===b) return 0;
  if (a==="other" || b==="other") return DEFAULT_TRAVEL;
  return travel[travelKey(a,b)] ?? DEFAULT_TRAVEL;
};

export const sessTrainers = (s) => s.trainers || [s.trainer];

export const PT_DUR = 45; // minutes — default PT session length (flagged in spec as possibly variable later)

export const SLOT_STEP = 45; // bookable start granularity = one PT session, so slots sit back-to-back

export const workWindow = (shifts, trainerId, dayIdx) => {
  const h = shifts?.[trainerId]?.[dayIdx];
  return h ? [toMin(h[0]), toMin(h[1])] : null;
};

export function trainerBusyBlocks(trainerId, dayIdx, { sessions, ptBookings, timeOff }) {
  const blocks = [];
  // classes/camps this coach is assigned to (including as a second coach)
  sessions.filter(s => sessTrainers(s).includes(trainerId) && s.day===dayIdx && s.status!=="cancelled").forEach(s => {
    blocks.push({ start: toMin(s.time), end: toMin(s.time)+CT[s.type].dur, loc: s.loc, label: CT[s.type].name });
  });
  ptBookings.filter(b => b.trainer===trainerId && b.day===dayIdx && b.status!=="cancelled").forEach(b => {
    blocks.push({ start: toMin(b.time), end: toMin(b.time)+PT_DUR, loc: b.loc, label: "PT session" });
  });
  timeOff.filter(t => t.trainer===trainerId && t.active!==false && t.day===dayIdx
    && !(t.overrides||[]).includes(dayIdx)   // availability override: coach chose to work anyway
  ).forEach(t => {
    blocks.push({ start: t.allDay ? 0 : toMin(t.start), end: t.allDay ? 24*60 : toMin(t.end), loc: null, label: "Time off" });
  });
  return blocks.sort((a,b) => a.start-b.start);
}

export function checkPtSlot(t, locId, busy, travel, locName) {
  for (const b of busy) {
    const buf = b.loc===null ? 0 : (b.loc===locId ? 0 : travelBetween(travel, locId, b.loc));
    const blockStart = b.start - buf, blockEnd = b.end + buf;
    if (t < blockEnd && t + PT_DUR > blockStart) return { ok:false, blockedBy:b };
  }
  // note if the slot's start butts right up against a travel buffer from a prior commitment
  let note = null;
  for (const b of busy) {
    if (b.loc===null || b.loc===locId) continue;
    const buf = travelBetween(travel, locId, b.loc);
    if (buf > 0 && t >= b.end && t < b.end + buf + SLOT_STEP && t >= b.end + buf && t - b.end < buf + SLOT_STEP) {
      note = `+${buf}m travel from ${locName(b.loc)}`;
    }
  }
  return { ok:true, note };
}

export function ptSlotsFor(trainerId, dayIdx, locId, travel, ctx, locName) {
  const win = workWindow(ctx.shifts, trainerId, dayIdx);
  if (!win) return [];
  const busy = trainerBusyBlocks(trainerId, dayIdx, ctx);
  const [winStart, winEnd] = win;
  const out = [];
  for (let t = winStart; t + PT_DUR <= winEnd; t += SLOT_STEP) {
    const r = checkPtSlot(t, locId, busy, travel, locName);
    if (r.ok) out.push({ trainer:trainerId, day:dayIdx, loc:locId, time:fromMin(t), note:r.note });
  }
  return out;
}

export function ptRangesFor(trainerId, dayIdx, locId, travel, ctx, locName) {
  const win = workWindow(ctx.shifts, trainerId, dayIdx);
  if (!win) return { ranges:[], gaps:[] };
  const busy = trainerBusyBlocks(trainerId, dayIdx, ctx);
  const [winStart, winEnd] = win;
  // build blocked intervals (buffered) and merge
  const blocked = busy.map(b => {
    const buf = b.loc===null ? 0 : (b.loc===locId ? 0 : travelBetween(travel, locId, b.loc));
    return { s:b.start-buf, e:b.end+buf, label:b.label, loc:b.loc, buf };
  }).sort((a,b)=>a.s-b.s);
  const gaps = blocked.filter(b => b.e>winStart && b.s<winEnd).map(b => ({
    from:fromMin(Math.max(b.s,winStart)), to:fromMin(Math.min(b.e,winEnd)),
    why: b.loc===null ? b.label : b.buf>0 ? `${b.label} @ ${locName(b.loc)} (+${b.buf}m travel)` : b.label,
  }));
  // subtract blocked from working window
  const ranges = [];
  let cur = winStart;
  for (const b of blocked) {
    if (b.e<=winStart || b.s>=winEnd) continue;
    if (b.s>cur) ranges.push([cur, Math.min(b.s,winEnd)]);
    cur = Math.max(cur, b.e);
  }
  if (cur<winEnd) ranges.push([cur, winEnd]);
  return {
    ranges: ranges.filter(([s,e])=>e-s>=PT_DUR).map(([s,e])=>`${fromMin(s)}–${fromMin(e)}`),
    gaps,
  };
}
