/* Demo seed data. Every one of these becomes a Supabase table read in the dev phase. */

import { mulberry, nid } from "../lib/util.js";
import { toISO } from "../lib/dates.js";
import { T } from "../theme.js";

/* ---------- locations (dynamic — this is the whole point of req.1) ---------- */
// ExerciseOnly's real training locations (Gardens by the Bay = Danny's base at 11 Rhu Cross).
export const seedLocations = [
  { id:"GBB", name:"Gardens by the Bay" },
  { id:"MP",  name:"Meyer Park" },
  { id:"WS",  name:"Waterside" },
  { id:"CDS", name:"Costa Del Sol" },
  { id:"BP",  name:"Bayshore Park" },
  { id:"CR",  name:"Costa Rhu" },
  { id:"PB",  name:"Pebble Bay" },
  { id:"SG",  name:"Sanctuary Green" },
];

// East Coast venues sit close together; Gardens by the Bay is a longer hop across town.
export const seedTravel = {
  "BP|CDS":5, "BP|GBB":25, "BP|MP":12, "BP|WS":10,
  "CDS|GBB":25, "CDS|MP":10, "CDS|WS":8,
  "GBB|MP":20, "GBB|WS":20, "MP|WS":5,
};

// Danny Teo (owner/head coach) + Dylan are the real ExerciseOnly team; the last two are demo
// placeholders until Danny confirms his full roster.
export const TRAINERS = [
  { id:"danny", name:"Danny", tag:"Head Coach", head:true,
    bio:"Danny Teo — founder of ExerciseOnly. Functional-training and post-injury rehab specialist, and an NS/IPPT prep coach. \"Sore today, strong tomorrow.\"" },
  { id:"dylan", name:"Dylan", tag:"Coach",
    bio:"Dylan has been with ExerciseOnly for years — passionate about helping clients improve their fitness and hit their goals." },
  { id:"marcus", name:"Marcus", tag:"Coach", demo:true, bio:"Demo coach — replace with a real trainer." },
  { id:"wei", name:"Wei", tag:"Coach", demo:true, bio:"Demo coach — replace with a real trainer." },
];

// ExerciseOnly's actual group offerings (bootcamp, HIIT, NS/IPPT prep, strength, cardio).
export const CT = {
  STR:{ name:"Strength", dur:60, price:35, color:"#E8500A", desc:"Tailored strength work focused on your goals — and safe post-injury progressions." },
  HIT:{ name:"HIIT", dur:45, price:30, color:"#1F7A4D", desc:"High-intensity intervals — torch ~700 calories a session." },
  BC: { name:"Boot Camp", dur:60, price:30, color:"#2B4C7E", desc:"Weekly outdoor group camp for overall fitness and muscle endurance." },
  NS: { name:"NS / IPPT Prep", dur:60, price:40, color:"#7B4B94", desc:"Targeted IPPT preparation from a coach who's trained many NS soldiers." },
  CAR:{ name:"Cardio", dur:45, price:28, color:"#B8860B", desc:"All-round conditioning to keep you fit and moving." },
  SWM:{ name:"Swimming", dur:45, price:38, color:"#0FA6C4", desc:"Coached swim sessions — technique & fitness, kids and adults." },
};

export const XNAMES=["Aloysius","Farah","Ivan","Grace","Jun Kai","Kavitha","Dominic","Zhi Hao","Anu","Ravi","Mei Ling","Josh","Nurul","Terence","Bala","Serene"];

export const XLOCS=["GBB","MP","WS","CDS","BP"];

export const XTRN=["danny","dylan","marcus","wei"];

export const _weekExtrasCache={};

export function weekExtras(weekOff){
  if(weekOff===0) return [];
  if(_weekExtrasCache[weekOff]) return _weekExtrasCache[weekOff];
  const rnd=mulberry(weekOff*7919+13); const out=[]; const n=6+Math.floor(rnd()*7); // 6-12 extra PT/week
  for(let i=0;i<n;i++){ const hr=8+Math.floor(rnd()*8), mm=rnd()<.5?"00":"30";
    out.push({ id:`x${weekOff}_${i}`, trainer:XTRN[Math.floor(rnd()*XTRN.length)], day:Math.floor(rnd()*6),
      time:`${String(hr).padStart(2,"0")}:${mm}`, who:XNAMES[Math.floor(rnd()*XNAMES.length)], loc:XLOCS[Math.floor(rnd()*XLOCS.length)], demo:true }); }
  _weekExtrasCache[weekOff]=out; return out;
}

// `trainer` may be a single id or an array — a class/camp can need more than one coach.
export const mkS = (day,time,type,loc,trainer,cap,names) => {
  const trainers = Array.isArray(trainer) ? trainer : [trainer];
  return { id:nid(), day, time, type, loc, trainer:trainers[0], trainers, cap,
    attendees: names.map(n => ({ name:n, status:"confirmed" })) };
};

