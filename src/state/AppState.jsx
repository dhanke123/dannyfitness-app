/* Every piece of demo state lives here. In the dev phase this provider is where
   Supabase queries and realtime subscriptions replace the useState calls — the screens
   consuming useApp() should not need to change. */
import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { COUPONS, CT, PT_PRICE, TRAINERS, isHead, mkSet, seedAbout, seedCamps, seedClassTemplates, seedLeads, seedLedger, seedLocations, seedOffers, seedExpenseClaims, seedIntakeRecords, seedProducts, seedPtBookings, seedRoutines, seedSessions, seedShifts, seedTimeOff, seedTravel, seedWorkoutSessions } from "../data/seed.js";
import { DAYS, TODAY, dateFor, fmtFull, fromISO, isoFor, toISO, toMin } from "../lib/dates.js";
import { EXLIB, best1RM, bestWeight, est1RM, estKcal, exMeta, isWorking, muscleOf } from "../lib/metrics.js";
import { PT_DUR, ptRangesFor, ptSlotsFor, sessTrainers, workWindow } from "../lib/scheduling.js";
import { nid } from "../lib/util.js";
import { fetchProfile, isConfigured, looksLikeSgMobile, supabase, toAppUser, toE164 } from "../lib/supabase.js";
import { buildNotifications } from "../lib/notifications.js";
import { allConflicts, hasBlocking } from "../lib/conflicts.js";
import { approvedTotal, claimErrors, claimTotal, emptyClaim, emptyLine, excludedTotal, nextRef } from "../lib/expenses.js";
import { EVENTS, startUsageSession, track } from "../lib/usage.js";
import { Card } from "../ui/kit.jsx";

