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
import AdminCamps from "./screens/admin/Camps.jsx";
import AdminManage from "./screens/admin/Manage.jsx";
import BookingSheets from "./overlays/BookingSheets.jsx";
import ChatAndLeads from "./overlays/ChatAndLeads.jsx";
import ScheduleSheets from "./overlays/ScheduleSheets.jsx";
import AdminSheets from "./overlays/AdminSheets.jsx";
import LogSheets from "./overlays/LogSheets.jsx";

function Shell() {
  const { user, setUser, tab, setTab, isClient, isAdmin, navItems, toast } = useApp();
  if (!user) return <Login/>;
  return (
    <div className="min-h-screen flex justify-center" style={{background:"#E6DFD3", ...body, color:T.ink}}>
      <style>{FONTS}</style>
      <div className="w-full max-w-md min-h-screen flex flex-col relative" style={{background:T.paper}}>
        <header className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28}/>
            <div>
              <Wordmark size={19}/>
              <div className="text-xs" style={{color:T.muted}}>{isAdmin?"Admin console":isClient?"Member":"Coach"}</div>
            </div>
          </div>
          <button onClick={()=>setUser(null)} className="text-xs font-bold px-3 py-2 rounded-lg"
            style={{...disp, border:`1.5px solid ${T.line}`, color:T.muted}}>Log out</button>
        </header>

        {/* ---- screens ---- */}
        <ClientHome/><ClientBook/><ClientLog/><ClientShop/><ClientAccount/>
        <StaffToday/><StaffSchedule/><StaffClients/><StaffMe/>
        <AdminCamps/><AdminManage/>

        {/* bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex" style={{background:T.ink, paddingBottom:"env(safe-area-inset-bottom)"}}>
          {navItems.map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} className="flex-1 py-3"
              style={{...disp,fontSize:13,fontWeight:700,color:tab===k?T.accent:"#B9B5A9"}}>{label}</button>))}
        </nav>

        {/* ---- modal sheets ---- */}
        <BookingSheets/><ChatAndLeads/><ScheduleSheets/><AdminSheets/><LogSheets/>

        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl text-sm font-semibold text-center"
          style={{background:T.ink,color:T.paper,maxWidth:"90%"}}>{toast}</div>}
      </div>
    </div>
  );
}

export default function DannyFitnessDemo() {
  return <AppProvider><Shell/></AppProvider>;
}

