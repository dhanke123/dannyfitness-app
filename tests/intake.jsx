/* Intake read-back + exports, and group editing.
 *
 * Two gaps this covers, both of the same shape — data went in and had no way out:
 *
 *   1. The form captured ~80 fields; the client card showed eight and the CSV
 *      shipped six. The body-composition panel, the 22-exercise assessment and the
 *      six ratings were write-only. A record you can't read is a form the coach
 *      stops filling in.
 *   2. Groups could be created and never edited. No rename, no way to add the third
 *      person who joined, no way to move PRIMARY when the person paying changed.
 *
 * Unit-tests the export builders directly (they are pure), then drives the real UI
 * for the parts that are wiring.
 */
import { JSDOM } from "jsdom";
const dom=new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",{url:"https://x.test/"});
global.window=dom.window; global.document=dom.window.document;
Object.defineProperty(global,"navigator",{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement; global.Element=dom.window.Element; global.Node=dom.window.Node;
global.Blob=dom.window.Blob; global.File=dom.window.File;
global.URL.createObjectURL=()=>"blob:x"; global.URL.revokeObjectURL=()=>{};
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=(await import("react")).default;
const {createRoot}=await import("react-dom/client"); const {act}=await import("react");
const I=await import("../src/lib/intake.js");
const App=(await import("../src/App.jsx")).default;
const errs=[]; const oe=console.error; console.error=(...a)=>{errs.push(a.join(" ")); oe(...a);};
const ck=[]; const ok=(n,c)=>ck.push([n,!!c]);

/* ============================ 1 · SCHEMA ============================ */

ok("all five paper sections are modelled", I.INTAKE_SECTIONS.length===5);
ok("the full field set survives, not the six that used to export", I.INTAKE_FIELDS.length>70);
ok("field keys are unique", new Set(I.INTAKE_FIELDS.map(([k])=>k)).size===I.INTAKE_FIELDS.length);
ok("body-composition fields are marked numeric", ["weight","bmi","bodyFat","visceralFat"].every(k=>I.INTAKE_NUMERIC.includes(k)));
ok("assessment scores are marked numeric too", ["pushUps","plank","burpees"].every(k=>I.INTAKE_NUMERIC.includes(k)));
ok("free text is NOT marked numeric", !I.INTAKE_NUMERIC.includes("goals") && !I.INTAKE_NUMERIC.includes("medication"));
ok("labels resolve by key", I.intakeLabel("bodyFat")==="Body fat %");

const resolve=(kind,v)=> kind==="trainer" ? ({danny:"Danny",dylan:"Dylan"}[v]||v)
                       : kind==="location" ? ({CDS:"Costa Del Sol"}[v]||v) : v;

const older = { id:"r1", who:"Sam Lee", by:"danny", d:"1 Apr 2026", iso:"2026-04-01",
  coach:"danny", venue:"CDS", weight:"78", bodyFat:"22.5", bmi:"25.1", pushUps:"18",
  goals:"Build strength", medication:"", policyAgreed:true, rArms:6 };
const newer = { id:"r2", who:"Sam Lee", by:"dylan", d:"1 Jul 2026", iso:"2026-07-01",
  coach:"dylan", venue:"CDS", weight:"74.5", bodyFat:"19.2", bmi:"23.8", pushUps:"26",
  goals:"Prep for IPPT", allergies:"Peanuts", policyAgreed:false, rArms:8 };
const recs=[newer, older];   // the app stores newest-first

/* ============================ 2 · VALUES ============================ */

ok("ids resolve to names, not database values", I.intakeValue(newer,"coach",resolve)==="Dylan");
ok("  ...venues too", I.intakeValue(newer,"venue",resolve)==="Costa Del Sol");
ok("booleans read as Yes / No", I.intakeValue(older,"policyAgreed")==="Yes" && I.intakeValue(newer,"policyAgreed")==="No");
ok("ratings carry their scale", I.intakeValue(newer,"rArms")==="8 / 10");
ok("a blank field is blank, not zero", I.intakeValue(older,"medication")==="");
ok("a real zero survives", I.intakeValue({pushUps:0},"pushUps")==="0");
ok("an untouched section is reported empty", !I.sectionFilled({who:"x"}, I.INTAKE_SECTIONS[3]));
ok("  ...a filled one isn't", I.sectionFilled(newer, I.INTAKE_SECTIONS[1]));

/* ---- the seeded records are what the exports are judged on ---- */
const S=await import("../src/data/seed.js");
const sam=S.seedIntakeRecords.filter(r=>r.who==="Sam Lee");
ok("Sam Lee has three dated assessments to trend", sam.length===3);
ok("  ...every section of every one is filled",
   sam.every(r=>I.INTAKE_SECTIONS.every(s=>I.sectionFilled(r,s))));
/* A record captured at sign-up before the physical assessment. Proves the
   read-back can say "not measured" instead of implying a measured zero. */
const partial=S.seedIntakeRecords.find(r=>r.who==="Cheryl");
ok("a partly-filled record is seeded too", !!partial);
ok("  ...its personal details are there", I.sectionFilled(partial, I.INTAKE_SECTIONS[0]));
ok("  ...its unmeasured body panel is reported empty, not zero", !I.sectionFilled(partial, I.INTAKE_SECTIONS[1]));
ok("  ...and so is the assessment it hasn't had", !I.sectionFilled(partial, I.INTAKE_SECTIONS[3]));
/* The trend has to actually go the right way, or the seed proves nothing. */
const n=(r,k)=>parseFloat(r[k]);
ok("weight falls across the three assessments", n(sam[2],"weight")>n(sam[1],"weight") && n(sam[1],"weight")>n(sam[0],"weight"));
ok("  ...body fat with it", n(sam[2],"bodyFat")>n(sam[1],"bodyFat") && n(sam[1],"bodyFat")>n(sam[0],"bodyFat"));
ok("  ...muscle mass moves the other way", n(sam[2],"skeletalMuscle")<n(sam[1],"skeletalMuscle") && n(sam[1],"skeletalMuscle")<n(sam[0],"skeletalMuscle"));
ok("  ...and the assessment scores improve", n(sam[2],"pushUps")<n(sam[1],"pushUps") && n(sam[1],"pushUps")<n(sam[0],"pushUps"));

/* ============================ 3 · WORD DOC ============================ */

const doc=I.buildIntakeDoc(newer,{client:"Sam Lee",coachName:"Dylan",resolve});
ok("Word opens it: office namespace present", doc.includes("urn:schemas-microsoft-com:office:word"));
ok("  ...client and date in the header", doc.includes("Sam Lee") && doc.includes("1 Jul 2026"));
ok("  ...paper section headings, in paper order",
   doc.indexOf("Personal Details") < doc.indexOf("Body Analysis Details")
   && doc.indexOf("Body Analysis Details") < doc.indexOf("Body Health Analysis")
   && doc.indexOf("Body Health Analysis") < doc.indexOf("Fitness Assessment"));
ok("  ...values are labelled, not bare", doc.includes("Body fat %") && doc.includes("19.2"));
ok("  ...ids never reach the page", !doc.includes(">dylan<") && !doc.includes(">CDS<"));
ok("  ...carries the cancellation clause from the form", /24 hours/.test(doc) && /non-refundable/.test(doc));
ok("  ...blank fields are omitted rather than printed empty", !doc.includes("Long-term medication"));
/* An unescaped angle bracket in a client note would break the whole document. */
const nasty=I.buildIntakeDoc({...newer, notes:'A & B <script>x</script>'},{client:"X",resolve});
ok("  ...HTML in a note is escaped", nasty.includes("&lt;script&gt;") && !nasty.includes("<script>"));

/* ====================== 3b · PDF (print pipeline) ====================== */

/* Same HTML as the Word export, so the two can never disagree about what's in the
   record — only the print chrome differs. */
const pdfSrc=I.buildIntakeDoc(newer,{client:"Sam Lee",coachName:"Dylan",resolve,forPrint:true});
ok("PDF renders the same document as Word", pdfSrc.includes("Body fat %") && pdfSrc.includes("19.2"));
ok("  ...with a Save as PDF trigger for blocked auto-print", pdfSrc.includes("window.print()"));
ok("  ...and the trigger is excluded from the printed page", /@media print\s*{\s*\.noprint\s*{\s*display:\s*none/.test(pdfSrc));
ok("  ...sections don't split across a page break", pdfSrc.includes("page-break-inside: avoid"));
ok("the Word export carries no print chrome", !doc.includes("window.print()") && !doc.includes("noprint"));

/* A blocked popup must report failure — a coach who thinks a PDF was produced
   won't go looking for it. */
const realOpen=dom.window.open;
dom.window.open=()=>null; global.window=dom.window;
ok("a blocked pop-up returns false rather than failing silently",
   I.printIntakePdf(newer,{client:"Sam Lee",resolve})===false);
dom.window.open=realOpen;

/* ============================ 4 · EXCEL CSV ============================ */

const csv=I.buildIntakeCsv(recs,{resolve});
const lines=csv.split("\n");
ok("one header row plus one row per assessment", lines.length===3);
ok("every field is a column, not six of them", lines[0].split(",").length>70);
/* Oldest first is the point: the reason to open this in Excel is to select a column
   and watch the line go the right way. Newest-first draws every trend backwards. */
ok("rows run OLDEST first, so a chart reads left to right",
   lines[1].includes("1 Apr 2026") && lines[2].includes("1 Jul 2026"));
ok("numeric cells are unquoted so Excel types them as numbers", /,74\.5,/.test(lines[2]));
ok("  ...and text stays quoted", lines[2].includes('"Prep for IPPT"'));
ok("the trend is actually there: weight fell 78 → 74.5",
   /(^|,)78(,|$)/.test(lines[1]) && /(^|,)74\.5(,|$)/.test(lines[2]));
ok("  ...and push-ups rose 18 → 26", /(^|,)18(,|$)/.test(lines[1]) && /(^|,)26(,|$)/.test(lines[2]));
ok("no records exports nothing rather than a bare header", I.buildIntakeCsv([])==="");
ok("filenames are safe", I.slug("Mable & Wendy & Helen")==="mable-wendy-helen");

/* ============================ 5 · THE APP ============================ */

const root=createRoot(document.getElementById("root"));
await act(async()=>{root.render(React.createElement(App));});
const txt=()=>document.body.textContent;
const btns=()=>[...document.querySelectorAll("button")];
const clickEl=async el=>{await act(async()=>{el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));});};
const click=async l=>{const b=btns().find(x=>x.textContent.trim().includes(l)); if(!b) throw new Error("no button: "+l); await clickEl(b);};
const exact=async t=>{const b=btns().find(x=>x.textContent.trim()===t); if(!b) throw new Error("no button: "+t); await clickEl(b);};
const setInput=async(el,v)=>{await act(async()=>{
  const s=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,"value").set;
  s.call(el,v); el.dispatchEvent(new dom.window.Event("input",{bubbles:true}));});};

await click("Owner console · not a trainer");
await click("Clients");

// ---------- intake read-back ----------
await click("Intake records");
await click("Open full form");
ok("the saved record opens as the full form", txt().includes("Personal Details") || txt().includes("PERSONAL DETAILS"));
ok("  ...every paper section is present", ["BODY ANALYSIS","BODY HEALTH","FITNESS ASSESSMENT","REMARKS"]
   .every(s=>txt().toUpperCase().includes(s)));
/* The whole point of the read-back: fields that used to go in and never come out.
   None of these appeared anywhere before — the card showed goals, injuries, notes. */
ok("  ...the body-composition panel reads back", /Skeletal muscle mass/.test(txt()) && /Visceral fat/.test(txt()));
ok("  ...so does the fitness assessment", /Push ups/.test(txt()) && /Burpees/.test(txt()));
ok("  ...and the 1-10 ratings keep their scale", /\/ 10/.test(txt()));
ok("  ...all three exports are offered from the record",
   ["PDF","Word","Excel"].every(l=>!!btns().find(b=>b.textContent.includes(l))));
ok("  ...and it explains it is read-only", txt().includes("never edited"));

// Re-assess must open a NEW record, pre-filled — not edit this one (Decision 23).
await click("Re-assess");
ok("Re-assess opens a fresh intake form", txt().includes("Client intake"));
ok("  ...pre-filled with the details that don't change", (()=>{
  const vals=[...document.querySelectorAll("input")].map(i=>i.value);
  return vals.some(v=>v==="Build strength"||v==="Prep for IPPT") || txt().includes("Sam Lee"); })());
await exact("✕");

// ---------- group edit ----------
ok("existing groups are listed, not just creatable", txt().includes("GROUPS ·"));
ok("  ...showing members, who pays and the coach", txt().includes("Swati") && txt().includes("pays"));
await click("Edit ›");
ok("the group editor opens", txt().includes("Edit group"));
const nameInput=[...document.querySelectorAll("input")].find(i=>i.value && i.value.includes("&"));
ok("  ...name is editable", !!nameInput);
await setInput(nameInput, "Morning Duo");
await click("Save group");
ok("  ...rename applied", txt().includes("Morning Duo"));

// a group cannot be reduced below two people
await click("Edit ›");
const members=btns().filter(b=>["Swati","Supriya"].includes(b.textContent.trim().replace(" ★","")));
await clickEl(members[0]);
ok("dropping to one member blocks the save", txt().includes("needs at least 2 people"));
ok("  ...and the save button is disabled", !!btns().find(b=>b.textContent.trim()==="Save group")?.disabled);
await clickEl(members[0]);   // put them back

// removing is refused while the shared pack still holds unused sessions
ok("removal is refused while the shared pack has credits left", txt().includes("unused session"));
ok("  ...and says why rather than just hiding the button", txt().includes("refund them first"));
await exact("✕");

console.error=oe;
let p=0; for(const[n,c] of ck){console.log((c?"  PASS  ":"  FAIL  ")+n); if(c)p++;}
console.log(`\n${p}/${ck.length} checks passed`);
const real=errs.filter(e=>!/not wrapped in act|ReactDOMTestUtils/.test(e));
console.log(real.length?"\nREACT ERRORS:\n"+real.join("\n"):"\nNo React warnings or errors.");
process.exit(p===ck.length && real.length===0 ? 0 : 1);
