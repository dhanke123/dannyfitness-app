/* ExerciseOnly brand marks and the Connect row (real links, one source of truth). */

import { T, disp } from "./theme.js";

/* ExerciseOnly logo mark (real asset, inlined) + wordmark */
export const LOGO_URI = "data:image/png;base64,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";

export const LogoMark = ({ size=30 }) => (
  <img src={LOGO_URI} alt="ExerciseOnly" style={{height:size, width:"auto", display:"block"}} />);

export const Wordmark = ({ size=18, onDark=false }) => (
  <span style={{...disp, fontWeight:800, fontSize:size, color:onDark?"#fff":T.ink}}>
    Exercise<span style={{color:T.accent}}>Only</span></span>);

/* social / contact icon link */
export const Social = ({ label, href, color, path, stroke }) => (
  <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label}
    style={{width:44, height:44, borderRadius:14, background:color, display:"grid", placeItems:"center", flex:"none"}}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill={stroke?"none":"#fff"} stroke={stroke?"#fff":"none"}
      strokeWidth={stroke?2:0} strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
  </a>);

// Single source of truth for ExerciseOnly's public contact channels (icons only, real links).
export const CONTACTS = [
  { label:"Instagram", href:"https://instagram.com/exercise.only", color:"#E1306C",
    path:"M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.26 2.2.43.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.2a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z" },
  { label:"Facebook", href:"https://facebook.com/exercise.only", color:"#1877F2",
    path:"M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" },
  { label:"WhatsApp", href:"https://wa.me/6581006608", color:"#25D366",
    path:"M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1-.1.2-.3.2-.6.1-1.6-.8-2.6-1.4-3.7-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3ZM12 3.5A8.5 8.5 0 0 0 4.6 16.3L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z" },
  { label:"Email", href:"mailto:4exerciseonly@gmail.com", color:"#F0812F", stroke:true,
    path:"M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z M3.5 6.5 12 12l8.5-5.5" },
];

/* Same 44px footprint as Social, but a button — it opens the enquiry form rather
   than leaving the app. Sits alongside the social icons because to a prospective
   client it's the same thing: a way to reach ExerciseOnly. */
export const EnquiryIcon = ({ onClick }) => (
  <button onClick={onClick} title="Send an enquiry" aria-label="Send an enquiry"
    style={{width:44, height:44, borderRadius:14, background:T.ink, display:"grid",
            placeItems:"center", flex:"none", border:"none", cursor:"pointer"}}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/>
      <path d="M9 10.5h6M9 13.5h4"/>
    </svg>
  </button>);

/* `onEnquire` is optional so the row still renders where there's no form to open. */
export const ConnectRow = ({ size, onEnquire }) => (
  <div className="flex gap-2.5 justify-center">
    {CONTACTS.map(c=><Social key={c.label} {...c}/>)}
    {onEnquire && <EnquiryIcon onClick={onEnquire}/>}
  </div>);
