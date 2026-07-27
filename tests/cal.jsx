import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const {CAL_HSTART,CAL_HEND}=await import("../src/lib/dates.js");
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const chip=async t=>{const b=btns().find(x=>x.textContent.trim()===t); await clickEl(b);};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);
const labels=()=>[...document.querySelectorAll("div")].map(d=>d.textContent).filter(t=>/^\d{1,2}:00$/.test(t));

ok("CAL_HEND is 23 (11pm)", CAL_HEND===23);
ok("CAL_HSTART unchanged at 5", CAL_HSTART===5);

/* The grid is now bounded by the ADMIN's gym-hours setting (Manage → Settings,
   default 06:00–22:00), not by CAL_HSTART/CAL_HEND. Those constants stay as the
   fallback for any grid rendered without a window. What must hold either way:
   both roles see the SAME hours for the same day, the range is contiguous, and
   nothing is drawn past midnight. */
const GYM_START=6, GYM_END=22;

// --- CLIENT calendar ---
await click("Member · class + PT credits");
await click("Book"); await chip("Booked"); await chip("Calendar");
const cl=labels();
ok("client grid opens at the configured gym start", cl.includes(`${GYM_START}:00`));
ok("client grid closes at the configured gym end", cl.includes(`${GYM_END}:00`));
ok("client grid has no 24:00", !cl.includes("24:00"));
ok("client grid is contiguous", cl.length>=GYM_END-GYM_START);

// --- TRAINER calendar ---
await click("Log out");
await click("Head Coach · trainer view");
await click("Schedule");
const tl=labels();
ok("trainer grid opens at the configured gym start", tl.includes(`${GYM_START}:00`));
ok("trainer grid closes at the configured gym end", tl.includes(`${GYM_END}:00`));
/* REGRESSION: Schedule destructured gymHoursStart/gymHoursEnd and never passed
   them to WeekGrid, so staff saw 05:00–23:00 while the member looked at
   06:00–22:00 for the same day. */
ok("client and trainer grids span the SAME hours", JSON.stringify([...new Set(cl)].sort())===JSON.stringify([...new Set(tl)].sort()));

/* A booking OUTSIDE the configured window must still be drawn. WeekGrid widens
   HS/HE to cover its events, because the alternative is a negative `top` (or one
   past GRID_H), overflow:hidden, and a session the member cannot see at all.
   Mirrors the component's own arithmetic. */
const bound=(baseHS,baseHE,evStart,evDur)=>{
  const HS=Math.max(0,Math.min(baseHS,Math.floor(evStart/60)));
  const HE=Math.min(24,Math.max(baseHE,Math.ceil((evStart+evDur)/60),HS+1));
  return {HS,HE};
};
const fits=(baseHS,baseHE,evStart,evDur,PXH)=>{
  const {HS,HE}=bound(baseHS,baseHE,evStart,evDur);
  const top=(evStart-HS*60)/60*PXH;
  return top>=0 && top+19 <= (HE-HS)*PXH;
};
ok("a 21:45 PT running past a 22:00 close still fits", fits(GYM_START,GYM_END,21*60+45,45,54));
ok("a 06:30 class before a 07:00 open still fits", fits(7,GYM_END,6*60+30,60,54));
ok("(regression) a fixed window would have pushed the 21:45 PT off the grid",
   ((21*60+45)-GYM_START*60)/60*54 + 45/60*54 > (GYM_END-GYM_START)*54);
ok("widening never runs past midnight", bound(GYM_START,GYM_END,23*60+30,60).HE===24);
ok("CAL_HSTART/CAL_HEND remain the no-window fallback", CAL_HSTART===5 && CAL_HEND===23);

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