export const seedSessions = [
  mkS(0,"06:30","STR","GBB","danny",8,["Aloysius","Priya","Wen Jie","Farah","Anu","Ivan","Grace"]),
  mkS(0,"07:30","BC","MP","dylan",10,["Kavitha","Dominic","Sarah T","Jun Kai"]),
  mkS(0,"14:00","BC","MP",["marcus","wei"],12,["Farah","Gireesh","Nadia","Zhi Hao"]), // 2-coach class demo
  mkS(0,"18:30","NS","GBB","danny",8,["Ben","Cheryl","Ivan","Nadia","Zhi Hao","Grace","Jaiveer","Kumar"]),
  mkS(0,"19:45","STR","CDS","wei",8,["Elaine","Kumar"]),
  mkS(1,"06:30","HIT","BP","marcus",10,["Farah","Gireesh","Priya"]),
  mkS(1,"18:30","STR","GBB","danny",8,["Ben","Ivan","Sarah T","Wen Jie","Grace"]),
  mkS(2,"06:30","STR","MP","dylan",8,["Dominic"]),
  mkS(2,"18:30","NS","CDS","wei",8,["Cheryl","Nadia","Zhi Hao","Jaiveer"]),
  mkS(3,"07:30","BC","GBB","danny",8,["Ben","Ivan","Kumar"]),
  mkS(3,"18:30","HIT","MP","marcus",10,["Kavitha","Elaine","Jun Kai","Farah"]),
  mkS(4,"06:30","STR","GBB","dylan",8,["Gireesh","Priya","Wen Jie"]),
  mkS(4,"17:30","SWM","CDS","danny",6,["Cheryl","Nadia"]),
  mkS(5,"09:00","NS","GBB","danny",10,["Ben","Cheryl","Ivan","Nadia","Grace","Jaiveer"]),
  mkS(5,"10:30","STR","MP","marcus",8,["Sarah T","Elaine"]),
  mkS(6,"09:00","CAR","CDS","wei",10,["Kumar","Dominic","Jun Kai"]),
];

// On-shift hours per trainer, PER WEEKDAY (Sat/Sun can differ). Weekly-recurring: the same
// hours repeat every week until edited. A weekday with no entry = not on shift that day.
export const seedShifts = {
  danny:  {0:["09:00","16:00"],1:["09:00","16:00"],2:["09:00","16:00"],3:["09:00","16:00"],4:["09:00","16:00"],5:["08:00","12:00"]},
  dylan:  {0:["08:00","13:00"],1:["08:00","13:00"],2:["08:00","13:00"],3:["08:00","13:00"],4:["08:00","13:00"]},
  marcus: {0:["10:00","15:00"],1:["10:00","15:00"],3:["10:00","15:00"],4:["10:00","15:00"],5:["10:00","14:00"]},
  wei:    {0:["14:00","19:00"],1:["14:00","19:00"],2:["14:00","19:00"],5:["09:00","13:00"],6:["09:00","13:00"]},
};

// Head coach (Danny) is priced separately from the other coaches — see PT packs too.
export const PT_PRICE = { danny:120, dylan:90, marcus:85, wei:85 };

export const isHead = (trainerId) => !!TRAINERS.find(t=>t.id===trainerId)?.head;

// seed PT booking by *another* client at Gardens by the Bay — demonstrates same-location
// back-to-back (0 gap) vs. cross-location travel buffer (auto-shift) on Danny's Monday.
// Registered clients (demo roster) — used for the "book for an existing client" pickers.
export const CLIENTS = ["Sam Lee","Ben","Cheryl","Priya","Kumar","Elaine","Ivan","Nadia","Sarah T","Gireesh","Wen Jie","Dominic","Jaiveer","Swati & Supriya","Shreyans & Pooja","Mable & Wendy & Helen"];

export const seedPtBookings = [
  // Danny's PT book — populated across the week for the demo (within his shift hours)
  { id:"ptb1",  trainer:"danny", day:0, time:"09:00", loc:"GBB", who:"Priya" },
  { id:"ptb2",  trainer:"danny", day:0, time:"11:15", loc:"GBB", who:"Kumar" },
  { id:"ptb3",  trainer:"danny", day:1, time:"10:00", loc:"MP",  who:"Ben" },
  { id:"ptb4",  trainer:"danny", day:1, time:"14:30", loc:"CDS", who:"Cheryl" },
  { id:"ptb5",  trainer:"danny", day:2, time:"09:30", loc:"GBB", who:"Elaine" },
  { id:"ptb6",  trainer:"danny", day:2, time:"15:00", loc:"GBB", who:"Sarah T" },
  { id:"ptb7",  trainer:"danny", day:3, time:"11:00", loc:"MP",  who:"Ivan" },
  { id:"ptb8",  trainer:"danny", day:4, time:"09:00", loc:"GBB", who:"Nadia" },
  { id:"ptb9",  trainer:"danny", day:4, time:"13:30", loc:"CDS", who:"Gireesh" },
  { id:"ptb10", trainer:"danny", day:5, time:"08:00", loc:"GBB", who:"Wen Jie" },
  // other coaches — a few so the admin "all coaches" view has variety
  { id:"ptb11", trainer:"dylan", day:0, time:"08:30", loc:"MP",  who:"Dominic" },
  { id:"ptb12", trainer:"wei",   day:2, time:"16:00", loc:"CDS", who:"Jaiveer" },
];

// trainer time off — one-off date or weekly-recurring, full day or a time range.
// `overrides` = weekday indices where the coach chose to work anyway (availability override).
export const seedTimeOff = [
  { id:"to1", trainer:"wei", scope:"weekly", day:1, allDay:false, start:"16:00", end:"18:00", reason:"School pickup", overrides:[] },
];

