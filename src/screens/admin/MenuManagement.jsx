/* MenuManagement — admin control panel for feature visibility and permissions.
 *
 * Danny can turn tabs and sections on/off per role (Member / Coach), and toggle
 * whether each section is read-only or read-write.
 *
 * Structure:
 *   Role picker  →  Tab grid (eye toggle)
 *                →  Section list per tab (eye + pencil toggles)
 *
 * Changes are live immediately in the demo. In production, persist
 * menuConfig to the settings table:
 *   UPDATE settings SET menu_config = $1 WHERE id = 1;
 *
 * The config is intentionally NOT enforced by AppState guards yet — it stores
 * the intent so Danny can preview it before a hard enforcement pass wires each
 * section's render to read from menuConfig.
 */

import { useState } from "react";
import { useApp } from "../../state/AppState.jsx";
import { T, disp } from "../../theme.js";
import { Btn } from "../../ui/kit.jsx";

/* ---------------------------------------------------------------- schema */

export const TAB_DEFS = {
  client: [
    { key: "home",    label: "Home",    icon: "🏠" },
    { key: "book",    label: "Book",    icon: "📅" },
    { key: "log",     label: "Log",     icon: "📊" },
    { key: "shop",    label: "Shop",    icon: "🛍️" },
    { key: "account", label: "Account", icon: "👤" },
  ],
  trainer: [
    { key: "today",    label: "Today",    icon: "☀️" },
    { key: "schedule", label: "Schedule", icon: "📆" },
    { key: "clients",  label: "Clients",  icon: "👥" },
    { key: "me",       label: "Me",       icon: "🏋️" },
  ],
};

export const SECTION_DEFS = {
  client: [
    { tab: "home",    key: "home_announce",    label: "Announcements banner",      write: false },
    { tab: "home",    key: "home_upcoming",    label: "Upcoming bookings",          write: false },
    { tab: "home",    key: "home_offers",      label: "Offers carousel",            write: false },
    { tab: "book",    key: "book_classes",     label: "Group classes",              write: true  },
    { tab: "book",    key: "book_pt",          label: "Personal training",          write: true  },
    { tab: "book",    key: "book_camps",       label: "Camps",                      write: true  },
    { tab: "book",    key: "book_myschedule",  label: "My schedule view",           write: false },
    { tab: "log",     key: "log_workouts",     label: "Workout logs",               write: true  },
    { tab: "log",     key: "log_measurements", label: "Body measurements",          write: true  },
    { tab: "log",     key: "log_goals",        label: "Goals",                      write: true  },
    { tab: "shop",    key: "shop_packs",       label: "Class packs & PT packs",     write: true  },
    { tab: "shop",    key: "shop_offers",      label: "Shop offers",                write: false },
    { tab: "account", key: "acct_credits",     label: "Credits & booking history",  write: false },
    { tab: "account", key: "acct_referral",    label: "Referral programme",         write: true  },
    { tab: "account", key: "acct_chat",        label: "Message coach (chat)",       write: true  },
  ],
  trainer: [
    { tab: "today",    key: "tr_today_queue",   label: "Attendance queue",           write: true  },
    { tab: "today",    key: "tr_today_camps",   label: "Camp sessions",              write: true  },
    { tab: "schedule", key: "tr_sched_cal",     label: "Calendar view",              write: false },
    { tab: "schedule", key: "tr_sched_drag",    label: "Drag-to-move sessions",      write: true  },
    { tab: "schedule", key: "tr_sched_builder", label: "Class builder (admin only)", write: false },
    { tab: "clients",  key: "tr_clients_list",  label: "Client list",                write: false },
    { tab: "clients",  key: "tr_clients_pt",    label: "PT bookings",                write: false },
    { tab: "me",       key: "tr_me_rates",      label: "Pay rates",                  write: false },
    { tab: "me",       key: "tr_me_expenses",   label: "Expense claims",             write: true  },
    { tab: "me",       key: "tr_me_timeoff",    label: "Time off / availability",    write: true  },
  ],
};

/* Build the default config from SECTION_DEFS so it's always in sync. */
export function buildDefault() {
  const cfg = {};
  Object.keys(TAB_DEFS).forEach(role => {
    cfg[role] = {
      tabs: Object.fromEntries(TAB_DEFS[role].map(t => [t.key, true])),
      sections: Object.fromEntries(
        SECTION_DEFS[role].map(s => [s.key, { visible: true, write: s.write }])
      ),
    };
  });
  return cfg;
}

/* ---------------------------------------------------------------- component */

const ROLES = [
  { key: "client",  label: "Members",  color: T.navy  },
  { key: "trainer", label: "Coaches",  color: T.moss  },
];

