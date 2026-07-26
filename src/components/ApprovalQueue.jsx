/* One approval queue, reused four times (Decision 7).

   Every queue is separate and every queue has Deny as well as Approve, and both
   actions capture a reason note. Nothing auto-approves or auto-declines (Decision 6)
   — items sit here until a human actions them, which is why the pending count is
   also surfaced as a badge on the admin nav. */

import { useState } from "react";
import { T, disp } from "../theme.js";
import { Btn, Card } from "../ui/kit.jsx";

export const AddToCalendar = ({ onIcs, onGoogle, compact }) => (
  <div className="flex gap-1.5">
    <button onClick={onIcs}
      className={`font-bold rounded-lg ${compact ? "text-[11px] px-2 py-1" : "text-xs px-2.5 py-1.5"}`}
      style={{ border: `1.5px solid ${T.line}`, color: T.ink }}>📅 Apple / Outlook</button>
    <button onClick={onGoogle}
      className={`font-bold rounded-lg ${compact ? "text-[11px] px-2 py-1" : "text-xs px-2.5 py-1.5"}`}
      style={{ border: `1.5px solid ${T.line}`, color: T.ink }}>📅 Google</button>
  </div>
);

/* items: [{ id, title, sub, meta? }]  ·  onResolve(id, approved, reason) */
export default function ApprovalQueue({
  label, tint = "#F7EEE9", accent = T.accent, items, onResolve,
  approveLabel = "Approve", denyLabel = "Deny", empty = "Nothing waiting.",
}) {
  const [openId, setOpenId] = useState(null);   // which item has the reason box open
  const [mode, setMode] = useState(null);       // 'approve' | 'deny'
  const [reason, setReason] = useState("");

  const start = (id, m) => { setOpenId(id); setMode(m); setReason(""); };
  const commit = (id) => { onResolve(id, mode === "approve", reason.trim()); setOpenId(null); setMode(null); setReason(""); };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-xs font-bold" style={{ color: accent }}>{label}</div>
        {items.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: accent, color: "#fff" }}>{items.length}</span>)}
      </div>

      {items.length === 0 && <div className="text-xs" style={{ color: T.muted }}>{empty}</div>}

      {items.map(it => (
        <Card key={it.id} style={{ background: tint }} className="!p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm flex-1">{it.title}</div>
            {it.meta && <div className="text-xs whitespace-nowrap" style={{ color: T.muted }}>{it.meta}</div>}
          </div>
          {it.sub && <div className="text-xs mt-0.5 mb-2" style={{ color: T.muted }}>{it.sub}</div>}

          {openId === it.id ? (
            <div className="mt-1">
              <div className="text-xs font-bold mb-1" style={{ color: mode === "approve" ? T.moss : T.accent }}>
                {mode === "approve" ? approveLabel : denyLabel} — reason (shown to the member, kept in the audit log)
              </div>
              <input autoFocus value={reason} onChange={e => setReason(e.target.value)}
                placeholder={mode === "approve" ? "e.g. genuine emergency, one-off" : "e.g. inside window, third time this month"}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
              <div className="flex gap-2">
                <Btn small kind="ghost" full onClick={() => { setOpenId(null); setMode(null); }}>Back</Btn>
                <Btn small full kind={mode === "approve" ? "primary" : "dark"} onClick={() => commit(it.id)}>
                  Confirm {mode === "approve" ? approveLabel.toLowerCase() : denyLabel.toLowerCase()}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Btn small kind="ghost" full onClick={() => start(it.id, "deny")}>{denyLabel}</Btn>
              <Btn small full onClick={() => start(it.id, "approve")}>{approveLabel}</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* Small pending-count pill for the bottom nav. */
export const NavBadge = ({ n }) => n > 0 ? (
  <span style={{
    ...disp, position: "absolute", top: 4, right: "50%", transform: "translateX(22px)",
    minWidth: 16, height: 16, lineHeight: "16px", borderRadius: 8, padding: "0 4px",
    background: T.accent, color: "#fff", fontSize: 10, fontWeight: 800, textAlign: "center",
  }}>{n > 9 ? "9+" : n}</span>
) : null;