export const seedProducts = [
  { id:"p1",   name:"10 Class Pack",        kind:"classes",  sessions:10, price:300, validity:90, active:true },
  { id:"p2",   name:"5 Class Pack",         kind:"classes",  sessions:5,  price:160, validity:60, active:true },
  { id:"passD",name:"Day Pass",             kind:"classpass",period:"day",   price:25,  validity:1,  active:true },
  { id:"passW",name:"Weekly Pass",          kind:"classpass",period:"week",  price:70,  validity:7,  active:true },
  { id:"passM",name:"Monthly Pass",         kind:"classpass",period:"month", price:230, validity:30, active:true },
  { id:"ptH",  name:"10 PT Pack — Head Coach (Danny)", kind:"pthead",  sessions:10, price:1100, validity:120, active:true },
  { id:"ptC",  name:"10 PT Pack — Coach",   kind:"ptcoach",  sessions:10, price:850,  validity:120, active:true },
  /* Combo packs: 2-3 people train TOGETHER on one shared pack — one payment,
     each joint session deducts 1 credit from the group pool. Priced per pack
     (not per head): cheaper than 2 solo packs, dearer than 1. PROD: confirm
     prices with Danny before go-live. */
  { id:"ptD2", name:"10 PT Combo — 2 pax (shared)", kind:"ptcombo", pax:2, sessions:10, price:1500, validity:120, active:true },
  { id:"ptD3", name:"10 PT Combo — 3 pax (shared)", kind:"ptcombo", pax:3, sessions:10, price:1800, validity:120, active:true },
];

/* ---------- camps: builder data — days -> session blocks, not a flat date range ---------- */
// Camps run a minimum of 5 days. Cancellation allowed only if the camp starts more than
// CAMP_CANCEL_DAYS away (exact value TBD with Danny). `startInDays` is demo-relative.
// DEPRECATED as a gate — the live value is `policy.campDays` in AppState (admin-editable
// under Manage → Settings, Decisions 1 & 16). Kept only as the seed default.
export const CAMP_CANCEL_DAYS = 2;

export const seedCamps = [
  { id:"c1", name:"Adult Conditioning Camp", type:"Adult", dates:"11–15 Aug", loc:"GBB", price:380, spots:6, cap:16, startInDays:6,
    days:[
      { label:"Day 1", sessions:[{ activity:"HIIT & Strength Circuit", trainer:"danny", start:"09:00", hours:2 }] },
      { label:"Day 2", sessions:[{ activity:"Boot Camp & Conditioning", trainer:"danny", start:"09:00", hours:2 }] },
      { label:"Day 3", sessions:[{ activity:"Interval Running & Core", trainer:"dylan", start:"09:00", hours:2 }] },
      { label:"Day 4", sessions:[{ activity:"Strength & Mobility", trainer:"danny", start:"09:00", hours:2 }] },
      { label:"Day 5", sessions:[{ activity:"Assessment & Benchmark", trainer:"danny", start:"09:00", hours:2 }] },
    ] },
  { id:"c2", name:"Kids Multi-Sport Camp", type:"Kids", dates:"1–5 Sep (ages 10–15)", loc:"CDS", price:280, spots:9, cap:20, startInDays:1,
    days:[
      { label:"Day 1", sessions:[{ activity:"Football", trainer:"dylan", start:"09:00", hours:2 }] },
      { label:"Day 2", sessions:[{ activity:"Swimming", trainer:"danny", start:"09:00", hours:2 }] },
      { label:"Day 3", sessions:[{ activity:"Muay Thai Basics", trainer:"wei", start:"09:00", hours:2 }] },
      { label:"Day 4", sessions:[{ activity:"Athletics & Relays", trainer:"dylan", start:"09:00", hours:2 },
                                   { activity:"Swim Session", trainer:"danny", start:"13:00", hours:1 }] }, // 2 coaches
      { label:"Day 5", sessions:[{ activity:"Games & Mini-Tournament", trainer:"dylan", start:"09:00", hours:2 }] },
    ] },
];

/* ---------- classes: reusable weekly-timetable templates ---------- */
export const seedClassTemplates = [
  { id:"t1", name:"Standard Timetable", blocks:[
    { day:0, time:"06:30", type:"STR", loc:"GBB", trainer:"danny", cap:8 },
    { day:0, time:"07:30", type:"BC", loc:"MP", trainer:"dylan", cap:10 },
    { day:0, time:"18:30", type:"NS", loc:"GBB", trainer:"danny", cap:8 },
    { day:1, time:"06:30", type:"HIT", loc:"BP", trainer:"marcus", cap:10 },
    { day:2, time:"06:30", type:"STR", loc:"MP", trainer:"dylan", cap:8 },
    { day:3, time:"07:30", type:"BC", loc:"GBB", trainer:"danny", cap:8 },
  ] },
];

export const COUPONS = { WELCOME10:{ pct:10, label:"10% off — new client" }, IPPT5: { flat:5, label:"$5 off NS/IPPT Prep" },
  EO88:{ flat:8.8, label:"$8.80 off — 8.8 flash" }, MONTH10:{ pct:10, label:"10% off — regular this month" } };

