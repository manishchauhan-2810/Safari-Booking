import { useMemo, useState } from 'react';
import { useCalendar } from '../../hooks/useAvailability';
import { getTodayIST, getMonthKey, buildMonthGrid, formatDisplayDate } from '../../utils/date';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MAX_MONTHS_AHEAD = 6;
const STATUS_TEXT = { available: 'available', sold_out: 'sold out', closed: 'closed', past: 'past date', no_slots: 'not open for booking' };

const Calendar = ({ vehicleType, zone, selectedDate, onSelectDate }) => {
  const todayIST = getTodayIST();
  const [curYear, curMonth] = todayIST.split('-').map(Number);

  // Open on the month of the selected date (e.g. after "Back / Edit booking")
  const [start] = useState(() => (selectedDate && selectedDate >= todayIST ? selectedDate : todayIST).split('-').map(Number));
  const [viewYear, setViewYear] = useState(start[0]);
  const [viewMonth, setViewMonth] = useState(start[1]);

  const monthsFromNow = (viewYear - curYear) * 12 + (viewMonth - curMonth);
  const isPrevDisabled = monthsFromNow <= 0;
  const isNextDisabled = monthsFromNow >= MAX_MONTHS_AHEAD;

  const monthKey = getMonthKey(viewYear, viewMonth);
  const { data, isLoading, isError, refetch } = useCalendar(monthKey, vehicleType, zone || undefined);
  const statusByDate = useMemo(() => new Map((data || []).map((d) => [d.date, d.status])), [data]);
  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const move = (delta) => {
    const index = viewYear * 12 + (viewMonth - 1) + delta;
    setViewYear(Math.floor(index / 12));
    setViewMonth((index % 12) + 1);
  };

  return (
    <div className="border border-earth-300 rounded-lg p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={isPrevDisabled} aria-label="Previous month"
          className="p-1 rounded-md text-earth-700 hover:bg-earth-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold">
          &larr; Prev
        </button>
        <div className="flex items-center gap-2" aria-live="polite">
          <span className="font-semibold text-earth-900 text-sm sm:text-base">{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
          {isLoading && <span className="text-xs text-earth-500 animate-pulse">Loading...</span>}
        </div>
        <button type="button" onClick={() => move(1)} disabled={isNextDisabled} aria-label="Next month"
          className="p-1 rounded-md text-earth-700 hover:bg-earth-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold">
          Next &rarr;
        </button>
      </div>

      {isError && (
        <p className="text-xs text-red-500">
          Could not load availability.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>Retry</button>
        </p>
      )}

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="font-medium text-xs text-earth-600 py-1">{d}</div>
        ))}

        {weeks.map((week, wIdx) =>
          week.map((dateStr, dIdx) => {
            if (!dateStr) return <div key={`empty-${wIdx}-${dIdx}`} className="h-9" />;

            const status = statusByDate.get(dateStr) || (dateStr < todayIST ? 'past' : 'no_slots');
            const isAvailable = status === 'available';
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayIST;

            let color = 'bg-gray-50 text-gray-400 cursor-not-allowed';
            if (isSelected) color = 'bg-emerald-800 text-white font-bold shadow-sm cursor-pointer';
            else if (isAvailable) color = 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 cursor-pointer font-medium';
            else if (status === 'sold_out' || status === 'closed') color = 'bg-red-50 text-red-500 cursor-not-allowed opacity-80';
            else if (status === 'past') color = 'bg-gray-100 text-gray-400 cursor-not-allowed';

            return (
              <button
                key={dateStr}
                type="button"
                disabled={!isAvailable}
                aria-pressed={isSelected}
                aria-label={`${formatDisplayDate(dateStr)}, ${STATUS_TEXT[status] || status}`}
                onClick={() => onSelectDate(dateStr)}
                className={`w-full h-9 flex items-center justify-center rounded text-sm transition-colors ${color}${isToday ? ' ring-2 ring-amber-400 ring-offset-1' : ''}`}
              >
                {Number(dateStr.slice(8))}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-earth-600 pt-1">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /> Available</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-red-50 border border-red-200" /> Sold out / closed</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-emerald-800" /> Selected</span>
      </div>
    </div>
  );
};

export default Calendar;