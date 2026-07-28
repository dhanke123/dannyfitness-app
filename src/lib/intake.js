/* The intake form, as data.
 *
 * WHY THIS EXISTS: the ~80 fields of the paper "Client Information" form were
 * previously described in four places — the form component, the record summary in
 * Clients, the CSV export, and the paper PDF itself. They had already drifted: the
 * form captured 80 fields, the summary showed 8, and the export shipped 6. A coach
 * filled in a full body-composition panel and a 22-exercise fitness assessment, and
 * none of it could be read back or analysed. The record was write-mostly.
 *
 * So the schema lives here, once. The form renders from it, the read-back view
 * renders from it, the Word document is built from it and the CSV columns are
 * derived from it. Adding a field to the paper form is a one-line change here and
 * it appears in all four.
 *
 * Section order and wording follow `Client information_template.pdf` deliberately —
 * a coach transcribing from paper reads top to bottom, and a column that has moved
 * is a column that gets filled in wrong.
 *
 * `num: true` marks the fields worth trending: they become numeric CSV cells so a
 * chart of weight or body fat over time is a two-click job in Excel, not a
 * find-and-replace. Everything else exports as text.
 */

export const INTAKE_SECTIONS = [
  {
    key: "personal", title: "Personal Details",
    fields: [
      ["coach",        "Coach",             { ref: "trainer" }],
      ["venue",        "Venue",             { ref: "location" }],
      ["dob",          "DOB"],
      ["gender",       "Gender"],
      ["address",      "Address"],
      ["contact",      "Contact"],
      ["emergency",    "Emergency contact"],
      ["email",        "Email"],
      ["occupation",   "Occupation"],
    ],
  },
  {
    key: "body", title: "Body Analysis Details",
    note: "Readings from the body-composition scale.",
    fields: [
      ["age",            "Age",                    { num: true }],
      ["height",         "Height (cm)",            { num: true }],
      ["weight",         "Weight (kg)",            { num: true }],
      ["bmi",            "BMI",                    { num: true }],
      ["kgToLose",       "KG to lose",             { num: true }],
      ["idealWeight",    "Ideal weight",           { num: true }],
      ["bodyFat",        "Body fat %",             { num: true }],
      ["visceralFat",    "Visceral fat rating",    { num: true }],
      ["skeletalMuscle", "Skeletal muscle mass",   { num: true }],
      ["restingMetab",   "Resting metabolism",     { num: true }],
      ["metabolicAge",   "Metabolic / body age",   { num: true }],
      ["bedTime",        "Bed time"],
      ["wakeTime",       "Wake time"],
    ],
  },
  {
    key: "health", title: "Body Health Analysis",
    fields: [
      ["goals",           "1. Health goals — what do they want to achieve?", { long: true }],
      ["triedBefore",     "2. What method have they tried before?",          { long: true }],
      ["whyNow",          "3. Why make a change now?",                       { long: true }],
      ["breakfast",       "Breakfast + time"],
      ["lunch",           "Lunch + time"],
      ["dinner",          "Dinner + time"],
      ["supper",          "Supper + time"],
      ["snacking",        "Snacking habit"],
      ["socialGathering", "Social gatherings"],
      ["fruitsVeg",       "Eats fruits & vegetables daily?",  { yn: true }],
      ["alcohol",         "Drinks alcohol?",                  { yn: true }],
      ["smoke",           "Smokes?",                          { yn: true }],
      ["exercise",        "Does exercise currently?",         { yn: true }],
      ["dietRestrict",    "Any dietary restrictions?",        { yn: true }],
      ["exerciseFreq",    "Exercise — how often?"],
      ["water",           "Water per day"],
      ["supplements",     "Vitamins / supplements"],
      ["allergies",       "Allergies"],
      ["gastric",         "Gastric / constipation"],
      ["medication",      "Long-term medication"],
      ["injuries",        "Past injuries / aches & pains",    { long: true }],
    ],
  },
  {
    key: "assessment", title: "Fitness Assessment",
    note: "Reps or hold per exercise, over the test duration.",
    fields: [
      ["assessDur",         "Test duration"],
      ["bearCrawl",         "Bear crawl",                    { num: true }],
      ["pushUps",           "Push ups",                      { num: true }],
      ["shoulderTap",       "Shoulder tap",                  { num: true }],
      ["plank",             "Plank",                         { num: true }],
      ["mountainClimber",   "Mountain climber",              { num: true }],
      ["squats",            "Squats",                        { num: true }],
      ["sumoSquat",         "Sumo squat",                    { num: true }],
      ["wallSeat",          "Wall seat",                     { num: true }],
      ["lunges",            "Lunges",                        { num: true }],
      ["stationaryLunges",  "Stationary lunges",             { num: true }],
      ["lungeHold",         "Lunge hold",                    { num: true }],
      ["superman",          "Superman",                      { num: true }],
      ["supermanL",         "Superman alt raise (L)",        { num: true }],
      ["supermanR",         "Superman alt raise (R)",        { num: true }],
      ["legRaises",         "Leg raises",                    { num: true }],
      ["legRaiseHold",      "Leg raise hold",                { num: true }],
      ["flutterLeg",        "Flutter leg",                   { num: true }],
      ["scissorKicks",      "Scissor kicks",                 { num: true }],
      ["sitUp",             "Sit up",                        { num: true }],
      ["sidePlank",         "Side plank",                    { num: true }],
      ["burpees",           "Burpees",                       { num: true }],
      ["cardio",            "Cardio",                        { num: true }],
      ["rArms",             "Rating — Arms",                 { num: true, rating: true }],
      ["rCore",             "Rating — Core",                 { num: true, rating: true }],
      ["rAbs",              "Rating — Abs",                  { num: true, rating: true }],
      ["rBack",             "Rating — Back",                 { num: true, rating: true }],
      ["rCardio",           "Rating — Cardio",               { num: true, rating: true }],
      ["rLegs",             "Rating — Legs",                 { num: true, rating: true }],
      ["mobility",          "Mobility"],
      ["flexibility",       "Flexibility"],
    ],
  },
  {
    key: "plan", title: "Remarks & Plan",
    fields: [
      ["preferredTimes", "Preferred training days & times"],
      ["frequency",      "Training frequency"],
      ["trainingPlan",   "Training plan",  { long: true }],
      ["notes",          "Other notes",    { long: true }],
      ["policyAgreed",   "Policy agreed",  { bool: true }],
    ],
  },
];

