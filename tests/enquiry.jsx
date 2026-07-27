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
const byAria=l=>btns().find(b=>b.getAttribute("aria-label")===l);
const setInput=async(id,v)=>{const el=document.getElementById(id);
  const proto=el.tagName==="TEXTAREA"?dom.window.HTMLTextAreaElement:dom.window.HTMLInputElement;
  await act(async()=>{Object.getOwnPropertyDescriptor(proto.prototype,"value").set.call(el,v);
    el.dispatchEvent(new dom.window.Event("input",{bubbles:true}));});};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

// ---- PRE-LOGIN ----
ok("enquiry icon present on the login screen, before any login", !!byAria("Send an enquiry"));
ok("social links still there", ["Instagram","Facebook","WhatsApp","Email"].every(l=>
   [...document.querySelectorAll("a")].some(a=>a.getAttribute("aria-label")===l)));
await clickEl(byAria("Send an enquiry"));
ok("form opens without an account", txt().includes("Send us an enquiry") && txt().includes("No account needed"));
ok("asks for all five fields", ["eq-name","eq-email","eq-phone","eq-query"].every(i=>!!document.getElementById(i))
   && txt().includes("PREFERRED LOCATION"));
const send=()=>btns().find(b=>b.textContent.trim()==="Send enquiry");
ok("send disabled when empty", send().disabled);
await setInput("eq-name","Rachel Ong");
await setInput("eq-query","Do you run NS/IPPT prep?");
ok("still disabled with no way to reply", send().disabled);
ok("  ...and says why", txt().includes("Give us an email or a mobile"));
await setInput("eq-phone","9123 4567");
ok("enabled once contactable", !send().disabled);
await clickEl(send());
ok("confirmation shown IN THE SHEET (no app shell pre-login)", txt().includes("Enquiry sent"));
ok("  ...greets them by first name", txt().includes("Thanks Rachel"));
ok("  ...names the reply channel", txt().includes("on WhatsApp"));
ok("  ...form fields gone", !txt().includes("HOW CAN WE HELP?"));
await click("Done");
ok("Done closes the sheet", !txt().includes("Enquiry sent"));

// ---- ADMIN SEES IT ----
await click("Owner console · not a trainer");
await click("Manage");
const people=btns().find(b=>b.textContent.trim()==="People"); await clickEl(people);
ok("enquiry reached the admin leads queue", txt().includes("Rachel Ong"));
ok("  ...with their question", txt().includes("Do you run NS/IPPT prep?"));
ok("  ...tagged as Enquiry form", txt().includes("Enquiry form"));
ok("  ...with their number for one-tap WhatsApp", txt().includes("91234567"));
ok("  ...status starts at new", txt().includes("new"));

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
