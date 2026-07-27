/* WeekGrid — the one time-grid in the app.
 *
 * Danny runs his business out of Google Calendar. Moving him onto this app is only
 * defensible if the calendar is at least as capable, so this component carries the
 * three things a paper timetable can't do: see it, open it, move it.
 *
 * ONE implementation for every shape of the grid:
 *   • week   — 7 day columns
 *   • day    — 1 day column, roomy
 *   • coach  — one column per coach for a single day (admin only)
 * There were previously two hand-rolled copies (client Book, staff Schedule) plus
 * a third inline DayGrid. They drifted: the same clipping bug had to be fixed
 * twice, and only one ever got the now-line. Columns are now data, not layout.
 *
 * The design problem: seven columns on a 390px phone is ~48px each, unreadable.
 * Rather than dropping to 3 days and losing the week, tapping a day FOCUSES it —
 * that column expands to ~3x while the rest compress but stay on screen.
 *
 * DRAG TO MOVE is the feature that makes this feel like a calendar rather than a
 * report. Long-press a block, drag it, drop it. Every drop is validated by the
 * same conflict engine the builders use, so an invalid drop is refused with the
 * reason rather than silently landing on top of another booking.
 *
 * Hours are fixed at CAL_HSTART..CAL_HEND (05:00–23:00).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CAL_HEND, CAL_HSTART, DAYS, FULLDAYS, TODAY, dateFor, fmtDM } from "../lib/dates.js";
import { T, disp } from "../theme.js";

const HS = CAL_HSTART, HE = CAL_HEND;
const GUT = 46;
const SNAP = 15;                 // drag snaps to quarter hours, like Google Calendar
const HOLD_MS = 300;             // long-press before a drag starts, so scrolling still works
const MOVE_SLOP = 8;             // px of finger travel that cancels the long-press

export const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;

/* Scoped CSS — pseudo-elements and keyframes that inline styles can't express. */
const CSS = `
.wg-days{display:grid;grid-template-columns:var(--wg-cols);border-bottom:1px solid ${T.line};
  transition:grid-template-columns .26s cubic-bezier(.4,0,.2,1)}
.wg-dh{padding:5px 0 7px;text-align:center;cursor:pointer;background:none;border:none;font-family:inherit;
  min-width:0;overflow:hidden}
.wg-dh .wg-dow{font-size:9px;font-weight:800;letter-spacing:.06em;color:${T.muted};
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px}
.wg-dh .wg-num{font-weight:700;font-size:15px;width:26px;height:26px;margin:1px auto 0;
  border-radius:50%;display:grid;place-items:center;color:${T.ink}}
.wg-dh.wg-today .wg-num{background:${T.accent};color:#fff}
.wg-dh.wg-sel .wg-num{background:${T.ink};color:#fff}
.wg-dh.wg-today.wg-sel .wg-num{background:${T.accent};box-shadow:0 0 0 2.5px rgba(255,90,60,.28)}
.wg-dh.wg-dim{opacity:.42}
.wg-dh.wg-drop{background:rgba(255,165,61,.18);border-radius:8px}
.wg-load{display:flex;gap:2px;justify-content:center;margin-top:3px;height:4px}
.wg-load i{width:4px;height:4px;border-radius:2px;background:${T.line}}
.wg-load i.on{background:#FFA53D} .wg-load i.hot{background:${T.accent}}
.wg-grid{display:grid;grid-template-columns:var(--wg-cols);position:relative;
  transition:grid-template-columns .26s cubic-bezier(.4,0,.2,1)}
.wg-col{position:relative;border-left:1px solid ${T.line};min-width:0}
.wg-col.wg-weekend{background:rgba(232,223,210,.28)}
.wg-col.wg-todaycol{background:rgba(255,90,60,.045)}
.wg-col.wg-focus{background:rgba(255,165,61,.07)}
.wg-col.wg-dim{opacity:.4}
.wg-col.wg-drop{background:rgba(255,165,61,.12)}
.wg-slot{border-top:1px solid ${T.line};cursor:pointer}
/* half-hour hairline — makes the grid readable without doubling the line count */
.wg-slot::after{content:"";display:block;height:50%;border-bottom:1px dashed rgba(232,223,210,.85)}
.wg-ev{position:absolute;border-radius:7px;padding:3px 4px;overflow:hidden;cursor:pointer;
  font-size:9px;line-height:1.15;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.16);
  border-left:3px solid rgba(255,255,255,.5);text-align:left;touch-action:pan-y;
  transition:box-shadow .15s,transform .15s}
.wg-ev b{display:block;font-weight:800;font-size:9.5px}
.wg-ev .wg-m{opacity:.9;font-size:8.5px;display:block}
.wg-ev.wg-big{font-size:11px;padding:5px 7px}
.wg-ev.wg-big b{font-size:11.5px}
.wg-ev.wg-big .wg-m{font-size:10px}
.wg-ev.wg-cancelled{background:transparent!important;border:1.5px dashed currentColor;box-shadow:none}
.wg-ev.wg-cancelled b{text-decoration:line-through}
.wg-ev.wg-lifted{opacity:.28}
.wg-ev.wg-armed{box-shadow:0 0 0 2.5px rgba(255,90,60,.55),0 4px 10px rgba(0,0,0,.2);transform:scale(1.03);z-index:12}
.wg-pair{position:absolute;right:2px;top:2px;background:rgba(255,255,255,.92);color:${T.ink};
  font-size:7.5px;font-weight:800;border-radius:6px;padding:0 3px}
.wg-lock{position:absolute;right:2px;bottom:1px;font-size:7.5px;opacity:.8}
.wg-now{position:absolute;left:0;right:0;z-index:9;pointer-events:none}
.wg-now div{height:2px;background:${T.accent};box-shadow:0 0 8px rgba(255,90,60,.5)}
.wg-now b{position:absolute;left:2px;top:-8px;background:${T.accent};color:#fff;font-size:8.5px;
  font-weight:800;padding:1px 5px;border-radius:8px}
@keyframes wgPulse{0%{background:rgba(255,90,60,.24)}100%{background:rgba(255,90,60,.045)}}
.wg-col.wg-pulse{animation:wgPulse .9s ease-out}
/* drag ghost — where the block will land, and whether it may */
.wg-ghost{position:absolute;z-index:20;border-radius:7px;pointer-events:none;
  border:2px dashed;display:flex;align-items:center;justify-content:center;
  font-size:9.5px;font-weight:800;text-align:center;padding:2px}
.wg-ghost.ok{border-color:${T.moss || "#1F7A4D"};background:rgba(31,122,77,.14);color:${T.moss || "#1F7A4D"}}
.wg-ghost.no{border-color:${T.accent};background:rgba(255,90,60,.14);color:${T.accent}}
.wg-dragbar{position:sticky;top:0;z-index:25;padding:6px 10px;font-size:11px;font-weight:700;
  border-radius:0 0 10px 10px;text-align:center}
`;

