import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZones, useSlots } from '../../hooks/useAvailability';
import { getMaxChildren, validateSelection } from '../../utils/rules';
import { getTodayIST } from '../../utils/date';
import { loadSelection, saveSelection } from '../../utils/selectionStorage';
import Calendar from '../calendar/Calendar';
import { VehicleField } from './VehicleField';
import { ZoneField } from './ZoneField';
import { TimingField } from './TimingField';
import { AdultsField } from './AdultsField';
import { ChildrenField } from './ChildrenField';
import { ContactFields } from './ContactFields';
import { Button } from '../ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\d{10}$/;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Restore the previous choice after "Back / Edit booking" (ignore past dates)
const getInitial = () => {
  const saved = loadSelection();
  return saved && saved.date && saved.date >= getTodayIST() ? saved : null;
};

const Step = ({ number, title, children }) => (
  <fieldset className="space-y-4">
    <legend className="mb-1 w-full border-b border-earth-200 pb-2 text-base font-semibold text-earth-900">
      {number}. {title}
    </legend>
    {children}
  </fieldset>
);

const BookingWidget = () => {
  const navigate = useNavigate();
  const [initial] = useState(getInitial);

  const [vehicle, setVehicle] = useState(initial?.vehicle ?? 'jeep');
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [shift, setShift] = useState(initial?.shift ?? '');
  const [adults, setAdults] = useState(initial?.adults ?? 1);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [contact, setContact] = useState(initial?.contact ?? { name: '', mobile: '', email: '' });
  const [touched, setTouched] = useState({ name: false, mobile: false, email: false });

  const { data: zonesData, isError: zonesError } = useZones(vehicle);
  const allZones = useMemo(() => zonesData || [], [zonesData]);

  // Slots across ALL zones for the chosen date
  const { data: allSlots, isLoading: slotsLoading, isError: slotsError } = useSlots(date, vehicle, undefined);

  const openSlotsOnDate = useMemo(() => (date && allSlots ? allSlots.filter((s) => s.isOpen && s.remaining > 0) : []), [date, allSlots]);

  const isDateUnavailable = useMemo(() => {
    if (!date || !allSlots) return false;
    if (vehicle === 'canter') return !openSlotsOnDate.some((s) => s.zone?.slug === 'dhikala');
    return openSlotsOnDate.length === 0;
  }, [date, allSlots, vehicle, openSlotsOnDate]);

  // Derived (no setState in render/effects): a zone with no capacity on the date is ignored
  const effectiveZone = useMemo(() => {
    if (vehicle === 'canter') return 'dhikala';
    if (!zone) return '';
    if (date && allSlots && !openSlotsOnDate.some((s) => s.zone?.slug === zone)) return '';
    return zone;
  }, [vehicle, zone, date, allSlots, openSlotsOnDate]);

  const zoneOptions = useMemo(() => {
    if (vehicle === 'canter') return [{ value: 'dhikala', label: 'Dhikala', category: 'main' }];
    const toOption = (z) => ({ value: z.slug, label: z.name, category: z.category });
    if (date && allSlots) {
      const valid = new Set(openSlotsOnDate.map((s) => s.zone?.slug));
      return allZones.filter((z) => valid.has(z.slug)).map(toOption);
    }
    return allZones.map(toOption);
  }, [vehicle, date, allSlots, openSlotsOnDate, allZones]);

  const zoneSlots = useMemo(
    () => (date && effectiveZone ? openSlotsOnDate.filter((s) => s.zone?.slug === effectiveZone) : []),
    [date, effectiveZone, openSlotsOnDate]
  );

  const timingOptions = useMemo(
    () => zoneSlots.map((s) => ({ value: s.shift, label: s.timingText ? `${cap(s.shift)} (${s.timingText})` : cap(s.shift) })),
    [zoneSlots]
  );

  const selectedSlot = useMemo(() => zoneSlots.find((s) => s.shift === shift) || null, [zoneSlots, shift]);
  const effectiveShift = selectedSlot ? shift : '';

  const capacityText = useMemo(() => {
    if (!selectedSlot) return '';
    if (vehicle === 'jeep') {
      const n = selectedSlot.remaining;
      return `${n} ${n === 1 ? 'jeep' : 'jeeps'} left`;
    }
    const n = selectedSlot.canterSeatsLeft ?? selectedSlot.remaining;
    return `${n} ${n === 1 ? 'seat' : 'seats'} left`;
  }, [selectedSlot, vehicle]);

  // ---- handlers ----
  const handleVehicleChange = (v) => {
    setVehicle(v);
    setZone(v === 'canter' ? 'dhikala' : '');
    setDate('');
    setShift('');
    setAdults(1);
    setChildren(0);
  };
  const handleZoneChange = (z) => { setZone(z); setShift(''); };
  const handleDateChange = (d) => { setDate(d); setShift(''); };
  const handleAdultsChange = (n) => {
    setAdults(n);
    setChildren((c) => Math.min(c, getMaxChildren(vehicle, n)));
  };
  const handleContactChange = (field, value) => setContact((prev) => ({ ...prev, [field]: value }));
  const handleContactBlur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  // ---- validation ----
  const seatsLeft = vehicle === 'canter' && selectedSlot ? selectedSlot.canterSeatsLeft ?? selectedSlot.remaining : 16;
  const countError = validateSelection(vehicle, adults, children, seatsLeft);

  const contactErrors = {
    name: !contact.name.trim() ? 'Name is required' : '',
    mobile: !MOBILE_RE.test(contact.mobile) ? 'Mobile must be exactly 10 digits' : '',
    email: !EMAIL_RE.test(contact.email.trim()) ? 'Valid email is required' : '',
  };

  const isFormValid = Boolean(
    date && !isDateUnavailable && effectiveZone && selectedSlot && !countError &&
    !contactErrors.name && !contactErrors.mobile && !contactErrors.email
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setTouched({ name: true, mobile: true, email: true });
      return;
    }
    saveSelection({
      vehicle,
      zone: effectiveZone,
      zoneName: allZones.find((z) => z.slug === effectiveZone)?.name || cap(effectiveZone),
      date,
      shift: effectiveShift,
      timingText: selectedSlot.timingText || '',
      adults,
      children,
      contact: { name: contact.name.trim(), mobile: contact.mobile, email: contact.email.trim().toLowerCase() },
    });
    navigate('/traveller-details');
  };

  // ---- timing field state ----
  const isTimingDisabled = !date || !effectiveZone || slotsLoading || timingOptions.length === 0;
  let timingHint = '';
  if (!date || !effectiveZone) timingHint = 'Select a date and zone first';
  else if (slotsLoading) timingHint = 'Loading timings...';
  else if (timingOptions.length === 0) timingHint = 'No timing available';

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <h2 className="text-xl font-bold text-earth-900">Book your safari</h2>
        <p className="text-sm text-earth-600">Pick a date, then fill in your details.</p>
      </div>

      <Step number={1} title="Choose your safari">
        <div className="grid gap-4 sm:grid-cols-2">
          <VehicleField value={vehicle} onChange={handleVehicleChange} />
          <ZoneField
            value={effectiveZone}
            onChange={handleZoneChange}
            options={zoneOptions}
            disabled={vehicle === 'canter'}
            hint={vehicle === 'canter' ? 'Canter runs in Dhikala only' : ''}
          />
        </div>
        {zonesError && <p className="text-xs text-red-500">Could not load zones. Please refresh the page.</p>}

        <Calendar vehicleType={vehicle} zone={effectiveZone || undefined} selectedDate={date} onSelectDate={handleDateChange} />

        {isDateUnavailable && (
          <div role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Safari booking is not available on this date
          </div>
        )}
        {slotsError && <p className="text-xs text-red-500">Could not load timings for this date. Please try again.</p>}

        <TimingField
          value={effectiveShift}
          onChange={setShift}
          options={timingOptions}
          disabled={isTimingDisabled}
          hint={timingHint}
          capacityText={capacityText}
        />
      </Step>

      <Step number={2} title="Who is travelling?">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdultsField vehicle={vehicle} value={adults} onChange={handleAdultsChange} />
          <ChildrenField vehicle={vehicle} adults={adults} value={children} onChange={setChildren} />
        </div>
        {countError && <p className="text-xs text-red-500">{countError}</p>}
      </Step>

      <Step number={3} title="Contact details">
        <ContactFields contact={contact} onChange={handleContactChange} onBlur={handleContactBlur} touched={touched} errors={contactErrors} />
      </Step>

      <Button type="submit" disabled={!isFormValid} className="w-full !py-3 text-base">
        Continue
      </Button>
    </form>
  );
};

export default BookingWidget;