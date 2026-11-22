import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE;

const SECTIONS = [
  {
    title: '1. Bookings and travellers',
    items: [
      'Every booking must include at least one adult. Travellers aged 13 and above are booked as adults, and travellers aged 5 to 12 are booked as children.',
      'A jeep carries up to 6 adults, and up to 8 people in total including children.',
      'A canter has 16 seats. Canter bookings are charged per person, and children count as full persons.',
      'Canter safaris are available in the Dhikala zone only. Buffer zones (Phanto, Sitabani, Mohan) offer jeep safaris only.',
      'The name, age, gender, nationality and ID details you enter must be correct and must match the original ID carried on the safari day.',
    ],
  },
  {
    title: '2. Prices, fees and taxes',
    items: [
      'Prices depend on the zone type (main or buffer), the vehicle, and the nationality of the travellers. The price is calculated by our system when you book and cannot be changed by the customer.',
      'For jeep safaris, if any traveller is a foreigner, the foreigner rate applies to the whole jeep.',
      'A handling fee and GST are added to the safari price. Both are shown in the payment summary before you pay.',
      'The price shown in your payment summary is the price you pay. Later changes to our prices do not affect bookings that are already made.',
      'The guide fee is not included in the online payment. It is paid by the guest directly on the spot.',
      'Pick-up and drop from hotels is not included.',
    ],
  },
  {
    title: '3. Payment and confirmation',
    items: [
      'Payments are processed securely through Razorpay. We do not store your card or bank details.',
      'When you start a booking, the seat is held for a limited time. If payment is not completed before the hold expires, the hold is released and you must start again.',
      'Your booking is confirmed only after your payment is verified. A confirmation email with your invoice is sent to the email address you provided.',
      'If your payment was received after the hold expired and the slot is no longer available, your booking will not be confirmed. Contact us with your booking code and we will refund you.',
      'Do not pay twice for the same booking. If money was deducted but you did not see a confirmation, contact us with your booking code and payment ID.',
      'Where a part payment (advance) option is offered, the remaining balance is due on the safari day and is collected by us.',
    ],
  },
  {
    title: '4. Cancellations and refunds',
    items: [
      'Safari amounts are non-refundable.',
      'Bookings cannot be cancelled or transferred by the customer once confirmed.',
      'If the Forest Department cancels or changes a permit, any resulting refund or rebooking is subject to the Forest Department rules that apply at that time.',
    ],
  },
  {
    title: '5. Permits and Forest Department rules',
    items: [
      'Bookings inside Corbett National Park are provisional. The Forest Department may change, reschedule, close or cancel safaris or zones without prior notice, for example because of weather, road conditions, wildlife activity or administrative orders.',
      'Safari timings change with the season. The timing shown when you select a date and zone is the timing that applies to your booking.',
      'You must follow all instructions given by the forest staff, the driver and the guide.',
    ],
  },
  {
    title: '6. Identification and documents',
    items: [
      'Carry the same original ID card that you used for booking, for every traveller. Accepted ID types: Aadhaar or driving licence for Indian nationals, and passport or OCI for foreign nationals.',
      'Carry a hard copy of the permit. Entry may be refused if the ID or permit is missing or does not match the booking.',
      'No refund is given if a traveller is refused entry because of missing or mismatched documents.',
    ],
  },
  {
    title: '7. Conduct inside the park',
    items: [
      'Do not get down from the vehicle. Walking or trekking is strictly prohibited.',
      'Mobile phones are prohibited during the safari.',
      'Carrying firearms is not permitted.',
      'Pets are not allowed inside the park.',
      'Do not litter, make loud noise, feed or disturb animals, or smoke inside the park.',
    ],
  },
  {
    title: '8. Your data',
    items: [
      'We collect your name, contact details and ID details only to process the booking, obtain the safari permit and send you your invoice.',
      'ID numbers are stored in encrypted form and shown only in part (the last four characters) to customers.',
      'We do not sell your personal information.',
    ],
  },
];

const Terms = () => (
  <div className="min-h-screen bg-earth-50">
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="text-sm text-green-700 hover:underline">&larr; Back to booking</Link>

      <h1 className="mt-4 text-3xl font-bold text-earth-900">Terms and conditions</h1>
      <p className="mt-2 text-sm text-earth-600">
        Please read these terms before you book. By making a booking you confirm that you accept them.
      </p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title} aria-labelledby={s.title}>
            <h2 id={s.title} className="text-lg font-semibold text-earth-900">{s.title}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-earth-700">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="text-lg font-semibold text-earth-900">9. Contact</h2>
          <p className="mt-2 text-sm text-earth-700">
            For any question about a booking, write to us and quote your booking code.
            {(SUPPORT_EMAIL || SUPPORT_PHONE) && (
              <>
                {' '}
                {SUPPORT_EMAIL && <a className="text-green-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>}
                {SUPPORT_EMAIL && SUPPORT_PHONE && ' / '}
                {SUPPORT_PHONE && <a className="text-green-700 underline" href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>}
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default Terms;