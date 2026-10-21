import { useMemo, useReducer, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loadSelection } from '../utils/selectionStorage';
import { formatDisplayDate } from '../utils/date';
import { normalizeIdNumber, validateTraveller } from '../utils/travellerValidation';
import { useQuote } from '../hooks/useQuote';
import { usePayment } from '../hooks/usePayment';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import TravellerSection from '../components/traveller/TravellerSection';
import PaymentPanel from '../components/traveller/PaymentPanel';

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const makeTraveller = (type, i, name = '') => ({
  id: `${type}-${i}`,
  type,
  name,
  gender: '',
  age: '',
  nationality: '', // never defaulted: it decides the price
  idType: '',
  idNumber: '',
});

const buildInitial = (selection) => {
  if (!selection) return [];
  return [
    ...Array.from({ length: selection.adults }, (_, i) => makeTraveller('adult', i, i === 0 ? selection.contact.name : '')),
    ...Array.from({ length: selection.children }, (_, i) => makeTraveller('child', i)),
  ];
};

const reducer = (state, action) =>
  action.type === 'UPDATE' ? state.map((t) => (t.id === action.data.id ? action.data : t)) : state;

const TravellerDetails = () => {
  const selection = useMemo(() => loadSelection(), []);
  const { initiatePayment, retryPayment, retryVerify, stage, paymentError } = usePayment();

  const [travellers, dispatch] = useReducer(reducer, selection, buildInitial);
  const [touched, setTouched] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ---- Quote: depends ONLY on traveller types + nationalities, debounced ----
  const nationalityKey = useMemo(() => JSON.stringify(travellers.map((t) => [t.type, t.nationality])), [travellers]);
  const debouncedKey = useDebouncedValue(nationalityKey, 400);
  const debouncedTravellers = useMemo(
    () => JSON.parse(debouncedKey).map(([type, nationality]) => ({ type, nationality })),
    [debouncedKey]
  );
  const allHaveNationality = travellers.length > 0 && travellers.every((t) => t.nationality);
  const debouncedComplete = debouncedTravellers.length > 0 && debouncedTravellers.every((t) => t.nationality);

  const quotePayload = useMemo(
    () =>
      selection
        ? { vehicleType: selection.vehicle, zone: selection.zone, date: selection.date, shift: selection.shift, travellers: debouncedTravellers }
        : null,
    [selection, debouncedTravellers]
  );
  const { data: quoteData, isFetching: quoteFetching, error: quoteErr } = useQuote(quotePayload, Boolean(selection) && debouncedComplete);

  // Only trust a quote that matches what is on screen right now
  const quoteIsCurrent = debouncedKey === nationalityKey;
  const quoteReady = allHaveNationality && quoteIsCurrent && !quoteFetching;
  const calculating = allHaveNationality && (!quoteIsCurrent || quoteFetching);

  // ---- Validation (computed during render) ----
  const errors = useMemo(
    () => Object.fromEntries(travellers.map((t) => [t.id, validateTraveller(t, t.type === 'adult')])),
    [travellers]
  );
  const isFormValid = Object.values(errors).every((e) => Object.keys(e).length === 0);

  const quote = isFormValid && quoteReady && quoteData ? quoteData : undefined;
  const quoteError = quoteReady ? quoteErr : null;
  const canPay = Boolean(quote) && termsAccepted;

  if (!selection) return <Navigate to="/" replace />;

  const handleChange = (data) => dispatch({ type: 'UPDATE', data });
  const handleBlur = (id, field) => setTouched((prev) => ({ ...prev, [id]: { ...prev[id], [field]: true } }));

  const handlePay = () => {
    if (stage !== 'idle') return;

    if (!isFormValid) {
      setShowAll(true);
      toast.error('Please complete the highlighted fields');
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    if (calculating || !quote) {
      toast(quoteError ? quoteError.message : 'Calculating the price, please wait a moment');
      return;
    }
    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    initiatePayment(
      {
        vehicleType: selection.vehicle,
        zone: selection.zone,
        date: selection.date,
        shift: selection.shift,
        contact: selection.contact,
        travellers: travellers.map((t) => ({
          type: t.type,
          name: t.name.trim(),
          gender: t.gender,
          age: Number(t.age),
          nationality: t.nationality,
          idType: t.idType,
          idNumber: normalizeIdNumber(t.idNumber),
        })),
      },
      selection.contact
    );
  };

  const shared = { touched, showAll, errors, onChange: handleChange, onBlur: handleBlur };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Traveller Details</h1>
        <Link to="/" className="text-green-700 hover:underline">Back / Edit booking</Link>
      </div>

      <div className="bg-earth-50 border border-earth-200 p-4 rounded-md mb-6">
        <p className="font-semibold">
          Safari Date: {formatDisplayDate(selection.date)} | Safari Time: {cap(selection.shift)}
        </p>
        <table className="mt-4 w-full max-w-xl text-sm">
          <tbody>
            <tr><th scope="row" className="text-left font-semibold pr-4 py-0.5">Safari Type</th><td>{cap(selection.vehicle)}</td></tr>
            <tr><th scope="row" className="text-left font-semibold pr-4 py-0.5">Zone</th><td>{selection.zoneName}</td></tr>
            <tr><th scope="row" className="text-left font-semibold pr-4 py-0.5">Timing</th><td>{cap(selection.shift)} {selection.timingText && `(${selection.timingText})`}</td></tr>
            <tr><th scope="row" className="text-left font-semibold pr-4 py-0.5">Contact No</th><td>{selection.contact.mobile}</td></tr>
            <tr><th scope="row" className="text-left font-semibold pr-4 py-0.5">Email</th><td>{selection.contact.email}</td></tr>
          </tbody>
        </table>
      </div>

      <TravellerSection title="Adults" travellers={travellers.filter((t) => t.type === 'adult')} {...shared} />
      {selection.children > 0 && (
        <TravellerSection title="Child (Between 5 to 12 Years)" travellers={travellers.filter((t) => t.type === 'child')} {...shared} />
      )}

      <PaymentPanel
        vehicle={selection.vehicle}
        quote={quote}
        calculating={calculating}
        quoteError={quoteError}
        isFormValid={isFormValid}
        canPay={canPay}
        stage={stage}
        termsAccepted={termsAccepted}
        setTermsAccepted={setTermsAccepted}
        hasForeigner={travellers.some((t) => t.nationality === 'foreigner')}
        onPay={handlePay}
        paymentError={paymentError}
        onRetryPayment={retryPayment}
        onRetryVerify={retryVerify}
      />
    </div>
  );
};

export default TravellerDetails;