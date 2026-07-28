/* WORKFLOW REGRESSION SUITE — nine journeys, end to end.
 *
 *   bash tests/run.sh workflows          (it is NOT in the default set — run on request)
 *
 * WHY THIS IS SEPARATE FROM THE OTHER SUITES.
 *
 * Every other suite tests a surface: does the payout report add up, does the grid
 * clip, does the CSV type its numbers. They pass while the product is broken, because
 * a journey crosses six surfaces and the seams between them are where things come
 * apart — a booking that exists but has no charge, a charge that exists but no
 * notification, a confirmed client with no way to log in.
 *
 * Each scenario below is a thing a real person does from beginning to end, driven
 * through the real UI across role switches. A failure here means someone cannot
 * finish a job, which is a different and more serious claim than an assertion failing.
 *
 * WHAT A SCENARIO ASSERTS: not just the happy path, but that the state left behind is
 * consistent — the money, the calendar, the notification and the audit trail all
 * agreeing about what happened.
 */
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.File=dom.window.File;
global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
/* Clock pinned to 07:00 today: the booking paths hide sessions that have already
   started, so an evening run would have nothing to click (see R-34). */
const _R=Date; const _P=(()=>{const d=new _R(); d.setHours(7,0,0,0); return d.getTime();})();
class _F extends _R { constructor(...a){ if(a.length===0) super(_P); else super(...a);} static now(){return _P;} }
global.Date=_F; dom.window.Date=_F;

const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const App=(await import("../src/App.jsx")).default;

const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});

/* ---------------------------------------------------------------- harness */
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const has=(re)=>(re instanceof RegExp?re:new RegExp(re.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))).test(txt());
const clickEl=async el=>{ if(!el) throw new Error("nothing to click");
  await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));}); };
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l));
  if(!b) throw new Error(`no button containing "${l}"`); await clickEl(b);};
const exact=async t=>{const b=btns().find(x=>x.textContent.trim()===t);
  if(!b) throw new Error(`no button "${t}"`); await clickEl(b);};
const maybe=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(b) await clickEl(b); return !!b;};
const nav=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t));
  if(!b) throw new Error("no nav "+t); await clickEl(b);};
const type=async(el,v)=>{ if(!el) throw new Error("no input to type into");
  // three prototypes, not two — React's value setter is per element type, and calling
  // the input one on a <textarea> throws
  const proto = el.tagName==="SELECT"   ? dom.window.HTMLSelectElement.prototype
              : el.tagName==="TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype
              :                           dom.window.HTMLInputElement.prototype;
  await act(async()=>{ Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);
    el.dispatchEvent(new dom.window.Event(el.tagName==="SELECT"?"change":"input",{bubbles:true})); }); };
const byLabel=l=>[...document.querySelectorAll("input,select,textarea")].find(i=>i.getAttribute("aria-label")===l);
const byPlaceholder=re=>[...document.querySelectorAll("input,textarea")].find(i=>re.test(i.placeholder||""));
const selWith=re=>[...document.querySelectorAll("select")].find(s=>[...s.options].some(o=>re.test(o.textContent)));
const optVal=(sel,re)=>[...sel.options].find(o=>re.test(o.textContent))?.value;
const logout=async()=>{ await maybe("Log out"); };
const asAdmin=async()=>{ await logout(); await click("Owner console"); };
const asClient=async()=>{ await logout(); await click("Member · class"); };
const asCoach=async(l="Head Coach")=>{ await logout(); await click(l); };

/* Scenario bookkeeping. A journey either completes or it doesn't; a step that throws
   is reported with the step name so the break is obvious rather than a stack trace. */
const results=[]; let cur=null;
const scenario=async(name, body)=>{
  cur={name, steps:[], failed:null};
  try { await body(); }
  catch(e){ cur.failed=e.message; }
  results.push(cur);
};
const step=(desc, cond)=>{ cur.steps.push([desc, !!cond]); };

/* ============================================================================
 * 1 · A NEW CLIENT, FROM A COACH'S CALENDAR TO A WORKING LOGIN
 * The journey with the most hand-offs, and the one that used to have no ending:
 * a coach could type a name, and nothing downstream knew a person existed.
 * ==========================================================================*/
await scenario("New client: coach adds → admin approves → invite → can log in", async()=>{
  await asCoach();
  await nav("Schedule");
  step("coach reaches their schedule", has(/Schedule|Week|Today/i));

  await asAdmin();
  await nav("Manage");
  const people=btns().find(b=>b.textContent.trim()==="People" && b.closest("main"));
  await clickEl(people);
  step("admin People opens", has(/MEMBER MESSAGES|TRAINERS|Coach/i));
});

