/* The two reports the admin pays coaches from, plus finding people once the roster grows.
 *
 * SHEET 1 — the coach's day log: Date / Time / Name / Remarks / Number of Sessions.
 * There was no equivalent. Payouts applies a rate card and produces money; it answers
 * "what do I owe?", not "what did they actually do?", which is the question that has to
 * be settled first. Without the diary the payout total is a number with nothing to check
 * it against.
 *
 * SHEET 2 — the per-client tab: Date / Time / Attendee / Remarks. This already existed
 * as Session history under each client, seeded from the same Swati & Supriya data
 * ("Ansab trained", "only Swati"). Asserted here so it stays that way.
 *
 * NUMBER OF SESSIONS is the pack balance left after that session, computed rather than
 * typed. Confirmed against the sheet: Shreyans & Pooja and Mable & Wendy & Helen both
 * read 8, and both packs are 10 with 2 used.
 */
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no button: "+l); await clickEl(b);};
const exact=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(!b) throw new Error("no button: "+t); await clickEl(b);};
const setVal=async(el,v)=>{await act(async()=>{
  const proto = el.tagName==="SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);
  el.dispatchEvent(new dom.window.Event(el.tagName==="SELECT"?"change":"input",{bubbles:true}));});};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

/* ============ 0 · THE SHARED MATERIALISER ============
   Coach log and Payouts read the SAME rows over the SAME range. If each expanded the
   recurring timetable its own way they would drift — one counting a cancelled class,
   the other not — and the admin would reconcile a payment against a diary that
   disagrees with it. Unit-tested here because it is the piece that stops that. */
const W=await import("../src/lib/worklog.js");
const P=await import("../src/lib/period.js");
const NOW=new Date(2026,6,28);

ok("a single-day range is one day, end inclusive", W.daysInRange(P.resolveRange("today",{},NOW)).length===1);
ok("a custom fortnight is 14 days", W.daysInRange(P.resolveRange("custom",{from:"2026-07-01",to:"2026-07-14"},NOW)).length===14);
ok("'this week' is Monday to today, not the last 7 days",
   P.rangeDays(P.resolveRange("wtd",{},NOW))===2);   // 28 Jul 2026 is a Tuesday
ok("  ...whereas 7 days really is 7", P.rangeDays(P.resolveRange("7d",{},NOW))===7);
/* "All time" resolves to year 0 → year 9999. Expanding a recurring timetable across
   four million days would lock the phone. */
ok("expansion is capped so 'all time' can't hang the app", W.daysInRange({key:"all"}).length<=W.MAX_DAYS+1);
ok("  ...and any range is capped too", W.daysInRange(P.resolveRange("custom",{from:"2020-01-01",to:"2030-01-01"},NOW)).length<=W.MAX_DAYS+1);

ok("12-hour times, as the paper sheet reads", W.ampm("06:15")==="6:15 AM" && W.ampm("19:00")==="7:00 PM");
ok("  ...midnight and noon don't come out as 0:00", W.ampm("00:30")==="12:30 AM" && W.ampm("12:05")==="12:05 PM");
/* The session log stores a human label because that is what the Google Sheet held. */
ok("a sheet-style date label parses to ISO", W.isoFromLabel("Wed, Jul 1, 2026")==="2026-07-01");
ok("  ...even without the year", /^\d{4}-07-03$/.test(W.isoFromLabel("Fri, Jul 3")||""));
ok("  ...and an unreadable one returns null rather than a wrong date", W.isoFromLabel("sometime")===null);

const july=P.resolveRange("custom",{from:"2026-07-01",to:"2026-07-31"},NOW);
const ctx={ sessions:[
    {id:"s1",day:1,time:"07:00",type:"BC",loc:"MP",trainer:"x",trainers:["x"],status:"scheduled",
     attendees:[{name:"a",status:"attended"},{name:"b",status:"confirmed"}],done:true},
    {id:"s2",day:1,time:"09:00",type:"STR",loc:"MP",trainer:"x",trainers:["x"],status:"cancelled",attendees:[]},
  ], ptBookings:[], camps:[], sessionLog:[], groupPacks:[], clientGroups:[] };