// Client-facing "About" copy (admin-editable) + promotional offers.
export const seedAbout = {
  classes:"Small-group sessions across strength, HIIT, boot camp, NS/IPPT prep and cardio. A class pack is a bundle of credits — one credit books one class, use them anytime before they expire. Prefer unlimited? Grab a day, weekly or monthly pass instead.",
  pt:"One-to-one coaching built around your goals — technique, injury rehab, IPPT prep or general fitness. PT packs come in head-coach (Danny) and coach tiers; book any coach at any location that fits your schedule.",
};

export const seedOffers = [
  { id:"o1", kind:"Referral", title:"Bring a friend", blurb:"Share your code — when your friend books their first session, you BOTH get a free class credit.", code:null, color:"#12B39C" },
  { id:"o2", kind:"This month", title:"Regular reward", blurb:"Book 8+ classes this month and unlock 10% off your next pack.", code:"MONTH10", color:"#1E50A0" },
  { id:"o3", kind:"8.8 Flash", title:"8.8 Sale", blurb:"$8.80 off any pack this week only. Tap to grab the code, then use it at checkout.", code:"EO88", color:"#FF5A3C" },
];

/* Every money row carries a REAL ISO date.
 *
 * It used to carry only `d:"Mon 09:12"` — a display label with no year and no
 * ordering. That is fine until someone asks for "revenue between two dates", at
 * which point there is nothing to filter on and the honest answer is that the
 * report can't be built. Anything that moves money must be dated at the point it
 * happens, not labelled after the fact.
 *
 * Spread across the last few months so the range and trend controls have something
 * to actually show. `d` is kept as the human label. */
const ago = (n) => toISO(new Date(Date.now() - n * 86400000));

export const seedLedger = [
  { id:nid(), who:"Priya",  what:"10 Class Pack",       amt:300, method:"PayNow", status:"paid", date:ago(0),  d:"Today 09:12" },
  { id:nid(), who:"Ben",    what:"5 PT Pack",           amt:425, method:"Card",   status:"paid", date:ago(1),  d:"Yesterday 08:47" },
  { id:nid(), who:"Kumar",  what:"Drop-in · Strength",  amt:35,  method:"Cash",   status:"paid", date:ago(2),  d:"2 days ago" },
  { id:nid(), who:"Elaine", what:"Unlimited Monthly",   amt:280, method:"PayNow", status:"paid", date:ago(3),  d:"3 days ago" },
  { id:nid(), who:"Priya",  what:"Drop-in · HIIT",      amt:35,  method:"PayNow", status:"paid", date:ago(9),  d:"Last week" },
  { id:nid(), who:"Marcus", what:"10 Class Pack",       amt:300, method:"PayNow", status:"paid", date:ago(12), d:"Last week" },
  { id:nid(), who:"Ben",    what:"Drop-in · Strength",  amt:35,  method:"Card",   status:"paid", date:ago(16), d:"2 weeks ago" },
  { id:nid(), who:"Elaine", what:"Unlimited Monthly",   amt:280, method:"PayNow", status:"paid", date:ago(33), d:"Last month" },
  { id:nid(), who:"Priya",  what:"Kids Camp · Aug",     amt:180, method:"PayNow", status:"paid", date:ago(38), d:"Last month" },
  { id:nid(), who:"Kumar",  what:"5 PT Pack (EO88)",    amt:416, method:"PayNow", status:"paid", date:ago(45), d:"Last month" },
  { id:nid(), who:"Marcus", what:"Unlimited Monthly",   amt:280, method:"PayNow", status:"paid", date:ago(64), d:"2 months ago" },
  { id:nid(), who:"Ben",    what:"Adult Camp",          amt:220, method:"Card",   status:"paid", date:ago(71), d:"2 months ago" },
];

/* ---------- expense claims (coach → admin) ----------
   One of each status so every branch of the workflow is visible in the demo
   without having to create it first. */
