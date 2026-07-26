/* Notification feed — DERIVED from live state, not a stored list.
 *
 * The tempting design is a `notifications` array you push into. It drifts: a
 * booking gets cancelled and its "upcoming session" notice lingers; an admin
 * approves a refund and the badge stays lit. Deriving from state means a
 * notification cannot outlive the thing it's about.
 *
 * The cost is that IDs must be deterministic, or "mark as read" forgets itself on
 * every re-render. Every id below is built from a stable entity id.
 *
 * In the dev phase this becomes a query over `notification_log` plus the pending
 * queues; the shape returned here is what the UI already consumes, so the swap is
 * local to this file.
 */

import { CT, isHead } from "../data/seed.js";
import { DAYS, TODAY } from "./dates.js";

const PT_MIN = 45;

/* One notification. `action` tells the UI where tapping should land. */
const N = (id, tone, title, body, action, meta) => ({ id, tone, title, body, action, meta });

/* Hours until a (weekOffset, weekday, "HH:MM") slot — mirrors AppState.hoursUntil,
   duplicated here so this module stays free of React state. */
const hoursUntil = (dateFor, weekOff, d, time) => {
  const dt = dateFor(weekOff ?? 0, d);
  const [h, m] = String(time || "00:00").split(":").map(Number);
  dt.setHours(h || 0, m || 0, 0, 0);
  return (dt.getTime() - Date.now()) / 3600000;
};

export function buildNotifications(s) {
  const { role, user } = s;
  if (role === "client") return clientFeed(s);
  if (role === "admin") return adminFeed(s);
  return trainerFeed(s, user);
}

/* ---------------------------------------------------------------- client ---- */
function clientFeed(s) {
  const { myPT, myClassBookings, sessions, routines, credits, refundables,
          exceptionQueue, camps, myCamps, tName, locName, dateFor, referralReward } = s;
  const out = [];

  // Upcoming sessions — soonest first, and only ones that haven't happened.
  myPT.forEach(b => {
    const h = hoursUntil(dateFor, b.weekOff, b.day, b.time);
    if (h < 0 || h > 48) return;
    out.push(N(`pt-up-${b.id}`, h <= 2 ? "urgent" : "info",
      h <= 2 ? "PT session starting soon" : "Upcoming PT session",
      `${b.date || DAYS[b.day]} at ${b.time} with Coach ${tName(b.trainer)}${isHead(b.trainer) ? " ★" : ""} · ${b.loc === "other" ? (b.otherLabel || "Other spot") : locName(b.loc)}`,
      { tab: "book", seg: "mine" }, Math.round(h)));
  });

  myClassBookings.forEach(sid => {
    const ses = sessions.find(x => x.id === sid); if (!ses) return;
    const h = hoursUntil(dateFor, s.bookWeeks[sid] ?? 0, ses.day, ses.time);
    if (h < 0 || h > 48) return;
    out.push(N(`cls-up-${sid}`, h <= 2 ? "urgent" : "info",
      h <= 2 ? "Class starting soon" : "Upcoming class",
      `${CT[ses.type].name} · ${DAYS[ses.day]} at ${ses.time} · ${locName(ses.loc)}`,
      { tab: "book", seg: "mine" }, Math.round(h)));
  });

  // A coach assigned them a routine — they'd otherwise never know it was there.
  routines.filter(r => r.assignedTo === "Sam Lee" && r.owner !== "sam").forEach(r => {
    out.push(N(`routine-${r.id}`, "good", "New routine from your coach",
      `"${r.name}" — ${r.items.length} exercises, assigned by Coach ${tName(r.owner)}`,
      { tab: "log", logView: "train" }));
  });

  // Money owed back to them, sitting unclaimed.
  refundables.forEach(r => out.push(N(`refundable-${r.id}`, "good",
    "Credit returned to your account",
    `$${r.amt} from ${r.what}. You can request a bank refund instead.`,
    { tab: "book", seg: "mine" })));

  if (referralReward > 0) out.push(N("referral-claim", "good", "Referral credit waiting",
    `${referralReward} free class credit${referralReward > 1 ? "s" : ""} ready to add to your account.`,
    { tab: "account" }));

  // Their own exception requests, still pending.
  exceptionQueue.forEach(e => out.push(N(`exc-mine-${e.id}`, "info",
    "Exception request under review",
    `${e.what} — we'll let you know shortly.`, { tab: "book", seg: "mine" })));

  if (credits.classes <= 1) out.push(N("low-credits", "warn", "Class credits running low",
    `${credits.classes} class credit${credits.classes === 1 ? "" : "s"} left. Top up to keep booking.`,
    { tab: "shop" }));

  myCamps.forEach(cid => {
    const c = camps.find(x => x.id === cid); if (!c) return;
    if ((c.startInDays ?? 99) > 3) return;
    out.push(N(`camp-${cid}`, "info", "Camp starting soon",
      `${c.name} · ${c.dates} · ${locName(c.loc)}`, { tab: "book", seg: "mine" }));
  });

  return sort(out);
}

