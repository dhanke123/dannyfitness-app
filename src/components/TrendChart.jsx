/* A small bar trend, drawn in SVG. No chart library — this is a handful of
 * rectangles and pulling in Recharts to draw them would cost more than the whole
 * analytics engine.
 *
 * Empty buckets are drawn as empty, not skipped. Dropping a week with no revenue
 * turns a gap into a smooth line and hides exactly the thing you opened the trend
 * to look for.
 *
 * Labels thin out rather than overlapping: on a 390px phone twelve months of
 * labels is a grey smear, so every other one is dropped once they'd collide.
 */

import { T, disp } from "../theme.js";

const money = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

export default function TrendChart({ data, height = 96, color = T.ink, format = money, emptyNote }) {
  const { series = [], max = 0, undated = 0 } = data || {};
  if (!series.length) return (
    <div className="text-[11px] py-3 text-center" style={{ color: T.muted }}>
      {emptyNote || "Pick a fixed period to see a trend — “All time” has no buckets to plot."}
    </div>);

  const n = series.length;
  const W = 320, H = height, PAD = 2;
  const bw = W / n;
  // keep bars visible when everything is zero, rather than rendering an empty box
  const scale = (v) => (max > 0 ? (v / max) * (H - 18) : 0);
  const every = n > 8 ? Math.ceil(n / 6) : 1;
  const peak = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);
  const total = series.reduce((t, b) => t + b.value, 0);
  const avg = total / n;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Trend across ${n} periods, peak ${format(peak.value)} in ${peak.label}`}>
        {/* average line — a bar chart with no reference tells you order, not size */}
        {max > 0 && (
          <line x1="0" x2={W} y1={H - 14 - scale(avg)} y2={H - 14 - scale(avg)}
            stroke={T.line} strokeWidth="1" strokeDasharray="3 3"/>)}
        {series.map((b, i) => {
          const h = scale(b.value);
          const isPeak = b.value === max && max > 0;
          return (
            <g key={b.key}>
              <rect x={i * bw + PAD} y={H - 14 - h} width={bw - PAD * 2} height={Math.max(h, 1.5)}
                rx="2" fill={b.value === 0 ? T.line : isPeak ? T.accent : color}
                opacity={b.value === 0 ? .5 : isPeak ? 1 : .82}/>
              {i % every === 0 && (
                <text x={i * bw + bw / 2} y={H - 3} textAnchor="middle"
                  fontSize="8" fill={T.muted}>{b.label}</text>)}
            </g>);
        })}
      </svg>
      <div className="flex items-center justify-between text-[10px]" style={{ color: T.muted }}>
        <span>peak <b style={{ color: T.accent }}>{format(peak.value)}</b> · {peak.label}</span>
        <span>avg {format(avg)} per {n > 0 ? "period" : ""}</span>
      </div>
      {undated > 0 && (
        <div className="text-[10px] mt-1" style={{ color: T.orange }}>
          {undated} record{undated === 1 ? "" : "s"} carry no date and are not plotted — they still
          count in the totals above.
        </div>)}
    </div>);
}
