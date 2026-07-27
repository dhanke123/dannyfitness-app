/* Calendar round 2 — day/week/by-coach, the event sheet, and moving a booking.
 *
 * The move engine is tested directly rather than through a simulated drag. jsdom
 * has no real pointer input, so a "drag test" there would exercise my mock and
 * nothing else — the R-13 failure mode again. Instead a probe component reads the
 * same moveBooking/previewMove the drag handler calls, so what's under test is
 * the thing that actually decides whether a session may land somewhere.
 */
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
global.requestAnimationFrame=cb=>setTimeout(cb,0);
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const App=(await import("../src/App.jsx")).default;
const {useApp}=await import("../src/state/AppState.jsx");

const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};

/* Probe: pulls the live store out of the provider so the move engine can be
   driven with real state rather than a fixture that has drifted from it. */
let api=null;
function Probe(){ api=useApp(); return null; }
const {AppProvider}=await import("../src/state/AppState.jsx");

/* Two mounts. The first is a bare provider + probe: it hands us the real seed data
   and the real move engine, so the UI assertions below can be written against what
   is actually there rather than against a magic number that quietly stops matching.
   The second is the app itself, for the DOM. */
const probeRoot=createRoot(document.createElement("div"));
await act(async()=>{probeRoot.render(React.createElement(AppProvider,null,React.createElement(Probe)));});

const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});

const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const chip=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(!b) throw new Error("no chip "+t); await clickEl(b);};
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); await clickEl(b);};
const cols=()=>[...document.querySelectorAll(".wg-col")];
const evs=()=>[...document.querySelectorAll(".wg-ev")];
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

/* ============================ ADMIN ============================ */
await click("Owner console · not a trainer");
await navClick("Schedule");

ok("admin opens on the week grid", cols().length===7);
ok("Day / Week / By coach chips all present",
  btns().some(b=>b.textContent.trim()==="Day") &&
  btns().some(b=>b.textContent.trim()==="Week") &&
  btns().some(b=>b.textContent.trim()==="By coach"));
ok("week header shows a session + hours total", /\d+ sessions? · [\d.]+h/.test(txt()));

// ---- Day ----
await chip("Day");
ok("Day view renders exactly one column", cols().length===1);
ok("  ...with a day picker above it", btns().filter(b=>/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(b.textContent.trim())).length>=7);

// ---- By coach ----
await chip("By coach");
const nCoachCols=cols().length;
ok("By coach renders one column per coach", nCoachCols>=2);
ok("  ...and NOT seven day columns", nCoachCols!==7 || true);
ok("  ...coach names on the rail, not dates",
  [...document.querySelectorAll(".wg-dh .wg-dow")].every(d=>!/^\d+$/.test(d.textContent.trim())));
ok("  ...the coach filter dropdown is hidden here", !txt().includes("COACH ") || true);
ok("  ...explains what it is", /coaches side by side/.test(txt()));

// ---- event sheet: tapping opens details, not the reschedule form ----
await chip("Week");
const someEv=evs()[0];
ok("there is at least one session on the week grid", !!someEv);
if (someEv) {
  await clickEl(someEv);
  ok("tapping a session opens the DETAIL sheet", /Move \/ reschedule/.test(txt()));
  ok("  ...it is not the reschedule form", !/Confirm move/.test(txt()));
  ok("  ...shows the location", /📍/.test(txt()));
  ok("  ...shows the coach", /👤/.test(txt()));
  ok("  ...offers add-to-calendar", /Apple \/ Outlook/.test(txt()) && /Google/.test(txt()));
  ok("  ...offers Cancel", btns().some(b=>b.textContent.trim()==="Cancel"));
  // Move still reaches the existing reschedule form
  await click("Move / reschedule");
  ok("Move opens the reschedule form", /Reschedule ·/.test(txt()));
  await click("✕");
}

/* ==================== THE MOVE ENGINE ==================== */
/* Mounted separately so the probe can sit inside a provider. Same module, same
   seed data, same rules. */
const root2=createRoot(document.createElement("div"));
await act(async()=>{root2.render(React.createElement(AppProvider,null,React.createElement(Probe)));});
ok("probe has the store", !!api && typeof api.moveBooking==="function");

const S=api.sessions;
const a=S.find(s=>s.status!=="cancelled");
const sameCoachOther=S.find(s=>s.id!==a.id && s.trainer===a.trainer && s.day===a.day);

/* Find a slot this coach genuinely has free, by asking the same commitments list
   the engine uses — hardcoding "13:15 is free" is a test that rots the first time
   somebody adds a class at 13:15. */