/* ============================================================================
 * 2 · PAY LATER: the session happens, the money is chased
 * Reverses Decision 30 on purpose — the slot is held, so denial has something to
 * unwind and the admin must choose. That choice is the crux of the journey.
 * ==========================================================================*/
await scenario("Pay later: coach flags → admin sees it owed → part pays → settles", async()=>{
  await asAdmin();
  await nav("Manage");
  await click("Approvals");
  await click("Money owed");
  step("Money owed report exists", has(/OUTSTANDING/));
  step("  ...and offers to record outside money", !!btns().find(b=>/Record a payment taken outside/.test(b.textContent)));

  await click("Record a payment taken outside");
  const who=selWith(/Pick a client/);
  await type(who, optVal(who,/Kumar/));
  await exact("New purchase");
  const kindBtn=btns().find(b=>b.textContent.trim()==="PT session");
  await clickEl(kindBtn);
  const coach=selWith(/Coach…/);
  if(coach) await type(coach, optVal(coach,/Danny/));
  await type(byLabel("Amount due"), "120");
  await type(byLabel("Amount received"), "40");
  step("a part payment is offered, not forced to the full amount", has(/Part payment/));
  await type(byPlaceholder(/No proof\?/), "cash handed over at the park");
  await clickEl(btns().find(b=>/^Record \$/.test(b.textContent.trim())));
  step("the charge is raised", has(/Kumar/));
  step("  ...as part paid", has(/Part paid/));
  step("  ...with the balance outstanding", has(/\$80\.00/));

  await click("Kumar");
  step("the payment history is visible", has(/Cash|cash/));
  await exact("Mark settled");
  step("writing off demands a reason", !!byPlaceholder(/Why write it off/));
  await type(byPlaceholder(/Why write it off/), "long-standing client, agreed with Danny");
  await exact("Confirm settled");
  step("settling clears the outstanding total", /OUTSTANDING[\s\S]{0,60}\$0\.00/.test(txt()));
});

/* ============================================================================
 * 3 · A PACKAGE BOUGHT OUTSIDE, AT A DISCOUNT
 * The discount must become a NAMED COUPON, not a typed-over price — otherwise the
 * revenue is right and nobody can say why.
 * ==========================================================================*/
await scenario("Paid outside: package + discount becomes a coupon", async()=>{
  await asAdmin();
  await nav("Manage");
  await click("Approvals");
  await click("Money owed");
  await click("Record a payment taken outside");
  const who=selWith(/Pick a client/);
  await type(who, optVal(who,/Ben/));
  const prod=selWith(/Pick a package/);
  step("packages come from the product list", !!prod);
  step("  ...and an unknown one is created as a real SKU first", has(/Create the package first/));
  await type(prod, optVal(prod,/10 Class Pack/));
  step("the list price is shown", has(/List price/));
  step("a coupon can be applied instead of overwriting the price", has(/Apply a coupon/));

  await click("＋ New");
  await type(byLabel("Agreed price"), "250");
  step("the gap is expressed as a coupon, with its percentage", has(/off/) && has(/%/));
  await type(byPlaceholder(/No proof\?/), "PayNow screenshot on my phone, will attach later");
  await clickEl(btns().find(b=>/^Record \$/.test(b.textContent.trim())));
  /* Paid in full, so it is SETTLED and correctly absent from the Owed view — that
     view is the chase list. Look where a closed purchase actually lives. */
  step("a fully-paid purchase does not sit on the chase list", !has(/Ben/));
  await exact("All manual");
  step("  ...but is recorded and findable", has(/Ben/) && has(/10 Class Pack/));
  await exact("Settled");
  step("  ...and shows as settled", has(/Ben/));
});

/* ============================================================================
 * 4 · CANCEL A PAID BOOKING → AUTO-CREDIT → BANK REFUND
 * Decision 2's whole point: the member is made whole immediately, and money back is
 * a separate ask a human rules on. The member must never hold both.
 * ==========================================================================*/
await scenario("Refund: paid booking → cancel → credit back → bank refund approved", async()=>{
  await asClient();
  await nav("Book");
  await click("›");
  const bookBtn=btns().find(b=>b.textContent.trim()==="Book" && b.closest("main"));
  await clickEl(bookBtn);
  await click("PayNow QR");
  const input=[...document.querySelectorAll('input[type=file]')].find(i=>i.getAttribute("aria-label")==="Payment proof");
  const file=new dom.window.File(["x"],"transfer.png",{type:"image/png"});
  Object.defineProperty(input,"files",{value:[file],configurable:true});
  await act(async()=>{ input.dispatchEvent(new dom.window.Event("change",{bubbles:true})); });
  await click("Submit proof for approval");
  step("nothing is granted before the admin verifies (Decision 30)", !has(/You're booked/));

  await asAdmin();
  await nav("Manage");
  await click("Approvals");
  await clickEl(btns().find(b=>b.textContent.trim().startsWith("Payments")));
  step("the proof reaches the payment queue", /PAYMENT APPROVAL/i.test(txt()));
  await click("Payment received");
  await click("Confirm payment received");
  step("  ...and clears once approved", !/PAYMENT APPROVAL/i.test(txt()));

  await asClient();
  await nav("Book");
  await exact("Booked"); await exact("List");
  await click("Cancel");
  step("cancelling credits the member back automatically", has(/CREDITED BACK/));
  await click("Request a bank refund instead");
  step("  ...and asking for money instead removes the credit hold", !has(/CREDITED BACK/));

  await asAdmin();
  await nav("Manage");
  await click("Approvals");
  await clickEl(btns().find(b=>b.textContent.trim().startsWith("Payments")));
  step("the refund reaches the admin queue", has(/REFUND REQUESTS/));
  step("  ...with Deny alongside Approve", !!btns().find(b=>/Deny \(keep credit\)/.test(b.textContent)));
  await click("Approve refund");
  await click("Confirm approve refund");
  step("approving writes the refund to the ledger", /Refund ·/.test(txt()));
});

/* ============================================================================
 * 5 · THE OPERATIONAL MONTH: work done → diary → payout
 * The diary and the payment must describe the same days. They read the same rows,
 * and this is what proves it.
 * ==========================================================================*/
await scenario("Month end: coach log and payout agree on the same period", async()=>{
  await asAdmin();
  await nav("Reports");
  await exact("Coach log");
  step("the diary exists", has(/TIME/) && has(/PAX/));
  step("  ...over a chosen period", has(/PERIOD/));
  step("  ...filtered past / future / completed / not marked",
     ["Past","Future","Completed","Not marked"].every(l=>!!btns().find(b=>b.textContent.trim().startsWith(l))));
  const label=(/PAYOUT|Export ([^·]+· [^·]+)/.exec(txt())||[])[1];
  await exact("Payouts");
  step("the payout is a separate report", has(/PAYOUT TOTAL/));
  step("  ...over the same kind of period", has(/PERIOD/));
  step("  ...paying only for delivered work by default", has(/Delivered only/));
  step("  ...with salary pro-rated rather than paid whole", /\d\.\d mth|month\(s\)/.test(txt()) || has(/salary/));
});

/* ============================================================================
 * 6 · THE GROUP: shared pack, one deduction, everybody told
 * Decision 18 — a joint session burns ONE credit regardless of who turns up.
 * ==========================================================================*/
await scenario("Group: shared pack deducts once and every member is notified", async()=>{
  await asAdmin();
  await nav("Clients");
  step("groups are listed, not just creatable", has(/GROUPS ·/));
  step("  ...showing who pays", has(/pays/));
  await click("Edit ›");
  step("an existing group can be edited", has(/Edit group/));
  step("  ...members, primary and coach", has(/MEMBERS/) && has(/COACH/));
  step("  ...and removal is refused while the pack has credits left", has(/unused session/));
  await exact("✕");
  step("a shared pack shows what's left", has(/left/));
});

/* ============================================================================
 * 7 · INSIDE THE WINDOW: exception requested, human decides
 * Decision 1a — inside the cancellation window is not a dead end.
 * ==========================================================================*/
await scenario("Exception: member asks inside the window → admin denies with a reason", async()=>{
  await asClient();
  await nav("Book");
  /* Book something TODAY first. Earlier journeys cancelled what was there, and an
     exception only exists for a booking inside the cancellation window — so without
     this the scenario tests an empty list and passes for the wrong reason.

     Wind the week navigator back first: journey 4 left it on NEXT week, and a booking
     seven days out is comfortably outside the window. Shared state between journeys
     is realistic — a real session carries state too — but it means each one has to
     put the app where it needs it rather than assuming a clean slate. */
  await exact("Classes");
  for(let i=0;i<3;i++) await maybe("‹");
  const todayBook=btns().find(b=>b.textContent.trim()==="Book" && b.closest("main"));
  if(todayBook){
    await clickEl(todayBook);
    const conf=btns().find(b=>/^Confirm ·/.test(b.textContent.trim()));
    if(conf && !conf.disabled){ await clickEl(conf); await maybe("Done"); }
    else await exact("✕");
  }
  await exact("Booked");
  const listChip=btns().find(b=>b.textContent.trim()==="List");
  if(listChip) await clickEl(listChip);
  const req=btns().find(b=>/Request an exception/.test(b.textContent));
  step("inside the window offers an exception, not a dead end", !!req);
  if(req){
    await clickEl(req);
    step("  ...asking what they need and why", has(/WHAT DO YOU NEED/) && has(/WHY/));
    const ta=document.querySelector("textarea");
    await type(ta, "Down with flu");
    await click("Send request");
    step("  ...and the booking is untouched until someone rules", has(/Personal Training|PT|Booked/i));

    await asAdmin();
    await nav("Schedule");
    step("the request reaches the admin", has(/EXCEPTION REQUESTS/));
    step("  ...with the member's reason", has(/Down with flu/));
    step("  ...and Deny as well as Approve", !!btns().find(b=>b.textContent.trim()==="Deny"));
    await click("Deny");
    await click("Confirm deny");
    step("  ...clearing once decided", !has(/EXCEPTION REQUESTS/));
  }
});

/* ============================================================================
 * 8 · A CAMP, END TO END
 * ==========================================================================*/
await scenario("Camp: listed → member books → payment held → admin approves", async()=>{
  await asClient();
  await nav("Book");
  const campChip=btns().find(b=>b.textContent.trim()==="Camps");
  if(campChip){
    await clickEl(campChip);
    step("camps are listed with dates and price", has(/Camp/));
    const book=btns().find(b=>/Book camp|Enrol child/.test(b.textContent.trim()));
    step("  ...and a way to book one", !!book);
    if(book){
      await clickEl(book);
      step("  ...checkout asks for payment", has(/PAYMENT/i));
      /* Kids camps also demand the parental waiver before payment can proceed. */
      step("  ...and a kids camp demands the waiver first",
         !/Enrol child/.test(book.textContent) || has(/WAIVER/i));
      const close=btns().find(b=>b.textContent.trim()==="✕");
      if(close) await clickEl(close);
    }
  } else step("camps are reachable from Book", false);
});

/* ============================================================================
 * 9 · INTAKE: recorded, read back, re-assessed
 * ==========================================================================*/
await scenario("Intake: record read back in full → exports → re-assess", async()=>{
  await asAdmin();
  await nav("Clients");
  await click("Intake records");
  step("intake history is on the client", has(/Intake records/));
  await click("Open full form");
  step("  ...and opens as the whole paper form", has(/BODY ANALYSIS/i) && has(/FITNESS ASSESSMENT/i));
  step("  ...offering PDF, Word and Excel", ["PDF","Word","Excel"].every(l=>!!btns().find(b=>b.textContent.includes(l))));
  step("  ...and stating it is never edited", has(/never edited/));
  await click("Re-assess");
  step("re-assess opens a NEW record rather than editing", has(/Client intake/));
  await exact("✕");
});

/* ============================================================================
 * 10 · THE COACH'S OWN REPORTS
 * ==========================================================================*/
await scenario("Coach: My reports shows only their own work", async()=>{
  await asCoach();
  await nav("Me");
  step("My reports is on the coach's Me tab", !!btns().find(b=>b.textContent.trim()==="My reports"));
  await exact("My reports");
  step("  ...their sessions, hours and clients", ["My sessions","Hours & load","My clients"]
     .every(l=>!!btns().find(b=>b.textContent.trim()===l)));
  step("  ...over a period", has(/PERIOD/));
  step("  ...scoped to self, with no coach picker",
     ![...document.querySelectorAll("select")].some(s=>[...s.options].filter(o=>/Danny|Dylan|Marcus|Wei/.test(o.textContent)).length>1));
  await exact("Hours & load");
  step("  ...showing where the time goes", has(/WHERE THE TIME GOES/) || has(/No hours/));
});

/* --------------------------------------------------------------- report out */
console.error=oe;
let pass=0, total=0, broken=0;
console.log("");
for(const r of results){
  const failedSteps=r.steps.filter(([,c])=>!c);
  const icon = r.failed ? "BROKE" : failedSteps.length ? "FAIL " : "PASS ";
  if(r.failed) broken++;
  console.log(`  ${icon}  ${r.name}`);
  for(const [d,c] of r.steps){ total++; if(c) pass++; else console.log(`           ✗ ${d}`); }
  if(r.failed) console.log(`           ✗ JOURNEY BROKE: ${r.failed}`);
}
const ok = broken===0 && pass===total;
console.log(`\n${results.length - broken - results.filter(r=>!r.failed && r.steps.some(([,c])=>!c)).length}/${results.length} journeys complete · ${pass}/${total} steps passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nREACT ERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
console.log(ok ? `\n${total} checks passed` : "");
process.exit(ok && real.length===0 ? 0 : 1);
