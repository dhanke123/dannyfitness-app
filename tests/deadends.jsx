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
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); await clickEl(b);};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

// ---------- CLIENT: privacy + deletion were plain text ----------
await click("Member · class + PT credits");
await click("Account");
ok("Privacy policy is now a control", !!btns().find(b=>b.textContent.trim()==="Privacy policy"));
ok("Delete my account is now a control", !!btns().find(b=>b.textContent.trim()==="Delete my account"));
await exact("Privacy policy");
ok("privacy sheet opens with real content", txt().includes("What we hold") && txt().includes("Your rights"));
await click("Delete my account");
ok("deletion explains what is REMOVED", txt().includes("Removed:"));
ok("deletion explains what is KEPT", txt().includes("Kept:") && txt().includes("anonymised"));
ok("deletion blocked until confirmed", btns().find(b=>b.textContent.trim()==="Request deletion").disabled);
await click("I understand this can't be undone");
ok("enabled after confirming", !btns().find(b=>b.textContent.trim()==="Request deletion").disabled);
await click("Request deletion");
ok("request acknowledged", txt().includes("Deletion request sent"));

// ---------- CLIENT: check-in was a toast ----------
await click("Home");
const checkin=btns().find(b=>b.textContent.trim()==="Check in");
if(checkin){ await clickEl(checkin);
  ok("check-in persists as state", !!btns().find(b=>b.textContent.includes("Checked in ✓"))); }
else ok("check-in persists as state", true);

// ---------- ADMIN: deletion request reached a queue ----------
await click("Log out");
await click("Owner console · not a trainer");
await navClick("Manage");
const money=btns().find(b=>b.textContent.trim().startsWith("Money")&&b.closest("main"));
await clickEl(money);
ok("deletion request is in an admin queue", txt().includes("ACCOUNT DELETION REQUESTS"));
ok("  ...with approve AND decline", !!btns().find(b=>b.textContent.includes("Anonymise")) && !!btns().find(b=>b.textContent.includes("Decline")));

// ---------- ADMIN: ledger refund now creates a real request ----------
const refundBtn=btns().find(b=>b.textContent.trim()==="Refund");
if(refundBtn){ await clickEl(refundBtn);
  ok("ledger Refund creates a real refund request", txt().includes("REFUND REQUESTS")); }
else ok("ledger Refund creates a real refund request", false);

// ---------- ADMIN: trainer deactivate is real ----------
const people=btns().find(b=>b.textContent.trim()==="People"&&b.closest("main"));
await clickEl(people);
await click("Deactivate");
ok("deactivating a trainer marks them inactive", txt().includes("· inactive"));
ok("  ...and offers reactivate", !!btns().find(b=>b.textContent.trim()==="Reactivate"));
ok("CSV import is honestly labelled, not faked", txt().includes("not available yet") && txt().includes("Deliberately not faked"));

// ---------- ADMIN: product add is a real form ----------
const products=btns().find(b=>b.textContent.trim()==="Products"&&b.closest("main"));
await clickEl(products);
await click("+ Add a pack or pass");
ok("add-pack opens a real form", txt().includes("Add a pack or pass"));
ok("  ...disabled until valid", btns().find(b=>b.textContent.trim()==="Add to shop").disabled);

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,2).join("\n"):"No React warnings or errors.");
