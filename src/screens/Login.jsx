import { useApp } from "../state/AppState.jsx";
import { ConnectRow, LogoMark } from "../brand.jsx";
import { FONTS, T, body, disp } from "../theme.js";

export default function Login() {
  const { camps, credits, locations, login } = useApp();
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

        {/* body */}
        <div className="flex-1 px-6 pt-6 pb-8">
          <div style={{...disp, fontWeight:700, letterSpacing:".04em", fontSize:11, color:T.muted}} className="mb-3">CHOOSE A DEMO LOGIN</div>
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
          <div className="text-xs mt-2 text-center" style={{color:T.muted}}>{locations.map(l=>l.name).join(" · ")}</div>

          {/* Connect — visible before login so a prospective client can reach out with no account */}
          <div className="mt-5 pt-4" style={{borderTop:`1.5px solid ${T.line}`}}>
            <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-1 text-center">CONNECT WITH EXERCISEONLY</div>
            <div className="text-xs mb-3 text-center" style={{color:T.muted}}>New here? Message us — no account needed.</div>
            <ConnectRow/>
          </div>
          <div className="text-center text-xs mt-5" style={{color:T.muted}}>Demo build — SMS OTP login in production. Data resets on refresh.</div>
        </div>
      </div>
    </div>
  );
}

