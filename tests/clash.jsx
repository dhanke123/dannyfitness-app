import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");

/* ---- pin the clock to 07:00 today ----
   These suites book "today", and the client booking paths deliberately hide slots
   and classes that have already started. Run after about 7pm and nothing today is
   bookable, so the very first `Book` button doesn't exist and the suite dies — a
   failure that has nothing to do with the code under test and appears only in the
   evening. The weekday stays whatever it really is, so the seeded timetable behaves
   exactly as it does live; only the hour is fixed.

   Installed BEFORE importing App, because `lib/dates.js` captures TODAY and
   ANCHOR_MON at module load. (That capture is itself a known gap — an installed PWA
   left open overnight keeps yesterday's calendar. See the regression pack.) */
const _RealDate = Date;
const _PINNED = (() => { const d = new _RealDate(); d.setHours(7, 0, 0, 0); return d.getTime(); })();
class _FixedDate extends _RealDate {
  constructor(...a) { if (a.length === 0) super(_PINNED); else super(...a); }
  static now() { return _PINNED; }
}
global.Date = _FixedDate; dom.window.Date = _FixedDate;

const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no btn "+l); await clickEl(b);};
const chip=async t=>{const b=btns().find(x=>x.textContent.trim()===t); await clickEl(b);};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

// Card per coach; read slots grouped by their coach card so we can tell coaches apart.
const coachRows=()=>{
  const main=document.querySelector("main"); if(!main) return [];
  return [...main.querySelectorAll("div")].filter(d=>{
    const hasName=/Danny|Dylan|Marcus|Wei/.test((d.querySelector(".font-semibold")||{}).textContent||"");
    return hasName && [...d.querySelectorAll("button")].some(b=>/^\d\d:\d\d/.test(b.textContent.trim()));
  }).map(d=>({
    coach:(d.querySelector(".font-semibold").textContent||"").replace("★","").trim(),
    slots:[...d.querySelectorAll("button")].filter(b=>/^\d\d:\d\d/.test(b.textContent.trim()))
                                            .map(b=>b.textContent.trim().replace(" ⏱","")),
    el:d,
  }));
};

await click("Member · class + PT credits");
await click("Book"); await chip("PT");
let rows=coachRows();
ok("multiple coaches offering slots", new Set(rows.map(r=>r.coach)).size>=2);
// find a time offered by AT LEAST TWO different coaches — the actual bug scenario
const byTime={};
rows.forEach(r=>r.slots.forEach(t=>{(byTime[t]=byTime[t]||new Set()).add(r.coach);}));
const shared=Object.entries(byTime).filter(([,s])=>s.size>=2).map(([t,s])=>[t,[...s]]);
ok("a time exists that TWO different coaches both offer", shared.length>0);
const [T0, coaches] = shared[0] || [null,[]];
console.log(`  ~ testing ${T0}, offered by: ${coaches.join(", ")}`);

// book it with the first coach
const row0=rows.find(r=>r.coach===coaches[0]);
await clickEl(row0.slots.includes(T0) ? [...row0.el.querySelectorAll("button")].find(b=>b.textContent.trim().replace(" ⏱","")===T0) : null);
await click("Confirm · 1 credit"); await click("Done");
await chip("PT");
rows=coachRows();
const stillOffering=rows.filter(r=>r.slots.includes(T0)).map(r=>r.coach);
ok(`THE BUG: after booking ${T0} with ${coaches[0]}, NO other coach offers ${T0}`,
   stillOffering.length===0);
if(stillOffering.length) console.log("  ~ still offered by:", stillOffering.join(", "));

// and try to book a third overlapping one via a different coach's row
const rows2=coachRows();
const anyOverlap=rows2.flatMap(r=>r.slots.map(t=>[r.coach,t]))
  .filter(([,t])=>{const [h,m]=t.split(":").map(Number); const s=h*60+m;
                   const [H,M]=T0.split(":").map(Number); const S=H*60+M;
                   return s < S+45 && s+45 > S;});
ok("no OVERLAPPING slot is offered by any coach either", anyOverlap.length===0);
if(anyOverlap.length) console.log("  ~ overlapping still offered:", anyOverlap.map(a=>a.join("@")).join(", "));

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
