/* Real-date layer. Weekday index stays 0=Mon..6=Sun; (weekOffset, day) maps to a real date. */

export const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export const FULLDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Real-date layer. Weekday index stays 0=Mon..6=Sun (sessions recur weekly); a (weekOffset, day)
// pair maps to an actual calendar date anchored on the Monday of the real current week.
export const MS_DAY = 86400000;

export const TODAY = (new Date().getDay() + 6) % 7;               // real current weekday, Mon=0

export const ANCHOR_MON = (() => { const n = new Date(); n.setHours(0,0,0,0); n.setDate(n.getDate() - TODAY); return n; })();

export const dateFor = (weekOff, d) => new Date(ANCHOR_MON.getTime() + (weekOff*7 + d) * MS_DAY);

export const fmtDM   = (dt) => dt.toLocaleDateString('en-GB', {day:'numeric', month:'short'});          // "28 Jul"

export const fmtFull = (dt) => dt.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'}); // "Mon 28 Jul"

export const weekLabel = (weekOff) => { const a=dateFor(weekOff,0), b=dateFor(weekOff,6);
  return `${a.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${b.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`; };

// next real calendar date for a weekday (this week if still upcoming, else next week)
export const upcomingDate = (d) => dateFor(d>=TODAY ? 0 : 1, d);

// location id is already a short code (GBB, MP, WS, CDS, BP) — used as the compact initials
export const locAbbr = (loc) => loc==="other" ? "OTH" : String(loc||"").toUpperCase();

export const firstName = (n) => String(n||"").split(" ")[0];

/* ---------- calendar grid bounds ----------
   Shared by the client Booked calendar and the trainer/admin schedule so the two can
   never drift apart. Column width and row height stay per-view (the client grid is
   narrower); only the hour range is common. */
export const CAL_HSTART = 5;   // grid starts 5:00 am
export const CAL_HEND   = 23;  // grid ends 11:00 pm
/* CAL_HEND is the hour the grid STOPS at, so the last drawn row is (CAL_HEND - 1):00
   to CAL_HEND:00. At 22 the grid ended at 10pm and anything from 22:00 onward was
   positioned past `gridH` — rendered outside the box and clipped by its
   overflow-hidden, so a late session simply wasn't there. 23 gives a full evening.
   Raising this costs vertical space on every calendar; both grids are scrollable,
   so the trade is height, not clipping. */

/* ---------- time helpers ---------- */
export const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60+m; };

export const fromMin = (m) => { const h = Math.floor(m/60), mm = m%60; return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; };

/* ---------- ISO date <-> the app's (weekOffset, weekday) pair ----------
   The demo models a recurring weekly timetable, but a human scheduling a class
   thinks in dates. These convert between the two so a builder can offer a real
   date picker while the rest of the app keeps working in weekday terms. */

// local-time ISO (yyyy-mm-dd). toISOString() would shift by the UTC offset and
// hand back yesterday for anyone east of Greenwich — Singapore is UTC+8.
export const toISO = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;

export const isoFor = (weekOff, d) => toISO(dateFor(weekOff, d));

export const fromISO = (iso) => {
  if (!iso) return null;
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, m-1, d); dt.setHours(0,0,0,0);
  const diff = Math.round((dt.getTime() - ANCHOR_MON.getTime()) / MS_DAY);
  return { weekOff: Math.floor(diff/7), day: ((diff%7)+7)%7, past: diff < 0, date: dt };
};

// "07:00" -> valid?  Guards the conflict engine: a malformed time parses to NaN,
// and every NaN comparison is false, so an invalid time silently reports NO
// conflicts rather than failing loudly.
export const isValidTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t||""));
