import { useApp } from "../../state/AppState.jsx";
import { ConnectRow } from "../../brand.jsx";
import { T, disp } from "../../theme.js";
import { Btn, Card, H } from "../../ui/kit.jsx";

export default function ClientAccount() {
  const { active, classPass, credits, isClient, ledger, login, marketingOptIn, offers, ping, referralCode, referralReward, referralUses, setChatOpen, setCredits, setMarketingOptIn, setReferralReward, tab } = useApp();
  return (<>
        {/* ==================== CLIENT: ACCOUNT ==================== */}
        {isClient && tab==="account" && (
          <main className="flex-1 pb-24 px-5 space-y-3">
            <H>Account</H>
            <Card><div className="font-bold">Sam Lee</div><div className="text-xs" style={{color:T.muted}}>+65 9XXX XXXX · sam@email.com · OTP login</div></Card>
            <Card style={{background:T.ink,color:T.paper,border:"none"}}>
              <div className="text-xs font-bold mb-1" style={{color:"#B9B5A9"}}>REFER A FRIEND</div>
              <div className="flex items-center justify-between">
                <span style={{...disp,fontWeight:700,fontSize:20,color:T.accent}}>{referralCode}</span>
                <Btn small kind="ghost" onClick={()=>ping("Referral link copied — share on WhatsApp or Instagram")}>Share</Btn>
              </div>
              <div className="text-xs mt-1.5" style={{color:"#B9B5A9"}}>{referralUses} friend joined · you both get 1 free class credit when they book their first session.</div>
              {/* earned referral rewards can be moved into the class-credit pool */}
              <div className="mt-3 pt-3" style={{borderTop:"1px solid rgba(255,255,255,.14)"}}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Referral credit earned</div>
                    <div className="text-xs" style={{color:"#B9B5A9"}}>
                      {referralReward>0 ? `${referralReward} free class credit${referralReward>1?"s":""} waiting to be added` : "Nothing to claim right now"}</div>
                  </div>
                  <span style={{...disp,fontWeight:800,fontSize:26,color:referralReward>0?T.amber:"#6B6459"}}>{referralReward}</span>
                </div>
                <Btn small full disabled={referralReward<=0}
                  onClick={()=>{ const n=referralReward; setCredits(c=>({...c, classes:c.classes+n})); setReferralReward(0);
                    ping(`${n} referral credit${n>1?"s":""} added — you now have ${credits.classes+n} class credits`); }}>
                  {referralReward>0 ? `Add ${referralReward} to my class credits` : "No credit to add"}</Btn>
              </div>
            </Card>
            <Card><div className="text-xs font-bold mb-2" style={{color:T.muted}}>MY PACKS</div>
              <div className="text-sm">Class pack — {credits.classes} credits left · expires 20 Sep</div>
              <div className="text-sm">PT pack (head coach) — {credits.ptHead} left · expires 5 Oct</div>
              <div className="text-sm">PT pack (coach) — {credits.ptCoach} left · expires 5 Oct</div>
              {classPass && <div className="text-sm" style={{color:T.moss}}>{classPass.label} — active, unlimited classes</div>}</Card>
            <Card><div className="text-xs font-bold mb-2" style={{color:T.muted}}>RECENT PAYMENTS</div>
              {ledger.filter(l=>l.who==="Sam Lee").slice(0,4).map(l=>(
                <div key={l.id} className="flex justify-between text-sm py-1"><span>{l.what}</span><span className="font-bold">${l.amt}</span></div>))}
              {ledger.filter(l=>l.who==="Sam Lee").length===0 && <div className="text-sm" style={{color:T.muted}}>No payments yet in this demo.</div>}
            </Card>
            {/* working opt-in switch, not a dead label */}
            <Card className="flex justify-between items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">Marketing messages</div>
                <div className="text-xs" style={{color:T.muted}}>
                  {marketingOptIn ? "You'll get offers & new-class alerts on WhatsApp and email." : "You'll only get booking confirmations and reminders."}</div>
              </div>
              <button onClick={()=>{ setMarketingOptIn(v=>{ ping(v?"Marketing messages turned off":"Marketing messages turned on — you'll hear about new offers first"); return !v; }); }}
                role="switch" aria-checked={marketingOptIn} aria-label="Marketing messages"
                style={{flex:"none", width:52, height:30, borderRadius:15, padding:3, cursor:"pointer",
                  background:marketingOptIn?T.moss:"#DED6C8", border:"none", transition:"background .15s"}}>
                <div style={{width:24, height:24, borderRadius:12, background:"#fff",
                  transform:`translateX(${marketingOptIn?22:0}px)`, transition:"transform .15s",
                  boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </Card>
            <Card style={{background:"#EFF3EE"}} className="flex items-center justify-between">
              <div><div className="font-semibold text-sm">Message ExerciseOnly</div>
                <div className="text-xs" style={{color:T.muted}}>Goes to the ExerciseOnly team · or WhatsApp +65 8100 6608</div></div>
              <Btn small kind="dark" onClick={()=>setChatOpen(true)}>Chat</Btn>
            </Card>

            {/* connect / follow */}
            <Card>
              <div style={{...disp,fontWeight:700,letterSpacing:".04em",fontSize:11,color:T.muted}} className="mb-2.5">CONNECT WITH EXERCISEONLY</div>
              <ConnectRow/>
              <div className="text-xs mt-2.5 text-center" style={{color:T.muted}}>@exercise.only · 4exerciseonly@gmail.com</div>
            </Card>

            {/* support */}
            <a href="mailto:4exerciseonly@gmail.com?subject=App%20issue%20report" className="block">
              <Card className="flex items-center justify-between">
                <div><div className="font-semibold text-sm">Report an issue</div>
                  <div className="text-xs" style={{color:T.muted}}>Something not working? Email the app team.</div></div>
                <span style={{...disp,fontWeight:700,color:T.accent}} className="text-sm">Contact →</span>
              </Card>
            </a>

            <div className="text-xs text-center" style={{color:T.muted}}>Privacy policy · Request account deletion · v0 demo</div>
          </main>)}

  </>);
}

