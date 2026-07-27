import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client");
const {act}=await import("react");
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const findBtn=(l)=>[...document.querySelectorAll("button")].find(b=>b.textContent.trim().includes(l));
const clickEl=async(el)=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async(l)=>{const b=findBtn(l); if(!b) throw new Error("no button: "+l); await clickEl(b);};
const chip=async(t)=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()===t); await clickEl(b);};
const checks=[]; const ok=(n,c)=>checks.push([n,!!c]);

await click("Member · class + PT credits");
await click("Book");
// pick a class far enough out to be cancellable: go to next week
await click("›");
const bookBtn=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Book" && b.closest("main"));
await clickEl(bookBtn);
// choose PayNow so this is a PAID booking, not a credit one
await click("PayNow QR");
await click("Pay & book");
ok("paid booking confirmed", txt().includes("You're booked"));
await click("Done");
await chip("Booked"); await chip("List");
ok("paid booking listed", txt().includes("Cancel"));
await click("Cancel");
ok("credit returned automatically (Decision 2 default)", txt().includes("CREDITED BACK"));
ok("refundable shows original method", /paid by PayNow/.test(txt()));
await click("Request a bank refund instead");
ok("refundable removed from client list", !txt().includes("CREDITED BACK"));

await click("Log out");
await click("Owner console · not a trainer");
await click("Manage");
ok("refund shows in waiting-on-you", txt().includes("Refund requests"));
const money=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Money") && b.closest("main"));
await clickEl(money);
ok("refund queue on Money", txt().includes("REFUND REQUESTS"));
ok("deny keeps the credit", !!findBtn("Deny (keep credit)"));
await click("Approve refund");
ok("approve asks for reason", txt().includes("reason (shown to the member"));
await click("Confirm approve refund");
ok("refund queue cleared", !txt().includes("REFUND REQUESTS"));
ok("refund written to the ledger", /Refund ·/.test(txt()));

console.error=oe;
let pass=0; for(const[n,c] of checks){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)pass++;}
console.log(`\n${pass}/${checks.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nREACT ERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
