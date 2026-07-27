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

// --- CLIENT calendar ---
await click("Member · class + PT credits");
await click("Book"); await chip("Booked"); await chip("Calendar");
const cl=labels();
ok("client grid shows 23:00", cl.includes("23:00"));
ok("client grid still shows 22:00", cl.includes("22:00"));
ok("client grid still starts at 5:00", cl.includes("5:00"));
ok("client grid has no 24:00", !cl.includes("24:00"));

// --- TRAINER calendar ---
await click("Log out");
await click("Head Coach · trainer view");
await click("Schedule");
const tl=labels();
ok("trainer grid shows 23:00", tl.includes("23:00"));
ok("trainer grid still shows 22:00", tl.includes("22:00"));
ok("trainer grid starts at 5:00", tl.includes("5:00"));
ok("client and trainer grids span the SAME hours", JSON.stringify([...new Set(cl)].sort())===JSON.stringify([...new Set(tl)].sort()));

// --- a 22:30 event must land INSIDE the grid box, not below it ---
const PXH_CLIENT=48, PXH_STAFF=52;
const gridH=(h)=>(CAL_HEND-CAL_HSTART)*h;
const topFor=(mins,h)=>(mins-CAL_HSTART*60)/60*h;
ok("22:30 event fits inside the client grid", topFor(22*60+30,PXH_CLIENT)+20 <= gridH(PXH_CLIENT));
ok("22:30 event fits inside the trainer grid", topFor(22*60+30,PXH_STAFF)+20 <= gridH(PXH_STAFF));
ok("(regression) at the old CAL_HEND=22 it would NOT have fitted",
   ((22*60+30)-5*60)/60*PXH_CLIENT > (22-5)*PXH_CLIENT);

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
