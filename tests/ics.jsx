const { buildIcs, googleCalUrl, eventStart } = await import("../src/lib/calendar.js");
const start = eventStart(0, 2, "18:30");
const ics = buildIcs({ title:"Strength · ExerciseOnly", start, minutes:60,
  location:"Gardens by the Bay, Singapore", details:"Coach Danny; bring water", uid:"class-s1-w0" });
console.log(ics.replace(/\r\n/g,"\n"));
const need=["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT","UID:","DTSTART:","DTEND:","SUMMARY:","END:VEVENT","END:VCALENDAR"];
const missing=need.filter(k=>!ics.includes(k));
console.log("\nmissing keys:", missing.length?missing:"none");
console.log("CRLF line endings:", /\r\n/.test(ics));
console.log("commas escaped in LOCATION:", /LOCATION:Gardens by the Bay\\, Singapore/.test(ics));
console.log("semicolon-safe DESCRIPTION:", /DESCRIPTION:Coach Danny\\; bring water/.test(ics));
const dtstart=ics.match(/DTSTART:(\S+)/)[1], dtend=ics.match(/DTEND:(\S+)/)[1];
const p=s=>new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:00Z`);
console.log("duration is 60 min:", (p(dtend)-p(dtstart))/60000===60);
console.log("DTSTART maps back to local 18:30:", p(dtstart).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}));
console.log("\nGoogle URL:\n"+googleCalUrl({title:"Strength · ExerciseOnly",start,minutes:60,location:"Gardens by the Bay",details:"Coach Danny"}));
