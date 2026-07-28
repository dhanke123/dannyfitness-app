import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=> "blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");

/* ---- pin the clock to 07:00 today ----
   These suites book "today", and the client booking paths deliberately hide slots
   and classes that have already started. Run after about 7pm and nothing today is
   bookable, so the very first `Book` button doesn't exist and the suite dies — a
   failure that has nothing to do with the code under test and appears only in the
   evening. The weekday stays whatever it really is, so the seeded timetable behaves
   exactly as it does live; only the hour is fixed.

   Installed BEFORE importing App, because `lib/dates.js` captures TODAY and
   ANCHOR_MON at module load. (That capture is itself a known gap — an installed PWA
   left open overnight keeps yesterday's calendar. See the regression pack.) */
const _RealDate = Date;
const _PINNED = (() => { const d = new _RealDate(); d.setHours(7, 0, 0, 0); return d.getTime(); })();
class _FixedDate extends _RealDate {
  constructor(...a) { if (a.length === 0) super(_PINNED); else super(...a); }
  static now() { return _PINNED; }
}
global.Date = _FixedDate; dom.window.Date = _FixedDate;

const App = (await import("../src/App.jsx")).default;

const errs=[]; const origErr=console.error; console.error=(...a)=>{errs.push(a.join(" ")); origErr(...a);};
const root = createRoot(document.getElementById("root"));
await act(async ()=>{ root.render(React.createElement(App)); });

const txt = () => document.body.textContent;
const findBtn = (label) => [...document.querySelectorAll("button")].find(b=>b.textContent.trim().includes(label));
const click = async (label) => { const b=findBtn(label); if(!b) throw new Error("no button: "+label);
  await act(async ()=>{ b.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); }); };

const checks=[];
const ok=(n,c)=>checks.push([n, !!c]);

// --- CLIENT ---
await click("Member · class + PT credits");
ok("client home renders", txt().includes("Sam"));
await click("Book");
ok("book tab", txt().includes("Classes"));
// book the first available class
const bookBtn=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Book" && b.closest("main"));
await act(async()=>{ bookBtn.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
ok("checkout sheet opens", txt().includes("Free cancellation until"));
ok("per-type window in copy", /Free cancellation until 24h before/.test(txt()));
await click("Confirm · 1 credit");
ok("confirmation sheet w/ add-to-calendar", txt().includes("You're booked") && txt().includes("ADD TO YOUR CALENDAR"));
ok("google cal option", txt().includes("Google Calendar"));
await click("Done");
// Booked tab
const chips=[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="Booked");
await act(async()=>{ chips[0].dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
// Booked now opens on the calendar; the row actions live under List
const listChip=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="List");
if(listChip) await act(async()=>{ listChip.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
ok("booked list shows calendar buttons", txt().includes("Apple / Outlook"));
ok("policy footer per type", /24h before a class, 24h before PT and 2 day/.test(txt()));

// --- ACCOUNT: reminder channel ---
await click("Account");
ok("reminder channel block", txt().includes("Reminders & confirmations")||txt().includes("Reminders &amp; confirmations"));
ok("whatsapp default selected", /WhatsApp ✓/.test(txt()));
await click("Email");
ok("switched to email", /Email ✓/.test(txt()));

// --- CLIENT: exception request on a session inside the window ---
// Book a PT session today so it falls inside the 24h window, then request an exception.
await click("Book");
const ptChip=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="PT");
await act(async()=>{ ptChip.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
const slot=[...document.querySelectorAll("button")].find(b=>/^\d\d:\d\d/.test(b.textContent.trim()) && b.closest("main"));
if(slot){
  await act(async()=>{ slot.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  const conf=findBtn("Confirm · 1 credit")||findBtn("Pay & book");
  await act(async()=>{ conf.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await click("Done");
}
const bookedChip=[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="Booked");
await act(async()=>{ bookedChip[0].dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
const listChip2=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="List");
if(listChip2) await act(async()=>{ listChip2.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
const reqBtn=findBtn("Request an exception");
ok("inside-window shows Request an exception (not a dead end)", !!reqBtn);
ok("no dead-end 'message ExerciseOnly to change' copy", !/message ExerciseOnly to change this session/.test(txt()));
if(reqBtn){
  await act(async()=>{ reqBtn.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  ok("exception sheet opens", txt().includes("Request an exception") && txt().includes("WHY?"));
  const ta=document.querySelector("textarea");
  await act(async()=>{ const set=Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,"value").set;
    set.call(ta,"Down with flu"); ta.dispatchEvent(new dom.window.Event("input",{bubbles:true})); });
  ok("send enabled once a reason is given", !findBtn("Send request").disabled);
  await click("Send request");
  ok("booking unchanged until reviewed", txt().includes("Personal Training"));
}

// --- CLIENT: cancel a paid booking -> credit back + refundable ---
await click("Shop");
const buy=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().includes("Buy"));
if(buy){ await act(async()=>{ buy.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  const pay=findBtn("Pay $"); if(pay) await act(async()=>{ pay.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); }); }

// --- ADMIN ---
await click("Log out");
await click("Owner console · not a trainer");
ok("admin lands on Today", txt().includes("Today"));
await click("Manage");
ok("admin dash", txt().includes("Revenue"));
ok("waiting-on-you summary", txt().includes("WAITING ON YOU"));
ok("exception request reached the admin", txt().includes("Exception requests"));
await click("Schedule");
ok("exceptions queue on Schedule", txt().includes("EXCEPTION REQUESTS"));
ok("member reason visible to admin", txt().includes("Down with flu"));
ok("deny available as well as approve", !!findBtn("Deny") && !!findBtn("Approve"));
await click("Deny");
ok("deny asks for a reason", txt().includes("reason (shown to the member"));
await click("Confirm deny");
ok("exception queue cleared", !txt().includes("EXCEPTION REQUESTS"));
/* No-shows moved from Clients to Manage → Approvals → Client ops (28 Jul): the
   admin's job is "what needs my decision today", and that answer used to be spread
   over four screens. */
await click("Manage");
await click("Approvals");
await click("Client ops");
ok("noshow queue under Approvals → Client ops", txt().includes("NO-SHOW DECISIONS"));
ok("waive + apply both present", !!findBtn("Waive") && !!findBtn("Apply forfeit"));
await click("Waive");
ok("reason box appears", txt().includes("reason (shown to the member"));
await click("Confirm waive");
ok("noshow queue cleared", !txt().includes("NO-SHOW DECISIONS"));
// Manage → Money became Manage → Approvals (28 Jul); expenses is its own sub-tab.
const appr=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Approvals") && b.closest("main"));
await act(async()=>{ appr.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
ok("approvals gathers every decision in one place", /DECISION.? WAITING|NOTHING WAITING/.test(txt()));
const expTab=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Expenses"));
await act(async()=>{ expTab.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
ok("expense claim queue", txt().includes("EXPENSE CLAIMS"));
const gear=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Settings") && b.closest("main"));
await act(async()=>{ gear.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
ok("editable windows in settings", txt().includes("CANCELLATION & CHANGE WINDOWS"));
ok("camp days setting", txt().includes("days before"));
const nums=[...document.querySelectorAll("input[type=number]")];
ok("three window inputs (class/pt/camp)", nums.length>=3);

console.error=origErr;
let pass=0; for (const [n,c] of checks){ console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)pass++; }
console.log(`\n${pass}/${checks.length} checks passed`);
const real = errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length? "\nREACT ERRORS:\n"+real.join("\n") : "\nNo React warnings or errors.");
process.exit(pass===checks.length && real.length===0 ? 0 : 1);
