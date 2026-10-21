import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatShort } from "../utils/date";
import Spinner from "../components/Spinner";
import BookingDrawer from "../components/bookings/BookingDrawer";
import { Button } from "../components/ui/Button";

const STATUS = {
  confirmed: ["Confirmed", "bg-green-100 text-green-800"],
  pending: ["Awaiting payment", "bg-amber-100 text-amber-800"],
  paid_needs_refund: ["Needs refund", "bg-red-100 text-red-800"],
  expired: ["Expired", "bg-gray-200 text-gray-700"],
  failed: ["Failed", "bg-gray-200 text-gray-700"],
  cancelled: ["Cancelled", "bg-gray-200 text-gray-700"],
  refunded: ["Refunded", "bg-blue-100 text-blue-800"],
};
const STATUS_FILTERS = [["confirmed", "Confirmed"], ["all", "All"], ["pending", "Awaiting payment"], ["paid_needs_refund", "Needs refund"], ["expired", "Expired"], ["failed", "Failed"], ["cancelled", "Cancelled"], ["refunded", "Refunded"]];
const EMAIL = {
  sent: ["Sent", "text-green-700"],
  failed: ["Failed", "font-semibold text-red-600"],
  pending: ["Pending", "text-amber-700"],
  sending: ["Sending", "text-amber-700"],
};

const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export const StatusBadge = ({ status }) => {
  const [label, cls] = STATUS[status] || [status, "bg-gray-200 text-gray-700"];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
};

const pageWindow = (page, pages) => {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return list.flatMap((n, i) => (i > 0 && n - list[i - 1] > 1 ? ["gap" + n, n] : [n]));
};

const Pagination = ({ data, onPage, onLimit }) => {
  const { page, pages, total, limit } = data;
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-earth-200 px-4 py-3 text-sm">
      <p className="text-earth-600">Showing {first}-{last} of {total}</p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded px-2 py-1 hover:bg-earth-100 disabled:opacity-40">Prev</button>
        {pageWindow(page, pages).map((n) =>
          typeof n === "string" ? <span key={n} className="px-1">...</span> : (
            <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined}
              className={`min-w-8 rounded px-2 py-1 ${n === page ? "bg-green-700 font-semibold text-white" : "hover:bg-earth-100"}`}>{n}</button>
          )
        )}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded px-2 py-1 hover:bg-earth-100 disabled:opacity-40">Next</button>
      </div>
      <label className="flex items-center gap-2 text-earth-600">
        Per page
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="rounded border border-earth-300 p-1">
          {[10, 20, 50, 100].map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
    </div>
  );
};