/* --------------------------------------------------------------- trainer ---- */
function trainerFeed(s, user) {
  const { sessions, ptBookings, incidentals, locName, dateFor, sessTrainers } = s;
  const out = [];
  const mine = sessions.filter(x => sessTrainers(x).includes(user.id));

  mine.filter(x => x.day === TODAY).forEach(x => {
    out.push(N(`t-cls-${x.id}`, "info", "Class today",
      `${CT[x.type].name} at ${x.time} · ${locName(x.loc)} · ${(x.attendees || []).length} booked`,
      { tab: "today" }));
  });

  ptBookings.filter(b => b.trainer === user.id && b.status !== "cancelled").forEach(b => {
    const h = hoursUntil(dateFor, b.weekOff, b.day, b.time);
    if (h < 0 || h > 24) return;
    out.push(N(`t-pt-${b.id}`, h <= 2 ? "urgent" : "info",
      h <= 2 ? "PT session starting soon" : "PT session today",
      `${b.who || "Client"} at ${b.time} · ${b.otherLabel || locName(b.loc)}`,
      { tab: "today" }, Math.round(h)));
  });

  // Attendance not marked on a class that's already been and gone — this is what
  // stops a coach being paid, since the payout report only counts delivered work.
  mine.filter(x => x.day < TODAY && !x.done).forEach(x => {
    out.push(N(`t-unmarked-${x.id}`, "warn", "Attendance not marked",
      `${CT[x.type].name} · ${DAYS[x.day]} ${x.time}. You aren't paid for this until it's marked.`,
      { tab: "today" }));
  });

  incidentals.filter(i => i.trainer === user.id && i.status !== "pending").forEach(i => {
    out.push(N(`t-inc-${i.id}`, i.status === "approved" ? "good" : "warn",
      i.status === "approved" ? "Receipt approved" : "Receipt declined",
      `${i.label} · $${i.amt}${i.reason ? ` — "${i.reason}"` : ""}`, { tab: "me" }));
  });

  return sort(out);
}

/* ----------------------------------------------------------------- admin ---- */
/* The important one. Every queue item is money or a member waiting on a human. */
function adminFeed(s) {
  const { exceptionQueue, refundQueue, noShowQueue, incidentals, leads, tName } = s;
  const out = [];

  exceptionQueue.forEach(e => out.push(N(`a-exc-${e.id}`, "urgent",
    "Exception request needs a decision",
    `${e.who} wants to ${e.ask === "cancel" ? "cancel" : "move"} ${e.what} — "${e.reason}"`,
    { tab: "schedule" })));

  refundQueue.forEach(r => out.push(N(`a-ref-${r.id}`, "urgent",
    "Refund request needs a decision",
    `${r.who} · $${r.amt} · ${r.what}`, { tab: "manage", adminSec: "money" })));

  noShowQueue.forEach(q => out.push(N(`a-ns-${q.id}`, "warn",
    "No-show waiting on you",
    `${q.who} · ${q.session}. Nothing is deducted until you decide.`, { tab: "clients" })));

  incidentals.filter(i => i.status === "pending").forEach(i => out.push(N(`a-inc-${i.id}`, "warn",
    "Trainer receipt to approve",
    `${tName(i.trainer)} · ${i.label} · $${i.amt}`, { tab: "manage", adminSec: "money" })));

  // New enquiries — a lead that sits unread is the one that costs Danny a client.
  leads.filter(l => l.status === "new").forEach(l => out.push(N(`a-lead-${l.id}`, "good",
    l.source === "Enquiry form" ? "New enquiry" : `New lead · ${l.source}`,
    `${l.name}${l.phone ? ` · +65 ${l.phone}` : ""}${l.note ? ` — "${l.note}"` : ""}`,
    { tab: "manage", adminSec: "people" })));

  return sort(out);
}

/* urgent → warn → good → info, then soonest first within a tone. */
const TONE_ORDER = { urgent: 0, warn: 1, good: 2, info: 3 };
const sort = (list) => list.sort((a, b) =>
  (TONE_ORDER[a.tone] - TONE_ORDER[b.tone]) ||
  ((a.meta ?? 999) - (b.meta ?? 999)));

export const TONE_COLOR = { urgent: "#FF5A3C", warn: "#F0812F", good: "#12B39C", info: "#1E50A0" };
