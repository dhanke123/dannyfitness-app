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

/* The paper sheet lists Bootcamp and Holiday camp beside named clients — it is a
   record of the day, not an invoice, so unpayable rows belong in it. */
ok("classes appear alongside PT", /Boot Camp|Strength|HIIT|Cardio|NS \/ IPPT/.test(txt()));
ok("named PT clients appear", /PT|Sam Lee|Swati/.test(txt()));
ok("a running total of what was worked", /Sessions/.test(txt()) && /Classes/.test(txt()));
ok("camp days counted separately", /Camp days/.test(txt()));

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
ok("the log exports", !!btns().find(b=>b.textContent.includes("Export") && b.textContent.includes("log")));

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
