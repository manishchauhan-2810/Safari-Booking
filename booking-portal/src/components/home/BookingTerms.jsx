const TERMS = [
  'Prices are per vehicle (jeep) or per person (canter), as shown.',
  'Children aged 5-12 are booked as children. Every booking needs at least one adult.',
  'Carry the same original ID proof you used for booking, and a hard copy of the permit.',
  'Mobile phones are prohibited during the safari.',
  'Permits are provisional and may be changed or cancelled by the Forest Department.',
  'Safari amounts are non-refundable.',
];

const BookingTerms = () => (
  <div className="rounded-2xl border-l-4 border-amber-400 bg-white p-5 shadow-md ring-1 ring-earth-200 sm:p-6">
    <h2 className="mb-3 text-xl font-bold text-green-900">Booking terms</h2>
    <ul className="space-y-2 text-sm text-earth-700">
      {TERMS.map((t) => (
        <li key={t} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default BookingTerms;