import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import client from "../../api/client";
import { formatLong } from "../../utils/date";
import Modal from "../Modal";
import Spinner from "../Spinner";
import ConfirmDialog from "../ConfirmDialog";
import { Button } from "../ui/Button";
import { StatusBadge } from "../../pages/BookingsPage";

const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
const ID_LABEL = { aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving Licence", oci: "OCI" };
const mask = (id = "") => `${"*".repeat(Math.max(id.length - 4, 0))}${id.slice(-4)}`;
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "-");

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-earth-100 py-1.5 text-sm">
    <dt className="text-earth-600">{label}</dt>
    <dd className="text-right font-medium">{children || "-"}</dd>
  </div>
);

const BookingDrawer = ({ id, onClose }) => {
  const qc = useQueryClient();
  const [reveal, setReveal] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const { data: b, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => client.get(`/admin/bookings/${id}`),
    staleTime: 0,
    gcTime: 0, // never keep full ID numbers cached after the drawer closes
  });

  const resend = useMutation({
    mutationFn: () => client.post(`/admin/bookings/${id}/resend-email`),
    onSuccess: () => {
      toast.success("Invoice email sent");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      refetch();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setConfirm(false),
  });

  return (
    <Modal title={b ? `Booking ${b.bookingCode}` : "Booking"} onClose={onClose} drawer>
      {isLoading && <Spinner />}
      {isError && <p className="text-sm text-red-600">{error.message}</p>}
      {b && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={b.status} />
            <span className="text-lg font-bold">{b.total}</span>
          </div>

          <section>
            <h3 className="mb-1 font-semibold">Safari</h3>
            <dl>
              <Row label="Date">{formatLong(b.date)}</Row>
              <Row label="Shift">{cap(b.shift)}</Row>
              <Row label="Zone">{b.zone}</Row>
              <Row label="Vehicle">{cap(b.vehicleType)}</Row>
              <Row label="People">{b.adultsCount} adult(s), {b.childrenCount} child(ren)</Row>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Contact</h3>
            <dl>
              <Row label="Name">{b.contact.name}</Row>
              <Row label="Mobile"><a className="underline" href={`tel:${b.contact.mobile}`}>{b.contact.mobile}</a></Row>
              <Row label="Email"><a className="break-all underline" href={`mailto:${b.contact.email}`}>{b.contact.email}</a></Row>
            </dl>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Payment</h3>
            <dl>
              <Row label="Subtotal">{b.pricing.subtotal}</Row>
              <Row label="Handling fee">{b.pricing.fee}</Row>
              <Row label="Total">{b.pricing.total}</Row>
              <Row label="Payment status">{b.payment.status}</Row>
              <Row label="Payment ID"><span className="break-all">{b.payment.paymentId}</span></Row>
              <Row label="Order ID"><span className="break-all">{b.payment.orderId}</span></Row>
              <Row label="Booked at">{when(b.createdAt)}</Row>
              <Row label="Confirmed at">{when(b.confirmedAt)}</Row>
            </dl>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">Travellers</h3>
              <button type="button" className="text-xs underline" onClick={() => setReveal((r) => !r)}>{reveal ? "Hide ID numbers" : "Show full ID numbers"}</button>
            </div>
            <ul className="space-y-2">
              {b.travellers.map((t, i) => (
                <li key={`${t.name}-${i}`} className="rounded border border-earth-200 p-2 text-sm">
                  <p className="font-medium">{i + 1}. {t.name} <span className="font-normal text-earth-600">({cap(t.type)}, {t.age}, {cap(t.gender)}, {cap(t.nationality)})</span></p>
                  <p className="text-earth-700">{ID_LABEL[t.idType] || t.idType}: <span className="font-mono">{reveal ? t.idNumber : mask(t.idNumber)}</span></p>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-earth-500">Opening this panel is recorded in the audit log.</p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Invoice email</h3>
            <dl>
              <Row label="Status">{cap(b.emailStatus)}</Row>
              <Row label="Attempts">{String(b.emailAttempts)}</Row>
              <Row label="Last sent">{when(b.emailSentAt)}</Row>
              {b.emailLastError && <Row label="Last error">{b.emailLastError}</Row>}
            </dl>
            {b.status === "confirmed" && (
              <Button className="mt-3" variant="secondary" onClick={() => setConfirm(true)}>Resend invoice to {b.contact.email}</Button>
            )}
          </section>
        </div>
      )}

      {confirm && b && (
        <ConfirmDialog
          title="Resend invoice?"
          message={`Send the confirmation email and invoice PDF again to ${b.contact.email}?`}
          confirmLabel="Resend"
          loading={resend.isPending}
          onCancel={() => setConfirm(false)}
          onConfirm={() => resend.mutate()}
        />
      )}
    </Modal>
  );
};

export default BookingDrawer;