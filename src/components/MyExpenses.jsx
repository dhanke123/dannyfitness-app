/* A coach's own expenses, under their account.
 *
 * This is where the workflow lives now. It used to be a "+ Receipt" button on the
 * Today screen and an optional field on the mark-complete sheet — two places that
 * had nothing to do with each other, neither of which could tell you what you'd
 * claimed or whether you'd been paid back.
 *
 * The number that matters most to a coach is "am I still out of pocket", so that's
 * the one at the top.
 */

import { useApp } from "../state/AppState.jsx";
import { CATEGORIES, STATUS, approvedTotal, catIcon, catLabel, claimTotal, excludedTotal } from "../lib/expenses.js";
import { fmtISO } from "../lib/period.js";
import { T, disp } from "../theme.js";
import { Btn, Card, Pill } from "../ui/kit.jsx";

const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export function ClaimLines({ claim, showExclusions }) {
  return (
    <div className="space-y-1 mt-2">
      {claim.lines.map(l => (
        <div key={l.id} className="flex items-start gap-2 text-xs py-1"
          style={{ borderTop: `1px solid ${T.line}`, opacity: l.excluded ? .55 : 1 }}>
          <span>{catIcon(l.category)}</span>
          <div className="flex-1 min-w-0">
            <div style={{ textDecoration: l.excluded ? "line-through" : "none" }}>
              {l.desc || catLabel(l.category)}
            </div>
            <div style={{ color: T.muted }}>
              {fmtISO(l.date)} · {catLabel(l.category)}
              {l.receipt
                ? <span style={{ color: T.moss }}> · {l.receipt.kind === "photo" ? "🖼️" : "📄"} {l.receipt.name}</span>
                : <span style={{ color: T.orange }}> · no receipt</span>}
            </div>
            {!l.receipt && l.noReceiptReason && (
              <div className="italic" style={{ color: T.muted }}>“{l.noReceiptReason}”</div>)}
            {showExclusions && l.excluded && (
              <div style={{ color: T.accent }}>Excluded{l.excludeReason ? ` — ${l.excludeReason}` : ""}</div>)}
          </div>
          <span className="font-bold whitespace-nowrap"
            style={{ textDecoration: l.excluded ? "line-through" : "none" }}>{money(l.amount)}</span>
        </div>))}
    </div>);
}

export function ClaimCard({ claim, children, showExclusions }) {
  const st = STATUS[claim.status] || STATUS.draft;
  const cut = excludedTotal(claim);
  return (
    <Card className="!p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ ...disp, fontWeight: 700, fontSize: 15 }}>{claim.ref}</span>
            <Pill tone={st.tone}>{st.label}</Pill>
          </div>
          <div className="text-[11px]" style={{ color: T.muted }}>
            {claim.lines.length} item{claim.lines.length === 1 ? "" : "s"}
            {claim.submittedAt ? ` · sent ${fmtISO(claim.submittedAt)}` : ""}
            {claim.paidAt ? ` · paid ${fmtISO(claim.paidAt)}${claim.paidRef ? ` · ${claim.paidRef}` : ""}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div style={{ ...disp, fontWeight: 800, fontSize: 17 }}>{money(approvedTotal(claim))}</div>
          {cut > 0 && <div className="text-[10px]" style={{ color: T.accent }}>−{money(cut)} excluded</div>}
        </div>
      </div>

      {claim.note && <div className="text-[11px] mt-1 italic" style={{ color: T.muted }}>“{claim.note}”</div>}
      {claim.status === "rejected" && claim.reason && (
        <div className="text-xs mt-2 rounded-lg p-2" style={{ background: "#F7EEE9", color: T.ink }}>
          <b style={{ color: T.accent }}>Not approved:</b> {claim.reason}
        </div>)}

      <ClaimLines claim={claim} showExclusions={showExclusions}/>
      {children && <div className="mt-2">{children}</div>}
    </Card>);
}

export default function MyExpenses() {
  const { myClaims, newClaim, setClaimEditor, withdrawClaim, user } = useApp();

  const owed = myClaims.filter(c => c.status === "approved")
    .reduce((t, c) => t + approvedTotal(c), 0);
  const waiting = myClaims.filter(c => c.status === "submitted")
    .reduce((t, c) => t + claimTotal(c), 0);
  const paidYtd = myClaims.filter(c => c.status === "paid")
    .reduce((t, c) => t + approvedTotal(c), 0);

  const order = { submitted: 0, approved: 1, draft: 2, rejected: 3, paid: 4 };
  const sorted = [...myClaims].sort((a, b) =>
    (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
    (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  return (
    <div className="space-y-3">
      <Card className="!p-3">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[["Owed to you", money(owed), owed > 0 ? T.blue : T.muted, "approved, not yet paid"],
            ["Waiting", money(waiting), waiting > 0 ? T.orange : T.muted, "with admin"],
            ["Reimbursed", money(paidYtd), T.moss, "paid back"]].map(([l, v, c, sub]) => (
            <div key={l} className="rounded-xl py-2" style={{ background: "#FBF3EC" }}>
              <div className="text-[9px] font-bold" style={{ color: T.muted }}>{l.toUpperCase()}</div>
              <div style={{ ...disp, fontWeight: 800, fontSize: 16, color: c }}>{v}</div>
              <div className="text-[9px]" style={{ color: T.muted }}>{sub}</div>
            </div>))}
        </div>
        {owed > 0 && (
          <div className="text-[11px] mt-2" style={{ color: T.muted }}>
            Approved means agreed, not repaid. Chase the admin if it's been a while.
          </div>)}
      </Card>

      <Btn full onClick={newClaim}>＋ New expense claim</Btn>

      {sorted.length === 0 && (
        <div className="text-center text-sm py-8" style={{ color: T.muted }}>
          Nothing claimed yet. Petrol, parking, ERP, kit — anything you've paid for out of
          your own pocket goes here.
        </div>)}

      {sorted.map(c => (
        <ClaimCard key={c.id} claim={c} showExclusions>
          {c.status === "draft" && (
            <Btn small full kind="ghost" onClick={() => setClaimEditor(c.id)}>Open and finish it</Btn>)}
          {c.status === "submitted" && (
            <button onClick={() => withdrawClaim(c.id)} className="w-full text-xs font-bold py-1"
              style={{ color: T.muted }}>Pull it back and edit</button>)}
          {c.status === "rejected" && (
            <div className="text-[11px]" style={{ color: T.muted }}>
              Start a new claim with the corrections — this one stays for the record.
            </div>)}
        </ClaimCard>))}
    </div>);
}