export const BookingsPage = () => {
  const [qInput, setQInput] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [vehicle, setVehicle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [openId, setOpenId] = useState("");

  const q = useDebouncedValue(qInput.trim(), 400);
  const params = { page, limit, sort, q: q || undefined, status, vehicleType: vehicle || undefined, from: from || undefined, to: to || undefined };

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["bookings", params],
    queryFn: () => client.get("/admin/bookings", { params }),
    placeholderData: (previous) => previous, // keep the old rows visible while the next page loads
  });

  // Every filter change goes back to page 1
  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const clear = () => { setQInput(""); setStatus("confirmed"); setVehicle(""); setFrom(""); setTo(""); setSort("newest"); setPage(1); };
  const filtered = qInput || status !== "confirmed" || vehicle || from || to;

  const field = "rounded-md border border-earth-300 bg-white p-2 text-sm";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        {isFetching && !isLoading && <span className="text-xs text-earth-500">Updating...</span>}
      </div>

      <div className="mb-4 space-y-3 rounded-lg bg-white p-3 shadow sm:p-4">
        <div>
          <label htmlFor="booking-search" className="sr-only">Search bookings</label>
          <input id="booking-search" type="search" value={qInput} onChange={(e) => { setQInput(e.target.value); setPage(1); }}
            placeholder="Search name, booking code, mobile, email, payment ID, zone or full Aadhaar / passport number"
            className={`${field} w-full`} autoComplete="off" />
          <p className="mt-1 text-xs text-earth-500">ID numbers must be typed in full. Everything else matches partially.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-earth-600">Status
            <select value={status} onChange={change(setStatus)} className={`${field} mt-1 block`}>{STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="text-xs text-earth-600">Vehicle
            <select value={vehicle} onChange={change(setVehicle)} className={`${field} mt-1 block`}><option value="">All</option><option value="jeep">Jeep</option><option value="canter">Canter</option></select>
          </label>
          <label className="text-xs text-earth-600">Safari from
            <input type="date" value={from} max={to || undefined} onChange={change(setFrom)} className={`${field} mt-1 block`} />
          </label>
          <label className="text-xs text-earth-600">Safari to
            <input type="date" value={to} min={from || undefined} onChange={change(setTo)} className={`${field} mt-1 block`} />
          </label>
          <label className="text-xs text-earth-600">Sort
            <select value={sort} onChange={change(setSort)} className={`${field} mt-1 block`}>
              <option value="newest">Newest booked</option><option value="safari_asc">Safari date, earliest</option><option value="safari_desc">Safari date, latest</option>
            </select>
          </label>
          {filtered && <Button variant="secondary" className="!py-2 text-sm" onClick={clear}>Clear filters</Button>}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {isLoading && <Spinner />}
        {isError && <p className="p-4 text-sm text-red-600">{error.message} <button type="button" className="underline" onClick={() => refetch()}>Retry</button></p>}

        {data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-earth-100 text-xs uppercase text-earth-700">
                  <tr>
                    <th className="p-3">Booking</th><th className="p-3">Customer</th><th className="p-3">Safari</th>
                    <th className="p-3">Travellers</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Email</th><th className="p-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((b) => (
                    <tr key={b.id} className="border-t border-earth-100 align-top hover:bg-earth-50">
                      <td className="p-3">
                        <p className="font-semibold">{b.bookingCode}</p>
                        <p className="text-xs text-earth-500">{new Date(b.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{b.contact.name}</p>
                        <p className="text-xs text-earth-600">{b.contact.mobile}</p>
                        <p className="max-w-48 truncate text-xs text-earth-600" title={b.contact.email}>{b.contact.email}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{formatShort(b.date)} · {cap(b.shift)}</p>
                        <p className="text-xs text-earth-600">{b.zone} · {cap(b.vehicleType)}</p>
                      </td>
                      <td className="p-3">
                        <p>{b.adultsCount} adult{b.adultsCount === 1 ? "" : "s"}{b.childrenCount ? `, ${b.childrenCount} child${b.childrenCount === 1 ? "" : "ren"}` : ""}</p>
                        <p className="max-w-48 truncate text-xs text-earth-600" title={b.travellerNames.join(", ")}>{b.travellerNames.join(", ")}</p>
                      </td>
                      <td className="p-3 font-semibold">{b.total}</td>
                      <td className="p-3"><StatusBadge status={b.status} /></td>
                      <td className="p-3 text-xs font-medium">
                        <span className={EMAIL[b.emailStatus]?.[1]}>{EMAIL[b.emailStatus]?.[0] || "-"}</span>
                      </td>
                      <td className="p-3 text-right"><Button variant="secondary" className="!px-3 !py-1 text-sm" onClick={() => setOpenId(b.id)}>View</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.items.length === 0 && (
              <p className="p-8 text-center text-sm text-earth-600">{filtered ? "No bookings match your search." : "No bookings yet."}</p>
            )}
            <Pagination data={data} onPage={(p) => setPage(p)} onLimit={(n) => { setLimit(n); setPage(1); }} />
          </>
        )}
      </div>

      {openId && <BookingDrawer id={openId} onClose={() => setOpenId("")} />}
    </div>
  );
};