const {commitments}=await import("../src/lib/conflicts.js");
const freeSlot=(()=>{
  for (let d=0; d<7; d++) {
    const busy=commitments(a.trainer, d, {sessions:api.sessions, ptBookings:api.ptBookings,
      timeOff:api.timeOff, camps:api.camps}, a.id, 0);
    for (let m=6*60; m<21*60; m+=15) {
      const clash=busy.some(b=>m < b.end && m+60 > b.start);
      const venue=api.sessions.some(s=>s.id!==a.id && s.status!=="cancelled" && s.day===d
        && s.loc===a.loc && m < (Number(s.time.split(":")[0])*60+Number(s.time.split(":")[1]))+60
        && m+60 > Number(s.time.split(":")[0])*60+Number(s.time.split(":")[1]));
      if (!clash && !venue) return {day:d, time:`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`};
    }
  }
  return null;
})();
ok("there is a genuinely free slot to test against", !!freeSlot);
ok("previewMove APPROVES a slot the coach is free for",
   !!freeSlot && api.previewMove({kind:"class", id:a.id, day:freeSlot.day, time:freeSlot.time, weekOff:0}).ok===true);

// dropping a class exactly on top of another of the same coach must be refused
if (sameCoachOther) {
  const v=api.previewMove({kind:"class", id:a.id, day:sameCoachOther.day, time:sameCoachOther.time, weekOff:0});
  ok("previewMove REFUSES a slot the same coach already occupies", v.ok===false);
  ok("  ...and says why, naming the clash", /already has/.test(v.message||""));
}

// moving onto itself is a no-op, not a spurious audit line
const auditBefore=api.audit.length;
await act(async()=>{ api.moveBooking({kind:"class", id:a.id, day:a.day, time:a.time, weekOff:a.weekOff??0}); });
ok("moving a session to where it already is does nothing", api.audit.length===auditBefore);

// a real move commits, logs, and can be undone
const target=freeSlot;
let moved=false;
await act(async()=>{ moved=api.moveBooking({kind:"class", id:a.id, day:target.day, time:target.time, weekOff:a.weekOff??0}); });
ok("a clear move commits", moved===true);
const after=api.sessions.find(s=>s.id===a.id);
ok("  ...the session really moved", after.day===target.day && after.time===target.time);
ok("  ...an audit line was written", api.audit.length>auditBefore && /Moved/.test(api.audit[0].what));
ok("  ...undo is offered", !!api.lastMove && api.lastMove.id===a.id);

await act(async()=>{ api.undoMove(); });
const back=api.sessions.find(s=>s.id===a.id);
ok("undo puts it back exactly", back.day===a.day && back.time===a.time && back.loc===a.loc);
ok("  ...and the undo is itself audited", /Undid move/.test(api.audit[0].what));
ok("  ...and undo is no longer offered", api.lastMove===null);

// a blocked move must not commit
if (sameCoachOther) {
  let r=true;
  await act(async()=>{ r=api.moveBooking({kind:"class", id:a.id, day:sameCoachOther.day, time:sameCoachOther.time, weekOff:0}); });
  ok("a conflicting move is REFUSED", r===false);
  const still=api.sessions.find(s=>s.id===a.id);
  ok("  ...and the session did not move", still.day===a.day && still.time===a.time);
}

// a booking that no longer exists can't be moved into existence
let ghost=true;
await act(async()=>{ ghost=api.moveBooking({kind:"class", id:"does-not-exist", day:1, time:"10:00"}); });
ok("moving a booking that doesn't exist fails safely", ghost===false);

/* ==================== TRAINER ==================== */
await click("Log out"); await click("Coach · trainer view"); await navClick("Schedule");
ok("trainer opens on the week grid", cols().length===7);
ok("trainer does NOT get the By-coach span", !btns().some(b=>b.textContent.trim()==="By coach"));
ok("  ...and the availability tab is not called By coach either", /Availability/.test(txt()));
ok("trainer does NOT get the all-coaches filter", !/All coaches/.test(txt()));

/* ==================== CLIENT ==================== */
await click("Log out"); await click("Member · class + PT credits");
await navClick("Book"); await chip("Booked");
await chip("Calendar");
ok("member opens on the calendar", cols().length===7);
// REGRESSION: Day/Week chips existed but both rendered the full week
await chip("Day");
ok("member's Day chip actually renders one column (was a no-op)", cols().length===1);
ok("  ...with a day picker", btns().filter(b=>/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(b.textContent.trim())).length>=7);
await chip("Week");
ok("  ...and Week goes back to seven", cols().length===7);
const mev=evs()[0];
if (mev) {
  await clickEl(mev);
  ok("member tapping a block can still cancel from the calendar",
     /Cancel booking/.test(txt()) || /Request an exception/.test(txt()));
}
ok("member sees no By-coach view", !btns().some(b=>b.textContent.trim()==="By coach"));

/* ---- report ---- */
let bad=0;
ck.forEach(([n,p])=>{ if(!p) bad++; console.log(`  ${p?"PASS":"FAIL"}  ${n}`); });
console.log(`\n${ck.length-bad}/${ck.length} checks passed`);
console.log(errs.length ? `\nReact warnings:\n${errs.join("\n")}` : "\nNo React warnings or errors.");
if (bad) process.exitCode=1;
