import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import client from "../../api/client";
import { Button } from "../ui/Button";
import ConfirmDialog from "../ConfirmDialog";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const SlotRow = ({ slot, readOnly }) => {
  const qc = useQueryClient();
  const isCanter = slot.vehicleType === "canter";
  const original = isCanter ? slot.totalUnits / 16 : slot.totalUnits;

  // The parent re-mounts this row (via key) whenever the saved values change, so no effect is needed
  const [isOpen, setIsOpen] = useState(slot.isOpen);
  const [value, setValue] = useState(String(original));
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState(null);

  const num = value === "" ? NaN : Number(value);
  const maxCap = isCanter ? 20 : 100;
  const valid = Number.isInteger(num) && num >= 0 && num <= maxCap;
  const dirty = isOpen !== slot.isOpen || num !== original;

  const mutation = useMutation({
    mutationFn: (body) => client.patch(`/admin/availability/${slot._id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["day"] });
      toast.success("Slot updated");
    },
  });

  const save = (force = false) => {
    setError("");
    const body = {};
    if (isOpen !== slot.isOpen) body.isOpen = isOpen;
    if (num !== original) body[isCanter ? "canters" : "jeeps"] = num;
    if (force) body.force = true;
    mutation.mutate(body, {
      onError: (err) => {
        if (err.code === "HAS_BOOKINGS") setBookings(err.details?.sample?.[0]?.count ?? 1);
        else setError(err.message);
      },
    });
  };

  const inUse = slot.bookedUnits + slot.heldUnits;
  let badge = { text: "Open", cls: "bg-green-100 text-green-800" };
  if (!slot.isOpen) badge = { text: "Closed", cls: "bg-gray-200 text-gray-700" };
  else if (slot.remaining === 0) badge = { text: "Full", cls: "bg-red-100 text-red-800" };
  else if (inUse > 0) badge = { text: "Partial", cls: "bg-amber-100 text-amber-800" };

  const unit = isCanter ? "seats" : "jeeps";

  return (
    <li className="rounded-lg border border-earth-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-earth-900">{slot.zone.name} · {cap(slot.shift)}</p>
          <p className="text-xs text-earth-600">
            {slot.bookedUnits} booked, {slot.heldUnits} held, {slot.totalUnits} total {unit} · {slot.remaining} left
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
      </div>

      {readOnly ? (
        <p className="mt-2 text-xs text-earth-500">Past dates are read-only.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            {isOpen ? "Open" : "Closed"}
          </label>
          <label className="text-sm">
            <span className="block text-xs text-earth-600">{isCanter ? "Number of canters" : "Number of jeeps"}</span>
            <input
              type="number"
              min="0"
              max={maxCap}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={!valid}
              className={`w-24 rounded-md border p-1.5 ${valid ? "border-earth-300" : "border-red-500"}`}
            />
          </label>
          {isCanter && valid && <span className="pb-2 text-xs text-earth-600">= {num * 16} seats</span>}
          <Button className="ml-auto !py-1.5 text-sm" disabled={!dirty || !valid} loading={mutation.isPending} onClick={() => save()}>
            Save
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}

      {bookings !== null && (
        <ConfirmDialog
          title="Close this slot?"
          message={`This slot has ${bookings} confirmed booking(s). Closing it does not cancel them. Close anyway?`}
          confirmLabel="Close anyway"
          danger
          loading={mutation.isPending}
          onCancel={() => setBookings(null)}
          onConfirm={() => { setBookings(null); save(true); }}
        />
      )}
    </li>
  );
};

export default SlotRow;