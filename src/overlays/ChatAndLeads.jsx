import { useApp } from "../state/AppState.jsx";
import EnquirySheet from "../components/EnquirySheet.jsx";
import { nid } from "../lib/util.js";
import { T, disp } from "../theme.js";
import { Btn, Select } from "../ui/kit.jsx";

export default function ChatAndLeads() {
  const { aboutEdit, addLead, chatInput, chatMsgs, chatOpen, leads, offerSheet, ping, setAboutCopy, setAboutEdit, setAddLead, setChatInput, setChatMsgs, setChatOpen, setLeads, setOfferSheet, setOffers } = useApp();
  return (<>
        {/* in-app coach chat (Message Coach) */}
        {chatOpen && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setChatOpen(false)}>
            <div className="w-full max-w-md rounded-t-3xl flex flex-col" style={{background:T.paper, height:"70vh"}} onClick={e=>e.stopPropagation()}>
              <div className="px-5 pt-4 pb-2 flex items-center justify-between" style={{borderBottom:`1.5px solid ${T.line}`}}>
                <div><div style={{...disp,fontWeight:700,fontSize:18}}>Chat · ExerciseOnly</div>
                  <div className="text-xs" style={{color:T.muted}}>Goes to the ExerciseOnly team (admin) · also on WhatsApp +65 8100 6608</div></div>
                <button onClick={()=>setChatOpen(false)} className="text-xs font-bold px-2 py-1 rounded" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>Close</button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                {chatMsgs.map((m,i)=>(
                  <div key={i} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from==="me"?"ml-auto":""}`}
                    style={{background:m.from==="me"?T.ink:"#EFEBE3", color:m.from==="me"?T.paper:T.ink}}>{m.text}</div>))}
              </div>
              <div className="p-3 flex gap-2" style={{borderTop:`1.5px solid ${T.line}`}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Message ExerciseOnly…"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Btn small onClick={()=>{ if(!chatInput.trim())return;
                  const q=chatInput.trim();
                  setChatMsgs(m=>[...m,{from:"me",text:q}]); setChatInput("");
                  setTimeout(()=>setChatMsgs(m=>[...m,{from:"coach",text:"Thanks — the ExerciseOnly team has your message and will reply shortly. (A future AI assistant could answer schedule/credit questions here instantly.)"}]),700);
                }}>Send</Btn>
              </div>
            </div>
          </div>)}

        {/* add lead (manual walk-in / IG DM capture) */}
        {addLead && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setAddLead(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:700,fontSize:22}}>Add lead</div>
                <button onClick={()=>setAddLead(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs mb-3" style={{color:T.muted}}>Log a walk-in, phone enquiry, or an Instagram DM you want to follow up.</div>
              <div className="space-y-2 mb-3">
                <input value={addLead.name} onChange={e=>setAddLead(a=>({...a,name:e.target.value}))} placeholder="Name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <input value={addLead.phone} onChange={e=>setAddLead(a=>({...a,phone:e.target.value}))} placeholder="Mobile (for WhatsApp / call)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <Select value={addLead.source} onChange={v=>setAddLead(a=>({...a,source:v}))}
                  options={[["Walk-in","Walk-in"],["Instagram","Instagram DM"],["Enquiry form","Phone / enquiry"],["Referral","Referral"]]} />
                <input value={addLead.note} onChange={e=>setAddLead(a=>({...a,note:e.target.value}))} placeholder="Note (what they're interested in)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              </div>
              <Btn full disabled={!addLead.name.trim()} onClick={()=>{
                setLeads(ls=>[{id:nid(), name:addLead.name.trim(), phone:addLead.phone.replace(/\D/g,""), source:addLead.source, status:"new", note:addLead.note},...ls]);
                ping(`${addLead.name.trim()} added to leads`); setAddLead(null);}}>Add lead</Btn>
            </div>
          </div>)}

        {/* admin: edit Shop “About” copy */}
        {aboutEdit && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setAboutEdit(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:800,fontSize:20}}>Shop “About” copy</div>
                <button onClick={()=>setAboutEdit(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="text-xs font-bold mt-3 mb-1" style={{color:T.muted}}>ABOUT CLASSES</div>
              <textarea value={aboutEdit.classes} onChange={e=>setAboutEdit(a=>({...a,classes:e.target.value}))} rows={4}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <div className="text-xs font-bold mt-3 mb-1" style={{color:T.muted}}>ABOUT PERSONAL TRAINING</div>
              <textarea value={aboutEdit.pt} onChange={e=>setAboutEdit(a=>({...a,pt:e.target.value}))} rows={4}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
              <div className="mt-3"><Btn full onClick={()=>{setAboutCopy(aboutEdit); setAboutEdit(null); ping("About page updated");}}>Save</Btn></div>
            </div>
          </div>)}

        {/* admin: add an offer */}
        {offerSheet && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{background:"rgba(23,21,15,.55)"}} onClick={()=>setOfferSheet(null)}>
            <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{background:T.paper}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div style={{...disp,fontWeight:800,fontSize:20}}>New offer</div>
                <button onClick={()=>setOfferSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.line}`,color:T.muted}}>✕</button>
              </div>
              <div className="space-y-2 my-3">
                <Select value={offerSheet.kind} onChange={v=>setOfferSheet(o=>({...o,kind:v, color:v==="Referral"?"#12B39C":v==="8.8 Flash"?"#FF5A3C":"#1E50A0"}))}
                  options={[["This month","This month"],["8.8 Flash","Flash sale"],["Referral","Referral"],["New client","New client"]]} />
                <input value={offerSheet.title} onChange={e=>setOfferSheet(o=>({...o,title:e.target.value}))} placeholder="Title (e.g. 8.8 Sale)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                <textarea value={offerSheet.blurb} onChange={e=>setOfferSheet(o=>({...o,blurb:e.target.value}))} placeholder="Short description" rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>
                {offerSheet.kind!=="Referral" && <input value={offerSheet.code} onChange={e=>setOfferSheet(o=>({...o,code:e.target.value.toUpperCase()}))} placeholder="Coupon code (must exist in Coupons)"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none uppercase" style={{border:`1.5px solid ${T.line}`,background:T.card}}/>}
              </div>
              <Btn full disabled={!offerSheet.title.trim()} onClick={()=>{
                setOffers(os=>[...os,{...offerSheet, id:nid(), code:offerSheet.kind==="Referral"?null:offerSheet.code}]);
                ping("Offer published to Shop → Offers"); setOfferSheet(null);}}>Publish offer</Btn>
            </div>
          </div>)}

        {/* also reachable once signed in, from Account → Connect */}
        <EnquirySheet/>
  </>);
}