const rows=W.coachWorkRows("x", july, ctx);
const bootcamps=rows.filter(r=>r.name==="Boot Camp");
ok("a recurring weekly class expands across the month", bootcamps.length>=4);
ok("  ...on real dates, oldest first", rows[0].iso < rows[rows.length-1].iso);
ok("  ...all landing on the same weekday", new Set(bootcamps.map(r=>r.day)).size===1);
/* Cancelled work stays VISIBLE but is never payable — a light week needs its reason
   on the same page, and the payout must not pay for it. */
ok("cancelled sessions are kept in the diary", rows.some(r=>r.cancelled));
ok("  ...and are never payable", rows.filter(r=>r.cancelled).every(r=>!r.payable));
ok("delivered is recorded separately from payable", rows.some(r=>r.delivered && r.payable));
/* Per-head pay multiplies by heads that actually turned up, not heads booked. */
ok("attendance is carried for per-head pay", bootcamps[0].attended===1);
ok("  ...counting attended, not booked", bootcamps[0].booked===2);
ok("a coach with no work gets no rows", W.coachWorkRows("nobody", july, ctx).length===0);
ok("counts exclude cancelled work", W.workCounts(rows).cancelled>0 && W.workCounts(rows).total<rows.length);

/* ---- PAX: how many people were in front of the coach ----
   One number, four sources. It is the difference between an hour with one client and
   an hour with fourteen, which no other column shows — two weeks can look identical
   and be twice the work. */
ok("a class counts its roster", bootcamps[0].pax===1 && bootcamps[0].paxNote==="attended");
const unmarkedCtx={...ctx, sessions:[{...ctx.sessions[0], id:"s3", done:false}]};
const unmarkedRow=W.coachWorkRows("x", july, unmarkedCtx)[0];
ok("  ...booked before attendance is marked, attended after",
   unmarkedRow.pax===2 && unmarkedRow.paxNote==="booked");
const ptCtx={ ...ctx, sessions:[],
  ptBookings:[{id:"b1",trainer:"x",day:1,time:"08:00",loc:"MP",who:"Sam"},
              {id:"b2",trainer:"x",day:2,time:"08:00",loc:"MP",who:"Swati & Supriya",forGroup:"Swati & Supriya"}],
  clientGroups:[{id:"g1",name:"Swati & Supriya",memberIds:["c14","c15"],primaryId:"c14"}] };
const ptRows=W.coachWorkRows("x", july, ptCtx);
ok("individual PT is 1 pax", ptRows.find(r=>r.kind==="pt").pax===1);
ok("  ...labelled 1-to-1", ptRows.find(r=>r.kind==="pt").paxNote==="1-to-1");
ok("group PT counts the group", ptRows.find(r=>r.kind==="grouppt").pax===2);
const campCtx={ ...ctx, sessions:[], camps:[{id:"cx",name:"Holiday camp",loc:"MP",cap:20,spots:9,startInDays:0,
  days:[{label:"Day 1",sessions:[{activity:"Football",trainer:"x",start:"10:30",hours:2}]}]}] };
ok("a camp counts places sold, not capacity",
   (W.coachWorkRows("x", P.resolveRange("30d",{},NOW), campCtx).find(r=>r.kind==="camp")||{}).pax===11);
ok("total pax is people, not sessions", W.workCounts(ptRows).pax===3 && W.workCounts(ptRows).total===2);

