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
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const exact=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(!b) throw new Error("no exact "+t); await clickEl(b);};
// nav buttons carry a pending badge, so match on prefix not equality
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); if(!b) throw new Error("no nav "+t); await clickEl(b);};
const nav=()=>[...document.querySelectorAll("nav button")].map(b=>b.textContent.replace(/\d+|9\+/g,"").trim());
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

await click("Owner console · not a trainer");
// --- 1. NAV ORDER ---
ok("admin nav is Today·Schedule·Clients·Reports·Manage",
   JSON.stringify(nav())===JSON.stringify(["Today","Schedule","Clients","Reports","Manage"]));
ok("Camps no longer in the bottom nav", !nav().includes("Camps"));
ok("Reports sits between Clients and Manage", nav().indexOf("Reports")===3);

// --- 2. REPORTS SCREEN + PAYOUTS ---
await navClick("Reports");
ok("Reports opens its own screen", txt().includes("Profit & loss"));
ok("Payouts is a tab under Reports", !!btns().find(b=>b.textContent.trim()==="Payouts"));
await exact("Payouts");
ok("Payouts renders under Reports", txt().includes("PAYOUT TOTAL"));

// --- 3. MANAGE TAB ORDER + CAMPS ---
await navClick("Manage");
const grid=[...document.querySelectorAll("div")].find(d=>typeof d.className==="string"&&d.className.includes("grid-cols-4")&&d.className.includes("pb-3"));
const order=[...grid.querySelectorAll("button")].map(b=>b.textContent.replace(/\d+|9\+/g,"").trim());
ok("Manage order is Dash·People·Products·Money·Settings",
   JSON.stringify(order)===JSON.stringify(["Dash","People","Products","Money","Settings"]));
ok("Payouts removed from Manage", !order.includes("Payouts"));
ok("Reports removed from Manage", !order.includes("Reports"));
await exact("Settings");
ok("Camps now renders under Settings", txt().includes("day-by-day builder"));
ok("  ...alongside the class builder", txt().includes("the weekly timetable"));

// --- 4. LEADS LIFECYCLE ---
await exact("People");
ok("leads explain how they work", txt().includes("How this works") && txt().includes("Closed leads drop out"));
ok("open count shown", /LEADS · \d+ open/.test(txt()));
const openBefore=(txt().match(/LEADS · (\d+) open/)||[])[1];
await click("Converted ✓");
const openAfter=(txt().match(/LEADS · (\d+) open/)||[])[1];
ok("converting removes it from the open list", +openAfter === +openBefore-1);
ok("closed archive appears", txt().includes("CLOSED LEADS"));
ok("closed leads are kept, not deleted", txt().includes("Kept, not deleted"));
ok("can be reopened", !!btns().find(b=>b.textContent.trim()==="Reopen"));

// --- 5. INTAKE RECORDS ---
await click("Clients");
ok("intake records visible in the same menu as the client", txt().includes("Intake records"));
await click("Intake records");
ok("  ...shows a dated record", txt().includes("1 Jul 2026"));
ok("  ...shows goals", txt().includes("prep for IPPT"));
ok("  ...flags injuries", txt().includes("shoulder impingement"));
ok("  ...explains the handover use", txt().includes("Export before a handover"));
ok("  ...offers an export", !!btns().find(b=>b.textContent.includes("Export")));

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,2).join("\n"):"No React warnings or errors.");
