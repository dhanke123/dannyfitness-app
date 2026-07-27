/* Admin → Reports. Headline numbers on screen, full detail as CSV.
 *
 * The split is deliberate: Danny glances at this on a phone between sessions, and
 * forwards the CSV to whoever does his books. Rendering forty rows of ledger detail
 * on a 390px screen serves neither.
 *
 * EVERY report is scoped by one shared date range and one shared granularity
 * (RangeBar → lib/period.js). Two things follow from that:
 *
 *   • Switching family keeps the period. Comparing expenses to revenue for the same
 *     month is the actual question, and re-picking the dates on every tab is how
 *     people end up accidentally comparing different months.
 *   • The CSV carries the period in its filename and in a header row. A file called
 *     `pnl.csv` sitting in an accountant's inbox with no dates on it is a liability.
 */

import { useMemo, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import {
  capacity, clientInsights, couponImpact, deferredRevenue, downloadCsv, expenses as expensesReport,
  integrityAudit, leadFunnel, paymentMix, profitAndLoss, trainerScorecards,
} from "../lib/analytics.js";
import { fmtISO, inRange, previousRange, resolveRange, trend } from "../lib/period.js";
import { CATEGORIES, catIcon } from "../lib/expenses.js";
import RangeBar from "./RangeBar.jsx";
import TrendChart from "./TrendChart.jsx";
import { T, disp } from "../theme.js";
import { Btn, Card, Chip, Pill } from "../ui/kit.jsx";

const money = (n) => `$${(Math.round(n * 100) / 100).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Row = ({ label, value, tone, sub }) => (
  <div className="flex items-start justify-between py-1 gap-3">
    <div className="flex-1">
      <div className="text-sm">{label}</div>
      {sub && <div className="text-[11px]" style={{ color: T.muted }}>{sub}</div>}
    </div>
    <div className="text-sm font-bold whitespace-nowrap" style={{ color: tone }}>{value}</div>
  </div>);

const Section = ({ title, blurb, onExport, children }) => (
  <Card className="!p-4">
    <div className="flex items-start justify-between gap-2 mb-1">
      <div style={{ ...disp, fontWeight: 700, fontSize: 16 }}>{title}</div>
      {onExport && <button onClick={onExport} className="text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap"
        style={{ border: `1.5px solid ${T.line}`, color: T.ink }}>CSV ↓</button>}
    </div>
    {blurb && <div className="text-[11px] mb-2" style={{ color: T.muted }}>{blurb}</div>}
    {children}
  </Card>);

/* A bar showing this period against the one before it. A number on its own is
   trivia; the same number next to last month is a decision. */
const Delta = ({ now, before, invert }) => {
  if (before === null || before === undefined) return null;
  if (!before && !now) return null;
  const diff = now - before;
  const pctv = before > 0 ? Math.round((diff / before) * 100) : null;
  const good = invert ? diff <= 0 : diff >= 0;
  return (
    <span className="text-[11px] font-bold" style={{ color: diff === 0 ? T.muted : good ? T.moss : T.accent }}>
      {diff >= 0 ? "▲" : "▼"} {money(Math.abs(diff))}{pctv !== null ? ` (${Math.abs(pctv)}%)` : ""}
      <span style={{ color: T.muted, fontWeight: 500 }}> vs previous</span>
    </span>);
};

export default function Reports() {
  const app = useApp();
  const { ping, tName } = app;
  const [fam, setFam] = useState("money");
  const [sel, setSel] = useState({ key: "30d", from: "", to: "" });
  const [grain, setGrain] = useState("week");

  const range = useMemo(() => resolveRange(sel.key, sel), [sel]);
  const prev = useMemo(() => previousRange(range), [range]);

  const pnl = profitAndLoss(app, range);
  const pnlPrev = prev ? profitAndLoss(app, prev) : null;
  const deferred = deferredRevenue(app);
  const mix = paymentMix(app, range);
  const coupons = couponImpact(app, range);
  const coaches = trainerScorecards(app);
  const clients = clientInsights(app);
  const cap = capacity(app);
  const audit = integrityAudit(app);
  const leads = leadFunnel(app);
  const exp = expensesReport(app, range);
  const expPrev = prev ? expensesReport(app, prev) : null;

  // trends
  const revTrend = trend(pnl.paidRows, { date: r => r.date, value: r => r.amt }, range, grain);
  const expTrend = trend(exp.lines, { date: r => r.date, value: r => r.amount }, range, grain);

  const csv = (name, rows, headers) => () => {
    const stamped = [
      { line: `ExerciseOnly · ${name}`, amount: "" },
      { line: `Period: ${fmtISO(range.from)} to ${fmtISO(range.to)} (inclusive)`, amount: "" },
      ...rows,
    ];
    const use = headers ? rows : stamped;
    if (!downloadCsv(`exerciseonly-${name}-${range.from}_to_${range.to}.csv`, use, headers)) {
      ping("Nothing in this period to export"); return;
    }
    ping(`${name} exported for ${fmtISO(range.from)} → ${fmtISO(range.to)}`);
  };

  return (
    <div className="space-y-3">
      {/* Two rows so five families fit a 390px screen without sideways scrolling —
          the same overflow problem that was fixed under Manage. */}
      <div className="grid grid-cols-3 gap-2">
        {[["money", "Money"], ["expenses", "Expenses"], ["coaches", "Coaches"]].map(([k, l]) => (
          <Chip key={k} active={fam === k} onClick={() => setFam(k)}>{l}</Chip>))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["clients", "Clients"], ["ops", "Ops"], ["audit", "Audit"]].map(([k, l]) => (
          <Chip key={k} active={fam === k} onClick={() => setFam(k)}>{l}</Chip>))}
      </div>

      <RangeBar value={sel} onChange={setSel} range={range} grain={grain} onGrain={setGrain}
        note={pnl.undatedRows > 0 ? `${pnl.undatedRows} older ledger rows carry no date and are always included.` : ""}/>

      {/* Always visible: an integrity problem invalidates everything below it. */}
      {!audit.clean && fam !== "audit" && (
        <button onClick={() => setFam("audit")} className="w-full text-left">
          <Card style={{ background: audit.high ? "#F7EEE9" : "#FBF3EC" }}>
            <div className="text-xs font-bold" style={{ color: T.accent }}>
              DATA INTEGRITY · {audit.findings.length} finding{audit.findings.length === 1 ? "" : "s"} — tap to read
            </div>
          </Card>
        </button>)}

      {/* ---------------------------------------------------------- MONEY ---- */}
      {fam === "money" && (<>
        <Section title="Profit & loss" blurb="Money actually received in this period, less what it cost to deliver."
          onExport={csv("pnl", [
            ...Object.entries(pnl.revenue).map(([k, v]) => ({ line: `Revenue · ${k}`, amount: v })),
            { line: "TOTAL REVENUE", amount: pnl.totalRevenue },
            ...pnl.payouts.map(p => ({ line: `Trainer payout · ${p.name}`, amount: -p.amt })),
            { line: "Approved expenses", amount: -pnl.expenseCost },
            { line: "Payment processing fees", amount: -pnl.processingFees },
            { line: "GROSS MARGIN", amount: pnl.grossMargin },
          ])}>
          <Row label="Class drop-ins" value={money(pnl.revenue.dropIn)} />
          <Row label="Personal training" value={money(pnl.revenue.pt)} />
          <Row label="Packs & credits" value={money(pnl.revenue.packs)} />
          <Row label="Passes" value={money(pnl.revenue.passes)} />
          <Row label="Camps" value={money(pnl.revenue.camps)} />
          {pnl.revenue.other !== 0 && <Row label="Other" value={money(pnl.revenue.other)} />}
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Revenue" value={money(pnl.totalRevenue)} tone={T.moss} />
          <Row label="Trainer payout" value={`− ${money(pnl.trainerCost)}`} tone={T.accent} sub="delivered work only" />
          <Row label="Approved expenses" value={`− ${money(pnl.expenseCost)}`} tone={T.accent}
            sub={pnl.expenseOutstanding > 0 ? `${money(pnl.expenseOutstanding)} of it not yet reimbursed` : "all reimbursed"} />
          <Row label="Processing fees" value={`− ${money(pnl.processingFees)}`} tone={T.accent} sub="HitPay PayNow / card" />
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Gross margin" value={`${money(pnl.grossMargin)} · ${pnl.marginPct}%`} tone={pnl.grossMargin >= 0 ? T.moss : T.accent} />
          {pnlPrev && <div className="mt-1"><Delta now={pnl.totalRevenue} before={pnlPrev.totalRevenue} /></div>}
        </Section>

        <Section title={`Revenue trend · ${grain}ly`} blurb="Where the money actually landed, period by period.">
          <TrendChart data={revTrend} color={T.moss}/>
        </Section>

        <Section title="Credit liability" blurb="Sessions already paid for but not yet delivered. Not period-scoped — it's a balance, not a flow."
          onExport={csv("credit-liability", deferred.lines, ["pool", "units", "unit", "value"])}>
          {deferred.lines.map(l => (
            <Row key={l.pool} label={l.pool} value={money(l.value)} sub={`${l.units} × ${money(l.unit)}`} />))}
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Total owed to members" value={money(deferred.totalValue)} tone={T.orange} />
          <div className="text-[11px] mt-2 rounded-lg p-2" style={{ background: "#FBF3EC", color: T.ink }}>
            This is <b>not profit</b>. It's {deferred.totalUnits} session{deferred.totalUnits === 1 ? "" : "s"} you've
            been paid for and still owe. Counting pack sales as profit in the month they're sold
            flatters that month and makes the month people redeem them look like a loss.
          </div>
        </Section>

        <Section title="How people pay" blurb="In-app versus money collected outside it."
          onExport={csv("payment-mix", [
            { channel: "PayNow (in app)", count: mix.inApp.n, amount: mix.inApp.amt },
            { channel: "Card (in app)", count: mix.card.n, amount: mix.card.amt },
            { channel: "Walk-in / cash (outside app)", count: mix.walkIns, amount: "not tracked" },
          ], ["channel", "count", "amount"])}>
          <Row label="PayNow · in app" value={money(mix.inApp.amt)} sub={`${mix.inApp.n} payments`} tone={T.moss} />
          <Row label="Card · in app" value={money(mix.card.amt)} sub={`${mix.card.n} payments`} />
          <Row label="Walk-ins · outside app" value={`${mix.walkIns}`} sub="cash, not captured" tone={T.orange} />
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Tracked in app" value={`${mix.inAppShare}%`} tone={T.moss} />
          <div className="text-[11px] mt-1" style={{ color: T.muted }}>{mix.note}</div>
        </Section>

        {coupons.length > 0 && (
          <Section title="Coupons used" onExport={csv("coupons", coupons, ["code", "uses", "revenue"])}>
            {coupons.map(c => <Row key={c.code} label={c.code} value={money(c.revenue)} sub={`${c.uses} use${c.uses === 1 ? "" : "s"}`} />)}
          </Section>)}
      </>)}

      {/* ------------------------------------------------------- EXPENSES ---- */}
      {fam === "expenses" && (<>
        <Card className="!p-3">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[["Total", money(exp.total), T.ink], ["Reimbursed", money(exp.paid), T.moss],
              ["Still owed", money(exp.outstanding), exp.outstanding > 0 ? T.orange : T.muted]].map(([l, v, c]) => (
              <div key={l} className="rounded-xl py-2" style={{ background: "#FBF3EC" }}>
                <div className="text-[9px] font-bold" style={{ color: T.muted }}>{l.toUpperCase()}</div>
                <div style={{ ...disp, fontWeight: 800, fontSize: 17, color: c }}>{v}</div>
              </div>))}
          </div>
          <div className="text-[11px] mt-2" style={{ color: T.muted }}>
            {exp.count} item{exp.count === 1 ? "" : "s"} across {exp.claims.length} claim{exp.claims.length === 1 ? "" : "s"} ·
            average claim {money(exp.avgClaim)}. Dated by <b>when the money was spent</b>, not when it
            was claimed — a slip from the 28th belongs in that month even if it's submitted on the 3rd.
          </div>
          {expPrev && <div className="mt-1"><Delta now={exp.total} before={expPrev.total} invert /></div>}
        </Card>

        <Section title={`Expense trend · ${grain}ly`}>
          <TrendChart data={expTrend} color={T.accent}/>
        </Section>

        <Section title="By category" blurb="What the money actually goes on."
          onExport={csv("expenses-by-category", exp.byCategory, ["label", "n", "amount", "share"])}>
          {exp.byCategory.map(r => (
            <div key={r.key} className="py-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">{catIcon(r.key)} {r.label}</span>
                <span className="text-sm font-bold">{money(r.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: T.line }}>
                  <div style={{ width: `${r.share}%`, height: "100%", borderRadius: 3, background: T.accent }}/>
                </div>
                <span className="text-[10px]" style={{ color: T.muted }}>{r.share}% · {r.n}</span>
              </div>
            </div>))}
          {exp.byCategory.length === 0 && <div className="text-xs" style={{ color: T.muted }}>Nothing claimed in this period.</div>}
        </Section>

        <Section title="By coach" blurb="Who is spending, and who is still out of pocket."
          onExport={csv("expenses-by-coach", exp.byCoach, ["label", "n", "amount", "share"])}>
          {exp.byCoach.map(r => (
            <Row key={r.key} label={r.label} value={money(r.amount)}
              sub={`${r.n} item${r.n === 1 ? "" : "s"} · ${r.share}% of total`} />))}
          {exp.byCoach.length === 0 && <div className="text-xs" style={{ color: T.muted }}>Nothing claimed in this period.</div>}
        </Section>

        {/* The control question anyone auditing this will ask first. */}
        <Section title="Claimed without a receipt"
          blurb="Legitimate — ERP issues no slip — but this is the figure to be able to defend at year end."
          onExport={csv("expenses-no-receipt", exp.lines.filter(l => l.noReceipt),
            ["date", "trainer", "categoryLabel", "amount", "desc", "noReceiptReason", "ref"])}>
          <Row label="Value with no receipt" value={money(exp.noReceiptTotal)}
            tone={exp.noReceiptShare > 25 ? T.accent : T.orange}
            sub={`${exp.noReceiptCount} item${exp.noReceiptCount === 1 ? "" : "s"} · ${exp.noReceiptShare}% of all expenses`} />
          {exp.lines.filter(l => l.noReceipt).slice(0, 6).map((l, i) => (
            <div key={i} className="text-[11px] py-1" style={{ borderTop: `1px solid ${T.line}` }}>
              <b>{money(l.amount)}</b> · {l.desc} · {tName(l.trainer)} · {fmtISO(l.date)}
              <div style={{ color: T.muted }}>“{l.noReceiptReason}”</div>
            </div>))}
          {exp.noReceiptCount === 0 && <div className="text-xs" style={{ color: T.moss }}>Every claimed item has a receipt behind it.</div>}
        </Section>

        <Section title="Every line" blurb="The full detail, for the bookkeeper."
          onExport={csv("expenses-detail", exp.lines,
            ["date", "ref", "trainer", "categoryLabel", "amount", "desc", "receipt", "noReceipt", "noReceiptReason", "status", "paidAt", "paidRef"])}>
          <div className="text-xs" style={{ color: T.muted }}>
            {exp.count} line{exp.count === 1 ? "" : "s"} in this period. Export for the full list with
            receipts, reasons and payment references.
          </div>
        </Section>
      </>)}

      {/* -------------------------------------------------------- COACHES ---- */}
      {fam === "coaches" && (<>
        <Section title="Coach scorecards" blurb="Delivered work, fill rate and what each session costs to staff."
          onExport={csv("trainer-scorecards", coaches,
            ["name", "classes", "delivered", "unmarked", "fillRate", "attendanceRate", "noShows",
             "ptBooked", "ptDone", "expenses", "expensesOwed", "travelHrs", "payout", "revenue", "margin", "marginPct"])}>
          {coaches.map(c => (
            <div key={c.id} className="py-2" style={{ borderBottom: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{c.name}{c.headCoach ? " ★" : ""}</div>
                <div className="text-sm font-bold">{money(c.payout)}</div>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1.5 text-center">
                {[["Fill", `${c.fillRate}%`], ["Attend", `${c.attendanceRate}%`],
                  ["PT done", `${c.ptDone}/${c.ptBooked}`], ["Margin", c.marginPct === null ? "—" : `${c.marginPct}%`]].map(([l, v]) => (
                  <div key={l} className="rounded-lg py-1" style={{ background: "#FBF3EC" }}>
                    <div className="text-[9px] font-bold" style={{ color: T.muted }}>{l.toUpperCase()}</div>
                    <div className="text-xs font-bold">{v}</div>
                  </div>))}
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: T.muted }}>
                {c.travelHrs > 0 && <span>{c.travelHrs}h unpaid travel · </span>}
                {c.noShows > 0 && <span>{c.noShows} no-show{c.noShows === 1 ? "" : "s"} · </span>}
                revenue {money(c.revenue)}
                {c.expenses > 0 && <span> · expenses {money(c.expenses)}</span>}
                {c.unmarked > 0 && <span style={{ color: T.accent }}> · {c.unmarked} unmarked</span>}
                {c.expensesOwed > 0 && <span style={{ color: T.orange }}> · {money(c.expensesOwed)} owed back</span>}
              </div>
            </div>))}
          <div className="text-[11px] mt-2" style={{ color: T.muted }}>
            <b>Unpaid travel</b> is time spent moving between venues that nobody bills for.
            A coach absorbing hours of it every week has a fair grievance before they raise it.
          </div>
        </Section>
      </>)}

      {/* -------------------------------------------------------- CLIENTS ---- */}
      {fam === "clients" && (<>
        <Section title="Attendance & reliability" blurb="Ranked by risk: no-shows weigh heaviest."
          onExport={csv("clients", clients.rows,
            ["name", "booked", "attended", "noShows", "reliability", "spend", "riskScore"])}>
          {clients.rows.slice(0, 10).map(c => (
            <Row key={c.name} label={c.name}
              value={c.reliability ? `${c.reliability}%` : "—"}
              tone={c.riskScore >= 3 ? T.accent : undefined}
              sub={`${c.attended}/${c.booked} attended${c.noShows ? ` · ${c.noShows} no-show` : ""}${c.spend ? ` · ${money(c.spend)} spent` : ""}`} />))}
          {clients.rows.length === 0 && <div className="text-xs" style={{ color: T.muted }}>No attendance recorded yet.</div>}
        </Section>

        {clients.atRisk.length > 0 && (
          <Section title="Watch-list" blurb="Repeat no-shows — an empty seat you still paid a coach to cover.">
            {clients.atRisk.map(c => (
              <Row key={c.name} label={c.name} value={`${c.noShows} no-shows`} tone={T.accent} />))}
          </Section>)}

        <Section title="Top spenders" onExport={csv("client-spend", clients.topSpenders, ["name", "spend", "booked", "attended"])}>
          {clients.topSpenders.filter(c => c.spend > 0).map(c => (
            <Row key={c.name} label={c.name} value={money(c.spend)} />))}
        </Section>

        <Section title="Lead funnel" blurb="Where enquiries come from and what converts."
          onExport={csv("lead-funnel", leads.rows, ["source", "total", "converted", "open", "conversion"])}>
          {leads.rows.map(r => (
            <Row key={r.source} label={r.source} value={`${r.conversion}%`}
              sub={`${r.total} lead${r.total === 1 ? "" : "s"} · ${r.open} unactioned`}
              tone={r.open > 0 ? T.orange : undefined} />))}
        </Section>
      </>)}

      {/* ------------------------------------------------------------ OPS ---- */}
      {fam === "ops" && (<>
        <Section title="Location performance" blurb="Which areas actually earn."
          onExport={csv("locations", cap.byLoc, ["name", "sessions", "seats", "booked", "fillRate", "revenue"])}>
          {cap.byLoc.map(l => (
            <Row key={l.id} label={l.name} value={money(l.revenue)}
              sub={`${l.sessions} sessions · ${l.fillRate}% full · ${l.booked}/${l.seats} seats`} />))}
        </Section>

        <Section title="Class types by fill rate" onExport={csv("class-types", cap.byType, ["name", "sessions", "seats", "booked", "fillRate"])}>
          {cap.byType.map(t => (
            <Row key={t.code} label={t.name} value={`${t.fillRate}%`}
              tone={t.fillRate < 40 ? T.accent : t.fillRate > 85 ? T.moss : undefined}
              sub={`${t.sessions} sessions · ${t.booked}/${t.seats} seats`} />))}
          <div className="text-[11px] mt-2" style={{ color: T.muted }}>
            Under 40% is a candidate to cut or move. Over 85% is a candidate to duplicate.
          </div>
        </Section>

        {cap.unmetDemand.length > 0 && (
          <Section title="Unmet demand" blurb="Sessions that filled — where to add capacity."
            onExport={csv("unmet-demand", cap.unmetDemand, ["what", "when", "where"])}>
            {cap.unmetDemand.map((u, i) => (
              <Row key={i} label={u.what} value={u.where} sub={u.when} tone={T.orange} />))}
          </Section>)}

        <Section title="Demand by day" onExport={csv("demand-by-day", cap.byDay, ["day", "sessions", "booked"])}>
          {cap.byDay.map(d => (
            <Row key={d.day} label={d.day} value={`${d.booked} booked`} sub={`${d.sessions} sessions`} />))}
        </Section>
      </>)}

      {/* ---------------------------------------------------------- AUDIT ---- */}
      {fam === "audit" && (<>
        <Section title="Data integrity" blurb="Every finding here costs money or misleads a report if left alone."
          onExport={csv("integrity", audit.findings.map(f => ({
            severity: f.severity, code: f.code, title: f.title, why: f.why, items: f.items.join(" | "),
          })), ["severity", "code", "title", "why", "items"])}>
          {audit.clean && <div className="text-sm" style={{ color: T.moss }}>Nothing to fix. Every figure on the other tabs is standing on clean records.</div>}
          {audit.findings.map(f => (
            <div key={f.code} className="py-2" style={{ borderTop: `1px solid ${T.line}` }}>
              <div className="flex items-start gap-2">
                <Pill tone={f.severity === "high" ? "accent" : f.severity === "medium" ? "orange" : "muted"}>
                  {f.severity}</Pill>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{f.title}</div>
                  <div className="text-[11px]" style={{ color: T.muted }}>{f.why}</div>
                  <div className="text-[11px] mt-1" style={{ color: T.muted }}>
                    {f.items.slice(0, 4).map((it, i) => <div key={i}>· {it}</div>)}
                    {f.items.length > 4 && <div>· …and {f.items.length - 4} more — export for the full list</div>}
                  </div>
                </div>
              </div>
            </div>))}
        </Section>

        <Section title="Admin activity" blurb="Who changed what. Every approval, move, cancellation and payment."
          onExport={csv("audit-trail", app.audit, ["when", "what"])}>
          {app.audit.slice(0, 15).map(a => (
            <div key={a.id} className="text-xs py-1" style={{ borderTop: `1px solid ${T.line}` }}>
              {a.what}<div style={{ color: T.muted }}>{a.when}</div>
            </div>))}
          {app.audit.length === 0 && <div className="text-xs" style={{ color: T.muted }}>Nothing logged yet this session.</div>}
          <div className="text-[11px] mt-2" style={{ color: T.muted }}>
            The trail is in-memory in the demo; against the live schema it's an append-only
            table nobody can edit — which is the only version worth having.
          </div>
        </Section>
      </>)}
    </div>);
}
