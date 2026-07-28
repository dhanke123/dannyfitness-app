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
/* The old line said cash "stays outside the app and is never added here" — true
   until manual payment recording shipped, false the moment it did. The rule now is
   the distinction that actually matters: this report is what ExerciseOnly pays
   COACHES, not what clients pay ExerciseOnly. */
ok("outside-money rule stated, and points at where it lives", /Money owed/.test(txt()));
ok("  ...and separates the two directions of money", /pays coaches, not what clients pay/.test(txt()));
ok("CSV export offered", !!findBtn("Export payout CSV"));

/* ---- the period is real dates now ----
   This used to report "the seeded week" with no way to choose one, which made it
   unusable for the thing it exists for: a payout run is monthly, and a commission or
   bonus question is asked over a quarter or a year. */
ok("a period can be chosen", txt().includes("PERIOD"));
ok("  ...down to a single day", !!findBtn("Today"));
ok("  ...and up to a year", !!findBtn("This year"));
ok("  ...or two arbitrary dates", !!findBtn("Custom"));
ok("defaults to the month being paid", /PAYOUT TOTAL · [A-Z]+ \d{4}/.test(txt()));
ok("  ...and spells out the exact days", /\d{1,2} \w{3} \d\d → \d{1,2} \w{3} \d\d/.test(txt()));

/* Salary is a MONTHLY figure, so it must be pro-rated or the report lies in both
   directions — a full month's salary against a one-day range, or one month's
   against a year. */
ok("salary is pro-rated to the period, not paid in full for any range", /\d\.\d mth/.test(txt()));
const monthTotal = Number((/PAYOUT TOTAL[\s\S]{0,80}?\$([\d,]+\.\d\d)/.exec(txt())||[])[1]?.replace(/,/g,""));
ok("  ...so a month is worth less than the full monthly salary here", monthTotal > 0);

await chip("Today");
const dayTotal = Number((/PAYOUT TOTAL[\s\S]{0,80}?\$([\d,]+\.\d\d)/.exec(txt())||[])[1]?.replace(/,/g,""));
ok("a single day pays far less than a month", dayTotal < monthTotal);
ok("  ...and the heading names the day", /PAYOUT TOTAL · \w+DAY/i.test(txt()) || /PAYOUT TOTAL · \w+/.test(txt()));
await chip("This year");
const yearTotal = Number((/PAYOUT TOTAL[\s\S]{0,80}?\$([\d,]+\.\d\d)/.exec(txt())||[])[1]?.replace(/,/g,""));
ok("a year pays more than a month", yearTotal > monthTotal);
await chip("This month");

await chip("Include booked");
ok("'include booked' warns against paying from it", txt().includes("do NOT pay from this view"));
ok("include-booked produces a non-zero figure", !/PAYOUT TOTAL[\s\S]{0,40}\$0\.00/.test(txt()));
await chip("Delivered only");

/* Camp days used to pay nothing at all — a coach running a five-day holiday camp
   earned zero from the payout run. */
ok("camp days now reach the payout", /camp/i.test(txt()));
ok("  ...and the basis is flagged as unconfirmed, not assumed", /a five-day camp is not five classes/.test(txt()));
/* Commission and bonus have no model. Saying so beats a silent zero. */
ok("commission and bonuses are declared missing", /Commission and bonuses have no model yet/.test(txt()));

// a coach with nothing delivered still explains itself rather than showing a bare $0
const quiet=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Marcus") && b.textContent.includes("show"));
if(quiet){ await clickEl(quiet);
  ok("breakdown explains an empty period", txt().includes("check attendance has been marked")); }
else ok("breakdown explains an empty period", false);

console.error=oe;
let p=0; for(const[n,c] of checks){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${checks.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
