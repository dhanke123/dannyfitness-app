/* F0 — usage event tracking foundation.
 *
 * This produces NO report today. It exists so that by the time the usage reports
 * are worth building, there is something to report on. Behavioural data cannot be
 * backfilled: whatever isn't captured now is gone.
 *
 * Design constraints, in order of importance:
 *
 *   1. **No personal data in an event.** A user id, a screen name, an action name.
 *      Never a client's name, phone, message text or note. Once analytics events
 *      contain personal data they fall under PDPA deletion and export requests, and
 *      a whole compliance surface appears for the sake of a chart.
 *   2. **Never block the app.** Tracking is fire-and-forget. A failed insert must
 *      not stop someone booking a class.
 *   3. **Cheap.** Events are buffered and flushed in batches, not one write per tap.
 *
 * In the demo the buffer just lives in memory. In the dev phase `flush()` posts to
 * the `usage_events` table (migration 021).
 */

const BUFFER = [];
const MAX_BUFFER = 50;

let sink = null;          // set by the app once Supabase is available
let sessionId = null;
let currentUser = null;

const newSessionId = () =>
  `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const startUsageSession = (user) => {
  sessionId = newSessionId();
  currentUser = user ? { id: user.id, role: user.role } : null;
};

export const setUsageSink = (fn) => { sink = fn; };

/* An allow-list, not a free-for-all. If an event name isn't here it's dropped —
   which keeps the eventual reports interpretable and stops ad-hoc names creeping
   in that nobody can group later. */
export const EVENTS = {
  SCREEN_VIEW: "screen_view",
  BOOK_OPEN: "book_open",
  BOOK_CONFIRM: "book_confirm",
  BOOK_CANCEL: "book_cancel",
  BOOK_MODIFY: "book_modify",
  EXCEPTION_REQUEST: "exception_request",
  REFUND_REQUEST: "refund_request",
  ENQUIRY_SUBMIT: "enquiry_submit",
  WORKOUT_START: "workout_start",
  WORKOUT_FINISH: "workout_finish",
  SHOP_CHECKOUT: "shop_checkout",
  NOTIFICATION_OPEN: "notification_open",
  CALENDAR_EXPORT: "calendar_export",
  REPORT_EXPORT: "report_export",
  APPROVAL_ACTION: "approval_action",
};
const ALLOWED = new Set(Object.values(EVENTS));

/* props must stay small and non-identifying: counts, enum-ish strings, booleans. */
const SAFE_KEYS = new Set(["screen", "tab", "kind", "type", "method", "result",
                           "count", "source", "channel", "role", "section"]);

const clean = (props = {}) => {
  const out = {};
  Object.entries(props).forEach(([k, v]) => {
    if (!SAFE_KEYS.has(k)) return;                       // drop anything unexpected
    if (v === null || v === undefined) return;
    if (typeof v === "string") out[k] = v.slice(0, 40);  // no free text dumps
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
  });
  return out;
};

export function track(event, props) {
  try {
    if (!ALLOWED.has(event)) return;                     // unknown event: ignore
    BUFFER.push({
      event,
      props: clean(props),
      role: currentUser?.role ?? "anon",
      user_id: currentUser?.id ?? null,
      session_id: sessionId ?? (sessionId = newSessionId()),
      at: new Date().toISOString(),
    });
    if (BUFFER.length >= MAX_BUFFER) flush();
  } catch {
    /* Tracking must never break the app. Swallowing here is deliberate: an
       analytics failure is not worth a broken booking. */
  }
}

export async function flush() {
  if (!BUFFER.length) return [];
  const batch = BUFFER.splice(0, BUFFER.length);
  if (sink) { try { await sink(batch); } catch { /* dropped, by design */ } }
  return batch;
}

/* Demo/debug helpers — also what the tests assert against. */
export const peekUsage = () => [...BUFFER];
export const resetUsage = () => { BUFFER.length = 0; };
