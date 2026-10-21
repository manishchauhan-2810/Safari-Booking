import { useMemo, useState } from "react";
import { useSummary, useZones } from "../api/admin";
import { addMonths, buildMonthGrid, getTodayIST, MONTH_NAMES, monthKey } from "../utils/date";
import MonthGrid, { LEGEND, statusStyle } from "../components/calendar/MonthGrid";
import DayPanel from "../components/calendar/DayPanel";
import BulkUpdateModal from "../components/calendar/BulkUpdateModal";
import Spinner from "../components/Spinner";
import { Button } from "../components/ui/Button";

export const CalendarPage = () => {
  const today = getTodayIST();
  const [ty, tm] = today.split("-").map(Number);
  const [vehicle, setVehicle] = useState("jeep");
  const [zone, setZone] = useState("");
  const [view, setView] = useState({ y: ty, m: tm });
  const [selected, setSelected] = useState("");
  const [bulk, setBulk] = useState(false);

  const { data: zones = [] } = useZones();
  const zoneOptions = vehicle === "canter" ? zones.filter((z) => z.allowsCanter) : zones;
  const effectiveZone = zoneOptions.some((z) => z.slug === zone) ? zone : ""; // derived, no effect needed

  const { data, isLoading, isError, error, refetch } = useSummary(monthKey(view.y, view.m), vehicle, effectiveZone);
  const byDate = useMemo(() => new Map((data || []).map((d) => [d.date, d])), [data]);
  const weeks = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m]);

  const move = (delta) => { const [y, m] = addMonths(view.y, view.m, delta); setView({ y, m }); };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button onClick={() => setBulk(true)}>Bulk update</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow">
        <div className="flex gap-1" role="group" aria-label="Vehicle">
          {["jeep", "canter"].map((v) => (
            <button key={v} type="button" aria-pressed={vehicle === v} onClick={() => setVehicle(v)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${vehicle === v ? "bg-green-700 text-white" : "bg-earth-100 text-earth-800"}`}>{v}</button>
          ))}
        </div>
        <label className="text-sm">
          <span className="sr-only">Zone</span>
          <select value={effectiveZone} onChange={(e) => setZone(e.target.value)} className="rounded-md border border-earth-300 p-1.5">
            <option value="">All zones</option>
            {zoneOptions.map((z) => <option key={z.slug} value={z.slug}>{z.name}</option>)}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="rounded px-2 py-1 hover:bg-earth-100">&larr;</button>
          <span className="min-w-36 text-center font-semibold" aria-live="polite">{MONTH_NAMES[view.m - 1]} {view.y}</span>
          <button type="button" onClick={() => move(1)} aria-label="Next month" className="rounded px-2 py-1 hover:bg-earth-100">&rarr;</button>
          <button type="button" onClick={() => setView({ y: ty, m: tm })} className="rounded bg-earth-100 px-2 py-1 text-sm">Today</button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-3 shadow sm:p-4">
        {isLoading && <Spinner />}
        {isError && <p className="text-sm text-red-600">{error.message} <button type="button" className="underline" onClick={() => refetch()}>Retry</button></p>}
        {data && <MonthGrid weeks={weeks} byDate={byDate} today={today} selected={selected} onSelect={setSelected} />}

        <ul className="mt-4 flex flex-wrap gap-3 text-xs" aria-label="Legend">
          {LEGEND.map((s) => (
            <li key={s} className="flex items-center gap-1">
              <span className={`inline-block h-3 w-3 rounded border ${statusStyle(s).cls}`} />{statusStyle(s).label}
            </li>
          ))}
          <li>The bar shows how much is booked or held out of the total ({vehicle === "canter" ? "seats" : "jeeps"}) across the selected zones. Click a date to edit it.</li>
        </ul>
      </div>

      {selected && <DayPanel date={selected} vehicle={vehicle} zone={effectiveZone} today={today} onClose={() => setSelected("")} />}
      {bulk && <BulkUpdateModal today={today} onClose={() => setBulk(false)} />}
    </div>
  );
};