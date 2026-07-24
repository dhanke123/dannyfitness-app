import { useState, useMemo, useEffect, useRef } from "react";

/* ============================================================
   DannyFitness — v2 demo (Client / Trainer / Admin)
   Adds on top of the v1 full-scope demo:
   - Dynamic, admin-addable locations (dropdown default "All" + "Other" free text for PT)
   - PT scheduling engine: travel-time buffer between different-location bookings,
     zero-gap back-to-back at the same location, trainer time off (day/weekly), move session
   - Camp builder: day-by-day session blocks (activity / trainer / time / duration)
   - Class template builder: reusable weekly timetables, cloneable
   In-memory demo state only — swap for Supabase in production.
   ============================================================ */

const T = { paper:"#F7F5F0", ink:"#17150F", accent:"#E8500A", moss:"#1F7A4D",
  line:"#E3DFD4", muted:"#8A867B", card:"#FFFFFF", navy:"#2B4C7E", plum:"#7B4B94" };
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap');`;
const disp = { fontFamily:"'Barlow Condensed', sans-serif", textTransform:"uppercase", letterSpacing:"0.02em" };
const body = { fontFamily:"'Barlow', sans-serif" };

/* ---------- locations (dynamic — this is the whole point of req.1) ---------- */
// ExerciseOnly's real training locations (Gardens by the Bay = Danny's base at 11 Rhu Cross).
const seedLocations = [
  { id:"GBB", name:"Gardens by the Bay" },
  { id:"MP",  name:"Meyer Park" },
  { id:"WS",  name:"Waterside" },
  { id:"CDS", name:"Costa Del Sol" },
  { id:"BP",  name:"Bayshore Park" },
];
const DEFAULT_TRAVEL = 15; // minutes — fallback for any location pair without a specific value
// East Coast venues sit close together; Gardens by the Bay is a longer hop across town.
const seedTravel = {
  "BP|CDS":5, "BP|GBB":25, "BP|MP":12, "BP|WS":10,
  "CDS|GBB":25, "CDS|MP":10, "CDS|WS":8,
  "GBB|MP":20, "GBB|WS":20, "MP|WS":5,
};
const travelKey = (a,b)=>[a,b].sort().join("|");
const travelBetween = (travel, a, b) => {
  if (!a || !b || a===b) return 0;
  if (a==="other" || b==="other") return DEFAULT_TRAVEL;
  return travel[travelKey(a,b)] ?? DEFAULT_TRAVEL;
};

// Danny Teo (owner/head coach) + Dylan are the real ExerciseOnly team; the last two are demo
// placeholders until Danny confirms his full roster.
const TRAINERS = [
  { id:"danny", name:"Danny", tag:"Head Coach", admin:true,
    bio:"Danny Teo — founder of ExerciseOnly. Functional-training and post-injury rehab specialist, and an NS/IPPT prep coach. \"Sore today, strong tomorrow.\"" },
  { id:"dylan", name:"Dylan", tag:"Coach",
    bio:"Dylan has been with ExerciseOnly for years — passionate about helping clients improve their fitness and hit their goals." },
  { id:"marcus", name:"Marcus", tag:"Coach", demo:true, bio:"Demo coach — replace with a real trainer." },
  { id:"wei", name:"Wei", tag:"Coach", demo:true, bio:"Demo coach — replace with a real trainer." },
];
// ExerciseOnly's actual group offerings (bootcamp, HIIT, NS/IPPT prep, strength, cardio).
const CT = {
  STR:{ name:"Strength", dur:60, price:35, color:"#E8500A", desc:"Tailored strength work focused on your goals — and safe post-injury progressions." },
  HIT:{ name:"HIIT", dur:45, price:30, color:"#1F7A4D", desc:"High-intensity intervals — torch ~700 calories a session." },
  BC: { name:"Boot Camp", dur:60, price:30, color:"#2B4C7E", desc:"Weekly outdoor group camp for overall fitness and muscle endurance." },
  NS: { name:"NS / IPPT Prep", dur:60, price:40, color:"#7B4B94", desc:"Targeted IPPT preparation from a coach who's trained many NS soldiers." },
  CAR:{ name:"Cardio", dur:45, price:28, color:"#B8860B", desc:"All-round conditioning to keep you fit and moving." },
};
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TODAY = 0;
let _id = 0; const nid = () => "x" + ++_id;
// `trainer` may be a single id or an array — a class/camp can need more than one coach.
const mkS = (day,time,type,loc,trainer,cap,names) => {
  const trainers = Array.isArray(trainer) ? trainer : [trainer];
  return { id:nid(), day, time, type, loc, trainer:trainers[0], trainers, cap,
    attendees: names.map(n => ({ name:n, status:"confirmed" })) };
};
const sessTrainers = (s) => s.trainers || [s.trainer];
const seedSessions = [
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
  mkS(5,"09:00","NS","GBB","danny",10,["Ben","Cheryl","Ivan","Nadia","Grace","Jaiveer"]),
  mkS(5,"10:30","STR","MP","marcus",8,["Sarah T","Elaine"]),
  mkS(6,"09:00","CAR","CDS","wei",10,["Kumar","Dominic","Jun Kai"]),
];

/* ---------- PT scheduling model (req 4/5/6) ----------
   A coach is NOT tied to a location for PT. During their on-shift working hours they are
   bookable at ANY location, EXCEPT where an existing commitment (a class they teach, a camp
   block, or an already-booked PT) blocks them. Same-location back-to-back needs no gap;
   a different location needs the travel buffer (default 15m). This is the whole of req 6:
   "available at all locations if not already booked for a class at that location; else, after
   the travel buffer, available at all other locations." */
const PT_DUR = 45; // minutes — default PT session length (flagged in spec as possibly variable later)
const SLOT_STEP = 45; // bookable start granularity = one PT session, so slots sit back-to-back
// On-shift hours per trainer, PER WEEKDAY (Sat/Sun can differ). Weekly-recurring: the same
// hours repeat every week until edited. A weekday with no entry = not on shift that day.
const seedShifts = {
  danny:  {0:["09:00","16:00"],1:["09:00","16:00"],2:["09:00","16:00"],3:["09:00","16:00"],4:["09:00","16:00"],5:["08:00","12:00"]},
  dylan:  {0:["08:00","13:00"],1:["08:00","13:00"],2:["08:00","13:00"],3:["08:00","13:00"],4:["08:00","13:00"]},
  marcus: {0:["10:00","15:00"],1:["10:00","15:00"],3:["10:00","15:00"],4:["10:00","15:00"],5:["10:00","14:00"]},
  wei:    {0:["14:00","19:00"],1:["14:00","19:00"],2:["14:00","19:00"],5:["09:00","13:00"],6:["09:00","13:00"]},
};
const workWindow = (shifts, trainerId, dayIdx) => {
  const h = shifts?.[trainerId]?.[dayIdx];
  return h ? [toMin(h[0]), toMin(h[1])] : null;
};
// Head coach (Danny) is priced separately from the other coaches — see PT packs too.
const PT_PRICE = { danny:120, dylan:90, marcus:85, wei:85 };
const isHead = (trainerId) => !!TRAINERS.find(t=>t.id===trainerId)?.admin;
// seed PT booking by *another* client at Gardens by the Bay — demonstrates same-location
// back-to-back (0 gap) vs. cross-location travel buffer (auto-shift) on Danny's Monday.
const seedPtBookings = [
  { id:"ptb1", trainer:"danny", day:0, time:"11:15", loc:"GBB", who:"Priya" },
];
// trainer time off — one-off date or weekly-recurring, full day or a time range.
// `overrides` = weekday indices where the coach chose to work anyway (availability override).
const seedTimeOff = [
  { id:"to1", trainer:"wei", scope:"weekly", day:1, allDay:false, start:"16:00", end:"18:00", reason:"School pickup", overrides:[] },
];

/* ---------- products ----------
   - Class CREDIT packs: N sessions, deducted per booking.
   - Class PASSES (req 3): unlimited classes within a period — day / weekly / monthly.
   - PT packs (req 2): separate SKUs for Head Coach (Danny) vs a normal Coach, tracked as
     separate credit pools so a coach pack can't be spent on a head-coach session.        */
