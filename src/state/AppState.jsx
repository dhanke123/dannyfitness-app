/* Every piece of demo state lives here. In the dev phase this provider is where
   Supabase queries and realtime subscriptions replace the useState calls — the screens
   consuming useApp() should not need to change. */
import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { COUPONS, CT, PT_PRICE, TRAINERS, isHead, mkSet, seedAbout, seedCamps, seedClassTemplates, seedLeads, seedLedger, seedLocations, seedOffers, seedProducts, seedPtBookings, seedRoutines, seedSessions, seedShifts, seedTimeOff, seedTravel, seedWorkoutSessions } from "../data/seed.js";
import { DAYS, TODAY, dateFor, fmtFull } from "../lib/dates.js";
import { EXLIB, best1RM, bestWeight, est1RM, estKcal, exMeta, isWorking, muscleOf } from "../lib/metrics.js";
import { ptRangesFor, ptSlotsFor, sessTrainers, workWindow } from "../lib/scheduling.js";
import { nid } from "../lib/util.js";
import { Card } from "../ui/kit.jsx";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
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
  const [audit, setAudit] = useState([]); // admin override / book-on-behalf trail (never cleared in real build)
  const logAudit = (what)=> setAudit(a=>[{id:nid(), what, when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}, ...a]);
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
    { from:"coach", text:"Hi Sam — ExerciseOnly here. Ask us anything about bookings, credits or schedules and we'll sort it out with your coach." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [addTrainer, setAddTrainer] = useState(null); // Add/Edit Trainer form (has .editId when editing)
  const [shiftEditor, setShiftEditor] = useState(null); // {trainer}
  const [referralReward, setReferralReward] = useState(1); // earned class credits, claimable into the class pool
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [moveDay, setMoveDay] = useState(null); // running-late cascade sheet {trainer}
  const [doneSheet, setDoneSheet] = useState(null); // complete-session sheet {session/pt}
  const [schedView, setSchedView] = useState("cal"); // schedule tab: 'cal' google-grid | 'week' list | 'coach'
  const [calDay, setCalDay] = useState(TODAY);       // selected weekday in the calendar grid
  const [calSpan, setCalSpan] = useState("day");     // calendar grid span: 'day' | 'week'
  const [calTrainer, setCalTrainer] = useState("all"); // admin calendar filter: 'all' | trainerId
  const [bookFor, setBookFor] = useState(null);      // book sheet {trainer,day,time,weekOff,self,who,nonClient}
  const [receiptSheet, setReceiptSheet] = useState(null); // reliable receipt-upload flow {step,file,amt,note,pct}
  const [walkSheet, setWalkSheet] = useState(null);  // class walk-in (attendance only, no payment) {sid,name}
  const [addLead, setAddLead] = useState(null);     // manual lead capture (walk-in / IG DM)
  const [incidentals, setIncidentals] = useState([  // trainer-logged extras awaiting Danny's approval
    { id:nid(), trainer:"wei", label:"Parking at Costa Del Sol", amt:8, note:"Sat NS class", status:"pending" },
  ]);

  const [seg, setSeg] = useState("classes");
  const [day, setDay] = useState(TODAY);
  const [bookWeek, setBookWeek] = useState(0);   // client: which week is being browsed/booked (0 = this week)
  const [calWeek, setCalWeek] = useState(0);     // trainer/admin google-calendar grid: week offset
  const [bookDates, setBookDates] = useState({}); // {bookingKey: "Mon 28 Jul"} — human date per booking (demo)
  const [bookWeeks, setBookWeeks] = useState({}); // {sessionId: weekOffset} — which week a class booking sits in
  // client "Booked" tab: list vs calendar, and the calendar's own week/day/span state
  const [myView, setMyView] = useState("list");   // list | cal
  const [mySpan, setMySpan] = useState("week");   // day | week
  const [myWeek, setMyWeek] = useState(0);
  const [myCalDay, setMyCalDay] = useState(TODAY);
  const [clientMove, setClientMove] = useState(null); // client-side PT reschedule sheet
  // policy: cancellation / change window in hours — admin setting (not hard-coded in copy)
  const [cancelHrs] = useState(24);
  const [loc, setLoc] = useState("all");
  const [ptLoc, setPtLoc] = useState(seedLocations[0].id); // PT needs a real place (coach is available anywhere); supports "other"
  const [otherPlace, setOtherPlace] = useState("");
  const [ptTrainers, setPtTrainers] = useState(["danny","dylan","marcus","wei"]);
  const [sheet, setSheet] = useState(null);
  const [payMode, setPayMode] = useState("credit");
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState(null);
  const [coupons, setCoupons] = useState(COUPONS); // admin-editable coupon table (seed = COUPONS)
  const [couponForm, setCouponForm] = useState(null); // add-coupon sheet {code,mode,val,label}
  const [rosterOpen, setRosterOpen] = useState(null);
  const [adminSec, setAdminSec] = useState("dash");
  const [permOpen, setPermOpen] = useState(null);
  const [measForm, setMeasForm] = useState(null);
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
    setTimeOffSheet(null); setMoveSheet(null); setClientMove(null); setMoveDay(null); setShiftEditor(null); setAddTrainer(null);
    setMeasForm(null); setIntakeForm(null); setCampBuilder(null); setTemplateBuilder(null);
    setDoneSheet(null); setNoteSheet(null); setAddLead(null); setReceiptSheet(null); setWalkSheet(null); setBookFor(null);
    setAboutEdit(null); setBioEdit(null); setOfferSheet(null); setCouponForm(null);
    // log sub-overlays close first; the active workout itself is closed last
    if (exPicker||customEx||plate||routineSheet||rest) { setExPicker(false); setCustomEx(null); setPlate(null); setRoutineSheet(null); setRest(null); }
    else setActive(null); };
  const anyOverlay = !!(sheet||shopSheet||campSheet||chatOpen||timeOffSheet||moveSheet||clientMove||moveDay||shiftEditor||addTrainer||measForm||intakeForm||campBuilder||templateBuilder||doneSheet||noteSheet||addLead||receiptSheet||walkSheet||bookFor||couponForm||aboutEdit||bioEdit||offerSheet||active||exPicker||customEx||plate||routineSheet||rest);
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

  const ACCOUNTS = {
    client: {role:"client",  id:"sam",   name:"Sam Lee"},
    dylan:  {role:"trainer", id:"dylan", name:"Dylan"},
    danny:  {role:"trainer", id:"danny", name:"Danny"},
    admin:  {role:"admin",   id:"admin", name:"Admin"}, // pure admin — not a trainer
  };
  const login = (acct) => {
    const u = ACCOUNTS[acct] || ACCOUNTS.client;
    setUser(u);
    setTab(u.role==="client"?"home":"today");
    setCoupon(""); setCouponMsg(null);
  };

  // pure price after coupon — safe to call during render (no state writes)
  const couponValue = (base) => {
    const c = coupons[coupon.toUpperCase()];
    if (!c) return base;
    return c.pct ? base*(1-c.pct/100) : Math.max(0, base-c.flat);
  };
  // event-handler version: applies + shows a message
  const applyCoupon = (base) => {
    const c = coupons[coupon.toUpperCase()];
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
      if (s.date) setBookDates(bd=>({...bd, [s.id]:s.date}));
      setBookWeeks(bw=>({...bw, [s.id]:bookWeek}));
      ping(payMode==="pass"?`Booked ${s.date||""} — covered by your ${classPass?.label}`:payMode==="credit"?`Booked ${s.date||""} — ${credits.classes-1} class credits left`:`Paid & booked${s.date?" for "+s.date:""}. WhatsApp confirmation sent.`);
    } else if (s.kind==="pt") {
      const locLabel = s.loc==="other" ? (otherPlace||"Other spot") : null;
      const pool = ptPool(s.trainer);
      if (payMode==="credit") setCredits(c=>({...c, [pool]:c[pool]-1}));
      else setLedger(l=>[{id:nid(), who:"Sam Lee", what:`PT · ${tName(s.trainer)}${isHead(s.trainer)?" (Head Coach)":""}`, amt:PT_PRICE[s.trainer], method:payMode==="paynow"?"PayNow":"Card", status:"paid", d:"Today"},...l]);
      const bk = {id:nid(), day:s.day, time:s.time, trainer:s.trainer, loc:s.loc, otherLabel:locLabel, mode:payMode, pool, date:s.date, weekOff:bookWeek};
      setMyPT(p=>[...p, bk]);
      if (s.loc!=="other") setPtBookings(pb=>[...pb, {id:bk.id, trainer:s.trainer, day:s.day, time:s.time, loc:s.loc, who:"Sam Lee", date:s.date, weekOff:bookWeek}]);
      else setSuggestedLocs(sl=> sl.includes(locLabel) ? sl : [...sl, locLabel]);
      ping(payMode==="credit"?`PT booked — ${credits[pool]-1} ${isHead(s.trainer)?"head-coach":"coach"} PT credits left`:"Paid & booked. See you there!");
    }
    setSheet(null); setCoupon(""); setCouponMsg(null); setOtherPlace("");
  };
  const cancelClass = (sid) => { setMyClassBookings(b=>b.filter(x=>x!==sid)); setCredits(c=>({...c, classes:c.classes+1})); ping("Cancelled — credit returned"); };
  // hours between now and a (weekOffset, weekday, "HH:MM") booking — drives the change/cancel window
  const hoursUntil = (weekOff, d, time) => {
    const dt = dateFor(weekOff??0, d); const [h,m] = String(time||"00:00").split(":").map(Number);
    dt.setHours(h||0, m||0, 0, 0);
    return (dt.getTime() - Date.now()) / 3600000;
  };
  // client-side PT reschedule — only inside the policy window and onto a slot the coach actually has free
  const commitClientMove = () => {
    const mv = clientMove; if (!mv) return;
    const nw = mv.newWeek ?? mv.weekOff ?? 0, nd = mv.newDay ?? mv.day, nt = mv.newTime || mv.time;
    const nDate = fmtFull(dateFor(nw, nd));
    setMyPT(p=>p.map(b=>b.id!==mv.id ? b : {...b, day:nd, time:nt, weekOff:nw, date:nDate}));
    setPtBookings(pb=>pb.map(b=>b.id!==mv.id ? b : {...b, day:nd, time:nt, weekOff:nw, date:nDate}));
    setClientMove(null);
    ping(`Moved to ${nDate} · ${nt} — Coach ${tName(mv.trainer)} notified`);
  };
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

  const isClient = user?.role==="client";
  const isAdmin  = user?.role==="admin";
  const navItems = isClient
    ? [["home","Home"],["book","Book"],["log","Log"],["shop","Shop"],["account","Account"]]
    : isAdmin
    ? [["today","Today"],["schedule","Schedule"],["clients","Clients"],["camps","Camps"],["manage","Manage"]]
    : [["today","Today"],["schedule","Schedule"],["clients","Clients"],["me","Me"]];

  const store = { ACCOUNTS, aboutCopy, aboutEdit, active, addCustomExercise, addExerciseToActive, addLead, addLocation, addSet, addTimeOff, addTrainer, adminSec, anyOverlay, applyCoupon, audit, backRef, bioEdit, bookDates, bookFor, bookWeek, bookWeeks, booked, calDay, calSpan, calTrainer, calWeek, campBuilder, campOpenId, campSheet, camps, cancelCamp, cancelClass, cancelHrs, cancelPT, chatInput, chatMsgs, chatOpen, classPass, classTemplates, clientMove, closeOverlays, commitClientMove, confirmBook, confirmCampBuy, confirmShopBuy, coupon, couponForm, couponMsg, couponValue, coupons, credits, customEx, cycleType, day, daySessions, doneSheet, exLib, exPicker, exSearch, finishWorkout, goal, hoursUntil, incidentals, intakeForm, isAdmin, isClient, joinWaitlist, leads, ledger, loc, locName, locations, logAudit, logOpen, logView, login, logs, mark, markAll, marketingOptIn, measForm, measurements, moveDay, moveSheet, myCalDay, myCamps, myClassBookings, myPT, mySpan, myView, myWaitlist, myWeek, navItems, newLocName, noShowQueue, noteSheet, offerSheet, offers, otherPlace, payMode, perm, permOpen, ping, plate, prToast, products, progEx, progMetric, promoteSuggested, ptBookings, ptByTrainer, ptCtx, ptLoc, ptPool, ptTrainers, rates, ratings, receiptSheet, referralCode, referralReward, referralUses, removeExercise, removeSet, removeTimeOff, repeatLog, resolveNoShow, rest, revenue, rosterOpen, routineSheet, routines, schedView, seg, sessions, setAboutCopy, setAboutEdit, setActive, setAddLead, setAddTrainer, setAdminSec, setAudit, setBioEdit, setBookDates, setBookFor, setBookWeek, setBookWeeks, setCalDay, setCalSpan, setCalTrainer, setCalWeek, setCampBuilder, setCampOpenId, setCampSheet, setCamps, setChatInput, setChatMsgs, setChatOpen, setClassPass, setClassTemplates, setClientMove, setCoupon, setCouponForm, setCouponMsg, setCoupons, setCredits, setCustomEx, setDay, setDoneSheet, setExLib, setExPicker, setExSearch, setGoal, setIncidentals, setIntakeForm, setLeads, setLedger, setLoc, setLocations, setLogOpen, setLogView, setLogs, setMarketingOptIn, setMeasForm, setMeasurements, setMoveDay, setMoveSheet, setMyCalDay, setMyCamps, setMyClassBookings, setMyPT, setMySpan, setMyView, setMyWaitlist, setMyWeek, setNewLocName, setNoShowQueue, setNoteSheet, setOfferSheet, setOffers, setOtherPlace, setPayMode, setPerm, setPermOpen, setPlate, setPrToast, setProducts, setProgEx, setProgMetric, setPtBookings, setPtLoc, setPtTrainers, setRates, setRatings, setReceiptSheet, setReferralReward, setReferralUses, setRest, setRosterOpen, setRoutineSheet, setRoutines, setSchedView, setSeg, setSessions, setSheet, setShiftEditor, setShifts, setShopSheet, setShopTab, setSuggestedLocs, setTab, setTemplateBuilder, setTimeOff, setTimeOffSheet, setToast, setTrainers, setTravel, setUser, setWalkSheet, sheet, shiftEditor, shifts, shopSheet, shopTab, staffSessions, staffTimeOff, startBlank, startCamp, startFromRoutine, suggestedLocs, tName, tab, templateBuilder, timeOff, timeOffSheet, toast, toggleSetDone, trainers, travel, updSet, user, walkSheet };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