/* Flat [key, label, opts] across every section, in paper order. */
export const INTAKE_FIELDS = INTAKE_SECTIONS.flatMap(s =>
  s.fields.map(([k, label, opts = {}]) => [k, label, { ...opts, section: s.title }]));

export const intakeLabel = (key) =>
  (INTAKE_FIELDS.find(([k]) => k === key) || [null, key])[1];

/* The fields worth charting — body composition and assessment scores. Used to
   decide which CSV cells are written unquoted so Excel types them as numbers. */
export const INTAKE_NUMERIC = INTAKE_FIELDS.filter(([, , o]) => o.num).map(([k]) => k);

/* Display value for a saved record. `resolve` turns an id into a name (coach,
   venue) — the record stores ids, and "danny" in a Word document handed to a new
   coach is worse than nothing. */
export const intakeValue = (rec, key, resolve) => {
  const [, , opts = {}] = INTAKE_FIELDS.find(([k]) => k === key) || [];
  const raw = rec?.[key];
  if (opts.bool) return raw ? "Yes" : "No";
  if (raw === 0) return "0";
  if (raw == null || raw === "") return "";
  if (opts.ref && resolve) return resolve(opts.ref, raw) || String(raw);
  if (opts.rating) return `${raw} / 10`;
  return String(raw);
};

/* Has this section been filled in at all? Drives "nothing recorded" rather than a
   page of empty labels — an empty row in a handover document reads as a value of
   zero, which for body fat or medication is a different claim entirely. */
export const sectionFilled = (rec, section) =>
  section.fields.some(([k]) => { const v = rec?.[k]; return v != null && v !== "" && v !== false; });

/* -------------------------------------------------------------------- exports */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* A Word document, without a Word library.
 *
 * Word opens an HTML file with an `.doc` extension and the Office XML namespace
 * declarations natively, keeping tables, headings and page breaks. That is worth
 * roughly 200KB of `docx` in a bundle that is already 817KB — this app is used on a
 * phone on Singapore mobile data, and the export is a once-a-quarter action.
 *
 * The layout mirrors `Client information_template.pdf` so a coach can hold the two
 * side by side. `@page` gives it real A4 margins rather than Word's default.
 */