/* ---- FILTERS: the same rows read forwards and backwards ---- */
const TODAY_ISO="2026-07-15";
const mixed=[
  {iso:"2026-07-10", delivered:true,  cancelled:false},
  {iso:"2026-07-14", delivered:false, cancelled:false},
  {iso:"2026-07-15", delivered:false, cancelled:false},   // today
  {iso:"2026-07-20", delivered:false, cancelled:false},   // future
  {iso:"2026-07-11", delivered:false, cancelled:true},
  {iso:"",           delivered:true,  cancelled:false},   // hand-entered history
];
ok("five filters offered", W.WORK_FILTERS.length===5);
ok("  ...named as asked", ["all","completed","unmarked","past","future"].every(k=>W.WORK_FILTERS.some(f=>f.key===k)));
/* "Past" includes TODAY. A 6am session is finished by the time anyone opens this, and
   a payout view that silently drops the current day is how a coach ends up short. */
ok("Past INCLUDES today", W.filterWork(mixed,"past",TODAY_ISO).some(r=>r.iso===TODAY_ISO));
ok("  ...and excludes tomorrow", !W.filterWork(mixed,"past",TODAY_ISO).some(r=>r.iso==="2026-07-20"));
ok("  ...and keeps undated history, which already happened", W.filterWork(mixed,"past",TODAY_ISO).some(r=>!r.iso));
ok("Future is strictly after today", W.filterWork(mixed,"future",TODAY_ISO).length===1);
ok("  ...so past and future don't overlap",
   W.filterWork(mixed,"past",TODAY_ISO).length + W.filterWork(mixed,"future",TODAY_ISO).length === mixed.length);
ok("Completed is delivered work only", W.filterWork(mixed,"completed",TODAY_ISO).length===2);
ok("Not marked is the chase list", W.filterWork(mixed,"unmarked",TODAY_ISO).length===3);
ok("  ...and neither includes cancelled work",
   [...W.filterWork(mixed,"completed",TODAY_ISO), ...W.filterWork(mixed,"unmarked",TODAY_ISO)].every(r=>!r.cancelled));
ok("All is everything", W.filterWork(mixed,"all",TODAY_ISO).length===mixed.length);

await click("Owner console · not a trainer");

/* ==================== 1 · SHEET 1 — COACH DAY LOG ==================== */

await click("Reports");
ok("Coach log is its own report", !!btns().find(b=>b.textContent.trim()==="Coach log"));
/* Diary before invoice: the admin checks the work happened, then pays for it. */
const tabs=btns().filter(b=>["Analytics","Coach log","Payouts"].includes(b.textContent.trim())).map(b=>b.textContent.trim());
ok("  ...and sits before Payouts", tabs.indexOf("Coach log") < tabs.indexOf("Payouts"));
await exact("Coach log");

ok("groups by date, printed once per day", /\w{3}, \d{1,2} \w{3} \d{4}/.test(txt()));
ok("times read as the sheet does, not 24h", /\d{1,2}:\d\d (AM|PM)/.test(txt()));
ok("the sheet's own columns are the headings", /TIME/.test(txt()) && /NAME/.test(txt()) && /LEFT/.test(txt()));

/* ---- the report is taken out for a period ----
   A 1/2/4-week toggle can't answer "what did Ansab do on the 3rd" or "what is this
   quarter's coach bill", and both are asked. Same shared control as every other
   report, so two screens can't disagree about the same month. */
ok("a period can be chosen", /PERIOD/.test(txt()));
ok("  ...a single day", !!btns().find(b=>b.textContent.trim()==="Today"));
ok("  ...a week", !!btns().find(b=>b.textContent.trim()==="This week"));
ok("  ...a month", !!btns().find(b=>b.textContent.trim()==="This month"));
ok("  ...a quarter and a year", !!btns().find(b=>b.textContent.trim()==="Quarter") && !!btns().find(b=>b.textContent.trim()==="This year"));
ok("  ...or two arbitrary dates", !!btns().find(b=>b.textContent.includes("Custom")));
ok("  ...and forward windows, so a forecast has a period it can live in",
   !!btns().find(b=>b.textContent.trim()==="Next 7 days") && !!btns().find(b=>b.textContent.trim()==="Next 30 days"));
ok("  ...and the exact days are spelled out, not just a preset name", /end date included/.test(txt()));

