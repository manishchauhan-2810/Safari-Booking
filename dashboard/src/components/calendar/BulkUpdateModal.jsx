import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import client from "../../api/client";
import { useZones } from "../../api/admin";
import { addDays, formatShort } from "../../utils/date";
import Modal from "../Modal";
import ConfirmDialog from "../ConfirmDialog";
import { Button } from "../ui/Button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIONS = [
  { value: "open", label: "Open" },
  { value: "close", label: "Close" },
  { value: "capacity", label: "Set capacity only" },
  { value: "open_capacity", label: "Open + set capacity" },
];
const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const join = (items) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

const BulkUpdateModal = ({ today, onClose }) => {
  const qc = useQueryClient();
  const { data: zones = [] } = useZones();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(addDays(today, 6));
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [allZones, setAllZones] = useState(true);
  const [picked, setPicked] = useState([]);
  const [shifts, setShifts] = useState(["morning", "evening"]);
  const [vehicles, setVehicles] = useState(["jeep"]);
  const [action, setAction] = useState("open");
  const [jeeps, setJeeps] = useState("");
  const [canters, setCanters] = useState("");
  const [result, setResult] = useState(null);
  const [forceAsk, setForceAsk] = useState(null);
  const [error, setError] = useState("");

  const needsCap = action === "capacity" || action === "open_capacity";
  const jeepNum = jeeps === "" ? null : Number(jeeps);
  const canterNum = canters === "" ? null : Number(canters);

  const problems = [];
  if (!fromDate || !toDate) problems.push("Choose a date range");
  else if (fromDate < today) problems.push("Start date cannot be in the past");
  else if (toDate < fromDate) problems.push("End date must not be before start date");
  if (!weekdays.length) problems.push("Choose at least one weekday");
  if (!allZones && !picked.length) problems.push("Choose at least one zone");
  if (!shifts.length) problems.push("Choose at least one shift");
  if (!vehicles.length) problems.push("Choose at least one vehicle");
  if (needsCap) {
    const okJeep = vehicles.includes("jeep") && jeepNum !== null;
    const okCanter = vehicles.includes("canter") && canterNum !== null;
    if (!okJeep && !okCanter) problems.push("Enter the number of jeeps and/or canters");
    if (jeepNum !== null && (!Number.isInteger(jeepNum) || jeepNum < 0 || jeepNum > 100)) problems.push("Jeeps must be 0-100");
    if (canterNum !== null && (!Number.isInteger(canterNum) || canterNum < 0 || canterNum > 20)) problems.push("Canters must be 0-20");
  }

  const zoneNames = allZones ? "all zones" : join(zones.filter((z) => picked.includes(z.slug)).map((z) => z.name));
  const verb = { open: "Open", close: "Close", capacity: "Set capacity for", open_capacity: "Open and set capacity for" }[action];
  const capText = needsCap
    ? ` (${[jeepNum !== null && vehicles.includes("jeep") ? `${jeepNum} jeeps` : null, canterNum !== null && vehicles.includes("canter") ? `${canterNum} canters = ${canterNum * 16} seats` : null].filter(Boolean).join(", ")})`
    : "";
  const dayText = weekdays.length === 7 ? "every day" : `only ${join(weekdays.map((d) => WEEKDAYS[d]))}`;
  const summary = `${verb} ${zoneNames}, ${join(shifts)}, ${join(vehicles)}${capText}, ${dayText} from ${fromDate ? formatShort(fromDate) : "?"} to ${toDate ? formatShort(toDate) : "?"}.`;

  const mutation = useMutation({
    mutationFn: (body) => client.put("/admin/availability/bulk", body),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["day"] });
      toast.success("Bulk update applied");
    },
  });

  const run = (force = false) => {
    setError("");
    const body = { fromDate, toDate, weekdays, zones: allZones ? "all" : picked, shifts, vehicleTypes: vehicles };
    if (action === "open" || action === "open_capacity") body.isOpen = true;
    if (action === "close") body.isOpen = false;
    if (needsCap) {
      if (vehicles.includes("jeep") && jeepNum !== null) body.jeeps = jeepNum;
      if (vehicles.includes("canter") && canterNum !== null) body.canters = canterNum;
    }
    if (force) body.force = true;
    mutation.mutate(body, {
      onError: (err) => {
        if (err.code === "HAS_BOOKINGS") setForceAsk(err.details?.count ?? 1);
        else setError(err.message);
      },
    });
  };

  if (result) {
    return (
      <Modal title="Bulk update result" onClose={onClose}>
        <ul className="space-y-1 text-sm">
          <li>Slots created: <strong>{result.created}</strong></li>
          <li>Slots updated: <strong>{result.updated}</strong></li>
          <li>Skipped (canter outside Dhikala): <strong>{result.skipped}</strong></li>
          <li>Conflicts (not changed): <strong>{result.conflictCount ?? result.conflicts.length}</strong></li>
        </ul>
        {result.conflicts.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-red-700">These slots already hold more than the new capacity:</p>
            <ul className="mt-1 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs">
              {result.conflicts.map((c) => (
                <li key={`${c.date}-${c.zone}-${c.shift}-${c.vehicleType}`}>
                  {formatShort(c.date)} · {c.zone} · {c.shift} · {c.vehicleType}: {c.inUse} in use, requested {c.requested}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 flex justify-end"><Button onClick={onClose}>Done</Button></div>
      </Modal>
    );
  }

  const check = "h-4 w-4";
  return (
    <Modal title="Bulk update" onClose={onClose}>
      <div className="space-y-5 text-sm">
        <fieldset>
          <legend className="mb-1 font-semibold">Date range</legend>
          <div className="flex flex-wrap gap-3">
            <label>From <input type="date" min={today} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="ml-1 rounded border border-earth-300 p-1.5" /></label>
            <label>To <input type="date" min={fromDate || today} value={toDate} onChange={(e) => setToDate(e.target.value)} className="ml-1 rounded border border-earth-300 p-1.5" /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 font-semibold">Weekdays</legend>
          <div className="flex flex-wrap items-center gap-3">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1"><input className={check} type="checkbox" checked={weekdays.includes(i)} onChange={() => setWeekdays(toggle(weekdays, i))} />{d}</label>
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <button type="button" className="underline" onClick={() => setWeekdays([1, 2, 3, 4, 5])}>Weekdays</button>
            <button type="button" className="underline" onClick={() => setWeekdays([0, 6])}>Weekends</button>
            <button type="button" className="underline" onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}>All</button>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 font-semibold">Zones</legend>
          <label className="flex items-center gap-1"><input className={check} type="checkbox" checked={allZones} onChange={(e) => setAllZones(e.target.checked)} />All zones</label>
          {!allZones && (
            <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
              {zones.map((z) => (
                <label key={z.slug} className="flex items-center gap-1"><input className={check} type="checkbox" checked={picked.includes(z.slug)} onChange={() => setPicked(toggle(picked, z.slug))} />{z.name}</label>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-earth-600">Canter only applies to Dhikala; other zones are skipped for canter.</p>
        </fieldset>

        <div className="flex flex-wrap gap-8">
          <fieldset>
            <legend className="mb-1 font-semibold">Shifts</legend>
            {["morning", "evening"].map((s) => (
              <label key={s} className="mr-3 inline-flex items-center gap-1 capitalize"><input className={check} type="checkbox" checked={shifts.includes(s)} onChange={() => setShifts(toggle(shifts, s))} />{s}</label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-1 font-semibold">Vehicles</legend>
            {["jeep", "canter"].map((v) => (
              <label key={v} className="mr-3 inline-flex items-center gap-1 capitalize"><input className={check} type="checkbox" checked={vehicles.includes(v)} onChange={() => setVehicles(toggle(vehicles, v))} />{v}</label>
            ))}
          </fieldset>
        </div>

        <fieldset>
          <legend className="mb-1 font-semibold">Action</legend>
          <div className="flex flex-wrap gap-4">
            {ACTIONS.map((a) => (
              <label key={a.value} className="flex items-center gap-1"><input type="radio" name="action" checked={action === a.value} onChange={() => setAction(a.value)} />{a.label}</label>
            ))}
          </div>
        </fieldset>

        {needsCap && (
          <div className="flex flex-wrap gap-4">
            {vehicles.includes("jeep") && (
              <label>Number of jeeps<input type="number" min="0" max="100" value={jeeps} onChange={(e) => setJeeps(e.target.value)} className="mt-1 block w-28 rounded border border-earth-300 p-1.5" /></label>
            )}
            {vehicles.includes("canter") && (
              <label>Number of canters<input type="number" min="0" max="20" value={canters} onChange={(e) => setCanters(e.target.value)} className="mt-1 block w-28 rounded border border-earth-300 p-1.5" />
                {canterNum !== null && Number.isInteger(canterNum) && <span className="text-xs text-earth-600">= {canterNum * 16} seats</span>}
              </label>
            )}
          </div>
        )}

        <div className="rounded-md bg-earth-100 p-3" aria-live="polite">
          <p className="text-xs font-semibold uppercase text-earth-600">What will happen</p>
          <p className="mt-1">{summary}</p>
        </div>

        {problems.length > 0 && <ul className="list-disc pl-5 text-xs text-red-600">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={problems.length > 0} loading={mutation.isPending} onClick={() => run()}>Apply</Button>
        </div>
      </div>

      {forceAsk !== null && (
        <ConfirmDialog
          title="Close slots with bookings?"
          message={`${forceAsk} slot(s) in this range have confirmed bookings. Closing does not cancel them. Close anyway?`}
          confirmLabel="Close anyway"
          danger
          loading={mutation.isPending}
          onCancel={() => setForceAsk(null)}
          onConfirm={() => { setForceAsk(null); run(true); }}
        />
      )}
    </Modal>
  );
};

export default BulkUpdateModal;