export const seedExpenseClaims = [
  { id:"exp1", ref:"EXP-0001", trainer:"wei", status:"submitted", submittedAt:ago(1),
    note:"Weekend classes at Costa Del Sol",
    decidedAt:null, decidedBy:null, reason:null, paidAt:null, paidRef:"", paidMethod:"PayNow",
    lines:[
      { id:"exp1-1", date:ago(3), category:"parking", amount:8,  desc:"Parking · Sat NS class",
        receipt:{name:"parking_cds.jpg", kind:"photo"}, noReceipt:false, noReceiptReason:"", excluded:false, excludeReason:"" },
      { id:"exp1-2", date:ago(3), category:"petrol",  amount:42, desc:"Petrol top-up, week of coastal sessions",
        receipt:{name:"shell_receipt.jpg", kind:"photo"}, noReceipt:false, noReceiptReason:"", excluded:false, excludeReason:"" },
      { id:"exp1-3", date:ago(2), category:"erp",     amount:3.5, desc:"ERP crossing to Meyer Park",
        receipt:null, noReceipt:true, noReceiptReason:"ERP is auto-deducted from the IU card, no slip issued", excluded:false, excludeReason:"" },
    ] },
  { id:"exp2", ref:"EXP-0002", trainer:"dylan", status:"approved", submittedAt:ago(9),
    note:"", decidedAt:ago(8), decidedBy:"admin", reason:null, paidAt:null, paidRef:"", paidMethod:"PayNow",
    lines:[
      { id:"exp2-1", date:ago(11), category:"equipment", amount:64, desc:"2 × resistance band sets (replacements)",
        receipt:{name:"decathlon.pdf", kind:"file"}, noReceipt:false, noReceiptReason:"", excluded:false, excludeReason:"" },
    ] },
  { id:"exp3", ref:"EXP-0003", trainer:"danny", status:"paid", submittedAt:ago(20),
    note:"Kids camp week", decidedAt:ago(19), decidedBy:"admin", reason:null,
    paidAt:ago(17), paidRef:"PN-88213", paidMethod:"PayNow",
    lines:[
      { id:"exp3-1", date:ago(22), category:"refresh", amount:36, desc:"Water and ice for kids camp",
        receipt:{name:"fairprice.jpg", kind:"photo"}, noReceipt:false, noReceiptReason:"", excluded:false, excludeReason:"" },
      { id:"exp3-2", date:ago(21), category:"venue",   amount:80, desc:"Shelter booking · Gardens by the Bay",
        receipt:{name:"nparks_booking.pdf", kind:"file"}, noReceipt:false, noReceiptReason:"", excluded:false, excludeReason:"" },
    ] },
];

// New per-set log model: entries have `exercises:[{ex,muscle,sets:[{w,reps,type,rpe}]}]`.
// `daysAgo` powers the streak calendar. Cardio entries keep {kind:'cardio', detail}.
export const mkSet = (w,reps,type="normal",rpe) => ({w,reps,type,rpe});

export const seedWorkoutSessions = [
  { id:"w1", d:"Today", daysAgo:0, title:"Leg Day", kind:"class", detail:"Coach-logged · Danny",
    exercises:[
      { ex:"Back Squat", muscle:"Legs", sets:[mkSet(60,5,"warmup"),mkSet(85,5,"normal",8),mkSet(85,5,"normal",8),mkSet(85,5,"normal",9)] },
      { ex:"Leg Press", muscle:"Legs", sets:[mkSet(150,10,"normal",7),mkSet(150,10,"normal",8),mkSet(170,8,"dropset",9)] },
    ] },
  { id:"w2", d:"3d ago", daysAgo:3, title:"Push Day", kind:"self", detail:"Self-logged",
    exercises:[
      { ex:"Bench Press", muscle:"Chest", sets:[mkSet(40,8,"warmup"),mkSet(62.5,5,"normal",8),mkSet(62.5,5,"normal",8)] },
      { ex:"Overhead Press", muscle:"Shoulder", sets:[mkSet(40,8,"normal",8),mkSet(40,8,"normal",8)] },
    ] },
  { id:"w3", d:"7d ago", daysAgo:7, title:"Leg Day", kind:"class", detail:"Coach-logged · Danny",
    exercises:[
      { ex:"Back Squat", muscle:"Legs", sets:[mkSet(82.5,5,"normal",8),mkSet(82.5,5,"normal",8)] },
      { ex:"Leg Press", muscle:"Legs", sets:[mkSet(140,10,"normal",7)] },
    ] },
  { id:"w4", d:"10d ago", daysAgo:10, title:"Push Day", kind:"self", detail:"Self-logged",
    exercises:[
      { ex:"Bench Press", muscle:"Chest", sets:[mkSet(60,5,"normal",8),mkSet(60,5,"normal",8)] },
      { ex:"Overhead Press", muscle:"Shoulder", sets:[mkSet(37.5,8,"normal",8)] },
    ] },
  { id:"w5", d:"14d ago", daysAgo:14, title:"Leg Day", kind:"self", detail:"Self-logged",
    exercises:[
      { ex:"Back Squat", muscle:"Legs", sets:[mkSet(80,5,"normal",8),mkSet(80,5,"normal",9)] },
    ] },
  { id:"w6", d:"21d ago", daysAgo:21, title:"Leg Day", kind:"self", detail:"Self-logged",
    exercises:[
      { ex:"Back Squat", muscle:"Legs", sets:[mkSet(75,5,"normal",9)] },
    ] },
];

// Reusable routine templates (client- or trainer-authored; trainer can assign to a client).
export const seedRoutines = [
  { id:"r1", name:"Leg Day", owner:"danny", assignedTo:"Sam Lee",
    items:[{ex:"Back Squat",muscle:"Legs",sets:4,reps:5},{ex:"Romanian Deadlift",muscle:"Legs",sets:3,reps:8},{ex:"Leg Press",muscle:"Legs",sets:3,reps:10},{ex:"Leg Curl",muscle:"Legs",sets:3,reps:12}] },
  { id:"r2", name:"Push Day", owner:"sam",
    items:[{ex:"Bench Press",muscle:"Chest",sets:4,reps:5},{ex:"Overhead Press",muscle:"Shoulder",sets:3,reps:8},{ex:"Incline DB Press",muscle:"Chest",sets:3,reps:10},{ex:"Lateral Raise",muscle:"Shoulder",sets:3,reps:15}] },
];

