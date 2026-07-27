/* Staff event detail — what opens when a coach or admin taps a block.
 *
 * Before this, tapping a session on the calendar dropped you straight into the
 * reschedule form. That answered a question nobody had asked yet. In Google
 * Calendar tapping an event SHOWS it: who, where, how many, and then the actions.
 * Nine times out of ten Danny is checking, not moving.
 *
 * Everything reachable from here is a real action or is visibly absent. No button
 * that fires a toast and changes nothing.
 */

import { useApp } from "../state/AppState.jsx";
import { CT, isHead } from "../data/seed.js";
import { DAYS, FULLDAYS, dateFor, fmtDM } from "../lib/dates.js";
import { PT_DUR, sessTrainers } from "../lib/scheduling.js";
import { downloadIcs, eventStart, googleCalUrl } from "../lib/calendar.js";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";

const endOf = (t, mins) => {
  const [h, m] = String(t || "0:0").split(":").map(Number);
  const tot = h * 60 + m + mins;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
};

export default function EventSheet() {
  const { eventSheet, setEventSheet, sessions, ptBookings, trainers, tName, locName,
          isAdmin, user, setMoveSheet, setClassBuilder, restoreSession, cancelSession,
          ping, copyText, lastMove, undoMove, setBookFor } = useApp();
  if (!eventSheet) return null;

  const { kind, id, weekOff = 0 } = eventSheet;
  const isPt = kind === "pt";
  const item = isPt ? ptBookings.find(b => b.id === id) : sessions.find(s => s.id === id);

  const close = () => setEventSheet(null);

  /* A block can vanish underneath an open sheet — someone else cancels it, or you
     undo a move. Say so rather than rendering a sheet full of undefined. */
  if (!item) return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ background: "rgba(23,21,15,.55)" }} onClick={close}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{ background: T.paper }} onClick={e => e.stopPropagation()}>
        <div style={{ ...disp, fontWeight: 700, fontSize: 20 }}>That booking is gone</div>
        <div className="text-sm mb-4" style={{ color: T.muted }}>It was removed while this was open.</div>
        <Btn small full onClick={close}>Close</Btn>
      </div>
    </div>);

  const dur = isPt ? PT_DUR : (CT[item.type]?.dur || 60);
  const coaches = isPt ? [item.trainer] : sessTrainers(item);
  const label = isPt ? `PT · ${item.who}` : (CT[item.type]?.name || "Class");
  const cancelled = item.status === "cancelled";
  const mine = coaches.includes(user?.id);
  const canEdit = isAdmin || mine;
  const attendees = isPt ? [] : (item.attendees || []);
  const dt = dateFor(item.weekOff ?? weekOff, item.day);

  const ev = {
    title: `${label} · ExerciseOnly`,
    start: eventStart(item.weekOff ?? weekOff, item.day, item.time),
    minutes: dur, location: locName(item.loc),
    uid: `eo-${kind}-${item.id}`,
    details: `${coaches.map(tName).join(" + ")}${attendees.length ? ` · ${attendees.length} booked` : ""}`,
  };

  const summary = `${label} · ${FULLDAYS[item.day]} ${fmtDM(dt)} ${item.time}–${endOf(item.time, dur)} · ${locName(item.loc)} · ${coaches.map(tName).join(" + ")}`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={close}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[88vh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>

        <div className="flex items-start gap-2.5 mb-1">
          <span style={{ width: 5, borderRadius: 3, alignSelf: "stretch", minHeight: 40,
            background: cancelled ? T.muted : (isPt ? T.navy : CT[item.type]?.color) }}/>
          <div className="flex-1">
            <div style={{ ...disp, fontWeight: 700, fontSize: 21,
              textDecoration: cancelled ? "line-through" : "none" }}>{label}</div>
            <div className="text-sm" style={{ color: T.muted }}>
              {FULLDAYS[item.day]} {fmtDM(dt)} · {item.time}–{endOf(item.time, dur)} · {dur} min
            </div>
          </div>
          <button onClick={close} aria-label="Close" className="text-sm font-bold px-2 py-1 rounded-lg"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>

        {cancelled && (
          <div className="rounded-xl p-2.5 my-2 text-xs" style={{ background: "#F7EEE9", color: T.accent }}>
            <b>Cancelled</b>{item.cancelledAt ? ` · ${item.cancelledAt}` : ""}
            {item.cancelReason ? ` · "${item.cancelReason}"` : ""}
            <div style={{ color: T.muted }}>Kept on the calendar for the record.</div>
          </div>)}

        <div className="text-sm py-1">📍 {item.otherLabel || locName(item.loc)}</div>
        <div className="text-sm py-1">
          👤 {coaches.map(c => `${tName(c)}${isHead(c) ? " ★" : ""}`).join(" + ")}
          {coaches.length > 1 && <span style={{ color: T.blue }}> · pay splits between them</span>}
        </div>
        {!isPt && (
          <div className="text-sm py-1">
            👥 {attendees.length}/{item.cap ?? "—"} booked
            {item.cap && attendees.length >= item.cap && <span style={{ color: T.accent, fontWeight: 700 }}> · full</span>}
          </div>)}
        {isPt && item.byAdmin && <div className="text-xs py-1" style={{ color: T.plum }}>Booked by admin on the client's behalf</div>}

        {!isPt && attendees.length > 0 && (
          <div className="rounded-xl p-2.5 my-2" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="text-xs font-bold mb-1" style={{ color: T.muted }}>ROSTER</div>
            <div className="text-sm">{attendees.join(" · ")}</div>
          </div>)}

        {/* Add to calendar — Danny is not giving up Google Calendar on day one and
            shouldn't have to. The app can be the source of truth and still feed it. */}
        <div className="flex gap-1.5 my-3 flex-wrap">
          <button onClick={() => { downloadIcs(ev); ping("Calendar file downloaded"); }}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ border: `1.5px solid ${T.line}` }}>
            📅 Apple / Outlook</button>
          <button onClick={() => window.open(googleCalUrl(ev), "_blank", "noopener")}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ border: `1.5px solid ${T.line}` }}>
            📅 Google</button>
          <button onClick={() => copyText(summary, "Session details copied")}
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ border: `1.5px solid ${T.line}` }}>
            ⧉ Copy</button>
        </div>

        {canEdit ? (
          cancelled ? (
            <Btn small full kind="ghost" onClick={() => { restoreSession(item.id); close(); }}>
              Restore this class</Btn>
          ) : (<>
            <div className="flex gap-2">
              <Btn small full onClick={() => {
                setMoveSheet({ kind, id: item.id, day: item.day, time: item.time,
                  trainer: item.trainer, loc: item.loc, label });
                close();
              }}>Move / reschedule</Btn>
              {!isPt && isAdmin && (
                <Btn small full kind="ghost" onClick={() => {
                  setClassBuilder({ editId: item.id, type: item.type,
                    date: item.date || undefined, time: item.time, loc: item.loc,
                    cap: item.cap ?? 10, trainers: sessTrainers(item), repeat: 1 });
                  close();
                }}>Edit class</Btn>)}
            </div>
            <div className="flex gap-2 mt-2">
              {isAdmin && (
                <Btn small full kind="ghost" onClick={() => {
                  setBookFor({ trainer: coaches[0], day: item.day, time: item.time,
                    weekOff: item.weekOff ?? weekOff, loc: item.loc, self: false, who: "", nonClient: false });
                  close();
                }}>Book someone in</Btn>)}
              <Btn small full kind="ghost" onClick={() => {
                setMoveSheet({ kind, id: item.id, day: item.day, time: item.time,
                  trainer: item.trainer, loc: item.loc, label, confirmingCancel: true });
                close();
              }}>Cancel</Btn>
            </div>
          </>)
        ) : (
          <div className="text-xs rounded-xl p-2.5" style={{ background: T.card, color: T.muted, border: `1px solid ${T.line}` }}>
            This is {tName(coaches[0])}'s session — only they or the admin can change it.
          </div>)}

        {/* Undo sits here as well as on the toast, because a toast disappears and a
            wrong move doesn't. */}
        {lastMove && lastMove.id === item.id && (
          <button onClick={() => { undoMove(); close(); }} className="w-full text-sm font-bold mt-3"
            style={{ color: T.blue }}>↩ Undo the last move ({DAYS[lastMove.from.day]} {lastMove.from.time})</button>)}
      </div>
    </div>);
}
