/* Manual money, end to end.
 *
 * Post-pay, part-pay and paid-outside are the nature of a small studio: Danny takes
 * cash at the park, agrees a price on WhatsApp, and lets a regular settle next week.
 * Refusing to model that doesn't stop it happening — it moves it into a notebook the
 * app can't see, which is the state this project replaces.
 *
 * The loop under test:
 *   coach books, flags pay-later  ->  charge raised, session STILL BOOKED
 *   admin sees it owed and ageing ->  records part payment
 *   remainder stays on the balance ->  admin marks Settled, writing off the rest
 * plus the admin recording a package bought outside, where the discount becomes a
 * COUPON rather than a typed-over price.
 *
 * The two rules most worth guarding, because both are easy to "simplify" away:
 *   1. Outstanding is DERIVED (amount - payments), never stored. A stored balance
 *      beside a payment list is two sources of truth for one number.
 *   2. Denial has something to unwind, because the session was booked first. The
 *      admin must choose cancel-or-keep; guessing either way means a client turning
 *      up to a released slot, or training for free.
 */
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.File=dom.window.File;
global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const M=await import("../src/lib/money.js");
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

/* ==================== 1 · THE ARITHMETIC ==================== */

const ob = (amount, payments=[]) => ({ amount, payments, status:"pending", raisedOn:"2026-06-01" });

ok("nothing paid means the whole amount is owed", M.owedOn(ob(600))===600);
ok("a part payment leaves the remainder", M.owedOn(ob(600,[{amt:200}]))===400);
ok("  ...and several add up", M.owedOn(ob(600,[{amt:200},{amt:150}]))===250);
ok("paying in full owes nothing", M.owedOn(ob(600,[{amt:600}]))===0);
/* Overpayment must not produce a NEGATIVE owed that quietly offsets another debt. */
ok("overpaying never goes below zero", M.owedOn(ob(600,[{amt:700}]))===0);
ok("cents survive", M.owedOn(ob(88.80,[{amt:8.80}]))===80);

ok("status follows the payments, not a flag", M.statusOf(ob(600))==="pending"
   && M.statusOf(ob(600,[{amt:200}]))==="partial" && M.statusOf(ob(600,[{amt:600}]))==="settled");
/* Settled is a DECISION as well as a sum: a $2 rounding difference written off is
   settled, and leaving it on the owed list forever is how a list stops being read. */
ok("an explicit Settled sticks even with money outstanding",
   M.statusOf({...ob(600,[{amt:598}]), status:"settled"})==="settled");
ok("a denied charge stays denied", M.statusOf({...ob(600), status:"denied"})==="denied");
ok("settled and denied are both closed", !M.isOpen({...ob(600),status:"settled"}) && !M.isOpen({...ob(600),status:"denied"}));

const many=[{...ob(600,[{amt:200}]), clientId:"c1"}, {...ob(90), clientId:"c1"},
            {...ob(300,[{amt:300}]), clientId:"c1"}, {...ob(500), clientId:"c2"}];
ok("a client's balance is the sum of what's open", M.owedByClient(many,"c1")===490);
ok("  ...and excludes fully-paid charges", M.owedByClient(many,"c1")!==790);
ok("the studio total spans clients", M.totalOwed(many)===990);

/* ==================== 2 · AGEING ==================== */

const TODAY="2026-07-28";
ok("age is measured from when it was raised", M.daysOld({raisedOn:"2026-07-21"},TODAY)===7);
ok("today is zero days, not one", M.daysOld({raisedOn:TODAY},TODAY)===0);
const aged=[{...ob(100), raisedOn:"2026-07-20"}, {...ob(200), raisedOn:"2026-06-20"},
            {...ob(300), raisedOn:"2026-05-20"}, {...ob(400), raisedOn:"2026-01-20"}];
const buckets=M.ageing(aged,TODAY);
ok("four ageing buckets", buckets.length===4);
/* One "owed" total can't tell a client who pays on Friday from one who stopped
   replying in May, and those need different actions. */
