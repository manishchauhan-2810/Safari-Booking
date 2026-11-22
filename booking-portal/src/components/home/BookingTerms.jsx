import { Link } from 'react-router-dom';

const KEY_POINTS = [
  'Every booking needs at least one adult. Children aged 5 to 12 travel as children.',
  'Carry the same original ID you booked with, and a hard copy of the permit.',
  'Mobile phones are prohibited during the safari.',
  'Permits are provisional and may be changed or cancelled by the Forest Department.',
  'Safari amounts are non-refundable.',
];

const BookingTerms = () => (
  <section className="rounded-lg border border-earth-200 bg-white p-5 sm:p-6">
    <h2 className="text-xl font-bold text-earth-900">Before you book</h2>
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-earth-700">
      {KEY_POINTS.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
    <p className="mt-4 text-sm">
      <Link to="/terms" className="font-medium text-green-700 underline">
        Read the full terms and conditions
      </Link>
    </p>
  </section>
);

export default BookingTerms;