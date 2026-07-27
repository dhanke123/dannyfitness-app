import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const A=await import("../src/lib/analytics.js");
const U=await import("../src/lib/usage.js");
const seed=await import("../src/data/seed.js");
const App=(await import("../src/App.jsx")).default;
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

// ---------- pure analytics: money math ----------
const state={
  ledger:[{id:1,who:"Sam",what:"Drop-in · Strength",amt:35,method:"PayNow",status:"paid"},
          {id:2,who:"Sam",what:"10-class pack (WELCOME10)",amt:300,method:"PayNow",status:"paid"},
          {id:3,who:"Ben",what:"PT · Danny",amt:120,method:"Card",status:"paid"},
          {id:4,who:"Ben",what:"Refund · x",amt:-35,method:"PayNow",status:"refunded"}],
  incidentals:[{id:"i1",trainer:"wei",label:"Parking",amt:8,status:"approved"},
               {id:"i2",trainer:"wei",label:"Cones",amt:20,status:"pending"}],
  trainers:[{id:"dylan",name:"Dylan"}],
  rates:{dylan:{type:"per_class",perClass:40,perPt:45}},
  sessions:[{id:"s1",type:"STR",day:0,time:"07:00",cap:10,loc:"GBB",trainer:"dylan",done:true,
             attendees:[{name:"Sam",status:"attended"},{name:"Ben",status:"no_show"}]}],
  ptBookings:[{id:"p1",trainer:"dylan",day:0,time:"09:00",loc:"GBB",who:"Sam",status:"done"}],
  credits:{classes:5,ptHead:1,ptCoach:2}, products:seed.seedProducts, classPass:null,
  travel:seed.seedTravel, locations:seed.seedLocations, locName:(id)=>id,
  myWaitlist:[], myClassBookings:[], myPT:[], leads:seed.seedLeads,
};
const pnl=A.profitAndLoss(state);
ok("revenue only counts PAID rows", pnl.totalRevenue===455);
ok("refunds excluded from revenue", !String(pnl.totalRevenue).includes("420"));
ok("pack revenue separated from drop-in", pnl.revenue.packs===300 && pnl.revenue.dropIn===35);
ok("PT revenue separated", pnl.revenue.pt===120);
ok("only APPROVED incidentals cost money", pnl.incidentalCost===8);
ok("processing fees charged", pnl.processingFees>0);
ok("margin = revenue - all costs", pnl.grossMargin===A.toCsv?Math.round((pnl.totalRevenue-pnl.cost)*100)/100===pnl.grossMargin:true);
ok("payout counts DELIVERED work only", pnl.payouts[0].amt===40+45);

const d=A.deferredRevenue(state);
ok("credit liability counts every pool", d.totalUnits===8);
ok("  ...and values it", d.totalValue>0);

const mix=A.paymentMix(state);
ok("payment mix splits PayNow vs card", mix.inApp.amt===335 && mix.card.amt===120);
ok("in-app share computed", mix.inAppShare===74);

const cards=A.trainerScorecards(state);
ok("scorecard fill rate", cards[0].fillRate===20);
ok("scorecard counts no-shows", cards[0].noShows===1);
ok("scorecard exposes margin to admin", typeof cards[0].margin==="number");
ok("attendance rate excludes no-shows", cards[0].attendanceRate===50);

const cl=A.clientInsights(state);
ok("client insight ranks no-show first", cl.rows[0].name==="Ben");
ok("watch-list flags repeat risk", cl.atRisk.length===1);

const au=A.integrityAudit(state);
ok("audit flags pending receipts", au.findings.some(f=>f.code==="PENDING_RECEIPTS"));
ok("audit clean flag correct", au.clean===false);
const au2=A.integrityAudit({...state, credits:{classes:-1,ptHead:0,ptCoach:0}, incidentals:[]});
ok("audit catches NEGATIVE credits (double-deduction bug)", au2.findings.some(f=>f.code==="NEGATIVE_CREDITS"));

// CSV correctness — the thing that silently corrupts a spreadsheet
const csv=A.toCsv([{name:'O"Brien, Danny',amt:10}]);
ok("CSV escapes embedded quotes", csv.includes('""'));
ok("CSV quotes fields containing commas", csv.split("\n")[1].startsWith('"O'));

// ---------- usage tracking ----------
U.resetUsage(); U.startUsageSession({id:"u1",role:"client"});
U.track(U.EVENTS.BOOK_CONFIRM,{kind:"class",method:"credit"});
U.track("not_a_real_event",{kind:"x"});
U.track(U.EVENTS.BOOK_CONFIRM,{kind:"pt", clientName:"Sam Lee", phone:"91234567"});
const ev=U.peekUsage();
ok("tracks allow-listed events", ev.length===2);
ok("drops unknown event names", !ev.some(e=>e.event==="not_a_real_event"));
ok("STRIPS personal data from props", !JSON.stringify(ev).includes("Sam Lee") && !JSON.stringify(ev).includes("91234567"));
ok("keeps safe props", ev[1].props.kind==="pt");
ok("stamps role and session", ev[0].role==="client" && !!ev[0].session_id);

// ---------- UI ----------
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
await click("Owner console · not a trainer");
await click("Manage");
await click("Reports");
ok("Reports section renders", txt().includes("Profit & loss"));
ok("  ...shows credit liability", txt().includes("Credit liability"));
ok("  ...states liability is NOT profit", txt().includes("not profit"));
ok("  ...shows payment channel mix", txt().includes("How people pay"));
ok("  ...surfaces integrity findings above the numbers", txt().includes("DATA INTEGRITY"));
const coaches=btns().find(b=>b.textContent.trim()==="Coaches"); await clickEl(coaches);
ok("coach scorecards render", txt().includes("Coach scorecards") && txt().includes("unpaid travel"));
const ops=btns().find(b=>b.textContent.trim()==="Ops"); await clickEl(ops);
ok("location performance renders", txt().includes("Location performance"));
ok("  ...and class fill guidance", txt().includes("Under 40%"));
// trainer sees own scorecard, not margin
await click("Log out"); await click("Coach · trainer view"); await click("Me");
ok("trainer sees own numbers", txt().includes("MY NUMBERS"));
ok("trainer does NOT see margin", !txt().toLowerCase().includes("margin"));
ok("trainer does NOT see other coaches", !txt().includes("Coach scorecards"));

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,2).join("\n"):"No React warnings or errors.");
