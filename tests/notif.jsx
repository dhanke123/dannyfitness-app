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
const bell=()=>btns().find(b=>(b.getAttribute("aria-label")||"").startsWith("Notifications"));
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

// ---------- CLIENT ----------
await click("Member · class + PT credits");
ok("bell in header for client", !!bell());
ok("bell announces unread count", /\d+ unread/.test(bell().getAttribute("aria-label")||""));
await clickEl(bell());
ok("panel opens", txt().includes("Notifications"));
ok("client sees assigned routine", txt().includes("New routine from your coach"));
ok("  ...naming the routine", txt().includes("Leg Day"));
ok("client sees referral credit waiting", txt().includes("Referral credit waiting"));
const before=bell()?null:null;
// tap a notification -> navigates + marks read
const routine=btns().find(b=>b.textContent.includes("New routine from your coach"));
await clickEl(routine);
ok("tapping navigates away from the panel", !txt().includes("Mark all as read"));
ok("  ...lands on the Log tab", txt().includes("Start workout")||txt().includes("Routines")||txt().includes("Train"));
await clickEl(bell());
ok("read item dimmed but still listed", txt().includes("New routine from your coach"));
await click("Mark all as read");
ok("mark-all clears the badge", !/[1-9]/.test((bell().getAttribute("aria-label")||"").replace("Notifications","")));

// ---------- ADMIN ----------
await click("✕");
await click("Log out");
await click("Owner console · not a trainer");
await clickEl(bell());
ok("admin panel explains it's people waiting", txt().includes("someone waiting on you"));
ok("admin sees no-show queue item", txt().includes("No-show waiting on you"));
ok("admin sees expense claim to review", txt().includes("Expense claim to review"));
ok("admin is nagged about approved-but-unpaid expenses", txt().includes("not yet paid"));
ok("admin sees new leads/enquiries", /New enquiry|New lead/.test(txt()));
const ns=btns().find(b=>b.textContent.includes("No-show waiting on you"));
await clickEl(ns);
ok("tapping a no-show goes to Clients", txt().includes("NO-SHOW DECISIONS")||txt().includes("Clients"));

// ---------- ADMIN MANAGE TAB LAYOUT ----------
await click("Manage");
const grid=[...document.querySelectorAll("div")].find(d=>typeof d.className==="string"&&d.className.includes("grid-cols-3")&&d.className.includes("pb-3"));
ok("manage tabs use a wrapping grid (no horizontal overflow)", !!grid);
// Reports and Payouts moved out to their own screen; Camps moved in
ok("  ...all six sections present", ["Dash","People","Products","Access","Approvals","Settings"].every(t=>grid.textContent.includes(t)));
ok("  ...Settings has a text label, not a bare gear", grid.textContent.includes("Settings"));

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"ERRORS:\n"+real.slice(0,3).join("\n"):"No React warnings or errors.");