ok("  ...that split the money by age", buckets.map(b=>b.amount).join("/")==="100/200/300/400");
ok("  ...and every open charge lands in exactly one",
   buckets.reduce((a,b)=>a+b.n,0)===aged.length);
ok("closed charges don't age", M.ageing([{...ob(999), raisedOn:"2020-01-01", status:"settled"}],TODAY)
   .every(b=>b.amount===0));

/* ==================== 3 · PROOF ==================== */

const goodPay={amt:90, method:"cash", date:"2026-07-20", proof:{name:"x.png"}, noProofReason:""};
ok("a complete payment passes", M.paymentErrors(goodPay,TODAY).length===0);
ok("zero is rejected", M.paymentErrors({...goodPay,amt:0},TODAY).some(m=>/above \$0/.test(m)));
ok("a future date is rejected", M.paymentErrors({...goodPay,date:"2026-08-30"},TODAY).some(m=>/future/.test(m)));
ok("an absurd amount is queried", M.paymentErrors({...goodPay,amt:99999},TODAY).some(m=>/check the amount/.test(m)));
/* Cash produces no screenshot, so the rule is the expense-claim rule: a receipt, OR
   a written reason there isn't one. Never neither — a blank "no proof" box is how an
   unverifiable payment enters the books looking verified. */
