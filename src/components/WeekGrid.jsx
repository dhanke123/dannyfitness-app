/* WeekGrid — the shared week calendar (design "A").
 *
 * ONE implementation, used by the client's Booked calendar and the trainer/admin
 * Schedule. They previously had two near-identical copies that drifted: the same
 * clipping bug had to be fixed twice, and only one of them ever got the now-line.
 *
 * The design problem this solves: seven columns on a 390px phone gives each day
 * ~48px, which is unreadable. Rather than dropping to a 3-day view and losing the
 * week, tapping a day FOCUSES it — that column expands to ~3x while the others
 * compress but stay on screen. You get a readable day without losing context.
 *
 * Hours are fixed at CAL_HSTART..CAL_HEND (05:00–23:00).
 */

import { useEffect, useRef, useState } from "react";
import { CAL_HEND, CAL_HSTART, DAYS, FULLDAYS, TODAY, dateFor, fmtDM } from "../lib/dates.js";
import { T, disp } from "../theme.js";

const HS = CAL_HSTART, HE = CAL_HEND;
const PXH = 54, GUT = 46;
const GRID_H = (HE - HS) * PXH;
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* Scoped CSS. Injected once — the grid needs pseudo-elements and keyframes that
   inline styles can't express. */
const CSS = `
.wg-days{display:grid;grid-template-columns:var(--wg-cols);border-bottom:1px solid ${T.line};
  transition:grid-template-columns .26s cubic-bezier(.4,0,.2,1)}
.wg-dh{padding:5px 0 7px;text-align:center;cursor:pointer;background:none;border:none;font-family:inherit}
.wg-dh .wg-dow{font-size:9px;font-weight:800;letter-spacing:.06em;color:${T.muted}}
.wg-dh .wg-num{font-weight:700;font-size:15px;width:26px;height:26px;margin:1px auto 0;
  border-radius:50%;display:grid;place-items:center;color:${T.ink}}
.wg-dh.wg-today .wg-num{background:${T.accent};color:#fff}
.wg-dh.wg-sel .wg-num{background:${T.ink};color:#fff}
.wg-dh.wg-today.wg-sel .wg-num{background:${T.accent};box-shadow:0 0 0 2.5px rgba(255,90,60,.28)}
.wg-dh.wg-dim{opacity:.42}
.wg-load{display:flex;gap:2px;justify-content:center;margin-top:3px;height:4px}
.wg-load i{width:4px;height:4px;border-radius:2px;background:${T.line}}
.wg-load i.on{background:#FFA53D} .wg-load i.hot{background:${T.accent}}
.wg-grid{display:grid;grid-template-columns:var(--wg-cols);position:relative;
  transition:grid-template-columns .26s cubic-bezier(.4,0,.2,1)}
.wg-col{position:relative;border-left:1px solid ${T.line}}
.wg-col.wg-weekend{background:rgba(232,223,210,.28)}
.wg-col.wg-todaycol{background:rgba(255,90,60,.045)}
.wg-col.wg-focus{background:rgba(255,165,61,.07)}
.wg-col.wg-dim{opacity:.4}
.wg-slot{height:${PXH}px;border-top:1px solid ${T.line};cursor:pointer}
/* half-hour hairline — makes the grid readable without doubling the line count */
.wg-slot::after{content:"";display:block;height:${PXH / 2}px;border-bottom:1px dashed rgba(232,223,210,.85)}
.wg-ev{position:absolute;border-radius:7px;padding:3px 4px;overflow:hidden;cursor:pointer;
  font-size:9px;line-height:1.15;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.16);
  border-left:3px solid rgba(255,255,255,.5);text-align:left}
.wg-ev b{display:block;font-weight:800;font-size:9.5px}
.wg-ev .wg-m{opacity:.9;font-size:8.5px;display:block}
.wg-ev.wg-big{font-size:11px;padding:5px 7px}
.wg-ev.wg-big b{font-size:11.5px}
.wg-ev.wg-big .wg-m{font-size:10px}
.wg-ev.wg-cancelled{background:transparent!important;border:1.5px dashed currentColor;box-shadow:none}
.wg-ev.wg-cancelled b{text-decoration:line-through}
.wg-pair{position:absolute;right:2px;top:2px;background:rgba(255,255,255,.92);color:${T.ink};
  font-size:7.5px;font-weight:800;border-radius:6px;padding:0 3px}
.wg-now{position:absolute;left:0;right:0;z-index:9;pointer-events:none}
.wg-now div{height:2px;background:${T.accent};box-shadow:0 0 8px rgba(255,90,60,.5)}
.wg-now b{position:absolute;left:2px;top:-8px;background:${T.accent};color:#fff;font-size:8.5px;
  font-weight:800;padding:1px 5px;border-radius:8px}
@keyframes wgPulse{0%{background:rgba(255,90,60,.24)}100%{background:rgba(255,90,60,.045)}}
.wg-col.wg-pulse{animation:wgPulse .9s ease-out}
`;

