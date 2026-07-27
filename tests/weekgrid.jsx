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
const D=await import("../src/lib/dates.js");
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); await clickEl(b);};
const chip=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(b) await clickEl(b);};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);
const grid=()=>document.querySelector(".wg-grid");
const gutterLabels=()=>[...document.querySelectorAll(".wg-grid > div:first-child > div")]
  .map(d=>d.textContent).filter(t=>/^\d{1,2}:00$/.test(t));

/* The grid range comes from the admin gym-hours setting (default 06:00-22:00);
   CAL_HSTART/CAL_HEND are the fallback when no window is supplied. The invariant
   worth testing is that ALL THREE roles see the same range for the same day. */
const GYM_START=6, GYM_END=22;
const rangeOf=()=>{const l=gutterLabels(); return l.length?`${l[0]}-${l[l.length-1]}`:"";};
ok("CAL_HSTART/CAL_HEND remain the no-window fallback", D.CAL_HSTART===5 && D.CAL_HEND===23);

// ---------- ADMIN ----------
await click("Owner console · not a trainer");
await navClick("Schedule");
ok("ADMIN lands on the week grid by default", !!grid());
ok("  ...all 7 day columns", document.querySelectorAll(".wg-col").length===7);
const lbls=gutterLabels();
ok("  ...gutter spans the configured gym hours", lbls[0]===`${GYM_START}:00` && lbls[lbls.length-1]===`${GYM_END}:00`);
ok("  ...one label per hour, inclusive", lbls.length===GYM_END-GYM_START+1);
const adminRange=rangeOf();
ok("  ...today column highlighted", !!document.querySelector(".wg-col.wg-todaycol"));
ok("  ...load dots on the day rail", document.querySelectorAll(".wg-load").length===7);
// focus expand
const dayBtns=()=>[...document.querySelectorAll(".wg-dh")];
await clickEl(dayBtns()[3]);
ok("tapping a day FOCUSES it", !!document.querySelector(".wg-col.wg-focus"));
ok("  ...others dim but stay visible", document.querySelectorAll(".wg-col.wg-dim").length===6);
ok("  ...focus bar appears with a way out", txt().includes("Show full week"));
await click("Show full week");
ok("  ...releases back to the full week", !document.querySelector(".wg-col.wg-focus"));
ok("Now button offered on the current week", !!btns().find(b=>b.textContent.trim()==="Now"));

// ---------- TRAINER ----------
await click("Log out"); await click("Coach · trainer view"); await navClick("Schedule");
ok("TRAINER also lands on the week grid", !!grid());
ok("  ...same range as the admin", rangeOf()===adminRange);

// ---------- CLIENT ----------
await click("Log out"); await click("Member · class + PT credits");
await navClick("Book"); await chip("Booked");
ok("CLIENT lands on the CALENDAR, not the list", !!grid());
ok("  ...same shared grid component", document.querySelectorAll(".wg-col").length===7);
/* REGRESSION: staff Schedule never passed the gym-hours window to WeekGrid, so a
   member and their coach saw different hours for the same day. */
ok("  ...same range as staff see", rangeOf()===adminRange);

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
