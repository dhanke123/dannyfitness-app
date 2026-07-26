/* Notification bell + panel.
 *
 * The bell lives in the header for every role. Tapping a notification takes you
 * to the thing it's about and marks it read — a notification you can't act on
 * from where you're standing is just an alarm.
 */

import { useApp } from "../state/AppState.jsx";
import { TONE_COLOR } from "../lib/notifications.js";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";

export const NotificationBell = () => {
  const { notifications, unreadNotifs, setNotifOpen } = useApp();
  return (
    <button onClick={() => setNotifOpen(true)}
      aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : "Notifications"}
      className="relative px-2.5 py-2 rounded-lg"
      style={{ border: `1.5px solid ${T.line}`, background: "transparent", cursor: "pointer" }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.ink}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
      </svg>
      {unreadNotifs > 0 && (
        <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17,
          lineHeight: "17px", borderRadius: 9, padding: "0 4px", background: T.accent,
          color: "#fff", fontSize: 10, fontWeight: 800, ...disp }}>
          {unreadNotifs > 9 ? "9+" : unreadNotifs}
        </span>)}
      {/* count only — the panel carries the detail, and notifications.length can be
          large enough to wreck the header if rendered inline */}
    </button>);
};

export const NotificationPanel = () => {
  const { notifications, notifOpen, setNotifOpen, openNotification,
          markAllNotifsRead, readNotifs, isAdmin } = useApp();
  if (!notifOpen) return null;

  const unread = notifications.filter(n => !readNotifs.includes(n.id));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setNotifOpen(false)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between mb-1">
          <div style={{ ...disp, fontWeight: 700, fontSize: 22 }}>
            Notifications
            {unread.length > 0 && <span className="text-sm font-normal" style={{ color: T.muted }}> · {unread.length} new</span>}
          </div>
          <button onClick={() => setNotifOpen(false)} aria-label="Close"
            className="text-sm font-bold px-2 py-1 rounded-lg -mt-1"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>
        <div className="text-xs mb-3" style={{ color: T.muted }}>
          {isAdmin
            ? "Approvals and enquiries first — everything here is someone waiting on you."
            : "Tap anything to jump straight to it."}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: T.muted }}>
            Nothing needs your attention. 🎉
          </div>)}

        <div className="space-y-2">
          {notifications.map(n => {
            const isRead = readNotifs.includes(n.id);
            return (
              <button key={n.id} onClick={() => openNotification(n)}
                className="w-full text-left rounded-2xl p-3 flex gap-3 items-start"
                style={{ background: isRead ? "transparent" : T.card,
                         border: `1.5px solid ${isRead ? T.line : TONE_COLOR[n.tone] + "55"}`,
                         opacity: isRead ? .6 : 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 5, flex: "none",
                  background: isRead ? T.line : TONE_COLOR[n.tone] }}/>
                <span className="flex-1" style={{ minWidth: 0 }}>
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className="block text-xs mt-0.5" style={{ color: T.muted }}>{n.body}</span>
                </span>
                <span style={{ ...disp, fontWeight: 700, color: T.muted }} className="text-sm">›</span>
              </button>);
          })}
        </div>

        {unread.length > 0 && (
          <div className="mt-3">
            <Btn full kind="ghost" onClick={markAllNotifsRead}>Mark all as read</Btn>
          </div>)}
      </div>
    </div>);
};