const seedProducts = [
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
const CAMP_CANCEL_DAYS = 2;
const seedCamps = [
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
const seedClassTemplates = [
  { id:"t1", name:"Standard Timetable", blocks:[
    { day:0, time:"06:30", type:"STR", loc:"GBB", trainer:"danny", cap:8 },
    { day:0, time:"07:30", type:"BC", loc:"MP", trainer:"dylan", cap:10 },
    { day:0, time:"18:30", type:"NS", loc:"GBB", trainer:"danny", cap:8 },
    { day:1, time:"06:30", type:"HIT", loc:"BP", trainer:"marcus", cap:10 },
    { day:2, time:"06:30", type:"STR", loc:"MP", trainer:"dylan", cap:8 },
    { day:3, time:"07:30", type:"BC", loc:"GBB", trainer:"danny", cap:8 },
  ] },
];

const COUPONS = { WELCOME10:{ pct:10, label:"10% off — new client" }, IPPT5: { flat:5, label:"$5 off NS/IPPT Prep" } };
const seedLedger = [
  { id:nid(), who:"Priya", what:"10 Class Pack", amt:300, method:"PayNow", status:"paid", d:"Mon 09:12" },
  { id:nid(), who:"Ben", what:"5 PT Pack", amt:425, method:"Card", status:"paid", d:"Mon 08:47" },
  { id:nid(), who:"Kumar", what:"Drop-in · Strength", amt:35, method:"Cash", status:"paid", d:"Sun 19:50" },
  { id:nid(), who:"Elaine", what:"Unlimited Monthly", amt:280, method:"PayNow", status:"paid", d:"Sun 10:02" },
];
const EXLIB = {
  Legs: ["Back Squat","Deadlift","Leg Press","Walking Lunge"],
  Back: ["Pull-up","Bent-over Row","Lat Pulldown"],
  Shoulder: ["Overhead Press","Lateral Raise","Face Pull"],
  Chest: ["Bench Press","Incline DB Press","Push-up"],
  Core: ["Hanging Leg Raise","Plank","Cable Woodchop"],
};
const seedWorkoutSessions = [
  { id:"w1", d:"Mon", title:"Leg Day", detail:"Coach-logged · Danny", kind:"class",
    sets:[{ex:"Back Squat", muscle:"Legs", w:85, reps:"5×5", rpe:8},{ex:"Leg Press", muscle:"Legs", w:150, reps:"3×10", rpe:7},{ex:"Walking Lunge", muscle:"Legs", w:20, reps:"3×12", rpe:7}] },
  { id:"w2", d:"22 Jul", title:"Push Day", detail:"Self-logged", kind:"self",
    sets:[{ex:"Bench Press", muscle:"Chest", w:62.5, reps:"5×5", rpe:8},{ex:"Overhead Press", muscle:"Shoulder", w:40, reps:"3×8", rpe:8}] },
  { id:"w3", d:"18 Jul", title:"Leg Day", detail:"Coach-logged · Danny", kind:"class",
    sets:[{ex:"Back Squat", muscle:"Legs", w:80, reps:"5×5", rpe:8},{ex:"Leg Press", muscle:"Legs", w:140, reps:"3×10", rpe:7}] },
  { id:"w4", d:"15 Jul", title:"Push Day", detail:"Self-logged", kind:"self",
    sets:[{ex:"Bench Press", muscle:"Chest", w:60, reps:"5×5", rpe:8},{ex:"Overhead Press", muscle:"Shoulder", w:37.5, reps:"3×8", rpe:8}] },
  { id:"w5", d:"9 Jul", title:"Leg Day", detail:"Self-logged", kind:"self",
    sets:[{ex:"Back Squat", muscle:"Legs", w:75, reps:"5×5", rpe:9},{ex:"Leg Press", muscle:"Legs", w:130, reps:"3×10", rpe:8}] },
];
const seedLeads = [
  { id:nid(), name:"Rachel Ong", source:"Instagram", status:"new", note:"DM'd @exercise.only asking about NS/IPPT prep pricing" },
  { id:nid(), name:"Jon Tay", source:"Enquiry form", status:"contacted", note:"Wants a trial Strength class" },
  { id:nid(), name:"Wen Jie's colleague", source:"Referral", status:"trial booked", note:"Referred by Wen Jie" },
];

/* ---------- time helpers ---------- */
const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const fromMin = (m) => { const h = Math.floor(m/60), mm = m%60; return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; };

/* Merge everything that occupies a trainer's day into busy blocks: classes taught,
   confirmed PT bookings, and time off. loc:null on a block means "unavailable regardless
   of location" (time off), so it always blocks rather than only within a travel buffer. */
function trainerBusyBlocks(trainerId, dayIdx, { sessions, ptBookings, timeOff }) {
  const blocks = [];
  // classes/camps this coach is assigned to (including as a second coach)
  sessions.filter(s => sessTrainers(s).includes(trainerId) && s.day===dayIdx && s.status!=="cancelled").forEach(s => {
    blocks.push({ start: toMin(s.time), end: toMin(s.time)+CT[s.type].dur, loc: s.loc, label: CT[s.type].name });
  });
  ptBookings.filter(b => b.trainer===trainerId && b.day===dayIdx && b.status!=="cancelled").forEach(b => {
    blocks.push({ start: toMin(b.time), end: toMin(b.time)+PT_DUR, loc: b.loc, label: "PT session" });
  });
  timeOff.filter(t => t.trainer===trainerId && t.active!==false && t.day===dayIdx
    && !(t.overrides||[]).includes(dayIdx)   // availability override: coach chose to work anyway
  ).forEach(t => {
    blocks.push({ start: t.allDay ? 0 : toMin(t.start), end: t.allDay ? 24*60 : toMin(t.end), loc: null, label: "Time off" });
  });
  return blocks.sort((a,b) => a.start-b.start);
}

/* Is a proposed PT session [t, t+PT_DUR] at locId feasible for this trainer given their
   busy blocks? Returns { ok, note, blockedBy }. A block at a different location extends by
   the travel buffer on both sides; a block at the same location blocks only its own span;
   time off (loc null) always blocks. `note` explains a buffer-driven earliest-start shift. */
function checkPtSlot(t, locId, busy, travel, locName) {
  for (const b of busy) {
    const buf = b.loc===null ? 0 : (b.loc===locId ? 0 : travelBetween(travel, locId, b.loc));
    const blockStart = b.start - buf, blockEnd = b.end + buf;
    if (t < blockEnd && t + PT_DUR > blockStart) return { ok:false, blockedBy:b };
  }
  // note if the slot's start butts right up against a travel buffer from a prior commitment
  let note = null;
  for (const b of busy) {
    if (b.loc===null || b.loc===locId) continue;
    const buf = travelBetween(travel, locId, b.loc);
    if (buf > 0 && t >= b.end && t < b.end + buf + SLOT_STEP && t >= b.end + buf && t - b.end < buf + SLOT_STEP) {
      note = `+${buf}m travel from ${locName(b.loc)}`;
    }
  }
  return { ok:true, note };
}

/* Bookable PT start times for a trainer/day/location. Coach is bookable across their whole
   on-shift window at ANY location, minus commitments + travel buffers (req 6). */
function ptSlotsFor(trainerId, dayIdx, locId, travel, ctx, locName) {
  const win = workWindow(ctx.shifts, trainerId, dayIdx);
  if (!win) return [];
  const busy = trainerBusyBlocks(trainerId, dayIdx, ctx);
  const [winStart, winEnd] = win;
  const out = [];
  for (let t = winStart; t + PT_DUR <= winEnd; t += SLOT_STEP) {
    const r = checkPtSlot(t, locId, busy, travel, locName);
    if (r.ok) out.push({ trainer:trainerId, day:dayIdx, loc:locId, time:fromMin(t), note:r.note });
  }
  return out;
}

/* Contiguous free RANGES for a trainer/day/location — the "shown correctly" summary the
   client sees (req 5): "Free 09:00–11:15, 12:00–16:00", with the gaps explained. */
function ptRangesFor(trainerId, dayIdx, locId, travel, ctx, locName) {
  const win = workWindow(ctx.shifts, trainerId, dayIdx);
  if (!win) return { ranges:[], gaps:[] };
  const busy = trainerBusyBlocks(trainerId, dayIdx, ctx);
  const [winStart, winEnd] = win;
  // build blocked intervals (buffered) and merge
  const blocked = busy.map(b => {
    const buf = b.loc===null ? 0 : (b.loc===locId ? 0 : travelBetween(travel, locId, b.loc));
    return { s:b.start-buf, e:b.end+buf, label:b.label, loc:b.loc, buf };
  }).sort((a,b)=>a.s-b.s);
  const gaps = blocked.filter(b => b.e>winStart && b.s<winEnd).map(b => ({
    from:fromMin(Math.max(b.s,winStart)), to:fromMin(Math.min(b.e,winEnd)),
    why: b.loc===null ? b.label : b.buf>0 ? `${b.label} @ ${locName(b.loc)} (+${b.buf}m travel)` : b.label,
  }));
  // subtract blocked from working window
  const ranges = [];
  let cur = winStart;
  for (const b of blocked) {
    if (b.e<=winStart || b.s>=winEnd) continue;
    if (b.s>cur) ranges.push([cur, Math.min(b.s,winEnd)]);
    cur = Math.max(cur, b.e);
  }
  if (cur<winEnd) ranges.push([cur, winEnd]);
  return {
    ranges: ranges.filter(([s,e])=>e-s>=PT_DUR).map(([s,e])=>`${fromMin(s)}–${fromMin(e)}`),
    gaps,
  };
}

/* ---------- shared ui ---------- */
const Chip = ({active,onClick,children}) => (
  <button onClick={onClick} className="px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap"
    style={{...body, background:active?T.ink:"transparent", color:active?T.paper:T.ink, border:`1.5px solid ${active?T.ink:T.line}`}}>
    {children}</button>);
const Btn = ({onClick,children,kind="primary",disabled,full,small}) => (
  <button onClick={onClick} disabled={disabled}
    className={`${small?"py-2 px-3 text-xs":"py-3 px-5 text-sm"} rounded-xl font-bold ${full?"w-full":""}`}
    style={{...body, background:disabled?T.line:kind==="primary"?T.accent:kind==="dark"?T.ink:kind==="plum"?T.plum:"transparent",
      color:disabled?T.muted:kind==="ghost"?T.ink:"#fff", border:kind==="ghost"?`1.5px solid ${T.line}`:"none"}}>
    {children}</button>);
const Card = ({children,className="",style={}}) => (
  <div className={`rounded-2xl p-4 ${className}`} style={{background:T.card, border:`1.5px solid ${T.line}`, ...style}}>{children}</div>);
const Ticks = ({cap,n}) => (
  <div className="flex gap-0.5 flex-wrap">{Array.from({length:cap}).map((_,i)=>(
    <span key={i} style={{width:7,height:12,borderRadius:1.5,background:i<n?T.ink:"transparent",border:`1.5px solid ${i<n?T.ink:T.line}`}}/>))}</div>);
const H = ({children}) => <h2 style={{...disp,fontWeight:700,fontSize:22}} className="mb-3">{children}</h2>;
const Sub = ({children}) => <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>{children}</div>;
const QR = () => (
  <div className="mx-auto my-2 p-3 rounded-xl" style={{background:"#fff",border:`1.5px solid ${T.line}`,width:150}}>
    <div className="grid grid-cols-10 gap-px" style={{width:120,height:120}}>
      {Array.from({length:100}).map((_,i)=>(<div key={i} style={{background:((i*7+Math.floor(i/10)*3)%5)<2?T.ink:"#fff"}}/>))}</div>
    <div className="text-center text-[10px] mt-1.5 font-bold" style={{...body,color:"#7B1FA2"}}>PAYNOW · UEN 2024XXXXX</div>
  </div>);
const Stars = ({value,onRate}) => (
  <div className="flex gap-1">{[1,2,3,4,5].map(n=>(
    <button key={n} onClick={()=>onRate(n)} className="text-2xl leading-none" style={{color:n<=value?T.accent:T.line}}>★</button>))}</div>);
const Select = ({value,onChange,options,style={}}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    className="px-3 py-2 rounded-lg text-sm font-semibold outline-none"
    style={{...body, border:`1.5px solid ${T.line}`, background:T.card, color:T.ink, ...style}}>
    {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
  </select>);

/* ============================================================ */
export default function DannyFitnessDemo() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const ping = (m)=>{ setToast(m); setTimeout(()=>setToast(null),2800); };

  const [locations, setLocations] = useState(seedLocations);
  const [travel, setTravel] = useState(seedTravel);
  const [suggestedLocs, setSuggestedLocs] = useState([]); // free-text "Other" spots clients have used

  const [sessions, setSessions] = useState(seedSessions);
  const [credits, setCredits] = useState({classes:5, ptHead:1, ptCoach:2});
  const [classPass, setClassPass] = useState(null); // {label, period, expires} — active unlimited-class pass
  const [shopSheet, setShopSheet] = useState(null);  // {product} — checkout modal for a shop purchase
  const [myClassBookings, setMyClassBookings] = useState([]);
  const [myPT, setMyPT] = useState([]);
  const [myWaitlist, setMyWaitlist] = useState([]);
  const [myCamps, setMyCamps] = useState([]);
  const [logs, setLogs] = useState(seedWorkoutSessions);
  const [logOpen, setLogOpen] = useState(null);
  const [logSheet, setLogSheet] = useState(null);
  const [progEx, setProgEx] = useState("Back Squat"); // exercise selected for the progress chart
  const [intakeForm, setIntakeForm] = useState(null);
  const [products, setProducts] = useState(seedProducts);
  const [camps, setCamps] = useState(seedCamps);
  const [classTemplates, setClassTemplates] = useState(seedClassTemplates);
  const [ledger, setLedger] = useState(seedLedger);
  const [leads, setLeads] = useState(seedLeads);
  const [perm, setPerm] = useState({ dylan:{editDesc:false, cancel:false, earnings:false, manageLocations:false},
    marcus:{editDesc:true, cancel:false, earnings:false, manageLocations:false}, wei:{editDesc:false, cancel:false, earnings:true, manageLocations:false} });
  const [measurements, setMeasurements] = useState([{who:"Sam Lee", weight:74.5, fat:19.2, d:"1 Jul"},{who:"Sam Lee", weight:73.8, fat:18.4, d:"15 Jul"}]);
  const [ratings, setRatings] = useState({});
  const [noShowQueue, setNoShowQueue] = useState([
    { id:nid(), who:"Kumar", session:"Strength · Sun 19:45 · Costa Del Sol", policy:"Forfeit 1 credit" },
  ]);
  const [referralCode] = useState("SAM-LEE-24");
  const [referralUses, setReferralUses] = useState(1);
  const [ptBookings, setPtBookings] = useState(seedPtBookings); // all confirmed PT bookings (other clients + demo user)
  const [timeOff, setTimeOff] = useState(seedTimeOff);
  const [shifts, setShifts] = useState(seedShifts);   // per-trainer per-weekday on-shift hours
  const [trainers, setTrainers] = useState(TRAINERS); // roster (Add Trainer appends here)
  const [rates, setRates] = useState({               // pay config per trainer (payout/cost calc)
    danny:{type:"salary", perClass:0, perPt:0, monthly:6000},
    dylan:{type:"per_class", perClass:40, perPt:45, monthly:0},
    marcus:{type:"per_class", perClass:35, perPt:40, monthly:0},
    wei:{type:"per_class", perClass:35, perPt:40, monthly:0},
  });
  const [campSheet, setCampSheet] = useState(null);   // camp checkout {camp, waiver?}
  const [chatOpen, setChatOpen] = useState(false);    // in-app coach chat
  const [chatMsgs, setChatMsgs] = useState([
    { from:"coach", text:"Hi Sam! Great work in Monday's session 💪 Let me know if you want to add a PT slot this week." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [addTrainer, setAddTrainer] = useState(null); // Add/Edit Trainer form (has .editId when editing)
  const [shiftEditor, setShiftEditor] = useState(null); // {trainer}
  const [moveDay, setMoveDay] = useState(null); // running-late cascade sheet {trainer}
  const [doneSheet, setDoneSheet] = useState(null); // complete-session sheet {session/pt}
  const [incidentals, setIncidentals] = useState([  // trainer-logged extras awaiting Danny's approval
    { id:nid(), trainer:"wei", label:"Parking at Costa Del Sol", amt:8, note:"Sat NS class", status:"pending" },
  ]);

  const [seg, setSeg] = useState("classes");
  const [day, setDay] = useState(TODAY);
  const [loc, setLoc] = useState("all");
  const [ptLoc, setPtLoc] = useState(seedLocations[0].id); // PT needs a real place (coach is available anywhere); supports "other"
  const [otherPlace, setOtherPlace] = useState("");
  const [ptTrainers, setPtTrainers] = useState(["danny","dylan","marcus","wei"]);
  const [sheet, setSheet] = useState(null);
  const [payMode, setPayMode] = useState("credit");
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState(null);
  const [rosterOpen, setRosterOpen] = useState(null);
  const [adminSec, setAdminSec] = useState("dash");
  const [permOpen, setPermOpen] = useState(null);
  const [measForm, setMeasForm] = useState(null);
  const [rateSheet, setRateSheet] = useState(null);
  const [timeOffSheet, setTimeOffSheet] = useState(null); // {trainer}
  const [moveSheet, setMoveSheet] = useState(null); // {kind:'class'|'pt', ...item}
  const [newLocName, setNewLocName] = useState("");
  const [campOpenId, setCampOpenId] = useState(null); // itinerary expand (client)
  const [campBuilder, setCampBuilder] = useState(null); // camp being edited/created (admin)
  const [templateBuilder, setTemplateBuilder] = useState(null); // template being edited/created (admin)

  const tName = (id)=>trainers.find(t=>t.id===id)?.name || id;
  const locName = (id)=> id==="other" ? "Other" : (locations.find(l=>l.id===id)?.name || id);

  // ---- Android/browser back handling: back closes an open sheet, else returns to the home
  // tab, and never drops the user out of the app. ----
  const closeOverlays = () => { setSheet(null); setShopSheet(null); setCampSheet(null); setChatOpen(false);
    setTimeOffSheet(null); setMoveSheet(null); setMoveDay(null); setShiftEditor(null); setAddTrainer(null);
    setMeasForm(null); setLogSheet(null); setIntakeForm(null); setCampBuilder(null); setTemplateBuilder(null);
    setDoneSheet(null); setRateSheet(null); };
  const anyOverlay = !!(sheet||shopSheet||campSheet||chatOpen||timeOffSheet||moveSheet||moveDay||shiftEditor||addTrainer||measForm||logSheet||intakeForm||campBuilder||templateBuilder||doneSheet||rateSheet);
  const backRef = useRef({});
  backRef.current = { anyOverlay, tab, user, closeOverlays };
  useEffect(() => {
    window.history.pushState({app:true}, "");
    const onPop = () => {
      const st = backRef.current;
      if (st.anyOverlay) { st.closeOverlays(); }
      else if (st.user && !["home","today"].includes(st.tab)) { setTab(st.user.role==="client"?"home":"today"); }
      // else: at a root tab — stay put (re-push below so the app isn't exited)
      window.history.pushState({app:true}, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const booked = (s)=>s.attendees.length + (myClassBookings.includes(s.id)?1:0);

  const login = (role) => {
    if (role==="client") setUser({role, id:"sam", name:"Sam Lee"});
    if (role==="trainer") setUser({role, id:"dylan", name:"Dylan"});
    if (role==="admin") setUser({role, id:"danny", name:"Danny"});
    setTab(role==="client"?"home":"today");
    setCoupon(""); setCouponMsg(null);
  };

  // pure price after coupon — safe to call during render (no state writes)
  const couponValue = (base) => {
    const c = COUPONS[coupon.toUpperCase()];
    if (!c) return base;
    return c.pct ? base*(1-c.pct/100) : Math.max(0, base-c.flat);
  };
  // event-handler version: applies + shows a message
  const applyCoupon = (base) => {
    const c = COUPONS[coupon.toUpperCase()];
    if (!c) { setCouponMsg(coupon? "Code not recognised" : null); return base; }
    setCouponMsg(`Applied: ${c.label}`);
    return c.pct ? base*(1-c.pct/100) : Math.max(0, base-c.flat);
  };

  // which PT credit pool applies to a given trainer
  const ptPool = (trainerId) => isHead(trainerId) ? "ptHead" : "ptCoach";
  const confirmBook = () => {
    const s = sheet;
    if (s.kind==="class") {
      if (payMode==="pass") { /* covered by active class pass — no deduction, no charge */ }
      else if (payMode==="credit") setCredits(c=>({...c, classes:c.classes-1}));
      else { const price=applyCoupon(CT[s.type].price);
        setLedger(l=>[{id:nid(), who:"Sam Lee", what:`Drop-in · ${CT[s.type].name}${coupon?` (${coupon.toUpperCase()})`:""}`, amt:Math.round(price), method:payMode==="paynow"?"PayNow":"Card", status:"paid", d:"Today"},...l]); }
      setMyClassBookings(b=>[...b, s.id]);
      ping(payMode==="pass"?`Booked — covered by your ${classPass?.label}`:payMode==="credit"?`Booked — ${credits.classes-1} class credits left`:"Paid & booked. WhatsApp confirmation sent.");
    } else if (s.kind==="pt") {
      const locLabel = s.loc==="other" ? (otherPlace||"Other spot") : null;
      const pool = ptPool(s.trainer);
      if (payMode==="credit") setCredits(c=>({...c, [pool]:c[pool]-1}));
      else setLedger(l=>[{id:nid(), who:"Sam Lee", what:`PT · ${tName(s.trainer)}${isHead(s.trainer)?" (Head Coach)":""}`, amt:PT_PRICE[s.trainer], method:payMode==="paynow"?"PayNow":"Card", status:"paid", d:"Today"},...l]);
      const bk = {id:nid(), day:s.day, time:s.time, trainer:s.trainer, loc:s.loc, otherLabel:locLabel, mode:payMode, pool};
      setMyPT(p=>[...p, bk]);
      if (s.loc!=="other") setPtBookings(pb=>[...pb, {id:bk.id, trainer:s.trainer, day:s.day, time:s.time, loc:s.loc, who:"Sam Lee"}]);
      else setSuggestedLocs(sl=> sl.includes(locLabel) ? sl : [...sl, locLabel]);
      ping(payMode==="credit"?`PT booked — ${credits[pool]-1} ${isHead(s.trainer)?"head-coach":"coach"} PT credits left`:"Paid & booked. See you there!");
    }
    setSheet(null); setCoupon(""); setCouponMsg(null); setOtherPlace("");
  };
  const cancelClass = (sid) => { setMyClassBookings(b=>b.filter(x=>x!==sid)); setCredits(c=>({...c, classes:c.classes+1})); ping("Cancelled — credit returned"); };
  const cancelPT = (id) => {
    const b = myPT.find(x=>x.id===id);
    setMyPT(p=>p.filter(x=>x.id!==id));
    setPtBookings(pb=>pb.filter(x=>x.id!==id));
    if (b.mode==="credit") setCredits(c=>({...c, [b.pool||"ptCoach"]:c[b.pool||"ptCoach"]+1}));
    ping("PT session cancelled" + (b.mode==="credit"?" — credit returned":"") + " — the freed slot (and any travel-buffer hold on it) is available again immediately");
  };
  // shop checkout — bug 1: route Buy through PayNow/Card, then apply the product
  const confirmShopBuy = () => {
    const p = shopSheet.product;
    const price = applyCoupon(p.price);
    if (p.kind==="classes") setCredits(c=>({...c, classes:c.classes+p.sessions}));
    else if (p.kind==="pthead") setCredits(c=>({...c, ptHead:c.ptHead+p.sessions}));
    else if (p.kind==="ptcoach") setCredits(c=>({...c, ptCoach:c.ptCoach+p.sessions}));
    else if (p.kind==="classpass") setClassPass({label:p.name, period:p.period, expires:`+${p.validity}d`});
    setLedger(l=>[{id:nid(), who:"Sam Lee", what:`${p.name}${coupon?` (${coupon.toUpperCase()})`:""}`, amt:Math.round(price), method:payMode==="card"?"Card":"PayNow", status:"paid", d:"Today"},...l]);
    ping(`${p.name} purchased — ${payMode==="card"?"card":"PayNow"} payment received`);
    setShopSheet(null); setCoupon(""); setCouponMsg(null);
  };
  const joinWaitlist = (sid) => { setMyWaitlist(w=>[...w,sid]); ping("Added to waitlist — we'll WhatsApp you if a spot opens"); };
  // Camp booking now opens a checkout (payment + kids waiver) instead of enrolling instantly.
  const startCamp = (campId) => {
    const c = camps.find(x=>x.id===campId);
    setCampSheet({ camp:c, pay:"paynow",
      waiver: c.type==="Kids" ? { child:"", ageBand:"10–12", emergency:"", accepted:false } : null });
    setCoupon(""); setCouponMsg(null);
  };
  const confirmCampBuy = () => {
    const c = campSheet.camp;
    const price = couponValue(c.price);
    setCamps(cs=>cs.map(x=>x.id!==c.id?x:{...x,spots:x.spots-1}));
    setMyCamps(m=>[...m, c.id]);
    setLedger(l=>[{id:nid(),who:"Sam Lee",what:c.name+(coupon?` (${coupon.toUpperCase()})`:""),amt:Math.round(price),method:campSheet.pay==="card"?"Card":"PayNow",status:"paid",d:"Today"},...l]);
    ping(`${c.name} booked — ${campSheet.pay==="card"?"card":"PayNow"} payment received${c.type==="Kids"?" · waiver on file":""}`);
    setCampSheet(null); setCoupon(""); setCouponMsg(null);
  };
  const cancelCamp = (campId) => {
    const c = camps.find(x=>x.id===campId);
    setMyCamps(m=>m.filter(x=>x!==campId));
    setCamps(cs=>cs.map(x=>x.id!==campId?x:{...x,spots:x.spots+1}));
    ping(`${c.name} cancelled — within the cancellation window, refund issued`);
  };

  const mark = (sid, name, status) => {
    setSessions(prev=>prev.map(s=>s.id!==sid?s:{...s, attendees:s.attendees.map(a=>a.name!==name?a:{...a,status})}));
    if (name==="Sam Lee" && status==="attended") {
      const s = sessions.find(x=>x.id===sid);
      setLogs(l=>[{id:nid(),d:"Today", title:`${CT[s.type].name} · ${locName(s.loc)}`, detail:"Tap + Log exercises to add detail", kind:"class"},...l]);
    }
    if (status==="no_show") {
      const s = sessions.find(x=>x.id===sid);
      setNoShowQueue(q=>[...q,{id:nid(), who:name, session:`${CT[s.type].name} · ${DAYS[s.day]} ${s.time} · ${locName(s.loc)}`, policy:"Forfeit 1 credit"}]);
    }
  };
  const markAll = (sid) => {
    const s = sessions.find(x=>x.id===sid);
    setSessions(prev=>prev.map(x=>x.id!==sid?x:{...x, attendees:x.attendees.map(a=>({...a,status:"attended"}))}));
    if (myClassBookings.includes(sid)) setLogs(l=>[{id:nid(),d:"Today", title:`${CT[s.type].name} · ${locName(s.loc)}`, detail:"Tap + Log exercises to add detail", kind:"class"},...l]);
    ping("All marked attended — client logs updated");
  };
  const resolveNoShow = (id, apply) => {
    setNoShowQueue(q=>q.filter(x=>x.id!==id));
    ping(apply? "No-show applied — credit forfeited (audited)" : "Waived — no deduction (audited)");
  };

  const addLocation = () => {
    if (!newLocName.trim()) return;
    const id = newLocName.trim().slice(0,3).toUpperCase()+nid();
    setLocations(ls=>[...ls, {id, name:newLocName.trim()}]);
    setNewLocName(""); ping(`${newLocName.trim()} added — bookable everywhere immediately`);
  };
  const promoteSuggested = (name) => {
    setLocations(ls=>[...ls, {id:name.slice(0,3).toUpperCase()+nid(), name}]);
    setSuggestedLocs(sl=>sl.filter(x=>x!==name));
    ping(`"${name}" saved as a real location`);
  };
  const addTimeOff = (entry) => { setTimeOff(t=>[...t, {...entry, id:nid(), active:true}]); ping("Time off saved — those slots stop showing as available"); setTimeOffSheet(null); };
  const removeTimeOff = (id) => { setTimeOff(t=>t.filter(x=>x.id!==id)); ping("Time off removed — availability restored"); };

  const daySessions = useMemo(()=>sessions.filter(s=>s.day===day && (loc==="all"||s.loc===loc)).sort((a,b)=>a.time.localeCompare(b.time)),[sessions,day,loc]);

  const ptCtx = { sessions, ptBookings, timeOff, shifts };
  // Per-trainer availability at the chosen location: free ranges (summary) + bookable slots.
  const ptByTrainer = useMemo(()=>{
    if (ptLoc==="all" || ptLoc==="other") return [];
    return ptTrainers.map(tid=>{
      const slots = ptSlotsFor(tid, day, ptLoc, travel, ptCtx, locName)
        .filter(sl=>!myPT.some(b=>b.day===sl.day&&b.time===sl.time&&b.trainer===sl.trainer));
      const { ranges, gaps } = ptRangesFor(tid, day, ptLoc, travel, ptCtx, locName);
      const working = !!workWindow(shifts, tid, day);
      return { trainer:tid, slots, ranges, gaps, working };
    });
  },[day,ptLoc,ptTrainers,myPT,locations,travel,sessions,ptBookings,timeOff,shifts]);

  const staffSessions = (tid)=>sessions.filter(s=>sessTrainers(s).includes(tid));
  const staffTimeOff = (tid)=>timeOff.filter(t=>t.trainer===tid && t.active!==false);
  const revenue = ledger.filter(l=>l.status==="paid").reduce((a,b)=>a+Math.max(0,b.amt),0);

  /* ============================ LOGIN ============================ */
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{background:T.ink, ...body}}>
      <style>{FONTS}</style>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{...disp,fontWeight:700,fontSize:52,lineHeight:1,color:T.paper}}>EXERCISE<span style={{color:T.accent}}>ONLY</span></div>
          <div className="text-xs mt-2 italic" style={{color:T.accent}}>Sore today, strong tomorrow.</div>
          <div className="text-sm mt-1" style={{color:"#B9B5A9"}}>{locations.map(l=>l.name).join(" · ")}</div>
        </div>
        {[
          ["client","Sam Lee","Client · class + PT credits"],
          ["trainer","Dylan","Trainer · Coach"],
          ["admin","Danny","Admin · Head Coach & Owner"],
        ].map(([role,name,sub])=>(
          <button key={role} onClick={()=>login(role)}
            className="w-full text-left rounded-2xl p-4 mb-3 flex items-center gap-4"
            style={{background:"#221F17", border:"1.5px solid #3A362B"}}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold"
              style={{...disp, fontSize:20, background:role==="admin"?T.accent:role==="trainer"?T.navy:T.moss, color:"#fff"}}>
              {name[0]}</div>
            <div className="flex-1">
              <div className="font-bold" style={{color:T.paper}}>{name}</div>
              <div className="text-xs" style={{color:"#B9B5A9"}}>{sub}</div>
            </div>
            <div style={{color:T.accent}} className="font-bold text-sm">LOG IN →</div>
          </button>
        ))}
        <div className="text-center text-xs mt-4" style={{color:"#6B675C"}}>Demo build — OTP login in production. Data resets on refresh.</div>
      </div>
    </div>
  );

  const isClient = user.role==="client";
  const isAdmin = user.role==="admin";
  const navItems = isClient
    ? [["home","Home"],["book","Book"],["log","Log"],["shop","Shop"],["account","Account"]]
    : isAdmin
    ? [["today","Today"],["schedule","Schedule"],["clients","Clients"],["camps","Camps"],["manage","Manage"]]
    : [["today","Today"],["schedule","Schedule"],["clients","Clients"],["me","Me"]];

  return (
    <div className="min-h-screen flex justify-center" style={{background:"#DEDACF", ...body, color:T.ink}}>
      <style>{FONTS}</style>
      <div className="w-full max-w-md min-h-screen flex flex-col relative" style={{background:T.paper}}>
        <header className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <div style={{...disp,fontWeight:700,fontSize:21,lineHeight:1}}>EXERCISE<span style={{color:T.accent}}>ONLY</span></div>
            <div className="text-xs" style={{color:T.muted}}>{user.name} · {isAdmin?"Admin":isClient?"Member":"Coach"} · Mon (demo)</div>
          </div>
          <button onClick={()=>setUser(null)} className="text-xs font-bold px-3 py-2 rounded-lg"
            style={{border:`1.5px solid ${T.line}`, color:T.muted}}>LOG OUT</button>
        </header>

        {/* ==================== CLIENT: HOME ==================== */}
        {isClient && tab==="home" && (
          <main className="flex-1 pb-24 px-5 space-y-3">
            <Card style={{background:T.ink, color:T.paper, border:"none"}}>
              <div className="text-xs" style={{color:"#B9B5A9"}}>PACK BALANCE</div>
              <div className="flex gap-5 mt-1 flex-wrap">
                <div><span style={{...disp,fontWeight:700,fontSize:34,color:T.accent}}>{credits.classes}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>class credits</span></div>
                <div><span style={{...disp,fontWeight:700,fontSize:34,color:T.accent}}>{credits.ptHead}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>PT · head coach</span></div>
                <div><span style={{...disp,fontWeight:700,fontSize:34,color:T.accent}}>{credits.ptCoach}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>PT · coach</span></div>
              </div>
              {classPass && <div className="text-xs mt-2 font-semibold" style={{color:"#8FD9B6"}}>✓ {classPass.label} active — classes covered</div>}
            </Card>
            <H>Upcoming</H>
            {myClassBookings.length===0 && myPT.length===0 && myCamps.length===0 && myWaitlist.length===0 && (
              <Card className="text-center"><div className="text-sm py-4" style={{color:T.muted}}>Nothing booked yet.</div>
                <Btn full onClick={()=>setTab("book")}>Book a session</Btn></Card>)}
            {myClassBookings.map(sid=>{ const s=sessions.find(x=>x.id===sid);
              return (
              <Card key={sid} className="flex items-center gap-3">
                <div style={{...disp,fontWeight:700,fontSize:22,minWidth:56}} className="text-right">{s.time}</div>
                <div className="flex-1"><div className="font-semibold text-sm">{CT[s.type].name} · {DAYS[s.day]}</div>
                  <div className="text-xs" style={{color:T.muted}}>{locName(s.loc)} · Coach {tName(s.trainer)}</div></div>
                <Btn kind="ghost" small onClick={()=>cancelClass(sid)}>Cancel</Btn>
              </Card>);})}
            {myPT.map(b=>(
              <Card key={b.id} className="flex items-center gap-3">
                <div style={{...disp,fontWeight:700,fontSize:22,minWidth:56}} className="text-right">{b.time}</div>
                <div className="flex-1"><div className="font-semibold text-sm">Personal Training · {DAYS[b.day]}</div>
                  <div className="text-xs" style={{color:T.muted}}>{b.loc==="other" ? b.otherLabel : locName(b.loc)} · Coach {tName(b.trainer)}</div></div>
                <Btn kind="ghost" small onClick={()=>cancelPT(b.id)}>Cancel</Btn>
              </Card>))}
            {myCamps.map(cid=>{ const c=camps.find(x=>x.id===cid); const canCancel=(c.startInDays??99)>CAMP_CANCEL_DAYS; return (
              <Card key={cid} className="flex items-center gap-3" style={{background:"#F3EEF5"}}>
                <div className="flex-1"><div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs" style={{color:T.plum}}>{c.dates} · {locName(c.loc)}{c.type==="Kids"?" · waiver on file":""}</div></div>
                {canCancel
                  ? <Btn kind="ghost" small onClick={()=>cancelCamp(cid)}>Cancel</Btn>
                  : <span className="text-xs" style={{color:T.muted}}>Cancellation closed<br/>(starts in {c.startInDays}d)</span>}
              </Card>);})}
            {myWaitlist.map(sid=>{ const s=sessions.find(x=>x.id===sid); return (
              <Card key={sid} className="flex items-center gap-3" style={{background:"#FBF3EC"}}>
                <div className="flex-1"><div className="font-semibold text-sm">Waitlisted · {CT[s.type].name} · {DAYS[s.day]} {s.time}</div>
                  <div className="text-xs" style={{color:T.accent}}>We'll WhatsApp you if a spot opens</div></div>
              </Card>);})}
            <div className="text-xs text-center pt-1" style={{color:T.muted}}>Free cancellation until 24h before. Inside 24h, message your coach.</div>
          </main>)}

        {/* ==================== CLIENT: BOOK ==================== */}
        {isClient && tab==="book" && (
          <main className="flex-1 pb-24">
            <div className="px-5 flex gap-2 pb-2 overflow-x-auto">
              {[["classes","Classes"],["pt","Personal Training"],["camps","Camps"]].map(([k,l])=>(
                <Chip key={k} active={seg===k} onClick={()=>setSeg(k)}>{l}</Chip>))}
            </div>
            {seg!=="camps" && <>
              <div className="px-5 flex gap-2 overflow-x-auto pt-1 pb-2">
                {DAYS.map((d,i)=><Chip key={d} active={day===i} onClick={()=>setDay(i)}>{d}</Chip>)}
              </div>
              <div className="px-5 pb-3 flex items-center gap-2">
                <span className="text-xs font-bold" style={{color:T.muted}}>LOCATION</span>
                {seg==="classes" ? (
                  <Select value={loc} onChange={setLoc}
                    options={[["all","All locations"], ...locations.map(l=>[l.id,l.name])]} />
                ) : (
                  <Select value={ptLoc} onChange={setPtLoc}
                    options={[...locations.map(l=>[l.id,l.name]), ["other","Other (type a place)"]]} />
                )}
              </div>
              {seg==="pt" && ptLoc==="other" && (
                <div className="px-5 pb-3">
                  <input value={otherPlace} onChange={e=>setOtherPlace(e.target.value)} placeholder="e.g. Poolside, East Coast Park"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <div className="text-xs mt-1.5" style={{color:T.muted}}>Danny can save this as a real location later if you train here often.</div>
                </div>)}
            </>}

            {seg==="classes" && <div className="px-5 space-y-3">
              {daySessions.length===0 && <div className="text-center py-12 text-sm" style={{color:T.muted}}>No classes here on {DAYS[day]}.</div>}
              {daySessions.map(s=>{ const ct=CT[s.type]; const n=booked(s); const full=n>=s.cap; const mine=myClassBookings.includes(s.id); const waited=myWaitlist.includes(s.id);
                return (
                <Card key={s.id} className="flex gap-3 items-center">
                  <div className="text-right" style={{minWidth:56}}>
                    <div style={{...disp,fontWeight:700,fontSize:24,lineHeight:1}}>{s.time}</div>
                    <div className="text-xs" style={{color:T.muted}}>{ct.dur}m</div></div>
                  <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:ct.color}}/>
                  <div className="flex-1">
                    <div style={{...disp,fontWeight:600,fontSize:17}}>{ct.name}</div>
                    <div className="text-xs mb-1" style={{color:T.muted}}>{locName(s.loc)} · Coach {tName(s.trainer)}</div>
                    <div className="text-xs mb-1.5" style={{color:T.muted}}>{ct.desc}</div>
                    <Ticks cap={s.cap} n={n}/></div>
                  <div className="text-right">
                    <div className="text-sm font-bold mb-1.5">${ct.price}</div>
                    {mine ? <span className="text-xs font-bold" style={{color:T.moss}}>BOOKED ✓</span> :
                     waited ? <span className="text-xs font-bold" style={{color:T.accent}}>WAITLISTED</span> :
                     full ? <Btn small kind="ghost" onClick={()=>joinWaitlist(s.id)}>Waitlist</Btn> :
                     <Btn small onClick={()=>{setSheet({kind:"class",...s}); setPayMode(classPass?"pass":credits.classes>0?"credit":"paynow");}}>Book</Btn>}
                  </div>
                </Card>);})}
            </div>}

            {seg==="pt" && <div className="px-5">
              <div className="flex gap-2 flex-wrap pb-3">
                {trainers.map(t=>(
                  <Chip key={t.id} active={ptTrainers.includes(t.id)}
                    onClick={()=>setPtTrainers(p=>p.includes(t.id)?p.filter(x=>x!==t.id):[...p,t.id])}>
                    {t.name}{t.id==="danny"?" ★":""}</Chip>))}
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>
                Coaches are bookable at <b>any</b> location during their shift — the times below already exclude
                classes they're teaching and add travel time when they'd be coming from another venue.
              </div>
              <div className="space-y-3">
                {ptLoc==="other" ? (
                  <Card>
                    <div className="text-sm mb-2" style={{color:T.muted}}>Ad-hoc spot — travel time can't be auto-checked, so pick a coach and set the exact time at checkout.</div>
                    <div className="flex flex-col gap-2">
                      {ptTrainers.map(tid=>(
                        <Btn key={tid} kind="ghost" onClick={()=>{setSheet({kind:"pt", trainer:tid, day, time:"10:00", loc:"other"}); setPayMode(credits[ptPool(tid)]>0?"credit":"paynow");}}
                          disabled={!otherPlace}>{tName(tid)}{isHead(tid)?" (Head Coach)":""} · {DAYS[day]} — set time at checkout</Btn>))}
                    </div>
                    {!otherPlace && <div className="text-xs mt-2" style={{color:T.accent}}>Type a place name above first.</div>}
                  </Card>
                ) : ptByTrainer.map(row=>(
                  <Card key={row.trainer}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm">Coach {tName(row.trainer)} {isHead(row.trainer) && <span className="text-xs" style={{color:T.accent}}>★ HEAD COACH</span>}</div>
                      <div className="text-sm font-bold">${PT_PRICE[row.trainer]}<span className="text-xs font-normal" style={{color:T.muted}}> /{PT_DUR}m</span></div>
                    </div>
                    {!row.working ? (
                      <div className="text-xs" style={{color:T.muted}}>Not on shift {DAYS[day]}.</div>
                    ) : (<>
                      <div className="text-xs mb-1" style={{color:T.moss}}>
                        Free at {locName(ptLoc)}: {row.ranges.length? row.ranges.join(", ") : "—"}
                      </div>
                      {row.gaps.length>0 && (
                        <div className="text-xs mb-2" style={{color:T.muted}}>
                          Busy: {row.gaps.map((g,i)=><span key={i}>{i>0?" · ":""}{g.from}–{g.to} ({g.why})</span>)}
                        </div>)}
                      {row.slots.length===0 ? (
                        <div className="text-xs" style={{color:T.muted}}>No open 45-min slot here on {DAYS[day]}.</div>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {row.slots.map((sl,i)=>(
                            <button key={i} onClick={()=>{setSheet({kind:"pt",...sl}); setPayMode(credits[ptPool(sl.trainer)]>0?"credit":"paynow");}}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold" style={{border:`1.5px solid ${sl.note?T.accent:T.line}`, color:sl.note?T.accent:T.ink}}
                              title={sl.note||""}>{sl.time}{sl.note?" ⏱":""}</button>))}
                        </div>)}
                    </>)}
                  </Card>
                ))}
              </div>
            </div>}

            {seg==="camps" && <div className="px-5 space-y-3 pt-1">
              {camps.map(c=>{ const joined=myCamps.includes(c.id); const open=campOpenId===c.id; return (
                <Card key={c.id} style={{background:"#F3EEF5"}}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.plum,color:"#fff"}}>{c.type.toUpperCase()} CAMP</span>
                  </div>
                  <div style={{...disp,fontWeight:700,fontSize:19}}>{c.name}</div>
                  <div className="text-xs mb-2" style={{color:T.muted}}>{c.dates} · {locName(c.loc)} · {c.spots}/{c.cap} spots left</div>
                  <button className="text-xs font-bold mb-2" style={{color:T.plum}} onClick={()=>setCampOpenId(open?null:c.id)}>
                    {open?"Hide":"View"} day-by-day itinerary {open?"▴":"▾"}</button>
                  {open && (
                    <div className="mb-3 space-y-1.5">
                      {c.days.map((d,i)=>(
                        <div key={i} className="text-xs rounded-lg p-2" style={{background:"#fff"}}>
                          <div className="font-bold mb-0.5">{d.label}</div>
                          {d.sessions.map((s,j)=>(
                            <div key={j} style={{color:T.muted}}>{s.start} · {s.activity} · Coach {tName(s.trainer)} · {s.hours}h</div>))}
                        </div>))}
                    </div>)}
                  <div className="flex items-center justify-between">
                    <div className="font-bold">${c.price}</div>
                    {joined ? <span className="text-xs font-bold" style={{color:T.moss}}>ENROLLED ✓</span> :
                      <Btn small kind="plum" disabled={c.spots<=0} onClick={()=>startCamp(c.id)}>{c.type==="Kids"?"Enrol child":"Book camp"}</Btn>}
                  </div>
                  {c.type==="Kids" && !joined && <div className="text-xs mt-2" style={{color:T.plum}}>Requires child's first name, age band, emergency contact & waiver at checkout.</div>}
                </Card>);})}
            </div>}
          </main>)}

        {/* ==================== CLIENT: LOG ==================== */}
        {isClient && tab==="log" && (
          <main className="flex-1 pb-24 px-5">
            <H>Training log</H>
            <Card className="mb-3" style={{background:"#EFF3EE"}}>
              <div className="text-xs font-bold mb-1" style={{color:T.moss}}>STATS · coach-tracked</div>
              <div className="flex gap-6">
                <div><span style={{...disp,fontWeight:700,fontSize:28}}>{measurements[measurements.length-1].weight}</span><span className="text-xs" style={{color:T.muted}}> kg</span></div>
                <div><span style={{...disp,fontWeight:700,fontSize:28}}>{measurements[measurements.length-1].fat}</span><span className="text-xs" style={{color:T.muted}}> % fat</span></div>
                <div className="text-xs self-end pb-1" style={{color:T.moss}}>▾ {(measurements[0].fat-measurements[measurements.length-1].fat).toFixed(1)}% since 1 Jul</div>
              </div>
            </Card>
            {/* Personal records — auto-computed max weight per exercise from logged sets */}
            {(() => {
              const prs = {};
              logs.forEach(l => (l.sets||[]).forEach(s => { if (s.w > (prs[s.ex]?.w ?? -1)) prs[s.ex] = { w:s.w, reps:s.reps, d:l.d }; }));
              const prList = Object.entries(prs).sort((a,b)=>b[1].w-a[1].w);
              const allEx = [...new Set(logs.flatMap(l=>(l.sets||[]).map(s=>s.ex)))];
              const series = logs.filter(l=>l.sets?.some(s=>s.ex===progEx)).slice().reverse()
                .map(l=>({ w:Math.max(...l.sets.filter(s=>s.ex===progEx).map(s=>s.w)), d:l.d }));
              const maxW = Math.max(1,...series.map(s=>s.w));
              return (<>
                {prList.length>0 && (
                  <Card className="mb-3" style={{background:"#FBF3EC"}}>
                    <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>PERSONAL RECORDS 🏆</div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                      {prList.slice(0,6).map(([ex,pr])=>(
                        <div key={ex} className="text-sm"><span className="font-bold">{pr.w}kg</span> <span className="text-xs" style={{color:T.muted}}>{ex}</span></div>))}
                    </div>
                  </Card>)}
                <Card className="mb-3" style={{background:"#EEF1F6"}}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-bold" style={{color:T.navy}}>EXERCISE PROGRESS · top set per session</div>
                    <select value={progEx} onChange={e=>setProgEx(e.target.value)} className="text-xs font-semibold px-2 py-1 rounded-lg outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}>
                      {allEx.map(ex=><option key={ex} value={ex}>{ex}</option>)}
                    </select>
                  </div>
                  {series.length===0 ? <div className="text-xs" style={{color:T.muted}}>No logged sets for {progEx} yet.</div> : (
                    <div className="flex items-end gap-3">
                      {series.map((s,i)=>(
                        <div key={i} className="text-center">
                          <div className="rounded-t" style={{width:26,height:20+s.w/maxW*60,background:T.navy}}/>
                          <div className="text-[10px] mt-1" style={{color:T.muted}}>{s.w}kg</div>
                          <div className="text-[9px]" style={{color:T.muted}}>{s.d}</div>
                        </div>))}
                    </div>)}
                </Card>
              </>);
            })()}
            <div className="space-y-2">
              {logs.map((l)=>(
                <Card key={l.id||l.title+l.d}>
                  <div className="flex justify-between items-center" onClick={()=>l.sets && setLogOpen(logOpen===l.id?null:l.id)}>
                    <div><div className="font-semibold text-sm">{l.title}</div>
                      <div className="text-xs" style={{color:T.muted}}>{l.detail}</div></div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold" style={{color:T.muted}}>{l.d}</div>
                      {l.sets && <span className="text-xs" style={{color:T.navy}}>{logOpen===l.id?"▴":"▾"}</span>}
                    </div>
                  </div>
                  {l.sets && logOpen===l.id && (
                    <div className="mt-3 pt-3 space-y-1.5" style={{borderTop:`1.5px solid ${T.line}`}}>
                      {l.sets.map((s,i)=>(
                        <div key={i} className="flex justify-between text-sm">
                          <span>{s.ex} <span style={{color:T.muted}}>· {s.muscle}</span></span>
                          <span className="font-semibold">{s.reps} @ {s.w}kg{s.rpe?<span className="text-xs font-normal" style={{color:T.muted}}> · RPE {s.rpe}</span>:null}</span>
                        </div>))}
                      <div className="pt-2"><Btn small full kind="ghost" onClick={()=>{setLogSheet({sets:l.sets.map(s=>({...s})), label:l.title}); ping("Pre-filled from last session — adjust and log today's actuals");}}>Repeat this session</Btn></div>
                    </div>)}
                </Card>))}
            </div>
            {myClassBookings.length>0 && (
              <Card className="mt-3" style={{background:"#FBF3EC"}}>
                <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>RATE YOUR LAST CLASS</div>
                <div className="text-sm mb-2">{CT[sessions.find(s=>s.id===myClassBookings[myClassBookings.length-1])?.type]?.name}</div>
                <Stars value={ratings[myClassBookings[myClassBookings.length-1]]||0}
                  onRate={(n)=>{setRatings(r=>({...r,[myClassBookings[myClassBookings.length-1]]:n})); ping("Thanks for the rating!");}}/>
              </Card>)}
            <div className="mt-3 flex gap-2">
              <Btn full kind="ghost" onClick={()=>setLogSheet({sets:[], label:"Workout"})}>+ Log exercises</Btn>
              <Btn full kind="ghost" onClick={()=>{setLogs(l=>[{id:nid(),d:"Today",title:"Personal workout",detail:"Zone 2 run · 6km",kind:"self"},...l]); ping("Personal entry added");}}>+ Quick note</Btn>
            </div>
          </main>)}

        {/* ==================== CLIENT: SHOP ==================== */}
        {isClient && tab==="shop" && (
          <main className="flex-1 pb-24 px-5">
            <H>Packages & offers</H>
            {(() => {
              const groups = [
                ["Class credit packs", products.filter(p=>p.active&&p.kind==="classes")],
                ["Class passes — unlimited within the period", products.filter(p=>p.active&&p.kind==="classpass")],
                ["Personal training", products.filter(p=>p.active&&(p.kind==="pthead"||p.kind==="ptcoach"))],
              ];
              return groups.map(([label, list]) => list.length===0 ? null : (
                <div key={label} className="mb-4">
                  <Sub>{label.toUpperCase()}</Sub>
                  <div className="space-y-3">
                    {list.map(p=>(
                      <Card key={p.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-sm">{p.name}</div>
                          <div className="text-xs" style={{color:T.muted}}>
                            {p.kind==="classpass"
                              ? `Unlimited classes for ${p.validity===1?"1 day":p.validity===7?"7 days":"30 days"}`
                              : `${p.sessions} sessions · valid ${p.validity} days`}
                            {p.kind==="pthead" ? " · head coach only" : p.kind==="ptcoach" ? " · any coach (not Danny)" : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${p.price}</div>
                          <Btn small onClick={()=>{setShopSheet({product:p}); setPayMode("paynow"); setCoupon(""); setCouponMsg(null);}}>Buy</Btn>
                        </div>
                      </Card>))}
                  </div>
                </div>));
            })()}
            <div className="text-xs" style={{color:T.muted}}>Coupon codes are applied at checkout. Price changes never affect packs you've already bought.</div>
          </main>)}

        {/* ==================== CLIENT: ACCOUNT ==================== */}
        {isClient && tab==="account" && (
          <main className="flex-1 pb-24 px-5 space-y-3">
            <H>Account</H>
            <Card><div className="font-bold">Sam Lee</div><div className="text-xs" style={{color:T.muted}}>+65 9XXX XXXX · sam@email.com · OTP login</div></Card>
            <Card style={{background:T.ink,color:T.paper,border:"none"}}>
              <div className="text-xs font-bold mb-1" style={{color:"#B9B5A9"}}>REFER A FRIEND</div>
              <div className="flex items-center justify-between">
                <span style={{...disp,fontWeight:700,fontSize:20,color:T.accent}}>{referralCode}</span>
                <Btn small kind="ghost" onClick={()=>ping("Referral link copied — share on WhatsApp or Instagram")}>Share</Btn>
              </div>
              <div className="text-xs mt-1.5" style={{color:"#B9B5A9"}}>{referralUses} friend joined · you both get 1 free class credit when they book their first session.</div>
            </Card>
            <Card><div className="text-xs font-bold mb-2" style={{color:T.muted}}>MY PACKS</div>
              <div className="text-sm">Class pack — {credits.classes} credits left · expires 20 Sep</div>
              <div className="text-sm">PT pack (head coach) — {credits.ptHead} left · expires 5 Oct</div>
              <div className="text-sm">PT pack (coach) — {credits.ptCoach} left · expires 5 Oct</div>
              {classPass && <div className="text-sm" style={{color:T.moss}}>{classPass.label} — active, unlimited classes</div>}</Card>
            <Card><div className="text-xs font-bold mb-2" style={{color:T.muted}}>RECENT PAYMENTS</div>
              {ledger.filter(l=>l.who==="Sam Lee").slice(0,4).map(l=>(
                <div key={l.id} className="flex justify-between text-sm py-1"><span>{l.what}</span><span className="font-bold">${l.amt}</span></div>))}
              {ledger.filter(l=>l.who==="Sam Lee").length===0 && <div className="text-sm" style={{color:T.muted}}>No payments yet in this demo.</div>}
            </Card>
            <Card className="flex justify-between items-center"><div className="text-sm">Marketing messages</div>
              <span className="text-xs font-bold" style={{color:T.muted}}>OPT-IN OFF ▢</span></Card>
            <Card style={{background:"#EFF3EE"}} className="flex items-center justify-between">
              <div><div className="font-semibold text-sm">Message your coach</div>
                <div className="text-xs" style={{color:T.muted}}>In-app chat · or WhatsApp +65 8100 6608</div></div>
              <Btn small kind="dark" onClick={()=>setChatOpen(true)}>Chat</Btn>
            </Card>
            <div className="text-xs text-center" style={{color:T.muted}}>Privacy policy · Request account deletion</div>
          </main>)}

        {/* ==================== TRAINER / ADMIN: TODAY ==================== */}
        {!isClient && tab==="today" && (
          <main className="flex-1 pb-24 px-5">
            <H>{isAdmin?"Today — all coaches":"Today — my sessions"}</H>
            <div className="space-y-3">
              {sessions.filter(s=>s.day===TODAY && (isAdmin || sessTrainers(s).includes(user.id))).sort((a,b)=>a.time.localeCompare(b.time)).map(s=>{
                const ct=CT[s.type]; const n=booked(s);
                const att=[...s.attendees, ...(myClassBookings.includes(s.id)?[{name:"Sam Lee",status:s.attendees.find(a=>a.name==="Sam Lee")?.status||"confirmed"}]:[])];
                return (
                <Card key={s.id}>
                  <div className="flex items-center gap-3">
                    <div style={{...disp,fontWeight:700,fontSize:24,minWidth:56}} className="text-right">{s.time}</div>
                    <div style={{width:3,height:34,borderRadius:2,background:ct.color}}/>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{ct.name} · {locName(s.loc)} {s.done && <span className="text-xs" style={{color:T.moss}}>· DONE ✓</span>}</div>
                      <div className="text-xs" style={{color:T.muted}}>Coach {tName(s.trainer)} · {n}/{s.cap} booked</div></div>
                    <div className="flex flex-col gap-1">
                      <Btn small kind="ghost" onClick={()=>setRosterOpen(rosterOpen===s.id?null:s.id)}>{rosterOpen===s.id?"Hide":"Roster"}</Btn>
                      {!s.done && <Btn small kind="dark" onClick={()=>setDoneSheet({kind:"class", id:s.id, trainer:s.trainer, label:`${ct.name} · ${locName(s.loc)}`, incLabel:"", incAmt:""})}>Complete</Btn>}
                    </div>
                  </div>
                  {rosterOpen===s.id && (
                    <div className="mt-3 pt-3" style={{borderTop:`1.5px solid ${T.line}`}}>
                      {att.map(a=>(
                        <div key={a.name} className="flex items-center justify-between py-1.5">
                          <span className="text-sm">{a.name}{a.name==="Sam Lee" && <span className="text-xs" style={{color:T.accent}}> · demo client</span>}</span>
                          {a.status==="attended" ? <span className="text-xs font-bold" style={{color:T.moss}}>ATTENDED ✓</span> :
                           a.status==="no_show" ? <span className="text-xs font-bold" style={{color:T.accent}}>NO-SHOW · pending admin</span> :
                          <div className="flex gap-1.5">
                            <button onClick={()=>mark(s.id,a.name,"attended")} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:"#EFF3EE",color:T.moss}}>✓</button>
                            <button onClick={()=>mark(s.id,a.name,"no_show")} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:"#F7EEE9",color:T.accent}}>✗</button>
                          </div>}
                        </div>))}
                      <div className="mt-2"><Btn small full kind="dark" onClick={()=>markAll(s.id)}>Mark all attended</Btn></div>
                    </div>)}
                </Card>);})}
            </div>
          </main>)}

        {/* ==================== TRAINER / ADMIN: SCHEDULE ==================== */}
        {!isClient && tab==="schedule" && (
          <main className="flex-1 pb-24 px-5">
            <H>{isAdmin?"Master schedule":"My week & availability"}</H>
            {(isAdmin?trainers:trainers.filter(t=>t.id===user.id)).map(t=>{
              const myPtToday = ptBookings.filter(b=>b.trainer===t.id && b.day===TODAY && b.status!=="cancelled");
              return (
              <div key={t.id} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold" style={{color:T.muted}}>{t.name.toUpperCase()} · {staffSessions(t.id).length} SESSIONS/WK</div>
                  {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setMoveDay({trainer:t.id})}>Running late</Btn>}
                </div>
                <div className="space-y-2">
                  {staffSessions(t.id).sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time)).map(s=>(
                    <Card key={s.id} className="flex items-center gap-3 !p-3">
                      <span style={{...disp,fontWeight:700,fontSize:16,minWidth:70}}>{DAYS[s.day]} {s.time}</span>
                      <span className="flex-1 text-sm">{CT[s.type].name} · {locName(s.loc)}
                        {sessTrainers(s).length>1 && <span className="text-xs" style={{color:T.navy}}> · +{sessTrainers(s).length-1} coach</span>}</span>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setMoveSheet({kind:"class", id:s.id, day:s.day, time:s.time, trainer:s.trainer, loc:s.loc, label:CT[s.type].name})}>Move</Btn>}
                    </Card>))}
                  {myPtToday.length>0 && myPtToday.map(b=>(
                    <Card key={b.id} className="flex items-center gap-3 !p-3" style={{background:"#EEF1F6"}}>
                      <span style={{...disp,fontWeight:700,fontSize:16,minWidth:70}}>{DAYS[b.day]} {b.time}</span>
                      <span className="flex-1 text-sm">PT · {b.who} · {locName(b.loc)}</span>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setMoveSheet({kind:"pt", id:b.id, day:b.day, time:b.time, trainer:b.trainer, loc:b.loc, label:`PT · ${b.who}`})}>Move</Btn>}
                    </Card>))}
                  <Card className="!p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold" style={{color:T.navy}}>PT SHIFT HOURS · bookable at any location</div>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setShiftEditor({trainer:t.id})}>Edit</Btn>}
                    </div>
                    {[0,1,2,3,4,5,6].some(d=>shifts[t.id]?.[d]) ? (
                      <div className="text-sm py-0.5">{[0,1,2,3,4,5,6].filter(d=>shifts[t.id]?.[d]).map(d=>`${DAYS[d]} ${shifts[t.id][d][0]}–${shifts[t.id][d][1]}`).join(" · ")}</div>
                    ) : <div className="text-sm py-0.5" style={{color:T.muted}}>No PT shift set.</div>}
                    <div className="text-xs mt-1" style={{color:T.muted}}>Weekly-recurring; hours can differ per day (e.g. weekends). Repeats every week until edited.</div>
                  </Card>
                  <Card className="!p-3" style={{background:"#FBF3EC"}}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold" style={{color:T.accent}}>TIME OFF</div>
                      {(isAdmin || t.id===user.id) && <Btn small kind="ghost" onClick={()=>setTimeOffSheet({trainer:t.id})}>+ Add</Btn>}
                    </div>
                    {staffTimeOff(t.id).length===0 && <div className="text-sm" style={{color:T.muted}}>None set — fully available per their windows.</div>}
                    {staffTimeOff(t.id).map(to=>{ const overridden=(to.overrides||[]).includes(TODAY); return (
                      <div key={to.id} className="flex items-center justify-between py-1 gap-2">
                        <span className="text-sm flex-1">
                          {to.scope==="weekly" ? `Every ${DAYS[to.day]}` : `${DAYS[to.day]} (one-off)`} · {to.allDay?"All day":`${to.start}–${to.end}`}
                          {to.reason && <span style={{color:T.muted}}> · {to.reason}</span>}
                          {overridden && <span className="font-bold" style={{color:T.moss}}> · working today ✓</span>}
                        </span>
                        {to.day===TODAY && <button className="text-xs font-bold" style={{color:T.moss}}
                          onClick={()=>{setTimeOff(ts=>ts.map(x=>x.id!==to.id?x:{...x, overrides: overridden ? (x.overrides||[]).filter(d=>d!==TODAY) : [...(x.overrides||[]),TODAY]})); ping(overridden?"Override removed":"Override — you're available today despite this time off");}}>
                          {overridden?"Undo":"Work today"}</button>}
                        <button className="text-xs font-bold" style={{color:T.muted}} onClick={()=>removeTimeOff(to.id)}>Remove</button>
                      </div>);})}
                  </Card>
                </div>
              </div>);})}
          </main>)}

        {/* ==================== TRAINER / ADMIN: CLIENTS ==================== */}
        {!isClient && tab==="clients" && (
          <main className="flex-1 pb-24 px-5">
            <H>Clients</H>
            {["Sam Lee","Ben","Cheryl","Priya","Kumar","Elaine"].map(n=>(
              <Card key={n} className="mb-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{background:T.line}}>{n[0]}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{n}</div>
                  <div className="text-xs" style={{color:T.muted}}>{n==="Sam Lee"?`${credits.classes} class + ${credits.ptHead+credits.ptCoach} PT credits`:"Active member"}</div></div>
                <div className="flex gap-1.5">
                  <Btn small kind="ghost" onClick={()=>setMeasForm({who:n, weight:"", fat:""})}>+ Stats</Btn>
                  <Btn small kind="ghost" onClick={()=>setIntakeForm({who:n})}>+ Intake</Btn>
                </div>
              </Card>))}
            <div className="text-xs mt-2" style={{color:T.muted}}>
              {isAdmin?"Admin: create / import (CSV) / deactivate clients from Manage → People.":"Trainers see clients from their own sessions. Payment amounts hidden."}
            </div>
          </main>)}

        {!isClient && !isAdmin && tab==="me" && (() => {
          const me = trainers.find(t=>t.id===user.id) || {name:user.name, bio:""};
          const myPerm = perm[user.id] || {};
          const myRate = rates[user.id];
          const shiftDays = [0,1,2,3,4,5,6].filter(d=>shifts[user.id]?.[d]);
          return (
          <main className="flex-1 pb-24 px-5 space-y-3">
            <H>Me</H>
            <Card><div className="font-bold">{me.name}</div><div className="text-xs" style={{color:T.muted}}>{me.tag||"Coach"}</div>
              {me.bio && <div className="text-xs mt-2" style={{color:T.muted}}>{me.bio}</div>}</Card>
            <Card><div className="text-xs font-bold mb-1" style={{color:T.muted}}>THIS WEEK</div>
              <div className="text-sm">{staffSessions(user.id).length} sessions · PT shift {shiftDays.length? shiftDays.map(d=>`${DAYS[d]} ${shifts[user.id][d][0]}–${shifts[user.id][d][1]}`).join(" · ") : "not set"}</div>
              <div className="text-xs mt-1" style={{color:T.muted}}>Bookable for PT at any location during shift hours.</div></Card>
            <Card><div className="text-xs font-bold mb-1" style={{color:T.muted}}>EARNINGS</div>
              <div className="text-sm" style={{color:T.muted}}>{myPerm.earnings
                ? (myRate?.type==="salary" ? `Salary $${myRate.monthly}/mo` : `${staffSessions(user.id).length} classes + ${ptBookings.filter(b=>b.trainer===user.id).length} PT this week`)
                : "Hidden — enabled by admin per trainer"}</div></Card>
            <div className="text-xs text-center" style={{color:T.muted}}>Permissions set by Danny (admin). Currently: attendance ✓, availability ✓, edit descriptions {myPerm.editDesc?"✓":"✗"}.</div>
          </main>);})()}

        {/* ==================== ADMIN: CAMPS (builder) ==================== */}
        {isAdmin && tab==="camps" && (
          <main className="flex-1 pb-24 px-5">
            <div className="flex items-center justify-between mb-3">
              <H>Camps</H>
              <Btn small onClick={()=>setCampBuilder({name:"", type:"Kids", loc:locations[0]?.id, price:"", cap:"", dates:"", days:[]})}>+ New camp</Btn>
            </div>
            <div className="text-xs mb-3" style={{color:T.muted}}>Build day by day — each day can hold more than one activity block, with its own coach, start time and duration. Assigned coaches see these in their normal Today/Schedule view.</div>
            <div className="space-y-3">
              {camps.map(c=>(
                <Card key={c.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{c.name}</div>
                      <div className="text-xs" style={{color:T.muted}}>{c.type} · {c.dates} · {locName(c.loc)} · ${c.price} · {c.days.length} day{c.days.length!==1?"s":""} built</div>
                    </div>
                    <Btn small kind="ghost" onClick={()=>setCampBuilder(JSON.parse(JSON.stringify(c)))}>Edit</Btn>
                  </div>
                  <div className="mt-2 space-y-1">
                    {c.days.map((d,i)=>(
                      <div key={i} className="text-xs" style={{color:T.muted}}>
                        <span className="font-bold" style={{color:T.ink}}>{d.label}:</span>{" "}
                        {d.sessions.map(s=>`${s.activity} (${tName(s.trainer)}, ${s.start}, ${s.hours}h)`).join(" · ") || "no sessions yet"}
                      </div>))}
                  </div>
                </Card>))}
            </div>
          </main>)}

        {/* ==================== ADMIN: MANAGE ==================== */}
        {isAdmin && tab==="manage" && (
          <main className="flex-1 pb-24 px-5">
            <div className="flex gap-2 overflow-x-auto pb-3">
              {[["dash","Dashboard"],["people","People"],["products","Products"],["money","Money"],["settings","Settings"]].map(([k,l])=>(
                <Chip key={k} active={adminSec===k} onClick={()=>setAdminSec(k)}>{l}</Chip>))}
            </div>

            {adminSec==="dash" && (() => {
              // weekly trainer payout/cost from rates (per-class/PT or salary)
              const payoutFor = (tid) => {
                const rt = rates[tid]; if(!rt) return 0;
                if (rt.type==="salary") return Math.round(rt.monthly/4.33);
                const classes = staffSessions(tid).length;
                const pts = ptBookings.filter(b=>b.trainer===tid && b.status!=="cancelled").length;
                return classes*rt.perClass + pts*rt.perPt;
              };
              const payouts = trainers.map(t=>({t, amt:payoutFor(t.id)}));
              const totalPayout = payouts.reduce((a,b)=>a+b.amt,0);
              const approvedInc = incidentals.filter(i=>i.status==="approved").reduce((a,b)=>a+b.amt,0);
              const profit = revenue - totalPayout - approvedInc;
              return (
              <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["$"+revenue,"Revenue (wk)"],[sessions.length,"Sessions (wk)"],["87%","Attendance"],["2","Packs expiring"]].map(([v,l])=>(
                  <Card key={l}><div style={{...disp,fontWeight:700,fontSize:28}}>{v}</div><div className="text-xs" style={{color:T.muted}}>{l}</div></Card>))}
              </div>
              <Card style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="text-xs font-bold mb-2" style={{color:"#B9B5A9"}}>REVENUE vs COST (this week)</div>
                <div className="flex justify-between text-sm"><span>Revenue collected</span><span className="font-bold" style={{color:"#8FD9B6"}}>${revenue}</span></div>
                <div className="flex justify-between text-sm"><span>Trainer payout (est.)</span><span className="font-bold" style={{color:T.accent}}>-${totalPayout}</span></div>
                {approvedInc>0 && <div className="flex justify-between text-sm"><span>Approved incidentals</span><span className="font-bold" style={{color:T.accent}}>-${approvedInc}</span></div>}
                <div className="flex justify-between text-sm mt-1 pt-1" style={{borderTop:"1px solid #3A362B"}}><span className="font-bold">Gross margin</span><span className="font-bold">${profit}</span></div>
                <div className="mt-2 space-y-0.5">
                  {payouts.map(({t,amt})=>(
                    <div key={t.id} className="flex justify-between text-xs" style={{color:"#B9B5A9"}}>
                      <span>{t.name} · {rates[t.id]?.type==="salary"?"salary":`${staffSessions(t.id).length} cls + ${ptBookings.filter(b=>b.trainer===t.id).length} PT`}</span><span>${amt}</span></div>))}
                </div>
                <div className="text-xs mt-2" style={{color:"#6B675C"}}>Payout est. from each coach's rate (per-class/PT or salary). Actual payout runs in Money → payouts.</div>
              </Card>
              <Card style={{background:"#F3EEF5"}}>
                <div className="text-xs font-bold" style={{color:T.plum}}>LEAD FUNNEL</div>
                <div className="flex gap-4 mt-1">
                  {["new","contacted","trial booked"].map(st=>(
                    <div key={st}><span style={{...disp,fontWeight:700,fontSize:22}}>{leads.filter(l=>l.status===st).length}</span>
                      <div className="text-xs" style={{color:T.muted}}>{st}</div></div>))}
                </div>
              </Card>
              {noShowQueue.length>0 && (
                <Card style={{background:"#F7EEE9"}}>
                  <div className="text-xs font-bold mb-1" style={{color:T.accent}}>NO-SHOW DECISIONS PENDING ({noShowQueue.length})</div>
                  <div className="text-sm">Go to Money → No-shows to waive or apply.</div>
                </Card>)}
              <Card style={{background:"#F7EEE9"}}>
                <div className="text-xs font-bold" style={{color:T.accent}}>ALERTS</div>
                <div className="text-sm mt-1">· Wed 06:30 Strength @ Meyer Park has 1 booking — consider auto-cancel rule</div>
                <div className="text-sm">· Priya's 10-pack expires in 6 days (3 unused)</div>
              </Card>
            </div>); })()}

            {adminSec==="people" && <div className="space-y-3">
              <div className="text-xs font-bold" style={{color:T.muted}}>LEADS · enquiry, Instagram & referrals</div>
              {leads.map(l=>(
                <Card key={l.id} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{l.name}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.line}}>{l.source}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{color:T.muted}}>{l.note}</div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {["new","contacted","trial booked","converted"].map(st=>(
                      <button key={st} onClick={()=>setLeads(ls=>ls.map(x=>x.id!==l.id?x:{...x,status:st}))}
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{background:l.status===st?T.plum:"transparent", color:l.status===st?"#fff":T.muted, border:`1px solid ${l.status===st?T.plum:T.line}`}}>{st}</button>))}
                  </div>
                </Card>))}
              <Btn full kind="ghost" onClick={()=>ping("Instagram booking link — opens this same flow from your bio/stories")}>View Instagram booking link</Btn>
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>TRAINERS · rate + permissions</div>
              {trainers.filter(t=>!t.admin).map(t=>{ const rt=rates[t.id]; return (
                <Card key={t.id}>
                  <div className="flex items-center justify-between">
                    <div><div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs" style={{color:T.muted}}>{t.tag} · {rt ? (rt.type==="salary" ? `$${rt.monthly}/mo salary` : `$${rt.perClass}/class · $${rt.perPt}/PT`) : "rate not set"}</div></div>
                    <div className="flex gap-1.5">
                      <Btn small kind="ghost" onClick={()=>setAddTrainer({editId:t.id, name:t.name, phone:t.phone||"", payType:rt?.type||"per_class", perClass:rt?.perClass||"", perPt:rt?.perPt||"", monthly:rt?.monthly||""})}>Edit</Btn>
                      <Btn small kind="ghost" onClick={()=>setPermOpen(permOpen===t.id?null:t.id)}>Perms</Btn>
                      <Btn small kind="ghost" onClick={()=>ping(`${t.name} deactivated (demo) — sessions need reassignment`)}>Off</Btn>
                    </div>
                  </div>
                  {permOpen===t.id && (
                    <div className="mt-3 pt-3 space-y-2" style={{borderTop:`1.5px solid ${T.line}`}}>
                      {[["editDesc","Edit class descriptions"],["cancel","Cancel booked sessions"],["earnings","See own earnings"],["manageLocations","Add locations"]].map(([k,l])=>(
                        <button key={k} className="w-full flex justify-between items-center py-1"
                          onClick={()=>setPerm(p=>({...p,[t.id]:{...(p[t.id]||{}),[k]:!(p[t.id]||{})[k]}}))}>
                          <span className="text-sm">{l}</span>
                          <span className="text-xs font-bold" style={{color:(perm[t.id]||{})[k]?T.moss:T.muted}}>{(perm[t.id]||{})[k]?"ON ●":"OFF ○"}</span>
                        </button>))}
                    </div>)}
                </Card>);})}
              <Btn full kind="ghost" onClick={()=>setAddTrainer({name:"",phone:"",payType:"per_class",perClass:"",perPt:"",monthly:""})}>+ Add trainer</Btn>
              <Btn full kind="ghost" onClick={()=>ping("CSV import — map columns, PDPA consent requested on first login")}>Import clients (CSV)</Btn>
            </div>}

            {adminSec==="products" && <div className="space-y-3">
              <div className="text-xs font-bold" style={{color:T.muted}}>PACKS & MEMBERSHIPS</div>
              {products.map(p=>(
                <Card key={p.id} className="flex items-center gap-3">
                  <div className="flex-1"><div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs" style={{color:T.muted}}>${p.price} · {p.kind}{p.sessions?` · ${p.sessions} sessions`:""}</div></div>
                  <button onClick={()=>setProducts(ps=>ps.map(x=>x.id!==p.id?x:{...x,active:!x.active}))}
                    className="text-xs font-bold" style={{color:p.active?T.moss:T.muted}}>{p.active?"ACTIVE ●":"HIDDEN ○"}</button>
                  <button onClick={()=>{ setProducts(ps=>ps.filter(x=>x.id!==p.id)); ping(`${p.name} deleted`); }}
                    className="text-xs font-bold px-1.5 py-1 rounded" style={{color:T.accent,border:`1.5px solid ${T.line}`}}>Delete</button>
                </Card>))}
              <div className="text-xs" style={{color:T.muted}}>Deactivate hides a pack from the shop but keeps already-purchased ones valid. Delete removes it entirely.</div>
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>COUPONS</div>
              {Object.entries(COUPONS).map(([code,c])=>(
                <Card key={code} className="flex items-center gap-3 !p-3">
                  <div className="flex-1"><div className="font-semibold text-sm">{code}</div>
                    <div className="text-xs" style={{color:T.muted}}>{c.label}</div></div>
                  <span className="text-xs font-bold" style={{color:T.moss}}>ACTIVE ●</span>
                </Card>))}
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>REFERRAL REWARD</div>
              <Card className="!p-3"><div className="text-sm">1 free class credit — both referrer & referee, on referee's first paid booking.</div></Card>

              <div className="flex items-center justify-between pt-3">
                <div className="text-xs font-bold" style={{color:T.muted}}>CLASS TEMPLATES · reusable weekly timetables</div>
                <Btn small onClick={()=>setTemplateBuilder({name:"", blocks:[]})}>+ New</Btn>
              </div>
              {classTemplates.map(tpl=>(
                <Card key={tpl.id} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{tpl.name}</div>
                      <div className="text-xs" style={{color:T.muted}}>{tpl.blocks.length} class blocks/week</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Btn small kind="ghost" onClick={()=>setTemplateBuilder(JSON.parse(JSON.stringify(tpl)))}>Edit</Btn>
                      <Btn small kind="ghost" onClick={()=>{
                        const clone = {id:nid(), name:tpl.name+" (copy)", blocks:tpl.blocks.map(b=>({...b}))};
                        setClassTemplates(ts=>[...ts,clone]); ping(`Cloned "${tpl.name}" — edit and rename the copy`);}}>Clone</Btn>
                      <Btn small onClick={()=>ping(`"${tpl.name}" applied — sessions generated for upcoming weeks`)}>Apply</Btn>
                    </div>
                  </div>
                </Card>))}

              <Btn full kind="ghost" onClick={()=>ping("New product — pack / membership / coupon code")}>+ Add pack, membership or coupon</Btn>
              <div className="text-xs" style={{color:T.muted}}>Price changes never affect already-purchased packs. Template edits only affect future-generated sessions.</div>
            </div>}

            {adminSec==="money" && <div className="space-y-3">
              <Card style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="text-xs" style={{color:"#B9B5A9"}}>PAYMENT METHODS</div>
                <div className="text-sm mt-1">PayNow (UEN linked) ✓ · Card via Stripe ✓ · Cash ✓</div>
              </Card>
              {incidentals.filter(i=>i.status==="pending").length>0 && (
                <>
                  <div className="text-xs font-bold" style={{color:T.accent}}>INCIDENTALS · trainer-submitted, awaiting your approval</div>
                  {incidentals.filter(i=>i.status==="pending").map(i=>(
                    <Card key={i.id} style={{background:"#F7EEE9"}}>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm">{i.label} · ${i.amt}</div>
                        <div className="text-xs" style={{color:T.muted}}>{tName(i.trainer)}</div>
                      </div>
                      <div className="text-xs mb-2" style={{color:T.muted}}>{i.note}</div>
                      <div className="flex gap-2">
                        <Btn small kind="ghost" onClick={()=>{setIncidentals(x=>x.map(y=>y.id!==i.id?y:{...y,status:"rejected"})); ping("Incidental rejected");}}>Reject</Btn>
                        <Btn small onClick={()=>{setIncidentals(x=>x.map(y=>y.id!==i.id?y:{...y,status:"approved"}));
                          setLedger(l=>[{id:nid(),who:tName(i.trainer),what:`Incidental · ${i.label}`,amt:-i.amt,method:"Expense",status:"paid",d:"Today"},...l]);
                          ping("Approved — recorded as an expense for analysis (audited)");}}>Approve</Btn>
                      </div>
                    </Card>))}
                </>)}
              {noShowQueue.length>0 && (
                <>
                  <div className="text-xs font-bold" style={{color:T.accent}}>NO-SHOW DECISIONS · waive or apply</div>
                  {noShowQueue.map(nq=>(
                    <Card key={nq.id} style={{background:"#F7EEE9"}}>
                      <div className="font-semibold text-sm">{nq.who}</div>
                      <div className="text-xs mb-2" style={{color:T.muted}}>{nq.session} · Policy: {nq.policy}</div>
                      <div className="flex gap-2">
                        <Btn small kind="ghost" onClick={()=>resolveNoShow(nq.id,false)}>Waive (relationship call)</Btn>
                        <Btn small onClick={()=>resolveNoShow(nq.id,true)}>Apply</Btn>
                      </div>
                    </Card>))}
                </>)}
              <div className="text-xs font-bold pt-1" style={{color:T.muted}}>LEDGER · export CSV for accountant</div>
              {ledger.map(l=>(
                <Card key={l.id} className="flex items-center gap-3 !p-3">
                  <div className="flex-1"><div className="text-sm font-semibold">{l.who} · {l.what}</div>
                    <div className="text-xs" style={{color:T.muted}}>{l.method} · {l.d}</div></div>
                  <div className="font-bold text-sm">${l.amt}</div>
                  <Btn small kind="ghost" onClick={()=>ping("Refund flow — full/partial or return credit, reason logged")}>Refund</Btn>
                </Card>))}
              <div className="text-xs" style={{color:T.muted}}>Trainer payouts: sessions × rate, monthly export. All actions audited.</div>
            </div>}

            {adminSec==="settings" && <div className="space-y-3">
              <div className="text-xs font-bold" style={{color:T.muted}}>BUSINESS PROFILE</div>
              <Card style={{background:T.ink,color:T.paper,border:"none"}}>
                <div style={{...disp,fontWeight:700,fontSize:18}}>EXERCISE<span style={{color:T.accent}}>ONLY</span></div>
                <div className="text-xs italic mt-0.5" style={{color:T.accent}}>Sore today, strong tomorrow.</div>
                <div className="text-xs mt-2" style={{color:"#B9B5A9"}}>{TRAINERS.find(t=>t.id==="danny").bio}</div>
                <div className="text-xs mt-2" style={{color:"#B9B5A9"}}>WhatsApp +65 8100 6608 · @exercise.only · 4exerciseonly@gmail.com</div>
                <div className="text-xs" style={{color:"#B9B5A9"}}>11 Rhu Cross, Singapore 437440 (Gardens by the Bay)</div>
              </Card>
              <div className="text-xs font-bold" style={{color:T.muted}}>LOCATIONS</div>
              {locations.map(l=>(
                <Card key={l.id} className="!p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">{l.name}</span>
                  <span className="text-xs" style={{color:T.muted}}>id: {l.id}</span>
                </Card>))}
              <div className="flex gap-2">
                <input value={newLocName} onChange={e=>setNewLocName(e.target.value)} placeholder="New location name"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small onClick={addLocation}>+ Add</Btn>
              </div>

              {suggestedLocs.length>0 && <>
                <div className="text-xs font-bold pt-2" style={{color:T.accent}}>SUGGESTED FROM CLIENT "OTHER" BOOKINGS</div>
                {suggestedLocs.map(name=>(
                  <Card key={name} className="!p-3 flex items-center justify-between">
                    <span className="text-sm">{name}</span>
                    <Btn small onClick={()=>promoteSuggested(name)}>+ Save as location</Btn>
                  </Card>))}
              </>}

              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>TRAVEL TIME BETWEEN LOCATIONS (minutes)</div>
              <div className="text-xs mb-1" style={{color:T.muted}}>Default {DEFAULT_TRAVEL}m applies to any pair not listed here, including "Other" spots.</div>
              {locations.flatMap((a,i)=>locations.slice(i+1).map(b=>({a,b}))).map(({a,b})=>{
                const key = travelKey(a.id,b.id); const val = travel[key] ?? DEFAULT_TRAVEL;
                return (
                  <Card key={key} className="!p-3 flex items-center justify-between">
                    <span className="text-sm">{a.name} ↔ {b.name}</span>
                    <input type="number" value={val} onChange={e=>setTravel(tv=>({...tv,[key]:+e.target.value||0}))}
                      className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  </Card>);})}

              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>POLICIES</div>
              <Card className="!p-3"><div className="text-sm">PT session length: <b>{PT_DUR} min</b> (fixed for now — flagged as possibly variable by trainer/session type later)</div></Card>
              <Card className="!p-3"><div className="text-sm">Same-location changeover buffer: <b>0 min</b> (no gap required back-to-back at one venue)</div></Card>
            </div>}
          </main>)}

        {/* bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex" style={{background:T.ink, paddingBottom:"env(safe-area-inset-bottom)"}}>
          {navItems.map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} className="flex-1 py-3"
              style={{...disp,fontSize:13,fontWeight:700,color:tab===k?T.accent:"#B9B5A9"}}>{label}</button>))}
        </nav>

        {/* booking sheet */}
        {sheet && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>
                  {sheet.kind==="class"?`${CT[sheet.type].name} · ${DAYS[sheet.day]} ${sheet.time}`:`PT with ${tName(sheet.trainer)} · ${DAYS[sheet.day]} ${sheet.time}`}</div>
                <button onClick={()=>setSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg -mt-1" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              {sheet.kind==="pt" && sheet.loc==="other" ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={otherPlace} onChange={e=>setOtherPlace(e.target.value)} placeholder="Place name" className="flex-1 px-2 py-1.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <input value={sheet.time} onChange={e=>setSheet(s=>({...s,time:e.target.value}))} className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                </div>
              ) : null}
              <div className="text-sm mb-3" style={{color:T.muted}}>
                {sheet.kind==="class" ? locName(sheet.loc) : (sheet.loc==="other" ? (otherPlace||"Other spot") : locName(sheet.loc))} · ${sheet.kind==="class"?CT[sheet.type].price:PT_PRICE[sheet.trainer]}</div>
              {sheet.note && <div className="text-xs mb-2 font-semibold" style={{color:T.accent}}>⏱ {sheet.note}</div>}
              <div className="space-y-2 mb-3">
                {(() => {
                  const pool = sheet.kind==="pt" ? ptPool(sheet.trainer) : null;
                  const opts = [];
                  if (sheet.kind==="class" && classPass) opts.push(["pass", `${classPass.label} (unlimited)`, false]);
                  if (sheet.kind==="class") opts.push(["credit", `Class credit (${credits.classes} left)`, credits.classes<=0]);
                  if (sheet.kind==="pt") opts.push(["credit", `${isHead(sheet.trainer)?"Head-coach":"Coach"} PT credit (${credits[pool]} left)`, credits[pool]<=0]);
                  opts.push(["paynow","PayNow QR",false],["card","Card",false]);
                  return opts.map(([k,label,dis])=>(
                    <button key={k} disabled={dis} onClick={()=>setPayMode(k)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                      style={{background:payMode===k?T.ink:T.card, color:dis?T.muted:payMode===k?T.paper:T.ink,
                        border:`1.5px solid ${payMode===k?T.ink:T.line}`, opacity:dis?.5:1}}>{label}</button>));
                })()}
              </div>
              {(payMode==="paynow"||payMode==="card") && (
                <div className="flex gap-2 mb-3">
                  <input value={coupon} onChange={e=>{setCoupon(e.target.value); setCouponMsg(null);}} placeholder="Coupon code"
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <Btn small kind="ghost" onClick={()=>applyCoupon(sheet.kind==="class"?CT[sheet.type].price:PT_PRICE[sheet.trainer])}>Apply</Btn>
                </div>)}
              {couponMsg && <div className="text-xs mb-2 font-semibold" style={{color:couponMsg.startsWith("Applied")?T.moss:T.accent}}>{couponMsg}</div>}
              {payMode==="paynow" && <QR/>}
              <Btn full disabled={sheet.kind==="pt" && sheet.loc==="other" && !otherPlace} onClick={confirmBook}>{payMode==="credit"?"Confirm · 1 credit":payMode==="pass"?"Confirm · covered by pass":"Pay & book"}</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>Free cancellation until 24h before.</div>
            </div>
          </div>)}

        {/* shop checkout sheet — bug 1: Buy now goes through a real PayNow/Card step */}
        {shopSheet && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setShopSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Checkout</div>
                <button onClick={()=>setShopSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>{shopSheet.product.name} · ${shopSheet.product.price}</div>
              <div className="space-y-2 mb-3">
                {[["paynow","PayNow QR"],["card","Card"]].map(([k,label])=>(
                  <button key={k} onClick={()=>setPayMode(k)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{background:payMode===k?T.ink:T.card, color:payMode===k?T.paper:T.ink, border:`1.5px solid ${payMode===k?T.ink:T.line}`}}>{label}</button>))}
              </div>
              <div className="flex gap-2 mb-3">
                <input value={coupon} onChange={e=>{setCoupon(e.target.value); setCouponMsg(null);}} placeholder="Coupon code"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small kind="ghost" onClick={()=>applyCoupon(shopSheet.product.price)}>Apply</Btn>
              </div>
              {couponMsg && <div className="text-xs mb-2 font-semibold" style={{color:couponMsg.startsWith("Applied")?T.moss:T.accent}}>{couponMsg}</div>}
              {payMode==="paynow" && <QR/>}
              <Btn full onClick={confirmShopBuy}>Pay ${Math.round(couponValue(shopSheet.product.price))} & buy</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>Receipt emailed via Resend. Card details never touch our servers.</div>
            </div>
          </div>)}

        {/* camp checkout sheet — payment + (kids) waiver, replaces instant enroll */}
        {campSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setCampSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>{campSheet.camp.name}</div>
                <button onClick={()=>setCampSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg -mt-1" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>{campSheet.camp.dates} · {locName(campSheet.camp.loc)} · ${campSheet.camp.price}</div>

              {campSheet.waiver && (<>
                <div className="text-xs font-bold mb-1.5" style={{color:T.plum}}>CHILD DETAILS & WAIVER (required)</div>
                <div className="space-y-2 mb-3">
                  <input value={campSheet.waiver.child} onChange={e=>setCampSheet(s=>({...s,waiver:{...s.waiver,child:e.target.value}}))}
                    placeholder="Child's first name" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{color:T.muted}}>Age band</span>
                    <Select value={campSheet.waiver.ageBand} onChange={v=>setCampSheet(s=>({...s,waiver:{...s.waiver,ageBand:v}}))}
                      options={[["10–12","10–12"],["13–15","13–15"]]} />
                  </div>
                  <input value={campSheet.waiver.emergency} onChange={e=>setCampSheet(s=>({...s,waiver:{...s.waiver,emergency:e.target.value}}))}
                    placeholder="Emergency contact (name + phone)" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  <button onClick={()=>setCampSheet(s=>({...s,waiver:{...s.waiver,accepted:!s.waiver.accepted}}))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm" style={{border:`1.5px solid ${campSheet.waiver.accepted?T.moss:T.line}`,background:T.card}}>
                    <span style={{color:campSheet.waiver.accepted?T.moss:T.muted}}>{campSheet.waiver.accepted?"☑":"☐"}</span>
                    I accept the parental consent & liability waiver for my child.
                  </button>
                </div>
              </>)}

              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>PAYMENT</div>
              <div className="space-y-2 mb-3">
                {[["paynow","PayNow QR"],["card","Card"]].map(([k,label])=>(
                  <button key={k} onClick={()=>setCampSheet(s=>({...s,pay:k}))}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{background:campSheet.pay===k?T.ink:T.card, color:campSheet.pay===k?T.paper:T.ink, border:`1.5px solid ${campSheet.pay===k?T.ink:T.line}`}}>{label}</button>))}
              </div>
              <div className="flex gap-2 mb-3">
                <input value={coupon} onChange={e=>{setCoupon(e.target.value); setCouponMsg(null);}} placeholder="Coupon code"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small kind="ghost" onClick={()=>applyCoupon(campSheet.camp.price)}>Apply</Btn>
              </div>
              {couponMsg && <div className="text-xs mb-2 font-semibold" style={{color:couponMsg.startsWith("Applied")?T.moss:T.accent}}>{couponMsg}</div>}
              {campSheet.pay==="paynow" && <QR/>}
              <Btn full disabled={campSheet.waiver && (!campSheet.waiver.child || !campSheet.waiver.emergency || !campSheet.waiver.accepted)}
                onClick={confirmCampBuy}>Pay ${Math.round(couponValue(campSheet.camp.price))} & book</Btn>
              <div className="text-center text-xs mt-3" style={{color:T.muted}}>Free cancellation within the policy window · one-off payment, no pack credits.</div>
            </div>
          </div>)}

        {/* in-app coach chat (Message Coach) */}
        {chatOpen && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setChatOpen(false)}>
            <div className="w-full max-w-md rounded-t-3xl flex flex-col" style={{background:T.paper, height:"70vh"}} onClick={e=>e.stopPropagation()}>
              <div className="px-5 pt-4 pb-2 flex items-center justify-between" style={{borderBottom:`1.5px solid ${T.line}`}}>
                <div><div style={{...disp,fontWeight:700,fontSize:18}}>Chat · Coach Danny</div>
                  <div className="text-xs" style={{color:T.muted}}>In-app messaging (demo) · also on WhatsApp +65 8100 6608</div></div>
                <button onClick={()=>setChatOpen(false)} className="text-xs font-bold px-2 py-1 rounded" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>Close</button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                {chatMsgs.map((m,i)=>(
                  <div key={i} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from==="me"?"ml-auto":""}`}
                    style={{background:m.from==="me"?T.ink:"#EFEBE3", color:m.from==="me"?T.paper:T.ink}}>{m.text}</div>))}
              </div>
              <div className="p-3 flex gap-2" style={{borderTop:`1.5px solid ${T.line}`}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Message your coach…"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small onClick={()=>{ if(!chatInput.trim())return;
                  const q=chatInput.trim();
                  setChatMsgs(m=>[...m,{from:"me",text:q}]); setChatInput("");
                  setTimeout(()=>setChatMsgs(m=>[...m,{from:"coach",text:"Got it — I'll get back to you shortly. (A future AI assistant could answer schedule/credit questions here instantly.)"}]),700);
                }}>Send</Btn>
              </div>
            </div>
          </div>)}

        {/* time off sheet */}
        {timeOffSheet && (
          <TimeOffForm trainer={timeOffSheet.trainer} tName={tName} onCancel={()=>setTimeOffSheet(null)} onSave={addTimeOff} />
        )}

        {/* move session sheet */}
        {moveSheet && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setMoveSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div style={{...disp,fontWeight:700,fontSize:22}}>Move · {moveSheet.label}</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>{DAYS[moveSheet.day]} · currently {moveSheet.time} · {locName(moveSheet.loc)}</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold">New start time</span>
                <input defaultValue={moveSheet.time} onChange={e=>setMoveSheet(m=>({...m,newTime:e.target.value}))}
                  placeholder="HH:MM" className="w-24 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Re-checked against this coach's other sessions and the travel-time buffer before it's confirmed — booked clients are notified if it moves.</div>
              {(() => {
                const nt = moveSheet.newTime || moveSheet.time;
                // conflict check: does the moved block overlap another commitment for this coach that day?
                const dur = moveSheet.kind==="pt" ? PT_DUR : CT[sessions.find(s=>s.id===moveSheet.id)?.type]?.dur || 60;
                const ns = toMin(nt), ne = ns+dur;
                const others = trainerBusyBlocks(moveSheet.trainer, moveSheet.day, ptCtx)
                  .filter(b => !(b.start===toMin(moveSheet.time))); // exclude itself (approx by start time)
                const conflict = others.find(b => ns < b.end && ne > b.start);
                return (<>
                  {conflict && <div className="text-xs mb-2 font-semibold" style={{color:T.accent}}>⚠ Conflicts with {conflict.label} ({fromMin(conflict.start)}–{fromMin(conflict.end)}). You'll need to move that one too, or pick another time.</div>}
                  <Btn full onClick={()=>{
                    if (moveSheet.kind==="class") setSessions(ss=>ss.map(s=>s.id!==moveSheet.id?s:{...s,time:nt}));
                    else setPtBookings(pb=>pb.map(b=>b.id!==moveSheet.id?b:{...b,time:nt}));
                    ping(conflict ? `Moved to ${nt} despite a conflict — resolve the overlap (audited)` : `Moved to ${nt} — booked clients notified (audited)`);
                    setMoveSheet(null);}}>{conflict?"Move anyway":"Confirm move"}</Btn>
                </>);
              })()}
            </div>
          </div>)}

        {/* running-late / shift-my-day cascade */}
        {moveDay && (() => {
          const items = [
            ...sessions.filter(s=>sessTrainers(s).includes(moveDay.trainer)&&s.day===TODAY&&s.status!=="cancelled").map(s=>({id:s.id,kind:"class",time:s.time,label:CT[s.type].name+" · "+locName(s.loc)})),
            ...ptBookings.filter(b=>b.trainer===moveDay.trainer&&b.day===TODAY&&b.status!=="cancelled").map(b=>({id:b.id,kind:"pt",time:b.time,label:"PT · "+b.who})),
          ].sort((a,b)=>a.time.localeCompare(b.time));
          const delay = moveDay.delay ?? 15;
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setMoveDay(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div style={{...disp,fontWeight:700,fontSize:22}}>Running late — {tName(moveDay.trainer)}</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Push today's remaining sessions back together. Clients are notified; conflicts with other coaches' sessions are flagged.</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold">Delay everything by</span>
                {[10,15,30].map(m=>(
                  <button key={m} onClick={()=>setMoveDay(d=>({...d,delay:m}))} className="px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{background:delay===m?T.ink:"transparent",color:delay===m?T.paper:T.ink,border:`1.5px solid ${delay===m?T.ink:T.line}`}}>{m}m</button>))}
              </div>
              <div className="space-y-1.5 mb-3">
                {items.length===0 && <div className="text-sm" style={{color:T.muted}}>Nothing left to move today.</div>}
                {items.map(it=>(
                  <div key={it.id} className="flex items-center justify-between text-sm">
                    <span>{it.label}</span>
                    <span className="font-semibold">{it.time} → {fromMin(toMin(it.time)+delay)}</span>
                  </div>))}
              </div>
              <Btn full disabled={items.length===0} onClick={()=>{
                setSessions(ss=>ss.map(s=> (sessTrainers(s).includes(moveDay.trainer)&&s.day===TODAY) ? {...s,time:fromMin(toMin(s.time)+delay)} : s));
                setPtBookings(pb=>pb.map(b=> (b.trainer===moveDay.trainer&&b.day===TODAY) ? {...b,time:fromMin(toMin(b.time)+delay)} : b));
                ping(`Shifted ${items.length} session${items.length>1?"s":""} by ${delay}m — everyone notified (audited)`); setMoveDay(null);}}>
                Shift {items.length} session{items.length!==1?"s":""} by {delay}m
              </Btn>
            </div>
          </div>);})()}

        {/* complete-session sheet — mark done + log incidentals for Danny's approval */}
        {doneSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setDoneSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Complete session</div>
                <button onClick={()=>setDoneSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-sm mb-3" style={{color:T.muted}}>{doneSheet.label}</div>
              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>ADD AN INCIDENTAL (optional) — goes to Danny for approval</div>
              <div className="flex gap-2 mb-2">
                <input value={doneSheet.incLabel} onChange={e=>setDoneSheet(d=>({...d,incLabel:e.target.value}))} placeholder="e.g. Parking, equipment, extra 30 min"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={doneSheet.incAmt} onChange={e=>setDoneSheet(d=>({...d,incAmt:e.target.value}))} placeholder="$" type="number"
                  className="w-20 px-2 py-2.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Recorded against this session for money & revenue analysis once Danny approves.</div>
              <Btn full onClick={()=>{
                setSessions(ss=>ss.map(s=>s.id!==doneSheet.id?s:{...s,done:true}));
                if (doneSheet.incLabel && +doneSheet.incAmt>0) {
                  setIncidentals(inc=>[...inc,{id:nid(), trainer:doneSheet.trainer, label:doneSheet.incLabel, amt:+doneSheet.incAmt, note:doneSheet.label, status:"pending"}]);
                  ping("Session completed · incidental sent to Danny for approval");
                } else ping("Session marked complete");
                setDoneSheet(null);}}>Mark complete{doneSheet.incLabel&&+doneSheet.incAmt>0?" & submit incidental":""}</Btn>
            </div>
          </div>)}

        {/* shift-hours editor — per-weekday, weekly recurring */}
        {shiftEditor && (() => {
          const tid = shiftEditor.trainer; const sh = shifts[tid] || {};
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setShiftEditor(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div style={{...disp,fontWeight:700,fontSize:22}}>Shift hours — {tName(tid)}</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Set on-shift hours per weekday (weekends can differ). Repeats every week until you change it. Toggle a day off to remove it.</div>
              <div className="space-y-2">
                {DAYS.map((d,di)=>{ const on=!!sh[di]; return (
                  <div key={d} className="flex items-center gap-2">
                    <button onClick={()=>setShifts(s=>{ const c={...(s[tid]||{})}; if(c[di])delete c[di]; else c[di]=["09:00","17:00"]; return {...s,[tid]:c}; })}
                      className="text-xs font-bold w-14 py-1.5 rounded-lg" style={{background:on?T.ink:"transparent",color:on?T.paper:T.muted,border:`1.5px solid ${on?T.ink:T.line}`}}>{d}</button>
                    {on ? (<>
                      <input value={sh[di][0]} onChange={e=>setShifts(s=>({...s,[tid]:{...s[tid],[di]:[e.target.value,s[tid][di][1]]}}))}
                        className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <span className="text-sm">–</span>
                      <input value={sh[di][1]} onChange={e=>setShifts(s=>({...s,[tid]:{...s[tid],[di]:[s[tid][di][0],e.target.value]}}))}
                        className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                    </>) : <span className="text-sm" style={{color:T.muted}}>Off</span>}
                  </div>);})}
              </div>
              <div className="mt-4"><Btn full onClick={()=>{setShiftEditor(null); ping("Shift hours saved — PT availability updated");}}>Done</Btn></div>
            </div>
          </div>);})()}

        {/* add / edit trainer form (with cost/rate) */}
        {addTrainer && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setAddTrainer(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>{addTrainer.editId?"Edit trainer":"Add trainer"}</div>
                <button onClick={()=>setAddTrainer(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Rates can be temporary — set a per-class / per-PT rate or a monthly salary. Used for payout & cost tracking.</div>
              <div className="space-y-2 mb-3">
                <input value={addTrainer.name} onChange={e=>setAddTrainer(a=>({...a,name:e.target.value}))} placeholder="Name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={addTrainer.phone} onChange={e=>setAddTrainer(a=>({...a,phone:e.target.value}))} placeholder="Mobile"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <div className="flex gap-2">
                  {[["per_class","Per class/PT"],["salary","Monthly salary"]].map(([k,l])=>(
                    <button key={k} onClick={()=>setAddTrainer(a=>({...a,payType:k}))} className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold"
                      style={{background:addTrainer.payType===k?T.ink:T.card,color:addTrainer.payType===k?T.paper:T.ink,border:`1.5px solid ${addTrainer.payType===k?T.ink:T.line}`}}>{l}</button>))}
                </div>
                {addTrainer.payType==="salary" ? (
                  <input value={addTrainer.monthly} onChange={e=>setAddTrainer(a=>({...a,monthly:e.target.value}))} placeholder="Monthly salary $" type="number"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                ) : (
                  <div className="flex gap-2">
                    <input value={addTrainer.perClass} onChange={e=>setAddTrainer(a=>({...a,perClass:e.target.value}))} placeholder="$ / class" type="number"
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                    <input value={addTrainer.perPt} onChange={e=>setAddTrainer(a=>({...a,perPt:e.target.value}))} placeholder="$ / PT" type="number"
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  </div>)}
              </div>
              <Btn full disabled={!addTrainer.name} onClick={()=>{
                const nm = addTrainer.name.trim();
                const rateObj = {type:addTrainer.payType, perClass:+addTrainer.perClass||0, perPt:+addTrainer.perPt||0, monthly:+addTrainer.monthly||0};
                if (addTrainer.editId) {
                  const id = addTrainer.editId;
                  setTrainers(ts=>ts.map(t=>t.id!==id?t:{...t,name:nm,phone:addTrainer.phone}));
                  setRates(r=>({...r,[id]:rateObj}));
                  ping(`${nm} updated`);
                } else {
                  const id = nm.toLowerCase().replace(/[^a-z]/g,"").slice(0,8)+nid();
                  setTrainers(ts=>[...ts,{id,name:nm,tag:"Coach",phone:addTrainer.phone}]);
                  setRates(r=>({...r,[id]:rateObj}));
                  setShifts(s=>({...s,[id]:{0:["09:00","17:00"],1:["09:00","17:00"],2:["09:00","17:00"],3:["09:00","17:00"],4:["09:00","17:00"]}}));
                  setPerm(p=>({...p,[id]:{editDesc:false,cancel:false,earnings:false,manageLocations:false}}));
                  ping(`${nm} added — shift hours & rate set`);
                }
                setAddTrainer(null);}}>{addTrainer.editId?"Save changes":"Add trainer"}</Btn>
            </div>
          </div>)}

        {/* camp builder sheet */}
        {campBuilder && (
          <CampBuilderForm camp={campBuilder} locations={locations} trainers={trainers}
            onCancel={()=>setCampBuilder(null)}
            onSave={(c)=>{
              setCamps(cs => c.id && cs.some(x=>x.id===c.id) ? cs.map(x=>x.id===c.id?c:x) : [...cs, {...c, id:c.id||nid(), spots:(c.spots ?? (+c.cap||0))}]);
              setCampBuilder(null); ping(`"${c.name}" saved`);
            }} />
        )}

        {/* class template builder sheet */}
        {templateBuilder && (
          <TemplateBuilderForm tpl={templateBuilder} locations={locations} trainers={trainers} classTypes={CT} days={DAYS}
            onCancel={()=>setTemplateBuilder(null)}
            onSave={(t)=>{
              setClassTemplates(ts => t.id && ts.some(x=>x.id===t.id) ? ts.map(x=>x.id===t.id?t:x) : [...ts, {...t, id:t.id||nid()}]);
              setTemplateBuilder(null); ping(`"${t.name}" saved`);
            }} />
        )}

        {/* measurements sheet */}
        {measForm && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setMeasForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div style={{...disp,fontWeight:700,fontSize:22}}>Stats · {measForm.who}</div>
              <div className="flex gap-2 my-3">
                <input value={measForm.weight} onChange={e=>setMeasForm({...measForm,weight:e.target.value})} placeholder="Weight kg"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={measForm.fat} onChange={e=>setMeasForm({...measForm,fat:e.target.value})} placeholder="Body fat %"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              </div>
              <Btn full disabled={!measForm.weight} onClick={()=>{
                if(measForm.who==="Sam Lee") setMeasurements(m=>[...m,{who:"Sam Lee",weight:+measForm.weight,fat:+measForm.fat||m[m.length-1].fat,d:"Today"}]);
                setMeasForm(null); ping("Stats saved — visible in client's Log tab");}}>Save</Btn>
            </div>
          </div>)}

        {/* exercise log sheet — structured sets, pre-fillable via "repeat this session" */}
        {logSheet && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setLogSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div style={{...disp,fontWeight:700,fontSize:22}}>{logSheet.label || "Log exercises"}</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>{logSheet.sets.length>0?"Adjust today's actuals below.":"Pick an exercise, then add sets/reps/weight."}</div>
              <div className="space-y-2 mb-3">
                {logSheet.sets.map((s,i)=>(
                  <Card key={i} className="!p-3 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{s.ex}</div>
                      <div className="text-xs" style={{color:T.muted}}>{s.muscle}</div>
                    </div>
                    <input value={s.reps} onChange={e=>setLogSheet(f=>({...f,sets:f.sets.map((x,j)=>j!==i?x:{...x,reps:e.target.value})}))}
                      placeholder="3×10" className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                    <input value={s.w} onChange={e=>setLogSheet(f=>({...f,sets:f.sets.map((x,j)=>j!==i?x:{...x,w:+e.target.value||0})}))}
                      placeholder="kg" type="number" className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  </Card>))}
              </div>
              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>ADD AN EXERCISE</div>
              <div className="space-y-2 mb-3">
                {Object.entries(EXLIB).map(([muscle,names])=>(
                  <div key={muscle}>
                    <div className="text-xs font-bold mb-1" style={{color:T.navy}}>{muscle.toUpperCase()}</div>
                    <div className="flex gap-1.5 flex-wrap mb-1">
                      {names.map(nm=>(
                        <Chip key={nm} active={false} onClick={()=>setLogSheet(f=>({...f,sets:[...f.sets,{ex:nm,muscle,w:20,reps:"3×10"}]}))}>{nm}</Chip>))}
                    </div>
                  </div>))}
              </div>
              <Btn full disabled={logSheet.sets.length===0} onClick={()=>{
                setLogs(l=>[{id:nid(), d:"Today", title:logSheet.label||"Workout", detail:"Self-logged", kind:"self", sets:logSheet.sets},...l]);
                setLogSheet(null); ping("Session logged — feeds your exercise progress charts");}}>Save session</Btn>
            </div>
          </div>)}

        {/* trainer intake assessment sheet */}
        {intakeForm && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setIntakeForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div style={{...disp,fontWeight:700,fontSize:22}}>New client intake · {intakeForm.who}</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>One-time deeper assessment — separate from the ongoing weight/fat log.</div>
              <div className="space-y-2 mb-3">
                {["Goals","Injury / medical history","Mobility notes","Waist / chest / arm measurements (cm)"].map(f=>(
                  <input key={f} placeholder={f} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>))}
              </div>
              <Btn full onClick={()=>{setIntakeForm(null); ping("Intake saved — kept separate from the client's simple progress view");}}>Save intake</Btn>
            </div>
          </div>)}

        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-sm font-semibold text-center"
          style={{background:T.ink,color:T.paper,maxWidth:"90%"}}>{toast}</div>}
      </div>
    </div>
  );
}

/* ---------- Time off form (separate component: local sheet state) ---------- */
function TimeOffForm({ trainer, tName, onCancel, onSave }) {
  const [scope, setScope] = useState("weekly");
  const [dayIdx, setDayIdx] = useState(0);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div style={{...disp,fontWeight:700,fontSize:22}}>Time off · {tName(trainer)}</div>
        <div className="text-xs mb-3" style={{color:T.muted}}>Blocks these slots from being offered. Remove anytime to restore availability.</div>
        <div className="flex gap-2 mb-3">
          <Chip active={scope==="single"} onClick={()=>setScope("single")}>One-off date</Chip>
          <Chip active={scope==="weekly"} onClick={()=>setScope("weekly")}>Weekly recurring</Chip>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {DAYS.map((d,i)=><Chip key={d} active={dayIdx===i} onClick={()=>setDayIdx(i)}>{d}</Chip>)}
        </div>
        <button className="flex items-center justify-between w-full py-2 mb-2" onClick={()=>setAllDay(a=>!a)}>
          <span className="text-sm font-semibold">Full day</span>
          <span className="text-xs font-bold" style={{color:allDay?T.moss:T.muted}}>{allDay?"ON ●":"OFF ○"}</span>
        </button>
        {!allDay && (
          <div className="flex items-center gap-2 mb-3">
            <input value={start} onChange={e=>setStart(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
            <span className="text-sm">to</span>
            <input value={end} onChange={e=>setEnd(e.target.value)} className="w-24 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          </div>)}
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (optional)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
        <Btn full onClick={()=>onSave({trainer, scope, day:dayIdx, allDay, start, end, reason})}>Save time off</Btn>
      </div>
    </div>
  );
}

/* ---------- Camp builder form (day-by-day session blocks) ---------- */
function CampBuilderForm({ camp, locations, trainers, onCancel, onSave }) {
  const [c, setC] = useState(camp);
  const addDay = () => setC(x=>({...x, days:[...x.days, {label:`Day ${x.days.length+1}`, sessions:[]}]}));
  const dupDay = (i) => setC(x=>({...x, days:[...x.days.slice(0,i+1), {...JSON.parse(JSON.stringify(x.days[i])), label:`Day ${x.days.length+1}`}, ...x.days.slice(i+1)]}));
  const removeDay = (i) => setC(x=>({...x, days:x.days.filter((_,j)=>j!==i)}));
  const addSession = (i) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d, sessions:[...d.sessions,{activity:"", trainer:trainers[0].id, start:"09:00", hours:1}]})}));
  const updSession = (i,k,field,val) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d, sessions:d.sessions.map((s,l)=>l!==k?s:{...s,[field]:val})})}));
  const removeSession = (i,k) => setC(x=>({...x, days:x.days.map((d,j)=>j!==i?d:{...d, sessions:d.sessions.filter((_,l)=>l!==k)})}));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div style={{...disp,fontWeight:700,fontSize:22}}>Camp builder</div>
        <div className="grid grid-cols-2 gap-2 my-3">
          <input value={c.name} onChange={e=>setC({...c,name:e.target.value})} placeholder="Camp name" className="col-span-2 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          <select value={c.type} onChange={e=>setC({...c,type:e.target.value})} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}>
            <option>Kids</option><option>Adult</option>
          </select>
          <select value={c.loc} onChange={e=>setC({...c,loc:e.target.value})} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}>
            {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input value={c.dates} onChange={e=>setC({...c,dates:e.target.value})} placeholder="Dates label (e.g. 15–16 Aug)" className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          <input value={c.price} onChange={e=>setC({...c,price:e.target.value})} placeholder="Price $" type="number" className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
          <input value={c.cap} onChange={e=>setC({...c,cap:e.target.value})} placeholder="Capacity" type="number" className="col-span-2 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`}}/>
        </div>

        <div className="space-y-3">
          {c.days.map((d,i)=>(
            <Card key={i} className="!p-3">
              <div className="flex items-center justify-between mb-2">
                <input value={d.label} onChange={e=>setC(x=>({...x,days:x.days.map((dd,j)=>j!==i?dd:{...dd,label:e.target.value})}))}
                  className="font-bold text-sm px-2 py-1 rounded outline-none" style={{border:`1px solid ${T.line}`,width:110}}/>
                <div className="flex gap-1.5">
                  <button className="text-xs font-bold" style={{color:T.navy}} onClick={()=>dupDay(i)}>Duplicate</button>
                  <button className="text-xs font-bold" style={{color:T.accent}} onClick={()=>removeDay(i)}>Remove day</button>
                </div>
              </div>
              {d.sessions.map((s,k)=>(
                <div key={k} className="grid grid-cols-12 gap-1.5 mb-1.5 items-center">
                  <input value={s.activity} onChange={e=>updSession(i,k,"activity",e.target.value)} placeholder="Activity" className="col-span-5 px-2 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <select value={s.trainer} onChange={e=>updSession(i,k,"trainer",e.target.value)} className="col-span-3 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                    {trainers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={s.start} onChange={e=>updSession(i,k,"start",e.target.value)} className="col-span-2 px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <input value={s.hours} onChange={e=>updSession(i,k,"hours",+e.target.value||0)} type="number" step="0.5" className="col-span-1 px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                  <button className="col-span-1 text-xs" style={{color:T.accent}} onClick={()=>removeSession(i,k)}>✗</button>
                </div>))}
              <button className="text-xs font-bold mt-1" style={{color:T.navy}} onClick={()=>addSession(i)}>+ Add session block</button>
            </Card>))}
          <Btn full kind="ghost" onClick={addDay}>+ Add day</Btn>
        </div>

        <div className="flex gap-2 mt-4">
          <Btn full kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn full disabled={!c.name} onClick={()=>onSave(c)}>Save camp</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- Class template builder form (weekly timetable) ---------- */
function TemplateBuilderForm({ tpl, locations, trainers, classTypes, days, onCancel, onSave }) {
  const [t, setT] = useState(tpl);
  const addBlock = () => setT(x=>({...x, blocks:[...x.blocks, {day:0, time:"06:30", type:Object.keys(classTypes)[0], loc:locations[0]?.id, trainer:trainers[0].id, cap:8}]}));
  const updBlock = (i,field,val) => setT(x=>({...x, blocks:x.blocks.map((b,j)=>j!==i?b:{...b,[field]:val})}));
  const removeBlock = (i) => setT(x=>({...x, blocks:x.blocks.filter((_,j)=>j!==i)}));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div style={{...disp,fontWeight:700,fontSize:22}}>Class template builder</div>
        <input value={t.name} onChange={e=>setT({...t,name:e.target.value})} placeholder="Template name (e.g. Term 1 Timetable)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none my-3" style={{border:`1.5px solid ${T.line}`}}/>

        <div className="text-xs mb-2" style={{color:T.muted}}>Assign a 2nd coach to any block that needs two — availability blocks both.</div>
        <div className="space-y-2.5">
          {t.blocks.map((b,i)=>(
            <div key={i} className="space-y-1">
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <select value={b.day} onChange={e=>updBlock(i,"day",+e.target.value)} className="col-span-2 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {days.map((d,di)=><option key={d} value={di}>{d}</option>)}
                </select>
                <input value={b.time} onChange={e=>updBlock(i,"time",e.target.value)} className="col-span-2 px-1 py-1.5 rounded-lg text-xs text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                <select value={b.type} onChange={e=>updBlock(i,"type",e.target.value)} className="col-span-3 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {Object.entries(classTypes).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                </select>
                <select value={b.loc} onChange={e=>updBlock(i,"loc",e.target.value)} className="col-span-4 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className="col-span-1 text-xs" style={{color:T.accent}} onClick={()=>removeBlock(i)}>✗</button>
              </div>
              <div className="grid grid-cols-12 gap-1.5 items-center">
                <span className="col-span-2 text-[10px]" style={{color:T.muted}}>Coaches</span>
                <select value={b.trainer} onChange={e=>updBlock(i,"trainer",e.target.value)} className="col-span-5 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  {trainers.map(tr=><option key={tr.id} value={tr.id}>{tr.name}</option>)}
                </select>
                <select value={b.trainer2||""} onChange={e=>updBlock(i,"trainer2",e.target.value||undefined)} className="col-span-5 px-1 py-1.5 rounded-lg text-xs outline-none" style={{border:`1.5px solid ${T.line}`}}>
                  <option value="">+ 2nd coach (optional)</option>
                  {trainers.filter(tr=>tr.id!==b.trainer).map(tr=><option key={tr.id} value={tr.id}>{tr.name}</option>)}
                </select>
              </div>
            </div>))}
        </div>
        <Btn full kind="ghost" onClick={addBlock}><span>+ Add class block</span></Btn>

        <div className="flex gap-2 mt-4">
          <Btn full kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn full disabled={!t.name || t.blocks.length===0} onClick={()=>onSave(t)}>Save template</Btn>
        </div>
      </div>
    </div>
  );
}