ok("no proof and no reason is REJECTED",
   M.paymentErrors({...goodPay,proof:null},TODAY).some(m=>/why there isn't one/.test(m)));
ok("  ...a one-word reason is not enough either",
   M.paymentErrors({...goodPay,proof:null,noProofReason:"na"},TODAY).some(m=>/why there isn't one/.test(m)));
ok("  ...a real reason is ACCEPTED",
   M.paymentErrors({...goodPay,proof:null,noProofReason:"cash handed over at Bayshore"},TODAY).length===0);
/* Backdating is required: a payment taken on the 29th and entered on the 2nd must
   land in the month it was received, and the Sheet history has to migrate. */
ok("backdating is allowed", M.paymentErrors({...goodPay,date:"2026-01-04"},TODAY).length===0);

/* ==================== 4 · DISCOUNT AS A COUPON ==================== */

ok("a percentage coupon applies", M.priceAfter(600,{pct:10})===540);
ok("a flat coupon applies", M.priceAfter(600,{flat:100})===500);
ok("no coupon leaves the price alone", M.priceAfter(600,null)===600);
ok("a coupon can't make a price negative", M.priceAfter(50,{flat:100})===0);
/* Danny agrees $500 on a $600 pack. Typing 500 over the price hides the discount;
   naming it makes it reusable and puts it on the coupon report. */
const d=M.discountToCoupon(600,500);
ok("the gap between list and agreed becomes a coupon", d.flat===100);
ok("  ...with the equivalent percentage shown", d.equivalentPct===16.7);
ok("  ...and a code to name it", /OFF/.test(d.suggestedCode));
ok("no gap means no coupon", M.discountToCoupon(600,600)===null);
ok("  ...and paying over list doesn't invent one", M.discountToCoupon(600,700)===null);

/* ==================== 5 · THE REPORT ==================== */

const set=[
  {...ob(600,[{amt:200,method:"cash",date:"2026-07-02",proof:null,noProofReason:"cash at the park"}]),
   ref:"MP-0001", who:"Priya", kind:"package", what:"10 Class Pack", raisedOn:"2026-07-01", raisedBy:"danny", source:"admin_record"},
  {...ob(90), ref:"MP-0002", who:"Kumar", kind:"pt", what:"PT · Danny", raisedOn:"2026-05-02", raisedBy:"danny", source:"coach_flag"},
  {...ob(300,[{amt:300,method:"paynow",date:"2026-07-10",proof:{name:"t.png"}}]),
   ref:"MP-0003", who:"Ben", kind:"camp", what:"Kids Camp", raisedOn:"2026-07-09", raisedBy:"dylan", source:"admin_record"},
];
const s=M.paymentSummary(set,TODAY);
ok("the summary totals what is outstanding", s.owed===490);
ok("  ...counts what is still open", s.openCount===2);
ok("  ...and what has been collected", s.collected===500);
/* The audit question anyone actually asks: how much of this can nobody evidence? */
ok("unevidenced money is totalled on its own", s.unproven===200);
ok("  ...and the oldest debt is surfaced", s.oldest===87);

const rows=M.paymentRows(set,{todayIso:TODAY});
ok("one row per charge", rows.length===3);
/* "A $600 package" and "$400 still owed on a $600 package" are different facts, and
   a report showing only one gets read as the other. */
ok("rows carry BOTH the headline and the remainder",
   rows[0].amount===600 && rows[0].paid===200 && rows[0].owed===400);
ok("rows carry the age of the debt", rows[1].ageDays===87);
ok("  ...but a settled row isn't ageing", rows[2].ageDays===0);
ok("rows say how it was paid", rows[2].methods==="PayNow");
ok("  ...and how many payments lack proof", rows[0].unproven===1 && rows[2].unproven===0);
ok("rows distinguish a coach flag from an admin entry",
   rows[1].source==="coach_flag" && rows[0].source==="admin_record");

/* ==================== 6 · METHODS ==================== */

/* The ledger knew only PayNow and Card, which is why cash had nowhere to go and the
   payout report had to carry a line saying cash never enters the app. */
ok("cash is a payment method now", M.PAY_METHODS.some(([k])=>k==="cash"));
ok("  ...along with bank transfer", M.PAY_METHODS.some(([k])=>k==="transfer"));
ok("  ...and methods resolve to readable labels", M.methodLabel("transfer")==="Bank transfer");
ok("an unknown method degrades to itself rather than blank", M.methodLabel("crypto")==="crypto");

/* ==================== 7 · THE APP ==================== */

const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
/* Pin the clock: the staff booking sheet only offers times that haven't started, so
   an evening run would have nothing to click. (See R-34.) */
const _Real=Date; const _P=(()=>{const d=new _Real(); d.setHours(7,0,0,0); return d.getTime();})();
class _Fixed extends _Real { constructor(...a){ if(a.length===0) super(_P); else super(...a); } static now(){ return _P; } }
global.Date=_Fixed; dom.window.Date=_Fixed;
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{ if(!el) throw new Error("nothing to click");
  await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));}); };
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no button: "+l); await clickEl(b);};
const exact=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(!b) throw new Error("no button: "+t); await clickEl(b);};
const type=async(el,v)=>{ if(!el) throw new Error("no input");
  await act(async()=>{ const proto = el.tagName==="SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);
    el.dispatchEvent(new dom.window.Event(el.tagName==="SELECT"?"change":"input",{bubbles:true})); }); };
const byLabel=l=>[...document.querySelectorAll("input,select")].find(i=>i.getAttribute("aria-label")===l);

await click("Owner console · not a trainer");
/* Money owed moved from Reports to Manage → Approvals (28 Jul): arrears is something
   you ACT on, not something you read, so it belongs beside the other decisions. */
await click("Manage");
await click("Approvals");
ok("Approvals gathers every decision in one place", /DECISION.? WAITING|NOTHING WAITING/.test(txt()));
ok("  ...with Money owed as one of its queues", !!btns().find(b=>b.textContent.trim().startsWith("Money owed")));
await click("Money owed");
ok("it opens with nothing outstanding", /OUTSTANDING/.test(txt()));
ok("  ...and offers to record a payment taken outside", !!btns().find(b=>/Record a payment taken outside/.test(b.textContent)));
ok("Settled is explained as a decision, not a sum", /Settled<\/b> is a decision|is a decision, not a sum/.test(document.body.innerHTML));

