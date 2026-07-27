/* ChatAndLeads — in-app messaging + lead management overlays.
 *
 * Two audiences, same component:
 *
 *   Members  — tap "Chat" in Account → open their personal thread with the team.
 *              They see their own messages and coach replies. In demo mode a
 *              canned coach reply arrives after 700ms; in production this would
 *              pipe through Supabase Realtime or a WhatsApp Business relay.
 *
 *   Admin / Head Coach — tap "Messages" in Manage → People to open the inbox.
 *              Lists all member threads (unread badge), tap one to read and reply.
 *              Replies land in the member's chatMsgs instantly (same session in
 *              demo; Supabase Realtime push in production).
 *
 * Lead capture, About copy, and Offer sheets also live here because they share
 * the full-screen-overlay pattern and are rarely open at the same time.
 */

import { useRef, useState, useEffect } from "react";
import { useApp } from "../state/AppState.jsx";
import EnquirySheet from "../components/EnquirySheet.jsx";
import { nid } from "../lib/util.js";
import { T, disp } from "../theme.js";
import { Btn, Select } from "../ui/kit.jsx";

/* ------------------------------------------------------------------ helpers */

const fmtTs = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now - d) / 36e5;
  if (diffH < 1) return `${Math.max(1, Math.round(diffH * 60))}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
};

/* ------------------------------------------------------------------ Overlay */

export default function ChatAndLeads() {
  const {
    isAdmin, user,
    chatOpen, setChatOpen, chatMsgs, setChatMsgs, chatInput, setChatInput,
    adminInboxOpen, setAdminInboxOpen, chatThreads, setChatThreads,
    activeChatThread, setActiveChatThread,
    aboutEdit, addLead, offerSheet, ping,
    setAboutCopy, setAboutEdit, setAddLead, setLeads, setOfferSheet, setOffers,
  } = useApp();

  const adminReplyRef = useRef(null);

  /* Mobile keyboard fix: when the virtual keyboard appears the visual viewport
     shrinks. We track it and size chat panels to the actual visible area so the
     input is never pushed off screen. Falls back to 70vh on browsers that don't
     support visualViewport (desktop). */
  const [panelH, setPanelH] = useState("70dvh");
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setPanelH(`${Math.round(vv.height * 0.92)}px`);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  /* Body scroll lock: when a chat panel is open the fixed overlay is the only
     scroll surface. Without this, focusing the input on iOS scrolls the <body>,
     which pushes the overlay off-screen. */
  const anyOpen = (chatOpen && !isAdmin) || (adminInboxOpen && isAdmin);
  useEffect(() => {
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [anyOpen]);

  /* send from member side */
  const sendMemberMsg = () => {
    const q = chatInput.trim();
    if (!q) return;
    setChatMsgs(m => [...m, { from: "me", text: q }]);
    setChatInput("");
    const memberId = user?.id || "member";
    const memberName = user?.name || "Member";
    setChatThreads(ts => {
      const existing = ts.find(t => t.memberId === memberId);
      const msg = { from: "member", text: q, ts: new Date().toISOString() };
      if (existing) return ts.map(t => t.memberId === memberId ? { ...t, msgs: [...t.msgs, msg], unread: t.unread + 1 } : t);
      return [{ id: `thread-${memberId}`, memberId, memberName, msgs: [msg], unread: 1 }, ...ts];
    });
    setTimeout(() => setChatMsgs(m => [...m, {
      from: "coach",
      text: "Thanks — the ExerciseOnly team has your message and will reply shortly.",
    }]), 700);
  };

  /* send admin reply */
  const sendAdminReply = (threadId, text) => {
    const t = text.trim();
    if (!t) return;
    const msg = { from: "coach", text: t, ts: new Date().toISOString() };
    setChatThreads(ts => ts.map(th => th.id !== threadId ? th : { ...th, msgs: [...th.msgs, msg], unread: 0 }));
    setChatMsgs(m => [...m, { from: "coach", text: t }]);
    ping("Reply sent");
  };

  const unreadTotal = chatThreads.reduce((n, t) => n + t.unread, 0);
  const activeThread = chatThreads.find(t => t.id === activeChatThread);

  /* ======================================================= MEMBER CHAT
     Plain JSX value, NOT an inner component — an inner component gets a new
     identity every render, which unmounts the input mid-typing and dismisses
     the phone keyboard. */
  const memberChat = (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setChatOpen(false)}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ background: T.paper, height: panelH, maxHeight: "92dvh" }} onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1.5px solid ${T.line}` }}>
          <div>
            <div style={{ ...disp, fontWeight: 700, fontSize: 18 }}>Chat · ExerciseOnly</div>
            <div className="text-xs" style={{ color: T.muted }}>
              Goes to the team · also on WhatsApp +65 8100 6608
            </div>
          </div>
          <button onClick={() => setChatOpen(false)} className="text-xs font-bold px-2 py-1 rounded"
            style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>Close</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {chatMsgs.map((m, i) => (
            <div key={i}
              className={"max-w-[80%] px-3 py-2 rounded-2xl text-sm" + (m.from === "me" ? " ml-auto" : "")}
              style={{ background: m.from === "me" ? T.ink : "#EFEBE3", color: m.from === "me" ? T.paper : T.ink }}>
              {m.from !== "me" && (
                <div className="text-[10px] font-bold mb-0.5" style={{ color: T.muted }}>ExerciseOnly team</div>
              )}
              {m.text}
            </div>
          ))}
        </div>
        <div className="p-3 flex gap-2 shrink-0" style={{ borderTop: `1.5px solid ${T.line}`, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMemberMsg(); } }}
            placeholder="Message ExerciseOnly…"
            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
          <Btn small onClick={sendMemberMsg}>Send</Btn>
        </div>
      </div>
    </div>
  );

  /* ======================================================= ADMIN INBOX — plain JSX value, same reason as memberChat */
  const adminInbox = (
    <div className="fixed inset-0 z-30 flex items-end justify-center"
      style={{ background: "rgba(23,21,15,.55)" }}
      onClick={() => { setAdminInboxOpen(false); setActiveChatThread(null); }}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col"
        style={{ background: T.paper, height: panelH, maxHeight: "95dvh" }} onClick={e => e.stopPropagation()}>

        {/* header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1.5px solid ${T.line}` }}>
          {activeChatThread ? (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveChatThread(null)}
                  className="text-sm font-bold px-2 py-1 rounded-lg"
                  style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>‹ Back</button>
                <div style={{ ...disp, fontWeight: 700, fontSize: 17 }}>{activeThread?.memberName}</div>
              </div>
              <button onClick={() => { setAdminInboxOpen(false); setActiveChatThread(null); }}
                className="text-xs font-bold px-2 py-1 rounded"
                style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>Close</button>
            </>
          ) : (
            <>
              <div>
                <div style={{ ...disp, fontWeight: 700, fontSize: 18 }}>
                  Member Messages
                  {unreadTotal > 0 && (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: T.accent, color: "#fff" }}>{unreadTotal}</span>
                  )}
                </div>
                <div className="text-xs" style={{ color: T.muted }}>
                  {chatThreads.length} conversation{chatThreads.length !== 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => { setAdminInboxOpen(false); setActiveChatThread(null); }}
                className="text-xs font-bold px-2 py-1 rounded"
                style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>Close</button>
            </>
          )}
        </div>

        {/* thread list */}
        {!activeChatThread && (
          <div className="flex-1 overflow-y-auto">
            {chatThreads.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: T.muted }}>No member messages yet.</div>
            )}
            {chatThreads.map(t => {
              const last = t.msgs[t.msgs.length - 1];
              return (
                <button key={t.id} onClick={() => {
                  setActiveChatThread(t.id);
                  setChatThreads(ts => ts.map(x => x.id === t.id ? { ...x, unread: 0 } : x));
                }}
                  className="w-full text-left px-5 py-3.5 flex items-start gap-3"
                  style={{ borderBottom: `1px solid ${T.line}`, background: t.unread > 0 ? "#FBF3EC" : "transparent" }}>
                  <div className="rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ width: 38, height: 38, background: T.ink, color: T.paper }}>
                    {(t.memberName || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{t.memberName}</span>
                      <span className="text-[10px]" style={{ color: T.muted }}>{fmtTs(last?.ts)}</span>
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: T.muted }}>
                      {last?.from === "coach" ? "You: " : ""}{last?.text}
                    </div>
                  </div>
                  {t.unread > 0 && (
                    <div className="rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={{ width: 18, height: 18, background: T.accent, color: "#fff" }}>{t.unread}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* open thread conversation */}
        {activeChatThread && activeThread && (() => (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {activeThread.msgs.map((m, i) => (
                <div key={i}
                  className={"max-w-[80%] px-3 py-2 rounded-2xl text-sm" + (m.from === "coach" ? " ml-auto" : "")}
                  style={{ background: m.from === "coach" ? T.ink : "#EFEBE3", color: m.from === "coach" ? T.paper : T.ink }}>
                  {m.from === "member" && (
                    <div className="text-[10px] font-bold mb-0.5" style={{ color: T.muted }}>{activeThread.memberName}</div>
                  )}
                  {m.text}
                  {m.ts && (
                    <div className={"text-[9px] mt-1" + (m.from === "coach" ? " text-right" : "")}
                      style={{ opacity: 0.55 }}>{fmtTs(m.ts)}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-2 shrink-0" style={{ borderTop: `1.5px solid ${T.line}` }}>
              <input ref={adminReplyRef}
                placeholder={"Reply to " + activeThread.memberName + "…"}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAdminReply(activeChatThread, adminReplyRef.current?.value || "");
                    if (adminReplyRef.current) adminReplyRef.current.value = "";
                  }
                }} />
              <Btn small onClick={() => {
                sendAdminReply(activeChatThread, adminReplyRef.current?.value || "");
                if (adminReplyRef.current) adminReplyRef.current.value = "";
              }}>Reply</Btn>
            </div>
          </>
        ))()}
      </div>
    </div>
  );

  /* ======================================================= RENDER */
  return (<>
    {chatOpen && !isAdmin && memberChat}
    {adminInboxOpen && isAdmin && adminInbox}

    {addLead && (
      <div className="fixed inset-0 z-30 flex items-end justify-center"
        style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setAddLead(null)}>
        <div className="w-full max-w-md rounded-t-3xl p-5 pb-8"
          style={{ background: T.paper }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div style={{ ...disp, fontWeight: 700, fontSize: 22 }}>Add lead</div>
            <button onClick={() => setAddLead(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
              style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
          </div>
          <div className="text-xs mb-3" style={{ color: T.muted }}>
            Log a walk-in, phone enquiry, or an Instagram DM you want to follow up.
          </div>
          <div className="space-y-2 mb-3">
            <input value={addLead.name} onChange={e => setAddLead(a => ({ ...a, name: e.target.value }))}
              placeholder="Name" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
            <input value={addLead.phone} onChange={e => setAddLead(a => ({ ...a, phone: e.target.value }))}
              placeholder="Mobile (for WhatsApp / call)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
            <Select value={addLead.source} onChange={v => setAddLead(a => ({ ...a, source: v }))}
              options={[["Walk-in", "Walk-in"], ["Instagram", "Instagram DM"], ["Enquiry form", "Phone / enquiry"], ["Referral", "Referral"]]} />
            <input value={addLead.note} onChange={e => setAddLead(a => ({ ...a, note: e.target.value }))}
              placeholder="Note (what they're interested in)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
          </div>
          <Btn full disabled={!addLead.name.trim()} onClick={() => {
            setLeads(ls => [{ id: nid(), name: addLead.name.trim(), phone: addLead.phone.replace(/\D/g, ""), source: addLead.source, status: "new", note: addLead.note }, ...ls]);
            ping(addLead.name.trim() + " added to leads"); setAddLead(null);
          }}>Add lead</Btn>
        </div>
      </div>
    )}

    {aboutEdit && (
      <div className="fixed inset-0 z-30 flex items-end justify-center"
        style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setAboutEdit(null)}>
        <div className="w-full max-w-md rounded-t-3xl p-5 pb-8"
          style={{ background: T.paper }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div style={{ ...disp, fontWeight: 800, fontSize: 20 }}>Shop "About" copy</div>
            <button onClick={() => setAboutEdit(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
              style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
          </div>
          <div className="text-xs font-bold mt-3 mb-1" style={{ color: T.muted }}>ABOUT CLASSES</div>
          <textarea value={aboutEdit.classes} onChange={e => setAboutEdit(a => ({ ...a, classes: e.target.value }))} rows={4}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
          <div className="text-xs font-bold mt-3 mb-1" style={{ color: T.muted }}>ABOUT PERSONAL TRAINING</div>
          <textarea value={aboutEdit.pt} onChange={e => setAboutEdit(a => ({ ...a, pt: e.target.value }))} rows={4}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
          <div className="mt-3">
            <Btn full onClick={() => { setAboutCopy(aboutEdit); setAboutEdit(null); ping("About page updated"); }}>Save</Btn>
          </div>
        </div>
      </div>
    )}

    {offerSheet && (
      <div className="fixed inset-0 z-30 flex items-end justify-center"
        style={{ background: "rgba(23,21,15,.55)" }} onClick={() => setOfferSheet(null)}>
        <div className="w-full max-w-md rounded-t-3xl p-5 pb-8"
          style={{ background: T.paper }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <div style={{ ...disp, fontWeight: 800, fontSize: 20 }}>New offer</div>
            <button onClick={() => setOfferSheet(null)} className="text-sm font-bold px-2 py-1 rounded-lg"
              style={{ border: `1.5px solid ${T.line}`, color: T.muted }}>✕</button>
          </div>
          <div className="space-y-2 my-3">
            <Select value={offerSheet.kind}
              onChange={v => setOfferSheet(o => ({ ...o, kind: v, color: v === "Referral" ? "#12B39C" : v === "8.8 Flash" ? "#FF5A3C" : "#1E50A0" }))}
              options={[["This month", "This month"], ["8.8 Flash", "Flash sale"], ["Referral", "Referral"], ["New client", "New client"]]} />
            <input value={offerSheet.title} onChange={e => setOfferSheet(o => ({ ...o, title: e.target.value }))}
              placeholder="Title (e.g. 8.8 Sale)" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
            <textarea value={offerSheet.blurb} onChange={e => setOfferSheet(o => ({ ...o, blurb: e.target.value }))}
              placeholder="Short description" rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
            {offerSheet.kind !== "Referral" && (
              <input value={offerSheet.code} onChange={e => setOfferSheet(o => ({ ...o, code: e.target.value.toUpperCase() }))}
                placeholder="Coupon code (must exist in Coupons)"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none uppercase"
                style={{ border: `1.5px solid ${T.line}`, background: T.card }} />
            )}
          </div>
          <Btn full disabled={!offerSheet.title.trim()} onClick={() => {
            setOffers(os => [...os, { ...offerSheet, id: nid(), code: offerSheet.kind === "Referral" ? null : offerSheet.code }]);
            ping("Offer published to Shop → Offers"); setOfferSheet(null);
          }}>Publish offer</Btn>
        </div>
      </div>
    )}

    <EnquirySheet />
  </>);
}
