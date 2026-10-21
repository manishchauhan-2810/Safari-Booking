import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE;

const Support = () =>
  SUPPORT_EMAIL || SUPPORT_PHONE ? (
    <p className="mt-2 text-sm">
      Support: {SUPPORT_EMAIL && <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>}
      {SUPPORT_EMAIL && SUPPORT_PHONE && ' / '}
      {SUPPORT_PHONE && <a className="underline" href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>}
    </p>
  ) : null;

const PaymentError = ({ error, onRetryPayment, onRetryVerify }) => (
  <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
    <p className="font-semibold">{error.message}</p>

    {error.kind === 'retry' && (
      <button type="button" onClick={onRetryPayment} className="mt-3 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
        Try payment again
      </button>
    )}

    {error.kind === 'expired' && (
      <Link to="/" className="inline-block mt-3 px-4 py-2 bg-earth-800 text-white rounded hover:bg-earth-900">
        Start again
      </Link>
    )}

    {error.kind === 'slot_gone' && (
      <>
        <p className="mt-2 text-sm">Booking code: <strong>{error.bookingCode}</strong> | Payment ID: <strong>{error.paymentId}</strong></p>
        <p className="mt-1 text-sm">Do not pay again. Please contact support with these details for a refund.</p>
        <Support />
      </>
    )}

    {error.kind === 'verify_failed' && (
      <>
        <p className="mt-2 text-sm">
          If money was deducted, do not pay again. Booking code: <strong>{error.bookingCode}</strong> | Payment ID:{' '}
          <strong>{error.paymentId}</strong>
        </p>
        <button type="button" onClick={onRetryVerify} className="mt-3 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
          Retry confirmation
        </button>
        <Support />
      </>
    )}
  </div>
);

const PaymentPanel = ({
  vehicle,
  quote, // only passed when the form is valid and the price is fresh
  calculating,
  quoteError,
  isFormValid,
  canPay,
  stage,
  termsAccepted,
  setTermsAccepted,
  hasForeigner,
  onPay,
  paymentError,
  onRetryPayment,
  onRetryVerify,
}) => {
  const busy = stage !== 'idle';
  const label =
    stage === 'creating' ? 'Creating booking...'
    : stage === 'paying' ? 'Payment in progress...'
    : quote ? `Pay ${quote.display.total}`
    : 'Payable amount: ₹ —';

  let hint = null;
  if (quoteError) hint = <p className="text-red-500 text-sm mt-2">{quoteError.message}</p>;
  else if (!isFormValid) hint = <p className="text-earth-500 text-sm mt-2">Fill in all traveller details to see the amount</p>;
  else if (calculating) hint = <p className="text-earth-600 text-sm mt-2">Calculating price...</p>;
  else if (quote && !termsAccepted) hint = <p className="text-earth-500 text-sm mt-2">Accept the terms to continue</p>;

  return (
    <div className="bg-white p-6 rounded-lg border border-earth-200 mt-6">
      {stage === 'confirming' && (
        <div role="status" aria-live="assertive" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 text-center text-white">
          <p className="text-xl">Confirming your payment, please do not close this page</p>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>

      {paymentError && <PaymentError error={paymentError} onRetryPayment={onRetryPayment} onRetryVerify={onRetryVerify} />}

      {/* Soft-disabled: a click while incomplete reveals what is missing */}
      <button
        type="button"
        onClick={onPay}
        aria-disabled={!canPay || busy}
        className={`px-5 py-3 rounded-md font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          canPay && !busy ? 'bg-green-700 hover:bg-green-800 cursor-pointer' : 'bg-green-700/50 cursor-not-allowed'
        }`}
      >
        {label}
      </button>

      {quote && hasForeigner && vehicle === 'jeep' && (
        <p className="text-sm text-red-600 mt-2">Foreigner rate applies to the whole jeep</p>
      )}
      {hint}

      <dl className={`mt-4 text-sm space-y-1 ${quote ? '' : 'text-earth-400'}`}>
        <div className="flex gap-2"><dt>Subtotal:</dt><dd>{quote ? quote.display.subtotal : '—'}</dd></div>
        <div className="flex gap-2"><dt>Handling fee (3%):</dt><dd>{quote ? quote.display.fee : '—'}</dd></div>
        <div className="flex gap-2 font-bold"><dt>Total:</dt><dd>{quote ? quote.display.total : '—'}</dd></div>
      </dl>

      <div className="mt-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
          I have read and accept the terms and conditions
        </label>
        <h3 className="mt-4 text-sm font-semibold text-earth-800">Declaration</h3>
        <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
          <li>Bookings inside Corbett National Park are provisional and can be changed or cancelled without prior information</li>
          <li>Carrying firearms is not permitted</li>
          <li>No pets inside the park</li>
          <li>Walking or trekking is strictly prohibited</li>
          <li>3% additional handling and payment gateway charges</li>
          <li>Carry the same original ID and a hard copy of the permit</li>
          <li>Mobile phones are prohibited during safari</li>
          <li>Safari amounts are non-refundable</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentPanel;