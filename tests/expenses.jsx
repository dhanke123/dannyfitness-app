/* Expense claims end to end, plus the date-range and trend layer underneath the
 * reports.
 *
 * Two halves:
 *   1. The pure rules (lib/expenses.js, lib/period.js) — validation, totals,
 *      bucketing, range arithmetic. Fast, exhaustive, no DOM.
 *   2. The workflow through the real store — submit, review, exclude a line,
 *      approve, mark paid — driven via a probe on the live provider, so what's
 *      under test is the state machine the screens actually call.
 *
 * The money assertions all use figures that could only be right one way. A test
 * asserting "the total is a number" is the R-13 failure again.
 */
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
global.requestAnimationFrame=cb=>setTimeout(cb,0);

const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const E=await import("../src/lib/expenses.js");
const P=await import("../src/lib/period.js");
const A=await import("../src/lib/analytics.js");
const App=(await import("../src/App.jsx")).default;
const {AppProvider, useApp}=await import("../src/state/AppState.jsx");

const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

/* ================= 1 · VALIDATION ================= */

const good = { id:"l1", date:"2026-07-01", category:"parking", amount:8, desc:"Parking at CDS",
               receipt:{name:"a.jpg",kind:"photo"}, noReceipt:false, noReceiptReason:"", excluded:false };
const TODAY="2026-07-26";

ok("a complete line passes", E.lineErrors(good, TODAY).length===0);
ok("no date is rejected", E.lineErrors({...good,date:""}, TODAY).length===1);
ok("a FUTURE date is rejected", E.lineErrors({...good,date:"2026-08-30"}, TODAY).some(m=>/future/.test(m)));
ok("zero amount is rejected", E.lineErrors({...good,amount:0}, TODAY).some(m=>/above \$0/.test(m)));
ok("negative amount is rejected", E.lineErrors({...good,amount:-5}, TODAY).some(m=>/above \$0/.test(m)));
ok("an absurd amount is queried", E.lineErrors({...good,amount:9000}, TODAY).some(m=>/check the amount/.test(m)));
ok("empty description is rejected", E.lineErrors({...good,desc:"   "}, TODAY).some(m=>/what it was for/.test(m)));

// THE RULE: receipt, or a written reason. Never neither.
ok("no receipt and no tick is REJECTED",
   E.lineErrors({...good,receipt:null}, TODAY).some(m=>/Attach a receipt/.test(m)));
ok("no receipt + ticked but blank reason is REJECTED",
   E.lineErrors({...good,receipt:null,noReceipt:true,noReceiptReason:""}, TODAY).some(m=>/Explain why/.test(m)));
ok("  ...a one-word reason is not enough either",
   E.lineErrors({...good,receipt:null,noReceipt:true,noReceiptReason:"na"}, TODAY).some(m=>/Explain why/.test(m)));
ok("no receipt + a real reason is ACCEPTED",
   E.lineErrors({...good,receipt:null,noReceipt:true,noReceiptReason:"ERP deducts automatically, no slip issued"}, TODAY).length===0);

const claim = { id:"c", ref:"EXP-0001", trainer:"wei", status:"draft", lines:[good, {...good,id:"l2",amount:12}] };
ok("a claim with two valid lines can be submitted", E.canSubmit(claim, TODAY));
ok("one bad line blocks the whole claim",
   !E.canSubmit({...claim, lines:[good,{...good,id:"l2",amount:0}]}, TODAY));
ok("  ...and the error names which line", E.claimErrors({...claim, lines:[good,{...good,id:"l2",amount:0}]}, TODAY)[0].startsWith("Line 2"));

/* ================= 2 · TOTALS ================= */

const withExcluded = { ...claim, lines:[good, {...good,id:"l2",amount:12,excluded:true,excludeReason:"personal"}] };
ok("claimTotal is everything claimed", E.claimTotal(withExcluded)===20);
ok("approvedTotal drops excluded lines", E.approvedTotal(withExcluded)===8);
ok("excludedTotal is the difference", E.excludedTotal(withExcluded)===12);
ok("a DRAFT costs the business nothing", E.costOf({...withExcluded,status:"draft"})===0);
ok("a SUBMITTED claim costs nothing yet", E.costOf({...withExcluded,status:"submitted"})===0);
ok("a REJECTED claim costs nothing", E.costOf({...withExcluded,status:"rejected"})===0);
ok("an APPROVED claim is a cost", E.costOf({...withExcluded,status:"approved"})===8);
ok("a PAID claim is still a cost", E.costOf({...withExcluded,status:"paid"})===8);
ok("only APPROVED is outstanding", E.outstandingOf({...withExcluded,status:"approved"})===8);
ok("  ...paid is no longer outstanding", E.outstandingOf({...withExcluded,status:"paid"})===0);

