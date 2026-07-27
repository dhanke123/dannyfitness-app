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
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);
const tile=l=>btns().find(b=>b.textContent.includes(l) && b.closest("main"));

for (const label of ["WORKOUTS/WK","PRS","KCAL/WK"]) {
  await click("Member · class + PT credits");
  const t=tile(label);
  ok(`${label} is a real <button>`, !!t && t.tagName==="BUTTON");
  ok(`${label} has an aria-label`, !!t && !!t.getAttribute("aria-label"));
  ok(`${label} shows a tappable affordance`, !!t && t.textContent.includes("›"));
  await clickEl(t);
  ok(`${label} navigates to the Log tab`, txt().includes("Progress") || txt().includes("Train"));
  // Progress view specifically: the weekly-goal setter only exists there
  ok(`${label} lands on PROGRESS (not Train)`, /WEEKLY GOAL|Weekly goal|Streak|1RM|MUSCLE/i.test(txt()));
  await click("Log out");
}
console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