const round2 = (n) => Math.round(n * 100) / 100;

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  // F0: one event per screen view. Screen name + role only — never who or what.
  useEffect(() => { if (user) track(EVENTS.SCREEN_VIEW, { screen: tab, role: user.role }); }, [tab, user]);
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
  const [intakeView, setIntakeView] = useState(null); // {id} — read a saved record back in full
  const [reportView, setReportView] = useState("analytics"); // Reports screen: analytics | payouts
  /* ---- flows that used to dead-end ----
     Each of these was a button that fired a toast and changed nothing. A control
     that reports success without doing anything is worse than one that's disabled:
     it teaches people the app lies, and they stop trusting the parts that work. */
  const [legalSheet, setLegalSheet] = useState(null);      // 'privacy' | 'delete'
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [checkedIn, setCheckedIn] = useState([]);          // booking keys the member has checked into
  const [productForm, setProductForm] = useState(null);    // add a pack/pass properly
  const [classBuilder, setClassBuilder] = useState(null);  // create/edit a class
  const [showCancelled, setShowCancelled] = useState(true);// calendar: keep cancelled visible

  const openClassBuilder = (seed) => setClassBuilder({
    editId:null, type:"STR", date:isoFor(0, TODAY), time:"07:00", loc:seedLocations[0]?.id,
    cap:10, trainers:[], repeat:1, ...seed });

  /* Save re-runs the conflict check. The form checks live, but state can move
     between opening the form and pressing save — another admin books the coach,
     or a member takes a PT slot. Validating only in the UI is validating nowhere. */
  const saveClass = (cb) => {
    const dur = CT[cb.type]?.dur || 60;
    const picked = fromISO(cb.date);
    if (!picked) { ping("Pick a date for the class"); return; }
    const ctx = { sessions, ptBookings, timeOff, camps, travel };
    const found = allConflicts({trainers:cb.trainers, day:picked.day, weekOff:picked.weekOff,
                                time:cb.time, durMin:dur, loc:cb.loc}, ctx, tName, locName, cb.editId);
    if (hasBlocking(found)) { ping(found.find(f=>f.severity==="block").message); return; }

    if (cb.editId) {
      setSessions(ss => ss.map(x => x.id!==cb.editId ? x : {
        ...x, type:cb.type, day:picked.day, weekOff:picked.weekOff, date:cb.date,
        time:cb.time, loc:cb.loc, cap:+cb.cap||8,
        trainers:[...cb.trainers], trainer:cb.trainers[0] }));
      logAudit(`Class edited · ${CT[cb.type].name} ${cb.date} ${cb.time}`);
      ping(`${CT[cb.type].name} updated`);
    } else {
      const n = Math.max(1, +cb.repeat || 1);
      // Each repeat is a separate dated session, so each can be cancelled, moved
      // or conflict-checked on its own — a single recurring row can't be.
      const made = Array.from({length:n}).map((_,i) => ({
        id:nid(), type:cb.type, day:picked.day, weekOff:picked.weekOff + i,
        date:isoFor(picked.weekOff + i, picked.day),
        time:cb.time, loc:cb.loc, cap:+cb.cap||8,
        trainer:cb.trainers[0], trainers:[...cb.trainers], attendees:[], status:"scheduled" }));
      setSessions(ss => [...ss, ...made]);
      logAudit(`Class created · ${CT[cb.type].name} ${cb.date} ${cb.time} · ${cb.trainers.map(tName).join(" + ")} · ${n}x`);
      ping(n>1 ? `${n} weekly ${CT[cb.type].name} classes created` : `${CT[cb.type].name} created — live in the timetable`);
    }
    setClassBuilder(null);
  };

  /* Cancelling keeps the row. Deleting it would erase the fact that it was ever
     scheduled — and with it the reason a coach's week looks light, why members
     got credits back, and any chance of spotting a pattern of cancellations. */
  const cancelSession = (sid, reason) => {
    const s0 = sessions.find(x=>x.id===sid); if (!s0) return;
    const n = (s0.attendees||[]).length;
    setSessions(ss => ss.map(x => x.id!==sid ? x : {
      ...x, status:"cancelled", cancelledAt:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),
      cancelReason: reason || "" }));
    // members holding a spot get their credit back automatically
    if (myClassBookings.includes(sid)) {
      setMyClassBookings(b=>b.filter(x=>x!==sid));
      setCredits(c=>({...c, classes:c.classes+1}));
    }
    logAudit(`Class cancelled · ${CT[s0.type].name} ${DAYS[s0.day]} ${s0.time}${reason?` · "${reason}"`:""} · ${n} booked`);
    ping(n>0 ? `Cancelled — ${n} member${n===1?"":"s"} notified and credited back`
             : "Cancelled — kept on the calendar, struck through, for the record");
  };
  const restoreSession = (sid) => {
    setSessions(ss => ss.map(x => x.id!==sid ? x : {...x, status:"scheduled", cancelledAt:null, cancelReason:null}));
    ping("Class restored — members are not re-booked automatically");
  };

  /* ---------------- moving a booking ----------------
     One commit path, used by the reschedule sheet AND by drag-and-drop on the
     calendar. Two ways to move a session is two places for the audit line, the
     conflict re-check and the weekOff bookkeeping to disagree.

     Re-checks conflicts at commit time even though the caller already did: on a
     drag the check ran against state as it was when the finger went down, and a
     drag is slow. Validating only where the gesture starts is validating nowhere. */
  const [lastMove, setLastMove] = useState(null);   // {kind, id, from:{...}, label}

  const moveBooking = ({ kind, id, day, time, loc, trainer, weekOff, force }) => {
    const isPt = kind === "pt";
    const item = isPt ? ptBookings.find(b => b.id === id) : sessions.find(s => s.id === id);
    if (!item) { ping("That booking no longer exists — refresh the week"); return false; }

    const from = { day: item.day, time: item.time, loc: item.loc, weekOff: item.weekOff ?? 0,
                   trainer: item.trainer, trainers: item.trainers };
    const to = { day: day ?? from.day, time: time ?? from.time, loc: loc ?? from.loc,
                 weekOff: weekOff ?? from.weekOff };
    if (to.day === from.day && to.time === from.time && to.loc === from.loc
        && to.weekOff === from.weekOff && !trainer) return false;

    const coaches = trainer ? [trainer] : (isPt ? [item.trainer] : sessTrainers(item));
    const durMin = isPt ? PT_DUR : (CT[item.type]?.dur || 60);
    const found = allConflicts({ trainers: coaches, day: to.day, weekOff: to.weekOff,
      time: to.time, durMin, loc: to.loc }, { sessions, ptBookings, timeOff, camps, travel },
      tName, locName, id);
    if (hasBlocking(found) && !force) { ping(found.find(f => f.severity === "block").message); return false; }

    const label = isPt ? `PT · ${item.who}` : (CT[item.type]?.name || "Class");
    if (isPt) setPtBookings(pb => pb.map(b => b.id !== id ? b : {
      ...b, day: to.day, time: to.time, loc: to.loc, weekOff: to.weekOff,
      trainer: trainer || b.trainer, date: b.date ? fmtFull(dateFor(to.weekOff, to.day)) : b.date }));
    else setSessions(ss => ss.map(s => s.id !== id ? s : {
      ...s, day: to.day, time: to.time, loc: to.loc, weekOff: to.weekOff,
      date: s.date ? isoFor(to.weekOff, to.day) : s.date,
      ...(trainer ? { trainer, trainers: [trainer, ...(s.trainers || []).filter(t => t !== trainer)] } : {}) }));

    setLastMove({ kind, id, from, label });
    logAudit(`Moved ${label} · ${DAYS[from.day]} ${from.time} → ${DAYS[to.day]} ${to.time}${to.loc!==from.loc?` · ${locName(to.loc)}`:""}${trainer&&trainer!==from.trainer?` · now ${tName(trainer)}`:""}`);
    const warn = found.find(f => f.severity === "warn");
    ping(`${label} → ${DAYS[to.day]} ${to.time}${warn ? ` · ${warn.message}` : ""}`);
    return true;
  };

  /* Undo exists because drag-and-drop makes accidental moves easy in a way that a
     confirm dialog never did. Cheaper to allow the mistake and offer the way back
     than to put a modal in front of every drag. */
  const undoMove = () => {
    if (!lastMove) return;
    const { kind, id, from, label } = lastMove;
    if (kind === "pt") setPtBookings(pb => pb.map(b => b.id !== id ? b : {
      ...b, day: from.day, time: from.time, loc: from.loc, weekOff: from.weekOff,
      trainer: from.trainer, date: b.date ? fmtFull(dateFor(from.weekOff, from.day)) : b.date }));
    else setSessions(ss => ss.map(s => s.id !== id ? s : {
      ...s, day: from.day, time: from.time, loc: from.loc, weekOff: from.weekOff,
      trainer: from.trainer, trainers: from.trainers,
      date: s.date ? isoFor(from.weekOff, from.day) : s.date }));
    logAudit(`Undid move · ${label} back to ${DAYS[from.day]} ${from.time}`);
    setLastMove(null);
    ping(`${label} put back — ${DAYS[from.day]} ${from.time}`);
  };

  /* Dry run for the drag ghost: same engine, no side effects. Called on every
     pointer move, so it must stay pure and cheap. */
  const previewMove = ({ kind, id, day, time, loc, trainer, weekOff }) => {
    const isPt = kind === "pt";
    const item = isPt ? ptBookings.find(b => b.id === id) : sessions.find(s => s.id === id);
    if (!item) return { ok: false, message: "Booking not found" };
    const coaches = trainer ? [trainer] : (isPt ? [item.trainer] : sessTrainers(item));
    const durMin = isPt ? PT_DUR : (CT[item.type]?.dur || 60);
    const found = allConflicts({ trainers: coaches, day, weekOff: weekOff ?? item.weekOff ?? 0,
      time, durMin, loc: loc ?? item.loc }, { sessions, ptBookings, timeOff, camps, travel },
      tName, locName, id);
    const block = found.find(f => f.severity === "block");
    if (block) return { ok: false, message: block.message };
    const warn = found.find(f => f.severity === "warn");
    return { ok: true, message: warn ? warn.message : "" };
  };

  // Clipboard with a truthful fallback — navigator.clipboard is unavailable on
  // insecure origins and in some in-app browsers, and silently failing there is
  // exactly the pattern being removed.
  const copyText = async (text, okMsg) => {
    try {
      if (navigator?.clipboard?.writeText) { await navigator.clipboard.writeText(text); ping(okMsg); return true; }
      throw new Error("no clipboard");
    } catch { ping(`Copy this: ${text}`); return false; }
  };

  const checkIn = (key, label) => {
    if (checkedIn.includes(key)) { ping("Already checked in"); return; }
    setCheckedIn(c => [...c, key]);
    ping(`Checked in for ${label} — your coach can see you've arrived`);
  };

  // DECISION 15: deletion anonymises, financial records are retained.
  const requestDeletion = (reason) => {
    setDeletionRequests(d => [{ id:nid(), who:user?.name || "Member", reason: reason || "",
      when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),
      status:"pending" }, ...d]);
    setLegalSheet(null);
    ping("Deletion request sent. ExerciseOnly will confirm within 30 days.");
  };
  const resolveDeletion = (id, approved, reason) => {
    const it = deletionRequests.find(x=>x.id===id);
    setDeletionRequests(d => d.filter(x=>x.id!==id));
    logAudit(`Account deletion ${approved?"completed":"declined"} · ${it?.who}${reason?` · "${reason}"`:""}`);
    ping(approved
      ? "Account anonymised — name, phone and email scrubbed. Bookings and payments kept so the books still balance."
      : "Deletion declined — the member is told why.");
  };

  const deactivateTrainer = (tid) => {
    const t = trainers.find(x=>x.id===tid);
    const openWork = sessions.filter(x=>sessTrainers(x).includes(tid)).length
                   + ptBookings.filter(b=>b.trainer===tid && b.status!=="cancelled").length;
    setTrainers(ts => ts.map(x => x.id!==tid ? x : {...x, active:false}));
    setPtTrainers(p => p.filter(id => id!==tid));
    logAudit(`Trainer deactivated · ${t?.name}`);
    ping(openWork > 0
      ? `${t?.name} deactivated — hidden from booking. ${openWork} existing session${openWork===1?"":"s"} still need reassigning.`
      : `${t?.name} deactivated — hidden from new bookings.`);
  };
  const reactivateTrainer = (tid) => {
    setTrainers(ts => ts.map(x => x.id!==tid ? x : {...x, active:true}));
    ping(`${trainers.find(x=>x.id===tid)?.name} is bookable again`);
  };

  // Generate real sessions from a template rather than claiming to.
  const applyTemplate = (tpl) => {
    /* Template rows must be shaped like every other session or they behave like a
       different kind of object downstream: no `status` and the cancelled filter
       can't exclude them, no `trainers` and the multi-coach conflict check only
       sees the first, no `weekOff`/`date` and the week-aware engines treat them as
       recurring forever. */
    const made = (tpl.blocks||[]).map(b => ({
      id: nid(), day: b.day, weekOff: 0, date: isoFor(0, b.day),
      time: b.start, type: b.type, loc: b.loc,
      trainer: b.trainer, trainers: b.trainers?.length ? [...b.trainers] : (b.trainer ? [b.trainer] : []),
      cap: b.cap || 8, attendees: [], status: "scheduled",
    }));
    if (!made.length) { ping(`"${tpl.name}" has no class blocks yet — edit it first`); return; }
    setSessions(ss => [...ss, ...made]);
    logAudit(`Template applied · ${tpl.name} · ${made.length} sessions`);
    ping(`"${tpl.name}" applied — ${made.length} session${made.length===1?"":"s"} added to the timetable`);
  };

  const addProduct = (form) => {
    setProducts(ps => [...ps, { id:nid(), name:form.name.trim(), price:+form.price||0,
      kind:form.kind, sessions:+form.sessions||0, period:form.period||null,
      validity:+form.validity||90, active:true }]);
    setProductForm(null);
    ping(`${form.name.trim()} added — live in the shop now`);
  };
  /* Intake assessments were never persisted — the form closed with a toast and the
     answers vanished. That's the record a coach most needs when a client is handed
     over: goals, injury history, what's already been tried. Now kept per client,
     newest first, and exportable. */
  /* Seeded in seed.js, fully populated across every field of the paper form —
     three dated assessments for Sam Lee a quarter apart so the trend, the deltas
     and the exports all have something real to show. */
  const [intakeRecords, setIntakeRecords] = useState(seedIntakeRecords);
  const saveIntake = (rec) => {
    /* Full record: every field from the paper intake form is kept. Earlier
       records are never overwritten — history is the point.
       `iso` is stored alongside the display date because "28 Jul 2026" sorts
       alphabetically, which puts April before January. The exports order by it. */
    const now = new Date();
    setIntakeRecords(rs => [{ ...rec, id:nid(), by:user?.id || "staff",
      d:now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
      iso: toISO(now),
      goals:rec.goals||"", injuries:rec.injuries||"", notes:rec.notes||"" }, ...rs]);
    setIntakeForm(null);
    ping(`Intake saved for ${rec.who} — visible to any coach who takes them on`);
  };
  /* ---- CLIENT REGISTRY ----
     A PERSON is the atomic unit: one record per human, phone = their login.
     A GROUP links 2-3 existing clients; exactly one member is PRIMARY — the
     primary pays, owns the shared pack and receives billing comms. Groups are
     links, never merged identities: login is always one person. */
  const [clients, setClients] = useState([
    { id:"c1",  name:"Sam Lee",  phone:"91230001", email:"sam@example.sg",  status:"active", source:"member" },
    { id:"c2",  name:"Ben",      phone:"91230002", email:"",                status:"active", source:"member" },
    { id:"c3",  name:"Cheryl",   phone:"91230003", email:"",                status:"active", source:"member" },
    { id:"c4",  name:"Priya",    phone:"91230004", email:"",                status:"active", source:"member" },
    { id:"c5",  name:"Kumar",    phone:"91230005", email:"",                status:"active", source:"member" },
    { id:"c6",  name:"Elaine",   phone:"91230006", email:"",                status:"active", source:"member" },
    { id:"c7",  name:"Ivan",     phone:"91230007", email:"",                status:"active", source:"member" },
    { id:"c8",  name:"Nadia",    phone:"91230008", email:"",                status:"active", source:"member" },
    { id:"c9",  name:"Sarah T",  phone:"91230009", email:"",                status:"active", source:"member" },
    { id:"c10", name:"Gireesh",  phone:"91230010", email:"",                status:"active", source:"member" },
    { id:"c11", name:"Wen Jie",  phone:"91230011", email:"",                status:"active", source:"member" },
    { id:"c12", name:"Dominic",  phone:"91230012", email:"",                status:"active", source:"member" },
    { id:"c13", name:"Jaiveer",  phone:"91230013", email:"",                status:"active", source:"member" },
    { id:"c14", name:"Swati",    phone:"91230014", email:"",                status:"active", source:"import" },
    { id:"c15", name:"Supriya",  phone:"91230015", email:"",                status:"active", source:"import" },
    { id:"c16", name:"Shreyans", phone:"91230016", email:"",                status:"active", source:"import" },
    { id:"c17", name:"Pooja",    phone:"91230017", email:"",                status:"active", source:"import" },
    { id:"c18", name:"Mable",    phone:"91230018", email:"",                status:"active", source:"import" },
    { id:"c19", name:"Wendy",    phone:"91230019", email:"",                status:"active", source:"import" },
    { id:"c20", name:"Helen",    phone:"91230020", email:"",                status:"active", source:"import" },
  ]);
  const [clientGroups, setClientGroups] = useState([
    { id:"g1", name:"Swati & Supriya",       memberIds:["c14","c15"],       primaryId:"c14", trainer:"danny" },
    { id:"g2", name:"Shreyans & Pooja",      memberIds:["c16","c17"],       primaryId:"c16", trainer:"danny" },
    { id:"g3", name:"Mable & Wendy & Helen", memberIds:["c18","c19","c20"], primaryId:"c18", trainer:"danny" },
    { id:"g4", name:"Sam & Ben",             memberIds:["c1","c2"],         primaryId:"c1",  trainer:"danny" },
  ]);
  const clientById = (id) => clients.find(c => c.id === id);
  const groupByName = (name) => clientGroups.find(g => g.name === name);
  const addClient = (c) => { const id = nid();
    setClients(cs => [...cs, { id, status:"active", source:"manual", email:"", phone:"", ...c }]); return id; };
  const createGroup = ({ name, memberIds, primaryId, trainer }) => {
    const members = memberIds.map(id => clientById(id)?.name).filter(Boolean);
    const gname = name || members.join(" & ");
    const id = nid();
    setClientGroups(gs => [...gs, { id, name:gname, memberIds, primaryId: primaryId || memberIds[0], trainer: trainer || "danny" }]);
    return { id, name: gname };
  };
  const editClient = (id, patch) => {
    setClients(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
    ping("Client updated");
  };
  /* ---- editing an existing group ----
     Groups could be created and never touched again: no rename, no way to add the
     third person who joined, no way to move PRIMARY when the person who pays
     changes. The only route was to make a second group, which splits the shared
     pack and the payment history in half.

     Two invariants the schema enforces (023_clients_groups.sql) and this must not
     break: at least 2 members, and EXACTLY ONE primary. Removing the primary
     promotes the first remaining member rather than leaving the group with none —
     a group with no primary has nobody to bill.

     The shared pack follows the group by `groupId`, so a rename must carry to the
     pack's display name or the two stop matching in Clients and in reports. */
  const updateGroup = (id, patch) => {
    const g0 = clientGroups.find(x => x.id === id);
    if (!g0) { ping("That group no longer exists"); return false; }
    const next = { ...g0, ...patch };
    next.memberIds = [...new Set(next.memberIds || [])];
    if (next.memberIds.length < 2) { ping("A group needs at least 2 people — remove it instead"); return false; }
    if (!next.memberIds.includes(next.primaryId)) next.primaryId = next.memberIds[0];
    next.name = String(next.name || "").trim()
      || next.memberIds.map(mid => clientById(mid)?.name).filter(Boolean).join(" & ");
    if (clientGroups.some(x => x.id !== id && x.name.toLowerCase() === next.name.toLowerCase())) {
      ping(`There's already a group called "${next.name}"`); return false;
    }

    setClientGroups(gs => gs.map(x => x.id === id ? next : x));
    // keep the shared pack's label and members in step with the group
    setGroupPacks(ps => ps.map(p => (p.groupId === id || p.name === g0.name)
      ? { ...p, groupId:id, name:next.name, trainer:next.trainer || p.trainer,
          members: next.memberIds.map(mid => clientById(mid)?.name).filter(Boolean) }
      : p));

    const added   = next.memberIds.filter(m => !g0.memberIds.includes(m)).map(m => clientById(m)?.name).filter(Boolean);
    const removed = g0.memberIds.filter(m => !next.memberIds.includes(m)).map(m => clientById(m)?.name).filter(Boolean);
    const bits = [
      g0.name !== next.name ? `renamed from "${g0.name}"` : "",
      added.length ? `added ${added.join(", ")}` : "",
      removed.length ? `removed ${removed.join(", ")}` : "",
      g0.primaryId !== next.primaryId ? `primary now ${clientById(next.primaryId)?.name}` : "",
      g0.trainer !== next.trainer ? `coach now ${tName(next.trainer)}` : "",
    ].filter(Boolean);
    logAudit(`Group updated · ${next.name}${bits.length ? ` · ${bits.join(" · ")}` : ""}`);

    // Decision 20: any change to a group is everyone's business, not just the editor's
    if (bits.length) notifyClient(next.name, `Your group has been updated: ${bits.join(", ")}.`);
    ping(bits.length ? `${next.name} updated` : "No changes");
    return true;
  };

  /* Deleting unlinks people; it never deletes them. The clients stay, their
     individual history stays, and the shared pack is what actually blocks: unused
     credits on a group pack are money already taken, and dissolving the group would
     strand them with no owner. */
  const deleteGroup = (id) => {
    const g = clientGroups.find(x => x.id === id);
    if (!g) return false;
    const pack = groupPacks.find(p => p.groupId === id || p.name === g.name);
    const left = pack ? pack.size - pack.used : 0;
    if (left > 0) {
      ping(`${g.name} still has ${left} unused shared session${left===1?"":"s"} — use or refund them first`);
      return false;
    }
    setClientGroups(gs => gs.filter(x => x.id !== id));
    setGroupPacks(ps => ps.filter(p => !(p.groupId === id || p.name === g.name)));
    logAudit(`Group removed · ${g.name} · ${g.memberIds.length} people unlinked (clients kept)`);
    ping(`${g.name} removed — the ${g.memberIds.length} clients are kept as individuals`);
    return true;
  };
  /* CSV import — one row per PERSON:
       name,phone,email,group_name,is_primary,sessions_remaining
     Clients are created first, groups assembled from matching group_name, and a
     shared pack per group opens with the remaining balance from the sheet. */
  const importClientsCsv = (text) => {
    const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { clients:0, groups:0 };
    const header = lines[0].toLowerCase().split(",").map(s=>s.trim());
    const col = (row, key) => { const i = header.indexOf(key); return i >= 0 ? (row[i]||"").trim() : ""; };
    const rows = lines.slice(1).map(l => l.split(","));
    const created = { clients:0, groups:0 };
    const groupBuckets = {};   // group_name -> {memberIds, primaryId, sessions}
    const newClients = [];
    rows.forEach(r => {
      const name = col(r,"name"); if (!name) return;
      let existing = clients.find(c => c.name.toLowerCase() === name.toLowerCase())
        || newClients.find(c => c.name.toLowerCase() === name.toLowerCase());
      let cid = existing?.id;
      if (!existing) { cid = nid();
        newClients.push({ id:cid, name, phone:col(r,"phone"), email:col(r,"email"), status:"active", source:"import" });
        created.clients++; }
      const gname = col(r,"group_name");
      if (gname) {
        groupBuckets[gname] = groupBuckets[gname] || { memberIds:[], primaryId:null, sessions:0 };
        groupBuckets[gname].memberIds.push(cid);
        if (/^(1|y|yes|true)$/i.test(col(r,"is_primary"))) groupBuckets[gname].primaryId = cid;
        const rem = parseInt(col(r,"sessions_remaining"), 10);
        if (rem > 0) groupBuckets[gname].sessions = Math.max(groupBuckets[gname].sessions, rem);
      }
    });
    if (newClients.length) setClients(cs => [...cs, ...newClients]);
    Object.entries(groupBuckets).forEach(([gname, b]) => {
      if (clientGroups.some(g => g.name === gname)) return;   // already exists — skip
      const gid = nid();
      setClientGroups(gs => [...gs, { id:gid, name:gname, memberIds:b.memberIds,
        primaryId: b.primaryId || b.memberIds[0], trainer:"danny" }]);
      if (b.sessions > 0) setGroupPacks(ps => [...ps, { id:nid(), name:gname, groupId:gid,
        members: b.memberIds.map(id => (newClients.find(c=>c.id===id) || clients.find(c=>c.id===id))?.name).filter(Boolean),
        size:b.sessions, used:0, trainer:"danny" }]);
      created.groups++;
    });
    ping(`Imported ${created.clients} client${created.clients===1?"":"s"}, ${created.groups} group${created.groups===1?"":"s"}`);
    return created;
  };
  /* Group attendance: rows per attended PERSON (reports count individuals), but
     the shared pack burns exactly ONE credit — the session happened and the
     coach's time was spent, whoever turned up (decision: deduct regardless). */
  const logGroupSession = ({ group, attended, date, time, tookBy, remark }) => {
    const absent = group.memberIds.filter(id => !attended.includes(id)).map(id => clientById(id)?.name).filter(Boolean);
    attended.forEach(id => {
      const nm = clientById(id)?.name; if (!nm) return;
      setSessionLog(ls => [{ id:nid(), who:nm, date, time, kind:"PT (group)", tookBy,
        remark: [remark, absent.length ? `absent: ${absent.join(", ")}` : ""].filter(Boolean).join(" · ") }, ...ls]);
    });
    setGroupPacks(gs => gs.map(g => (g.groupId === group.id || g.name === group.name)
      ? { ...g, used: Math.min(g.size, g.used + 1) } : g));
  };

  /* Per-client session history — replaces the per-client Google Sheet tabs.
     Auto-appended when attendance is marked; staff can backfill past sessions.
     `tookBy` records who ACTUALLY trained them (e.g. "Ansab trained" when the
     assigned coach was covered). */
  const [sessionLog, setSessionLog] = useState([
    { id:"sl1", who:"Swati & Supriya", date:"Wed, Jul 1",  time:"6:15 AM", kind:"PT", tookBy:"ansab", remark:"" },
    { id:"sl2", who:"Swati & Supriya", date:"Fri, Jul 3",  time:"6:00 AM", kind:"PT", tookBy:"ansab", remark:"" },
    { id:"sl3", who:"Swati & Supriya", date:"Wed, Jul 15", time:"6:15 AM", kind:"PT", tookBy:"ansab", remark:"" },
    { id:"sl4", who:"Swati & Supriya", date:"Fri, Jul 17", time:"6:00 AM", kind:"PT", tookBy:"ansab", remark:"only Swati" },
    { id:"sl5", who:"Swati & Supriya", date:"Wed, Jul 22", time:"6:00 AM", kind:"PT", tookBy:"ansab", remark:"" },
    { id:"sl6", who:"Swati & Supriya", date:"Fri, Jul 24", time:"6:00 AM", kind:"PT", tookBy:"ansab", remark:"" },
  ]);
  /* Shared combo packs — one pack per PAIR/TRIO, one payment, each joint session
     deducts one from the shared pool (decision: shared pack per group). */
  const [groupPacks, setGroupPacks] = useState([
    { id:"gp1", groupId:"g1", name:"Swati & Supriya",       members:["Swati","Supriya"],        size:10, used:6, trainer:"danny" },
    { id:"gp2", groupId:"g2", name:"Shreyans & Pooja",      members:["Shreyans","Pooja"],       size:10, used:2, trainer:"danny" },
    { id:"gp3", groupId:"g3", name:"Mable & Wendy & Helen", members:["Mable","Wendy","Helen"],  size:10, used:2, trainer:"danny" },
    { id:"gp4", groupId:"g4", name:"Sam & Ben",             members:["Sam Lee","Ben"],          size:5,  used:1, trainer:"danny" },
  ]);
  /* The logged-in CLIENT's group, if any. Drives the "book as myself / as my
     group" choice — the option simply doesn't exist for solo clients.
     (Defined AFTER groupPacks: this computes during render, so everything it
     reads must already be initialised.) */
  const myGroup = user?.role === "client"
    ? clientGroups.find(g => g.memberIds.some(id => clientById(id)?.name === user.name)) || null
    : null;
  const myGroupPack = myGroup
    ? groupPacks.find(p => p.groupId === myGroup.id || p.name === myGroup.name) || null
    : null;
  const addSessionLog = (entry) => {
    setSessionLog(ls => [{ id: nid(), kind:"PT", remark:"", ...entry }, ...ls]);
    // a joint session burns one credit from the group's shared pack
    setGroupPacks(gs => gs.map(g => g.name === entry.who ? { ...g, used: Math.min(g.size, g.used + 1) } : g));
  };
  const [products, setProducts] = useState(seedProducts);
  const [camps, setCamps] = useState(seedCamps);
  const [classTemplates, setClassTemplates] = useState(seedClassTemplates);
  const [ledger, setLedger] = useState(seedLedger);
  const [audit, setAudit] = useState([]); // admin override / book-on-behalf trail (never cleared in real build)

  /* ---- MANUAL PAYNOW (Danny's cost-saving decision, 27 Jul 2026) ----
     HitPay checkout is HIDDEN, not deleted: flip MANUAL_PAYNOW to false and the
     original instant-payment path (and the hitpay-create-payment edge function)
     comes straight back. While true: PayNow purchases show the static QR / the
     studio mobile number, the member uploads a transfer screenshot, and the
     purchase lands in an admin PAYMENT APPROVALS queue. Nothing is granted until
     the admin matches the proof against the bank app and approves. */
  const MANUAL_PAYNOW = true;
  /* PayNow receiving details — admin-editable (Manage → Settings → PayNow).
     qrImage is the bank-generated QR uploaded as a data URL so it renders
     offline; uen falls back to VITE_PAYNOW_UEN if never set here. */
  const [paynowConfig, setPaynowConfig] = useState({
    uen: import.meta.env.VITE_PAYNOW_UEN || "",
    mobile: "+65 8100 6608",
    qrImage: null,
  });
  const [paymentQueue, setPaymentQueue] = useState([]);
  const submitPaymentProof = ({ kind, what, amt, payload, proof, method }) => {
    setPaymentQueue(q => [{ id: nid(), who: user?.name || "Member", kind, what,
      amt: Math.round(amt), payload, proof, method: method || "PayNow",
      at: new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),
      status: "pending" }, ...q]);
    notifyStaff("admin", `${user?.name || "A member"} paid $${Math.round(amt)} by PayNow for ${what} — proof uploaded, needs approval`);
    ping("Proof submitted — you'll get your booking/credits as soon as admin confirms the transfer (usually same day).");
  };
  const resolvePayment = (id, approved, reason) => {
    const it = paymentQueue.find(x => x.id === id); if (!it) return;
    setPaymentQueue(q => q.filter(x => x.id !== id));
    if (!approved) {
      notifyClient(it.who, `Your PayNow proof for ${it.what} ($${it.amt}) couldn't be verified${reason?`: ${reason}`:""}. Nothing was charged in the app — message us if this is a mistake.`);
      ping("Payment denied — client notified");
      logAudit(`Denied PayNow proof · ${it.who} · ${it.what} · $${it.amt}${reason?` · ${reason}`:""}`);
      return;
    }
    /* Approved: execute the held purchase. Same grants as the instant path. */
    const p = it.payload || {};
    if (it.kind === "shop") {
      const prod = p.product;
      if (!prod) { ping("That purchase has no product attached — check the queue item."); return; }
      if (prod.kind==="classes") setCredits(c=>({...c, classes:c.classes+prod.sessions}));
      else if (prod.kind==="pthead") setCredits(c=>({...c, ptHead:c.ptHead+prod.sessions}));
      else if (prod.kind==="ptcoach") setCredits(c=>({...c, ptCoach:c.ptCoach+prod.sessions}));
      else if (prod.kind==="classpass") setClassPass({label:prod.name, period:prod.period, expires:`+${prod.validity}d`});
      // ptcombo: group-pack fulfilment is manual — the admin creates the group and
      // its shared pack under People. Nothing to grant automatically here.
      else if (prod.kind==="ptcombo") notifyStaff("admin", `${it.who} paid for ${prod.name} — create the group + shared pack under Manage → People`);
    } else if (it.kind === "camp") {
      // never take a seat that isn't there: the camp may have filled while the
      // proof sat in the queue
      const camp = camps.find(x=>x.id===p.campId);
      if (!camp || camp.spots <= 0) { ping("That camp is now full — deny the payment and refund instead."); return; }
      setCamps(cs=>cs.map(x=>x.id!==p.campId?x:{...x,spots:x.spots-1}));
      setMyCamps(m=>[...m, p.campId]);
    } else if (it.kind === "class") {
      setMyClassBookings(b=>[...b, p.sessionId]);
      if (p.date) setBookDates(bd=>({...bd, [p.sessionId]:p.date}));
      setBookWeeks(bw=>({...bw, [p.sessionId]:p.weekOff??0}));
      setBookPay(bp=>({...bp, [p.sessionId]:{mode:"paynow", amt:it.amt}}));
    } else if (it.kind === "pt") {
      const bk = { id:nid(), day:p.day, time:p.time, trainer:p.trainer, loc:p.loc,
        otherLabel:p.otherLabel, mode:"paynow", pool:p.pool, date:p.date, weekOff:p.weekOff };
      setMyPT(x=>[...x, bk]); setPtBookings(pb=>[...pb, {...bk, who:it.who}]);
    }
    setLedger(l=>[{id:nid(), who:it.who, what:`${it.what} (manual PayNow)`, amt:it.amt,
      method:"PayNow", status:"paid", d:"Today", iso: toISO(new Date())},...l]);
    notifyClient(it.who, `Payment confirmed — ${it.what} is yours. Thanks!`);
    ping(`Approved — $${it.amt} recorded, ${it.what} granted to ${it.who}`);
    logAudit(`Approved PayNow proof · ${it.who} · ${it.what} · $${it.amt} · ${it.proof?.name||"no file"}`);
  };
  /* Client notices — pushed when STAFF book or change something on a client's
     behalf. Unlike the derived notification feed, these are events, so they're
     stored. TODO(twilio): when WhatsApp is wired up, send the same text via the
     hitpay/notify edge function → Twilio WhatsApp Business API here. */
  const [clientNotices, setClientNotices] = useState([]);
  const firstNameOf = (n) => String(n || "").split(" ")[0];
  /* Staff notices — the other half of the scheduling loop. When a CLIENT books,
     moves or cancels, the assigned coach AND the admin both hear about it in
     their bell feed. target: "admin" or a trainer id. Together with
     clientNotices this closes the client ↔ coach ↔ admin triangle in-app —
     no WhatsApp (and no Twilio cost) needed for routine scheduling traffic. */
  const [staffNotices, setStaffNotices] = useState([]);
  const notifyStaff = (target, text) => {
    setStaffNotices(ns => [{ id: nid(), target, text,
      when: new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) }, ...ns]);
  };
  const notifyClient = (who, text) => {
    /* If "who" is a GROUP, fan out to every member — each person hears about
       changes to their group's sessions on their own login. */
    const grp = clientGroups.find(g => g.name === who);
    const targets = grp ? grp.memberIds.map(id => clientById(id)?.name).filter(Boolean) : [who];
    const when = new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    setClientNotices(ns => [...targets.map(t => ({ id: nid(), who: t, text, when })), ...ns]);
    // TODO(twilio): POST { to: phoneOf(each target), body: text } to the WhatsApp sender
  };
  const logAudit = (what)=> setAudit(a=>[{id:nid(), what, when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}, ...a]);
  const [leads, setLeads] = useState(seedLeads);
  /* Lead lifecycle. Previously a lead could be tagged but never left the list, so
     the queue only ever grew and "new" stopped meaning anything. Now: converted and
     lost are CLOSED — they drop out of the working list into a collapsed archive,
     which is what makes the open count trustworthy. */
  const LEAD_OPEN = ["new","contacted","trial booked"];
  const setLeadStatus = (id, status) => {
    setLeads(ls => ls.map(l => l.id!==id ? l : {
      ...l, status,
      closedAt: LEAD_OPEN.includes(status) ? null
        : new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),
      firstContactedAt: l.firstContactedAt || (status!=="new" ? new Date().toISOString() : null),
    }));
    if (status==="converted") ping("Marked converted — moved to closed leads");
    else if (status==="lost") ping("Marked lost — moved to closed leads. Reopen any time.");
  };
  const openLeads   = leads.filter(l => LEAD_OPEN.includes(l.status));
  const closedLeads = leads.filter(l => !LEAD_OPEN.includes(l.status));
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
  const [adminInboxOpen, setAdminInboxOpen] = useState(false); // admin/head-coach message inbox
  const [activeChatThread, setActiveChatThread] = useState(null); // thread id currently open in admin inbox
  const [chatThreads, setChatThreads] = useState([
    {
      id: "thread-dylan",
      memberId: "dylan",
      memberName: "Dylan Teo",
      msgs: [
        { from: "member", text: "Hey Coach Danny, do I need boxing gloves for Saturday's session?", ts: "2026-07-27T08:30:00" },
        { from: "coach",  text: "Gloves are provided — bring your own if you prefer! See you Saturday.", ts: "2026-07-27T08:45:00" },
        { from: "member", text: "Perfect. Also, can I swap to the 9am slot instead of 8am?", ts: "2026-07-27T08:52:00" },
      ],
      unread: 1,
    },
    {
      id: "thread-sam",
      memberId: "sam",
      memberName: "Sam Lim",
      msgs: [
        { from: "member", text: "Hi! Just checking — is the Tuesday 6pm class confirmed this week?", ts: "2026-07-26T19:00:00" },
      ],
      unread: 1,
    },
  ]);
  const [addTrainer, setAddTrainer] = useState(null); // Add/Edit Trainer form (has .editId when editing)
  const [shiftEditor, setShiftEditor] = useState(null); // {trainer}
  const [referralReward, setReferralReward] = useState(1); // earned class credits, claimable into the class pool
  const [menuConfig, setMenuConfig] = useState(null);
  const [gymHoursStart, setGymHoursStart] = useState(6);  // calendar grid start hour (6 = 6am)
  const [gymHoursEnd, setGymHoursEnd] = useState(22);    // calendar grid end hour (22 = 10pm) // null = not loaded yet; MenuManagement sets defaults on first open
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
  const [calSpan, setCalSpan] = useState("week");    // week is the default view for every role
  const [calTrainer, setCalTrainer] = useState("all"); // admin calendar filter: 'all' | trainerId
  const [bookFor, setBookFor] = useState(null);      // book sheet {trainer,day,time,weekOff,self,who,nonClient}
  const [walkSheet, setWalkSheet] = useState(null);  // class walk-in (attendance only, no payment) {sid,name}
  const [addLead, setAddLead] = useState(null);     // manual lead capture (walk-in / IG DM)
  // Public enquiry form — usable before login, lands in the admin's leads queue.
  const [enquiry, setEnquiry] = useState(null);     // {name,email,phone,location,query}
  const openEnquiry = () => setEnquiry({ name:"", email:"", phone:"", location:"", query:"" });
  const submitEnquiry = () => {
    const e = enquiry; if (!e) return;
    setLeads(ls => [{
      id: nid(),
      name: e.name.trim(),
      phone: e.phone.replace(/\D/g, ""),
      email: e.email.trim(),
      location: e.location || "",
      source: "Enquiry form",
      status: "new",
      note: e.query.trim(),
      at: new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),
    }, ...ls]);
    // Confirm INSIDE the sheet, not with a toast. The toast lives in the app shell,
    // which isn't mounted before login — so a stranger sending an enquiry saw the form
    // simply disappear with no acknowledgement at all. A one-shot action by someone
    // with no account needs a confirmation they can't miss.
    track(EVENTS.ENQUIRY_SUBMIT, { source:"login_screen" });
    setEnquiry(e2 => ({ ...e2, sent: true }));
  };
  /* Expense claims replace the old single-receipt "incidentals". See lib/expenses.js
     for why the old shape couldn't be reported on. */
  const [expenseClaims, setExpenseClaims] = useState(seedExpenseClaims);
  const [claimEditor, setClaimEditor] = useState(null);   // claim id being edited by its owner
  const [claimReview, setClaimReview] = useState(null);   // claim id open in the admin review sheet

  const [seg, setSeg] = useState("classes");
  const [day, setDay] = useState(TODAY);
  const [bookWeek, setBookWeek] = useState(0);   // client: which week is being browsed/booked (0 = this week)
  const [calWeek, setCalWeek] = useState(0);     // trainer/admin google-calendar grid: week offset
  const [bookDates, setBookDates] = useState({}); // {bookingKey: "Mon 28 Jul"} — human date per booking (demo)
  const [bookPay, setBookPay] = useState({});     // {sessionId: {mode, amt}} — how a class booking was paid, so cancel can credit vs refund
  const [bookWeeks, setBookWeeks] = useState({}); // {sessionId: weekOffset} — which week a class booking sits in
  // client "Booked" tab: list vs calendar, and the calendar's own week/day/span state
  const [myView, setMyView] = useState("cal");    // clients land on the calendar too, not a list
  const [mySpan, setMySpan] = useState("week");   // day | week
  const [myWeek, setMyWeek] = useState(0);
  const [myCalDay, setMyCalDay] = useState(TODAY);
  const [clientMove, setClientMove] = useState(null); // client-side PT reschedule sheet
  /* Tapping a booking on the client calendar used to just show a toast. Once the
     calendar became the default view that removed the member's only way to cancel
     — the Cancel/Modify buttons lived in the list. Every action from the list is
     now reachable from this sheet. */
  const [bookingDetail, setBookingDetail] = useState(null);
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
  const [eventSheet, setEventSheet] = useState(null); // {kind, id, weekOff} — staff: open a block before acting on it
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
    setDoneSheet(null); setNoteSheet(null); setAddLead(null); setWalkSheet(null); setBookFor(null);
    setAboutEdit(null); setBioEdit(null); setOfferSheet(null); setCouponForm(null); setExceptionSheet(null); setJustBooked(null); setEnquiry(null); setLegalSheet(null); setProductForm(null); setClassBuilder(null); setBookingDetail(null); setEventSheet(null); setClaimEditor(null); setClaimReview(null); setIntakeView(null);
    // log sub-overlays close first; the active workout itself is closed last
    if (exPicker||customEx||plate||routineSheet||rest) { setExPicker(false); setCustomEx(null); setPlate(null); setRoutineSheet(null); setRest(null); }
    else setActive(null); };
  const anyOverlay = !!(sheet||shopSheet||campSheet||chatOpen||timeOffSheet||moveSheet||clientMove||moveDay||shiftEditor||addTrainer||measForm||intakeForm||intakeView||campBuilder||templateBuilder||doneSheet||noteSheet||addLead||walkSheet||bookFor||couponForm||aboutEdit||bioEdit||offerSheet||exceptionSheet||justBooked||enquiry||legalSheet||productForm||classBuilder||bookingDetail||eventSheet||claimEditor||claimReview||active||exPicker||customEx||plate||routineSheet||rest);
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

  /* Escape closes the top overlay. Android back already did this; desktop and any
     phone with a keyboard attached had no way out of a sheet except the ✕, which is
     a 24px target in the corner. Same closeOverlays path, so the two agree. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const st = backRef.current;
      if (st.anyOverlay) { e.preventDefault(); st.closeOverlays(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
    startUsageSession(u);
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
      startUsageSession(u);
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
  /* Every exit from a checkout clears the checkout. The manual-PayNow paths used to
     `return` before the reset at the bottom of confirmBook, so a coupon applied to a
     class stayed armed and silently discounted the next thing the member bought. */
  const resetCheckout = () => { setCoupon(""); setCouponMsg(null); setOtherPlace(""); };
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
      if (MANUAL_PAYNOW && (payMode==="paynow"||payMode==="card")) {
        submitPaymentProof({ kind:"class", what:`${CT[s.type].name} · ${s.date||DAYS[s.day]} ${s.time}`,
          amt: couponValue(CT[s.type].price), proof: s.proof,
          payload:{ sessionId:s.id, date:s.date, weekOff:bookWeek } });
        setSheet(null); resetCheckout(); return;
      }
      if (payMode==="pass") { /* covered by active class pass — no deduction, no charge */ }
      else if (payMode==="credit") setCredits(c=>({...c, classes:c.classes-1}));
      else { const price=applyCoupon(CT[s.type].price);
        setLedger(l=>[{id:nid(), who:"Sam Lee", what:`Drop-in · ${CT[s.type].name}${coupon?` (${coupon.toUpperCase()})`:""}`, amt:Math.round(price), method:payMode==="paynow"?"PayNow":"Card", status:"paid", d:"Today"},...l]); }
      track(EVENTS.BOOK_CONFIRM, { kind:"class", method:payMode });
      setMyClassBookings(b=>[...b, s.id]);
      if (s.date) setBookDates(bd=>({...bd, [s.id]:s.date}));
      setBookWeeks(bw=>({...bw, [s.id]:bookWeek}));
      setBookPay(bp=>({...bp, [s.id]:{mode:payMode, amt: payMode==="paynow"||payMode==="card" ? Math.round(couponValue(CT[s.type].price)) : 0}}));
      ping(payMode==="pass"?`Booked ${s.date||""} — covered by your ${classPass?.label}`:payMode==="credit"?`Booked ${s.date||""} — ${credits.classes-1} class credits left`:`Paid & booked${s.date?" for "+s.date:""}. Confirmation sent by ${reminderChannel==="email"?"email":"WhatsApp"}.`);
      setJustBooked({ title:`${CT[s.type].name} · ExerciseOnly`, weekOff:bookWeek, day:s.day, time:s.time,
        minutes:CT[s.type].dur, location:locName(s.loc), uid:`class-${s.id}-w${bookWeek}`,
        details:`Coach ${tName(s.trainer)}`, dateLabel:s.date });
      sessTrainers(s).forEach(tid => notifyStaff(tid, `${user?.name||"A member"} booked ${CT[s.type].name} · ${s.date||DAYS[s.day]} ${s.time}`));
      notifyStaff("admin", `${user?.name||"A member"} booked ${CT[s.type].name} · ${s.date||DAYS[s.day]} ${s.time} · ${locName(s.loc)}`);
    } else if (s.kind==="pt") {
      const locLabel = s.loc==="other" ? (otherPlace||"Other spot") : null;
      const pool = ptPool(s.trainer);
      const asGroup = s.bookAs === "group" && myGroup;
      if (MANUAL_PAYNOW && (payMode==="paynow"||payMode==="card")) {
        submitPaymentProof({ kind:"pt", what:`PT · ${tName(s.trainer)} · ${s.date||DAYS[s.day]} ${s.time}`,
          amt: PT_PRICE[s.trainer], proof: s.proof,
          payload:{ trainer:s.trainer, day:s.day, time:s.time, loc:s.loc,
            otherLabel: s.loc==="other" ? (otherPlace||"Other spot") : null,
            pool, date:s.date, weekOff:bookWeek } });
        setSheet(null); resetCheckout(); return;
      }
      if (payMode==="grouppack" && asGroup) {
        /* group booking burns ONE shared credit — the pack belongs to the group,
           whoever of them taps Book */
        setGroupPacks(gs => gs.map(g => (g.groupId === myGroup.id || g.name === myGroup.name)
          ? { ...g, used: Math.min(g.size, g.used + 1) } : g));
      }
      else if (payMode==="credit") setCredits(c=>({...c, [pool]:c[pool]-1}));
      else setLedger(l=>[{id:nid(), who:"Sam Lee", what:`PT · ${tName(s.trainer)}${isHead(s.trainer)?" (Head Coach)":""}`, amt:PT_PRICE[s.trainer], method:payMode==="paynow"?"PayNow":"Card", status:"paid", d:"Today"},...l]);
      const bk = {id:nid(), day:s.day, time:s.time, trainer:s.trainer, loc:s.loc, otherLabel:locLabel, mode:payMode, pool, date:s.date, weekOff:bookWeek,
        who: asGroup ? myGroup.name : undefined, forGroup: asGroup ? myGroup.name : undefined};
      const label = (s.bookAs==="group" && myGroup) ? `${user?.name} (for ${myGroup.name})` : (user?.name||"A member");
      notifyStaff(s.trainer, `${label} booked PT · ${s.date||DAYS[s.day]} ${s.time}${locLabel?` · ${locLabel}`:""}`);
      notifyStaff("admin", `${label} booked PT with ${tName(s.trainer)} · ${s.date||DAYS[s.day]} ${s.time}`);
      if (s.bookAs==="group" && myGroup) myGroup.memberIds
        .map(id => clientById(id)?.name).filter(nm => nm && nm !== user?.name)
        .forEach(nm => setClientNotices(ns => [{ id:nid(), who:nm,
          text:`${user?.name} booked a ${myGroup.name} PT session: ${s.date||DAYS[s.day]} ${s.time} with ${tName(s.trainer)}. 1 group credit used.`,
          when:new Date().toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) }, ...ns]));
      track(EVENTS.BOOK_CONFIRM, { kind:"pt", method:payMode });
      setMyPT(p=>[...p, bk]);
      if (s.loc!=="other") setPtBookings(pb=>[...pb, {id:bk.id, trainer:s.trainer, day:s.day, time:s.time, loc:s.loc, who:"Sam Lee", date:s.date, weekOff:bookWeek}]);
      else setSuggestedLocs(sl=> sl.includes(locLabel) ? sl : [...sl, locLabel]);
      ping(payMode==="credit"?`PT booked — ${credits[pool]-1} ${isHead(s.trainer)?"head-coach":"coach"} PT credits left`:"Paid & booked. See you there!");
      setJustBooked({ title:`PT with ${tName(s.trainer)} · ExerciseOnly`, weekOff:bookWeek, day:s.day, time:s.time,
        minutes:45, location:locLabel || locName(s.loc), uid:`pt-${bk.id}`,
        details:`Personal training with Coach ${tName(s.trainer)}`, dateLabel:s.date });
    }
    setSheet(null); resetCheckout();
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
    if (s) { sessTrainers(s).forEach(tid => notifyStaff(tid, `${user?.name||"A member"} cancelled out of ${CT[s.type].name} · ${bookDates[sid]||DAYS[s.day]} ${s.time}`));
      notifyStaff("admin", `${user?.name||"A member"} cancelled ${CT[s.type].name} · ${bookDates[sid]||DAYS[s.day]} ${s.time}`); }
    track(EVENTS.BOOK_CANCEL, { kind:"class", method:pay.mode });
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
    track(EVENTS.EXCEPTION_REQUEST, { kind:payload.kind, type:payload.ask });
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
    track(EVENTS.REFUND_REQUEST, { method:item.method });
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
    track(EVENTS.BOOK_MODIFY, { kind:"pt" });
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
    notifyStaff(mv.trainer, `${user?.name||"A member"} moved their PT to ${nDate} ${nt} (was ${mv.date||DAYS[mv.day]} ${mv.time})`);
    notifyStaff("admin", `${user?.name||"A member"} moved PT with ${tName(mv.trainer)} to ${nDate} ${nt}`);
    ping(`Moved to ${nDate} · ${nt} — Coach ${tName(mv.trainer)} notified`);
  };
  const cancelPT = (id) => {
    const b = myPT.find(x=>x.id===id);
    // the row can be gone already — a second tap on a slow phone, or the sheet
    // left open while the booking was cancelled somewhere else
    if (!b) { ping("That session is no longer booked."); return; }
    const pool = b.pool || "ptCoach";
    notifyStaff(b.trainer, `${user?.name||"A member"} cancelled PT · ${b.date||DAYS[b.day]} ${b.time} — the slot is free again`);
    notifyStaff("admin", `${user?.name||"A member"} cancelled PT with ${tName(b.trainer)} · ${b.date||DAYS[b.day]} ${b.time}`);
    track(EVENTS.BOOK_CANCEL, { kind:"pt", method:b.mode });
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
    /* Decision 30: nothing is granted until the admin verifies the transfer. A shop
       purchase has no credit/pass path — it is always real money — so while
       MANUAL_PAYNOW is on there is NO branch here that grants the product directly.
       The old test enumerated payment modes (`paynow||card||!payMode`), and payMode
       is shared state that survives the last sheet: a member who had just booked a
       class on a credit arrived here with payMode==="credit", missed every arm of
       that test, and fell through to the instant-grant path — free credits, and a
       ledger row saying they'd paid. */
    if (MANUAL_PAYNOW) {
      submitPaymentProof({ kind:"shop", what:p.name, amt:price, proof:shopSheet.proof, payload:{ product:p } });
      setShopSheet(null); resetCheckout(); return;
    }
    if (p.kind==="classes") setCredits(c=>({...c, classes:c.classes+p.sessions}));
    else if (p.kind==="pthead") setCredits(c=>({...c, ptHead:c.ptHead+p.sessions}));
    else if (p.kind==="ptcoach") setCredits(c=>({...c, ptCoach:c.ptCoach+p.sessions}));
    else if (p.kind==="classpass") setClassPass({label:p.name, period:p.period, expires:`+${p.validity}d`});
    setLedger(l=>[{id:nid(), who:"Sam Lee", what:`${p.name}${coupon?` (${coupon.toUpperCase()})`:""}`, amt:Math.round(price), method:payMode==="card"?"Card":"PayNow", status:"paid", d:"Today"},...l]);
    ping(`${p.name} purchased — ${payMode==="card"?"card":"PayNow"} payment received`);
    setShopSheet(null); resetCheckout();
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
    if (MANUAL_PAYNOW && campSheet.pay!=="card") {
      submitPaymentProof({ kind:"camp", what:c.name, amt:price, proof:campSheet.proof, payload:{ campId:c.id } });
      setCampSheet(null); setCoupon(""); setCouponMsg(null); return;
    }
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
    if (!c) { ping("That camp is no longer listed."); return; }
    setMyCamps(m=>m.filter(x=>x!==campId));
    setCamps(cs=>cs.map(x=>x.id!==campId?x:{...x,spots:x.spots+1}));
    // camps are a one-off payment with no credit pool, so the value is held as account
    // credit and can be converted to a bank refund on request (Decision 2)
    addRefundable(`${c.name} · camp`, c.price, "PayNow", null);
    ping(`${c.name} cancelled — $${c.price} held as account credit. Request a bank refund in Booked if you'd rather have the money back.`);
  };

  const mark = (sid, name, status) => {
    setSessions(prev=>prev.map(s=>s.id!==sid?s:{...s, attendees:s.attendees.map(a=>a.name!==name?a:{...a,status})}));
    // auto-log into the client's session history — no more double entry in Sheets
    if (status === "attended") {
      const s = sessions.find(x => x.id === sid);
      if (s) addSessionLog({ who: name, date: new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}),
        time: s.time, kind: CT[s.type]?.name || "Class", tookBy: user?.id || sessTrainers(s)[0] });
    }
    if (name==="Sam Lee" && status==="attended") {
      const s = sessions.find(x=>x.id===sid);
      if (s) setLogs(l=>[{id:nid(),d:"Today", title:`${CT[s.type]?.name||"Class"} · ${locName(s.loc)}`, detail:"Tap + Log exercises to add detail", kind:"class"},...l]);
    }
    if (status==="no_show") {
      const s = sessions.find(x=>x.id===sid);
      if (s) setNoShowQueue(q=>[...q,{id:nid(), who:name, session:`${CT[s.type]?.name||"Class"} · ${DAYS[s.day]} ${s.time} · ${locName(s.loc)}`, policy:"Forfeit 1 credit"}]);
    }
  };
  const markAll = (sid) => {
    const s = sessions.find(x=>x.id===sid);
    if (!s) { ping("That session is no longer on the timetable."); return; }
    setSessions(prev=>prev.map(x=>x.id!==sid?x:{...x, attendees:x.attendees.map(a=>({...a,status:"attended"}))}));
    if (myClassBookings.includes(sid)) setLogs(l=>[{id:nid(),d:"Today", title:`${CT[s.type]?.name||"Class"} · ${locName(s.loc)}`, detail:"Tap + Log exercises to add detail", kind:"class"},...l]);
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
  /* ---------------------------------------------------- EXPENSE CLAIMS ----
     draft → submitted → approved / rejected → paid.
     Approval and payment are both the ADMIN's, not the head coach's: Danny is a
     coach here and submits claims like anyone else, so him approving his own would
     be the one hole an expense process can't have. */

  const claimById = (id) => expenseClaims.find(c => c.id === id);

  const newClaim = () => {
    const c = emptyClaim(nid(), nextRef(expenseClaims), user?.id);
    setExpenseClaims(cs => [c, ...cs]);
    setClaimEditor(c.id);
    return c;
  };

  const updateClaim = (id, patch) => setExpenseClaims(cs => cs.map(c => {
    if (c.id !== id) return c;
    // A submitted claim is out of the coach's hands. Editing it after the admin has
    // seen it means the thing approved isn't the thing submitted.
    if (c.status !== "draft") return c;
    return typeof patch === "function" ? patch(c) : { ...c, ...patch };
  }));

  const deleteClaim = (id) => {
    const c = claimById(id);
    if (!c || c.status !== "draft") { ping("Only a draft can be deleted"); return; }
    setExpenseClaims(cs => cs.filter(x => x.id !== id));
    setClaimEditor(null);
    ping("Draft deleted");
  };

  const submitClaim = (id) => {
    const c = claimById(id); if (!c) return false;
    const errs = claimErrors(c, toISO(new Date()));
    if (errs.length) { ping(errs[0]); return false; }
    setExpenseClaims(cs => cs.map(x => x.id !== id ? x : {
      ...x, status: "submitted", submittedAt: toISO(new Date()) }));
    setClaimEditor(null);
    logAudit(`Expense claim submitted · ${c.ref} · ${tName(c.trainer)} · $${claimTotal(c).toFixed(2)} · ${c.lines.length} item${c.lines.length===1?"":"s"}`);
    ping(`${c.ref} sent to admin — $${claimTotal(c).toFixed(2)}`);
    return true;
  };

  /* Withdraw exists because the alternative is the coach messaging the admin to ask
     them to reject it, which is not a workflow. Only while it's still untouched. */
  const withdrawClaim = (id) => {
    const c = claimById(id); if (!c || c.status !== "submitted") return;
    setExpenseClaims(cs => cs.map(x => x.id !== id ? x : { ...x, status: "draft", submittedAt: null }));
    logAudit(`Expense claim withdrawn · ${c.ref} · ${tName(c.trainer)}`);
    ping(`${c.ref} pulled back — it's a draft again`);
  };

  /* Excluding a single line lets the admin approve four parking slips and query the
     fifth, instead of rejecting the lot and making the coach re-enter everything
     that was already fine. The reason is required and travels back to the coach. */
  const toggleClaimLine = (claimId, lineId, reason) => setExpenseClaims(cs => cs.map(c => {
    if (c.id !== claimId || (c.status !== "submitted" && c.status !== "approved")) return c;
    return { ...c, lines: c.lines.map(l => l.id !== lineId ? l
      : { ...l, excluded: !l.excluded, excludeReason: !l.excluded ? (reason || "") : "" }) };
  }));

  const decideClaim = (id, approved, reason) => {
    const c = claimById(id); if (!c) return;
    if (!approved && !String(reason || "").trim()) { ping("Give a reason so the coach knows what to fix"); return; }
    const amt = approvedTotal(c);
    if (approved && !(amt > 0)) { ping("Every line is excluded — reject the claim instead"); return; }
    setExpenseClaims(cs => cs.map(x => x.id !== id ? x : {
      ...x, status: approved ? "approved" : "rejected",
      decidedAt: toISO(new Date()), decidedBy: user?.id, reason: reason || null }));
    const cut = excludedTotal(c);
    logAudit(`Expense claim ${approved ? "approved" : "rejected"} · ${c.ref} · ${tName(c.trainer)} · $${amt.toFixed(2)}${cut > 0 ? ` (excluded $${cut.toFixed(2)})` : ""}${reason ? ` · "${reason}"` : ""}`);
    ping(approved
      ? `${c.ref} approved — $${amt.toFixed(2)} now owed to ${tName(c.trainer)}${cut > 0 ? `, $${cut.toFixed(2)} excluded` : ""}`
      : `${c.ref} rejected — ${tName(c.trainer)} is notified with your reason`);
  };

  /* Marking paid is a separate act from approving, deliberately. Approved means
     "yes, that's a real cost"; paid means "the money has left the account". Merging
     them makes it impossible to answer the only question a coach ever asks: am I
     still out of pocket? */
  const markClaimPaid = (id, { ref, method, date } = {}) => {
    const c = claimById(id); if (!c) return;
    if (c.status !== "approved") { ping("Approve it first"); return; }
    setExpenseClaims(cs => cs.map(x => x.id !== id ? x : {
      ...x, status: "paid", paidAt: date || toISO(new Date()),
      paidRef: ref || "", paidMethod: method || "PayNow" }));
    const amt = approvedTotal(c);
    setLedger(l => [{ id: nid(), who: tName(c.trainer), what: `Expense reimbursement · ${c.ref}`,
      amt: -amt, method: method || "PayNow", status: "paid",
      date: date || toISO(new Date()), d: "Today" }, ...l]);
    logAudit(`Expense claim paid · ${c.ref} · ${tName(c.trainer)} · $${amt.toFixed(2)} · ${method || "PayNow"}${ref ? ` · ref ${ref}` : ""}`);
    ping(`${c.ref} marked paid — $${amt.toFixed(2)} to ${tName(c.trainer)}`);
  };

  const myClaims = expenseClaims.filter(c => c.trainer === user?.id);
  const pendingClaims = expenseClaims.filter(c => c.status === "submitted");
  const approvedUnpaid = expenseClaims.filter(c => c.status === "approved");
  const owedTo = (tid) => round2(approvedUnpaid.filter(c => c.trainer === tid).reduce((t, c) => t + approvedTotal(c), 0));

  // pending counts drive the admin nav badges (Decision 6 — queues must not pile up silently)
  const pendingCounts = {
    exceptions: exceptionQueue.length,
    refunds: refundQueue.length,
    payments: paymentQueue.length,
    noshows: noShowQueue.length,
    // Both need the admin. An approved-but-unpaid claim is a coach out of pocket,
    // which is exactly the kind of thing that goes quiet and then becomes a grievance.
    expenses: pendingClaims.length + approvedUnpaid.length,
    deletions: deletionRequests.filter(d=>d.status==="pending").length,
  };
  pendingCounts.receipts = pendingCounts.expenses;   // legacy alias
  pendingCounts.schedule = pendingCounts.exceptions;
  pendingCounts.clients  = pendingCounts.noshows;
  /* `payments` was counted on the Money tab's own badge but left out of both
     `manage` and `total` — so a PayNow proof, which is money already in the bank
     and a member waiting on credits, raised no count on the nav and never appeared
     under "Waiting on you". If it was the only thing pending the summary card
     didn't render at all. It is the most time-critical queue of the five. */
  pendingCounts.manage   = pendingCounts.refunds + pendingCounts.expenses + pendingCounts.deletions + pendingCounts.payments;
  pendingCounts.total    = pendingCounts.exceptions + pendingCounts.refunds + pendingCounts.noshows
                         + pendingCounts.expenses + pendingCounts.deletions + pendingCounts.payments;

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
  /* NOTE: no `ignoreId` parameter. An earlier version had one and filtered with
     `b.id !== ignoreId` — but memberBusy items carry no id, so that compared
     `undefined !== undefined`, which is false, and silently discarded EVERY item.
     The function always returned null and the whole check was dead code. The one
     caller that needs to exclude a booking (commitClientMove) filters explicitly. */
  const memberClash = (weekOff, dayIdx, time, dur) => {
    const st = toMin(time), en = st + dur;
    return memberBusy(weekOff, dayIdx).find(b => st < b.end && en > b.start) || null;
  };

  const ptCtx = { sessions, ptBookings, timeOff, shifts };
  // Per-trainer availability at the chosen location: free ranges (summary) + bookable slots.
  const ptByTrainer = useMemo(()=>{
    if (ptLoc==="all" || ptLoc==="other") return [];
    return ptTrainers.map(tid=>{
      // hide any slot that clashes with something the member has already booked —
      // whatever the type, and whichever coach it's with
      const slots = ptSlotsFor(tid, day, ptLoc, travel, ptCtx, locName)
        .filter(sl => !memberClash(bookWeek, sl.day ?? day, sl.time, PT_DUR))
        // clients can never book a slot that has already started (staff backfill
        // goes through bookFor, which deliberately skips this filter)
        .filter(sl => !(bookWeek === 0 && day === TODAY &&
          toMin(sl.time) <= new Date().getHours() * 60 + new Date().getMinutes()));
      const { ranges, gaps } = ptRangesFor(tid, day, ptLoc, travel, ptCtx, locName);
      const working = !!workWindow(shifts, tid, day);
      return { trainer:tid, slots, ranges, gaps, working };
    });
    // bookWeek / myClassBookings / myCamps are in here because the member-clash
    // check reads them — without them the slot list goes stale after a booking
  },[day,ptLoc,ptTrainers,myPT,locations,travel,sessions,ptBookings,timeOff,shifts,
     bookWeek,myClassBookings,myCamps,bookWeeks,camps]);

  /* ---- notifications ----
     Derived from live state (see lib/notifications.js) so an item can't outlive
     the thing it describes. Only the read-set is stored. */
  const [readNotifs, setReadNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = useMemo(() => {
    if (!user) return [];
    /* staff-change notices come first — a booking made or moved on your behalf is
       the thing you most need to see */
    const mine = user.role === "client"
      ? clientNotices.filter(n => n.who === user.name || n.who === firstNameOf(user.name))
          .map(n => ({ id: `cn-${n.id}`, tone: "accent", title: "Booking update", body: `${n.text} · ${n.when}`, action: { tab: "book" } }))
      : staffNotices.filter(n => user.role === "admin" ? n.target === "admin" : n.target === user.id)
          .map(n => ({ id: `sn-${n.id}`, tone: "accent", title: "Schedule change", body: `${n.text} · ${n.when}`,
            action: { tab: user.role === "admin" ? "schedule" : "schedule" } }));
    return [...mine, ...buildNotifications({
      role: user.role, user, myPT, myClassBookings, sessions, bookWeeks, routines,
      credits, refundables, exceptionQueue, refundQueue, noShowQueue, expenseClaims,
      leads, camps, myCamps, ptBookings, referralReward,
      tName, locName, dateFor, sessTrainers,
    })];
  }, [user, myPT, myClassBookings, sessions, bookWeeks, routines, credits, refundables,
      exceptionQueue, refundQueue, noShowQueue, expenseClaims, leads, camps, myCamps,
      ptBookings, referralReward, trainers, locations, clientNotices, staffNotices]);
  const unreadNotifs = notifications.filter(n => !readNotifs.includes(n.id)).length;
  const markAllNotifsRead = () => setReadNotifs(notifications.map(n => n.id));
  // Tapping a notification must land on the thing itself, not just open a tab.
  const openNotification = (n) => {
    setReadNotifs(r => r.includes(n.id) ? r : [...r, n.id]);
    track(EVENTS.NOTIFICATION_OPEN, { kind:n.tone });
    setNotifOpen(false);
    const a = n.action || {};
    if (a.tab) setTab(a.tab);
    if (a.seg) setSeg(a.seg);
    if (a.adminSec) setAdminSec(a.adminSec);
    if (a.logView) setLogView(a.logView);
  };

  const staffSessions = (tid)=>sessions.filter(s=>sessTrainers(s).includes(tid));
  const staffTimeOff = (tid)=>timeOff.filter(t=>t.trainer===tid && t.active!==false);
  const revenue = ledger.filter(l=>l.status==="paid").reduce((a,b)=>a+Math.max(0,b.amt),0);

  const isClient = user?.role==="client";
  const isAdmin  = user?.role==="admin";
  const navItems = isClient
    ? [["home","Home"],["book","Book"],["log","Log"],["shop","Shop"],["account","Account"]]
    : isAdmin
    ? [["today","Today"],["schedule","Schedule"],["clients","Clients"],["reports","Reports"],["manage","Manage"]]
    : [["today","Today"],["schedule","Schedule"],["clients","Clients"],["me","Me"]];

  const store = {
    expenseClaims, setExpenseClaims, claimEditor, setClaimEditor, claimReview, setClaimReview,
    newClaim, updateClaim, deleteClaim, submitClaim, withdrawClaim, toggleClaimLine,
    decideClaim, markClaimPaid, myClaims, pendingClaims, approvedUnpaid, owedTo, claimById,
    eventSheet, setEventSheet, moveBooking, previewMove, lastMove, undoMove,
    bookingDetail, setBookingDetail, classBuilder, setClassBuilder, openClassBuilder, saveClass, cancelSession, restoreSession, showCancelled, setShowCancelled, legalSheet, setLegalSheet, deletionRequests, requestDeletion, resolveDeletion, checkedIn, checkIn, copyText, deactivateTrainer, reactivateTrainer, applyTemplate, productForm, setProductForm, addProduct, reportView, setReportView, intakeRecords, saveIntake, sessionLog, addSessionLog, groupPacks, setGroupPacks, clientNotices, notifyClient, staffNotices, notifyStaff, clients, setClients, clientGroups, setClientGroups, clientById, groupByName, addClient, createGroup, updateGroup, deleteGroup, importClientsCsv, logGroupSession, editClient, myGroup, myGroupPack, intakeView, setIntakeView, MANUAL_PAYNOW, paymentQueue, submitPaymentProof, resolvePayment, paynowConfig, setPaynowConfig, setLeadStatus, openLeads, closedLeads, LEAD_OPEN, logout, sendOtp, verifyOtp, memberBusy, memberClash, enquiry, setEnquiry, openEnquiry, submitEnquiry,
    notifications, unreadNotifs, notifOpen, setNotifOpen, readNotifs, markAllNotifsRead, openNotification,
    addRefundable, bookPay, exceptionQueue, exceptionSheet, justBooked, optInAt, pendingCounts, policy, refundQueue, refundables, reminderChannel, requestException, requestRefund, resolveException, resolveRefund, setBookPay, setExceptionQueue, setExceptionSheet, setJustBooked, setOptInAt, setPolicy, setRefundQueue, setRefundables, setReminderChannel, windowFor,
    ACCOUNTS, aboutCopy, aboutEdit, active, addCustomExercise, addExerciseToActive, addLead, addLocation, addSet, addTimeOff, addTrainer, adminSec, anyOverlay, applyCoupon, audit, backRef, bioEdit, bookDates, bookFor, bookWeek, bookWeeks, booked, calDay, calSpan, calTrainer, calWeek, campBuilder, campOpenId, campSheet, camps, cancelCamp, cancelClass, cancelHrs, cancelPT, chatInput, chatMsgs, chatOpen, classPass, classTemplates, clientMove, closeOverlays, commitClientMove, confirmBook, confirmCampBuy, confirmShopBuy, coupon, couponForm, couponMsg, couponValue, coupons, credits, customEx, cycleType, day, daySessions, doneSheet, exLib, exPicker, exSearch, finishWorkout, goal, hoursUntil, intakeForm, isAdmin, isClient, joinWaitlist, leads, ledger, loc, locName, locations, logAudit, logOpen, logView, login, logs, mark, markAll, marketingOptIn, measForm, measurements, moveDay, moveSheet, myCalDay, myCamps, myClassBookings, myPT, mySpan, myView, myWaitlist, myWeek, navItems, newLocName, noShowQueue, noteSheet, offerSheet, offers, otherPlace, payMode, perm, permOpen, ping, plate, prToast, products, progEx, progMetric, promoteSuggested, ptBookings, ptByTrainer, ptCtx, ptLoc, ptPool, ptTrainers, rates, ratings, referralCode, referralReward, referralUses, removeExercise, removeSet, removeTimeOff, repeatLog, resolveNoShow, rest, revenue, rosterOpen, routineSheet, routines, schedView, seg, sessions, setAboutCopy, setAboutEdit, setActive, setAddLead, setAddTrainer, setAdminSec, setAudit, setBioEdit, setBookDates, setBookFor, setBookWeek, setBookWeeks, setCalDay, setCalSpan, setCalTrainer, setCalWeek, setCampBuilder, setCampOpenId, setCampSheet, setCamps, activeChatThread, adminInboxOpen, chatThreads, setActiveChatThread, setAdminInboxOpen, setChatInput, setChatMsgs, setChatOpen, setChatThreads, setClassPass, setClassTemplates, setClientMove, setCoupon, setCouponForm, setCouponMsg, setCoupons, setCredits, setCustomEx, setDay, setDoneSheet, setExLib, setExPicker, setExSearch, setGoal, setIntakeForm, setLeads, setLedger, setLoc, setLocations, setLogOpen, setLogView, setLogs, gymHoursStart, gymHoursEnd, setGymHoursStart, setGymHoursEnd, menuConfig, setMenuConfig, setMarketingOptIn, setMeasForm, setMeasurements, setMoveDay, setMoveSheet, setMyCalDay, setMyCamps, setMyClassBookings, setMyPT, setMySpan, setMyView, setMyWaitlist, setMyWeek, setNewLocName, setNoShowQueue, setNoteSheet, setOfferSheet, setOffers, setOtherPlace, setPayMode, setPerm, setPermOpen, setPlate, setPrToast, setProducts, setProgEx, setProgMetric, setPtBookings, setPtLoc, setPtTrainers, setRates, setRatings, setReferralReward, setReferralUses, setRest, setRosterOpen, setRoutineSheet, setRoutines, setSchedView, setSeg, setSessions, setSheet, setShiftEditor, setShifts, setShopSheet, setShopTab, setSuggestedLocs, setTab, setTemplateBuilder, setTimeOff, setTimeOffSheet, setToast, setTrainers, setTravel, setUser, setWalkSheet, sheet, shiftEditor, shifts, shopSheet, shopTab, staffSessions, staffTimeOff, startBlank, startCamp, startFromRoutine, suggestedLocs, tName, tab, templateBuilder, timeOff, timeOffSheet, toast, toggleSetDone, trainers, travel, updSet, user, walkSheet };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