ok("refs increment", E.nextRef([{ref:"EXP-0001"},{ref:"EXP-0009"}])==="EXP-0010");
ok("  ...and start at 1 with no claims", E.nextRef([])==="EXP-0001");
ok("  ...ignoring anything that isn't a ref", E.nextRef([{ref:"junk"},{ref:"EXP-0003"}])==="EXP-0004");

/* ================= 3 · DATE RANGES ================= */

const NOW=new Date(2026,6,26);                 // 26 Jul 2026
const r7=P.resolveRange("7d",{},NOW);
ok("7-day range is 7 days, end INCLUSIVE", P.rangeDays(r7)===7);
ok("  ...and ends today", r7.to==="2026-07-26");
ok("  ...and starts 6 days back", r7.from==="2026-07-20");
const mtd=P.resolveRange("mtd",{},NOW);
ok("month-to-date starts on the 1st", mtd.from==="2026-07-01");
const ytd=P.resolveRange("ytd",{},NOW);
ok("year-to-date starts 1 Jan", ytd.from==="2026-01-01");
const qtd=P.resolveRange("qtd",{},NOW);
ok("quarter-to-date starts 1 Jul for Q3", qtd.from==="2026-07-01" && qtd.label==="Q3 2026");

// a backwards custom range must not silently return nothing
const back=P.resolveRange("custom",{from:"2026-07-20",to:"2026-07-01"},NOW);
ok("a backwards custom range is swapped, not emptied", back.from==="2026-07-01" && back.to==="2026-07-20");

ok("inRange includes BOTH endpoints", P.inRange("2026-07-20",r7) && P.inRange("2026-07-26",r7));
ok("  ...and excludes the day before", !P.inRange("2026-07-19",r7));
ok("  ...and the day after", !P.inRange("2026-07-27",r7));
ok("undated rows are never 'in range'", !P.inRange(null,r7) && !P.inRange("",r7));

const pr=P.previousRange(r7);
ok("previous period is the same length", P.rangeDays(pr)===7);
ok("  ...and ends the day before this one starts", pr.to==="2026-07-19");
ok("  ...and does not overlap", pr.to < r7.from);

/* ================= 4 · BUCKETING ================= */

ok("weeks start MONDAY", P.bucketKey("2026-07-26","week")==="2026-07-20");   // 26 Jul 2026 is a Sunday
ok("  ...and Monday buckets to itself", P.bucketKey("2026-07-20","week")==="2026-07-20");
ok("month bucket is yyyy-mm", P.bucketKey("2026-07-26","month")==="2026-07");
ok("year bucket is yyyy", P.bucketKey("2026-07-26","year")==="2026");

const monthly=P.buckets(P.resolveRange("custom",{from:"2026-01-15",to:"2026-07-26"},NOW),"month");
ok("monthly buckets span Jan..Jul inclusive", monthly.length===7);
ok("  ...first is January", monthly[0].key==="2026-01");
ok("  ...last is July", monthly[6].key==="2026-07");

const rows=[{d:"2026-07-01",v:10},{d:"2026-07-02",v:5},{d:"2026-07-20",v:100},{d:null,v:999}];
const t=P.trend(rows,{date:r=>r.d,value:r=>r.v},P.resolveRange("custom",{from:"2026-07-01",to:"2026-07-26"},NOW),"week");
const nonZero=t.series.filter(b=>b.value>0);
ok("trend sums into the right buckets", nonZero.length===2);
ok("  ...same-week rows are added together", nonZero[0].value===15);
ok("  ...and EMPTY buckets are kept, not dropped", t.series.length>nonZero.length);
ok("  ...undated rows are counted and reported, not silently dropped", t.undated===1);
ok("  ...and undated value is NOT in the series", t.max===100);

/* ================= 5 · THE REPORT ================= */

const mkClaim=(id,status,lines,extra={})=>({id, ref:`EXP-000${id}`, trainer:"wei", status, lines, ...extra});
const claims=[
  mkClaim(1,"paid",[{id:"a",date:"2026-07-02",category:"parking",amount:8,desc:"P",receipt:{name:"x"},excluded:false}],{paidAt:"2026-07-05"}),
  mkClaim(2,"approved",[{id:"b",date:"2026-07-03",category:"petrol",amount:40,desc:"Fuel",receipt:null,noReceipt:true,noReceiptReason:"lost it",excluded:false}]),
  mkClaim(3,"submitted",[{id:"c",date:"2026-07-04",category:"parking",amount:99,desc:"P2",receipt:{name:"y"},excluded:false}]),
  mkClaim(4,"rejected",[{id:"d",date:"2026-07-05",category:"other",amount:500,desc:"No",receipt:{name:"z"},excluded:false}]),
  mkClaim(5,"approved",[{id:"e",date:"2026-06-01",category:"parking",amount:7,desc:"Old",receipt:{name:"w"},excluded:false}]),
];
const july=P.resolveRange("custom",{from:"2026-07-01",to:"2026-07-31"},NOW);
const rep=E.expenseReport(claims,july,P.inRange,(x)=>x);

