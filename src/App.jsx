/* App shell: provider, header, screen router, bottom nav, overlays.
   Screens live in src/screens, modal sheets in src/overlays, all shared state in
   src/state/AppState.jsx. */
import { AppProvider, useApp } from "./state/AppState.jsx";
import { T, FONTS, disp, body } from "./theme.js";
import { LogoMark, Wordmark } from "./brand.jsx";
import Login from "./screens/Login.jsx";
import ClientHome from "./screens/client/Home.jsx";
import ClientBook from "./screens/client/Book.jsx";
import ClientLog from "./screens/client/Log.jsx";
import ClientShop from "./screens/client/Shop.jsx";
import ClientAccount from "./screens/client/Account.jsx";
import StaffToday from "./screens/staff/Today.jsx";
import StaffSchedule from "./screens/staff/Schedule.jsx";
import StaffClients from "./screens/staff/Clients.jsx";
import StaffMe from "./screens/staff/Me.jsx";
import AdminReports from "./screens/admin/ReportsScreen.jsx";
import AdminManage from "./screens/admin/Manage.jsx";
import BookingSheets from "./overlays/BookingSheets.jsx";
import ChatAndLeads from "./overlays/ChatAndLeads.jsx";
import ScheduleSheets from "./overlays/ScheduleSheets.jsx";
import AdminSheets from "./overlays/AdminSheets.jsx";
import LogSheets from "./overlays/LogSheets.jsx";
import { NotificationBell, NotificationPanel } from "./components/Notifications.jsx";
import LegalSheets from "./components/LegalSheets.jsx";
import BookingDetailSheet from "./components/BookingDetailSheet.jsx";
import IntakeRecordSheet from "./components/IntakeRecordSheet.jsx";
import RecordPaymentSheet from "./components/RecordPaymentSheet.jsx";
import EventSheet from "./components/EventSheet.jsx";
import ExpenseClaimForm from "./components/ExpenseClaimForm.jsx";
import ExpenseReview from "./components/ExpenseReview.jsx";

function Shell() {
  const { user, logout, tab, setTab, isClient, isAdmin, navItems, pendingCounts, toast, adminInboxOpen, setAdminInboxOpen, chatThreads } = useApp();
  if (!user) return <Login/>;
  return (
    <div className="h-[100dvh] flex justify-center overflow-hidden" style={{background:"#E6DFD3", ...body, color:T.ink}}>
      <style>{FONTS}</style>
      <div className="w-full max-w-md h-[100dvh] flex flex-col relative overflow-hidden" style={{background:T.paper}}>
        <header className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28}/>
            <div>
              <Wordmark size={19}/>
              <div className="text-xs" style={{color:T.muted}}>{isAdmin?"Admin console":isClient?"Member":"Coach"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell/>
            {isAdmin && (() => {
              const unread = chatThreads?.reduce((n,t)=>n+t.unread,0) || 0;
              return (
                <button onClick={()=>setAdminInboxOpen(true)}
                  className="relative text-lg leading-none px-1"
                  aria-label="Member messages">
                  💬
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full flex items-center justify-center"
                      style={{minWidth:14,height:14,background:"#FF5A3C",color:"#fff",padding:"0 2px",lineHeight:"14px"}}>
                      {unread > 9 ? "9+" : unread}
                    </span>)}
                </button>);})()}
            <button onClick={logout} className="text-xs font-bold px-3 py-2 rounded-lg"
              style={{...disp, border:`1.5px solid ${T.line}`, color:T.muted}}>Log out</button>
          </div>
        </header>

        {/* ---- screens ---- */}
        <ClientHome/><ClientBook/><ClientLog/><ClientShop/><ClientAccount/>
        <StaffToday/><StaffSchedule/><StaffClients/><StaffMe/>
        <AdminReports/><AdminManage/>

        {/* bottom nav — admin tabs carry a pending-approval count so the four queues can't
            pile up unnoticed (Decision 6). */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex" style={{background:T.ink, paddingBottom:"env(safe-area-inset-bottom)"}}>
          {navItems.map(([k,label])=>{ const n = isAdmin ? (pendingCounts[k]||0) : 0; return (
            <button key={k} onClick={()=>setTab(k)} className="flex-1 py-3 relative"
              style={{...disp,fontSize:13,fontWeight:700,color:tab===k?T.accent:"#B9B5A9"}}>
              {label}
              {n>0 && <span style={{position:"absolute", top:6, left:"50%", marginLeft:label.length*3.4,
                minWidth:15, height:15, lineHeight:"15px", borderRadius:8, padding:"0 4px",
                background:T.accent, color:"#fff", fontSize:9.5, fontWeight:800}}>{n>9?"9+":n}</span>}
            </button>);})}
        </nav>

        {/* ---- modal sheets ---- */}
        <BookingSheets/><ChatAndLeads/><ScheduleSheets/><AdminSheets/><LogSheets/><NotificationPanel/><LegalSheets/><BookingDetailSheet/><IntakeRecordSheet/><RecordPaymentSheet/><EventSheet/><ExpenseClaimForm/><ExpenseReview/>

        {/* The toast is the app's only confirmation for most actions, so it has to be
            announced rather than merely drawn — polite so it doesn't cut across
            whatever the user is reading. */}
        <div role="status" aria-live="polite" className="sr-only">{toast || ""}</div>
        {toast && <div aria-hidden="true" className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-sm font-semibold text-center"
          style={{background:T.ink,color:T.paper,maxWidth:"90%"}}>{toast}</div>}
      </div>
    </div>
  );
}

export default function DannyFitnessDemo() {
  return <AppProvider><Shell/></AppProvider>;
}

