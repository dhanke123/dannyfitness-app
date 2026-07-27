import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const C=await import("../src/lib/conflicts.js");
const A=await import("../src/lib/analytics.js");
const seed=await import("../src/data/seed.js");
const App=(await import("../src/App.jsx")).default;
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);
const tName=id=>({danny:"Danny",dylan:"Dylan",wei:"Wei"}[id]||id);
const locName=id=>id;

// ---------- conflict engine ----------
const ctx={ sessions:[{id:"s1",type:"STR",day:2,time:"09:00",loc:"GBB",trainer:"danny",trainers:["danny"],attendees:[]}],
  ptBookings:[{id:"p1",trainer:"dylan",day:2,time:"09:30",loc:"GBB",status:"confirmed"}],
  timeOff:[{trainer:"wei",day:2,allDay:true,active:true}], camps:[], travel:seed.seedTravel };
let f=C.allConflicts({trainers:["danny"],day:2,time:"09:30",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("coach already teaching a class is blocked", C.hasBlocking(f));
f=C.allConflicts({trainers:["dylan"],day:2,time:"09:00",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("coach with overlapping PT is blocked", C.hasBlocking(f));
f=C.allConflicts({trainers:["wei"],day:2,time:"09:00",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("coach on all-day time off is blocked", C.hasBlocking(f));
f=C.allConflicts({trainers:["danny","dylan"],day:2,time:"09:00",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("MULTI-COACH: every assigned coach is checked", f.filter(x=>x.severity==="block").length===2);
f=C.allConflicts({trainers:["danny"],day:2,time:"14:00",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("a genuinely free slot is clear", f.length===0);
f=C.allConflicts({trainers:["danny"],day:2,time:"10:05",durMin:60,loc:"BP"},ctx,tName,locName);
ok("tight travel between venues WARNS but doesn't block",
   f.length>0 && !C.hasBlocking(f) && f[0].message.includes("needs about"));
f=C.allConflicts({trainers:["wei"],day:2,time:"09:00",durMin:60,loc:"GBB"},{...ctx,timeOff:[]},tName,locName);
ok("same venue same time only warns (parallel groups are legitimate)",
   f.length>0 && !C.hasBlocking(f));

// ---------- revenue / payout split ----------
const shared={ id:"sh", type:"STR", day:0, time:"07:00", loc:"GBB", cap:10, done:true,
  trainer:"dylan", trainers:["dylan","wei"],
  attendees:[{name:"A",status:"attended"},{name:"B",status:"attended"}] };
const st={ ledger:[], incidentals:[], trainers:[{id:"dylan",name:"Dylan"},{id:"wei",name:"Wei"}],
  rates:{dylan:{type:"per_class",perClass:40,perPt:45}, wei:{type:"per_class",perClass:40,perPt:45}},
  sessions:[shared], ptBookings:[], credits:{classes:0,ptHead:0,ptCoach:0}, products:seed.seedProducts,
  classPass:null, travel:seed.seedTravel, locations:seed.seedLocations, locName, myWaitlist:[],
  myClassBookings:[], myPT:[], leads:[] };
const cards=A.trainerScorecards(st);
ok("co-coached class pays each HALF, not full", cards[0].payout===20 && cards[1].payout===20);
ok("  ...total cost equals a single-coach class", cards[0].payout+cards[1].payout===40);
ok("attributed revenue also splits", cards[0].revenue===35 && cards[1].revenue===35);
const solo={...shared, trainers:["dylan"], trainer:"dylan"};
const cards2=A.trainerScorecards({...st, sessions:[solo]});
ok("solo class still pays the full rate", cards2[0].payout===40);

// cancelled sessions excluded
const cap1=A.capacity({...st, sessions:[shared]});
const cap2=A.capacity({...st, sessions:[{...shared,status:"cancelled"}]});
ok("cancelled classes excluded from capacity reporting", cap1.byLoc.length===1 && cap2.byLoc.length===0);
const au=A.integrityAudit({...st, sessions:[{...shared, day:0, done:false, status:"cancelled"}]});
ok("cancelled class is NOT flagged as unmarked attendance", !au.findings.some(x=>x.code==="UNMARKED_ATTENDANCE"));

// ---------- UI ----------
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const navClick=async t=>{const b=[...document.querySelectorAll("nav button")].find(x=>x.textContent.trim().startsWith(t)); await clickEl(b);};
await click("Owner console · not a trainer");
await navClick("Manage");
await click("Settings");
ok("Classes live under Settings", txt().includes("the weekly timetable"));
ok("Camps live under Settings too", txt().includes("day-by-day builder"));
ok("Camps removed from the Manage tab row", !btns().some(b=>b.textContent.trim()==="Camps"&&b.closest("main")));
await click("+ New class");
ok("class builder opens", txt().includes("New class"));
ok("  ...offers multi-coach", txt().includes("COACHES"));
ok("  ...blocked until a coach is picked", btns().find(b=>b.textContent.includes("Create class")).disabled);
ok("  ...offers repeat", txt().includes("REPEAT"));
console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,2).join("\n"):"No React warnings or errors.");
