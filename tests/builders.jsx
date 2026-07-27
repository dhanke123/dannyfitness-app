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
const D=await import("../src/lib/dates.js");
const seed=await import("../src/data/seed.js");
const App=(await import("../src/App.jsx")).default;
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);
const tName=id=>({danny:"Danny",dylan:"Dylan",wei:"Wei"}[id]||id), locName=id=>id;

// ---------- THE BUG: invalid time silently reported NO conflicts ----------
const ctx={ sessions:[{id:"s1",type:"STR",day:2,time:"09:00",loc:"GBB",trainer:"danny",trainers:["danny"],attendees:[]}],
  ptBookings:[], timeOff:[], camps:[], travel:seed.seedTravel };
let f=C.allConflicts({trainers:["danny"],day:2,time:"9am",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("invalid time is now BLOCKED, not silently accepted", C.hasBlocking(f));
ok("  ...and says what's wrong", f[0].message.includes("isn't a valid time"));
f=C.allConflicts({trainers:["danny"],day:2,time:"",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("empty time blocked", C.hasBlocking(f));
f=C.allConflicts({trainers:["danny"],day:2,time:"25:00",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("out-of-range time blocked", C.hasBlocking(f));
ok("isValidTime helper agrees", D.isValidTime("09:00") && !D.isValidTime("9am") && !D.isValidTime("24:00"));

// ---------- date <-> weekday round-trip ----------
const iso=D.isoFor(0,2); const back=D.fromISO(iso);
ok("date round-trips to the same weekday/week", back.day===2 && back.weekOff===0);
ok("toISO uses LOCAL date (no UTC off-by-one)", D.toISO(new Date(2026,7,12))==="2026-08-12");
const nextWk=D.fromISO(D.isoFor(1,2));
ok("next week resolves to weekOff 1", nextWk.weekOff===1 && nextWk.day===2);

// ---------- week-awareness: same weekday, different week, no clash ----------
const wkCtx={...ctx, sessions:[{...ctx.sessions[0], weekOff:0}]};
f=C.allConflicts({trainers:["danny"],day:2,weekOff:0,time:"09:00",durMin:60,loc:"GBB"},wkCtx,tName,locName);
ok("same week same time DOES clash", C.hasBlocking(f));
f=C.allConflicts({trainers:["danny"],day:2,weekOff:3,time:"09:00",durMin:60,loc:"GBB"},wkCtx,tName,locName);
ok("SAME weekday in a DIFFERENT week does not clash", !C.hasBlocking(f));
f=C.allConflicts({trainers:["danny"],day:2,weekOff:3,time:"09:00",durMin:60,loc:"GBB"},ctx,tName,locName);
ok("a recurring seed class (no weekOff) still clashes every week", C.hasBlocking(f));

// ---------- camp blocks: multi-coach recognised ----------
const campCtx={ sessions:[], ptBookings:[], timeOff:[], travel:seed.seedTravel,
  camps:[{id:"c9",name:"Kids Camp",loc:"GBB",startInDays:0,
    days:[{label:"Day 1",sessions:[{activity:"Games",trainers:["dylan","wei"],start:"09:00",hours:2}]}]}] };
const today=(new Date().getDay()+6)%7;
f=C.allConflicts({trainers:["wei"],day:today,time:"09:30",durMin:60,loc:"GBB"},campCtx,tName,locName);
ok("a camp block with TWO coaches blocks the second one too", C.hasBlocking(f));
f=C.allConflicts({trainers:["danny"],day:today,time:"09:30",durMin:60,loc:"GBB"},campCtx,tName,locName);
ok("a coach not on the camp is unaffected", !C.hasBlocking(f));

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
await navClick("Manage"); await click("Settings");
await click("+ New class");
ok("class builder uses a real DATE picker", !!document.querySelector('input[type="date"]'));
ok("class builder uses a native TIME picker", !!document.querySelector('input[type="time"]'));
ok("  ...shows the weekday it resolves to", /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/.test(txt()));
ok("  ...shows the end time", txt().includes("min"));
await click("✕");
await click("+ New camp");
ok("camp builder requires a START DATE", txt().includes("START DATE"));
// the reported bug: no coach option visible on a brand-new camp
ok("NEW camp opens with a coach picker already visible", txt().includes("LEAD COACH"));
ok("  ...defaulting to Danny", (()=>{const b=btns().find(x=>x.textContent.trim()==="Danny");
   return b && b.getAttribute("style")?.includes("rgb(36, 28, 22)");})() || txt().includes("Danny"));
ok("  ...with Day 1 and a block already there", txt().includes("Day 1") && txt().includes("ACTIVITY"));
ok("  ...block shows START and HRS", txt().includes("START") && txt().includes("HRS"));
ok("  ...and the derived end time", txt().includes("Runs 09:00"));
ok("  ...uses a date picker", !!document.querySelector('input[type="date"]'));
ok("  ...explains why the date matters", txt().includes("checked for clashes"));
ok("  ...save blocked with no date", btns().find(b=>b.textContent.trim()==="Save camp").disabled);
console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,2).join("\n"):"No React warnings or errors.");
