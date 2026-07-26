/* Every piece of demo state lives here. In the dev phase this provider is where
   Supabase queries and realtime subscriptions replace the useState calls — the screens
   consuming useApp() should not need to change. */
import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { COUPONS, CT, PT_PRICE, TRAINERS, isHead, mkSet, seedAbout, seedCamps, seedClassTemplates, seedLeads, seedLedger, seedLocations, seedOffers, seedProducts, seedPtBookings, seedRoutines, seedSessions, seedShifts, seedTimeOff, seedTravel, seedWorkoutSessions } from "../data/seed.js";
import { DAYS, TODAY, dateFor, fmtFull, toMin } from "../lib/dates.js";
import { EXLIB, best1RM, bestWeight, est1RM, estKcal, exMeta, isWorking, muscleOf } from "../lib/metrics.js";
import { PT_DUR, ptRangesFor, ptSlotsFor, sessTrainers, workWindow } from "../lib/scheduling.js";
import { nid } from "../lib/util.js";
import { fetchProfile, isConfigured, looksLikeSgMobile, supabase, toAppUser, toE164 } from "../lib/supabase.js";
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
  /* ---- approval queues (Decisions 1a, 2, 5, 6, 7) ----
     Four separate queues, each with Approve AND Deny plus a reason note. Nothing
     auto-resolves — items sit pending until a human actions them, which is why the
     pending counts are badged on the admin nav. No-shows and receipts/incidentals
     already existed; exceptions and refunds are new. */
  const [exceptionQueue, setExceptionQueue] = useState([]); // inside-window cancel/change requests
  const [refundQueue, setRefundQueue] = useState([]);       // bank-refund requests on paid bookings
  // paid (non-credit) cancellations that were auto-credited and could still be refunded to bank
  const [refundables, setRefundables] = useState([]);
  const [referralCode] = useState("SAM-LEE-24");
  const [referralUses, setReferralUses] = useState(1);
  const [ptBookings, setPtBookings] = useState(seedPtBookings); // all confirmed PT bookings (other clients + demo user)
  const [timeOff, setTimeOff] = useState(seedTimeOff);
  const [shifts, setShifts] = useState(seedShifts);   // per-trainer per-weekday on-shift hours
  const [trainers, setTrainers] = useState(TRAINERS); // roster (Add Trainer appends here)
  /* Pay config per trainer. `per_head` was in the payout sample (Wei) but the model
     only had per_class and salary, so a per-head coach couldn't be represented at all.
     Rates are still demo figures — the real ones are an open question for Danny. */
  const [rates, setRates] = useState({
    danny:{type:"salary",    perClass:0,  perHead:0,  perPt:0,  monthly:6000},
    dylan:{type:"per_class", perClass:40, perHead:0,  perPt:45, monthly:0},
    marcus:{type:"per_class", perClass:35, perHead:0, perPt:40, monthly:0},
    wei:{type:"per_head",    perClass:0,  perHead:12, perPt:40, monthly:0},
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
  const [optInAt, setOptInAt] = useState(null); // PDPA: consent timestamp (server-stamped in the real build)
  /* Decision 13/19 — members choose where reminders land. Email is the fallback, not SMS:
     cheaper than SMS and avoids standing up a second Twilio product. New members default
     to WhatsApp because they give a phone at OTP signup and may not have an email yet. */
  const [reminderChannel, setReminderChannel] = useState("whatsapp"); // 'whatsapp' | 'email'
  const [exceptionSheet, setExceptionSheet] = useState(null); // client: request an exception {booking, kind, reason}
  // Decision 14 — the confirmation step offers "Add to calendar" (.ics or Google). No OAuth, no sync.
  const [justBooked, setJustBooked] = useState(null); // {title, weekOff, day, time, minutes, location, details, uid}
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
  const [bookPay, setBookPay] = useState({});     // {sessionId: {mode, amt}} — how a class booking was paid, so cancel can credit vs refund
  const [bookWeeks, setBookWeeks] = useState({}); // {sessionId: weekOffset} — which week a class booking sits in
  // client "Booked" tab: list vs calendar, and the calendar's own week/day/span state
  const [myView, setMyView] = useState("list");   // list | cal
  const [mySpan, setMySpan] = useState("week");   // day | week
  const [myWeek, setMyWeek] = useState(0);
  const [myCalDay, setMyCalDay] = useState(TODAY);
  const [clientMove, setClientMove] = useState(null); // client-side PT reschedule sheet
  /* ---- policy (Decisions 1 & 16) ----
     Split per booking type, admin-editable, all starting at 24h. Classes and PT use
     HOURS; camps use DAYS only (the 24h camp setting was dropped in round 2). These are
     the demo stand-in for the `settings` rows — never hard-code a window in copy or in
     a gate; read it from here so Manage → Settings stays the single source of truth. */
  const [policy, setPolicy] = useState({ classHrs:24, ptHrs:24, campDays:2 });
  const cancelHrs = policy.ptHrs; // back-compat alias for the PT window
  // hours of notice a booking still has, given its type
  const windowFor = (kind) => kind==="class" ? policy.classHrs : policy.ptHrs;
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
    setAboutEdit(null); setBioEdit(null); setOfferSheet(null); setCouponForm(null); setExceptionSheet(null); setJustBooked(null);
    // log sub-overlays close first; the active workout itself is closed last
    if (exPicker||customEx||plate||routineSheet||rest) { setExPicker(false); setCustomEx(null); setPlate(null); setRoutineSheet(null); setRest(null); }
    else setActive(null); };
  const anyOverlay = !!(sheet||shopSheet||campSheet||chatOpen||timeOffSheet||moveSheet||clientMove||moveDay||shiftEditor||addTrainer||measForm||intakeForm||campBuilder||templateBuilder||doneSheet||noteSheet||addLead||receiptSheet||walkSheet||bookFor||couponForm||aboutEdit||bioEdit||offerSheet||exceptionSheet||justBooked||active||exPicker||customEx||plate||routineSheet||rest);
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
  const landingTab = (role) => role==="client" ? "home" : "today";
  const login = (acct) => {
    const u = ACCOUNTS[acct] || ACCOUNTS.client;
    setUser(u);
    setTab(landingTab(u.role));
    setCoupon(""); setCouponMsg(null);
  };

  /* ---------------- auth: phone OTP ----------------
     Supabase Auth → Phone, SMS via Twilio. WhatsApp OTP replaces SMS later once
     Meta approves the template; only the channel changes, not this code.

     The role NEVER comes from the client. The signup trigger creates every profile
     as `client`, staff are promoted by hand, and `adoptSession` reads the role back
     from the database — so a member signing up can't land on the trainer nav even
     if they tamper with local storage. */
  const adoptSession = async (session) => {
    if (!session?.user) { setUser(null); return; }
    try {
      const profile = await fetchProfile(session.user.id);
      const u = toAppUser(profile);
      if (!u) { setUser(null); return; }
      setUser(u);
      setTab(landingTab(u.role));
    } catch (e) {
      // A signed-in user with no readable profile is a broken state — don't guess a
      // role, sign them out and say so.
      console.error("[auth] profile load failed", e);
      await supabase?.auth.signOut();
      setUser(null);
      ping("We couldn't load your profile. Please sign in again or contact ExerciseOnly.");
    }
  };

  // restore an existing session on launch, then follow auth changes
  useEffect(() => {
    if (!isConfigured || !supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) adoptSession(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT") { setUser(null); setTab("home"); return; }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") adoptSession(session);
    });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendOtp = async (raw) => {
    if (!supabase) return { ok:false, error:"Sign-in isn't configured on this build." };
    // cheap local check first — a malformed number is a wasted paid SMS
    if (!looksLikeSgMobile(raw)) return { ok:false, error:"That doesn't look like a Singapore mobile number (8 digits, starting 8 or 9)." };
    const phone = toE164(raw);
    const { error } = await supabase.auth.signInWithOtp({ phone, options:{ channel:"sms" } });
    if (error) {
      const m = error.message || "";
      if (/rate|too many|limit/i.test(m)) return { ok:false, error:"Too many attempts. Wait a minute before trying again." };
      return { ok:false, error:`Couldn't send the code: ${m}` };
    }
    return { ok:true };
  };

  const verifyOtp = async (raw, token) => {
    if (!supabase) return { ok:false, error:"Sign-in isn't configured on this build." };
    const phone = toE164(raw);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type:"sms" });
    if (error) {
      const m = error.message || "";
      if (/expired/i.test(m)) return { ok:false, error:"That code has expired. Tap resend for a new one." };
      if (/invalid|token/i.test(m)) return { ok:false, error:"That code isn't right. Check the SMS and try again." };
      return { ok:false, error:`Couldn't sign you in: ${m}` };
    }
    await adoptSession(data.session);
    return { ok:true };
  };

  const logout = async () => {
    if (supabase) { try { await supabase.auth.signOut(); } catch { /* fall through — clear locally regardless */ } }
    setUser(null); setTab("home");
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
    /* Filtering the slot list is presentation; this is the actual gate. The sheet
       can be opened, left sitting while another booking is made in a different
       tab, and then confirmed against stale data. */
    const dur = s.kind === "class" ? CT[s.type].dur : PT_DUR;
    const clash = memberClash(bookWeek, s.day, s.time, dur);
    if (clash) {
      ping(`You're already booked for ${clash.label} at that time — cancel that first.`);
      return;
    }
    if (s.kind==="class") {
      if (payMode==="pass") { /* covered by active class pass — no deduction, no charge */ }
      else if (payMode==="credit") setCredits(c=>({...c, classes:c.classes-1}));
      else { const price=applyCoupon(CT[s.type].price);
        setLedger(l=>[{id:nid(), who:"Sam Lee", what:`Drop-in · ${CT[s.type].name}${coupon?` (${coupon.toUpperCase()})`:""}`, amt:Math.round(price), method:payMode==="paynow"?"PayNow":"Card", status:"paid", d:"Today"},...l]); }
      setMyClassBookings(b=>[...b, s.id]);
      if (s.date) setBookDates(bd=>({...bd, [s.id]:s.date}));
      setBookWeeks(bw=>({...bw, [s.id]:bookWeek}));
      setBookPay(bp=>({...bp, [s.id]:{mode:payMode, amt: payMode==="paynow"||payMode==="card" ? Math.round(couponValue(CT[s.type].price)) : 0}}));
      ping(payMode==="pass"?`Booked ${s.date||""} — covered by your ${classPass?.label}`:payMode==="credit"?`Booked ${s.date||""} — ${credits.classes-1} class credits left`:`Paid & booked${s.date?" for "+s.date:""}. Confirmation sent by ${reminderChannel==="email"?"email":"WhatsApp"}.`);
      setJustBooked({ title:`${CT[s.type].name} · ExerciseOnly`, weekOff:bookWeek, day:s.day, time:s.time,
        minutes:CT[s.type].dur, location:locName(s.loc), uid:`class-${s.id}-w${bookWeek}`,
        details:`Coach ${tName(s.trainer)}`, dateLabel:s.date });
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
      setJustBooked({ title:`PT with ${tName(s.trainer)} · ExerciseOnly`, weekOff:bookWeek, day:s.day, time:s.time,
        minutes:45, location:locLabel || locName(s.loc), uid:`pt-${bk.id}`,
        details:`Personal training with Coach ${tName(s.trainer)}`, dateLabel:s.date });
    }
    setSheet(null); setCoupon(""); setCouponMsg(null); setOtherPlace("");
  };
  /* Decision 2 — credit back by DEFAULT on every cancellation. A bank refund is not
     automatic: it is an explicit request that lands in the admin Refunds queue, and the
     admin triggers the HitPay refund by hand. So the cancel path always makes the member
     whole immediately, and `refundables` records the ones that could still go to bank. */
  const addRefundable = (what, amt, method, pool="classes") => {
    if (!amt || amt<=0) return;
    setRefundables(r=>[{id:nid(), what, amt, method, pool, when:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'})}, ...r]);
  };
  const cancelClass = (sid) => {
    const s = sessions.find(x=>x.id===sid);
    const pay = bookPay[sid] || {mode:"credit", amt:0};
    setMyClassBookings(b=>b.filter(x=>x!==sid));
    if (pay.mode==="pass") { ping("Cancelled — your pass covers it, nothing deducted"); }
    else if (pay.mode==="credit") { setCredits(c=>({...c, classes:c.classes+1})); ping("Cancelled — credit returned"); }
    else {
      setCredits(c=>({...c, classes:c.classes+1}));
      addRefundable(`${CT[s?.type]?.name || "Class"} · ${bookDates[sid] || ""}`.trim(), pay.amt, pay.mode==="card"?"Card":"PayNow");
      ping(`Cancelled — $${pay.amt} credited back as 1 class credit. Want the money instead? Request a bank refund in Booked.`);
    }
    setBookPay(bp=>{ const n={...bp}; delete n[sid]; return n; });
  };
  /* Decision 1a — inside the window is NOT a hard refusal any more. The member states a
     reason, it lands in the admin Exceptions queue, and a human decides. */
  const requestException = (payload) => {
    setExceptionQueue(q=>[...q, {id:nid(), who:"Sam Lee", ...payload,
      when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}]);
    setExceptionSheet(null);
    ping("Exception requested — ExerciseOnly will review and reply. Nothing has changed on your booking yet.");
  };
  const resolveException = (id, approved, reason) => {
    const it = exceptionQueue.find(x=>x.id===id);
    setExceptionQueue(q=>q.filter(x=>x.id!==id));
    logAudit(`Exception ${approved?"approved":"denied"} · ${it?.who} · ${it?.what}${reason?` · "${reason}"`:""}`);
    ping(approved ? "Exception approved — member notified, booking released" : "Exception denied — member notified with your reason");
  };
  const requestRefund = (item, reason) => {
    setRefundables(r=>r.filter(x=>x.id!==item.id));
    setRefundQueue(q=>[...q, {...item, reason, who:"Sam Lee",
      when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}]);
    ping("Refund requested — ExerciseOnly will review. Your credit stays on the account until it's approved.");
  };
  const resolveRefund = (id, approved, reason) => {
    const it = refundQueue.find(x=>x.id===id);
    setRefundQueue(q=>q.filter(x=>x.id!==id));
    if (approved && it) {
      // approving swaps the auto-credit back out for real money — never both
      // pool === null means it was held as plain account credit (camps) — nothing to deduct
      if (it.pool) setCredits(c=>({...c, [it.pool]:Math.max(0, (c[it.pool]||0)-1)}));
      setLedger(l=>[{id:nid(), who:it.who, what:`Refund · ${it.what}`, amt:-it.amt, method:it.method, status:"refunded", d:"Today"}, ...l]);
    }
    logAudit(`Refund ${approved?"approved":"denied"} · ${it?.who} · $${it?.amt} · ${it?.what}${reason?` · "${reason}"`:""}`);
    ping(approved ? `Refund approved — trigger the $${it?.amt} refund in HitPay, credit removed` : "Refund denied — the credit stays on their account");
  };
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
    // rescheduling must not land on top of the member's own other commitments —
    // and must ignore the booking being moved, or it always clashes with itself
    const clash = memberBusy(nw, nd)
      .filter(b => !(b.label === `PT with ${tName(mv.trainer)}` && toMin(mv.time) === b.start && nw === (mv.weekOff ?? 0) && nd === mv.day))
      .find(b => toMin(nt) < b.end && toMin(nt) + PT_DUR > b.start);
    if (clash) { ping(`That clashes with ${clash.label} — pick another time.`); return; }
    const nDate = fmtFull(dateFor(nw, nd));
    setMyPT(p=>p.map(b=>b.id!==mv.id ? b : {...b, day:nd, time:nt, weekOff:nw, date:nDate}));
    setPtBookings(pb=>pb.map(b=>b.id!==mv.id ? b : {...b, day:nd, time:nt, weekOff:nw, date:nDate}));
    setClientMove(null);
    ping(`Moved to ${nDate} · ${nt} — Coach ${tName(mv.trainer)} notified`);
  };
  const cancelPT = (id) => {
    const b = myPT.find(x=>x.id===id);
    const pool = b.pool || "ptCoach";
    setMyPT(p=>p.filter(x=>x.id!==id));
    setPtBookings(pb=>pb.filter(x=>x.id!==id));
    // credit back either way (Decision 2) — a paid session also becomes refundable-to-bank on request
    setCredits(c=>({...c, [pool]:c[pool]+1}));
    if (b.mode!=="credit") addRefundable(`PT · ${tName(b.trainer)} · ${b.date||DAYS[b.day]}`, PT_PRICE[b.trainer], b.mode==="card"?"Card":"PayNow", pool);
    ping("PT session cancelled — " + (b.mode==="credit" ? "credit returned" : `$${PT_PRICE[b.trainer]} credited back as a PT credit (request a bank refund in Booked if you'd rather have the money)`) + ". The freed slot is available again immediately.");
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
    // calendar invite covers day 1 only; the rest of the itinerary lives in the app
    const abs = TODAY + (c.startInDays ?? 0), first = c.days?.[0]?.sessions?.[0];
    setJustBooked({ title:`${c.name} · day 1`, weekOff:Math.floor(abs/7), day:((abs%7)+7)%7,
      time:first?.start || "09:00", minutes:Math.round((first?.hours || 2)*60), location:locName(c.loc),
      uid:`camp-${c.id}`, details:`${c.dates} — full itinerary in the ExerciseOnly app`, dateLabel:c.dates });
    setCampSheet(null); setCoupon(""); setCouponMsg(null);
  };
  const cancelCamp = (campId) => {
    const c = camps.find(x=>x.id===campId);
    setMyCamps(m=>m.filter(x=>x!==campId));
    setCamps(cs=>cs.map(x=>x.id!==campId?x:{...x,spots:x.spots+1}));
    // camps are a one-off payment with no credit pool, so the value is held as account
    // credit and can be converted to a bank refund on request (Decision 2)
    addRefundable(`${c.name} · camp`, c.price, "PayNow", null);
    ping(`${c.name} cancelled — $${c.price} held as account credit. Request a bank refund in Booked if you'd rather have the money back.`);
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
  /* Decision 5 — a class no-show goes to the same admin queue as PT. Nothing auto-deducts:
     the coach marks absent, the admin decides, and the reason is kept. */
  const resolveNoShow = (id, apply, reason) => {
    const it = noShowQueue.find(x=>x.id===id);
    setNoShowQueue(q=>q.filter(x=>x.id!==id));
    logAudit(`No-show ${apply?"applied":"waived"} · ${it?.who} · ${it?.session}${reason?` · "${reason}"`:""}`);
    ping(apply? "No-show applied — credit forfeited (audited)" : "Waived — no deduction (audited)");
  };
  const resolveIncidental = (id, approved, reason) => {
    const i = incidentals.find(x=>x.id===id);
    setIncidentals(x=>x.map(y=>y.id!==id?y:{...y, status:approved?"approved":"rejected", reason}));
    if (approved && i) setLedger(l=>[{id:nid(), who:tName(i.trainer), what:`Incidental · ${i.label}`, amt:-i.amt, method:"Expense", status:"paid", d:"Today"}, ...l]);
    logAudit(`Receipt ${approved?"approved":"denied"} · ${tName(i?.trainer)} · $${i?.amt} · ${i?.label}${reason?` · "${reason}"`:""}`);
    ping(approved ? "Approved — recorded as an expense for analysis (audited)" : "Receipt denied — the trainer is notified with your reason");
  };
  // pending counts drive the admin nav badges (Decision 6 — queues must not pile up silently)
  const pendingCounts = {
    exceptions: exceptionQueue.length,
    refunds: refundQueue.length,
    noshows: noShowQueue.length,
    receipts: incidentals.filter(i=>i.status==="pending").length,
  };
  pendingCounts.schedule = pendingCounts.exceptions;
  pendingCounts.clients  = pendingCounts.noshows;
  pendingCounts.manage   = pendingCounts.refunds + pendingCounts.receipts;
  pendingCounts.total    = pendingCounts.exceptions + pendingCounts.refunds + pendingCounts.noshows + pendingCounts.receipts;

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

  /* ---- the member's OWN commitments ----
     The coach-side rules stop a coach being in two places at once. They say nothing
     about the member. Without this, one person could book two overlapping PT
     sessions with different coaches, or a PT session on top of a class they're
     already in — which is exactly what happened.

     A conflict is an overlap, not an identical start time, and it is scoped to the
     week being browsed. The old check compared `time === time` and ignored
     weekOffset entirely, so it both missed real clashes and hid slots in unrelated
     weeks. */
  const memberBusy = (weekOff, dayIdx) => {
    const out = [];
    myClassBookings.forEach(sid => {
      const s = sessions.find(x => x.id === sid);
      if (!s || (bookWeeks[sid] ?? 0) !== weekOff || s.day !== dayIdx) return;
      out.push({ start: toMin(s.time), end: toMin(s.time) + CT[s.type].dur, label: CT[s.type].name });
    });
    myPT.forEach(b => {
      if ((b.weekOff ?? 0) !== weekOff || b.day !== dayIdx) return;
      out.push({ start: toMin(b.time), end: toMin(b.time) + PT_DUR, label: `PT with ${tName(b.trainer)}` });
    });
    myCamps.forEach(cid => {
      const c = camps.find(x => x.id === cid); if (!c) return;
      const absStart = TODAY + (c.startInDays ?? 0);
      (c.days || []).forEach((cd, i) => {
        const abs = absStart + i;
        if (Math.floor(abs / 7) !== weekOff || ((abs % 7) + 7) % 7 !== dayIdx) return;
        (cd.sessions || []).forEach(s => out.push({
          start: toMin(s.start), end: toMin(s.start) + Math.round((s.hours || 1) * 60), label: c.name,
        }));
      });
    });
    return out;
  };
  // returns the clashing commitment, or null
  const memberClash = (weekOff, dayIdx, time, dur, ignoreId) => {
    const st = toMin(time), en = st + dur;
    return memberBusy(weekOff, dayIdx)
      .filter(b => b.id !== ignoreId)
      .find(b => st < b.end && en > b.start) || null;
  };

  const ptCtx = { sessions, ptBookings, timeOff, shifts };
  // Per-trainer availability at the chosen location: free ranges (summary) + bookable slots.
  const ptByTrainer = useMemo(()=>{
    if (ptLoc==="all" || ptLoc==="other") return [];
    return ptTrainers.map(tid=>{
      // hide any slot that clashes with something the member has already booked —
      // whatever the type, and whichever coach it's with
      const slots = ptSlotsFor(tid, day, ptLoc, travel, ptCtx, locName)
        .filter(sl => !memberClash(bookWeek, sl.day ?? day, sl.time, PT_DUR));
      const { ranges, gaps } = ptRangesFor(tid, day, ptLoc, travel, ptCtx, locName);
      const working = !!workWindow(shifts, tid, day);
      return { trainer:tid, slots, ranges, gaps, working };
    });
    // bookWeek / myClassBookings / myCamps are in here because the member-clash
    // check reads them — without them the slot list goes stale after a booking
  },[day,ptLoc,ptTrainers,myPT,locations,travel,sessions,ptBookings,timeOff,shifts,
     bookWeek,myClassBookings,myCamps,bookWeeks,camps]);

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

  const store = { logout, sendOtp, verifyOtp, memberBusy, memberClash, addRefundable, bookPay, exceptionQueue, exceptionSheet, justBooked, optInAt, pendingCounts, policy, refundQueue, refundables, reminderChannel, requestException, requestRefund, resolveException, resolveIncidental, resolveRefund, setBookPay, setExceptionQueue, setExceptionSheet, setJustBooked, setOptInAt, setPolicy, setRefundQueue, setRefundables, setReminderChannel, windowFor,
    ACCOUNTS, aboutCopy, aboutEdit, active, addCustomExercise, addExerciseToActive, addLead, addLocation, addSet, addTimeOff, addTrainer, adminSec, anyOverlay, applyCoupon, audit, backRef, bioEdit, bookDates, bookFor, bookWeek, bookWeeks, booked, calDay, calSpan, calTrainer, calWeek, campBuilder, campOpenId, campSheet, camps, cancelCamp, cancelClass, cancelHrs, cancelPT, chatInput, chatMsgs, chatOpen, classPass, classTemplates, clientMove, closeOverlays, commitClientMove, confirmBook, confirmCampBuy, confirmShopBuy, coupon, couponForm, couponMsg, couponValue, coupons, credits, customEx, cycleType, day, daySessions, doneSheet, exLib, exPicker, exSearch, finishWorkout, goal, hoursUntil, incidentals, intakeForm, isAdmin, isClient, joinWaitlist, leads, ledger, loc, locName, locations, logAudit, logOpen, logView, login, logs, mark, markAll, marketingOptIn, measForm, measurements, moveDay, moveSheet, myCalDay, myCamps, myClassBookings, myPT, mySpan, myView, myWaitlist, myWeek, navItems, newLocName, noShowQueue, noteSheet, offerSheet, offers, otherPlace, payMode, perm, permOpen, ping, plate, prToast, products, progEx, progMetric, promoteSuggested, ptBookings, ptByTrainer, ptCtx, ptLoc, ptPool, ptTrainers, rates, ratings, receiptSheet, referralCode, referralReward, referralUses, removeExercise, removeSet, removeTimeOff, repeatLog, resolveNoShow, rest, revenue, rosterOpen, routineSheet, routines, schedView, seg, sessions, setAboutCopy, setAboutEdit, setActive, setAddLead, setAddTrainer, setAdminSec, setAudit, setBioEdit, setBookDates, setBookFor, setBookWeek, setBookWeeks, setCalDay, setCalSpan, setCalTrainer, setCalWeek, setCampBuilder, setCampOpenId, setCampSheet, setCamps, setChatInput, setChatMsgs, setChatOpen, setClassPass, setClassTemplates, setClientMove, setCoupon, setCouponForm, setCouponMsg, setCoupons, setCredits, setCustomEx, setDay, setDoneSheet, setExLib, setExPicker, setExSearch, setGoal, setIncidentals, setIntakeForm, setLeads, setLedger, setLoc, setLocations, setLogOpen, setLogView, setLogs, setMarketingOptIn, setMeasForm, setMeasurements, setMoveDay, setMoveSheet, setMyCalDay, setMyCamps, setMyClassBookings, setMyPT, setMySpan, setMyView, setMyWaitlist, setMyWeek, setNewLocName, setNoShowQueue, setNoteSheet, setOfferSheet, setOffers, setOtherPlace, setPayMode, setPerm, setPermOpen, setPlate, setPrToast, setProducts, setProgEx, setProgMetric, setPtBookings, setPtLoc, setPtTrainers, setRates, setRatings, setReceiptSheet, setReferralReward, setReferralUses, setRest, setRosterOpen, setRoutineSheet, setRoutines, setSchedView, setSeg, setSessions, setSheet, setShiftEditor, setShifts, setShopSheet, setShopTab, setSuggestedLocs, setTab, setTemplateBuilder, setTimeOff, setTimeOffSheet, setToast, setTrainers, setTravel, setUser, setWalkSheet, sheet, shiftEditor, shifts, shopSheet, shopTab, staffSessions, staffTimeOff, startBlank, startCamp, startFromRoutine, suggestedLocs, tName, tab, templateBuilder, timeOff, timeOffSheet, toast, toggleSetDone, trainers, travel, updSet, user, walkSheet };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