export default function MenuManagement({ menuConfig, setMenuConfig }) {
  const { ping } = useApp();
  const [role, setRole] = useState("client");
  const [focusTab, setFocusTab] = useState(null);  // show sections for this tab

  const cfg = menuConfig?.[role] || { tabs: {}, sections: {} };

  const toggleTab = (tabKey) => {
    setMenuConfig(mc => ({
      ...mc,
      [role]: {
        ...mc[role],
        tabs: { ...mc[role].tabs, [tabKey]: !mc[role].tabs[tabKey] },
      },
    }));
  };

  const toggleSection = (secKey, field) => {
    setMenuConfig(mc => ({
      ...mc,
      [role]: {
        ...mc[role],
        sections: {
          ...mc[role].sections,
          [secKey]: { ...mc[role].sections[secKey], [field]: !mc[role].sections[secKey][field] },
        },
      },
    }));
  };

  const resetToDefaults = () => {
    setMenuConfig(buildDefault());
    ping("Menu config reset to defaults");
  };

  /* sections to show: all, or filtered to focusTab */
  const sections = SECTION_DEFS[role].filter(s => !focusTab || s.tab === focusTab);
  const tabs = TAB_DEFS[role];

  const Toggle = ({ on, onChange, size = 20 }) => (
    <button onClick={onChange}
      className="flex-shrink-0 rounded-full transition-colors"
      style={{
        width: size * 1.9, height: size, background: on ? T.moss : T.line,
        position: "relative", cursor: "pointer",
      }}>
      <span style={{
        position: "absolute", top: 2, left: on ? size * 0.9 - 2 : 2,
        width: size - 4, height: size - 4, borderRadius: "50%",
        background: "#fff", transition: "left .15s",
      }} />
    </button>
  );

  return (
    <div>
      {/* role picker */}
      <div className="flex gap-2 mb-4">
        {ROLES.map(r => (
          <button key={r.key} onClick={() => { setRole(r.key); setFocusTab(null); }}
            className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{
              background: role === r.key ? r.color : "transparent",
              color: role === r.key ? "#fff" : T.ink,
              border: `1.5px solid ${role === r.key ? r.color : T.line}`,
            }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* tab visibility grid */}
      <div className="text-[10px] font-bold mb-2" style={{ color: T.muted }}>
        TABS — tap eye to show / hide
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {tabs.map(t => {
          const on = cfg.tabs[t.key] !== false;
          const focused = focusTab === t.key;
          return (
            <div key={t.key} className="rounded-xl p-2 text-center"
              style={{ background: focused ? "#EFF3EE" : T.card, border: `1.5px solid ${focused ? T.moss : T.line}`, cursor: "pointer" }}
              onClick={() => setFocusTab(f => f === t.key ? null : t.key)}>
              <div className="text-lg leading-none mb-1">{t.icon}</div>
              <div className="text-[10px] font-bold leading-none" style={{ color: T.ink }}>{t.label}</div>
              <button
                className="mt-1.5 text-[11px]"
                style={{ color: on ? T.moss : T.accent }}
                onClick={e => { e.stopPropagation(); toggleTab(t.key); }}
                title={on ? "Visible — tap to hide" : "Hidden — tap to show"}>
                {on ? "👁 on" : "🚫 off"}
              </button>
            </div>
          );
        })}
      </div>

      {/* section list */}
      <div className="text-[10px] font-bold mb-2" style={{ color: T.muted }}>
        {focusTab
          ? `SECTIONS IN ${tabs.find(t => t.key === focusTab)?.label.toUpperCase()}`
          : "ALL SECTIONS"} — visibility + write access
      </div>

      {focusTab && (
        <button onClick={() => setFocusTab(null)} className="text-xs font-bold mb-2"
          style={{ color: T.accent }}>✕ Show all sections</button>
      )}

      <div className="space-y-1.5 mb-4">
        {sections.map(s => {
          const sec = cfg.sections[s.key] || { visible: true, write: s.write };
          const tabDef = tabs.find(t => t.key === s.tab);
          return (
            <div key={s.key} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
              style={{ background: T.card, border: `1.5px solid ${T.line}`, opacity: sec.visible ? 1 : 0.5 }}>
              <div className="flex-1 min-w-0">
                {!focusTab && (
                  <div className="text-[9px] font-bold mb-0.5" style={{ color: T.muted }}>
                    {tabDef?.icon} {tabDef?.label}
                  </div>
                )}
                <div className="text-xs font-semibold truncate">{s.label}</div>
              </div>
              {/* visible toggle */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px]" style={{ color: T.muted }}>Visible</span>
                <Toggle on={sec.visible} onChange={() => toggleSection(s.key, "visible")} size={18} />
              </div>
              {/* write toggle — only meaningful if visible */}
              <div className="flex flex-col items-center gap-0.5" style={{ opacity: sec.visible ? 1 : 0.35 }}>
                <span className="text-[9px]" style={{ color: T.muted }}>Write</span>
                <Toggle on={sec.write} onChange={() => sec.visible && toggleSection(s.key, "write")} size={18} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-3 mb-2" style={{ background: "#FBF3EC", border: `1px solid ${T.line}` }}>
        <div className="text-[11px] font-bold mb-1" style={{ color: T.orange }}>⚠ Preview mode</div>
        <div className="text-[11px]" style={{ color: T.muted }}>
          These settings are saved in the demo and will be enforced in the next release.
          In production they persist to the Supabase settings table and take effect immediately.
        </div>
      </div>

      <Btn small kind="ghost" onClick={resetToDefaults}>Reset all to defaults</Btn>
    </div>
  );
}
