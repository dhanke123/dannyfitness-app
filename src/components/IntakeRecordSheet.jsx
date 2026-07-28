/* IntakeRecordSheet — reading a saved intake back.
 *
 * The form captured ~80 fields; the client card showed eight of them and the export
 * shipped six. Everything else — the whole body-composition panel, the 22-exercise
 * assessment, the six ratings, medication, allergies — went in and never came out.
 * A record you cannot read is a form the coach stops bothering to fill in.
 *
 * Read-only by design (Decision 23: every save is a new dated record, never
 * overwritten). Correcting history in place would mean the thing approved isn't the
 * thing recorded, and the point of keeping re-assessments is to see what changed.
 * "Re-assess" is the way forward instead: it opens a NEW record pre-filled from this
 * one, so the coach retypes only what moved.
 *
 * Same section order as the paper form and the same order as the Word export, so a
 * coach reading the screen, the printout and the spreadsheet sees one document.
 */

import { useApp } from "../state/AppState.jsx";
import { T, disp } from "../theme.js";
import { Btn } from "../ui/kit.jsx";
import {
  INTAKE_SECTIONS, buildIntakeCsv, buildIntakeDoc, downloadBlob,
  intakeValue, printIntakePdf, sectionFilled, slug,
} from "../lib/intake.js";

export default function IntakeRecordSheet() {
  const { intakeView, setIntakeView, intakeRecords, setIntakeForm, tName, locName, ping, user } = useApp();
  if (!intakeView) return null;

  const rec = intakeRecords.find(r => r.id === intakeView.id);
  if (!rec) return null;

  /* Records store ids for coach and venue. "danny" and "CDS" are fine in a database
     and useless in a handover document — resolve to names everywhere they're shown. */
  const resolve = (kind, v) => kind === "trainer" ? tName(v) : kind === "location" ? locName(v) : v;
  const mine = intakeRecords.filter(r => r.who === rec.who);
  const idx = mine.findIndex(r => r.id === rec.id);   // 0 = newest

  const exportDoc = () => {
    downloadBlob(`intake-${slug(rec.who)}-${slug(rec.d)}.doc`,
      buildIntakeDoc(rec, { client: rec.who, coachName: tName(rec.by), resolve }),
      "application/msword");
    ping("Word document downloaded — same layout as the paper form");
  };

  /* Same document as the Word export, rendered through the browser's own print
     pipeline. A popup blocker is the one failure mode, and it has to be said out
     loud — a coach who thinks a PDF was produced won't check. */
  const exportPdf = () => {
    const ok = printIntakePdf(rec, { client: rec.who, coachName: tName(rec.by), resolve });
    ping(ok ? "Opened for printing — choose Save as PDF"
            : "Your browser blocked the print window. Allow pop-ups for this site and try again.");
  };

  const exportCsv = () => {
    const csv = buildIntakeCsv(mine, { resolve });
    if (!csv) { ping("Nothing to export yet"); return; }
    downloadBlob(`intake-${slug(rec.who)}-all-assessments.csv`, csv, "text/csv;charset=utf-8");
    ping(`${mine.length} assessment${mine.length===1?"":"s"} exported — oldest first, ready to chart`);
  };

  /* Re-assess: a new dated record that starts where the last one finished. The
     assessment scores and the one-off narrative answers are deliberately NOT carried
     over — the numbers are the measurement, and pre-filling them invites a coach to
     leave last quarter's figures in place. */
  const reassess = () => {
    const carry = ["who","coach","venue","dob","gender","address","contact","emergency","email",
      "occupation","height","goals","allergies","medication","injuries","gastric","supplements",
      "dietRestrict","preferredTimes","frequency"];
    const seed = { who: rec.who };
    carry.forEach(k => { if (rec[k] != null && rec[k] !== "") seed[k] = rec[k]; });
    seed.coach = user?.id || rec.coach;
    setIntakeView(null);
    setIntakeForm(seed);
    ping("New assessment started — carried over the details that don't change");
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}}
      onClick={()=>setIntakeView(null)}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col" style={{background:T.paper, height:"92dvh"}}
        onClick={e=>e.stopPropagation()}>

        <div className="px-5 pt-4 pb-3 shrink-0" style={{borderBottom:`1.5px solid ${T.line}`}}>
          <div className="flex items-start justify-between">
            <div>
              <div style={{...disp,fontWeight:700,fontSize:20}}>{rec.who}</div>
              <div className="text-[11px]" style={{color:T.muted}}>
                {rec.d} · recorded by {tName(rec.by)}
                {idx === 0 ? " · latest" : ` · ${idx} newer record${idx===1?"":"s"} since`}
              </div>
            </div>
            <button onClick={()=>setIntakeView(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
              style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
          </div>
          <div className="flex gap-1.5 mt-2.5">
            <Btn small kind="ghost" onClick={exportPdf}>📕 PDF</Btn>
            <Btn small kind="ghost" onClick={exportDoc}>📄 Word</Btn>
            <Btn small kind="ghost" onClick={exportCsv}>📊 Excel</Btn>
            <Btn small onClick={reassess}>Re-assess</Btn>
          </div>
          <div className="text-[10px] mt-1.5" style={{color:T.muted}}>
            PDF and Word are this one assessment, laid out like the paper form.
            Excel is every assessment, one row each, for the trend.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {INTAKE_SECTIONS.map(s => {
            /* An empty row in a health record reads as a measured zero. Body fat "—"
               and body fat 0 are different claims, so a section nobody filled in says
               so once rather than printing twenty blank labels. */
            if (!sectionFilled(rec, s)) return (
              <div key={s.key} className="mb-3">
                <div className="text-xs font-bold mb-1" style={{color:T.accent}}>{s.title.toUpperCase()}</div>
                <div className="text-xs" style={{color:T.muted}}>Not recorded at this assessment.</div>
              </div>);

            const rows = s.fields
              .map(([k, label]) => [k, label, intakeValue(rec, k, resolve)])
              .filter(([, , v]) => v !== "");

            return (
              <div key={s.key} className="mb-3">
                <div className="text-xs font-bold mb-1.5" style={{color:T.accent}}>{s.title.toUpperCase()}</div>
                <div className="rounded-xl overflow-hidden" style={{border:`1.5px solid ${T.line}`, background:T.card}}>
                  {rows.map(([k, label, v], i) => (
                    <div key={k} className="flex gap-2 px-3 py-1.5"
                      style={{borderTop: i ? `1px solid ${T.line}` : "none"}}>
                      <span className="text-[11px] shrink-0" style={{color:T.muted, width:"46%"}}>{label}</span>
                      <span className="text-xs font-semibold flex-1" style={{whiteSpace:"pre-wrap", minWidth:0}}>{v}</span>
                    </div>))}
                </div>
              </div>);
          })}

          <div className="text-[11px] rounded-lg p-2.5 mb-2" style={{background:"#FBF3EC", color:T.deep}}>
            This is one dated assessment and it is never edited. To record a change, use
            <b> Re-assess</b> — it opens a new record carrying over the details that don't move
            (contact, height, allergies, medication) and leaves the measurements blank for you to take.
          </div>
        </div>
      </div>
    </div>);
}