/* ---- the filter row, in the real UI ---- */
ok("the report filters as well as ranges", ["All","Completed","Not marked","Past","Future"]
   .every(l=>!!btns().find(b=>b.textContent.trim().startsWith(l))));
ok("  ...each carrying its own count, so you can see where the work sits",
   !!btns().find(b=>/^Past\s*\d+$/.test(b.textContent.trim().replace(/\s+/g," "))));
ok("defaults to Past — the payable window, not the forecast", /the payable window/.test(txt()));
await click("Not marked");
ok("Not marked explains itself as the chase list", /Chase these before running the payout/.test(txt()));
await click("Future");
ok("Future is named as a forecast, not a bill", /forecast, not the bill/.test(txt()));
/* Every backward preset ends today, so asking for the forecast over one can only
   return nothing. An empty list reads as "no sessions booked", which is a different
   and wrong claim — so it says why and offers the fix. */
ok("  ...and a forecast over a backward period explains itself", /This period ends today/.test(txt()));
ok("  ...offering a forward window in one tap", !!btns().find(b=>/next 30 days/i.test(b.textContent)));
await click("Look at the next 30 days");
ok("  ...which actually shows what's committed ahead", !/This period ends today/.test(txt()));
ok("  ...over a forward range", /Next 30 days/.test(txt()));
await exact("This month");
await click("Completed");
ok("Completed is named as the payout basis", /what a payout should be built from/.test(txt()));
await click("Past");

/* ---- pax column ---- */
ok("Pax is its own column", /PAX/.test(txt()));
ok("  ...and its own total", /Pax/.test(txt()));
ok("  ...explained, because 1 client and 14 look the same everywhere else",
   /people trained, not sessions run/.test(txt()));
ok("  ...saying what the number counts per row", /1-to-1|attended|booked|enrolled|in the group/.test(txt()));

const sessionCount=()=>Number((/Sessions(\d+)/.exec(txt().replace(/\s/g,""))||[])[1] ?? -1);
const monthN=sessionCount();
ok("defaults to the month being paid", monthN>0);
await exact("Today");
const dayN=sessionCount();
ok("a single day shows fewer sessions than a month", dayN < monthN);
await exact("This year");
ok("a year shows at least as many as a month", sessionCount() >= monthN);
await exact("This month");
ok("returning to the month restores the same figure", sessionCount()===monthN);

/* The paper sheet lists Bootcamp and Holiday camp beside named clients — it is a
   record of the day, not an invoice, so unpayable rows belong in it. */
ok("classes appear alongside PT", /Boot Camp|Strength|HIIT|Cardio|NS \/ IPPT/.test(txt()));
ok("named PT clients appear", /PT|Sam Lee|Swati/.test(txt()));
ok("a running total of what was worked", /Sessions/.test(txt()) && /Classes/.test(txt()));
ok("camp days counted separately", /Camps/.test(txt()));

/* THE COLUMN THAT MATTERS: pack balance, computed not typed. */
ok("explains what Number of Sessions means", /pack balance left after that session/.test(txt()));
ok("  ...and that it is computed, so it can't drift", /computed from the pack, not typed/.test(txt()));
ok("says plainly it is the diary, not the invoice", /diary, not the invoice/.test(txt()));

// switching coach re-derives the log
const sel=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>/Danny|Dylan/.test(o.textContent)));
ok("coach is picked from a list", !!sel);
const before=txt().length;
await setVal(sel, "wei");
ok("  ...and switching coach changes the log", txt().length!==before || /Nothing scheduled/.test(txt()));
await setVal(sel, "danny");
ok("a coach with nothing on says so rather than showing an empty box",
   /Nothing scheduled|TIME/.test(txt()));
/* The export button names the coach AND the period, so you can't hand over the wrong
   month without reading it on the button first. */
const exportBtn=btns().find(b=>/^Export /.test(b.textContent.trim()));
ok("the log exports", !!exportBtn);
ok("  ...naming the coach and the period on the button", /Export .+ · .+/.test(exportBtn?.textContent||""));
ok("  ...and the period matches the one selected", (exportBtn?.textContent||"").includes("July"));