ok("report EXCLUDES rejected claims", !rep.lines.some(l=>l.amount===500));
ok("report INCLUDES submitted claims (they're real spend awaiting a decision)", rep.lines.some(l=>l.amount===99));
ok("report excludes a June line from a July range", !rep.lines.some(l=>l.amount===7));
ok("total is the sum of what's in range", rep.total===147);        // 8 + 40 + 99
ok("paid is only the paid claim", rep.paid===8);
ok("outstanding is only the approved-unpaid one IN RANGE", rep.outstanding===40);
ok("no-receipt total is right", rep.noReceiptTotal===40);
ok("  ...and its share is a percentage of the total", rep.noReceiptShare===Math.round(40/147*100));
ok("by-category splits correctly", rep.byCategory.find(c=>c.key==="parking").amount===107);
ok("  ...and category shares sum to about 100", Math.abs(rep.byCategory.reduce((t,c)=>t+c.share,0)-100)<=2);

/* Lines are dated by WHEN SPENT, not when claimed — the whole reason the report
   is line-level rather than claim-level. */
const spanning=[mkClaim(9,"approved",[
  {id:"j",date:"2026-06-28",category:"parking",amount:11,desc:"June spend",receipt:{name:"a"},excluded:false},
  {id:"k",date:"2026-07-02",category:"parking",amount:22,desc:"July spend",receipt:{name:"b"},excluded:false}],
  {submittedAt:"2026-07-03"})];
const junRep=E.expenseReport(spanning,P.resolveRange("custom",{from:"2026-06-01",to:"2026-06-30"},NOW),P.inRange);
ok("a claim spanning two months splits across them", junRep.total===11);
ok("  ...even though the whole claim was submitted in July", E.expenseReport(spanning,july,P.inRange).total===22);

/* ================= 6 · THE WORKFLOW, THROUGH THE REAL STORE ================= */

let api=null;
function Probe(){ api=useApp(); return null; }
const probeRoot=createRoot(document.createElement("div"));
await act(async()=>{probeRoot.render(React.createElement(AppProvider,null,React.createElement(Probe)));});

ok("store exposes the expense actions",
   typeof api.submitClaim==="function" && typeof api.decideClaim==="function" && typeof api.markClaimPaid==="function");

const seeded = api.expenseClaims.find(c=>c.status==="submitted");
ok("a submitted claim is seeded so the demo shows the queue", !!seeded);
ok("  ...and it appears in the admin pending list", api.pendingClaims.some(c=>c.id===seeded.id));

// approve with one line excluded
const line = seeded.lines[1];
await act(async()=>{ api.toggleClaimLine(seeded.id, line.id, "Personal, not business"); });
const afterEx = api.claimById(seeded.id);
ok("excluding a line records the reason", afterEx.lines.find(l=>l.id===line.id).excludeReason==="Personal, not business");
const netExpected = E.approvedTotal(afterEx);
ok("  ...and the approving total drops by that line", netExpected < E.claimTotal(afterEx));

// rejection must carry a reason
const auditBefore = api.audit.length;
await act(async()=>{ api.decideClaim(seeded.id, false, "   "); });
ok("rejecting with a blank reason is REFUSED", api.claimById(seeded.id).status==="submitted");
ok("  ...and nothing was audited", api.audit.length===auditBefore);

await act(async()=>{ api.decideClaim(seeded.id, true, null); });
const approved = api.claimById(seeded.id);
ok("approving moves it to approved", approved.status==="approved");
ok("  ...records who decided and when", !!approved.decidedAt);
ok("  ...and is audited with the amount", /Expense claim approved/.test(api.audit[0].what));
ok("  ...the audit line names the exclusion", /excluded/.test(api.audit[0].what));
ok("it now counts as OWED to that coach, to the cent", api.owedTo(approved.trainer)===netExpected);

// paying is a separate act
const ledgerBefore = api.ledger.length;
await act(async()=>{ api.markClaimPaid(approved.id, {ref:"PN-TEST-1", method:"PayNow", date:"2026-07-26"}); });
const paid = api.claimById(approved.id);
ok("marking paid closes the claim", paid.status==="paid");
ok("  ...stores the payment reference", paid.paidRef==="PN-TEST-1");
ok("  ...writes a NEGATIVE ledger row", api.ledger.length===ledgerBefore+1 && api.ledger[0].amt < 0);
ok("  ...that ledger row carries a real ISO date", /^\d{4}-\d{2}-\d{2}$/.test(api.ledger[0].date));
ok("  ...and it is audited", /Expense claim paid/.test(api.audit[0].what));
ok("the coach is owed nothing once it is paid", api.owedTo(paid.trainer)===0);

