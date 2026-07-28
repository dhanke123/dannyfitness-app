/* Decision 2 (credit back by default, bank refund on request) — end to end.
 *
 * REWRITTEN for MANUAL_PAYNOW (Decisions 29/30). The old version clicked "Pay & book"
 * and asserted on the confirmation. That button stopped existing when payments moved
 * to manual PayNow: a paid booking now needs a transfer screenshot and an admin
 * approval before it exists at all. The suite had been throwing on the missing button
 * ever since — and because run.sh only grepped for the word FAIL, a suite that never
 * ran a single assertion was reported as clean. Both are fixed: the runner now checks
 * the exit code, and this drives the real flow.
 *
 * The path under test, which is also the whole money loop:
 *   member pays by PayNow + uploads proof  ->  admin approves  ->  booking exists
 *   member cancels  ->  credit back automatically  ->  member asks for money instead
 *   ->  admin approves the refund  ->  credit removed, ledger written. Never both.
 */
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.File=dom.window.File;
global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
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
const chip=async(t)=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()===t); if(!b) throw new Error("no chip: "+t); await clickEl(b);};
const checks=[]; const ok=(n,c)=>checks.push([n,!!c]);

/* The transfer screenshot. jsdom won't let a script assign input.files, so the
   property is redefined — the component only reads files[0].name and .size. */
const attachProof = async () => {
  const input=[...document.querySelectorAll('input[type=file]')].find(i=>i.getAttribute("aria-label")==="Payment proof");
  if(!input) throw new Error("no proof input");
  const file=new dom.window.File(["x"],"transfer.png",{type:"image/png"});
  Object.defineProperty(input,"files",{value:[file],configurable:true});
  await act(async()=>{ input.dispatchEvent(new dom.window.Event("change",{bubbles:true})); });
};

// ---------------------------------------------------------- member pays by PayNow
await click("Member · class + PT credits");
await click("Book");
await click("›");                  // next week, so the booking sits outside the window
const bookBtn=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Book" && b.closest("main"));
await clickEl(bookBtn);
await click("PayNow QR");
ok("PayNow asks for a transfer screenshot", !!findBtn("Upload proof to continue"));
ok("  ...and won't submit without one", !!findBtn("Upload proof to continue")?.disabled);
await attachProof();
ok("proof attached", txt().includes("transfer.png"));
await click("Submit proof for approval");
ok("nothing granted yet (Decision 30)", !txt().includes("You're booked"));
await chip("Booked");
ok("member sees the purchase held", txt().includes("AWAITING PAYMENT APPROVAL"));

// ------------------------------------------------------------- admin approves it
await click("Log out");
await click("Owner console · not a trainer");
await click("Manage");
/* Manage → Money became Manage → Approvals → Payments (28 Jul): everything that
   needs a decision now lives under one tab, grouped by the KIND of decision. */
const money=async()=>{
  const a=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Approvals") && b.closest("main"));
  if(a) await clickEl(a);
  const t=[...document.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Payments"));
  if(t) await clickEl(t);
};
await money();
ok("payment approvals queue exists", /PAYMENT APPROVALS/i.test(txt()));
ok("  ...and shows the proof filename to check against the bank app", txt().includes("transfer.png"));
ok("  ...deny is offered alongside approve (Decision 7)", !!findBtn("Not found"));
await click("Payment received");
ok("approving asks for a reason for the audit log", txt().includes("reason (shown to the member"));
await click("Confirm payment received");
ok("payment queue cleared", !/PAYMENT APPROVALS/i.test(txt()));

// --------------------------------------------- member cancels -> credit back first
await click("Log out");
await click("Member · class + PT credits");
await click("Book"); await chip("Booked"); await chip("List");
ok("approved booking is now real", txt().includes("Cancel"));
await click("Cancel");
ok("credit returned automatically (Decision 2 default)", txt().includes("CREDITED BACK"));
ok("refundable shows original method", /paid by PayNow/.test(txt()));
await click("Request a bank refund instead");
ok("refundable leaves the client list once requested", !txt().includes("CREDITED BACK"));

// --------------------------------------------------- admin rules on the refund
await click("Log out");
await click("Owner console · not a trainer");
await click("Manage");
await clickEl([...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Dash" && b.closest("main")));
ok("refund shows in waiting-on-you", txt().includes("Refund requests"));
await money();
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
process.exit(pass===checks.length && real.length===0 ? 0 : 1);