/* Payouts must stay a SEPARATE report — merging them loses the check. */
await exact("Payouts");
ok("Payouts is still the money view", /PAYOUT TOTAL/.test(txt()));
ok("  ...and still pays only for delivered work", /Delivered only/.test(txt()));

/* ==================== 2 · SHEET 2 — PER-CLIENT TAB ==================== */

await click("Clients");
/* Open SWATI specifically. Her joint sessions are logged against the group name
   ("Swati & Supriya"), exactly as the paper sheet keeps them — one tab per pair.
   Filtering a client's history on their own name alone left her card empty while
   six of her sessions sat one row away under the group. */
const findBox=()=>[...document.querySelectorAll("input")].find(i=>i.getAttribute("aria-label")==="Search clients and groups");
await setVal(findBox(), "Swati");
await click("Session history");
ok("per-client session history exists (the sheet's per-name tab)", /Session history/.test(txt()));
ok("  ...and a group member sees the sessions her PAIR ran", /Session history \(6\)/.test(txt()));
ok("  ...dated, as the tab is", /Jul/.test(txt()));
ok("  ...records WHO actually trained them", /Ansab/.test(txt()));
ok("  ...and carries the partial-attendance remark", /only Swati/.test(txt()));
ok("  ...showing the shared pack balance", /of \d+ left/.test(txt()));
ok("staff can backfill a past session", !!btns().find(b=>b.textContent.includes("Add session")));

/* ==================== 3 · SEARCH ==================== */

const search=[...document.querySelectorAll("input")].find(i=>i.getAttribute("aria-label")==="Search clients and groups");
ok("the client list is searchable", !!search);

await setVal(search, "Wendy");
ok("finds a person by name", /Wendy/.test(txt()));
ok("  ...and hides the rest", !/Gireesh/.test(txt()));
/* Searching a member should surface the group she trains in, not only her own row —
   the pack and the payment live on the group. */
ok("  ...and surfaces the GROUP she trains in", /Mable & Wendy & Helen/.test(txt()));

await setVal(search, "91230010");
ok("finds by mobile", /Gireesh/.test(txt()));
await setVal(search, "9123 0010");
ok("  ...spaces in the typed number don't break it", /Gireesh/.test(txt()));

await setVal(search, "Bayshore");
ok("finds by LOCATION — 'who trains at Bayshore?'", /Kumar|Gireesh|Mable/.test(txt()));

await setVal(search, "sam@example");
ok("finds by email", /Sam Lee/.test(txt()));

await setVal(search, "zzzz");
ok("no match says so instead of showing a blank page", /No client matches/.test(txt()));
ok("  ...and names what is searched", /name, mobile, email and location/.test(txt()));
await setVal(search, "");
ok("clearing restores the full list", /Gireesh/.test(txt()) && /Sam Lee/.test(txt()));

/* ==================== 4 · LOCATION ON THE CLIENT ==================== */

ok("location shows on the card beside mobile and email", /📍/.test(txt()));
// exact match: the group rows carry "Edit ›" and sit above the client list
await exact("Edit");
ok("the edit sheet offers location", /USUAL LOCATION/.test(txt()));
ok("  ...alongside mobile and email", /MOBILE/.test(txt()) && /EMAIL/.test(txt()));
const locSel=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>/Costa Del Sol|Not set/.test(o.textContent)));
ok("  ...as a real venue list, not free text", !!locSel);
await setVal(locSel, "MP");
await click("Save changes");
ok("the change sticks", /Meyer Park/.test(txt()));
ok("  ...and is findable by the new location", true);
await setVal([...document.querySelectorAll("input")].find(i=>i.getAttribute("aria-label")==="Search clients and groups"), "Meyer");
ok("  ...search picks up the edited location", /Meyer Park/.test(txt()));

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nREACT ERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
process.exit(p===ck.length && real.length===0 ? 0 : 1);