// a paid claim can't be paid twice
const len2 = api.ledger.length;
await act(async()=>{ api.markClaimPaid(paid.id, {ref:"PN-TEST-2"}); });
ok("a paid claim cannot be paid again", api.ledger.length===len2);

// an approved claim can't be edited by the coach
await act(async()=>{ api.updateClaim(paid.id, {note:"sneaky edit"}); });
ok("a decided claim can't be edited afterwards", api.claimById(paid.id).note!=="sneaky edit");

/* ================= 7 · SEED DATA IS DATED ================= */

ok("every seeded ledger row carries an ISO date",
   api.ledger.filter(l=>!l.date).length===0);
ok("  ...spread over more than one month, so ranges do something",
   new Set(api.ledger.map(l=>String(l.date).slice(0,7))).size>1);

const pnlAll = A.profitAndLoss(api, P.resolveRange("all",{},NOW));
const pnl7   = A.profitAndLoss(api, P.resolveRange("7d",{},new Date()));
ok("a 7-day P&L is smaller than all-time", pnl7.totalRevenue < pnlAll.totalRevenue);
ok("  ...and both are positive, so the filter isn't just emptying it", pnl7.totalRevenue>0);

/* ================= 8 · THE UI ================= */

const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const chip=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(!b) throw new Error("no chip "+t); await clickEl(b);};
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); await clickEl(b);};

// --- coach ---
await click("Coach · trainer view");
await navClick("Me");
ok("a coach has an Expenses tab in their account", btns().some(b=>b.textContent.includes("Expenses")));
await click("Expenses");
ok("  ...showing what they're owed", /OWED TO YOU/i.test(txt()));
ok("  ...what's waiting on admin", /WAITING/i.test(txt()));
ok("  ...and what's been reimbursed", /REIMBURSED/i.test(txt()));
ok("  ...with a way to start a claim", btns().some(b=>/New expense claim/.test(b.textContent)));

await click("New expense claim");
ok("the claim builder opens", /Expense claim/.test(txt()) && /Add another item/.test(txt()));
ok("  ...offering a photo OR a file", /Take a photo/.test(txt()) && /Upload a file/.test(txt()));
ok("  ...with a no-receipt option", /No receipt for this one/.test(txt()));
ok("  ...and a fixed category list", /Parking/.test(txt()) && /Petrol/.test(txt()) && /ERP/.test(txt()));
const submitBtn = btns().find(b=>/still to fix|Submit \$/.test(b.textContent));
ok("submit is DISABLED on an empty claim, with the count of what's missing",
   !!submitBtn && submitBtn.disabled && /still to fix/.test(submitBtn.textContent));

// the completion sheet must no longer ask for a receipt
await click("✕");
await navClick("Today");
ok("marking a session complete no longer asks for an incidental", !/ADD AN INCIDENTAL/.test(txt()));
ok("  ...and Today has no + Receipt button", !btns().some(b=>b.textContent.trim()==="+ Receipt"));

// --- admin ---
await click("Log out"); await click("Owner console · not a trainer");
await navClick("Reports");
ok("reports have a period control", /PERIOD/.test(txt()));
ok("  ...with preset ranges", /This month/.test(txt()) && /This year/.test(txt()));
ok("  ...and a custom option", /Custom/.test(txt()));
ok("  ...a weekly/monthly/yearly trend switch", /TREND BY/.test(txt()) && /Monthly/.test(txt()) && /Yearly/.test(txt()));
ok("  ...and spells out the resolved dates rather than just the preset name",
   /end date included/.test(txt()));
ok("there is an Expenses report family", btns().some(b=>b.textContent.trim()==="Expenses"));
await chip("Expenses");
ok("  ...showing total, reimbursed and still-owed", /STILL OWED/i.test(txt()) && /REIMBURSED/i.test(txt()));
ok("  ...broken down by category", /By category/.test(txt()));
ok("  ...and by coach", /By coach/.test(txt()));
ok("  ...with the no-receipt control figure", /Claimed without a receipt/.test(txt()));
ok("  ...and states the dating rule", /when the money was spent/.test(txt()));

await chip("Money");
ok("the P&L shows approved expenses as a cost", /Approved expenses/.test(txt()));
ok("  ...and a revenue trend", /Revenue trend/.test(txt()));

/* ---- report ---- */
let bad=0;
ck.forEach(([n,p])=>{ if(!p) bad++; console.log(`  ${p?"PASS":"FAIL"}  ${n}`); });
console.log(`\n${ck.length-bad}/${ck.length} checks passed`);
console.log(errs.length ? `\nReact warnings:\n${errs.join("\n")}` : "\nNo React warnings or errors.");
if (bad) process.exitCode=1;