/* Lane packing: overlapping blocks in a column sit side by side. */
const packLanes = (list) => {
  const sorted = [...list].sort((a, b) => a.start - b.start || b.dur - a.dur);
  const laneEnds = [];
  sorted.forEach(e => {
    let i = 0;
    for (; i < laneEnds.length; i++) if (laneEnds[i] <= e.start) break;
    e._lane = i; laneEnds[i] = e.start + e.dur;
  });
  sorted._lanes = Math.max(1, laneEnds.length);
  return sorted;
};

export default function WeekGrid({
  weekOff = 0,
  columns,                       // [{key, day, label, big, isToday, weekend}] — defaults to the 7 weekdays
  events = [],                   // [{id, col?, day?, start, dur, color, code, title, sub, cancelled, coaches, locked}]
  onSlotClick,                   // (colKey, minutes)
  onEventClick,
  validateDrop,                  // ({ev, colKey, start}) => {ok:boolean, message:string}
  onEventDrop,                   // ({ev, colKey, start}) => void — only called when validateDrop says ok
  emptyNote = "Nothing scheduled this week.",
  hourPx,                        // override row height (day/coach views get more room)
  maxHeight = 460,
  focusable,                     // tap-a-column-to-expand; defaults on for >3 columns
}) {
  /* Default column set: the week. Everything downstream reads `columns`, so the
     day and coach views are the same code path with a different list. */
  const cols = useMemo(() => columns || DAYS.map((d, i) => ({
    key: i, day: i, label: d.toUpperCase(), isToday: weekOff === 0 && i === TODAY, weekend: i >= 5,
  })), [columns, weekOff]);

  const N = cols.length;
  const PXH = hourPx || (N >= 6 ? 54 : N >= 3 ? 62 : 74);
  const GRID_H = (HE - HS) * PXH;
  const canFocus = focusable ?? N > 3;

  const [focusCol, setFocusCol] = useState(null);
  const [sel, setSel] = useState(() => (cols.find(c => c.isToday) || cols[0] || {}).key);
  const [pulse, setPulse] = useState(false);
  const [drag, setDrag] = useState(null);   // {ev, colKey, start, verdict}
  const [nowM, setNowM] = useState(nowMinutes);

  const scrollRef = useRef(null);
  const colRefs = useRef({});
  const holdRef = useRef(null);             // {timer, id, x, y, armed}
  /* A pointerup that ends a tap already opened the sheet; the browser then fires a
     click for the same gesture. Without this the sheet opens twice. Comparing
     timestamps rather than sniffing `PointerEvent in window` keeps the click path
     alive for keyboards and for jsdom, where pointer events never fire at all. */
  const handledRef = useRef(0);

  /* The now-line has to move or it lies. A minute tick is cheap and it is the
     single most-read thing on the grid. */
  useEffect(() => {
    const t = setInterval(() => setNowM(nowMinutes()), 60000);
    // Browsers return a number and ignore this; Node returns a Timeout, and without
    // unref the test runner mounts the grid and then never exits.
    t?.unref?.();
    return () => clearInterval(t);
  }, []);

  // open near the working day rather than at 05:00, which is always empty
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const target = weekOff === 0 ? nowMinutes() : 8 * 60;
    el.scrollTop = Math.max(0, (target - HS * 60) / 60 * PXH - el.clientHeight / 3);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gridCols = focusCol === null
    ? `${GUT}px repeat(${N},1fr)`
    : `${GUT}px ${cols.map(c => (c.key === focusCol ? "3fr" : "1fr")).join(" ")}`;

  const byCol = useMemo(() => {
    const m = {};
    cols.forEach(c => { m[c.key] = []; });
    events.forEach(e => { const k = e.col ?? e.day; if (m[k]) m[k].push(e); });
    Object.keys(m).forEach(k => { m[k] = packLanes(m[k]); });
    return m;
  }, [events, cols]);

  const pickCol = (k) => { setSel(k); if (canFocus) setFocusCol(f => (f === k ? null : k)); };

  const jumpNow = () => {
    setFocusCol(null);
    const t = cols.find(c => c.isToday); if (t) setSel(t.key);
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ top: Math.max(0, (nowMinutes() - HS * 60) / 60 * PXH - el.clientHeight / 2), behavior: "smooth" });
    setPulse(false); requestAnimationFrame(() => setPulse(true));
    setTimeout(() => setPulse(false), 1000);
  };

  const focusStats = () => {
    const evs = (byCol[focusCol] || []).filter(e => !e.cancelled);
    const mins = evs.reduce((t, e) => t + e.dur, 0);
    return evs.length ? `${evs.length} session${evs.length > 1 ? "s" : ""} · ${(mins / 60).toFixed(1)}h` : "Nothing booked";
  };

  /* ---------------- drag to move ----------------
     Long-press arms the drag so a normal finger-scroll over a block still scrolls.
     Once armed, the block follows the finger and the drop target is validated on
     every move, not just on release — you find out it won't fit while you can
     still do something about it. */
  const canDrag = !!onEventDrop;

  const hitColumn = (clientX) => {
    let best = null;
    cols.forEach(c => {
      const el = colRefs.current[c.key]; if (!el) return;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) best = c.key;
    });
    if (best === null) {
      // outside every column (dragged over the gutter) — keep the nearest
      let dist = Infinity;
      cols.forEach(c => {
        const el = colRefs.current[c.key]; if (!el) return;
        const r = el.getBoundingClientRect();
        const d = clientX < r.left ? r.left - clientX : clientX - r.right;
        if (d < dist) { dist = d; best = c.key; }
      });
    }
    return best;
  };

  const startFor = (clientY, ev) => {
    const el = colRefs.current[cols[0].key]; if (!el) return ev.start;
    const r = el.getBoundingClientRect();
    const grabOff = holdRef.current?.grabMin ?? 0;
    const mins = HS * 60 + ((clientY - r.top) / PXH) * 60 - grabOff;
    const snapped = Math.round(mins / SNAP) * SNAP;
    return Math.max(HS * 60, Math.min(snapped, HE * 60 - ev.dur));
  };

  const evaluate = (ev, colKey, start) => {
    if (!validateDrop) return { ok: true, message: "" };
    try { return validateDrop({ ev, colKey, start }) || { ok: true, message: "" }; }
    catch { return { ok: false, message: "Couldn't check that slot" }; }
  };

  const onPointerDown = (e, ev) => {
    if (!canDrag || ev.locked || ev.cancelled) return;
    const { clientX, clientY } = e;
    const el = colRefs.current[ev.col ?? ev.day];
    const grabMin = el
      ? Math.max(0, HS * 60 + ((clientY - el.getBoundingClientRect().top) / PXH) * 60 - ev.start)
      : 0;
    const timer = setTimeout(() => {
      holdRef.current = { ...holdRef.current, armed: true };
      if (navigator.vibrate) navigator.vibrate(12);
      const colKey = ev.col ?? ev.day;
      setDrag({ ev, colKey, start: ev.start, verdict: evaluate(ev, colKey, ev.start) });
    }, HOLD_MS);
    holdRef.current = { timer, x: clientX, y: clientY, armed: false, id: ev.id, grabMin };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  };

  const onPointerMove = (e, ev) => {
    const h = holdRef.current; if (!h || h.id !== ev.id) return;
    if (!h.armed) {
      // finger travelled before the hold completed → they meant to scroll
      if (Math.abs(e.clientX - h.x) > MOVE_SLOP || Math.abs(e.clientY - h.y) > MOVE_SLOP) {
        clearTimeout(h.timer); holdRef.current = null;
      }
      return;
    }
    e.preventDefault();
    const colKey = hitColumn(e.clientX);
    const start = startFor(e.clientY, ev);
    // auto-scroll near the edges, otherwise you can't reach 07:00 from 19:00
    const sc = scrollRef.current;
    if (sc) {
      const r = sc.getBoundingClientRect();
      if (e.clientY < r.top + 36) sc.scrollTop -= 10;
      else if (e.clientY > r.bottom - 36) sc.scrollTop += 10;
    }
    setDrag(d => (d && d.colKey === colKey && d.start === start)
      ? d : { ev, colKey, start, verdict: evaluate(ev, colKey, start) });
  };

  const onPointerUp = (e, ev) => {
    const h = holdRef.current;
    if (h) clearTimeout(h.timer);
    holdRef.current = null;
    handledRef.current = Date.now();
    if (!h?.armed) { onEventClick && onEventClick(ev); setDrag(null); return; }
    const d = drag;
    setDrag(null);
    if (!d) return;
    const moved = d.colKey !== (ev.col ?? ev.day) || d.start !== ev.start;
    if (!moved) { onEventClick && onEventClick(ev); return; }
    if (!d.verdict.ok) return;                 // refused; the ghost already said why
    onEventDrop({ ev, colKey: d.colKey, start: d.start });
  };

  const dayLoad = (k) => (byCol[k] || []).filter(e => !e.cancelled).length;

  return (
    <div style={{ "--wg-cols": gridCols }}>
      <style>{CSS}</style>

      {/* live drag verdict — sticky so it's readable with a finger on the grid */}
      {drag && (
        <div className="wg-dragbar" style={{
          background: drag.verdict.ok ? "#EAF4EE" : "#F7EEE9",
          color: drag.verdict.ok ? (T.moss || "#1F7A4D") : T.accent }}>
          {drag.verdict.ok
            ? `Drop to move → ${cols.find(c => c.key === drag.colKey)?.dropLabel
                ?? FULLDAYS[cols.find(c => c.key === drag.colKey)?.day] ?? ""} ${fmtMin(drag.start)}`
            : drag.verdict.message}
        </div>)}

      {/* column rail */}
      <div className="wg-days">
        <div/>
        {cols.map(c => {
          const n = dayLoad(c.key);
          const dim = focusCol !== null && c.key !== focusCol;
          const dt = c.day != null ? dateFor(weekOff, c.day) : null;
          return (
            <button key={c.key} onClick={() => pickCol(c.key)}
              aria-label={`${c.aria || c.label}${dt ? ` ${fmtDM(dt)}` : ""}, ${n} sessions`}
              className={`wg-dh ${c.isToday ? "wg-today" : ""} ${sel === c.key ? "wg-sel" : ""} ${dim ? "wg-dim" : ""} ${drag?.colKey === c.key ? "wg-drop" : ""}`}>
              <div className="wg-dow">{c.label}</div>
              {c.big !== null && (
                <div className="wg-num" style={disp}>{c.big ?? (dt ? dt.getDate() : "")}</div>)}
              <div className="wg-load">
                {[0,1,2].map(k => <i key={k} className={k < n ? (n > 3 ? "hot" : "on") : ""}/>)}
              </div>
            </button>);
        })}
      </div>

      {/* focus bar — what expanded, and the way out */}
      {focusCol !== null && (
        <div className="flex items-center gap-2 px-1 py-1.5" style={{ background: "#FBF3EC", borderBottom: `1px solid ${T.line}` }}>
          <span style={{ ...disp, fontWeight: 700, fontSize: 12.5 }}>
            {(() => { const c = cols.find(x => x.key === focusCol);
              return c?.day != null ? `${FULLDAYS[c.day]} ${fmtDM(dateFor(weekOff, c.day))}` : (c?.aria || c?.label); })()}
          </span>
          <span className="text-[11px]" style={{ color: T.muted }}>{focusStats()}</span>
          <button onClick={() => setFocusCol(null)} className="ml-auto text-[11px] font-bold" style={{ color: T.accent }}>
            Show full week</button>
        </div>)}

      <div ref={scrollRef} style={{ height: maxHeight, overflowY: "auto", overscrollBehavior: "none", WebkitOverflowScrolling: "touch",
        border: `1.5px solid ${T.line}`, borderRadius: 14, background: T.card, paddingBottom: 8,
        touchAction: drag ? "none" : "auto" }}>
        <div className="wg-grid">
          {/* gutter */}
          <div style={{ position: "relative" }}>
            {Array.from({ length: HE - HS + 1 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", top: i === HE - HS ? GRID_H - 11 : Math.max(0, i * PXH - 5),
                left: 3, fontSize: 9.5, color: T.muted, whiteSpace: "nowrap" }}>{HS + i}:00</div>))}
            <div style={{ height: GRID_H }}/>
          </div>

          {cols.map(c => {
            const evs = byCol[c.key] || [], lanes = evs._lanes || 1;
            const cls = [c.weekend ? "wg-weekend" : "", c.isToday ? "wg-todaycol" : "",
              focusCol === null ? "" : (c.key === focusCol ? "wg-focus" : "wg-dim"),
              drag?.colKey === c.key ? "wg-drop" : "",
              c.isToday && pulse ? "wg-pulse" : ""].join(" ");
            const big = focusCol === c.key || N <= 2;
            return (
              <div key={c.key} ref={el => { colRefs.current[c.key] = el; }} className={`wg-col ${cls}`}>
                {Array.from({ length: HE - HS }).map((_, i) => (
                  <div key={i} className="wg-slot" style={{ height: PXH }}
                    onClick={() => onSlotClick && onSlotClick(c.key, (HS + i) * 60)}/>))}
                {/* closes the final hour so 22:00–23:00 reads as a full row */}
                <div style={{ position: "absolute", left: 0, right: 0, top: GRID_H, borderTop: `1px solid ${T.line}` }}/>

                {c.isToday && nowM >= HS * 60 && nowM <= HE * 60 && (
                  <div className="wg-now" style={{ top: (nowM - HS * 60) / 60 * PXH }}>
                    <div/>{big && <b style={disp}>{fmtMin(nowM)}</b>}
                  </div>)}

                {evs.map((e, i) => {
                  const top = (e.start - HS * 60) / 60 * PXH;
                  // clamp so a late session can't escape the box and vanish
                  const h = Math.max(19, Math.min(e.dur / 60 * PXH - 2, GRID_H - top - 2));
                  const lifted = drag && drag.ev.id === e.id;
                  const armed = holdRef.current?.armed && holdRef.current?.id === e.id;
                  return (
                    <button key={e.id ?? i}
                      onPointerDown={(pe) => onPointerDown(pe, e)}
                      onPointerMove={(pe) => onPointerMove(pe, e)}
                      onPointerUp={(pe) => onPointerUp(pe, e)}
                      onPointerCancel={() => { if (holdRef.current) clearTimeout(holdRef.current.timer);
                        holdRef.current = null; setDrag(null); }}
                      onClick={(pe) => { pe.stopPropagation();
                        if (Date.now() - handledRef.current < 600) return;  // pointerup already opened it
                        onEventClick && onEventClick(e); }}
                      onKeyDown={(ke) => { if (ke.key === "Enter" || ke.key === " ") { ke.preventDefault(); onEventClick && onEventClick(e); } }}
                      className={`wg-ev ${e.cancelled ? "wg-cancelled" : ""} ${big ? "wg-big" : ""} ${lifted ? "wg-lifted" : ""} ${armed ? "wg-armed" : ""}`}
                      style={{ top: top + 1, height: h, left: `calc(${(e._lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                        background: e.cancelled ? "transparent" : e.color,
                        color: e.cancelled ? e.color : "#fff" }}>
                      <b>{big ? (e.title || e.code) : e.code}</b>
                      {h > 28 && <span className="wg-m">{fmtMin(e.start)}{big && e.sub ? ` · ${e.sub}` : ""}</span>}
                      {e.coaches > 1 && <span className="wg-pair">{e.coaches}</span>}
                      {e.locked && <span className="wg-lock">🔒</span>}
                    </button>);
                })}

                {/* drop ghost */}
                {drag && drag.colKey === c.key && (() => {
                  const top = (drag.start - HS * 60) / 60 * PXH;
                  const h = Math.max(20, Math.min(drag.ev.dur / 60 * PXH - 2, GRID_H - top - 2));
                  return (
                    <div className={`wg-ghost ${drag.verdict.ok ? "ok" : "no"}`}
                      style={{ top: top + 1, height: h, left: 2, right: 2 }}>
                      {drag.verdict.ok ? fmtMin(drag.start) : "✕"}
                    </div>);
                })()}
              </div>);
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 gap-2">
        <div className="text-[11px]" style={{ color: T.muted }}>
          {events.length === 0 ? emptyNote
            : canDrag ? "Tap to open · press and hold to drag a session"
            : canFocus ? "Tap a day to expand it · tap a slot to book"
            : "Tap a slot to book"}
        </div>
        {cols.some(c => c.isToday) && (
          <button onClick={jumpNow} className="text-[11px] font-bold px-2 py-1 rounded-lg shrink-0"
            style={{ border: `1.5px solid ${T.line}`, color: T.ink }}>Now</button>)}
      </div>
    </div>);
}
