import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.IS_REACT_ACT_ENVIRONMENT=true;
global.fetch=async()=>{throw new Error("network blocked in test");};

const {toE164, looksLikeSgMobile, toAppUser, isConfigured, DEMO_LOGINS}=await import("../src/lib/supabase.js");
const checks=[]; const ok=(n,c)=>checks.push([n,!!c]);

// --- pure helpers: phone normalisation ---
ok("bare 8-digit -> E.164", toE164("91234567")==="+6591234567");
ok("spaced number", toE164("9123 4567")==="+6591234567");
ok("already +65", toE164("+65 9123 4567")==="+6591234567");
ok("65-prefixed no plus", toE164("6591234567")==="+6591234567");
ok("empty -> null", toE164("")===null);
ok("accepts 9xxxxxxx", looksLikeSgMobile("91234567"));
ok("accepts 8xxxxxxx", looksLikeSgMobile("81234567"));
ok("rejects landline 6xxxxxxx", !looksLikeSgMobile("61234567"));
ok("rejects too short", !looksLikeSgMobile("9123456"));
ok("rejects too long", !looksLikeSgMobile("912345678"));
ok("tolerates +65 prefix", looksLikeSgMobile("+65 9123 4567"));

// --- role guard: role must come from the DB and be one of three ---
ok("client role kept", toAppUser({id:"1",role:"client",full_name:"Sam"}).role==="client");
ok("trainer role kept", toAppUser({id:"2",role:"trainer",full_name:"Dylan"}).role==="trainer");
ok("admin role kept", toAppUser({id:"3",role:"admin",full_name:"Admin"}).role==="admin");
ok("UNKNOWN role falls back to client (never staff)", toAppUser({id:"4",role:"superuser",full_name:"X"}).role==="client");
ok("null role falls back to client", toAppUser({id:"5",role:null,full_name:"X"}).role==="client");
ok("missing profile -> no user", toAppUser(null)===null);
ok("head coach flag read", toAppUser({id:"6",role:"trainer",is_head_coach:true,full_name:"Danny"}).isHeadCoach===true);

// --- login screen in configured mode ---
ok("isConfigured true with env", isConfigured===true);
ok("demo logins OFF when VITE_DEMO_LOGINS=false", DEMO_LOGINS===false);

const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client");
const {act}=await import("react");
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
ok("OTP form renders", txt().includes("SIGN IN OR JOIN") && txt().includes("Send me a code"));
ok("demo buttons hidden in prod mode", !txt().includes("CHOOSE A DEMO LOGIN") && !txt().includes("OR USE A DEMO LOGIN"));
ok("pre-login Connect still shown", txt().includes("CONNECT WITH EXERCISEONLY"));
ok("no 'resets on refresh' copy in prod mode", !txt().includes("resets on refresh"));

// bad number is rejected client-side before any SMS is sent
const input=[...document.querySelectorAll("input")].find(i=>i.getAttribute("aria-label")==="Mobile number");
const setV=(el,v)=>{const s=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,"value").set; s.call(el,v); el.dispatchEvent(new dom.window.Event("input",{bubbles:true}));};
await act(async()=>{ setV(input,"61234567"); });
const sendBtn=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Send me a code"));
await act(async()=>{ sendBtn.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
ok("landline rejected without hitting the network", txt().includes("doesn't look like a Singapore mobile"));
ok("still on the phone step", txt().includes("Send me a code"));

console.error=oe;
let pass=0; for(const[n,c] of checks){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)pass++;}
console.log(`\n${pass}/${checks.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
