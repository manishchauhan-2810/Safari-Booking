import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import { useSummary } from "../api/admin";
import { getTodayIST, MONTH_NAMES } from "../utils/date";
import { LEGEND, statusStyle } from "../components/calendar/MonthGrid";
import Spinner from "../components/Spinner";
import { useAuth } from "../auth/useAuth";

const useCount = (status) =>
  useQuery({
    queryKey: ["bookings-count", status],
    queryFn: () => client.get("/admin/bookings", { params: { status, limit: 1 } }),
    select: (d) => d.total,
  });

const Stat = ({ label, value, tone, to }) => (
  <Link to={to} className={`block rounded-xl border p-4 shadow-sm transition hover:shadow-md ${tone}`}>
    <p className="text-3xl font-extrabold">{value ?? "-"}</p>
    <p className="mt-1 text-sm font-medium">{label}</p>
  </Link>
);

export const OverviewPage = () => {
  const { admin } = useAuth();
  const today = getTodayIST();
  const [y, m] = today.split("-").map(Number);
  const [vehicle, setVehicle] = useState("jeep");
  const { data, isLoading, isError, error, refetch } = useSummary(`${y}-${String(m).padStart(2, "0")}`, vehicle);

  const confirmed = useCount("confirmed");
  const pending = useCount("pending");
  const refund = useCount("paid_needs_refund");

  const counts = Object.fromEntries(LEGEND.map((s) => [s, 0]));
  (data || []).filter((d) => d.date >= today).forEach((d) => { counts[d.status] += 1; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {admin?.name}</h1>
        <p className="text-sm text-earth-600">Here is what is happening with your safaris.</p>
      </div>

      {refund.data > 0 && (
        <Link to="/bookings" className="block rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <strong>{refund.data} booking(s) need a refund.</strong> The customer paid but the slot was no longer available. Open Bookings and filter by "Needs refund".
        </Link>
      )}

      <section aria-label="Bookings" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Confirmed bookings" value={confirmed.data} tone="border-green-200 bg-white text-green-900" to="/bookings" />
        <Stat label="Awaiting payment" value={pending.data} tone="border-amber-200 bg-white text-amber-900" to="/bookings" />
        <Stat label="Need a refund" value={refund.data} tone={refund.data > 0 ? "border-red-300 bg-red-50 text-red-900" : "border-earth-200 bg-white text-earth-700"} to="/bookings" />
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-earth-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{MONTH_NAMES[m - 1]} {y}: days still to come</h2>
          <div className="flex gap-1" role="group" aria-label="Vehicle">
            {["jeep", "canter"].map((v) => (
              <button key={v} type="button" aria-pressed={vehicle === v} onClick={() => setVehicle(v)}
                className={`rounded-md px-3 py-1 text-sm capitalize ${vehicle === v ? "bg-green-700 text-white" : "bg-earth-100 text-earth-800"}`}>{v}</button>
            ))}
          </div>
        </div>

        {isLoading && <Spinner />}
        {isError && <p className="text-sm text-red-600">{error.message} <button type="button" className="underline" onClick={() => refetch()}>Retry</button></p>}
        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {LEGEND.map((s) => (
              <div key={s} className={`rounded-lg border p-3 ${statusStyle(s).cls}`}>
                <p className="text-2xl font-bold">{counts[s]}</p>
                <p className="text-xs font-medium">{statusStyle(s).label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link to="/calendar" className="text-green-700 underline">Manage the calendar</Link>
          <Link to="/bookings" className="text-green-700 underline">View all bookings</Link>
        </div>
      </section>
    </div>
  );
};