/* Exercise library + all training-log maths: PRs, 1RM, volume, kcal. */

// Cardio / activity types for the "Log activity" sheet. `dist` = whether a distance field applies.
export const ACTIVITIES = [
  { name:"Run", dist:true }, { name:"Cycle", dist:true }, { name:"Swim", dist:true },
  { name:"Walk / Hike", dist:true }, { name:"Row", dist:true }, { name:"Sports", dist:false },
  { name:"Muay Thai", dist:false }, { name:"Yoga / Mobility", dist:false }, { name:"Other", dist:false },
];

export const EXLIB = {
  Legs: ["Back Squat","Deadlift","Leg Press","Walking Lunge","Romanian Deadlift","Leg Curl"],
  Back: ["Pull-up","Bent-over Row","Lat Pulldown","Seated Row"],
  Shoulder: ["Overhead Press","Lateral Raise","Face Pull"],
  Chest: ["Bench Press","Incline DB Press","Push-up","Cable Fly"],
  Core: ["Hanging Leg Raise","Plank","Cable Woodchop"],
};

// Per-exercise metadata: is it a barbell lift (plate calculator) + default rest seconds.
export const EXMETA = {
  "Back Squat":{bar:true,rest:150}, "Deadlift":{bar:true,rest:180}, "Romanian Deadlift":{bar:true,rest:120},
  "Bench Press":{bar:true,rest:150}, "Overhead Press":{bar:true,rest:120}, "Bent-over Row":{bar:true,rest:120},
  "Front Squat":{bar:true,rest:150},
};

export const exMeta = (name) => EXMETA[name] || { bar:false, rest:75 };

export const muscleOf = (name) => Object.entries(EXLIB).find(([,arr])=>arr.includes(name))?.[0] || "Other";

export const BAR_KG = 20;

export const PLATES = [25,20,15,10,5,2.5,1.25]; // kg plates available per side

// Epley estimated 1RM from a single set.
export const est1RM = (w, reps) => reps>0 ? Math.round(w*(1+reps/30)*10)/10 : w;

// Working sets only (warmup & failure never count toward PRs / charts).
export const isWorking = (st) => st.type!=="warmup" && st.type!=="failure";

/* ---------- workout-log analytics (Strong-style) ---------- */
export const SET_TYPES = { normal:{lbl:"N",name:"Normal",color:"#17150F"}, warmup:{lbl:"W",name:"Warm-up",color:"#B8860B"},
  dropset:{lbl:"D",name:"Drop set",color:"#7B4B94"}, failure:{lbl:"F",name:"Failure",color:"#E8500A"} };

export const strengthLogs = (logs) => logs.filter(l=>l.exercises);

export const flatWorking = (log) => (log.exercises||[]).flatMap(e=>e.sets.filter(isWorking).map(s=>({...s, ex:e.ex, muscle:e.muscle})));

export const bestWeight = (logs, ex) => Math.max(0, ...strengthLogs(logs).flatMap(l=>flatWorking(l).filter(s=>s.ex===ex).map(s=>s.w)));

export const best1RM = (logs, ex) => Math.max(0, ...strengthLogs(logs).flatMap(l=>flatWorking(l).filter(s=>s.ex===ex).map(s=>est1RM(s.w,s.reps))));

// PR shelf: heaviest set ever per exercise, sorted by weight.
export const prShelf = (logs) => {
  const best = {};
  strengthLogs(logs).forEach(l=>flatWorking(l).forEach(s=>{ if(s.w>(best[s.ex]?.w??-1)) best[s.ex]={w:s.w,reps:s.reps,d:l.d}; }));
  return Object.entries(best).sort((a,b)=>b[1].w-a[1].w);
};

// est-1RM series for one exercise, oldest→newest, for the trend chart.
export const exSeries = (logs, ex) => strengthLogs(logs).filter(l=>flatWorking(l).some(s=>s.ex===ex))
  .slice().sort((a,b)=>(b.daysAgo??0)-(a.daysAgo??0))
  .map(l=>{ const sets=flatWorking(l).filter(s=>s.ex===ex); return { d:l.d, top:Math.max(...sets.map(s=>s.w)), orm:Math.max(...sets.map(s=>est1RM(s.w,s.reps))) }; });

// sets-per-muscle-group within the last `days`.
export const muscleVolume = (logs, days) => {
  const vol = {};
  strengthLogs(logs).filter(l=>(l.daysAgo??0)<=days).forEach(l=>(l.exercises||[]).forEach(e=>{
    const n = e.sets.filter(isWorking).length; vol[e.muscle]=(vol[e.muscle]||0)+n; }));
  return Object.entries(vol).sort((a,b)=>b[1]-a[1]);
};

export const loggedDaySet = (logs) => new Set(logs.filter(l=>l.exercises||l.kind==="cardio").map(l=>l.daysAgo??0));

/* ---------- calorie estimates (MET-based; clearly "est") ---------- */
export const MET = { "Run":9.8,"Cycle":7.5,"Swim":8,"Walk / Hike":3.8,"Row":7,"Sports":7,"Muay Thai":10,"Yoga / Mobility":3,"Other":5 };

export const workingSetCount = (log) => (log.exercises||[]).reduce((a,e)=>a+e.sets.filter(isWorking).length,0);

// strength: est ~3 min/working-set at ~5 MET; cardio: MET × bodyweight × hours.
export const estKcalStrength = (log, kg) => Math.round(5 * kg * (workingSetCount(log)*3/60));

export const estKcalCardio = (mins, activity, kg) => Math.round((MET[activity]||5) * kg * ((mins||0)/60));

export const estKcal = (log, kg) => log.exercises ? estKcalStrength(log,kg) : (log.mins ? estKcalCardio(log.mins, log.activity, kg) : null);

export const estKcalRoutine = (r, kg) => Math.round(5 * kg * (r.items.reduce((a,i)=>a+(+i.sets||0),0)*3/60));
