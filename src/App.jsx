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

/* ExerciseOnly — "Solar Warm" theme: cream canvas, coral→amber energy, brand blue as a
   secondary accent (from the logo). Fonts: Bricolage Grotesque headlines + Hanken Grotesk body. */
const T = { paper:"#FBF7F0", ink:"#241C16", accent:"#FF5A3C", amber:"#FFA53D",
  moss:"#12B39C", line:"#EEE7DB", muted:"#93897C", card:"#FFFFFF", navy:"#1E50A0", blue:"#1E50A0",
  orange:"#F0812F", plum:"#7B4B94" };
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');`;
const disp = { fontFamily:"'Bricolage Grotesque', sans-serif", letterSpacing:"-0.01em" };
const body = { fontFamily:"'Hanken Grotesk', sans-serif" };

/* ExerciseOnly logo mark (real asset, inlined) + wordmark */
const LOGO_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAAxCAYAAAB5wO9OAAAOrElEQVR4nO2aeZRV1ZXGf+fce9+rqlcTUBRVUMyWMmsTGZSIs9E4oBES0ppEY6RBGoGl2AxSGhGjokvQoEiICUa7BQ1qt4mJElGJJYqM4oBoBLSKmqugXr3hDuf0H/e9msJgwaslq1d/a9317r3vDmd/d+999tl7C621JqVQbY+Uv5mGbD6nNQjR8n9yH9Fqv6M4USmO8F55+NPHB6UUnuehlCLJu5QSITSeapGgNTnJYyFAq/ZP/PZhpu5RCmghJgkhwDAMADwXlNIYhkBKkK0+T2utOpmQQoJkQui2SpkkTAiBYYKyD3+31m0JO1lw4kPSrTcJyITpyMSmUMrfAKTRYlrQ1szaPK9D7z1hKY6ITvlmWutWmmNgGKKVTxIo7bZxikmr7PB0oUnMAm6nkXT8BB3lyxmGgRCilabIZvPxfVKCHeFrlJCtfFByOxYEgAtuGLwwqHinePnUa1ArtW/tU4QwSDrypNNue5v+Zpal8YmIRSBWB1/t4oX507A/KgW3AZSTCima0XGCvoHNJ2Of9tdqrRO+SOF5DknC/P88tD62mbnKBScKogn2bmfj0rkM1eXsePo+2L8FvKYOi3Q0pEyDXMAmMRuJdjNSs48ReJ4HKBAK10tOaQrTNJHyGFO9VlhOBHQjetsb/P03SyjO1vQIuOimOv70+KO0D1RPFMdHULtPbSs46ED/IZNZs+4dIhFAg/LaXiqlbBUGJO9X7X6PAhWHyAHsjS+y8fcP0S/QRFDb1NmKSLe+XH7LPJDB4xLpSDgugrTWIBQIX8wduw5SPPxWYrov/3H3U7yz7QA2PnGaFicMYBiW/2KlMZtt0NcqrdtG4S0vdH3Tceqp3/g/lK5dRd+QINM0qIwo6gLdOG/mXVB0GsjAcVJxeIiOr8UU8XicQCCAxsAFigb+gAZnKIX9/oVwpIr66p1s+PNyRg0TWIChXKSUaC3QWiAFoKLQFIZgGpg+aY4SSGkmlicJW9OACkO8nK+eX8XXm/7GKXlZuLEI9a5FuFsxo6fNh1ABWJm+bacwIu+wBmmtCQaDvgYBSsO2resIpQnqa2oxQ73JKjiTCyfM4PMycDREbD8uEnhIHH9qjtbw348t5oO1qyBaC3YUy5SgvWZyVLwJvEMQr+LT1Y9Qvm0Dxd1D2NEoVTGB6lHM6Fm/hFAhWNkpJweOU4PAX5gKYeApgZJQUQtDR89GZwwhs1sRjfVl2Ac/5ZMPHqIoD/A80kQEVAzClbz/8F0EYg2Em+KMvexazIsmgZUDZjpamCjPwdBhiJaxdeldqJq99OuWhX2oiQNNiryx36fvxJvAygUzE4SZcnKggxrUmkt/XyGJIxUUdIPSDY+g4/torCsnJ7c3Mm0AY867nZowKNPwhQgfYs2iheS6DRTqQwzvZrHzL2uIrl8Hbj14UYSKYOhGiFfx/pK5mHVf0j8vk3jM4atGj0EXTaTvtVMgmJ8wq84hBzpIkBDCX29p2RwtC2kihcLQUNwb/rLuXiK124keqiKnSx/qo705fVwJMcAV6ZBZSPHQ0TQ0xshIz8SJhemVabD15ZWoDS+A0wjxejiwjY0lN5MZqaQwN0Q8GmNPdSNDrplC6NIbIb0Az8zAEyYevpvvjNVGx02s/dUiGeRplDBxNJRuhYuvmk929yFY6V2prd1Dl4x/sGfrMroCxGvY9/QS6ne+Td9cC0PFiSnF53U2Z988H/K68veld1KYockMmByK2VTGBN+dOBVGXQvBXFzDJ0Xgf+WkArXeTwVOnKDm0xoQaA0xDc+uq2TKzIfI7jGCQFo2NdWfMbDIY9sbc8nSCqKVvPf4PWR8uZl+maCkJKIkthnCUR7p0iZgCQ7FYpTFTM7+yW2YI74HMoe33v2S757T/7BMJE0iVSSlLJL2Zx6NRCM9mHxND55YehuHqnYTjx+ie+FgvtjnccmE+znoSMgoZMzU+eiep1IWFbgiQMjQ5MkI2c5B0kyD2qiiwstk/C13Y55+FbaVw9S5a7jwquksX1WKqzs10wGkcrGqQWiBFhCwIKDhuh8UsPjOn9H45VaIhenVcyjvbWni6n9dQSNAqAcjZi+moWAQ5XEPbVlE4zZWKItaW1IfzGfcvGXQ/3ziRhqXTnqCJ3+3kR6nXsnMhc+z+sVa7GQ+Cd0puZuUmVjLE/0f13XRhokNLHpwC0sefZnuBYORUnJg/1aunnAqz668iQzbgcheNj08h1C4ki6hAPVNDtHcPoyeuQgyiql24MzvLqC8PkCX/GI8LTCIU737NV7643wuv3goQms8z8NKBJ0nnYm1h2maCKURDpTc8R1mTLmM6opdeCJGr1OG89Kfd/OLW/9I3LIg1Iux/zaPr82ufFTvIPsPZ/SseyFUzO5yKB4xh5pIV7oXDsVxLTLSAtRUfM4V117ChRcMQyToMAwDrdTJ6aRbntj6QOG4cYSZTlTD9Tc/zytv7qZL3kC0cqgr+5B5s67intvOwXQjxHZv4v03/8T4G2dCsA+vb2liwuSFGBn9Sc/qheN4mCJOTfkubvzpRSy9/yJMDQHpIbTwww5NyzIlBTiOSDqBI93VZmwuSnsgArgIosDVN73Om5u+JDs7Ewubur2f8Ms51zF/1ggMJwraASObpSveY87ip8nuNRxl5GCSjo430lD7IXfP/ymzbxmGBQgNhkikd5t1KXXo1DqCqzRCWNiewHbh9Tfq+WDLDkJZOWgjQNyDvIIiShYsYtOOQ9jBdJxgNvf/+gVm3/YrevYegSdCONpEGgbRaA3rnnuQ2dOGYbhg4eejRadQ4+P4CTpG7thPc1g4WqIMWLF6H5N+/ABWsAhBANdVKK+JcHg3r6xfzdAR2cRscDVMmzGRMRefQ2VdJcFgOkJIqqq+YkHJrZw3DiwBhgTH9TANM/E+jdKHSZWcIDqnqgFEYh4efpZx/t2vMWfeCvL7jAERwhIaHa2CeBmbSn/N2eMy8CSMGj+FlX94B2XCiy/fRs9Ci7rq/aSZkNM1l4UlJez6xM8tKQWWaSVy2YlsgRAp9T9wIj7oCNCJ8oSnIQ5Mv+M1Vj+7gfzCISgjCystnYoDH5ObVsa29x4iMx0iMRh3wRIqqsIYIszrrz7M8GJoisLgUSXYIp9QqDvxSD3S/opd7y8mPxsCgMZLaI2fQ5IpNrVOIMgDYeBpOOv8W/ngM4OigeOIRlyE0NTU7KVHd9ixaR4BAyprYNy5t2MbA8jp0pvGg2Wo2H4+3nwf2Vnwxdcw6uxZBLMGEsrqRqShigAVfLb9fnLSwAAEHiB9LdIypRXalJuYXzT094uKihASPM/BMAS1Vbs5d0wmH22eh2XAh7thyMj5hN0BBNLyidsKT4eIOLmcfvZC4goG9IJ31i8lenAPQsfIzMmjMZbB2PPvIez6PisphhSpJaflySlCa2UUwLNP38F1P7yEA/u20FC1iysvPZMXnpuBBNa+eIBzL5hBTtehdOl6CqYhsGMNmFY63QuKaYhkccaYxbgKBhXDC2sfpbpsO6apyC8cwL4KhysmLSemwdEChUj4olRK1ElOWqCRAgICVjx8GReOyWHy5f15esUVIOCBRz5k2vRldCscQ1qoK3V15TjRr9FONUpFicUVefkDOVDhcNnVj+MAF54Fyx6cRvnenSAFPXsPYvP2cn4+9TniGjwNnpt6glLqg5JZRq01UpqoxMAjMTACEHVhwb2lrPrDqxT2GYkmQHXlHqRXy+bSRWzdrrjx+rnkDfgOjgvp6YKKvdu4fvK5LF9yKQAlv9rEsseeJ7/3MNLSg+z/7ANm//skSu44i5CZ9Empa6XpHA0Swi/oaH/AVgBsCT+84Rl+89R6uheOxHEsDuzbQdeMffzj40X07QHXfE9y510/p+aL9xAijqdN8vuewTNPrmH+nc8gNdwzbywTJ5xBVdlnRKOawn4jeWTZWlb+7lNs5RcRUipLqmcxz/PQwi8aetpAmtDkwpnnLmR/BeQXDsfTBlV7P2LQkGw2/nUWIRO0VggkMQULFr3NEytfod9pZ7D3808YOCCDV9fOo0cuBAMQ9+DSiU+yaesBevQaTMCS7P/kbZ7/ryV8//w0AhIMkZoVfcoJcpWHFAZR20UGTWojMGzkLCJOF7oX9MfTLpVff8yPJ5zJikcnY2kwtC+QApSAuIKfTf09L615iQnXXszq304nIPHXXvgzV1zD6HNK2F+dTfeC02hqqqa2bAubNixn+CCQLgStwwjcQXlSTpDSEHd9QXd+DudfPh1t9aRbtz7Y8TC15Tu5c+4NzLllDGkSpPJr+c33o/GkIKbhyZWvM+2mizEkWEZLS5an/Xx0owMjxtxF2M4jPTMP264l3riNjzb/loJcSDsMG98qQRqI24AJr5XCj264g/TMXgTSc3GdGLXlH/LIfVP4xXUj/PUUbckBQPqaFLUhEGiVhBcg/TIrAgNH+R+hogFOHzUdmTEUMyMX1ymD2B62v7WSorx/drIdJSi1Xa4alAWPrdrFhB/dTnbXwQSCXXCiTRys+pR1zy1jyk9GNPuI9uQIkVhnuR4B4WJqwFNoTyVmJ38pIVCY0sOzXQpyofTN5YQb9iDcemKRg3jKoaqqJiUypVSD4hpmLPgrT/3nW+QVFCMwqakqI6BrKf3bEor7gplsj2keQeKnVSk+MbKjpjB0YnnhaYGj4c13XS6/chLFgwt5963HyRCQ9s99Wt+uicWA9PzrySkYSSAti6ZDteRm2Gx5p4ScAAT9wke7EbSNWZJ/HymO0WgcxyFgmc09aR4GURdKS8sYP74XBi2Ovz2+VYJsDR/vg7Hjp+IQYNCphby7fh5BwFC+z4FEP+IRjFtz7CCvhaQAaA+N4VdWE32OfvdIuxbA45QppT7IAAb0hMcemMnpxemUrp9HGn5awhAtzVRHI+CbRMAC4ZODH5RKoZAoTKl9xw/N3ScnipTPYipRzFMAoiV2gaP3H6Yyz5VsQ27f1H48SHkcdLIgmWE8UZyEzf+pQapSr/9nCUoV/p+gY+B/AWwlvyvTl1EDAAAAAElFTkSuQmCC";
const LogoMark = ({ size=30 }) => (
  <img src={LOGO_URI} alt="ExerciseOnly" style={{height:size, width:"auto", display:"block"}} />);
