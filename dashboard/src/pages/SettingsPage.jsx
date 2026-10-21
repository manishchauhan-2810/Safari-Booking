import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import client from "../api/client";
import { useSettings } from "../api/admin";
import Spinner from "../components/Spinner";
import ConfirmDialog from "../components/ConfirmDialog";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

const PRICES = [
  ["jeepIndianPaise", "Jeep, Indian (per jeep)"],
  ["jeepForeignPaise", "Jeep, Foreigner (per jeep)"],
  ["canterIndianPaise", "Canter, Indian (per person)"],
  ["canterForeignPaise", "Canter, Foreigner (per person)"],
];
const DEFAULT_TIMINGS = { morning: "6:00 AM - 9:00 AM", evening: "2:30 PM - 6:00 PM" };

const toForm = (s) => ({
  ...Object.fromEntries(PRICES.map(([k]) => [k, String(s[k] / 100)])),
  feePercent: String(s.feePercent),
  holdMinutes: String(s.holdMinutes),
  morning: s.shiftTimings?.morning || DEFAULT_TIMINGS.morning,
  evening: s.shiftTimings?.evening || DEFAULT_TIMINGS.evening,
});
const rupeesToPaise = (v) => Math.round(Number(v) * 100);

const validate = (f) => {
  const e = {};
  for (const [k] of PRICES) {
    const n = Number(f[k]);
    if (f[k] === "" || !Number.isFinite(n) || n < 1 || n > 100000) e[k] = "Enter ₹1 to ₹1,00,000";
  }
  const fee = Number(f.feePercent);
  if (f.feePercent === "" || !Number.isFinite(fee) || fee < 0 || fee > 20) e.feePercent = "0 to 20";
  else if (Math.abs(fee * 100 - Math.round(fee * 100)) > 1e-9) e.feePercent = "At most 2 decimals";
  const hold = Number(f.holdMinutes);
  if (!Number.isInteger(hold) || hold < 5 || hold > 60) e.holdMinutes = "Whole number, 5 to 60";
  for (const k of ["morning", "evening"]) if (f[k].trim().length < 3 || f[k].trim().length > 40) e[k] = "3 to 40 characters";
  return e;
};

const Card = ({ title, hint, children }) => (
  <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-earth-200 sm:p-6">
    <h2 className="font-semibold text-earth-900">{title}</h2>
    {hint && <p className="mb-4 mt-0.5 text-sm text-earth-600">{hint}</p>}
    {!hint && <div className="mb-4" />}
    {children}
  </section>
);

const SettingsForm = ({ settings }) => {
  const qc = useQueryClient();
  const initial = toForm(settings);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const priceChanged = [...PRICES.map(([k]) => k), "feePercent"].some((k) =>
    k === "feePercent" ? Number(form[k]) !== settings[k] : rupeesToPaise(form[k]) !== settings[k]
  );

  const mutation = useMutation({
    mutationFn: (body) => client.put("/admin/settings", body),
    onSuccess: (saved) => {
      qc.setQueryData(["settings"], saved);
      toast.success("Settings saved");
    },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    setError("");
    setConfirm(false);
    mutation.mutate(
      {
        feePercent: Number(form.feePercent),
        ...Object.fromEntries(PRICES.map(([k]) => [k, rupeesToPaise(form[k])])),
        holdMinutes: Number(form.holdMinutes),
        shiftTimings: { morning: form.morning.trim(), evening: form.evening.trim() },
      },
      { onError: (err) => setError(err.message) }
    );
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (hasErrors || !dirty) return;
    if (priceChanged) setConfirm(true);
    else save();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Price changes apply to new bookings only. Existing bookings keep their price.</p>

      <Card title="Prices" hint="Amounts in rupees, before the handling fee.">
        <div className="grid gap-4 sm:grid-cols-2">
          {PRICES.map(([k, label]) => (
            <Input key={k} label={label} type="number" min="1" step="0.01" value={form[k]} onChange={set(k)} error={errors[k]} />
          ))}
        </div>
      </Card>

      <Card title="Fees and payment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Handling fee (%)" type="number" min="0" max="20" step="0.01" value={form.feePercent} onChange={set("feePercent")} error={errors.feePercent} />
          <Input label="Payment hold (minutes)" type="number" min="5" max="60" value={form.holdMinutes} onChange={set("holdMinutes")} error={errors.holdMinutes} />
        </div>
        <p className="mt-2 text-xs text-earth-500">The hold is how long a seat is kept while the customer pays.</p>
      </Card>

      <Card title="Safari timings" hint="Shown to customers when they pick a date.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Morning" value={form.morning} onChange={set("morning")} error={errors.morning} />
          <Input label="Evening" value={form.evening} onChange={set("evening")} error={errors.evening} />
        </div>
      </Card>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-earth-200 bg-earth-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <Button type="submit" loading={mutation.isPending} disabled={!dirty || hasErrors}>Save changes</Button>
        <Button variant="secondary" disabled={!dirty} onClick={() => setForm(initial)}>Reset</Button>
        {dirty && !hasErrors && <span className="ml-2 self-center text-xs text-earth-600">You have unsaved changes</span>}
      </div>

      {confirm && (
        <ConfirmDialog
          title="Change prices?"
          message="New bookings will use these prices straight away. Existing bookings are not affected."
          confirmLabel="Save changes"
          onCancel={() => setConfirm(false)}
          onConfirm={save}
        />
      )}
    </form>
  );
};

export const SettingsPage = () => {
  const { data, isLoading, isError, error, refetch } = useSettings();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mb-5 text-sm text-earth-600">Prices, fees and the timings customers see.</p>
      {isLoading && <Spinner />}
      {isError && <p className="text-sm text-red-600">{error.message} <button type="button" className="underline" onClick={() => refetch()}>Retry</button></p>}
      {data && <SettingsForm key={JSON.stringify(data)} settings={data} />}
    </div>
  );
};