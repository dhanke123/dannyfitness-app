/* IntakeFormSheet — full digitisation of the paper "Client Information" intake form.
 *
 * Mirrors the 2-page PDF the coaches use today:
 *   1 Personal Details        — contact, DOB, emergency
 *   2 Body Analysis           — height/weight/BMI/body-fat readings from the scale
 *   3 Body Health Analysis    — goals ×3, meals, habits (Y/N), medical free-text
 *   4 Fitness Assessment      — timed exercise scores + body-part ratings 1-10
 *   5 Remarks & Plan          — preferred days, frequency, training plan, policy agreement
 *
 * Coach-filled (staff only). Each save is a NEW dated record; earlier records are
 * kept — the history is the point. Visible to admin, head coach and all coaches
 * from Clients; clients do not see it (decision: staff-only history).
 */

import { useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { T, disp } from "../theme.js";
import { Btn, Select } from "../ui/kit.jsx";

const SECTIONS = ["Personal", "Body", "Health", "Assessment", "Plan"];

const ASSESS_EXERCISES = [
  ["bearCrawl","Bear crawl"],["pushUps","Push ups"],["shoulderTap","Shoulder tap"],
  ["plank","Plank"],["mountainClimber","Mountain climber"],["squats","Squats"],
  ["sumoSquat","Sumo squat"],["wallSeat","Wall seat"],["lunges","Lunges"],
  ["stationaryLunges","Stationary lunges"],["lungeHold","Lunge hold"],["superman","Superman"],
  ["supermanL","Superman alt raise (L)"],["supermanR","Superman alt raise (R)"],
  ["legRaises","Leg raises"],["legRaiseHold","Leg raise hold"],["flutterLeg","Flutter leg"],
  ["scissorKicks","Scissor kicks"],["sitUp","Sit up"],["sidePlank","Side plank"],
  ["burpees","Burpees"],["cardio","Cardio"],
];
const RATED_PARTS = [["rArms","Arms"],["rCore","Core"],["rAbs","Abs"],["rBack","Back"],["rCardio","Cardio"],["rLegs","Legs"]];
const YN = [
  ["fruitsVeg","Eats fruits & vegetables daily?"],
  ["alcohol","Drinks alcohol?"],
  ["smoke","Smokes?"],
  ["exercise","Does exercise currently?"],
  ["dietRestrict","Any dietary restrictions?"],
];

/* Module-scope helpers: STABLE component identity. Defining these inside the
   component gives them a new identity every render, which makes React unmount
   and remount the subtree — the focused input disappears on every keystroke
   and the phone keyboard collapses. Never define components inside components. */
const field = { width:"100%", padding:"8px 10px", borderRadius:10, fontSize:14,
  border:`1.5px solid ${T.line}`, background:T.card, color:T.ink, outline:"none" };
const lab = { fontSize:10, fontWeight:700, color:T.muted, marginBottom:2, display:"block" };
const Input = ({f, set, k, ph, type="text", half}) => (
  <div style={half?{flex:1,minWidth:0}:{}}>
    <input value={f[k]||""} onChange={e=>set(k, e.target.value)} placeholder={ph} type={type} style={field}/>
  </div>);
const L = ({t, children}) => (<div className="mb-2"><span style={lab}>{t}</span>{children}</div>);
const Row = ({children}) => <div className="flex gap-2 mb-2">{children}</div>;
const YNBtn = ({f, set, k}) => (
  <div className="flex gap-1">
    {["Yes","No"].map(v=>(
      <button key={v} onClick={()=>set(k, v)}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
        style={{background:f[k]===v?T.ink:"transparent", color:f[k]===v?T.paper:T.ink,
          border:`1.5px solid ${f[k]===v?T.ink:T.line}`}}>{v}</button>))}
  </div>);

export default function IntakeFormSheet() {
  const { intakeForm, setIntakeForm, saveIntake, trainers, locations, user, tName } = useApp();
  const [sec, setSec] = useState(0);
  if (!intakeForm) return null;
  const f = intakeForm;
  const set = (k, v) => setIntakeForm(x => ({ ...x, [k]: v }));

  /* completeness: goals + name minimum for a saveable record */
  const canSave = !!(f.who && (f.goals || "").trim());

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}}
      onClick={()=>setIntakeForm(null)}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col" style={{background:T.paper, height:"92dvh"}}
        onClick={e=>e.stopPropagation()}>

        {/* header + section rail */}
        <div className="px-5 pt-4 pb-2 shrink-0" style={{borderBottom:`1.5px solid ${T.line}`}}>
          <div className="flex items-center justify-between">
            <div style={{...disp,fontWeight:700,fontSize:20}}>Client intake · {f.who}</div>
            <button onClick={()=>setIntakeForm(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
              style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
          </div>
          <div className="text-[11px] mb-2" style={{color:T.muted}}>
            Digitised intake form · saved as a dated record · staff-only history
          </div>
          <div className="flex gap-1">
            {SECTIONS.map((s,i)=>(
              <button key={s} onClick={()=>setSec(i)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-bold"
                style={{background:sec===i?T.ink:"transparent", color:sec===i?T.paper:T.muted,
                  border:`1.5px solid ${sec===i?T.ink:T.line}`}}>{s}</button>))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">

          {/* ---------- 1 · PERSONAL ---------- */}
          {sec===0 && (<>
            <Row>
              <L t="COACH"><Select value={f.coach||user?.id||""} onChange={v=>set("coach",v)}
                options={trainers.map(t=>[t.id,t.name])}/></L>
              <L t="VENUE"><Select value={f.venue||""} onChange={v=>set("venue",v)}
                options={[["","Pick venue…"],...locations.map(l=>[l.id,l.name])]}/></L>
            </Row>
            <Row><Input f={f} set={set} k="dob" ph="DOB (e.g. 12 Mar 1990)" half/>
              <L t=""><Select value={f.gender||""} onChange={v=>set("gender",v)}
                options={[["","Gender…"],["F","Female"],["M","Male"],["-","Prefer not to say"]]}/></L></Row>
            <L t="ADDRESS"><Input f={f} set={set} k="address" ph="Home address"/></L>
            <Row><Input f={f} set={set} k="contact" ph="Mobile" half/><Input f={f} set={set} k="emergency" ph="Emergency contact" half/></Row>
            <Row><Input f={f} set={set} k="email" ph="Email" half/><Input f={f} set={set} k="occupation" ph="Occupation" half/></Row>
          </>)}

          {/* ---------- 2 · BODY ANALYSIS ---------- */}
          {sec===1 && (<>
            <div className="text-[11px] mb-2" style={{color:T.muted}}>Readings from the body-composition scale.</div>
            <Row><Input f={f} set={set} k="age" ph="Age" half/><Input f={f} set={set} k="height" ph="Height (cm)" half/><Input f={f} set={set} k="weight" ph="Weight (kg)" half/></Row>
            <Row><Input f={f} set={set} k="bmi" ph="BMI" half/><Input f={f} set={set} k="kgToLose" ph="KG to lose" half/><Input f={f} set={set} k="idealWeight" ph="Ideal weight" half/></Row>
            <Row><Input f={f} set={set} k="bodyFat" ph="Body fat %" half/><Input f={f} set={set} k="visceralFat" ph="Visceral fat rating" half/></Row>
            <Row><Input f={f} set={set} k="skeletalMuscle" ph="Skeletal muscle mass" half/><Input f={f} set={set} k="restingMetab" ph="Resting metabolism" half/></Row>
            <Row><Input f={f} set={set} k="metabolicAge" ph="Metabolic / body age" half/></Row>
            <Row><Input f={f} set={set} k="bedTime" ph="Bed time" half/><Input f={f} set={set} k="wakeTime" ph="Wake time" half/></Row>
          </>)}

          {/* ---------- 3 · HEALTH ---------- */}
          {sec===2 && (<>
            <L t="1 · HEALTH GOALS — WHAT DO THEY WANT TO ACHIEVE?">
              <textarea value={f.goals||""} onChange={e=>set("goals",e.target.value)} rows={2} style={{...field,resize:"none"}}/></L>
            <L t="2 · WHAT HAVE THEY TRIED BEFORE?">
              <textarea value={f.triedBefore||""} onChange={e=>set("triedBefore",e.target.value)} rows={2} style={{...field,resize:"none"}}/></L>
            <L t="3 · WHY CHANGE NOW?">
              <textarea value={f.whyNow||""} onChange={e=>set("whyNow",e.target.value)} rows={2} style={{...field,resize:"none"}}/></L>
            <div style={lab}>TYPICAL MEALS &amp; TIMES</div>
            <Row><Input f={f} set={set} k="breakfast" ph="Breakfast + time" half/><Input f={f} set={set} k="lunch" ph="Lunch + time" half/></Row>
            <Row><Input f={f} set={set} k="dinner" ph="Dinner + time" half/><Input f={f} set={set} k="supper" ph="Supper + time" half/></Row>
            <Row><Input f={f} set={set} k="snacking" ph="Snacking habit?" half/><Input f={f} set={set} k="socialGathering" ph="Social gatherings?" half/></Row>
            {YN.map(([k,q])=>(
              <div key={k} className="flex items-center justify-between py-1.5" style={{borderBottom:`1px solid ${T.line}`}}>
                <span className="text-xs">{q}</span><YNBtn f={f} set={set} k={k}/>
              </div>))}
            <div className="mt-2"/>
            <Row><Input f={f} set={set} k="exerciseFreq" ph="Exercise — how often?" half/><Input f={f} set={set} k="water" ph="Water per day (L / cups)" half/></Row>
            <L t="VITAMINS / SUPPLEMENTS"><Input f={f} set={set} k="supplements" ph="Please specify"/></L>
            <L t="ALLERGIES"><Input f={f} set={set} k="allergies" ph="Any allergies"/></L>
            <L t="GASTRIC / CONSTIPATION"><Input f={f} set={set} k="gastric" ph="How serious?"/></L>
            <L t="LONG-TERM MEDICATION"><Input f={f} set={set} k="medication" ph="What are they for?"/></L>
            <L t="PAST INJURIES / ACHES & PAINS">
              <textarea value={f.injuries||""} onChange={e=>set("injuries",e.target.value)} rows={2} style={{...field,resize:"none"}}/></L>
          </>)}

          {/* ---------- 4 · ASSESSMENT ---------- */}
          {sec===3 && (<>
            <L t="TEST DURATION">
              <div className="flex gap-1.5">
                {["30 secs","45 secs","1 min"].map(d=>(
                  <button key={d} onClick={()=>set("assessDur",d)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                    style={{background:f.assessDur===d?T.ink:"transparent", color:f.assessDur===d?T.paper:T.ink,
                      border:`1.5px solid ${f.assessDur===d?T.ink:T.line}`}}>{d}</button>))}
              </div></L>
            <div style={lab}>REPS / HOLD PER EXERCISE</div>
            <div className="grid grid-cols-2 gap-x-2">
              {ASSESS_EXERCISES.map(([k,label])=>(
                <div key={k} className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px] flex-1 truncate">{label}</span>
                  <input value={f[k]||""} onChange={e=>set(k,e.target.value)}
                    style={{...field, width:52, padding:"5px 6px", textAlign:"center", fontSize:12}}/>
                </div>))}
            </div>
            <div style={{...lab, marginTop:8}}>RATINGS · 1-2 improve · 3-5 fair · 6-8 good · 9-10 excellent</div>
            {RATED_PARTS.map(([k,label])=>(
              <div key={k} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs" style={{width:52}}>{label}</span>
                <div className="flex gap-0.5 flex-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                    <button key={n} onClick={()=>set(k,n)}
                      className="flex-1 py-1 rounded text-[10px] font-bold"
                      style={{background:f[k]===n?T.accent:T.card, color:f[k]===n?"#fff":T.muted,
                        border:`1px solid ${f[k]===n?T.accent:T.line}`}}>{n}</button>))}
                </div>
              </div>))}
            <Row><Input f={f} set={set} k="mobility" ph="Mobility notes" half/><Input f={f} set={set} k="flexibility" ph="Flexibility notes" half/></Row>
            <div className="text-[11px] rounded-lg p-2 mt-1" style={{background:"#FBF3EC", color:T.muted}}>
              📷 Take 3 photos: ¾ front · ¾ right side · close-up face (white backdrop).
              Attach via the client's Measurements photos for now.
            </div>
          </>)}

          {/* ---------- 5 · PLAN ---------- */}
          {sec===4 && (<>
            <L t="PREFERRED TRAINING DAYS & TIMES"><Input f={f} set={set} k="preferredTimes" ph="e.g. Mon / Wed / Fri mornings"/></L>
            <L t="TRAINING FREQUENCY"><Input f={f} set={set} k="frequency" ph="e.g. 3× a week"/></L>
            <L t="TRAINING PLAN">
              <textarea value={f.trainingPlan||""} onChange={e=>set("trainingPlan",e.target.value)} rows={3}
                placeholder="Programme outline for this client" style={{...field,resize:"none"}}/></L>
            <L t="OTHER NOTES">
              <textarea value={f.notes||""} onChange={e=>set("notes",e.target.value)} rows={2} style={{...field,resize:"none"}}/></L>
            <label className="flex items-start gap-2 mt-1 cursor-pointer">
              <input type="checkbox" checked={!!f.policyAgreed} onChange={e=>set("policyAgreed",e.target.checked)} className="mt-0.5"/>
              <span className="text-[11px]" style={{color:T.muted}}>
                Client agrees: cancellations require 24h notice or the session is forfeited; all fees are non-refundable.
              </span>
            </label>
          </>)}
        </div>

        {/* footer */}
        <div className="px-5 py-3 shrink-0 flex gap-2" style={{borderTop:`1.5px solid ${T.line}`, paddingBottom:"max(12px, env(safe-area-inset-bottom))"}}>
          {sec>0 && <Btn small kind="ghost" onClick={()=>setSec(s=>s-1)}>‹ Back</Btn>}
          {sec<SECTIONS.length-1
            ? <Btn small full onClick={()=>setSec(s=>s+1)}>Next · {SECTIONS[sec+1]} ›</Btn>
            : <Btn small full disabled={!canSave} onClick={()=>saveIntake(f)}>
                {canSave ? "Save intake record" : "Add at least the health goals"}</Btn>}
        </div>
      </div>
    </div>);
}