const Wordmark = ({ size=18, onDark=false }) => (
  <span style={{...disp, fontWeight:800, fontSize:size, color:onDark?"#fff":T.ink}}>
    Exercise<span style={{color:T.accent}}>Only</span></span>);
/* social / contact icon link */
const Social = ({ label, href, color, path }) => (
  <a href={href} target="_blank" rel="noreferrer" title={label}
    style={{width:42, height:42, borderRadius:14, background:color, display:"grid", placeItems:"center", flex:"none"}}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d={path}/></svg>
  </a>);

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

const COUPONS = { WELCOME10:{ pct:10, label:"10% off — new client" }, IPPT5: { flat:5, label:"$5 off NS/IPPT Prep" },
  EO88:{ flat:8.8, label:"$8.80 off — 8.8 flash" }, MONTH10:{ pct:10, label:"10% off — regular this month" } };
// Client-facing "About" copy (admin-editable) + promotional offers.
const seedAbout = {
  classes:"Small-group sessions across strength, HIIT, boot camp, NS/IPPT prep and cardio. A class pack is a bundle of credits — one credit books one class, use them anytime before they expire. Prefer unlimited? Grab a day, weekly or monthly pass instead.",
  pt:"One-to-one coaching built around your goals — technique, injury rehab, IPPT prep or general fitness. PT packs come in head-coach (Danny) and coach tiers; book any coach at any location that fits your schedule.",
};
const seedOffers = [
  { id:"o1", kind:"Referral", title:"Bring a friend", blurb:"Share your code — when your friend books their first session, you BOTH get a free class credit.", code:null, color:"#12B39C" },
  { id:"o2", kind:"This month", title:"Regular reward", blurb:"Book 8+ classes this month and unlock 10% off your next pack.", code:"MONTH10", color:"#1E50A0" },
  { id:"o3", kind:"8.8 Flash", title:"8.8 Sale", blurb:"$8.80 off any pack this week only. Tap to grab the code, then use it at checkout.", code:"EO88", color:"#FF5A3C" },
];
const seedLedger = [
  { id:nid(), who:"Priya", what:"10 Class Pack", amt:300, method:"PayNow", status:"paid", d:"Mon 09:12" },
  { id:nid(), who:"Ben", what:"5 PT Pack", amt:425, method:"Card", status:"paid", d:"Mon 08:47" },
  { id:nid(), who:"Kumar", what:"Drop-in · Strength", amt:35, method:"Cash", status:"paid", d:"Sun 19:50" },
  { id:nid(), who:"Elaine", what:"Unlimited Monthly", amt:280, method:"PayNow", status:"paid", d:"Sun 10:02" },
];
// Cardio / activity types for the "Log activity" sheet. `dist` = whether a distance field applies.
const ACTIVITIES = [
  { name:"Run", dist:true }, { name:"Cycle", dist:true }, { name:"Swim", dist:true },
  { name:"Walk / Hike", dist:true }, { name:"Row", dist:true }, { name:"Sports", dist:false },
  { name:"Muay Thai", dist:false }, { name:"Yoga / Mobility", dist:false }, { name:"Other", dist:false },
];
const EXLIB = {
  Legs: ["Back Squat","Deadlift","Leg Press","Walking Lunge","Romanian Deadlift","Leg Curl"],
  Back: ["Pull-up","Bent-over Row","Lat Pulldown","Seated Row"],
  Shoulder: ["Overhead Press","Lateral Raise","Face Pull"],
  Chest: ["Bench Press","Incline DB Press","Push-up","Cable Fly"],
  Core: ["Hanging Leg Raise","Plank","Cable Woodchop"],
};
// Per-exercise metadata: is it a barbell lift (plate calculator) + default rest seconds.
const EXMETA = {
  "Back Squat":{bar:true,rest:150}, "Deadlift":{bar:true,rest:180}, "Romanian Deadlift":{bar:true,rest:120},
  "Bench Press":{bar:true,rest:150}, "Overhead Press":{bar:true,rest:120}, "Bent-over Row":{bar:true,rest:120},
  "Front Squat":{bar:true,rest:150},
};
const exMeta = (name) => EXMETA[name] || { bar:false, rest:75 };
const muscleOf = (name) => Object.entries(EXLIB).find(([,arr])=>arr.includes(name))?.[0] || "Other";
const BAR_KG = 20;
const PLATES = [25,20,15,10,5,2.5,1.25]; // kg plates available per side
// Epley estimated 1RM from a single set.
const est1RM = (w, reps) => reps>0 ? Math.round(w*(1+reps/30)*10)/10 : w;
// Working sets only (warmup & failure never count toward PRs / charts).
const isWorking = (st) => st.type!=="warmup" && st.type!=="failure";

