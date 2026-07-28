/* The date-range and granularity control, shared by every report.
 *
 * One control, one state shape. If each report grew its own range picker they
 * would drift — different presets, different inclusive/exclusive end dates — and
 * two reports would disagree about the same month while both looking right.
 *
 * The resolved range is written out in words underneath. "Last 30 days" is not a
 * date, and anyone reading a figure off this screen to put in a spreadsheet needs
 * to know exactly which days it covers.
 */

import { GRAINS, RANGE_PRESETS, fmtISO, isForwardRange, rangeDays } from "../lib/period.js";
import { T, disp } from "../theme.js";
import { Chip, DateInput } from "../ui/kit.jsx";
import { toISO } from "../lib/dates.js";

/* `allowFuture` opens the custom pickers past today. Reports that only look
   backwards (money already taken, expenses already paid) keep the cap — a P&L with a
   future end date is a P&L nobody can explain. The coach log and the payout run need
   it, because a forecast is a legitimate question about the same rows. */
export default function RangeBar({ value, onChange, range, grain, onGrain, note, allowFuture }) {
  const custom = value.key === "custom";
  const today = toISO(new Date());
  const maxDate = allowFuture ? undefined : today;

  return (
    <div className="rounded-2xl p-3" style={{ background: T.card, border: `1.5px solid ${T.line}` }}>
      <div className="text-[10px] font-bold mb-1.5" style={{ color: T.muted }}>PERIOD</div>
      <div className="flex gap-1.5 flex-wrap">
        {RANGE_PRESETS.filter(p => allowFuture || !isForwardRange(p.key)).map(p => (
          <button key={p.key} onClick={() => onChange({ key: p.key, from: value.from, to: value.to })}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{ background: value.key === p.key ? T.ink : "transparent",
              color: value.key === p.key ? T.paper : T.ink,
              border: `1.5px solid ${value.key === p.key ? T.ink : T.line}` }}>{p.label}</button>))}
        <button onClick={() => onChange({ key: "custom",
            from: value.from || range.from, to: value.to || range.to })}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
          style={{ background: custom ? T.ink : "transparent", color: custom ? T.paper : T.ink,
            border: `1.5px solid ${custom ? T.ink : T.line}` }}>Custom…</button>
      </div>

      {custom && (
        <div className="flex items-end gap-2 mt-2">
          <div className="flex-1">
            <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>FROM</div>
            <DateInput value={value.from} max={maxDate}
              onChange={v => onChange({ ...value, key: "custom", from: v })} style={{ width: "100%" }}/>
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold mb-1" style={{ color: T.muted }}>TO</div>
            <DateInput value={value.to} max={maxDate}
              onChange={v => onChange({ ...value, key: "custom", to: v })} style={{ width: "100%" }}/>
          </div>
        </div>)}

      {onGrain && (<>
        <div className="text-[10px] font-bold mt-3 mb-1.5" style={{ color: T.muted }}>TREND BY</div>
        <div className="flex gap-1.5">
          {GRAINS.map(g => (
            <Chip key={g.key} active={grain === g.key} onClick={() => onGrain(g.key)}>{g.label}</Chip>))}
        </div>
      </>)}

      {/* Spell out what was actually selected — a preset name is not a date. */}
      <div className="text-[11px] mt-2" style={{ color: T.muted }}>
        {range.key === "all"
          ? "Everything on record."
          : <>{fmtISO(range.from)} → {fmtISO(range.to)} · {rangeDays(range)} days, end date included.</>}
        {note ? ` ${note}` : ""}
      </div>
    </div>);
}
