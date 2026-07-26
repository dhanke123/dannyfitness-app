/* Supabase client — the one place the app talks to the backend.

   Config comes from Vercel env vars, never hard-coded, so staging and production
   point at different projects without a code change:

     VITE_SUPABASE_URL       https://<project>.supabase.co
     VITE_SUPABASE_ANON_KEY  the publishable key (RLS protects the data)
     VITE_DEMO_LOGINS        "true" to keep the four one-tap demo accounts

   The service_role key must NEVER appear here. It belongs only in edge functions.

   If the env vars are missing the client is `null` and the app runs entirely on
   seed data exactly as it does today. That is deliberate: Danny can still open the
   app and demo it end-to-end with no network, and a misconfigured deploy degrades
   to the demo rather than to a white screen. */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

/* Demo logins stay available when explicitly enabled, and automatically whenever
   there's no backend to log into. */
export const DEMO_LOGINS =
  import.meta.env.VITE_DEMO_LOGINS === "true" || !isConfigured;

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        // survives an app restart — members should not re-OTP every launch
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // phone OTP only; no magic-link redirects
        storageKey: "exerciseonly.auth",
      },
    })
  : null;

if (!isConfigured && import.meta.env.DEV) {
  console.info(
    "[ExerciseOnly] No VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — running on demo seed data."
  );
}

/* ---------- phone helpers ----------
   Supabase Auth wants E.164. Danny's members will type "9123 4567", "+65 9123 4567"
   or "6591234567" and all three have to work, so normalise before sending. */
export const toE164 = (raw, cc = "65") => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (String(raw).trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith(cc) && digits.length > 8) return `+${digits}`;
  return `+${cc}${digits}`;
};

/* Singapore mobiles are 8 digits starting 8 or 9. Cheap client-side check so we
   don't burn a Twilio SMS on an obvious typo — the server still validates. */
export const looksLikeSgMobile = (raw) => {
  const d = String(raw || "").replace(/\D/g, "").replace(/^65/, "");
  return /^[89]\d{7}$/.test(d);
};

/* ---------- profile ----------
   The signup trigger creates a profile with role 'client'. Staff are promoted by
   hand afterwards, so the app must read the role from the DB and never infer it
   from anything the client controls. */
export const fetchProfile = async (userId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, is_head_coach, full_name, phone")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
};

/* Maps a profiles row onto the shape the app's screens already expect, so wiring
   auth doesn't ripple into every component. */
export const toAppUser = (profile) => {
  if (!profile) return null;
  const role = ["client", "trainer", "admin"].includes(profile.role) ? profile.role : "client";
  return {
    id: profile.id,
    role,
    name: profile.full_name || "Member",
    isHeadCoach: Boolean(profile.is_head_coach),
    phone: profile.phone || null,
  };
};