export const seedLeads = [
  { id:nid(), name:"Rachel Ong", phone:"91234567", source:"Instagram", status:"new", note:"DM'd @exercise.only asking about NS/IPPT prep pricing" },
  { id:nid(), name:"Jon Tay", phone:"98765432", source:"Enquiry form", status:"contacted", note:"Wants a trial Strength class" },
  { id:nid(), name:"Wen Jie's colleague", phone:"", source:"Referral", status:"trial booked", note:"Referred by Wen Jie" },
];

/* ---------------------------------------------------------------- INTAKE ----
   Fully populated intake records — every field the paper form
   (`Client information_template.pdf`) asks for, not just goals and injuries.

   These exist because a skeleton record makes the whole feature untestable by
   eye: the Word document came out at 2.3KB of headings with nothing under them,
   and the Excel export had columns but no trend to chart. Two of the questions
   this app has to answer — "is this client actually improving?" and "what does a
   handover document look like?" — can't be judged against empty rows.

   Sam Lee has THREE dated assessments a quarter apart, and they are internally
   consistent: weight, BMI, body fat, visceral fat and metabolic age all move
   together, skeletal muscle rises as fat falls, and every assessment score
   improves at a believable rate. The ratings follow the numbers rather than
   drifting on their own. Ben has one, so the "single record, no previous" path
   is covered; the Swati & Supriya pair have one each so the group view isn't
   empty either.

   Coach and venue are stored as IDS (`danny`, `CDS`) exactly as the app saves
   them, so the export path gets exercised on real shapes and any place that
   forgets to resolve an id shows up immediately. */

const samCommon = {
  who:"Sam Lee", venue:"CDS", dob:"12 Mar 1990", gender:"M",
  address:"Blk 32 Bayshore Road #11-04, Singapore 469974",
  contact:"9123 0001", emergency:"Mei Lin (wife) 9123 4455",
  email:"sam@example.sg", occupation:"Software engineer — desk-based, 9 to 7",
  height:"176",
  triedBefore:"Ran 5k three times a week for about a year and nothing changed after the first two months. Tried a commercial gym membership in 2024, went four times.",
  whyNow:"IPPT in November and I failed the last one. Also turned 36 and the annual health screening flagged my cholesterol.",
  allergies:"Peanuts — mild, avoids them",
  gastric:"Occasional acid reflux if he eats late. Not on medication for it.",
  medication:"None long-term",
  supplements:"Whey protein after training. Started vitamin D in Feb on the GP's advice.",
  dietRestrict:"No", smoke:"No",
  preferredTimes:"Mon / Wed / Fri, 6:30–7:30am before work",
  frequency:"3x a week", policyAgreed:true,
};

