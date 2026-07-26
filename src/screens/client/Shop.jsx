import { useApp } from "../../state/AppState.jsx";
import { T, disp } from "../../theme.js";
import { Btn, Card, Chip, H, Sub } from "../../ui/kit.jsx";

export default function ClientShop() {
  const { copyText, referralCode, aboutCopy, active, coupon, day, isClient, login, offers, ping, products, sessions, setCoupon, setCouponMsg, setPayMode, setShopSheet, setShopTab, shopTab, tab, trainers } = useApp();
  return (<>
        {/* ==================== CLIENT: SHOP (Buy · About · Offers) ==================== */}
        {isClient && tab==="shop" && (
          <main className="flex-1 pb-24 px-5">
            <H>Shop</H>
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {[["buy","Packages"],["about","About"],["offers","Offers"]].map(([k,l])=>(
                <Chip key={k} active={shopTab===k} onClick={()=>setShopTab(k)}>{l}</Chip>))}
            </div>

            {/* ---- BUY ---- */}
            {shopTab==="buy" && (<>
              {(() => {
                const groups = [
                  ["Class credit packs", products.filter(p=>p.active&&p.kind==="classes")],
                  ["Class passes — unlimited within the period", products.filter(p=>p.active&&p.kind==="classpass")],
                  ["Personal training", products.filter(p=>p.active&&(p.kind==="pthead"||p.kind==="ptcoach"))],
                ];
                return groups.map(([label, list]) => list.length===0 ? null : (
                  <div key={label} className="mb-4">
                    <Sub>{label.toUpperCase()}</Sub>
                    <div className="space-y-3">
                      {list.map(p=>(
                        <Card key={p.id} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-bold text-sm">{p.name}</div>
                            <div className="text-xs" style={{color:T.muted}}>
                              {p.kind==="classpass"
                                ? `Unlimited classes for ${p.validity===1?"1 day":p.validity===7?"7 days":"30 days"}`
                                : `${p.sessions} sessions · valid ${p.validity} days`}
                              {p.kind==="pthead" ? " · head coach only" : p.kind==="ptcoach" ? " · any coach (not Danny)" : ""}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${p.price}</div>
                            <Btn small onClick={()=>{setShopSheet({product:p}); setPayMode("paynow"); setCoupon(""); setCouponMsg(null);}}>Buy</Btn>
                          </div>
                        </Card>))}
                    </div>
                  </div>));
              })()}
              <div className="text-xs" style={{color:T.muted}}>Got a coupon from Offers? Apply it at checkout. Price changes never affect packs you've already bought.</div>
            </>)}

            {/* ---- ABOUT (explains classes + PT, coach bios) ---- */}
            {shopTab==="about" && (<>
              <Card className="mb-3">
                <div className="flex items-center justify-between">
                  <div style={{...disp,fontWeight:800,fontSize:16}}>Group classes</div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.accent,color:"#fff"}}>Classes</span>
                </div>
                <div className="text-sm mt-1.5" style={{color:T.muted}}>{aboutCopy.classes}</div>
              </Card>
              <Card className="mb-3">
                <div className="flex items-center justify-between">
                  <div style={{...disp,fontWeight:800,fontSize:16}}>Personal training</div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:T.blue,color:"#fff"}}>1-to-1</span>
                </div>
                <div className="text-sm mt-1.5" style={{color:T.muted}}>{aboutCopy.pt}</div>
              </Card>
              <Sub>YOUR COACHES</Sub>
              <div className="space-y-3">
                {trainers.map(t=>(
                  <Card key={t.id} className="flex gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{...disp,fontWeight:800,fontSize:18,background:t.head?T.accent:T.blue,color:"#fff",flex:"none"}}>{t.name[0]}</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{t.name} <span className="text-xs font-normal" style={{color:T.muted}}>· {t.tag||"Coach"}</span></div>
                      <div className="text-xs mt-0.5" style={{color:T.muted}}>{t.bio || "Bio coming soon."}</div>
                    </div>
                  </Card>))}
              </div>
              <div className="text-xs mt-3" style={{color:T.muted}}>Danny keeps this page and coach write-ups up to date from his admin login.</div>
            </>)}

            {/* ---- OFFERS ---- */}
            {shopTab==="offers" && (<>
              <div className="space-y-3">
                {offers.map(o=>(
                  <Card key={o.id} style={{borderColor:o.color, borderWidth:1.5}}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:o.color,color:"#fff"}}>{o.kind}</span>
                      <div style={{...disp,fontWeight:800,fontSize:16}}>{o.title}</div>
                    </div>
                    <div className="text-sm" style={{color:T.muted}}>{o.blurb}</div>
                    <div className="mt-2">
                      {o.kind==="Referral"
                        ? <Btn small onClick={()=>copyText(`Join me at ExerciseOnly — use my code ${referralCode} and we both get a free class. https://exerciseonly.vip`, "Referral link copied — paste it into WhatsApp or Instagram")}>Share my code</Btn>
                        : <Btn small onClick={()=>{setShopTab("buy"); setCoupon(o.code); ping(`Coupon ${o.code} ready — buy a pack and it's applied at checkout`);}}>Get code · {o.code}</Btn>}
                    </div>
                  </Card>))}
              </div>
              <div className="text-xs mt-3" style={{color:T.muted}}>Coupons apply at checkout on the Packages tab. One offer per purchase.</div>
            </>)}
          </main>)}

  </>);
}