export default function WeekGrid({
  weekOff = 0, events = [], onSlotClick, onEventClick,
  emptyNote = "Nothing scheduled this week.",
}) {
  const [focusDay, setFocusDay] = useState(null);
  const [sel, setSel] = useState(TODAY);
  const scrollRef = useRef(null);
  const [pulse, setPulse] = useState(false);

  // open near the working day rather than at 05:00, which is always empty
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const target = weekOff === 0 ? nowMinutes() : 8 * 60;
    el.scrollTop = Math.max(0, (target - HS * 60) / 60 * PXH - el.clientHeight / 3);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cols = focusDay === null
    ? `${GUT}px repeat(7,1fr)`
    : `${GUT}px ${[...Array(7)].map((_, i) => (i === focusDay ? "3fr" : "1fr")).join(" ")}`;

  const evsFor = (d) => {
    const list = events.filter(e => e.day === d).sort((a, b) => a.start - b.start);
    const laneEnds = [];
    list.forEach(e => { let i = 0; for (; i < laneEnds.length; i++) if (laneEnds[i] <= e.start) break;
      e._lane = i; laneEnds[i] = e.start + e.dur; });
    list._lanes = Math.max(1, laneEnds.length);
    return list;
  };

  const pickDay = (i) => { setSel(i); setFocusDay(f => (f === i ? null : i)); };

  const jumpNow = () => {
    setFocusDay(null); setSel(TODAY);
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ top: Math.max(0, (nowMinutes() - HS * 60) / 60 * PXH - el.clientHeight / 2), behavior: "smooth" });
    setPulse(false); requestAnimationFrame(() => setPulse(true));
    setTimeout(() => setPulse(false), 1000);
  };

  const focusStats = () => {
    const evs = events.filter(e => e.day === focusDay && !e.cancelled);
    const mins = evs.reduce((t, e) => t + e.dur, 0);
    return evs.length ? `${evs.length} session${evs.length > 1 ? "s" : ""} · ${(mins / 60).toFixed(1)}h` : "Nothing booked";
  };

  return (
    <div style={{ "--wg-cols": cols }}>
      <style>{CSS}</style>

      {/* day rail */}
      <div className="wg-days">
        <div/>
        {DAYS.map((d, i) => {
          const n = events.filter(e => e.day === i && !e.cancelled).length;
          const isToday = weekOff === 0 && i === TODAY;
          const dim = focusDay !== null && i !== focusDay;
          const dt = dateFor(weekOff, i);
          return (
            <button key={d} onClick={() => pickDay(i)}
              aria-label={`${FULLDAYS[i]} ${fmtDM(dt)}, ${n} sessions`}
              className={`wg-dh ${isToday ? "wg-today" : ""} ${sel === i ? "wg-sel" : ""} ${dim ? "wg-dim" : ""}`}>
              <div className="wg-dow">{d.toUpperCase()}</div>
              <div className="wg-num" style={disp}>{dt.getDate()}</div>
              <div className="wg-load">
                {[0,1,2].map(k => <i key={k} className={k < n ? (n > 3 ? "hot" : "on") : ""}/>)}
              </div>
            </button>);
        })}
      </div>

      {/* focus bar — what expanded, and the way out */}
      {focusDay !== null && (
        <div className="flex items-center gap-2 px-1 py-1.5" style={{ background: "#FBF3EC", borderBottom: `1px solid ${T.line}` }}>
          <span style={{ ...disp, fontWeight: 700, fontSize: 12.5 }}>
            {FULLDAYS[focusDay]} {fmtDM(dateFor(weekOff, focusDay))}</span>
          <span className="text-[11px]" style={{ color: T.muted }}>{focusStats()}</span>
          <button onClick={() => setFocusDay(null)} className="ml-auto text-[11px] font-bold" style={{ color: T.accent }}>
            Show full week</button>
        </div>)}

      <div ref={scrollRef} style={{ maxHeight: 460, overflowY: "auto", overscrollBehavior: "contain",
        border: `1.5px solid ${T.line}`, borderRadius: 14, background: T.card, paddingBottom: 8 }}>
        <div className="wg-grid">
          {/* gutter */}
          <div style={{ position: "relative" }}>
            {Array.from({ length: HE - HS + 1 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", top: i === HE - HS ? GRID_H - 11 : Math.max(0, i * PXH - 5),
                left: 3, fontSize: 9.5, color: T.muted, whiteSpace: "nowrap" }}>{HS + i}:00</div>))}
            <div style={{ height: GRID_H }}/>
          </div>

          {[0,1,2,3,4,5,6].map(d => {
            const evs = evsFor(d), lanes = evs._lanes;
            const isToday = weekOff === 0 && d === TODAY;
            const cls = [d >= 5 ? "wg-weekend" : "", isToday ? "wg-todaycol" : "",
              focusDay === null ? "" : (d === focusDay ? "wg-focus" : "wg-dim"),
              isToday && pulse ? "wg-pulse" : ""].join(" ");
            return (
              <div key={d} className={`wg-col ${cls}`}>
                {Array.from({ length: HE - HS }).map((_, i) => (
                  <div key={i} className="wg-slot" onClick={() => onSlotClick && onSlotClick(d, HS + i)}/>))}
                {/* closes the final hour so 22:00–23:00 reads as a full row */}
                <div style={{ position: "absolute", left: 0, right: 0, top: GRID_H, borderTop: `1px solid ${T.line}` }}/>

                {isToday && (() => {
                  const m = nowMinutes();
                  if (m < HS * 60 || m > HE * 60) return null;
                  return (<div className="wg-now" style={{ top: (m - HS * 60) / 60 * PXH }}>
                    <div/>{focusDay === d && <b style={disp}>{fmt(m)}</b>}</div>);
                })()}

                {evs.map((e, i) => {
                  const top = (e.start - HS * 60) / 60 * PXH;
                  // clamp so a late session can't escape the box and vanish
                  const h = Math.max(19, Math.min(e.dur / 60 * PXH - 2, GRID_H - top - 2));
                  const big = focusDay === d;
                  return (
                    <button key={e.id ?? i} onClick={(ev) => { ev.stopPropagation(); onEventClick && onEventClick(e); }}
                      className={`wg-ev ${e.cancelled ? "wg-cancelled" : ""} ${big ? "wg-big" : ""}`}
                      style={{ top: top + 1, height: h, left: `calc(${(e._lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                        background: e.cancelled ? "transparent" : e.color,
                        color: e.cancelled ? e.color : "#fff" }}>
                      <b>{big ? (e.title || e.code) : e.code}</b>
                      {h > 28 && <span className="wg-m">{fmt(e.start)}{big && e.sub ? ` · ${e.sub}` : ""}</span>}
                      {e.coaches > 1 && <span className="wg-pair">{e.coaches}</span>}
                    </button>);
                })}
              </div>);
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <div className="text-[11px]" style={{ color: T.muted }}>
          {events.length === 0 ? emptyNote : "Tap a day to expand it · tap a slot to book"}
        </div>
        {weekOff === 0 && (
          <button onClick={jumpNow} className="text-[11px] font-bold px-2 py-1 rounded-lg"
            style={{ border: `1.5px solid ${T.line}`, color: T.ink }}>Now</button>)}
      </div>
    </div>);
}
