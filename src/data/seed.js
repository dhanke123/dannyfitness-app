/* Demo seed data. Every one of these becomes a Supabase table read in the dev phase. */

import { mulberry, nid } from "../lib/util.js";
import { T } from "../theme.js";
import { Card } from "../ui/kit.jsx";

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
export const CLIENTS = ["Sam Lee","Ben","Cheryl","Priya","Kumar","Elaine","Ivan","Nadia","Sarah T","Gireesh","Wen Jie","Dominic","Jaiveer"];

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
];

/* ---------- camps: builder data — days -> session blocks, not a flat date range ---------- */
// Camps run a minimum of 5 days. Cancellation allowed only if the camp starts more than
// CAMP_CANCEL_DAYS away (exact value TBD with Danny). `startInDays` is demo-relative.
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

export const seedLedger = [
  { id:nid(), who:"Priya", what:"10 Class Pack", amt:300, method:"PayNow", status:"paid", d:"Mon 09:12" },
  { id:nid(), who:"Ben", what:"5 PT Pack", amt:425, method:"Card", status:"paid", d:"Mon 08:47" },
  { id:nid(), who:"Kumar", what:"Drop-in · Strength", amt:35, method:"Cash", status:"paid", d:"Sun 19:50" },
  { id:nid(), who:"Elaine", what:"Unlimited Monthly", amt:280, method:"PayNow", status:"paid", d:"Sun 10:02" },
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