export function buildIntakeDoc(rec, { client, coachName, resolve, forPrint } = {}) {
  const section = (s) => {
    if (!sectionFilled(rec, s)) return "";
    const rows = s.fields
      .map(([k, label]) => [label, intakeValue(rec, k, resolve)])
      .filter(([, v]) => v !== "")
      .map(([label, v]) =>
        `<tr><td class="k">${esc(label)}</td><td class="v">${esc(v).replace(/\n/g, "<br/>")}</td></tr>`)
      .join("");
    return `<h2>${esc(s.title)}</h2><table>${rows}</table>`;
  };

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/><title>Client Information — ${esc(client)}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #241C16; }
  h1 { font-size: 18pt; margin: 0 0 2pt; }
  h2 { font-size: 12pt; margin: 16pt 0 4pt; padding-bottom: 2pt;
       border-bottom: 1pt solid #FF5A3C; color: #FF5A3C; }
  .meta { font-size: 9pt; color: #6B675C; margin-bottom: 10pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4pt; }
  td { border-bottom: 0.5pt solid #EEE7DB; padding: 4pt 6pt; vertical-align: top; }
  td.k { width: 42%; color: #6B675C; font-size: 10pt; }
  td.v { font-weight: 600; }
  .sig { margin-top: 22pt; font-size: 10pt; }
  .foot { margin-top: 14pt; font-size: 8.5pt; color: #6B675C; }
  /* A section must not be split across a page break — half a body-composition
     panel on page 1 and half on page 2 is how a reader misses a row. */
  h2 { page-break-after: avoid; break-after: avoid; }
  table { page-break-inside: avoid; break-inside: avoid; }
  ${forPrint ? `@media print { .noprint { display: none; } }
  .noprint { position: sticky; top: 0; background: #FBF7F0; border-bottom: 1px solid #EEE7DB;
             padding: 10px 0 12px; margin-bottom: 14px; font-size: 10pt; color: #6B675C; }
  .noprint button { font: inherit; font-weight: 700; color: #fff; background: #FF5A3C;
             border: 0; border-radius: 8px; padding: 8px 16px; cursor: pointer; margin-right: 8px; }` : ""}
</style></head>
<body>
  ${forPrint ? `<div class="noprint"><button onclick="window.print()">Save as PDF</button>
    Choose <b>Save as PDF</b> as the destination. Nothing else on this page prints.</div>` : ""}
  <h1>Client Information — ${esc(client)}</h1>
  <div class="meta">Assessment date: ${esc(rec?.d || "—")}
    &nbsp;·&nbsp; Recorded by: ${esc(coachName || "—")}
    &nbsp;·&nbsp; ExerciseOnly</div>
  ${INTAKE_SECTIONS.map(section).join("")}
  <div class="sig">In case of any cancellation, kindly give 24 hours' notice; otherwise the session is
    forfeited. All fees are non-refundable.<br/><br/>
    Agreed and signed: __________________________&nbsp;&nbsp;&nbsp; Date: ______________</div>
  <div class="foot">Exported from the ExerciseOnly app. This is one dated assessment — earlier records
    are kept and are never overwritten.</div>
</body></html>`;
}

/* One row per dated assessment, one column per field, oldest first.
 *
 * Oldest first is the whole point: the reason to open this in Excel is to select a
 * column and see the line go the right way. Newest-first (which is how the app
 * lists them) draws every trend backwards.
 *
 * Numeric fields are written bare so Excel types them as numbers; everything else
 * is quoted. A quoted "74.5" is text, and text does not chart.
 */
export function buildIntakeCsv(records, { resolve } = {}) {
  if (!records?.length) return "";
  const ordered = [...records].reverse();
  const cols = [["d", "Assessment date"], ["who", "Client"], ["by", "Recorded by"],
    ...INTAKE_FIELDS.map(([k, label]) => [k, label])];

  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  // `by` holds a trainer id — resolve it like every other id-bearing column, or the
  // "who took this assessment" column reads "danny" or, worse, empty.
  const meta = (r, k) => q(k === "by" ? (resolve ? resolve("trainer", r.by) : r.by) : r[k]);
  const cell = (rec, key) => {
    const v = intakeValue(rec, key, resolve);
    if (v === "") return "";
    if (INTAKE_NUMERIC.includes(key)) {
      const n = parseFloat(String(v));
      if (Number.isFinite(n)) return String(n);   // unquoted → a real number in Excel
    }
    return q(v);
  };

  return [
    cols.map(([, label]) => q(label)).join(","),
    ...ordered.map(r => cols.map(([k]) =>
      k === "d" || k === "who" || k === "by" ? meta(r, k) : cell(r, k)).join(",")),
  ].join("\n");
}

/* PDF, without a PDF library.
 *
 * The browser already has a very good PDF renderer behind Print → Save as PDF: real
 * text (searchable and selectable, not a bitmap), correct A4 pagination, and the
 * system fonts. jsPDF would add ~350KB to a bundle already at 817KB and produce a
 * worse document — its layout engine can't reflow a table and doesn't hyphenate.
 *
 * Opens the same HTML the Word export uses, so the two can never disagree about
 * what's in the record. Auto-triggers the print dialog, and leaves a button for
 * anyone whose browser blocks the automatic call.
 *
 * Returns false when a popup blocker eats the window — the caller must say so
 * rather than let the coach think a file was produced.
 */
export function printIntakePdf(rec, opts = {}) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildIntakeDoc(rec, { ...opts, forPrint: true }));
  w.document.close();
  w.document.title = `intake-${slug(opts.client)}-${slug(rec?.d)}`;   // becomes the default filename
  w.focus();
  // Give the document a beat to lay out; printing an empty frame is a blank PDF.
  setTimeout(() => { try { w.print(); } catch { /* the button is still there */ } }, 400);
  return true;
}

/* Shared browser download. Kept here so the components stay presentational. */
export function downloadBlob(filename, text, mime) {
  const blob = new Blob(["﻿", text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export const slug = (s) => String(s || "client").toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");