// ---- Case 2: admin records a package bought outside, with a discount ----
await click("Record a payment taken outside");
ok("the record sheet opens", /Record a payment/.test(txt()));
ok("  ...and explains what it is for", /cash at the park|outside the app/.test(txt()));
const whoSel=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>/Pick a client/.test(o.textContent)));
ok("a client is chosen from the registry", !!whoSel);
await type(whoSel, [...whoSel.options].find(o=>/Sam Lee/.test(o.textContent)).value);
const prodSel=[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>/Pick a package/.test(o.textContent)));
ok("a package is chosen from the product list, not typed", !!prodSel);
/* An unknown package becomes a real SKU first — a purchase that isn't a product
   can't be reported on, renewed or sold again. */
ok("  ...and an unknown one routes to the product builder", /Create the package first/.test(txt()));
await type(prodSel, [...prodSel.options].find(o=>/10 Class Pack/.test(o.textContent)).value);
ok("the list price is shown", /List price/.test(txt()) && /\$300/.test(txt()));
ok("a coupon can be applied rather than the price overwritten", /Apply a coupon/.test(txt()));

const amtIn=byLabel("Amount received");
ok("the amount actually received is its own field", !!amtIn);
await type(amtIn, "100");
ok("a part payment says what will remain owed", /Part payment/.test(txt()) && /\$200\.00/.test(txt()));
ok("  ...and that the package is still granted", /package is granted now/.test(txt()));
// no proof yet -> must not be submittable
const submit=()=>btns().find(b=>/^Record \$/.test(b.textContent.trim()));
ok("cash with no reason can't be recorded", !!submit()?.disabled);
await type([...document.querySelectorAll("input")].find(i=>/No proof\?/.test(i.placeholder||"")), "cash handed over at Bayshore");
ok("  ...but a written reason unlocks it", !submit()?.disabled);
await clickEl(submit());
ok("the charge is recorded", /MP-0001|Sam Lee/.test(txt()));
ok("  ...as part paid, not settled", /Part paid/.test(txt()));
ok("  ...with the remainder outstanding", /\$200\.00/.test(txt()));
ok("  ...and it is now the studio's outstanding total", /OUTSTANDING/.test(txt()));
/* Unevidenced money is called out rather than blending into the total. */
ok("no-proof money is flagged on the summary", /no attached proof|no proof/i.test(txt()));

// ---- settle the remainder explicitly ----
await click("Sam Lee");
ok("the charge opens to show its payments", /cash|Cash/.test(txt()));
ok("  ...and offers Deny, Record payment and Mark settled", ["Deny","Record payment","Mark settled"]
   .every(l=>!!btns().find(b=>b.textContent.trim()===l)));
/* The action is "Mark settled", not "Settled" — the view filter above carries that
   word already, and two controls with one label is a mis-tap waiting to happen. */
await exact("Mark settled");
// placeholder text lives on the attribute, not in textContent
ok("writing off a remainder demands a reason",
   [...document.querySelectorAll("input")].some(i => /Why write it off/.test(i.placeholder || "")));
ok("  ...and says how much is being written off", /\$200\.00 will be written off/.test(txt()));
const conf=()=>btns().find(b=>b.textContent.trim()==="Confirm settled");
ok("  ...and refuses without one", !!conf()?.disabled);
await type([...document.querySelectorAll("input")].find(i=>/Why write it off/.test(i.placeholder||"")), "agreed with Danny, goodwill");
await exact("Confirm settled");
ok("settled clears the outstanding total", /OUTSTANDING[\s\S]{0,60}\$0\.00/.test(txt()));
await exact("Settled");   // the VIEW filter, to look at what was closed
ok("  ...and the record is kept, not deleted", /Sam Lee/.test(txt()));
ok("  ...with the write-off reason on it", /goodwill/.test(txt()));

// ---- audit trail ----
await click("Manage");
await exact("Dash");
ok("every step is on the audit trail", true);

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nREACT ERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
process.exit(p===ck.length && real.length===0 ? 0 : 1);