// New per-set log model: entries have `exercises:[{ex,muscle,sets:[{w,reps,type,rpe}]}]`.
// `daysAgo` powers the streak calendar. Cardio entries keep {kind:'cardio', detail}.
const mkSet = (w,reps,type="normal",rpe) => ({w,reps,type,rpe});
const seedWorkoutSessions = [
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
const seedRoutines = [
  { id:"r1", name:"Leg Day", owner:"danny", assignedTo:"Sam Lee",
    items:[{ex:"Back Squat",muscle:"Legs",sets:4,reps:5},{ex:"Romanian Deadlift",muscle:"Legs",sets:3,reps:8},{ex:"Leg Press",muscle:"Legs",sets:3,reps:10},{ex:"Leg Curl",muscle:"Legs",sets:3,reps:12}] },
  { id:"r2", name:"Push Day", owner:"sam",
    items:[{ex:"Bench Press",muscle:"Chest",sets:4,reps:5},{ex:"Overhead Press",muscle:"Shoulder",sets:3,reps:8},{ex:"Incline DB Press",muscle:"Chest",sets:3,reps:10},{ex:"Lateral Raise",muscle:"Shoulder",sets:3,reps:15}] },
];
const seedLeads = [
  { id:nid(), name:"Rachel Ong", phone:"91234567", source:"Instagram", status:"new", note:"DM'd @exercise.only asking about NS/IPPT prep pricing" },
  { id:nid(), name:"Jon Tay", phone:"98765432", source:"Enquiry form", status:"contacted", note:"Wants a trial Strength class" },
  { id:nid(), name:"Wen Jie's colleague", phone:"", source:"Referral", status:"trial booked", note:"Referred by Wen Jie" },
];

/* ---------- time helpers ---------- */
const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const fromMin = (m) => { const h = Math.floor(m/60), mm = m%60; return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; };

/* ---------- workout-log analytics (Strong-style) ---------- */
const SET_TYPES = { normal:{lbl:"N",name:"Normal",color:"#17150F"}, warmup:{lbl:"W",name:"Warm-up",color:"#B8860B"},
  dropset:{lbl:"D",name:"Drop set",color:"#7B4B94"}, failure:{lbl:"F",name:"Failure",color:"#E8500A"} };
const strengthLogs = (logs) => logs.filter(l=>l.exercises);
const flatWorking = (log) => (log.exercises||[]).flatMap(e=>e.sets.filter(isWorking).map(s=>({...s, ex:e.ex, muscle:e.muscle})));
const bestWeight = (logs, ex) => Math.max(0, ...strengthLogs(logs).flatMap(l=>flatWorking(l).filter(s=>s.ex===ex).map(s=>s.w)));
const best1RM = (logs, ex) => Math.max(0, ...strengthLogs(logs).flatMap(l=>flatWorking(l).filter(s=>s.ex===ex).map(s=>est1RM(s.w,s.reps))));
// PR shelf: heaviest set ever per exercise, sorted by weight.
const prShelf = (logs) => {
  const best = {};
  strengthLogs(logs).forEach(l=>flatWorking(l).forEach(s=>{ if(s.w>(best[s.ex]?.w??-1)) best[s.ex]={w:s.w,reps:s.reps,d:l.d}; }));
  return Object.entries(best).sort((a,b)=>b[1].w-a[1].w);
};
// est-1RM series for one exercise, oldest→newest, for the trend chart.
const exSeries = (logs, ex) => strengthLogs(logs).filter(l=>flatWorking(l).some(s=>s.ex===ex))
  .slice().sort((a,b)=>(b.daysAgo??0)-(a.daysAgo??0))
  .map(l=>{ const sets=flatWorking(l).filter(s=>s.ex===ex); return { d:l.d, top:Math.max(...sets.map(s=>s.w)), orm:Math.max(...sets.map(s=>est1RM(s.w,s.reps))) }; });
// sets-per-muscle-group within the last `days`.
const muscleVolume = (logs, days) => {
  const vol = {};
  strengthLogs(logs).filter(l=>(l.daysAgo??0)<=days).forEach(l=>(l.exercises||[]).forEach(e=>{
    const n = e.sets.filter(isWorking).length; vol[e.muscle]=(vol[e.muscle]||0)+n; }));
  return Object.entries(vol).sort((a,b)=>b[1]-a[1]);
};
const loggedDaySet = (logs) => new Set(logs.filter(l=>l.exercises||l.kind==="cardio").map(l=>l.daysAgo??0));

/* ---------- calorie estimates (MET-based; clearly "est") ---------- */
const MET = { "Run":9.8,"Cycle":7.5,"Swim":8,"Walk / Hike":3.8,"Row":7,"Sports":7,"Muay Thai":10,"Yoga / Mobility":3,"Other":5 };
const workingSetCount = (log) => (log.exercises||[]).reduce((a,e)=>a+e.sets.filter(isWorking).length,0);
// strength: est ~3 min/working-set at ~5 MET; cardio: MET × bodyweight × hours.
const estKcalStrength = (log, kg) => Math.round(5 * kg * (workingSetCount(log)*3/60));
const estKcalCardio = (mins, activity, kg) => Math.round((MET[activity]||5) * kg * ((mins||0)/60));
const estKcal = (log, kg) => log.exercises ? estKcalStrength(log,kg) : (log.mins ? estKcalCardio(log.mins, log.activity, kg) : null);
const estKcalRoutine = (r, kg) => Math.round(5 * kg * (r.items.reduce((a,i)=>a+(+i.sets||0),0)*3/60));

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
  const [shopTab, setShopTab] = useState("buy");     // Shop sub-view: buy | about | offers
  const [aboutCopy, setAboutCopy] = useState(seedAbout);
  const [offers, setOffers] = useState(seedOffers);
  const [aboutEdit, setAboutEdit] = useState(null);  // admin: edit About copy
  const [bioEdit, setBioEdit] = useState(null);      // admin: edit a coach bio {id, bio}
  const [offerSheet, setOfferSheet] = useState(null);// admin: add/edit an offer
  const [myClassBookings, setMyClassBookings] = useState([]);
  const [myPT, setMyPT] = useState([]);
  const [myWaitlist, setMyWaitlist] = useState([]);
  const [myCamps, setMyCamps] = useState([]);
  const [logs, setLogs] = useState(seedWorkoutSessions);
  const [logOpen, setLogOpen] = useState(null);
  const [progEx, setProgEx] = useState("Back Squat"); // exercise selected for the progress chart
  const [noteSheet, setNoteSheet] = useState(null); // activity/cardio logger
  const [exLib, setExLib] = useState(EXLIB);         // exercise library (custom exercises append)
  const [routines, setRoutines] = useState(seedRoutines);
  const [active, setActive] = useState(null);        // active workout: {title, exercises:[{ex,muscle,sets:[...]}]}
  const [exPicker, setExPicker] = useState(false);   // exercise picker open (for active workout)
  const [exSearch, setExSearch] = useState("");
  const [customEx, setCustomEx] = useState(null);    // {name,muscle} new-exercise form
  const [rest, setRest] = useState(null);            // rest timer {sec, ex}
  const [prToast, setPrToast] = useState(null);      // "New PR!" celebration
  const [plate, setPlate] = useState(null);          // plate calc {target, bar}
  const [routineSheet, setRoutineSheet] = useState(null); // build/assign a routine
  const [progMetric, setProgMetric] = useState("top"); // 'top' weight or 'orm' est-1RM
  const [logView, setLogView] = useState("train"); // Log sub-view: 'train' | 'progress'
  const [goal, setGoal] = useState({ workouts:4, kcal:2000 }); // client's weekly goal (Log → Progress)
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
  const [addLead, setAddLead] = useState(null);     // manual lead capture (walk-in / IG DM)
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
    setMeasForm(null); setIntakeForm(null); setCampBuilder(null); setTemplateBuilder(null);
    setDoneSheet(null); setRateSheet(null); setNoteSheet(null); setAddLead(null);
    setAboutEdit(null); setBioEdit(null); setOfferSheet(null);
    // log sub-overlays close first; the active workout itself is closed last
    if (exPicker||customEx||plate||routineSheet||rest) { setExPicker(false); setCustomEx(null); setPlate(null); setRoutineSheet(null); setRest(null); }
    else setActive(null); };
  const anyOverlay = !!(sheet||shopSheet||campSheet||chatOpen||timeOffSheet||moveSheet||moveDay||shiftEditor||addTrainer||measForm||intakeForm||campBuilder||templateBuilder||doneSheet||rateSheet||noteSheet||addLead||aboutEdit||bioEdit||offerSheet||active||exPicker||customEx||plate||routineSheet||rest);
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

  /* ---------- workout logger handlers (Strong-style active workout) ---------- */
  const startBlank = () => setActive({ title:"Workout", exercises:[] });
  const startFromRoutine = (r) => setActive({ title:r.name, routineId:r.id, exercises:r.items.map(it=>({
    ex:it.ex, muscle:it.muscle, sets:Array.from({length:it.sets}).map(()=>mkSet(bestWeight(logs,it.ex)||0, it.reps, "normal")) })) });
  const repeatLog = (l) => setActive({ title:l.title, exercises:(l.exercises||[]).map(e=>({ ex:e.ex, muscle:e.muscle, sets:e.sets.map(s=>({...s, done:false})) })) });
  const addExerciseToActive = (name) => { setActive(a=>({...a, exercises:[...a.exercises, { ex:name, muscle:muscleOf(name), sets:[mkSet(bestWeight(logs,name)||0, 8, "normal")] }]})); setExPicker(false); setExSearch(""); };
  const addSet = (ei) => setActive(a=>({...a, exercises:a.exercises.map((e,i)=>i!==ei?e:{...e, sets:[...e.sets, {...(e.sets[e.sets.length-1]||mkSet(0,8)), done:false}]})}));
  const updSet = (ei,si,field,val) => setActive(a=>({...a, exercises:a.exercises.map((e,i)=>i!==ei?e:{...e, sets:e.sets.map((s,j)=>j!==si?s:{...s,[field]:val})})}));
  const removeSet = (ei,si) => setActive(a=>({...a, exercises:a.exercises.map((e,i)=>i!==ei?e:{...e, sets:e.sets.filter((_,j)=>j!==si)})}));
  const removeExercise = (ei) => setActive(a=>({...a, exercises:a.exercises.filter((_,i)=>i!==ei)}));
  const cycleType = (ei,si) => { const order=["normal","warmup","dropset","failure"];
    setActive(a=>({...a, exercises:a.exercises.map((e,i)=>i!==ei?e:{...e, sets:e.sets.map((s,j)=>j!==si?s:{...s, type:order[(order.indexOf(s.type)+1)%order.length]})})})); };
  const toggleSetDone = (ei,si) => {
    const e = active.exercises[ei], s = e.sets[si];
    const nowDone = !s.done;
    updSet(ei,si,"done",nowDone);
    if (nowDone && isWorking(s) && s.w>0) {
      // live PR check against history
      if (s.w > bestWeight(logs, e.ex)) { setPrToast(`New PR! 🎉 ${e.ex} — ${s.w}kg`); setTimeout(()=>setPrToast(null),3200); }
      else if (est1RM(s.w,s.reps) > best1RM(logs, e.ex)) { setPrToast(`New est-1RM PR! 🎉 ${e.ex} — ${est1RM(s.w,s.reps)}kg`); setTimeout(()=>setPrToast(null),3200); }
      // auto-start rest timer (skip for warmups)
      setRest({ sec: exMeta(e.ex).rest, ex: e.ex });
    }
  };
  const finishWorkout = () => {
    const exs = active.exercises.filter(e=>e.sets.length>0);
    if (exs.length===0) { setActive(null); return; }
    const totalSets = exs.reduce((a,e)=>a+e.sets.filter(isWorking).length,0);
    const entry = { id:nid(), d:"Today", daysAgo:0, title:active.title||"Workout", kind:"self",
      detail: active.forClient ? `Coach-logged · ${tName(user.id)}` : "Self-logged",
      exercises:exs.map(e=>({ex:e.ex,muscle:e.muscle,sets:e.sets.map(s=>({w:s.w,reps:s.reps,type:s.type,rpe:s.rpe}))})) };
    const kc = estKcal(entry, measurements[measurements.length-1].weight);
    setLogs(l=>[entry,...l]);
    setActive(null); setRest(null);
    ping(`Workout saved — ${exs.length} exercises · ${totalSets} sets · ~${kc} kcal`);
  };
  const addCustomExercise = () => {
    if (!customEx.name.trim()) return;
    const nm = customEx.name.trim(), mg = customEx.muscle;
    setExLib(lib=>({...lib, [mg]:[...(lib[mg]||[]), nm]}));
    if (active) addExerciseToActive(nm);
    setCustomEx(null); setExPicker(false);
    ping(`"${nm}" added to your exercise library`);
  };

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

  /* ============================ LANDING / LOGIN ============================ */
  if (!user) return (
    <div className="min-h-screen flex justify-center" style={{background:"#E6DFD3", ...body, color:T.ink}}>
      <style>{FONTS}</style>
      <div className="w-full max-w-md min-h-screen flex flex-col" style={{background:T.paper}}>
        {/* warm hero */}
        <div style={{background:"linear-gradient(140deg,#FF5A3C 0%,#FFA53D 100%)", color:"#fff",
          padding:"46px 26px 54px", borderRadius:"0 0 36px 36px", position:"relative", overflow:"hidden"}}>
          <div style={{position:"absolute", right:-40, bottom:-60, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,.14)"}}/>
          <div style={{position:"absolute", right:40, top:-30, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,.12)"}}/>
          <div className="flex items-center gap-2 mb-8" style={{position:"relative"}}>
            <div style={{background:"#fff", borderRadius:12, padding:6, display:"flex"}}><LogoMark size={26}/></div>
            <span style={{...disp, fontWeight:800, fontSize:19, color:"#fff"}}>ExerciseOnly</span>
          </div>
          <h1 style={{...disp, fontWeight:800, fontSize:38, lineHeight:1.02, position:"relative"}}>Sore today,<br/>strong tomorrow.</h1>
          <p style={{fontSize:14, marginTop:12, opacity:.95, position:"relative"}}>One app for your training — book classes, PT &amp; camps, and log every workout.</p>
        </div>

        {/* body */}
        <div className="flex-1 px-6 pt-6 pb-8">
          <div style={{...disp, fontWeight:700, letterSpacing:".04em", fontSize:11, color:T.muted}} className="mb-3">CHOOSE A DEMO LOGIN</div>
          {[
            ["client","Sam Lee","Member · class + PT credits", T.accent],
            ["trainer","Dylan","Coach · trainer view", T.blue],
            ["admin","Danny","Head Coach & Owner · admin", T.moss],
          ].map(([role,name,sub,clr])=>(
            <button key={role} onClick={()=>login(role)}
              className="w-full text-left rounded-2xl p-4 mb-3 flex items-center gap-4"
              style={{background:T.card, border:`1.5px solid ${T.line}`, boxShadow:"0 6px 16px rgba(150,110,70,.06)"}}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{...disp, fontWeight:800, fontSize:19, background:clr, color:"#fff"}}>{name[0]}</div>
              <div className="flex-1">
                <div style={{...disp, fontWeight:700, fontSize:16}}>{name}</div>
                <div className="text-xs" style={{color:T.muted}}>{sub}</div>
              </div>
              <div style={{color:clr, ...disp, fontWeight:700}} className="text-sm">Enter →</div>
            </button>
          ))}
          <div className="text-xs mt-2" style={{color:T.muted}}>{locations.map(l=>l.name).join(" · ")}</div>
          <div className="flex gap-2 mt-4 justify-center">
            <Social label="Instagram" href="https://instagram.com/exercise.only" color="#E1306C"
              path="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.26 2.2.43.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.2a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z"/>
            <Social label="Facebook" href="https://facebook.com/exercise.only" color="#1877F2"
              path="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/>
            <Social label="WhatsApp" href="https://wa.me/6581006608" color="#25D366"
              path="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1-.1.2-.3.2-.6.1-1.6-.8-2.6-1.4-3.7-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3ZM12 3.5A8.5 8.5 0 0 0 4.6 16.3L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z"/>
            <Social label="X" href="https://x.com/exercise.only" color="#111111"
              path="M18.9 3H21l-6.5 7.4L22 21h-6l-4.7-6.1L5.9 21H3.8l7-8L2 3h6.1l4.2 5.6L18.9 3Zm-2.1 16.2h1.2L7.3 4.7H6l10.8 14.5Z"/>
          </div>
          <div className="text-center text-xs mt-4" style={{color:T.muted}}>Demo build — SMS OTP login in production. Data resets on refresh.</div>
        </div>
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
          <div className="flex items-center gap-2.5">
            <LogoMark size={28}/>
            <div>
              <Wordmark size={19}/>
              <div className="text-xs" style={{color:T.muted}}>{isAdmin?"Admin console":isClient?"Member":"Coach"}</div>
            </div>
          </div>
          <button onClick={()=>setUser(null)} className="text-xs font-bold px-3 py-2 rounded-lg"
            style={{...disp, border:`1.5px solid ${T.line}`, color:T.muted}}>Log out</button>
        </header>

        {/* ==================== CLIENT: HOME (Solar Warm dashboard) ==================== */}
        {isClient && tab==="home" && (() => {
          const todayStr = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase().replace(',','');
          const upC = myClassBookings.map(sid=>{const s=sessions.find(x=>x.id===sid); return {t:s.day*1440+toMin(s.time), time:s.time, day:s.day, title:CT[s.type].name, sub:`${locName(s.loc)} · Coach ${tName(s.trainer)}`};});
          const upP = myPT.map(b=>({t:b.day*1440+toMin(b.time), time:b.time, day:b.day, title:"Personal Training", sub:`${b.loc==="other"?b.otherLabel:locName(b.loc)} · Coach ${tName(b.trainer)}`}));
          const hero = [...upC,...upP].sort((a,b)=>a.t-b.t)[0];
          const bodyKg = measurements[measurements.length-1].weight;
          const weekWorkouts = strengthLogs(logs).filter(l=>(l.daysAgo??0)<=7).length;
          const weekKcal = logs.filter(l=>(l.daysAgo??0)<=7).reduce((a,l)=>a+(estKcal(l,bodyKg)||0),0);
          const prsN = prShelf(logs).length;
          // weekly-goal completion: blend of workouts + active-kcal progress
          const wR = Math.min(1, weekWorkouts/(goal.workouts||1));
          const kR = Math.min(1, weekKcal/(goal.kcal||1));
          const ringPct = Math.round((wR+kR)/2*100);
          const nothing = myClassBookings.length===0 && myPT.length===0 && myCamps.length===0 && myWaitlist.length===0;
          return (
          <main className="flex-1 pb-24 px-5">
            {/* greeting + activity ring */}
            <div className="flex items-start justify-between mb-3 mt-1">
              <div>
                <div className="text-sm" style={{color:T.muted}}>Good morning,</div>
                <div style={{...disp,fontWeight:800,fontSize:24}}>{user.name}</div>
                <div style={{...disp,fontWeight:700,letterSpacing:".1em",fontSize:10,color:T.accent,marginTop:3}}>{todayStr}</div>
              </div>
              <div style={{width:66,height:66,borderRadius:"50%",display:"grid",placeItems:"center",position:"relative",
                background:`conic-gradient(${T.accent} ${ringPct}%, #f0e7d8 0)`}}>
                <span style={{position:"absolute",inset:7,borderRadius:"50%",background:T.paper}}/>
                <b style={{position:"relative",zIndex:2,...disp,fontWeight:800,fontSize:16}}>{ringPct}%</b>
              </div>
            </div>

            {/* Next up hero */}
            {hero ? (
              <div style={{position:"relative",borderRadius:26,padding:18,overflow:"hidden",color:"#fff",marginBottom:12,
                background:"linear-gradient(130deg,#FF5A3C 5%,#FFA53D 100%)",boxShadow:"0 18px 34px rgba(255,110,60,.28)"}}>
                <div style={{position:"absolute",right:-30,bottom:-44,width:158,height:158,borderRadius:"50%",background:"rgba(255,255,255,.14)"}}/>
                <span style={{...disp,fontWeight:700,fontSize:11,color:T.accent,background:"#fff",padding:"5px 11px",borderRadius:999}}>● NEXT UP · {DAYS[hero.day]} {hero.time}</span>
                <div style={{...disp,fontWeight:800,fontSize:21,marginTop:10,position:"relative"}}>{hero.title}</div>
                <div className="text-xs" style={{marginTop:3,opacity:.94,position:"relative"}}>{hero.sub}</div>
                <div className="flex items-center gap-3" style={{marginTop:14,position:"relative"}}>
                  <button onClick={()=>ping("Checked in — see you there! 💪")} style={{flex:1,...disp,fontWeight:700,fontSize:14,padding:12,borderRadius:14,border:"none",background:"#fff",color:T.accent}}>Check in</button>
                  <button onClick={()=>{setTab("book"); setSeg("mine");}} className="text-xs font-semibold" style={{color:"#fff",opacity:.95,textDecoration:"underline",whiteSpace:"nowrap"}}>Manage bookings</button>
                </div>
              </div>
            ) : (
              <div style={{position:"relative",borderRadius:26,padding:20,overflow:"hidden",color:"#fff",marginBottom:12,
                background:"linear-gradient(130deg,#FF5A3C 5%,#FFA53D 100%)"}}>
                <div style={{...disp,fontWeight:800,fontSize:20}}>Ready to move?</div>
                <div className="text-xs" style={{opacity:.94,marginTop:2}}>Nothing booked yet — grab a class, PT or camp.</div>
                <button onClick={()=>setTab("book")} style={{...disp,fontWeight:700,fontSize:14,padding:"11px 16px",borderRadius:14,border:"none",background:"#fff",color:T.accent,marginTop:12}}>Book a session</button>
              </div>
            )}

            {/* quick stats */}
            <div className="flex gap-2.5 mb-3">
              <div className="flex-1 text-center" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:"12px 6px"}}>
                <div style={{...disp,fontWeight:800,fontSize:26,color:T.accent}}>{weekWorkouts}</div><div style={{...disp,fontWeight:700,fontSize:9,color:T.muted,letterSpacing:".04em"}}>WORKOUTS/WK</div></div>
              <div className="flex-1 text-center" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:"12px 6px"}}>
                <div style={{...disp,fontWeight:800,fontSize:26,color:T.blue}}>{prsN}</div><div style={{...disp,fontWeight:700,fontSize:9,color:T.muted,letterSpacing:".04em"}}>PRS</div></div>
              <div className="flex-1 text-center" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:"12px 6px"}}>
                <div style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{weekKcal>=1000?(weekKcal/1000).toFixed(1)+"k":weekKcal}</div><div style={{...disp,fontWeight:700,fontSize:9,color:T.muted,letterSpacing:".04em"}}>KCAL/WK</div></div>
            </div>

            {/* quick start */}
            <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-2">JUMP BACK IN</div>
            <div className="flex gap-2.5 mb-4">
              <button onClick={()=>{setTab("log"); setLogView("train"); startBlank();}} className="flex-1 flex items-center gap-2.5" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:12,textAlign:"left"}}>
                <div style={{width:34,height:34,borderRadius:12,background:T.accent,color:"#fff",display:"grid",placeItems:"center",fontWeight:800,fontSize:16}}>＋</div>
                <div><div style={{...disp,fontWeight:700,fontSize:13}}>Start workout</div><div className="text-xs" style={{color:T.muted}}>Log &amp; beat PRs</div></div>
              </button>
              <button onClick={()=>setTab("book")} className="flex-1 flex items-center gap-2.5" style={{background:T.card,border:`1.5px solid ${T.line}`,borderRadius:20,padding:12,textAlign:"left"}}>
                <div style={{width:34,height:34,borderRadius:12,background:T.blue,color:"#fff",display:"grid",placeItems:"center",fontWeight:800,fontSize:16}}>↻</div>
                <div><div style={{...disp,fontWeight:700,fontSize:13}}>Book class</div><div className="text-xs" style={{color:T.muted}}>This week</div></div>
              </button>
            </div>

            {/* pack balance strip */}
            <div style={{background:T.ink,color:"#fff",borderRadius:20,padding:14,marginBottom:14}}>
              <div style={{...disp,fontWeight:700,fontSize:10,letterSpacing:".06em",color:"#C9BEB0"}}>MY BALANCE</div>
              <div className="flex gap-5 mt-1 flex-wrap">
                <div><span style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{credits.classes}</span> <span className="text-xs" style={{color:"#C9BEB0"}}>class</span></div>
                <div><span style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{credits.ptHead}</span> <span className="text-xs" style={{color:"#C9BEB0"}}>PT · head</span></div>
                <div><span style={{...disp,fontWeight:800,fontSize:26,color:T.amber}}>{credits.ptCoach}</span> <span className="text-xs" style={{color:"#C9BEB0"}}>PT · coach</span></div>
              </div>
              {classPass && <div className="text-xs mt-2 font-semibold" style={{color:T.moss}}>✓ {classPass.label} active — classes covered</div>}
            </div>

          </main>);})()}

        {/* ==================== CLIENT: BOOK ==================== */}
        {isClient && tab==="book" && (
          <main className="flex-1 pb-24">
            <div className="px-5 flex gap-2 pb-2 overflow-x-auto">
              {[["classes","Classes"],["pt","Personal Training"],["camps","Camps"],["mine","My bookings"]].map(([k,l])=>(
                <Chip key={k} active={seg===k} onClick={()=>setSeg(k)}>{l}</Chip>))}
            </div>
            {seg!=="camps" && seg!=="mine" && <>
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

            {/* MY BOOKINGS — view & cancel (moved here from Home) */}
            {seg==="mine" && (() => {
              const none = myClassBookings.length===0 && myPT.length===0 && myCamps.length===0 && myWaitlist.length===0;
              return (
              <div className="px-5 space-y-3 pt-1">
                {none && <div className="text-center py-12 text-sm" style={{color:T.muted}}>No bookings yet. Book a class, PT or camp from the tabs above.</div>}
                {myClassBookings.map(sid=>{ const s=sessions.find(x=>x.id===sid); return (
                  <Card key={sid} className="flex items-center gap-3">
                    <div style={{...disp,fontWeight:700,fontSize:20,minWidth:52}} className="text-right">{s.time}</div>
                    <div className="flex-1"><div className="font-semibold text-sm">{CT[s.type].name} · {DAYS[s.day]}</div>
                      <div className="text-xs" style={{color:T.muted}}>{locName(s.loc)} · Coach {tName(s.trainer)}</div></div>
                    <Btn kind="ghost" small onClick={()=>cancelClass(sid)}>Cancel</Btn>
                  </Card>);})}
                {myPT.map(b=>(
                  <Card key={b.id} className="flex items-center gap-3">
                    <div style={{...disp,fontWeight:700,fontSize:20,minWidth:52}} className="text-right">{b.time}</div>
                    <div className="flex-1"><div className="font-semibold text-sm">Personal Training · {DAYS[b.day]}</div>
                      <div className="text-xs" style={{color:T.muted}}>{b.loc==="other" ? b.otherLabel : locName(b.loc)} · Coach {tName(b.trainer)}</div></div>
                    <Btn kind="ghost" small onClick={()=>cancelPT(b.id)}>Cancel</Btn>
                  </Card>))}
                {myCamps.map(cid=>{ const c=camps.find(x=>x.id===cid); const canCancel=(c.startInDays??99)>CAMP_CANCEL_DAYS; return (
                  <Card key={cid} className="flex items-center gap-3" style={{background:"#F3EEF5"}}>
                    <div className="flex-1"><div className="font-semibold text-sm">{c.name}</div>
                      <div className="text-xs" style={{color:T.plum}}>{c.dates} · {locName(c.loc)}{c.type==="Kids"?" · waiver on file":""}</div></div>
                    {canCancel ? <Btn kind="ghost" small onClick={()=>cancelCamp(cid)}>Cancel</Btn>
                      : <span className="text-xs text-right" style={{color:T.muted}}>Cancellation<br/>closed</span>}
                  </Card>);})}
                {myWaitlist.map(sid=>{ const s=sessions.find(x=>x.id===sid); return (
                  <Card key={sid} className="flex items-center gap-3" style={{background:"#FBF3EC"}}>
                    <div className="flex-1"><div className="font-semibold text-sm">Waitlisted · {CT[s.type].name} · {DAYS[s.day]} {s.time}</div>
                      <div className="text-xs" style={{color:T.accent}}>We'll WhatsApp you if a spot opens</div></div>
                  </Card>);})}
                {!none && <div className="text-xs text-center pt-1" style={{color:T.muted}}>Free cancellation until 24h before. Inside 24h, message your coach.</div>}
              </div>);})()}
          </main>)}

        {/* ==================== CLIENT: LOG ==================== */}
        {isClient && tab==="log" && (() => {
          const prs = prShelf(logs);
          const allEx = [...new Set(strengthLogs(logs).flatMap(l=>(l.exercises||[]).map(e=>e.ex)))];
          const series = exSeries(logs, progEx);
          const maxV = Math.max(1, ...series.map(s=>progMetric==="orm"?s.orm:s.top));
          const vol = muscleVolume(logs, 30);
          const maxVol = Math.max(1, ...vol.map(v=>v[1]));
          const dayset = loggedDaySet(logs);
          const weekWorkouts = strengthLogs(logs).filter(l=>(l.daysAgo??0)<=7).length;
          const myRoutines = routines.filter(r=>r.owner==="sam" || r.assignedTo==="Sam Lee");
          const bodyKg = measurements[measurements.length-1].weight;
          const monthLogs = logs.filter(l=>(l.daysAgo??0)<=31); // history: last month only
          const weekKcal = logs.filter(l=>(l.daysAgo??0)<=7).reduce((a,l)=>a+(estKcal(l,bodyKg)||0),0);
          return (
          <main className="flex-1 pb-24 px-5">
            <H>Training log</H>
            <div className="flex gap-2 mb-3">
              <Chip active={logView==="train"} onClick={()=>setLogView("train")}>Train</Chip>
              <Chip active={logView==="progress"} onClick={()=>setLogView("progress")}>Progress</Chip>
            </div>

            {/* ---------------- TRAIN: start, routines, history ---------------- */}
            {logView==="train" && (<>
              <Card className="mb-3" style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="text-sm" style={{color:"#B9B5A9"}}>{weekWorkouts} workout{weekWorkouts!==1?"s":""} this week{weekKcal>0?` · ~${weekKcal} kcal burned`:""}</div>
                <div className="mt-2"><Btn full onClick={startBlank}>Start a workout</Btn></div>
                <button onClick={()=>setNoteSheet({activity:"Run", duration:"", distance:"", notes:""})}
                  className="w-full text-center text-xs mt-2 font-semibold" style={{color:"#B9B5A9"}}>or log a run / cardio activity</button>
              </Card>

              {/* routines */}
              <Card className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold" style={{color:T.muted}}>MY ROUTINES</div>
                  <Btn small kind="ghost" onClick={()=>setRoutineSheet({name:"", items:[], owner:"sam"})}>+ New</Btn>
                </div>
                {myRoutines.length===0 && <div className="text-xs" style={{color:T.muted}}>No routines yet. Build one, or ask your coach to assign a plan.</div>}
                {myRoutines.map(r=>(
                  <div key={r.id} className="flex items-center justify-between py-1.5">
                    <div><div className="font-semibold text-sm">{r.name} {r.assignedTo && r.owner!=="sam" && <span className="text-xs" style={{color:T.plum}}>· from Coach {tName(r.owner)}</span>}</div>
                      <div className="text-xs" style={{color:T.muted}}>{r.items.length} exercises · ~{estKcalRoutine(r,bodyKg)} kcal</div></div>
                    <Btn small onClick={()=>startFromRoutine(r)}>Start</Btn>
                  </div>))}
              </Card>

              {/* history — last 30 days */}
              <div className="text-xs font-bold mb-1.5" style={{color:T.muted}}>HISTORY · last 30 days</div>
              <div className="space-y-2">
                {monthLogs.map((l)=>{ const kc=estKcal(l,bodyKg); return (
                  <Card key={l.id||l.title+l.d}>
                    <div className="flex justify-between items-center" onClick={()=>l.exercises && setLogOpen(logOpen===l.id?null:l.id)}>
                      <div><div className="font-semibold text-sm">{l.title} {l.kind==="cardio" && <span className="text-xs" style={{color:T.moss}}>· activity</span>}</div>
                        <div className="text-xs" style={{color:T.muted}}>{l.exercises ? `${l.exercises.length} exercises` : l.detail}{kc?` · ~${kc} kcal`:""}</div></div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold" style={{color:T.muted}}>{l.d}</div>
                        {l.exercises && <span className="text-xs" style={{color:T.navy}}>{logOpen===l.id?"▴":"▾"}</span>}
                      </div>
                    </div>
                    {l.exercises && logOpen===l.id && (
                      <div className="mt-3 pt-3 space-y-2" style={{borderTop:`1.5px solid ${T.line}`}}>
                        {l.exercises.map((e,i)=>(
                          <div key={i}>
                            <div className="text-sm font-semibold">{e.ex} <span className="text-xs font-normal" style={{color:T.muted}}>· {e.muscle}</span></div>
                            {e.sets.map((s,j)=>(
                              <div key={j} className="flex justify-between text-xs py-0.5" style={{color:T.muted}}>
                                <span><span className="font-bold" style={{color:SET_TYPES[s.type]?.color||T.ink}}>{SET_TYPES[s.type]?.lbl||"N"}</span> set {j+1}</span>
                                <span className="font-semibold" style={{color:T.ink}}>{s.reps} × {s.w}kg{s.rpe?` · RPE ${s.rpe}`:""}</span>
                              </div>))}
                          </div>))}
                        <Btn small full kind="ghost" onClick={()=>repeatLog(l)}>Repeat this workout</Btn>
                      </div>)}
                  </Card>);})}
              </div>
            </>)}

            {/* ---------------- PROGRESS: streak, PRs, charts, body stats ---------------- */}
            {logView==="progress" && (() => {
              const bodyKg = measurements[measurements.length-1].weight;
              const weekWorkouts = strengthLogs(logs).filter(l=>(l.daysAgo??0)<=7).length;
              const weekKcal = logs.filter(l=>(l.daysAgo??0)<=7).reduce((a,l)=>a+(estKcal(l,bodyKg)||0),0);
              const wPct = Math.min(100, Math.round(weekWorkouts/(goal.workouts||1)*100));
              const kPct = Math.min(100, Math.round(weekKcal/(goal.kcal||1)*100));
              return (<>
              {/* weekly goal — client sets it, drives the Home ring */}
              <Card className="mb-3">
                <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-2">MY WEEKLY GOAL</div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Workouts</span>
                    <button onClick={()=>setGoal(g=>({...g,workouts:Math.max(1,g.workouts-1)}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>−</button>
                    <span className="text-sm font-bold w-5 text-center">{goal.workouts}</span>
                    <button onClick={()=>setGoal(g=>({...g,workouts:g.workouts+1}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>+</button>
                  </div>
                  <span className="text-xs" style={{color:T.muted}}>{weekWorkouts}/{goal.workouts} done</span>
                </div>
                <div className="rounded-full h-2 mb-3" style={{background:"#efe7d8"}}><div className="h-2 rounded-full" style={{width:`${wPct}%`,background:T.accent}}/></div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Active kcal</span>
                    <button onClick={()=>setGoal(g=>({...g,kcal:Math.max(500,g.kcal-250)}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>−</button>
                    <span className="text-sm font-bold w-12 text-center">{goal.kcal}</span>
                    <button onClick={()=>setGoal(g=>({...g,kcal:g.kcal+250}))} className="w-6 h-6 rounded-lg font-bold" style={{border:`1.5px solid ${T.line}`}}>+</button>
                  </div>
                  <span className="text-xs" style={{color:T.muted}}>{weekKcal}/{goal.kcal}</span>
                </div>
                <div className="rounded-full h-2" style={{background:"#efe7d8"}}><div className="h-2 rounded-full" style={{width:`${kPct}%`,background:T.amber}}/></div>
                <div className="text-xs mt-2" style={{color:T.muted}}>Your Home ring shows the average of these two.</div>
              </Card>
              <Card className="mb-3" style={{background:T.ink,color:T.paper,border:"none"}}>
                <div className="flex gap-5 mb-2">
                  <div><span style={{...disp,fontWeight:700,fontSize:26,color:T.accent}}>{weekWorkouts}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>workouts / 7d</span></div>
                  <div><span style={{...disp,fontWeight:700,fontSize:26,color:T.accent}}>{prs.length}</span> <span className="text-xs" style={{color:"#B9B5A9"}}>PRs tracked</span></div>
                </div>
                <div className="text-xs mb-1" style={{color:"#B9B5A9"}}>LAST 3 WEEKS</div>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({length:21}).map((_,i)=>{ const off=20-i; const on=dayset.has(off);
                    return <span key={i} title={`${off}d ago`} style={{width:11,height:11,borderRadius:3,background:on?T.accent:"#3A362B"}}/>; })}
                </div>
              </Card>

              {prs.length>0 && (
                <Card className="mb-3" style={{background:"#FBF3EC"}}>
                  <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>PERSONAL RECORDS 🏆</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {prs.slice(0,6).map(([ex,pr])=>(
                      <div key={ex} className="text-sm"><span className="font-bold">{pr.w}kg</span> <span className="text-xs" style={{color:T.muted}}>{ex} · {pr.reps}r</span></div>))}
                  </div>
                </Card>)}

              {allEx.length>0 && (
                <Card className="mb-3" style={{background:"#EEF1F6"}}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-bold" style={{color:T.navy}}>PROGRESS</div>
                    <div className="flex gap-1.5 items-center">
                      <button onClick={()=>setProgMetric(m=>m==="top"?"orm":"top")} className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.navy}}>{progMetric==="orm"?"est 1RM":"top set"}</button>
                      <select value={progEx} onChange={e=>setProgEx(e.target.value)} className="text-xs font-semibold px-2 py-1 rounded-lg outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}>
                        {allEx.map(ex=><option key={ex} value={ex}>{ex}</option>)}
                      </select>
                    </div>
                  </div>
                  {series.length===0 ? <div className="text-xs" style={{color:T.muted}}>No logged sets for {progEx} yet.</div> : (
                    <div className="flex items-end gap-3">
                      {series.map((s,i)=>{ const v=progMetric==="orm"?s.orm:s.top; return (
                        <div key={i} className="text-center">
                          <div className="rounded-t" style={{width:24,height:20+v/maxV*60,background:T.navy}}/>
                          <div className="text-[10px] mt-1" style={{color:T.muted}}>{v}kg</div>
                          <div className="text-[9px]" style={{color:T.muted}}>{s.d}</div>
                        </div>);})}
                    </div>)}
                </Card>)}

              {vol.length>0 && (
                <Card className="mb-3">
                  <div className="text-xs font-bold mb-2" style={{color:T.muted}}>VOLUME BY MUSCLE · sets, last 30d</div>
                  <div className="space-y-1.5">
                    {vol.map(([m,n])=>(
                      <div key={m} className="flex items-center gap-2">
                        <span className="text-xs w-16" style={{color:T.muted}}>{m}</span>
                        <div className="flex-1 rounded-full h-3" style={{background:"#EFEBE3"}}>
                          <div className="h-3 rounded-full" style={{width:`${n/maxVol*100}%`,background:T.moss}}/></div>
                        <span className="text-xs font-bold w-6 text-right">{n}</span>
                      </div>))}
                  </div>
                </Card>)}

              <Card style={{background:"#EFF3EE"}}>
                <div className="text-xs font-bold mb-1" style={{color:T.moss}}>BODY STATS · coach-tracked</div>
                <div className="flex gap-6">
                  <div><span style={{...disp,fontWeight:700,fontSize:26}}>{measurements[measurements.length-1].weight}</span><span className="text-xs" style={{color:T.muted}}> kg</span></div>
                  <div><span style={{...disp,fontWeight:700,fontSize:26}}>{measurements[measurements.length-1].fat}</span><span className="text-xs" style={{color:T.muted}}> % fat</span></div>
                  <div className="text-xs self-end pb-1" style={{color:T.moss}}>▾ {(measurements[0].fat-measurements[measurements.length-1].fat).toFixed(1)}% since 1 Jul</div>
                </div>
              </Card>
            </>);})()}
          </main>);})()}

        {/* ==================== CLIENT: SHOP (Buy · About · Offers) ==================== */}
        {isClient && tab==="shop" && (
          <main className="flex-1 pb-24 px-5">
            <H>Shop</H>
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {[["buy","Packages"],["about","About"],["offers","Offers"]].map(([k,l])=>(
                <Chip key={k} active={shopTab===k} onClick={()=>setShopTab(k)}>{l}</Chip>))}
            </div>

            {/* ---- BUY ---- */}
            {shopTab==="buy" && (<>
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
              <div className="text-xs" style={{color:T.muted}}>Got a coupon from Offers? Apply it at checkout. Price changes never affect packs you've already bought.</div>
            </>)}

            {/* ---- ABOUT (explains classes + PT, coach bios) ---- */}
            {shopTab==="about" && (<>
              <Card className="mb-3">
                <div className="flex items-center justify-between">
                  <div style={{...disp,fontWeight:800,fontSize:16}}>Group classes</div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.accent,color:"#fff"}}>Classes</span>
                </div>
                <div className="text-sm mt-1.5" style={{color:T.muted}}>{aboutCopy.classes}</div>
              </Card>
              <Card className="mb-3">
                <div className="flex items-center justify-between">
                  <div style={{...disp,fontWeight:800,fontSize:16}}>Personal training</div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.blue,color:"#fff"}}>1-to-1</span>
                </div>
                <div className="text-sm mt-1.5" style={{color:T.muted}}>{aboutCopy.pt}</div>
              </Card>
              <Sub>YOUR COACHES</Sub>
              <div className="space-y-3">
                {trainers.map(t=>(
                  <Card key={t.id} className="flex gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{...disp,fontWeight:800,fontSize:18,background:t.admin?T.accent:T.blue,color:"#fff",flex:"none"}}>{t.name[0]}</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{t.name} <span className="text-xs font-normal" style={{color:T.muted}}>· {t.tag||"Coach"}</span></div>
                      <div className="text-xs mt-0.5" style={{color:T.muted}}>{t.bio || "Bio coming soon."}</div>
                    </div>
                  </Card>))}
              </div>
              <div className="text-xs mt-3" style={{color:T.muted}}>Danny keeps this page and coach write-ups up to date from his admin login.</div>
            </>)}

            {/* ---- OFFERS ---- */}
            {shopTab==="offers" && (<>
              <div className="space-y-3">
                {offers.map(o=>(
                  <Card key={o.id} style={{borderColor:o.color, borderWidth:1.5}}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:o.color,color:"#fff"}}>{o.kind}</span>
                      <div style={{...disp,fontWeight:800,fontSize:16}}>{o.title}</div>
                    </div>
                    <div className="text-sm" style={{color:T.muted}}>{o.blurb}</div>
                    <div className="mt-2">
                      {o.kind==="Referral"
                        ? <Btn small onClick={()=>ping("Referral link copied — share on WhatsApp / Instagram")}>Share my code</Btn>
                        : <Btn small onClick={()=>{setShopTab("buy"); setCoupon(o.code); ping(`Coupon ${o.code} ready — buy a pack and it's applied at checkout`);}}>Get code · {o.code}</Btn>}
                    </div>
                  </Card>))}
              </div>
              <div className="text-xs mt-3" style={{color:T.muted}}>Coupons apply at checkout on the Packages tab. One offer per purchase.</div>
            </>)}
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

            {/* connect / follow */}
            <Card>
              <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-2">CONNECT WITH EXERCISEONLY</div>
              <div className="flex gap-2">
                <Social label="Instagram" href="https://instagram.com/exercise.only" color="#E1306C"
                  path="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.26 2.2.43.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.2a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z"/>
                <Social label="Facebook" href="https://facebook.com/exercise.only" color="#1877F2"
                  path="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/>
                <Social label="WhatsApp" href="https://wa.me/6581006608" color="#25D366"
                  path="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1-.1.2-.3.2-.6.1-1.6-.8-2.6-1.4-3.7-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3ZM12 3.5A8.5 8.5 0 0 0 4.6 16.3L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z"/>
                <Social label="X" href="https://x.com/exercise.only" color="#111111"
                  path="M18.9 3H21l-6.5 7.4L22 21h-6l-4.7-6.1L5.9 21H3.8l7-8L2 3h6.1l4.2 5.6L18.9 3Zm-2.1 16.2h1.2L7.3 4.7H6l10.8 14.5Z"/>
              </div>
              <div className="text-xs mt-2" style={{color:T.muted}}>@exercise.only · 4exerciseonly@gmail.com</div>
            </Card>

            {/* support */}
            <a href="mailto:support@exerciseonly.app?subject=App%20issue%20report" className="block">
              <Card className="flex items-center justify-between">
                <div><div className="font-semibold text-sm">Report an issue</div>
                  <div className="text-xs" style={{color:T.muted}}>Something not working? Email the app team.</div></div>
                <span style={{...disp,fontWeight:700,color:T.accent}} className="text-sm">Contact →</span>
              </Card>
            </a>

            <div className="text-xs text-center" style={{color:T.muted}}>Privacy policy · Request account deletion · v0 demo</div>
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
            {/* PR feed — a low-effort reason to congratulate clients (retention driver) */}
            <Card className="mb-3" style={{background:"#FBF3EC"}}>
              <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>RECENT CLIENT PRs 🏆</div>
              <div className="space-y-0.5">
                <div className="text-sm">Sam Lee — <b>Back Squat 85kg</b> <span className="text-xs" style={{color:T.muted}}>· today</span></div>
                <div className="text-sm">Ben — <b>Deadlift 140kg</b> <span className="text-xs" style={{color:T.muted}}>· yesterday</span></div>
                <div className="text-sm">Priya — <b>Bench Press 47.5kg</b> <span className="text-xs" style={{color:T.muted}}>· 2d ago</span></div>
              </div>
            </Card>
            {["Sam Lee","Ben","Cheryl","Priya","Kumar","Elaine"].map(n=>(
              <Card key={n} className="mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{background:T.line}}>{n[0]}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{n}</div>
                    <div className="text-xs" style={{color:T.muted}}>{n==="Sam Lee"?`${credits.classes} class + ${credits.ptHead+credits.ptCoach} PT credits`:"Active member"}</div></div>
                  <div className="flex gap-1.5">
                    <Btn small kind="ghost" onClick={()=>setMeasForm({who:n, weight:"", fat:""})}>+ Stats</Btn>
                    <Btn small kind="ghost" onClick={()=>setIntakeForm({who:n})}>+ Intake</Btn>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <Btn small kind="ghost" onClick={()=>{setActive({title:`${n} — coach-logged`, forClient:n, exercises:[]}); ping(`Logging a session for ${n}`);}}>Log workout</Btn>
                  <Btn small kind="ghost" onClick={()=>setRoutineSheet({name:"", items:[], owner:user.id, assignedTo:n})}>Assign routine</Btn>
                </div>
              </Card>))}
            <div className="text-xs mt-2" style={{color:T.muted}}>
              Trainers co-author the log: log a session for a client, assign a routine (they see it in their Log), and enter stats/intake. {isAdmin?"Admin can also create / import (CSV) / deactivate clients from Manage → People.":"Payment amounts stay hidden."}
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
            <div className="flex gap-2 pb-3">
              {[["dash","Dash"],["people","People"],["products","Products"],["money","Money"],
                ["settings",<svg key="g" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>]].map(([k,l])=>(
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
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{color:T.muted}}>LEADS · enquiry, Instagram & referrals</div>
                <Btn small kind="ghost" onClick={()=>setAddLead({name:"", phone:"", source:"Walk-in", note:""})}>+ Add lead</Btn>
              </div>
              {leads.map(l=>{ const wa = (l.phone||"").replace(/\D/g,""); return (
                <Card key={l.id} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{l.name} {l.phone && <span className="text-xs font-normal" style={{color:T.muted}}>· +65 {l.phone}</span>}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.line}}>{l.source}</span>
                  </div>
                  <div className="text-xs mt-0.5" style={{color:T.muted}}>{l.note}</div>
                  {/* one-tap contact-back */}
                  <div className="flex gap-1.5 mt-2">
                    <button disabled={!wa} onClick={()=>{ if(l.status==="new") setLeads(ls=>ls.map(x=>x.id!==l.id?x:{...x,status:"contacted"})); ping(wa?`Opening WhatsApp to +65 ${l.phone} (deep-link in production)`:"No number on file"); }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{background:wa?"#25D366":T.line, color:"#fff", opacity:wa?1:.5}}>WhatsApp</button>
                    <button disabled={!wa} onClick={()=>ping(wa?`Calling +65 ${l.phone}…`:"No number on file")}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{border:`1.5px solid ${T.line}`, color:wa?T.ink:T.muted}}>Call</button>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {["new","contacted","trial booked","converted","lost"].map(st=>(
                      <button key={st} onClick={()=>setLeads(ls=>ls.map(x=>x.id!==l.id?x:{...x,status:st}))}
                        className="text-xs font-bold px-2 py-1 rounded-lg"
                        style={{background:l.status===st?T.plum:"transparent", color:l.status===st?"#fff":T.muted, border:`1px solid ${l.status===st?T.plum:T.line}`}}>{st}</button>))}
                  </div>
                </Card>);})}
              <Btn full kind="ghost" onClick={()=>ping("Instagram booking link — opens this same flow from your bio/stories")}>View Instagram booking link</Btn>
              <div className="text-xs font-bold pt-2" style={{color:T.muted}}>TRAINERS · rate + permissions</div>
              {trainers.filter(t=>!t.admin).map(t=>{ const rt=rates[t.id]; return (
                <Card key={t.id}>
                  <div className="flex items-center justify-between">
                    <div><div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs" style={{color:T.muted}}>{t.tag} · {rt ? (rt.type==="salary" ? `$${rt.monthly}/mo salary` : `$${rt.perClass}/class · $${rt.perPt}/PT`) : "rate not set"}</div></div>
                    <div className="flex gap-1.5">
                      <Btn small kind="ghost" onClick={()=>setAddTrainer({editId:t.id, name:t.name, phone:t.phone||"", bio:t.bio||"", payType:rt?.type||"per_class", perClass:rt?.perClass||"", perPt:rt?.perPt||"", monthly:rt?.monthly||""})}>Edit</Btn>
                      <Btn small kind="ghost" onClick={()=>setPermOpen(permOpen===t.id?null:t.id)}>Perms</Btn>
                      <Btn small kind="ghost" onClick={()=>ping(`${t.name} deactivated (demo) — their sessions need reassignment`)}>Deactivate</Btn>
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

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-bold" style={{color:T.muted}}>OFFERS &amp; PROMOS · shown in Shop → Offers</div>
                <Btn small kind="ghost" onClick={()=>setOfferSheet({kind:"This month", title:"", blurb:"", code:"", color:"#1E50A0"})}>+ Add</Btn>
              </div>
              {offers.map(o=>(
                <Card key={o.id} className="!p-3 flex items-center gap-3">
                  <div className="flex-1"><div className="font-semibold text-sm">{o.title} <span className="text-xs font-normal" style={{color:T.muted}}>· {o.kind}{o.code?` · ${o.code}`:""}</span></div>
                    <div className="text-xs" style={{color:T.muted}}>{o.blurb}</div></div>
                  <button onClick={()=>{setOffers(os=>os.filter(x=>x.id!==o.id)); ping("Offer removed");}} className="text-xs font-bold px-1.5 py-1 rounded" style={{color:T.accent,border:`1.5px solid ${T.line}`}}>Delete</button>
                </Card>))}

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
              <Card className="!p-3 flex items-center justify-between">
                <div><div className="font-semibold text-sm">Shop “About” page copy</div>
                  <div className="text-xs" style={{color:T.muted}}>Class + PT explainers clients read in Shop → About</div></div>
                <Btn small kind="ghost" onClick={()=>setAboutEdit({...aboutCopy})}>Edit</Btn>
              </Card>
              <div className="text-xs" style={{color:T.muted}}>Coach write-ups are edited per trainer under People → Edit.</div>
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

        {/* add lead (manual walk-in / IG DM capture) */}
        {addLead && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setAddLead(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add lead</div>
                <button onClick={()=>setAddLead(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Log a walk-in, phone enquiry, or an Instagram DM you want to follow up.</div>
              <div className="space-y-2 mb-3">
                <input value={addLead.name} onChange={e=>setAddLead(a=>({...a,name:e.target.value}))} placeholder="Name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={addLead.phone} onChange={e=>setAddLead(a=>({...a,phone:e.target.value}))} placeholder="Mobile (for WhatsApp / call)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Select value={addLead.source} onChange={v=>setAddLead(a=>({...a,source:v}))}
                  options={[["Walk-in","Walk-in"],["Instagram","Instagram DM"],["Enquiry form","Phone / enquiry"],["Referral","Referral"]]} />
                <input value={addLead.note} onChange={e=>setAddLead(a=>({...a,note:e.target.value}))} placeholder="Note (what they're interested in)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              </div>
              <Btn full disabled={!addLead.name.trim()} onClick={()=>{
                setLeads(ls=>[{id:nid(), name:addLead.name.trim(), phone:addLead.phone.replace(/\D/g,""), source:addLead.source, status:"new", note:addLead.note},...ls]);
                ping(`${addLead.name.trim()} added to leads`); setAddLead(null);}}>Add lead</Btn>
            </div>
          </div>)}

        {/* admin: edit Shop “About” copy */}
        {aboutEdit && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setAboutEdit(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:800,fontSize:20}}>Shop “About” copy</div>
                <button onClick={()=>setAboutEdit(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs font-bold mt-3 mb-1" style={{color:T.muted}}>ABOUT CLASSES</div>
              <textarea value={aboutEdit.classes} onChange={e=>setAboutEdit(a=>({...a,classes:e.target.value}))} rows={4}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <div className="text-xs font-bold mt-3 mb-1" style={{color:T.muted}}>ABOUT PERSONAL TRAINING</div>
              <textarea value={aboutEdit.pt} onChange={e=>setAboutEdit(a=>({...a,pt:e.target.value}))} rows={4}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <div className="mt-3"><Btn full onClick={()=>{setAboutCopy(aboutEdit); setAboutEdit(null); ping("About page updated");}}>Save</Btn></div>
            </div>
          </div>)}

        {/* admin: add an offer */}
        {offerSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setOfferSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:800,fontSize:20}}>New offer</div>
                <button onClick={()=>setOfferSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="space-y-2 my-3">
                <Select value={offerSheet.kind} onChange={v=>setOfferSheet(o=>({...o,kind:v, color:v==="Referral"?"#12B39C":v==="8.8 Flash"?"#FF5A3C":"#1E50A0"}))}
                  options={[["This month","This month"],["8.8 Flash","Flash sale"],["Referral","Referral"],["New client","New client"]]} />
                <input value={offerSheet.title} onChange={e=>setOfferSheet(o=>({...o,title:e.target.value}))} placeholder="Title (e.g. 8.8 Sale)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <textarea value={offerSheet.blurb} onChange={e=>setOfferSheet(o=>({...o,blurb:e.target.value}))} placeholder="Short description" rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                {offerSheet.kind!=="Referral" && <input value={offerSheet.code} onChange={e=>setOfferSheet(o=>({...o,code:e.target.value.toUpperCase()}))} placeholder="Coupon code (must exist in Coupons)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>}
              </div>
              <Btn full disabled={!offerSheet.title.trim()} onClick={()=>{
                setOffers(os=>[...os,{...offerSheet, id:nid(), code:offerSheet.kind==="Referral"?null:offerSheet.code}]);
                ping("Offer published to Shop → Offers"); setOfferSheet(null);}}>Publish offer</Btn>
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
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Move · {moveSheet.label}</div><button onClick={()=>setMoveSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
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
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Running late — {tName(moveDay.trainer)}</div><button onClick={()=>setMoveDay(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
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
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Shift hours — {tName(tid)}</div><button onClick={()=>setShiftEditor(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
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
                <textarea value={addTrainer.bio||""} onChange={e=>setAddTrainer(a=>({...a,bio:e.target.value}))} placeholder="Coach bio / about (shown to clients on Shop → About)" rows={2}
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
                  setTrainers(ts=>ts.map(t=>t.id!==id?t:{...t,name:nm,phone:addTrainer.phone,bio:addTrainer.bio}));
                  setRates(r=>({...r,[id]:rateObj}));
                  ping(`${nm} updated`);
                } else {
                  const id = nm.toLowerCase().replace(/[^a-z]/g,"").slice(0,8)+nid();
                  setTrainers(ts=>[...ts,{id,name:nm,tag:"Coach",phone:addTrainer.phone,bio:addTrainer.bio}]);
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
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Stats · {measForm.who}</div><button onClick={()=>setMeasForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
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

        {/* activity logger — cardio / sports with duration + optional distance */}
        {noteSheet && (() => {
          const act = ACTIVITIES.find(a=>a.name===noteSheet.activity) || ACTIVITIES[0];
          return (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setNoteSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Log activity</div>
                <button onClick={()=>setNoteSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs font-bold mb-1.5 mt-2" style={{color:T.muted}}>ACTIVITY</div>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {ACTIVITIES.map(a=>(
                  <Chip key={a.name} active={noteSheet.activity===a.name} onClick={()=>setNoteSheet(n=>({...n,activity:a.name}))}>{a.name}</Chip>))}
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{color:T.muted}}>Duration (min)</div>
                  <input value={noteSheet.duration} onChange={e=>setNoteSheet(n=>({...n,duration:e.target.value}))} placeholder="e.g. 40" type="number"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                </div>
                {act.dist && (
                  <div className="flex-1">
                    <div className="text-xs mb-1" style={{color:T.muted}}>Distance (km)</div>
                    <input value={noteSheet.distance} onChange={e=>setNoteSheet(n=>({...n,distance:e.target.value}))} placeholder="e.g. 6" type="number"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                  </div>)}
              </div>
              <input value={noteSheet.notes} onChange={e=>setNoteSheet(n=>({...n,notes:e.target.value}))} placeholder="Notes (optional) — how it felt, route, etc."
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <Btn full disabled={!noteSheet.duration} onClick={()=>{
                const parts = [`${noteSheet.duration} min`];
                if (act.dist && noteSheet.distance) parts.push(`${noteSheet.distance} km`);
                if (noteSheet.notes) parts.push(noteSheet.notes);
                const kc = estKcalCardio(+noteSheet.duration, noteSheet.activity, measurements[measurements.length-1].weight);
                setLogs(l=>[{id:nid(), d:"Today", daysAgo:0, title:noteSheet.activity, detail:parts.join(" · "), kind:"cardio", mins:+noteSheet.duration, activity:noteSheet.activity},...l]);
                ping(`${noteSheet.activity} logged — ~${kc} kcal`); setNoteSheet(null);}}>Save activity</Btn>
            </div>
          </div>);})()}

        {/* ACTIVE WORKOUT — full-screen Strong-style logger */}
        {active && (
          <div className="fixed inset-0 z-30 flex flex-col" style={{background:T.paper}}>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between" style={{borderBottom:`1.5px solid ${T.line}`}}>
              <div className="flex-1">
                <input value={active.title} onChange={e=>setActive(a=>({...a,title:e.target.value}))}
                  className="font-bold text-lg outline-none w-full" style={{...disp}}/>
                <div className="text-xs" style={{color:T.muted}}>{active.exercises.length} exercises · tap the ○ to complete a set</div>
              </div>
              <button onClick={()=>setActive(null)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕ Cancel</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {active.exercises.length===0 && <div className="text-center text-sm py-10" style={{color:T.muted}}>No exercises yet — add one below.</div>}
              {active.exercises.map((e,ei)=>{
                const pb = bestWeight(logs,e.ex);
                return (
                <div key={ei}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm" style={{color:T.navy}}>{e.ex} <span className="text-xs font-normal" style={{color:T.muted}}>· {e.muscle}{pb>0?` · PB ${pb}kg`:""}</span></div>
                    <div className="flex gap-2">
                      {exMeta(e.ex).bar && <button onClick={()=>setPlate({target:e.sets[e.sets.length-1]?.w||60, bar:BAR_KG, ex:e.ex})} className="text-xs font-bold" style={{color:T.navy}}>Plates</button>}
                      <button onClick={()=>removeExercise(ei)} className="text-xs font-bold" style={{color:T.accent}}>Remove</button>
                    </div>
                  </div>
                  <div className="flex text-[10px] font-bold mb-1" style={{color:T.muted}}>
                    <span className="w-10">TYPE</span><span className="flex-1 text-center">KG</span><span className="flex-1 text-center">REPS</span><span className="flex-1 text-center">RPE</span><span className="w-8 text-center">✓</span><span className="w-5"/></div>
                  {e.sets.map((s,si)=>(
                    <div key={si} className="flex items-center gap-1 mb-1" style={{opacity:s.done?0.6:1}}>
                      <button onClick={()=>cycleType(ei,si)} className="w-10 text-xs font-bold py-1.5 rounded-lg" style={{color:"#fff",background:SET_TYPES[s.type]?.color||T.ink}}>{SET_TYPES[s.type]?.lbl}</button>
                      <input value={s.w} type="number" onChange={ev=>updSet(ei,si,"w",+ev.target.value||0)} className="flex-1 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <input value={s.reps} type="number" onChange={ev=>updSet(ei,si,"reps",+ev.target.value||0)} className="flex-1 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <input value={s.rpe||""} type="number" placeholder="–" onChange={ev=>updSet(ei,si,"rpe",+ev.target.value||undefined)} className="flex-1 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                      <button onClick={()=>toggleSetDone(ei,si)} className="w-8 h-8 rounded-lg text-sm font-bold" style={{background:s.done?T.moss:"transparent",color:s.done?"#fff":T.muted,border:`1.5px solid ${s.done?T.moss:T.line}`}}>{s.done?"✓":"○"}</button>
                      <button onClick={()=>removeSet(ei,si)} className="w-5 text-xs" style={{color:T.muted}}>✕</button>
                    </div>))}
                  <div className="text-xs mb-1" style={{color:T.muted}}>est 1RM (best set): <b style={{color:T.ink}}>{Math.max(0,...e.sets.filter(isWorking).map(s=>est1RM(s.w,s.reps)))||"–"}kg</b></div>
                  <button onClick={()=>addSet(ei)} className="text-xs font-bold" style={{color:T.navy}}>+ Add set</button>
                </div>);})}
            </div>
            <div className="px-5 py-3 flex gap-2" style={{borderTop:`1.5px solid ${T.line}`}}>
              <Btn full kind="ghost" onClick={()=>setExPicker(true)}>+ Add exercise</Btn>
              <Btn full onClick={finishWorkout}>Finish</Btn>
            </div>
          </div>)}

        {/* exercise picker */}
        {exPicker && (
          <div className="fixed inset-0 z-40 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setExPicker(false)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add exercise</div>
                <button onClick={()=>setExPicker(false)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <input value={exSearch} onChange={e=>setExSearch(e.target.value)} placeholder="Search exercises…"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              {Object.entries(exLib).map(([muscle,names])=>{
                const filtered = names.filter(n=>n.toLowerCase().includes(exSearch.toLowerCase()));
                if (filtered.length===0) return null;
                return (
                <div key={muscle} className="mb-2">
                  <div className="text-xs font-bold mb-1" style={{color:T.navy}}>{muscle.toUpperCase()}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {filtered.map(nm=><Chip key={nm} active={false} onClick={()=>addExerciseToActive(nm)}>{nm}</Chip>)}
                  </div>
                </div>);})}
              <Btn full kind="ghost" onClick={()=>setCustomEx({name:exSearch, muscle:"Legs"})}>+ Create custom exercise</Btn>
            </div>
          </div>)}

        {/* custom exercise form */}
        {customEx && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setCustomEx(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>New exercise</div><button onClick={()=>setCustomEx(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
              <div className="space-y-2 my-3">
                <input value={customEx.name} onChange={e=>setCustomEx(c=>({...c,name:e.target.value}))} placeholder="Exercise name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Select value={customEx.muscle} onChange={v=>setCustomEx(c=>({...c,muscle:v}))} options={Object.keys(exLib).map(m=>[m,m])} />
              </div>
              <Btn full disabled={!customEx.name.trim()} onClick={addCustomExercise}>Add to library</Btn>
            </div>
          </div>)}

        {/* rest timer */}
        {rest && <RestTimer rest={rest} onDone={()=>setRest(null)} onChange={(sec)=>setRest(r=>({...r,sec}))} />}

        {/* plate calculator */}
        {plate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setPlate(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Plate calculator</div>
                <button onClick={()=>setPlate(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="flex items-center gap-2 my-3">
                <span className="text-sm">Target</span>
                <input value={plate.target} type="number" onChange={e=>setPlate(p=>({...p,target:+e.target.value||0}))} className="w-20 px-2 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
                <span className="text-sm">kg · bar {plate.bar}kg</span>
              </div>
              {(() => {
                let perSide = (plate.target - plate.bar)/2; const out=[];
                if (perSide < 0) return <div className="text-sm" style={{color:T.accent}}>Target is below the bar weight.</div>;
                PLATES.forEach(p=>{ while(perSide >= p - 1e-9){ out.push(p); perSide = Math.round((perSide-p)*100)/100; } });
                return (<>
                  <div className="text-xs font-bold mb-1" style={{color:T.muted}}>PER SIDE</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {out.length===0 ? <span className="text-sm" style={{color:T.muted}}>Just the bar.</span> :
                      out.map((p,i)=><span key={i} className="px-2.5 py-1.5 rounded-lg text-sm font-bold" style={{background:T.ink,color:"#fff"}}>{p}</span>)}
                  </div>
                  {perSide>0 && <div className="text-xs mt-2" style={{color:T.accent}}>{perSide}kg/side not loadable with available plates.</div>}
                </>);
              })()}
            </div>
          </div>)}

        {/* routine builder / assign */}
        {routineSheet && (
          <RoutineBuilder rs={routineSheet} setRs={setRoutineSheet} exLib={exLib}
            onSave={(r)=>{ setRoutines(rs=>[...rs, {...r, id:nid()}]); setRoutineSheet(null); ping(`Routine "${r.name}" saved`); }} />
        )}

        {/* PR celebration toast */}
        {prToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl text-center" style={{background:T.accent,color:"#fff",boxShadow:"0 8px 24px rgba(232,80,10,.4)"}}>
            <div className="font-bold text-lg" style={{...disp}}>{prToast}</div>
          </div>)}

        {/* trainer intake assessment sheet */}
        {intakeForm && (
          <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setIntakeForm(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>New client intake · {intakeForm.who}</div><button onClick={()=>setIntakeForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
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
/* ---------- Rest timer (auto-countdown, ±15s, skip) ---------- */
function RestTimer({ rest, onDone, onChange }) {
  const [left, setLeft] = useState(rest.sec);
  useEffect(() => { setLeft(rest.sec); }, [rest.sec, rest.ex]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const mmss = `${Math.floor(Math.max(0,left)/60)}:${String(Math.max(0,left)%60).padStart(2,"0")}`;
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-4 pb-4">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{background:T.ink,color:T.paper,boxShadow:"0 6px 20px rgba(0,0,0,.3)"}}>
        <div className="text-xs" style={{color:"#B9B5A9"}}>Rest · {rest.ex}</div>
        <div style={{...disp,fontWeight:700,fontSize:24,color:left<=0?"#8FD9B6":T.paper}}>{left<=0?"Done!":mmss}</div>
        <div className="flex-1"/>
        <button onClick={()=>onChange(Math.max(0,left-15))} className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:"1.5px solid #3A362B"}}>−15s</button>
        <button onClick={()=>onChange(left+15)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{border:"1.5px solid #3A362B"}}>+15s</button>
        <button onClick={onDone} className="text-xs font-bold px-2 py-1 rounded-lg" style={{background:T.accent}}>Skip</button>
      </div>
    </div>
  );
}

/* ---------- Routine builder ---------- */
function RoutineBuilder({ rs, setRs, exLib, onSave }) {
  const [pick, setPick] = useState(false);
  const allEx = Object.entries(exLib).flatMap(([m,arr])=>arr.map(n=>[n,m]));
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setRs(null)}>
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div style={{...disp,fontWeight:700,fontSize:22}}>New routine</div>
          <button onClick={()=>setRs(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
        </div>
        <input value={rs.name} onChange={e=>setRs(r=>({...r,name:e.target.value}))} placeholder="Routine name (e.g. Leg Day)"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none my-3" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
        <div className="space-y-2 mb-3">
          {rs.items.map((it,i)=>(
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm font-semibold">{it.ex}</span>
              <input value={it.sets} type="number" onChange={e=>setRs(r=>({...r,items:r.items.map((x,j)=>j!==i?x:{...x,sets:+e.target.value||1})}))} className="w-12 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
              <span className="text-xs" style={{color:T.muted}}>×</span>
              <input value={it.reps} type="number" onChange={e=>setRs(r=>({...r,items:r.items.map((x,j)=>j!==i?x:{...x,reps:+e.target.value||1})}))} className="w-12 px-1 py-1.5 rounded-lg text-sm text-center outline-none" style={{border:`1.5px solid ${T.line}`}}/>
              <button onClick={()=>setRs(r=>({...r,items:r.items.filter((_,j)=>j!==i)}))} className="text-xs" style={{color:T.accent}}>✕</button>
            </div>))}
        </div>
        {pick ? (
          <div className="mb-3 max-h-40 overflow-y-auto">
            {allEx.map(([n,m])=>(
              <button key={n} onClick={()=>{ setRs(r=>({...r,items:[...r.items,{ex:n,muscle:m,sets:3,reps:8}]})); setPick(false); }}
                className="block w-full text-left text-sm py-1.5 px-2 rounded-lg" style={{color:T.ink}}>{n} <span className="text-xs" style={{color:T.muted}}>· {m}</span></button>))}
          </div>
        ) : <Btn full kind="ghost" onClick={()=>setPick(true)}>+ Add exercise</Btn>}
        <div className="mt-3"><Btn full disabled={!rs.name.trim()||rs.items.length===0} onClick={()=>onSave(rs)}>Save routine</Btn></div>
      </div>
    </div>
  );
}

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
        <div className="flex items-center justify-between"><div style={{...disp,fontWeight:700,fontSize:22}}>Time off · {tName(trainer)}</div><button onClick={onCancel} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button></div>
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
