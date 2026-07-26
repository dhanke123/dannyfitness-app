/* Privacy policy and account deletion.
 *
 * These existed as the plain text "Privacy policy · Request account deletion · v0
 * demo" — no controls, nothing to tap. Both are PDPA obligations, not features:
 * a member has a right to know what's held and a right to have it removed, and
 * naming them without providing them is worse than staying silent.
 *
 * Deletion follows DECISION 15: identity is anonymised, financial records are
 * kept. Wiping payments would break Danny's books and his tax position, so the
 * sheet says plainly what survives — a member agreeing to "delete everything" and
 * later finding payment records is a complaint waiting to happen.
 */

import { useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";

export default function LegalSheets() {
  const { legalSheet, setLegalSheet, requestDeletion, deletionRequests, user } = useApp();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  if (!legalSheet) return null;

  const pending = deletionRequests.some(d => d.who === (user?.name));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setLegalSheet(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[88vh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between mb-2">
          <div style={{ ...disp, fontWeight: 700, fontSize: 22 }}>
            {legalSheet === "privacy" ? "Privacy" : "Delete my account"}
          </div>
          <button onClick={() => setLegalSheet(null)} aria-label="Close"
            className="text-sm font-bold px-2 py-1 rounded-lg -mt-1"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>

        {legalSheet === "privacy" ? (<>
          <div className="text-sm space-y-3" style={{ color: T.ink }}>
            <div>
              <div className="font-semibold">What we hold</div>
              <div className="text-xs" style={{ color: T.muted }}>
                Your name, mobile and email; your bookings, credits and payments; anything you or a
                coach records in your training log, body stats or intake assessment.
              </div>
            </div>
            <div>
              <div className="font-semibold">Why</div>
              <div className="text-xs" style={{ color: T.muted }}>
                To run your bookings, take payment, and let your coach train you properly.
                Booking confirmations and reminders always send — they're part of the service.
                Marketing only goes out if you've switched it on, and you can switch it off any time.
              </div>
            </div>
            <div>
              <div className="font-semibold">Who sees it</div>
              <div className="text-xs" style={{ color: T.muted }}>
                ExerciseOnly coaches and admin. Payment processing is handled by HitPay — card and
                bank details never reach us. We don't sell your data to anyone.
              </div>
            </div>
            <div>
              <div className="font-semibold">Your rights</div>
              <div className="text-xs" style={{ color: T.muted }}>
                Ask for a copy of your data, correct it, or have your account removed. Use the button
                below, or email 4exerciseonly@gmail.com.
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Btn full kind="ghost" onClick={() => setLegalSheet("delete")}>Delete my account</Btn>
            <Btn full kind="dark" onClick={() => setLegalSheet(null)}>Close</Btn>
          </div>
        </>) : (<>
          {pending ? (
            <div className="text-center py-6">
              <div style={{ fontSize: 34 }}>⏳</div>
              <div className="text-sm mt-2" style={{ color: T.ink }}>
                Your deletion request is already with the ExerciseOnly team.
              </div>
              <div className="text-xs mt-1 mb-4" style={{ color: T.muted }}>
                They'll confirm within 30 days. Contact them if you'd like to cancel it.
              </div>
              <Btn full kind="dark" onClick={() => setLegalSheet(null)}>Close</Btn>
            </div>
          ) : (<>
            {/* Say exactly what survives. "Delete everything" that quietly keeps
                payment records is how trust gets lost. */}
            <div className="rounded-xl p-3 text-sm mb-3" style={{ background: "#F7EEE9" }}>
              <div className="font-semibold mb-1">What happens</div>
              <div className="text-xs" style={{ color: T.ink }}>
                <b>Removed:</b> your name, mobile, email, photo, training log, body stats and intake notes.<br/>
                <b>Kept:</b> your bookings and payments, with your name stripped off them.
              </div>
              <div className="text-[11px] mt-2" style={{ color: T.muted }}>
                Payment records have to be retained for tax and accounting. They're anonymised, so
                they can't be traced back to you, but the amounts stay on ExerciseOnly's books.
              </div>
            </div>
            <div className="text-xs font-bold mb-1" style={{ color: T.muted }}>WHY ARE YOU LEAVING? (optional)</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Helps Danny improve things — entirely optional"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3"
              style={{ border: `1.5px solid ${T.line}`, background: T.card, resize: "none" }}/>
            <button onClick={() => setConfirm(c => !c)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm mb-3"
              style={{ border: `1.5px solid ${confirm ? T.accent : T.line}`, background: T.card }}>
              <span style={{ color: confirm ? T.accent : T.muted }}>{confirm ? "☑" : "☐"}</span>
              I understand this can't be undone, and that any unused credits are forfeited.
            </button>
            <Btn full disabled={!confirm} onClick={() => requestDeletion(reason)}>Request deletion</Btn>
            <div className="text-center text-xs mt-3" style={{ color: T.muted }}>
              A person reviews this — it isn't instant. You'll hear back within 30 days.
            </div>
          </>)}
        </>)}
      </div>
    </div>);
}
