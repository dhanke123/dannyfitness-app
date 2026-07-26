/* Add-to-calendar (Decision 14).

   Deliberately no OAuth, no sync, no stored tokens — an .ics download plus a Google
   Calendar template URL. That covers Apple Calendar, Outlook and Google without the
   app ever holding a calendar credential, and there is nothing to revoke if a member
   deletes their account.

   Dev-phase note: the .ics UID must become the real `bookings.id` so a re-issued
   invite (after a reschedule) REPLACES the original event in the member's calendar
   rather than adding a duplicate. Bump SEQUENCE on each reschedule. */

import { dateFor } from "./dates.js";

const pad = (n) => String(n).padStart(2, "0");

/* (weekOffset, weekday, "HH:MM") -> a real Date */
export const eventStart = (weekOff, day, time) => {
  const dt = dateFor(weekOff ?? 0, day ?? 0);
  const [h, m] = String(time || "00:00").split(":").map(Number);
  dt.setHours(h || 0, m || 0, 0, 0);
  return dt;
};

export const addMinutes = (dt, mins) => new Date(dt.getTime() + (mins || 0) * 60000);

/* UTC basic format: 20260728T103000Z — what both .ics and Google expect */
const stamp = (dt) =>
  `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T` +
  `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;

/* RFC 5545 wants CRLF line breaks and escaped commas/semicolons/newlines. */
const esc = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export const googleCalUrl = ({ title, start, minutes = 60, location = "", details = "" }) => {
  const end = addMinutes(start, minutes);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${stamp(start)}/${stamp(end)}`,
    location,
    details,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
};

export const buildIcs = ({ title, start, minutes = 60, location = "", details = "", uid }) => {
  const end = addMinutes(start, minutes);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExerciseOnly//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid || `eo-${Date.now()}`}@exerciseonly.vip`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    details ? `DESCRIPTION:${esc(details)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:ExerciseOnly session in 2 hours",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
};

/* Browser download. Kept out of the components so the sheets stay presentational. */
export const downloadIcs = (ev) => {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${String(ev.title || "session").replace(/[^\w-]+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
