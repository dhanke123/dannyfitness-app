/* Booking detail — what opens when a member taps a block on their calendar.
 *
 * Exists because the calendar became the default view. Previously every action a
 * member had (cancel, modify, add-to-calendar) lived on the list rows, so making
 * the calendar the default would have quietly removed their ability to cancel
 * anything. A view that can't act is a poster.
 *
 * The window rules are identical to the list: outside it you cancel or move
 * yourself, inside it you request an exception (Decision 1a).
 */

import { useApp } from "../state/AppState.jsx";
import { CT, isHead } from "../data/seed.js";
import { DAYS, FULLDAYS, dateFor, fmtDM } from "../lib/dates.js";
import { downloadIcs, eventStart, googleCalUrl } from "../lib/calendar.js";
import { PT_DUR } from "../lib/scheduling.js";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function BookingDetailSheet() {
  const { bookingDetail, setBookingDetail, cancelClass, cancelPT, hoursUntil, policy,
          setClientMove, setExceptionSheet, ping, tName } = useApp();
  if (!bookingDetail) return null;
  const e = bookingDetail;
  const src = e._src || e;
  const isPt = src.kind === "pt";
  const isCamp = src.kind === "camp";
  const weekOff = e.weekOff ?? 0;

  const hrs = hoursUntil(weekOff, e.day, fmt(e.start));
  const win = isPt ? policy.ptHrs : policy.classHrs;
  const openWindow = hrs > win;

  const ev = {
    title: `${e.title} · ExerciseOnly`,
    start: eventStart(weekOff, e.day, fmt(e.start)),
    minutes: e.dur, location: e.sub || "",
    uid: `bk-${e.id}`, details: e.sub || "",
  };

  const close = () => setBookingDetail(null);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={close}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{ background: T.paper }}
        onClick={ev2 => ev2.stopPropagation()}>

        <div className="flex items-start justify-between mb-1">
          <div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 22 }}>{e.title}</div>
            <div className="text-sm" style={{ color: T.muted }}>
              {FULLDAYS[e.day]} {fmtDM(dateFor(weekOff, e.day))} · {fmt(e.start)}–{fmt(e.start + e.dur)}
            </div>
          </div>
          <button onClick={close} aria-label="Close" className="text-sm font-bold px-2 py-1 rounded-lg -mt-1"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>

        <div className="text-sm mb-1" style={{ color: T.muted }}>{e.sub}</div>
        {e.cancelled && (
          <div className="text-xs font-bold mb-2" style={{ color: T.accent }}>
            This session was cancelled — your credit has been returned.</div>)}

        {!e.cancelled && (
          <div className="text-[11px] mb-3" style={{ color: openWindow ? T.muted : T.accent }}>
            {openWindow
              ? `Free to change or cancel until ${win}h before.`
              : `Inside the ${win}h window — changes need approval now.`}
          </div>)}

        {/* Add to calendar, same generator as the list rows */}
        <div className="flex gap-1.5 mb-3">
          <button onClick={() => { downloadIcs(ev); ping("Calendar file downloaded"); }}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
            style={{ border: `1.5px solid ${T.line}` }}>📅 Apple / Outlook</button>
          <button onClick={() => window.open(googleCalUrl(ev), "_blank", "noopener")}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
            style={{ border: `1.5px solid ${T.line}` }}>📅 Google</button>
        </div>

        {!e.cancelled && !isCamp && (openWindow ? (
          <div className="flex gap-2">
            {isPt && (
              <Btn small kind="ghost" full onClick={() => {
                setClientMove({ ...src.pt, newWeek: src.pt.weekOff ?? 0, newDay: src.pt.day,
                  newTime: src.pt.time, locked: false });
                close();
              }}>Modify</Btn>)}
            <Btn small kind="ghost" full onClick={() => {
              if (isPt) cancelPT(src.pt.id); else cancelClass(src.id);
              close();
            }}>Cancel booking</Btn>
          </div>
        ) : (
          <Btn small kind="ghost" full onClick={() => {
            setExceptionSheet({
              what: `${e.title} · ${fmtDM(dateFor(weekOff, e.day))} ${fmt(e.start)}`,
              kind: isPt ? "pt" : "class", ask: "cancel",
              hrs: Math.max(0, Math.round(hrs)), reason: "",
            });
            close();
          }}>Request an exception</Btn>
        ))}

        {isCamp && (
          <div className="text-xs" style={{ color: T.muted }}>
            Camp days are managed as a whole booking — cancel the camp from the Booked list.
          </div>)}
      </div>
    </div>);
}
