import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { formatDisplayDate } from '../utils/date';
import { loadBookingEmail } from '../utils/selectionStorage';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

const BookingSuccess = () => {
  const { bookingCode } = useParams();
  const location = useLocation();
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState('');

  const email = location.state?.email || loadBookingEmail() || submitted;

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingCode, email],
    // params are URL-encoded by axios, so "a+b@x.com" stays intact
    queryFn: () => api.get(`/bookings/${encodeURIComponent(bookingCode)}`, { params: { email } }),
    enabled: Boolean(email),
    retry: (count, err) => err.status !== 404 && count < 2,
  });

  if (!email) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-2">View your booking</h1>
        <p className="text-sm text-gray-600 mb-4">Enter the email address used for booking {bookingCode}.</p>
        <Input label="Email" type="email" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="your.email@example.com" />
        <Button className="mt-3" disabled={!typed.includes('@')} onClick={() => setSubmitted(typed.trim().toLowerCase())}>
          View booking
        </Button>
      </div>
    );
  }

  if (isLoading) return <div className="p-4 text-center">Loading booking details...</div>;

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <p className="text-red-500 mb-2">{error.status === 404 ? 'We could not find this booking for that email address.' : error.message}</p>
        <Link to="/" className="text-green-700 hover:underline">Back to home</Link>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Booking Confirmed!</h1>

      <div className="bg-green-50 p-6 rounded-md mb-6 border border-green-200">
        <p className="text-lg font-semibold mb-2">Thank you for your booking.</p>
        <p>A confirmation email with your invoice will be sent to <strong>{email}</strong></p>
      </div>

      <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Booking Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <p><strong>Booking Code:</strong> {booking.bookingCode}</p>
          <p><strong>Date:</strong> {formatDisplayDate(booking.date)}</p>
          <p><strong>Shift:</strong> {cap(booking.shift)}</p>
          <p><strong>Zone:</strong> {booking.zone?.name}</p>
          <p><strong>Vehicle:</strong> {cap(booking.vehicleType)}</p>
          <p><strong>Amount Paid:</strong> {booking.pricing?.display?.total}</p>
          {booking.payment?.paymentId && <p><strong>Payment ID:</strong> {booking.payment.paymentId}</p>}
        </div>

        <h3 className="text-lg font-semibold mb-3">Travellers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2">#</th><th className="p-2">Name</th><th className="p-2">Age / Gender</th>
                <th className="p-2">Nationality</th><th className="p-2">ID Proof</th>
              </tr>
            </thead>
            <tbody>
              {booking.travellers.map((t, i) => (
                <tr key={`${t.name}-${i}`} className="border-b">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 font-medium">{t.name}</td>
                  <td className="p-2 capitalize">{t.age} / {t.gender}</td>
                  <td className="p-2 capitalize">{t.nationality}</td>
                  <td className="p-2">{t.idType?.replace('_', ' ')}: {t.idNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-600">Carry the same original ID and a hard copy of the permit. Mobile phones are prohibited during safari.</p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => window.print()}>Print this page</Button>
        <Link to="/" className="text-green-700 hover:underline">Book another safari</Link>
      </div>
    </div>
  );
};

export default BookingSuccess;