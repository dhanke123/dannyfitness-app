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
const findBtn=l=>[...document.querySelectorAll("button")].find(b=>b.textContent.trim().includes(l));
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=findBtn(l); if(!b) throw new Error("no button: "+l); await clickEl(b);};
const chip=async t=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()===t); await clickEl(b);};
const checks=[]; const ok=(n,c)=>checks.push([n,!!c]);

await click("Owner console · not a trainer");
// Payouts moved from Manage to its own Reports screen
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); await clickEl(b);};
await navClick("Reports");
await chip("Payouts");
ok("Payouts section renders", txt().includes("PAYOUT TOTAL"));
ok("defaults to delivered-only basis", txt().includes("Paying only for work marked done"));
ok("per-head coach shown with head rate", /per head \$12/.test(txt()));
ok("salary coach shown as salary", /\$6000.00\/month salary/.test(txt()));
ok("per-class coach shown with class rate", /per class \$40/.test(txt()));
ok("open questions surfaced not hidden", txt().includes("STILL TO CONFIRM WITH DANNY"));
ok("cash-outside-app rule stated", txt().includes("Cash collected at walk-ins"));
ok("CSV export offered", !!findBtn("Export payout CSV"));

// nothing delivered yet -> totals should be zero, not invented
// Danny is on salary, which is flat regardless of delivered work — so the
// delivered-only total should be exactly his salary and nothing else.
ok("delivered-only total is salary only (no unearned per-class pay)", /PAYOUT TOTAL[\s\S]{0,60}\$6000\.00/.test(txt()));
await chip("Include booked");
ok("'include booked' warns against paying from it", txt().includes("do NOT pay from this view"));
ok("include-booked produces a non-zero figure", !/PAYOUT TOTAL[\s\S]{0,40}\$0\.00/.test(txt()));
await chip("Delivered only");

// expand a breakdown
const dylan=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Dylan") && b.textContent.includes("show"));
if(dylan){ await clickEl(dylan);
  ok("breakdown explains an empty period", txt().includes("check attendance has been marked")); }
else ok("breakdown explains an empty period", false);

console.error=oe;
let p=0; for(const[n,c] of checks){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${checks.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
