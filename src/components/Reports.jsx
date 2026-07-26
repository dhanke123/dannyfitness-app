/* Admin → Reports. Headline numbers on screen, full detail as CSV.
 *
 * The split is deliberate: Danny glances at this on a phone between sessions, and
 * forwards the CSV to whoever does his books. Rendering forty rows of ledger detail
 * on a 390px screen serves neither.
 */

import { useState } from "react";
import { useApp } from "../state/AppState.jsx";
import {
  capacity, clientInsights, couponImpact, deferredRevenue, downloadCsv,
  integrityAudit, leadFunnel, paymentMix, profitAndLoss, trainerScorecards,
} from "../lib/analytics.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Chip } from "../ui/kit.jsx";

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

export default function Reports() {
  const app = useApp();
  const { ping } = app;
  const [fam, setFam] = useState("money");

  const pnl = profitAndLoss(app);
  const deferred = deferredRevenue(app);
  const mix = paymentMix(app);
  const coupons = couponImpact(app);
  const coaches = trainerScorecards(app);
  const clients = clientInsights(app);
  const cap = capacity(app);
  const audit = integrityAudit(app);
  const leads = leadFunnel(app);

  const exp = (name, rows, headers) => () => {
    if (!downloadCsv(`exerciseonly-${name}.csv`, rows, headers)) { ping("Nothing to export yet"); return; }
    ping(`${name} exported — open it in Excel or send it to your accountant`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[["money", "Money"], ["coaches", "Coaches"], ["clients", "Clients"], ["ops", "Ops"]].map(([k, l]) => (
          <Chip key={k} active={fam === k} onClick={() => setFam(k)}>{l}</Chip>))}
      </div>

      {/* Always visible: an integrity problem invalidates everything below it. */}
      {!audit.clean && (
        <Card style={{ background: audit.high ? "#F7EEE9" : "#FBF3EC" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-bold" style={{ color: T.accent }}>
              DATA INTEGRITY · {audit.findings.length} finding{audit.findings.length === 1 ? "" : "s"}
            </div>
            <button onClick={exp("integrity", audit.findings.map(f => ({
              severity: f.severity, code: f.code, title: f.title, why: f.why, items: f.items.join(" | "),
            })))} className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ border: `1.5px solid ${T.line}` }}>CSV ↓</button>
          </div>
          {audit.findings.map(f => (
            <div key={f.code} className="mt-2">
              <div className="text-sm font-semibold">
                <span style={{ color: f.severity === "high" ? T.accent : T.orange }}>●</span> {f.title}
              </div>
              <div className="text-[11px]" style={{ color: T.muted }}>{f.why}</div>
            </div>))}
          <div className="text-[11px] mt-2" style={{ color: T.muted }}>
            Fix these before trusting the numbers below — they all feed off the same records.
          </div>
        </Card>)}

      {/* ---------------------------------------------------------- MONEY ---- */}
      {fam === "money" && (<>
        <Section title="Profit & loss" blurb="Money actually received, less what it cost to deliver."
          onExport={exp("pnl", [
            ...Object.entries(pnl.revenue).map(([k, v]) => ({ line: `Revenue · ${k}`, amount: v })),
            { line: "TOTAL REVENUE", amount: pnl.totalRevenue },
            ...pnl.payouts.map(p => ({ line: `Trainer payout · ${p.name}`, amount: -p.amt })),
            { line: "Approved incidentals", amount: -pnl.incidentalCost },
            { line: "Payment processing fees", amount: -pnl.processingFees },
            { line: "GROSS MARGIN", amount: pnl.grossMargin },
          ], ["line", "amount"])}>
          <Row label="Class drop-ins" value={money(pnl.revenue.dropIn)} />
          <Row label="Personal training" value={money(pnl.revenue.pt)} />
          <Row label="Packs & credits" value={money(pnl.revenue.packs)} />
          <Row label="Passes" value={money(pnl.revenue.passes)} />
          <Row label="Camps" value={money(pnl.revenue.camps)} />
          {pnl.revenue.other !== 0 && <Row label="Other" value={money(pnl.revenue.other)} />}
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Revenue" value={money(pnl.totalRevenue)} tone={T.moss} />
          <Row label="Trainer payout" value={`− ${money(pnl.trainerCost)}`} tone={T.accent} sub="delivered work only" />
          <Row label="Approved incidentals" value={`− ${money(pnl.incidentalCost)}`} tone={T.accent} />
          <Row label="Processing fees" value={`− ${money(pnl.processingFees)}`} tone={T.accent} sub="HitPay PayNow / card" />
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Gross margin" value={`${money(pnl.grossMargin)} · ${pnl.marginPct}%`} tone={pnl.grossMargin >= 0 ? T.moss : T.accent} />
        </Section>

        <Section title="Credit liability" blurb="Sessions already paid for but not yet delivered."
          onExport={exp("credit-liability", deferred.lines)}>
          {deferred.lines.map(l => (
            <Row key={l.pool} label={l.pool} value={money(l.value)} sub={`${l.units} × ${money(l.unit)}`} />))}
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Total owed to members" value={money(deferred.totalValue)} tone={T.orange} />
          {/* The sentence that makes this report worth having */}
          <div className="text-[11px] mt-2 rounded-lg p-2" style={{ background: "#FBF3EC", color: T.ink }}>
            This is <b>not profit</b>. It's {deferred.totalUnits} session{deferred.totalUnits === 1 ? "" : "s"} you've
            been paid for and still owe. Counting pack sales as profit in the month they're sold
            flatters that month and makes the month people redeem them look like a loss.
          </div>
        </Section>

        <Section title="How people pay" blurb="In-app versus money collected outside it."
          onExport={exp("payment-mix", [
            { channel: "PayNow (in app)", count: mix.inApp.n, amount: mix.inApp.amt },
            { channel: "Card (in app)", count: mix.card.n, amount: mix.card.amt },
            { channel: "Walk-in / cash (outside app)", count: mix.walkIns, amount: "not tracked" },
          ])}>
          <Row label="PayNow · in app" value={money(mix.inApp.amt)} sub={`${mix.inApp.n} payments`} tone={T.moss} />
          <Row label="Card · in app" value={money(mix.card.amt)} sub={`${mix.card.n} payments`} />
          <Row label="Walk-ins · outside app" value={`${mix.walkIns}`} sub="cash, not captured" tone={T.orange} />
          <div className="my-1" style={{ borderTop: `1.5px solid ${T.line}` }} />
          <Row label="Tracked in app" value={`${mix.inAppShare}%`} tone={T.moss} />
          <div className="text-[11px] mt-1" style={{ color: T.muted }}>{mix.note}</div>
        </Section>

        {coupons.length > 0 && (
          <Section title="Coupons used" onExport={exp("coupons", coupons)}>
            {coupons.map(c => <Row key={c.code} label={c.code} value={money(c.revenue)} sub={`${c.uses} use${c.uses === 1 ? "" : "s"}`} />)}
          </Section>)}
      </>)}

      {/* -------------------------------------------------------- COACHES ---- */}
      {fam === "coaches" && (<>
        <Section title="Coach scorecards" blurb="Delivered work, fill rate and what each session costs to staff."
          onExport={exp("trainer-scorecards", coaches)}>
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
                {c.unmarked > 0 && <span style={{ color: T.accent }}> · {c.unmarked} unmarked</span>}
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
          onExport={exp("clients", clients.rows)}>
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

        <Section title="Top spenders" onExport={exp("client-spend", clients.topSpenders)}>
          {clients.topSpenders.filter(c => c.spend > 0).map(c => (
            <Row key={c.name} label={c.name} value={money(c.spend)} />))}
        </Section>

        <Section title="Lead funnel" blurb="Where enquiries come from and what converts."
          onExport={exp("lead-funnel", leads.rows)}>
          {leads.rows.map(r => (
            <Row key={r.source} label={r.source} value={`${r.conversion}%`}
              sub={`${r.total} lead${r.total === 1 ? "" : "s"} · ${r.open} unactioned`}
              tone={r.open > 0 ? T.orange : undefined} />))}
        </Section>
      </>)}

      {/* ------------------------------------------------------------ OPS ---- */}
      {fam === "ops" && (<>
        <Section title="Location performance" blurb="Which areas actually earn."
          onExport={exp("locations", cap.byLoc)}>
          {cap.byLoc.map(l => (
            <Row key={l.id} label={l.name} value={money(l.revenue)}
              sub={`${l.sessions} sessions · ${l.fillRate}% full · ${l.booked}/${l.seats} seats`} />))}
        </Section>

        <Section title="Class types by fill rate" onExport={exp("class-types", cap.byType)}>
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
            onExport={exp("unmet-demand", cap.unmetDemand)}>
            {cap.unmetDemand.map((u, i) => (
              <Row key={i} label={u.what} value={u.where} sub={u.when} tone={T.orange} />))}
          </Section>)}

        <Section title="Demand by day" onExport={exp("demand-by-day", cap.byDay)}>
          {cap.byDay.map(d => (
            <Row key={d.day} label={d.day} value={`${d.booked} booked`} sub={`${d.sessions} sessions`} />))}
        </Section>
      </>)}
    </div>);
}
