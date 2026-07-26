/* Login — phone + 6-digit OTP, with the demo accounts kept behind a flag.

   Two states: "phone" (enter number) and "code" (enter the OTP). The demo logins
   render underneath whenever VITE_DEMO_LOGINS is on, or automatically when there
   is no Supabase config at all, so Danny can always present the app.

   Deliberate choices:
   · A client-side format check before sending — every bad number is a wasted
     Twilio SMS at Danny's expense.
   · A 45s resend cooldown. Supabase rate-limits server-side and returns an ugly
     error; better to show a countdown than to let people hammer it.
   · An explicit "wrong number?" path back to step one, because the alternative is
     people reloading the app and losing the session.
   · Errors are surfaced verbatim-ish, never swallowed. A silent failure on the
     login screen is the worst possible first impression. */

import { useEffect, useRef, useState } from "react";
import { useApp } from "../state/AppState.jsx";
import { ConnectRow, LogoMark } from "../brand.jsx";
import { DEMO_LOGINS, isConfigured } from "../lib/supabase.js";
import { FONTS, T, body, disp } from "../theme.js";

const RESEND_SECONDS = 45;

export default function Login() {
  const { locations, login, sendOtp, verifyOtp } = useApp();

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const send = async () => {
    setErr(null); setBusy(true);
    const res = await sendOtp(phone);
    setBusy(false);
    if (res.ok) { setStep("code"); setCode(""); setCooldown(RESEND_SECONDS); }
    else setErr(res.error);
  };

  const verify = async () => {
    setErr(null); setBusy(true);
    const res = await verifyOtp(phone, code);
    setBusy(false);
    if (!res.ok) { setErr(res.error); setCode(""); codeRef.current?.focus(); }
    // on success the auth listener swaps the screen out from under us
  };

  const restart = () => { setStep("phone"); setCode(""); setErr(null); setCooldown(0); };

  const field = {
    ...body, width: "100%", padding: "14px 16px", borderRadius: 14,
    border: `1.5px solid ${T.line}`, background: T.card, color: T.ink,
    fontSize: 17, outline: "none",
  };
  const primary = (disabled) => ({
    ...body, width: "100%", padding: "14px 20px", borderRadius: 14, fontWeight: 700,
    fontSize: 15, border: "none", cursor: disabled ? "default" : "pointer",
    background: disabled ? T.line : T.accent, color: disabled ? T.muted : "#fff",
  });

  return (
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

        <div className="flex-1 px-6 pt-6 pb-8">
          {isConfigured && (<>
            {step === "phone" ? (<>
              <div style={{...disp, fontWeight:700, letterSpacing:".04em", fontSize:11, color:T.muted}} className="mb-2">SIGN IN OR JOIN</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>
                We'll send you a 6-digit code. No password to remember — and if you're new, this creates your account.</div>
              <div className="flex items-center gap-2 mb-2">
                <div style={{...field, width:64, textAlign:"center", flex:"none", color:T.muted}}>+65</div>
                <input value={phone} inputMode="tel" autoComplete="tel" placeholder="9123 4567"
                  onChange={(e)=>{ setPhone(e.target.value); setErr(null); }}
                  onKeyDown={(e)=>{ if(e.key==="Enter" && phone && !busy) send(); }}
                  style={{...field, flex:1}} aria-label="Mobile number"/>
              </div>
              {err && <div className="text-xs mb-2 font-semibold" style={{color:T.accent}}>{err}</div>}
              <button onClick={send} disabled={busy || !phone.trim()} style={primary(busy || !phone.trim())}>
                {busy ? "Sending…" : "Send me a code"}</button>
              <div className="text-[11px] mt-2 text-center" style={{color:T.muted}}>
                Standard SMS rates apply. By continuing you agree to our terms and privacy policy.</div>
            </>) : (<>
              <div style={{...disp, fontWeight:700, letterSpacing:".04em", fontSize:11, color:T.muted}} className="mb-2">ENTER YOUR CODE</div>
              <div className="text-xs mb-3" style={{color:T.muted}}>
                Sent to <b style={{color:T.ink}}>+65 {phone}</b>.{" "}
                <button onClick={restart} style={{color:T.accent, fontWeight:700}}>Wrong number?</button>
              </div>
              <input ref={codeRef} value={code} inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} placeholder="······"
                onChange={(e)=>{ const v=e.target.value.replace(/\D/g,"").slice(0,6); setCode(v); setErr(null);
                  if (v.length===6 && !busy) setTimeout(()=>verify(), 50); }}
                style={{...field, textAlign:"center", fontSize:28, letterSpacing:"0.5em", fontWeight:700}}
                aria-label="6-digit code"/>
              {err && <div className="text-xs mt-2 font-semibold" style={{color:T.accent}}>{err}</div>}
              <div className="mt-3">
                <button onClick={verify} disabled={busy || code.length<6} style={primary(busy || code.length<6)}>
                  {busy ? "Checking…" : "Verify & sign in"}</button>
              </div>
              <button onClick={send} disabled={cooldown>0 || busy}
                className="w-full text-sm font-bold mt-3"
                style={{color: cooldown>0 ? T.muted : T.accent}}>
                {cooldown>0 ? `Resend code in ${cooldown}s` : "Resend code"}</button>
            </>)}
          </>)}

          {DEMO_LOGINS && (<>
            {/* separator only when the OTP form is above it */}
            <div className="mb-3" style={{...disp, fontWeight:700, letterSpacing:".04em", fontSize:11, color:T.muted,
              ...(isConfigured ? {borderTop:`1.5px solid ${T.line}`, paddingTop:20, marginTop:24} : {})}}>
              {isConfigured ? "OR USE A DEMO LOGIN" : "CHOOSE A DEMO LOGIN"}</div>
            {[
              ["client","Sam Lee","Member · class + PT credits", T.accent],
              ["dylan","Dylan","Coach · trainer view", T.blue],
              ["danny","Danny","Head Coach · trainer view", T.navy],
              ["admin","Admin","Owner console · not a trainer", T.moss],
            ].map(([acct,name,sub,clr])=>(
              <button key={acct} onClick={()=>login(acct)}
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
          </>)}

          <div className="text-xs mt-2 text-center" style={{color:T.muted}}>{locations.map(l=>l.name).join(" · ")}</div>

          {/* Connect — visible before login so a prospective client can reach out with no account */}
          <div className="mt-5 pt-4" style={{borderTop:`1.5px solid ${T.line}`}}>
            <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-1 text-center">CONNECT WITH EXERCISEONLY</div>
            <div className="text-xs mb-3 text-center" style={{color:T.muted}}>New here? Message us — no account needed.</div>
            <ConnectRow/>
          </div>
          <div className="text-center text-xs mt-5" style={{color:T.muted}}>
            {isConfigured ? "Signed-in data is saved to your account." : "Demo build — data resets on refresh."}</div>
        </div>
      </div>
    </div>
  );
}
