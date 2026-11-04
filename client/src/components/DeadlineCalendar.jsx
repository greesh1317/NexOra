import { useMemo, useState } from "react";
import { daysBetweenKeys, keyToDate, localKey, todayKey } from "../utils/dates.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusLabel = (s) => (s ? s.replace("_", " ") : "");

// Colour rules: done = green, overdue = red, blocked = amber, project deadline = violet, otherwise indigo
function tone(e, today) {
  if (e.status === "completed") return "bg-emerald-50 text-emerald-700";
  if (e.dateKey < today) return "bg-red-50 text-red-700";
  if (e.status === "blocked") return "bg-amber-50 text-amber-700";
  if (e.kind === "project") return "bg-violet-50 text-violet-700";
  return "bg-indigo-50 text-indigo-700";
}

function EventRow({ e, today, showDate }) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className={`mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${tone(e, today)}`}>
        {e.kind === "project" ? "project" : statusLabel(e.status) || "task"}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-800 leading-snug">{e.title}</p>
        <p className="text-xs text-slate-400">
          {[showDate && keyToDate(e.dateKey).toLocaleDateString(undefined, { day: "numeric", month: "short" }), e.sub]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </li>
  );
}

// events: [{ id, dateKey: "YYYY-MM-DD", title, kind: "task" | "project", status, sub }]
function DeadlineCalendar({ events }) {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const t = keyToDate(today);
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const map = {};
    for (const e of events) (map[e.dateKey] = map[e.dateKey] || []).push(e);
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const out = Array(new Date(y, m, 1).getDay()).fill(null); // blanks before the 1st (Sunday-first)
    for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) out.push(localKey(new Date(y, m, d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const overdue = events
    .filter((e) => e.kind === "task" && e.status !== "completed" && e.dateKey < today)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const soon = events
    .filter((e) => e.status !== "completed" && e.dateKey >= today && daysBetweenKeys(today, e.dateKey) <= 7)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const goMonth = (delta) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  const goToday = () => {
    const t = keyToDate(today);
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelected(today);
  };

  const selectedEvents = byDay[selected] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => goMonth(-1)} aria-label="Previous month" className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">‹</button>
            <button onClick={goToday} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-600">Today</button>
            <button onClick={() => goMonth(1)} aria-label="Next month" className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">›</button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {cells.map((key, i) => {
            if (!key) return <div key={`blank-${i}`} className="bg-slate-50 min-h-[84px]" />;
            const dayEvents = byDay[key] || [];
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected(key)}
                data-day={key}
                className={`bg-white min-h-[84px] p-1.5 text-left align-top hover:bg-slate-50 transition-colors ${isSelected ? "ring-2 ring-inset ring-indigo-400" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-indigo-600 text-white font-semibold" : "text-slate-600"}`}
                >
                  {Number(key.slice(8))}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div key={e.id} className={`truncate text-[10px] leading-tight rounded px-1 py-0.5 ${tone(e, today)}`}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-500">
          {[
            ["bg-indigo-400", "Task due"],
            ["bg-violet-400", "Project due"],
            ["bg-red-400", "Overdue"],
            ["bg-amber-400", "Blocked"],
            ["bg-emerald-400", "Completed"],
          ].map(([c, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${c}`} /> {label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">
            {keyToDate(selected).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing due on this day.</p>
          ) : (
            <ul>{selectedEvents.map((e) => <EventRow key={e.id} e={e} today={today} />)}</ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-red-600 mb-2">Overdue ({overdue.length})</h3>
          {overdue.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing overdue.</p>
          ) : (
            <ul>{overdue.map((e) => <EventRow key={e.id} e={e} today={today} showDate />)}</ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Next 7 days ({soon.length})</h3>
          {soon.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing due in the next week.</p>
          ) : (
            <ul>{soon.map((e) => <EventRow key={e.id} e={e} today={today} showDate />)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeadlineCalendar;
