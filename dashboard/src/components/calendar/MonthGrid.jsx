const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS = {
  open: { label: "Open", cls: "bg-green-50 border-green-300 text-green-900" },
  partial: { label: "Partial", cls: "bg-amber-50 border-amber-300 text-amber-900" },
  full: { label: "Full", cls: "bg-red-50 border-red-300 text-red-900" },
  closed: { label: "Closed", cls: "bg-gray-100 border-gray-300 text-gray-600" },
  no_slots: { label: "No slots", cls: "bg-white border-dashed border-earth-300 text-earth-400" },
};

export const LEGEND = ["open", "partial", "full", "closed", "no_slots"];
export const statusStyle = (s) => STATUS[s] || STATUS.no_slots;

const MonthGrid = ({ weeks, byDate, today, selected, onSelect }) => (
  <div className="overflow-x-auto">
    <div className="grid min-w-[640px] grid-cols-7 gap-1.5">
      {WEEKDAYS.map((d) => (
        <div key={d} className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-earth-600">{d}</div>
      ))}

      {weeks.map((week, w) =>
        week.map((date, i) => {
          if (!date) return <div key={`e-${w}-${i}`} />;

          const row = byDate.get(date);
          const status = row?.status || "no_slots";
          const st = statusStyle(status);
          const past = date < today;
          const isToday = date === today;
          const used = row ? row.bookedUnits + row.heldUnits : 0;
          const total = row?.totalUnits || 0;
          const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
          const quiet = past && status === "no_slots"; // nothing useful to say about an empty past day

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={date === selected}
              aria-label={`${date}, ${st.label}${total ? `, ${used} of ${total} used` : ""}${past ? ", past date" : ""}`}
              className={`flex h-24 flex-col justify-between rounded-lg border p-2 text-left transition hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                quiet ? "border-transparent bg-transparent text-earth-300" : st.cls
              } ${past && !quiet ? "opacity-60" : ""} ${date === selected ? "ring-2 ring-green-700" : ""}`}
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-bold">{Number(date.slice(8))}</span>
                {isToday && <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Today</span>}
              </span>

              {!quiet && (
                <span className="block">
                  <span className="block text-xs font-semibold">{status === "closed" ? "🔒 " : ""}{st.label}</span>
                  {total > 0 && (
                    <>
                      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                        <span className="block h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="mt-0.5 block text-[11px] opacity-80">{used} booked</span>
                    </>
                  )}
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  </div>
);

export default MonthGrid;