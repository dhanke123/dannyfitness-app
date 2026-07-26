/* Public enquiry form — the one thing a stranger can do without an account.
 *
 * Feeds the SAME `leads` list the admin already works from (Manage → People →
 * LEADS), so an enquiry arrives in a queue that already has a status workflow,
 * one-tap WhatsApp and call. Inventing a second inbox would mean two places to
 * check and one of them going stale.
 *
 * Rendered from the login screen (pre-login, no account) and from Account. It
 * lives here rather than in an overlays file because the app shell — and every
 * overlay with it — only renders once a user is signed in.
 */

import { useApp } from "../state/AppState.jsx";
import { T, disp } from "../theme.js";
import { Btn, Select } from "../ui/kit.jsx";

export default function EnquirySheet() {
  const { enquiry, setEnquiry, submitEnquiry, locations } = useApp();
  if (!enquiry) return null;

  const set = (k, v) => setEnquiry(e => ({ ...e, [k]: v }));
  const field = {
    width: "100%", padding: "11px 13px", borderRadius: 12,
    border: `1.5px solid ${T.line}`, background: T.card, color: T.ink,
    fontSize: 15, outline: "none",
  };

  // Name plus at least one way to reply. A query with no contact detail is a
  // lead Danny can never action, so it's not worth accepting.
  const hasContact = enquiry.email.trim() !== "" || enquiry.phone.replace(/\D/g, "") !== "";
  const ready = enquiry.name.trim() !== "" && hasContact && enquiry.query.trim() !== "";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setEnquiry(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[92vh] overflow-y-auto"
        style={{ background: T.paper }} onClick={e => e.stopPropagation()}>

        {enquiry.sent ? (
          <div className="text-center py-4">
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 22, marginTop: 6 }}>Enquiry sent</div>
            <div className="text-sm mt-2 mb-1" style={{ color: T.muted }}>
              Thanks {enquiry.name.trim().split(" ")[0]} — it's with the ExerciseOnly team and
              they'll get back to you
              {enquiry.phone.replace(/\D/g, "") ? " on WhatsApp" : enquiry.email.trim() ? " by email" : ""}.
            </div>
            <div className="text-xs mb-4" style={{ color: T.muted }}>
              Nothing else to do — you don't need an account.
            </div>
            <Btn full kind="dark" onClick={() => setEnquiry(null)}>Done</Btn>
          </div>
        ) : (<>

        <div className="flex items-start justify-between mb-1">
          <div style={{ ...disp, fontWeight: 700, fontSize: 22 }}>Send us an enquiry</div>
          <button onClick={() => setEnquiry(null)} aria-label="Close"
            className="text-sm font-bold px-2 py-1 rounded-lg -mt-1"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
        </div>
        <div className="text-sm mb-4" style={{ color: T.muted }}>
          No account needed. Danny or the ExerciseOnly team will get back to you.
        </div>

        <div className="space-y-2.5">
          <div>
            <label htmlFor="eq-name" className="text-xs font-bold" style={{ color: T.muted }}>YOUR NAME *</label>
            <input id="eq-name" value={enquiry.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Rachel Ong" style={{ ...field, marginTop: 4 }} />
          </div>

          <div>
            <label htmlFor="eq-email" className="text-xs font-bold" style={{ color: T.muted }}>EMAIL</label>
            <input id="eq-email" type="email" inputMode="email" value={enquiry.email}
              onChange={e => set("email", e.target.value)}
              placeholder="you@email.com" style={{ ...field, marginTop: 4 }} />
          </div>

          <div>
            <label htmlFor="eq-phone" className="text-xs font-bold" style={{ color: T.muted }}>MOBILE</label>
            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
              <div style={{ ...field, width: 58, textAlign: "center", flex: "none", color: T.muted }}>+65</div>
              <input id="eq-phone" inputMode="tel" value={enquiry.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="9123 4567" style={{ ...field, flex: 1 }} />
            </div>
            {!hasContact && (enquiry.name || enquiry.query) && (
              <div className="text-xs mt-1" style={{ color: T.accent }}>
                Give us an email or a mobile so we can reply.
              </div>)}
          </div>

          <div>
            <label className="text-xs font-bold" style={{ color: T.muted }}>PREFERRED LOCATION</label>
            <div style={{ marginTop: 4 }}>
              <Select value={enquiry.location} onChange={v => set("location", v)}
                style={{ width: "100%" }}
                options={[["", "No preference / not sure yet"],
                          ...locations.map(l => [l.name, l.name])]} />
            </div>
          </div>

          <div>
            <label htmlFor="eq-query" className="text-xs font-bold" style={{ color: T.muted }}>HOW CAN WE HELP? *</label>
            <textarea id="eq-query" rows={4} value={enquiry.query}
              onChange={e => set("query", e.target.value)}
              placeholder="e.g. I'm after NS/IPPT prep — what do sessions cost and when do they run?"
              style={{ ...field, marginTop: 4, resize: "none" }} />
          </div>
        </div>

        <div className="mt-4">
          <Btn full disabled={!ready} onClick={submitEnquiry}>Send enquiry</Btn>
        </div>
        <div className="text-center text-xs mt-3" style={{ color: T.muted }}>
          We'll only use your details to reply to this enquiry.
        </div>
        </>)}
      </div>
    </div>
  );
}