export const seedIntakeRecords = [
  /* ---- newest first, as the app stores them ---- */
  {
    id:"ia-sam-3", ...samCommon, by:"danny", coach:"danny",
    d:"1 Jul 2026", iso:"2026-07-01",
    age:"36", weight:"74.5", bmi:"24.1", kgToLose:"3", idealWeight:"71.5",
    bodyFat:"18.4", visceralFat:"7", skeletalMuscle:"34.8", restingMetab:"1710", metabolicAge:"34",
    bedTime:"22:45", wakeTime:"06:00",
    goals:"IPPT gold in November. Hold 3 more kg off and keep the shoulder pain-free through the push-up station.",
    breakfast:"Oats with banana and whey", lunch:"Chicken rice, skips the skin", dinner:"Home-cooked, rice and two dishes", supper:"Rarely — Greek yoghurt if hungry",
    snacking:"Down to fruit and nuts. No more office biscuits.", socialGathering:"2x a month, sticks to one drink",
    fruitsVeg:"Yes", alcohol:"Yes", exercise:"Yes", exerciseFreq:"5x a week — 3 PT + 2 runs",
    water:"2.5 L",
    injuries:"Left shoulder impingement (2024) — cleared. No pain in overhead work since April. Right knee occasionally aches after long runs.",
    assessDur:"45 secs",
    bearCrawl:"22", pushUps:"31", shoulderTap:"38", plank:"95", mountainClimber:"52",
    squats:"46", sumoSquat:"41", wallSeat:"110", lunges:"38", stationaryLunges:"34",
    lungeHold:"75", superman:"30", supermanL:"26", supermanR:"26", legRaises:"27",
    legRaiseHold:"55", flutterLeg:"60", scissorKicks:"48", sitUp:"36", sidePlank:"70",
    burpees:"23", cardio:"2.4 km in 12 min",
    rArms:8, rCore:7, rAbs:7, rBack:8, rCardio:8, rLegs:8,
    mobility:"Overhead reach now full and pain-free. Hip flexors still tight from sitting.",
    flexibility:"Fingertips to floor on forward fold — first time.",
    trainingPlan:"Hold 3x a week through to IPPT. Weeks 1–4 keep the strength base; weeks 5–8 shift to IPPT-specific circuits (push-up and sit-up volume, 2.4km pacing). Deload the week before the test. Keep overhead pressing but stop short of failure to protect the shoulder.",
    notes:"Much more consistent since moving sessions to 6:30am — no longer cancelling for work. Confidence is the big change; he now finishes sets he'd have stopped short of in January.",
  },
  {
    id:"ia-sam-2", ...samCommon, by:"dylan", coach:"dylan",
    d:"2 Apr 2026", iso:"2026-04-02",
    age:"36", weight:"77.2", bmi:"24.9", kgToLose:"6", idealWeight:"71.5",
    bodyFat:"21.0", visceralFat:"8", skeletalMuscle:"33.4", restingMetab:"1685", metabolicAge:"38",
    bedTime:"23:30", wakeTime:"06:30",
    goals:"Get back to under 75kg and rebuild the shoulder so overhead work stops hurting. IPPT in November is the real deadline.",
    breakfast:"Oats with banana", lunch:"Chicken rice or economy rice", dinner:"Home-cooked, rice and two dishes", supper:"Occasionally — instant noodles after late work",
    snacking:"Office biscuits most afternoons", socialGathering:"2–3x a month, 2–3 drinks",
    fruitsVeg:"No", alcohol:"Yes", exercise:"Yes", exerciseFreq:"3x a week — 2 PT + 1 run",
    water:"1.8 L",
    injuries:"Left shoulder impingement (2024) — cleared by physio but still catches on heavy overhead. Right knee aches after runs over 5km.",
    assessDur:"45 secs",
    bearCrawl:"17", pushUps:"24", shoulderTap:"30", plank:"70", mountainClimber:"42",
    squats:"38", sumoSquat:"33", wallSeat:"80", lunges:"30", stationaryLunges:"27",
    lungeHold:"55", superman:"23", supermanL:"20", supermanR:"19", legRaises:"20",
    legRaiseHold:"40", flutterLeg:"46", scissorKicks:"37", sitUp:"28", sidePlank:"50",
    burpees:"17", cardio:"2.4 km in 13 min 40 s",
    rArms:6, rCore:5, rAbs:5, rBack:6, rCardio:6, rLegs:7,
    mobility:"Overhead reach limited on the left, roughly 20° short. Hip flexors tight.",
    flexibility:"Forward fold to mid-shin.",
    trainingPlan:"Keep 3x a week. Progressive overload on the lower body, controlled volume overhead — no pressing to failure until the shoulder is quiet for a full month. Add one steady run for the 2.4km.",
    notes:"Missing roughly one session a fortnight to work. Suggested moving to 6:30am so it happens before the day starts.",
  },
  {
    id:"ia-sam-1", ...samCommon, by:"danny", coach:"danny",
    d:"6 Jan 2026", iso:"2026-01-06",
    age:"35", weight:"81.0", bmi:"26.1", kgToLose:"9", idealWeight:"71.5",
    bodyFat:"24.8", visceralFat:"10", skeletalMuscle:"32.1", restingMetab:"1650", metabolicAge:"43",
    bedTime:"00:15", wakeTime:"07:00",
    goals:"Lose the weight I put on over the last two years and be able to do a proper push-up again without my shoulder complaining.",
    breakfast:"Usually skips — coffee only", lunch:"Economy rice, 2 meat 1 veg", dinner:"Hawker, often after 8pm", supper:"2–3x a week, supper with colleagues",
    snacking:"Yes — biscuits and bubble tea most days", socialGathering:"Weekly, 3–4 drinks",
    fruitsVeg:"No", alcohol:"Yes", exercise:"No", exerciseFreq:"Nothing regular since 2024",
    water:"1 L or less, mostly coffee",
    injuries:"Left shoulder impingement diagnosed 2024, six sessions of physio, still painful overhead. Lower back stiff in the mornings.",
    assessDur:"45 secs",
    bearCrawl:"11", pushUps:"14", shoulderTap:"20", plank:"42", mountainClimber:"30",
    squats:"27", sumoSquat:"22", wallSeat:"45", lunges:"20", stationaryLunges:"18",
    lungeHold:"30", superman:"15", supermanL:"12", supermanR:"12", legRaises:"12",
    legRaiseHold:"22", flutterLeg:"30", scissorKicks:"24", sitUp:"18", sidePlank:"30",
    burpees:"9", cardio:"2.4 km in 15 min 20 s",
    rArms:4, rCore:3, rAbs:3, rBack:3, rCardio:4, rLegs:5,
    mobility:"Overhead reach clearly restricted on the left. Ankle dorsiflexion limited, heels lift in a deep squat.",
    flexibility:"Forward fold to just below the knee.",
    trainingPlan:"Baseline block, 8 weeks. Rebuild the movement pattern before adding load — bodyweight and light dumbbell only. Shoulder: scapular work and no overhead pressing at all for the first four weeks. Address sleep and water before touching the diet in detail.",
    notes:"First assessment. Honest about the drinking and the supper habit, which is a good sign. Priority is getting three sessions a week to actually happen — everything else follows from consistency.",
  },

  /* ---- one record only: exercises the "no previous assessment" path ---- */
  {
    id:"ia-ben-1", who:"Ben", by:"dylan", coach:"dylan", venue:"GBB",
    d:"18 Jun 2026", iso:"2026-06-18",
    dob:"4 Sep 1997", gender:"M", contact:"9123 0002",
    emergency:"Adeline Ng (sister) 9887 1122", occupation:"Junior architect",
    age:"28", height:"181", weight:"88.4", bmi:"27.0", kgToLose:"10", idealWeight:"78",
    bodyFat:"26.2", visceralFat:"11", skeletalMuscle:"34.9", restingMetab:"1820", metabolicAge:"36",
    bedTime:"01:00", wakeTime:"07:30",
    goals:"General conditioning and lose about 4kg to start with. Wants to feel less winded on site visits.",
    triedBefore:"Gym on and off since university, never with a plan. Tried intermittent fasting for a month.",
    whyNow:"Wedding next March and a recent health screening showing pre-diabetic HbA1c.",
    breakfast:"Kaya toast and kopi", lunch:"Cai fan", dinner:"Varies, often takeaway", supper:"Frequently — late nights at work",
    snacking:"Yes, constant while working", socialGathering:"Weekly",
    fruitsVeg:"No", alcohol:"Yes", smoke:"No", exercise:"No", dietRestrict:"No",
    exerciseFreq:"Nothing regular for about 8 months", water:"1.2 L",
    supplements:"None", allergies:"None reported",
    gastric:"No", medication:"None",
    injuries:"None reported. Some lower-back stiffness after long days standing on site.",
    assessDur:"45 secs",
    bearCrawl:"13", pushUps:"19", shoulderTap:"26", plank:"50", mountainClimber:"36",
    squats:"32", sumoSquat:"28", wallSeat:"55", lunges:"24", stationaryLunges:"21",
    lungeHold:"38", superman:"18", supermanL:"15", supermanR:"15", legRaises:"15",
    legRaiseHold:"28", flutterLeg:"34", scissorKicks:"28", sitUp:"22", sidePlank:"35",
    burpees:"12", cardio:"2.4 km in 14 min 50 s",
    rArms:5, rCore:4, rAbs:4, rBack:5, rCardio:4, rLegs:6,
    mobility:"Good overhead range. Thoracic rotation limited.",
    flexibility:"Forward fold to mid-shin.",
    preferredTimes:"Tue / Thu evenings, after 7pm", frequency:"2x a week to start",
    trainingPlan:"Responds well to group settings — start him in the Tuesday Strength class alongside one PT session so the habit forms socially. Conditioning bias, keep the intensity moderate for the first month.",
    notes:"New to structured training. Set the expectation early that two consistent sessions beat four sporadic ones.",
    policyAgreed:true,
  },

  /* ---- deliberately PARTIAL: details taken at sign-up, physical assessment not
     done yet. A real and common state, and the one that proves the read-back
     distinguishes "not measured" from "measured as zero" — a blank body-fat row
     and 0% body fat are different claims. ---- */
  {
    id:"ia-cheryl-1", who:"Cheryl", by:"danny", coach:"danny", venue:"MP",
    d:"24 Jul 2026", iso:"2026-07-24",
    gender:"F", dob:"9 Nov 1994", contact:"9123 0003",
    emergency:"Daniel Ho (partner) 8123 9900", email:"cheryl@example.sg",
    occupation:"Physiotherapist",
    goals:"Return to training after a year off. Wants to start slowly and rebuild.",
    triedBefore:"Trained consistently until 2025, stopped after a house move.",
    whyNow:"Settled in and misses it.",
    injuries:"None current. Broken left wrist in 2019, fully healed.",
    preferredTimes:"Weekends, flexible", frequency:"To be agreed after the assessment",
    notes:"Details taken at sign-up. Body composition and fitness assessment booked for next Saturday.",
    policyAgreed:true,
  },

  /* ---- group members: the pair view is not empty either ---- */
  {
    id:"ia-swati-1", who:"Swati", by:"ansab", coach:"ansab", venue:"CDS",
    d:"14 May 2026", iso:"2026-05-14",
    gender:"F", contact:"9123 0014", emergency:"Supriya 9123 0015", occupation:"Marketing manager",
    age:"34", height:"162", weight:"58.6", bmi:"22.3", bodyFat:"27.4", visceralFat:"5",
    skeletalMuscle:"22.8", restingMetab:"1290", metabolicAge:"33",
    bedTime:"23:00", wakeTime:"05:30",
    goals:"Tone up and build strength. Trains with Supriya and wants to keep it that way.",
    triedBefore:"Yoga twice a week for two years. Enjoyed it but saw no strength change.",
    whyNow:"Turning 35 and wants to start resistance training before it gets harder.",
    fruitsVeg:"Yes", alcohol:"No", smoke:"No", exercise:"Yes", dietRestrict:"Yes",
    exerciseFreq:"2x a week PT plus weekend walks", water:"2 L",
    supplements:"Iron, prescribed", allergies:"None", medication:"None",
    injuries:"Mild lower-back discomfort with heavy hinging. No diagnosis.",
    assessDur:"30 secs",
    pushUps:"12", plank:"55", squats:"29", lunges:"24", sitUp:"20", burpees:"11",
    rArms:5, rCore:6, rAbs:5, rBack:5, rCardio:6, rLegs:6,
    mobility:"Good overall. Hip mobility strong from yoga.",
    preferredTimes:"Wed / Fri, 6:00–6:15am", frequency:"2x a week, joint sessions",
    trainingPlan:"Joint sessions with Supriya. Deadlift pattern taught from the floor with a trap bar before loading, given the back discomfort.",
    notes:"Trains as a pair — 1 shared credit per session regardless of who attends.",
    policyAgreed:true,
  },
];
