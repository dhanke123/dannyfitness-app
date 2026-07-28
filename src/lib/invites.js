/* Account creation and the login invite.
 *
 * Getting someone INTO the app is a workflow, not a toggle. A coach adds Priya
 * mid-booking; the admin confirms she is real; an invite has to reach her on a
 * channel she actually reads; and until she taps it she has a record in the system
 * and no way to sign in. Every one of those steps can fail quietly, and the failure
 * looks identical from the studio's side to "she hasn't got round to it".
 *
 * SO: DELIVERY IS TRACKED PER CHANNEL. An invite is not "sent" — it is sent to
 * WhatsApp (ok/failed) and to email (ok/failed), separately, with the reason. An
 * invite that silently failed is a client who thinks the app doesn't work and a
 * studio that thinks she's ignoring them.
 *
 * COACHES ARE ADMIN-CREATED ONLY (decided 28 Jul). Anyone can register as a client;
 * nobody registers as staff. The role never comes from the device — the signup
 * trigger makes every profile a client and staff are promoted by hand, so a tampered
 * signup can't grant itself the trainer nav or the payout report.
 */

export const INVITE_CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", needs: "phone" },
  { key: "email",    label: "Email",    needs: "email" },
];

export const INVITE_STATUS = {
  draft:    { label: "Not sent",  tone: "muted"  },
  sent:     { label: "Sent",      tone: "blue"   },
  partial:  { label: "Part sent", tone: "orange" },
  failed:   { label: "Failed",    tone: "accent" },
  accepted: { label: "Logged in", tone: "moss"   },
};

/* Derived, like every other status in this codebase — from the per-channel results,
   never set by hand. `accepted` is the exception: that is a fact the app learns when
   they actually sign in. */
export function inviteStatus(inv) {
  if (inv.acceptedAt) return "accepted";
  const rs = Object.values(inv.channels || {});
  if (!rs.length) return "draft";
  const ok = rs.filter(r => r.status === "sent").length;
  if (ok === 0) return "failed";
  return ok === rs.length ? "sent" : "partial";
}

export const inviteReachable = (inv) =>
  Object.values(inv.channels || {}).some(r => r.status === "sent");

/* Which channels we can even attempt. Sending to a channel we have no address for
   isn't a failure, it's a gap — and reporting it as "failed" would send the admin
   chasing a delivery problem that is really a missing email address. */
export function plannedChannels({ phone, email }) {
  const out = [];
  if (String(phone || "").replace(/\D/g, "").length >= 8) out.push("whatsapp");
  if (/\S+@\S+\.\S+/.test(String(email || ""))) out.push("email");
  return out;
}

export function missingChannels({ phone, email }) {
  const have = plannedChannels({ phone, email });
  return INVITE_CHANNELS.filter(c => !have.includes(c.key)).map(c => c.key);
}

/* The demo's stand-in for Twilio and Resend.
 *
 * Deliberately FALLIBLE: a number ending 0000 and an address at example.invalid both
 * bounce, so the retry path and the "not delivered" list can be exercised without a
 * live sender. In the dev phase this becomes an edge function call and the returned
 * shape stays identical — {status, at, error} per channel — so nothing downstream
 * changes when the fake is removed. */
export function deliver(channel, to) {
  const at = new Date().toISOString();
  if (!to) return { status: "skipped", at, error: `No ${channel === "email" ? "email address" : "mobile number"} on file` };
  if (channel === "whatsapp" && String(to).replace(/\D/g, "").endsWith("0000"))
    return { status: "failed", at, to, error: "Not registered on WhatsApp" };
  if (channel === "email" && /example\.invalid$/i.test(String(to)))
    return { status: "failed", at, to, error: "Mailbox does not exist" };
  return { status: "sent", at, to };
}

export const inviteBody = ({ name, kind, studio = "ExerciseOnly" }) =>
  kind === "coach"
    ? `Hi ${name} — your ${studio} coach account is ready. Sign in with this mobile number to see your schedule, mark attendance and submit expenses.`
    : `Hi ${name} — welcome to ${studio}! Your account is ready. Sign in with this mobile number to book sessions, see your credits and track your training.`;

/* Rows for the admin's delivery list. `failed` first, because that is the only state
   anyone has to do something about. */
export function inviteRows(invites) {
  const rank = { failed: 0, partial: 1, draft: 2, sent: 3, accepted: 4 };
  return [...invites]
    .map(i => ({ ...i, status: inviteStatus(i) }))
    .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
}

export function inviteSummary(invites) {
  const rows = inviteRows(invites);
  return {
    total: rows.length,
    accepted: rows.filter(r => r.status === "accepted").length,
    awaiting: rows.filter(r => r.status === "sent" || r.status === "partial").length,
    /* The number that matters: people with a record in the system who cannot get in.
       They look exactly like a slow signup until someone checks. */
    unreachable: rows.filter(r => r.status === "failed" || r.status === "draft").length,
  };
}
